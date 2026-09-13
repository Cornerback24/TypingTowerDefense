# Typing Tower Defense - Game Design Document

## 1. Overview
**Typing Tower Defense** is an HTML5 Canvas-based game that blends traditional tower defense mechanics with educational/typing gameplay. Instead of automated towers dealing all the damage, the primary way players defeat incoming enemies is by rapidly and accurately typing the words hovering above them. Towers serve as utility structures (slowing or downgrading enemies) to assist the player in managing the horde.

## 2. Architecture & Tech Stack
- **Frontend Core**: Vanilla JavaScript (ES6 Modules), HTML5 Canvas API, CSS3.
- **Game Loop**: Driven by `requestAnimationFrame`, calculating `deltaTime` for smooth, framerate-independent movement and spawning.
- **File Structure**:
  - `typing_game.html` / `style.css`: UI layout, HUD (Score, Money, Upgrades, Debug), and Canvas container.
  - `js/main.js`: Asset loading (`words.txt`, `boss_words.json`), initialization, and start screen handling.
  - `js/Config.js`: Stores global configurations (canvas dimensions) and state (categorized word lists, boss data).
  - `js/Game.js`: The central controller managing the game loop, user input, tower placement, enemy spawning (Threat Budget), and collision detection.
  - `js/Base.js`: The central objective that players must protect.
  - `js/Enemy.js`: Handles enemy movement, rendering (body and text), and text-matching logic.
  - `js/SlowTower.js` / `js/MorphTower.js`: Tower entities with unique upgrade paths and targeting logic.
  - `plans/` / `scripts/`: Development plans and data-processing scripts.

## 3. Game Mechanics

### 3.1. The Player Base
- Positioned at the center of the canvas (`1600x900`).
- Has a set amount of health (1000 HP). If an enemy collides with the base, health is deducted. Reaching 0 HP triggers "Game Over".

### 3.2. Typing Combat
- **Targeting**: Typing the first letter of an enemy's word locks onto them.
- **Completion**: Successfully completing the word instantly defeats the enemy, rewarding Score and Money.
- **Penalty System**: Typing a letter that doesn't match an active target speeds up a random visible enemy by 1.5x.

### 3.3. Threat Budget Spawning System
- Spawning is controlled by a dynamic **Threat Budget** that regenerates over time based on the player's score.
- **Enemy Tiers**:
  - **Basic**: 2 Threat, `WORDS_SHORT` (3-4 chars)
  - **Tough**: 5 Threat, `WORDS_MEDIUM` (5-7 chars)
  - **Elite**: 10 Threat, `WORDS_LONG` (8+ chars)
- As the score increases, the probability of higher-tier enemies spawning increases.

### 3.4. Boss Mechanics
- Bosses spawn at specific score intervals.
- **Boss (`boss`)**: High health/damage entity, features a longer name.
- **Boss Minions (`boss_minion`)**: When the boss is defeated, it splits into several minions using a combination of words from `boss_words.json` and standard long words.
- **Reward**: Defeating a boss and its minions creates a shockwave that pushes nearby regular enemies back and morphs them into highly vulnerable, slow types (`slow_easy`) as a reward.

### 3.5. Towers & Economy
- Players earn money from defeating enemies to buy and upgrade towers.
- **Slow Tower ($50)**: Casts an AOE slow effect on multiple targets. Upgrades: Range, Slow Amount, Max Targets.
- **Morph Tower ($100)**: Periodically fires a beam at a high-tier enemy, "downgrading" it to an easier tier (e.g., Elite -> Tough -> Basic -> Super Easy) with a shorter word. Upgrades: Range, Fire Rate.
- **Placement & Upgrades**: Managed via mouse clicks or keyboard shortcuts (numbers/symbols). Towers cannot be placed on top of each other.

## 4. Entity Specifications

### Enemies
| Type | Threat | Word Pool | Color | Properties |
|------|--------|-----------|-------|------------|
| Basic | 2 | 3-4 chars | Red | Fast speed, low damage/reward |
| Tough | 5 | 5-7 chars | Orange | Medium speed, medium damage/reward |
| Elite | 10 | 8+ chars | Purple | Slow speed, high damage/reward |
| Super Easy | 1 | ≤ 2 chars | Gray | Result of Morph Tower downgrade |
| Slow Easy | 1 | Any | Light Gray | Result of Boss defeat reward |
| Boss | N/A | Dataset | Dark Blue | Spawns minions on death |