export class Base {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 80; 
        this.maxHealth = 1000;
        this.currentHealth = this.maxHealth;
    }

    takeDamage(amount) {
        this.currentHealth -= amount;
        if (this.currentHealth < 0) this.currentHealth = 0;
    }

    draw(ctx) {
        ctx.fillStyle = '#3498db'; 
        ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        
        // Draw health bar
        const hpBarWidth = this.size;
        const hpBarHeight = 10;
        const hpY = this.y - this.size/2 - 20;
        
        ctx.fillStyle = '#c0392b'; // Background (red)
        ctx.fillRect(this.x - hpBarWidth/2, hpY, hpBarWidth, hpBarHeight);
        
        ctx.fillStyle = '#2ecc71'; // Current HP (green)
        const currentHpWidth = (this.currentHealth / this.maxHealth) * hpBarWidth;
        ctx.fillRect(this.x - hpBarWidth/2, hpY, currentHpWidth, hpBarHeight);
    }
}
