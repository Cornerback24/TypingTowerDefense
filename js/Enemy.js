import { Config, ENEMY_TYPES } from './Config.js';

export class Enemy {
    constructor(word, type = ENEMY_TYPES.BASIC, speedMultiplier = 1) {
        this.word = word;
        this.matchWord = word.replace(/\s/g, '');
        this.type = type;
        this.radius = 25; 
        this.speedModifier = 1; // 1 means normal speed, 0.5 means half speed
        this.bossData = null;
        this.bossGroupId = null;
        
        this.spawnAnimationTimer = 0;
        this.spawnAnimationDuration = 0;
        this.startX = 0;
        this.startY = 0;
        this.targetSpawnX = 0;
        this.targetSpawnY = 0;
        
        this.applyTypeProperties(type, speedMultiplier);

        const spawnAngle = Math.random() * Math.PI * 2;
        const halfWidth = Config.CANVAS_WIDTH / 2;
        const halfHeight = Config.CANVAS_HEIGHT / 2;
        const cosAngle = Math.cos(spawnAngle);
        const sinAngle = Math.sin(spawnAngle);
        
        // Calculate the distance to the edge of the screen at this angle
        const distanceToEdgeX = Math.abs(halfWidth / cosAngle);
        const distanceToEdgeY = Math.abs(halfHeight / sinAngle);
        const spawnRadius = Math.min(distanceToEdgeX, distanceToEdgeY) + this.radius + 5; 

        this.x = halfWidth + cosAngle * spawnRadius;
        this.y = halfHeight + sinAngle * spawnRadius;
    }

    startSpawnAnimation(targetX, targetY, duration) {
        this.startX = this.x;
        this.startY = this.y;
        this.targetSpawnX = targetX;
        this.targetSpawnY = targetY;
        this.spawnAnimationDuration = duration;
        this.spawnAnimationTimer = duration;
    }

    morphTo(newType, newWord, speedMultiplier) {
        this.word = newWord;
        this.matchWord = newWord.replace(/\s/g, '');
        const currentSpeed = this.speed;
        this.applyTypeProperties(newType, speedMultiplier);
        // keep speed unless this was a morph to 'slow_easy'
        // (slows down enemies morphed as a reward for boss elimiation)
        if (this.type !== ENEMY_TYPES.SLOW_EASY)
        {
            this.speed = currentSpeed;
        }
    }

    applyTypeProperties(type, speedMultiplier) {
        this.type = type;
        if (type === ENEMY_TYPES.BASIC) {
            this.speed = 0.4 * speedMultiplier;
            this.color = '#e74c3c';
            this.scoreValue = 10;
            this.moneyValue = 5;
            this.radius = 25;
            this.damage = 10;
            this.originalThreat = 2;
        } else if (type === ENEMY_TYPES.TOUGH) {
            this.speed = 0.3 * speedMultiplier;
            this.color = '#e67e22';
            this.scoreValue = 25;
            this.moneyValue = 15;
            this.radius = 30;
            this.damage = 25;
            this.originalThreat = 5;
        } else if (type === ENEMY_TYPES.ELITE) {
            this.speed = 0.25 * speedMultiplier;
            this.color = '#8e44ad';
            this.scoreValue = 50;
            this.moneyValue = 30;
            this.radius = 35;
            this.damage = 50;
            this.originalThreat = 10;
        } else if (type === ENEMY_TYPES.SUPER_EASY) {
            this.speed = 0.5 * speedMultiplier;
            this.color = '#7f8c8d';
            this.scoreValue = 5;
            this.moneyValue = 2;
            this.radius = 20;
            this.damage = 5;
            this.originalThreat = 1;
        } else if (type === ENEMY_TYPES.SLOW_EASY) {
            this.speed = 0.025 * speedMultiplier;
            this.color = '#95a5a6';
            this.scoreValue = 5;
            this.moneyValue = 2;
            this.radius = 20;
            this.damage = 5;
            this.originalThreat = 1;
        } else if (type === ENEMY_TYPES.BOSS) {
            this.speed = 0.1 * speedMultiplier;
            this.color = '#2c3e50';
            this.scoreValue = 100;
            this.moneyValue = 100;
            this.radius = 50;
            this.damage = 200;
            this.originalThreat = 0; // Boss has its own spawn logic
        } else if (type === ENEMY_TYPES.BOSS_MINION) {
            this.speed = 0.2 * speedMultiplier;
            this.color = '#34495e';
            this.scoreValue = 20;
            this.moneyValue = 10;
            this.radius = 35;
            this.damage = 30;
            this.originalThreat = 0; // Spawned from boss
        }
        this.baseSpeed = this.speed;
    }

