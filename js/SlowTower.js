import { Config, TOWER_TYPES } from './Config.js';

export class SlowTower {
    static getBaseStats() {
        return { range: 200, slowAmount: 0.5, maxTargets: 3 };
    }

    static calculateETMPS(stats) {
        const slowPercentage = 1.0 - stats.slowAmount; // e.g. 1.0 - 0.5 = 0.5
        const rangeModifier = stats.range / 200; // Base range 200 = 1.0x
        const baseETMPS = (stats.maxTargets * 10) * slowPercentage * 0.1; // 10 threat avg target, 0.1 active modifier
        return baseETMPS * rangeModifier;
    }

    static getBaseCost() {
        const etmps = SlowTower.calculateETMPS(SlowTower.getBaseStats());
        return Math.round(etmps * Config.BASE_COST_PER_ETMPS);
    }

    static calculateUpgradeCost(currentStats, upgradeType, amount) {
        let currentETMPS = SlowTower.calculateETMPS(currentStats);
        
        let newStats = { ...currentStats };
        if (upgradeType === 'range') {
            newStats.range += amount;
        } else if (upgradeType === 'slowAmount') {
            newStats.slowAmount = Math.max(0.1, newStats.slowAmount - amount);
        } else if (upgradeType === 'maxTargets') {
            newStats.maxTargets += amount;
        }
        
        let newETMPS = SlowTower.calculateETMPS(newStats);
        let marginalETMPS = newETMPS - currentETMPS;
        
        // Prevent 0 cost if stat maxed out
        if (marginalETMPS <= 0) return 0;
        
        return Math.round(marginalETMPS * Config.UPG_COST_PER_ETMPS);
    }

    constructor(x, y) {
        this.x = x;
        this.y = y;
        let baseStats = SlowTower.getBaseStats();
        this.range = baseStats.range;
        this.slowAmount = baseStats.slowAmount;
        this.maxTargets = baseStats.maxTargets;
        
        // Upgrade tracking
        this.upgrades = {
            range: { 
                level: 1, 
                amount: 50,
                cost: SlowTower.calculateUpgradeCost(baseStats, 'range', 50)
            },
            slowAmount: { 
                level: 1, 
                amount: 0.1,
                cost: SlowTower.calculateUpgradeCost(baseStats, 'slowAmount', 0.1),
                maxed: false
            },
            maxTargets: { 
                level: 1, 
                amount: 1,
                cost: SlowTower.calculateUpgradeCost(baseStats, 'maxTargets', 1)
            }
        };
    }

    upgrade(type) {
        let upg = this.upgrades[type];
        if (!upg || upg.maxed) return false;
        
        if (type === 'range') {
            this.range += upg.amount;
        } else if (type === 'slowAmount') {
            this.slowAmount = Math.max(0.1, this.slowAmount - upg.amount); // Lower is slower
        } else if (type === 'maxTargets') {
            this.maxTargets += upg.amount;
        }

        upg.level++;
        
        // Recalculate next cost based on new stats
        let currentStats = { range: this.range, slowAmount: this.slowAmount, maxTargets: this.maxTargets };
        
        if (type === 'slowAmount' && this.slowAmount <= 0.1) {
            upg.maxed = true;
            upg.cost = null;
        } else {
            upg.cost = SlowTower.calculateUpgradeCost(currentStats, type, upg.amount);
        }
        
        return true;
    }

    update(enemies) {
        // Find enemies in range
        let inRange = enemies.filter(enemy => {
            if (!enemy.isVisible()) return false;
            let dx = enemy.x - this.x;
            let dy = enemy.y - this.y;
            return Math.hypot(dx, dy) <= this.range;
        });

        // Apply slow to up to maxTargets
        // Could sort by closest to base, or just closest to tower. Let's do closest to tower for now.
        inRange.sort((a, b) => {
            let distA = Math.hypot(a.x - this.x, a.y - this.y);
            let distB = Math.hypot(b.x - this.x, b.y - this.y);
            return distA - distB;
        });

        let targets = inRange.slice(0, this.maxTargets);
        for (let target of targets) {
            target.speedModifier = Math.min(target.speedModifier, this.slowAmount);
            target.isSlowedBy = this; // temporary tag for drawing lines
        }
    }

    draw(ctx, isSelected) {
        // Draw tower body
        ctx.fillStyle = '#34495e';
        ctx.fillRect(this.x - 20, this.y - 20, 40, 40);
        ctx.fillStyle = '#8e44ad'; // Purple top indicating slow tower
        ctx.beginPath();
        ctx.arc(this.x, this.y, 15, 0, Math.PI * 2);
        ctx.fill();

        // If selected, draw range
        if (isSelected) {
            ctx.strokeStyle = 'rgba(142, 68, 173, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}
