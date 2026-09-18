import { Config, State, ENEMY_TYPES, morphRangeUptime } from './Config.js';

const DIFFICULTY_RANK = {
    [ENEMY_TYPES.ELITE]: 5,
    [ENEMY_TYPES.TOUGH]: 4,
    [ENEMY_TYPES.BASIC]: 3,
    [ENEMY_TYPES.SUPER_EASY]: 2,
    [ENEMY_TYPES.SLOW_EASY]: 1
};

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

    static wordListForType(type) {
        if (type === ENEMY_TYPES.ELITE) {
            return State.WORDS_LONG.length > 0 ? State.WORDS_LONG : State.WORDS;
        }
        if (type === ENEMY_TYPES.TOUGH) {
            return State.WORDS_MEDIUM.length > 0 ? State.WORDS_MEDIUM : State.WORDS;
        }
        // Basic and any other morphable type: short words only (never super-short)
        return State.WORDS_SHORT.length > 0 ? State.WORDS_SHORT : State.WORDS;
    }

    static pickWord(type, avoidWord) {
        const list = MorphTower.wordListForType(type);
        if (list.length === 0) return avoidWord || '';
        if (list.length === 1) return list[0];

        let word = list[Math.floor(Math.random() * list.length)];
        if (avoidWord && list.length > 1) {
            let attempts = 0;
            while (word === avoidWord && attempts < 8) {
                word = list[Math.floor(Math.random() * list.length)];
                attempts++;
            }
        }
        return word;
    }

    static higherType(a, b) {
        const rankA = DIFFICULTY_RANK[a.type] || 0;
        const rankB = DIFFICULTY_RANK[b.type] || 0;
        return rankA >= rankB ? a.type : b.type;
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

    isEligible(enemy, game) {
        if (!enemy.isVisible() || enemy.pendingDeath || enemy.isDead) return false;
        if (enemy.type === ENEMY_TYPES.BOSS || enemy.type === ENEMY_TYPES.BOSS_MINION) return false;
        // Morph only acts on normal typing tiers (no Super Easy / Slow Easy)
        if (enemy.type !== ENEMY_TYPES.BASIC &&
            enemy.type !== ENEMY_TYPES.TOUGH &&
            enemy.type !== ENEMY_TYPES.ELITE) {
            return false;
        }

        const isBeingTyped = game.currentInput.length > 0 && enemy.matchWord.startsWith(game.currentInput);
        if (isBeingTyped) return false;

        const dx = enemy.x - this.x;
        const dy = enemy.y - this.y;
        return Math.hypot(dx, dy) <= this.range;
    }

    findPartner(primary, eligible) {
        let best = null;
        let bestDist = Infinity;
        for (const enemy of eligible) {
            if (enemy === primary) continue;
            const dist = Math.hypot(enemy.x - primary.x, enemy.y - primary.y);
            if (dist <= Config.MORPH_MERGE_TETHER && dist < bestDist) {
                best = enemy;
                bestDist = dist;
            }
        }
        return best;
    }

    markBeam(enemy, game) {
        enemy.isMorphedBy = this;
        enemy.morphTime = game.timeElapsed;
    }

    applyMerge(primary, partner, game) {
        const survivorType = MorphTower.higherType(primary, partner);
        const minSpeed = Math.min(primary.speed, partner.speed);
        const maxThreat = Math.max(primary.originalThreat || 0, partner.originalThreat || 0);
        const newWord = MorphTower.pickWord(survivorType, primary.word);

        primary.word = newWord;
        primary.matchWord = newWord.replace(/\s/g, '');
        primary.applyTypeProperties(survivorType, 1);
        primary.speed = minSpeed;
        primary.baseSpeed = minSpeed;
        primary.originalThreat = maxThreat;

        // Absorb partner: no money, no score
        partner.pendingDeath = true;
        partner.speed = 0;

        this.markBeam(primary, game);
        this.markBeam(partner, game);
    }

    applySoften(target, game) {
        // Slow only — no word re-roll (that felt like the enemy was dodging typing)
        target.applyMorphSoften(
            game.timeElapsed,
            Config.MORPH_SOFTEN_MODIFIER,
            Config.MORPH_SOFTEN_DURATION
        );
        this.markBeam(target, game);
    }

    update(enemies, game) {
        if (game.timeElapsed * 1000 - this.lastFired < this.fireRate) {
            return;
        }

        let eligible = enemies.filter(enemy => this.isEligible(enemy, game));
        if (eligible.length === 0) return;

        eligible.sort((a, b) => (DIFFICULTY_RANK[b.type] || 0) - (DIFFICULTY_RANK[a.type] || 0));

        // Prefer merge: first primary (by tier) that has a tether partner
        for (const primary of eligible) {
            const partner = this.findPartner(primary, eligible);
            if (partner) {
                this.applyMerge(primary, partner, game);
                this.lastFired = game.timeElapsed * 1000;
                return;
            }
        }

        // Soften fallback: highest-tier isolate without an active soften
        for (const primary of eligible) {
            if (primary.hasActiveMorphSoften(game.timeElapsed)) continue;
            this.applySoften(primary, game);
            this.lastFired = game.timeElapsed * 1000;
            return;
        }

        // All isolates already softened — hold fire until a merge or soften window opens
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