    isVisible() {
        return (this.x + this.radius >= 0 && this.x - this.radius <= Config.CANVAS_WIDTH &&
                this.y + this.radius >= 0 && this.y - this.radius <= Config.CANVAS_HEIGHT);
    }

    update(deltaTime, targetX, targetY) {
        if (this.spawnAnimationTimer > 0) {
            this.spawnAnimationTimer -= deltaTime / 1000;
            
            let t = 1 - (this.spawnAnimationTimer / this.spawnAnimationDuration);
            if (t > 1) t = 1;
            
            // Ease out cubic
            let easeT = 1 - Math.pow(1 - t, 3);
            
            this.x = this.startX + (this.targetSpawnX - this.startX) * easeT;
            this.y = this.startY + (this.targetSpawnY - this.startY) * easeT;
            
            if (this.spawnAnimationTimer <= 0) {
                this.x = this.targetSpawnX;
                this.y = this.targetSpawnY;
            }
            return; // Don't move towards base while animating
        }

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.hypot(dx, dy);

        if (distance > 0) {
            const adjustedSpeed = this.speed * this.speedModifier * (deltaTime / (1000 / 60));
            this.x += (dx / distance) * adjustedSpeed;
            this.y += (dy / distance) * adjustedSpeed;
        }
        
        // Reset modifier for next frame so towers can re-apply it
        this.speedModifier = 1;
    }

    drawBody(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color; 
        ctx.fill();
        ctx.closePath();
    }

    drawText(ctx, currentInput, drawnTextRects) {
        if (!this.isVisible()) return;

        ctx.font = "bold 20px Arial";
        ctx.textAlign = "left";

        const isMatch = currentInput.length > 0 && this.matchWord.startsWith(currentInput);

        let matchIndex = 0;
        if (isMatch) {
            let nonSpaceCount = 0;
            for (let i = 0; i < this.word.length; i++) {
                if (nonSpaceCount === currentInput.length) {
                    matchIndex = i;
                    break;
                }
                if (this.word[i] !== ' ') {
                    nonSpaceCount++;
                }
            }
            if (nonSpaceCount === currentInput.length && matchIndex === 0) {
                matchIndex = this.word.length;
            }
        }

        const matchedPart = isMatch ? this.word.substring(0, matchIndex) : "";
        const remainingPart = isMatch ? this.word.substring(matchIndex) : this.word;

        const totalWidth = ctx.measureText(this.word).width;
        let currentX = this.x - (totalWidth / 2);
        
        let textY = this.y - 35; 
        const textHeight = 20;
        const padding = 2;

        let isOverlapping = true;
        let attempts = 0;
        
        let rect = {
            x: currentX,
            y: textY - textHeight,
            width: totalWidth,
            height: textHeight
        };

        while (isOverlapping && attempts < 10) {
            isOverlapping = false;
            for (let other of drawnTextRects) {
                if (rect.x < other.x + other.width + padding &&
                    rect.x + rect.width + padding > other.x &&
                    rect.y < other.y + other.height + padding &&
                    rect.height + rect.y + padding > other.y) {
                    
                    isOverlapping = true;
                    textY = other.y - padding;
                    rect.y = textY - textHeight;
                    break;
                }
            }
            attempts++;
        }

        drawnTextRects.push(rect);

        if (matchedPart) {
            ctx.fillStyle = 'red';
            ctx.fillText(matchedPart, currentX, textY);
            currentX += ctx.measureText(matchedPart).width; 
        }

        ctx.fillStyle = 'white';
        ctx.fillText(remainingPart, currentX, textY);
    }
}
