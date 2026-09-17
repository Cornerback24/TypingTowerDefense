import { Config, State, ENEMY_TYPES, morphRangeUptime } from './Config.js';

export class MorphTower {
    static getBaseStats() {
        return { range: 250, fireRate: 3000 };
    }

    static calculateETMPS(stats) {
        const shotsPerSec = 1000 / stats.fireRate;
        const rangeUptime = morphRangeUptime(stats.range);
        const raw = Config.REF_MORPH_DELTA * shotsPerSec * rangeUptime;
        return raw * Config.MORPH_UPTIME * Config.MORPH_STICKINESS;
    }

    static getBaseCost() {
        const etmps = MorphTower.calculateETMPS(MorphTower.getBaseStats());
        return Math.round(etmps * Config.BASE_COST_PER_ETMPS);
    }

    static calculateUpgradeCost(currentStats, upgradeType, amount) {
        let currentETMPS = MorphTower.calculateETMPS(currentStats);
        
        let newStats = { ...currentStats };
        if (upgradeType === 'range') {
            if (currentStats.range >= Config.MAX_TOWER_RANGE) return 0;
            newStats.range = Math.min(Config.MAX_TOWER_RANGE, newStats.range + amount);
        } else if (upgradeType === 'fireRate') {
            newStats.fireRate = Math.max(500, newStats.fireRate - amount);
        }
        
        let newETMPS = MorphTower.calculateETMPS(newStats);
        let marginalETMPS = newETMPS - currentETMPS;
        
        // Prevent 0 cost if stat maxed out
        if (marginalETMPS <= 0) return 0;
        
        return Math.round(marginalETMPS * Config.UPG_COST_PER_ETMPS);
    }

    constructor(x, y) {
        this.x = x;
        this.y = y;
        let baseStats = MorphTower.getBaseStats();
        this.range = baseStats.range;
        this.fireRate = baseStats.fireRate;
        this.lastFired = 0;
        
        // Upgrade tracking
        this.upgrades = {
            range: { 
                level: 1, 
                amount: 50,
                cost: MorphTower.calculateUpgradeCost(baseStats, 'range', 50),
                maxed: false
            },
            fireRate: { 
                level: 1, 
                amount: 500,
                cost: MorphTower.calculateUpgradeCost(baseStats, 'fireRate', 500)
            }
        };
    }

    upgrade(type) {
        let upg = this.upgrades[type];
        if (!upg || upg.maxed) return false;
        
        if (type === 'range') this.range = Math.min(Config.MAX_TOWER_RANGE, this.range + upg.amount);
        else if (type === 'fireRate') this.fireRate = Math.max(500, this.fireRate - upg.amount); // Min fire rate 500ms

        upg.level++;
        
        // Recalculate next cost based on new stats
        let currentStats = { range: this.range, fireRate: this.fireRate };
        
        if (type === 'fireRate' && this.fireRate <= 500) {
            upg.maxed = true;
            upg.cost = null;
        } else if (type === 'range' && this.range >= Config.MAX_TOWER_RANGE) {
            upg.maxed = true;
            upg.cost = null;
        } else {
            upg.cost = MorphTower.calculateUpgradeCost(currentStats, type, upg.amount);
        }
        
        return true;
    }

    update(enemies, game) {
        if (game.timeElapsed * 1000 - this.lastFired < this.fireRate) {
            return;
        }

        // Find eligible enemies in range
        let inRange = enemies.filter(enemy => {
            if (!enemy.isVisible()) return false;
            if (enemy.type === ENEMY_TYPES.BOSS || enemy.type === ENEMY_TYPES.BOSS_MINION) return false; // Cannot target bosses or minions
            
            // Cannot target enemies the player has started typing
            const isBeingTyped = game.currentInput.length > 0 && enemy.matchWord.startsWith(game.currentInput);
            if (isBeingTyped) return false;
            
            let dx = enemy.x - this.x;
            let dy = enemy.y - this.y;
            return Math.hypot(dx, dy) <= this.range;
        });

        if (inRange.length === 0) return;

        // Prioritize highest difficulty
        const difficultyRank = { [ENEMY_TYPES.ELITE]: 5, [ENEMY_TYPES.TOUGH]: 4, [ENEMY_TYPES.BASIC]: 3, [ENEMY_TYPES.SUPER_EASY]: 2, [ENEMY_TYPES.SLOW_EASY]: 1 };
        
        inRange.sort((a, b) => {
            return difficultyRank[b.type] - difficultyRank[a.type];
        });

        let target = inRange[0];
        
        target.isMorphedBy = this;
        target.morphTime = game.timeElapsed; // Store time to show beam temporarily

        if (target.type === ENEMY_TYPES.SUPER_EASY || target.type === ENEMY_TYPES.SLOW_EASY) {
            // Eliminate directly since they can't be downgraded
            // We use pendingDeath to keep them visible briefly for the beam animation
            target.pendingDeath = true;
            target.speed = 0; // Freeze in place
            game.addScore(target.scoreValue || 0, target.type);
            game.money += target.moneyValue || 0;
            game.updateUI(); // Reflect changes
        } else {
            let newType = ENEMY_TYPES.SUPER_EASY;
            let newWordList = State.WORDS_SUPER_SHORT;
            
            if (target.type === ENEMY_TYPES.ELITE) {
                newType = ENEMY_TYPES.TOUGH;
                newWordList = State.WORDS_MEDIUM.length > 0 ? State.WORDS_MEDIUM : State.WORDS;
            } else if (target.type === ENEMY_TYPES.TOUGH) {
                newType = ENEMY_TYPES.BASIC;
                newWordList = State.WORDS_SHORT.length > 0 ? State.WORDS_SHORT : State.WORDS;
            } else if (target.type === ENEMY_TYPES.BASIC) {
                newType = ENEMY_TYPES.SUPER_EASY;
                newWordList = State.WORDS_SUPER_SHORT.length > 0 ? State.WORDS_SUPER_SHORT : State.WORDS;
            }

            let newWord = newWordList[Math.floor(Math.random() * newWordList.length)] || target.word;

            // Apply speed multiplier based on current game score logic
            let speedMultiplier = 1 + (game.score / 1000);
            target.morphTo(newType, newWord, speedMultiplier);
        }
        
        this.lastFired = game.timeElapsed * 1000;
    }

    draw(ctx, isSelected) {
        // Draw tower body
        ctx.fillStyle = '#34495e';
        ctx.fillRect(this.x - 20, this.y - 20, 40, 40);
        ctx.fillStyle = '#27ae60'; // Green top indicating morph tower
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - 15);
        ctx.lineTo(this.x + 15, this.y + 10);
        ctx.lineTo(this.x - 15, this.y + 10);
        ctx.fill();

        // If selected, draw range
        if (isSelected) {
            ctx.strokeStyle = 'rgba(39, 174, 96, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}
