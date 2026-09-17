import { Config, State, ENEMY_TYPES, TOWER_TYPES } from './Config.js';
import { Base } from './Base.js';
import { Enemy } from './Enemy.js';
import { SlowTower } from './SlowTower.js';
import { MorphTower } from './MorphTower.js';
import * as HighScores from './HighScores.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.base = new Base(Config.CANVAS_WIDTH / 2, Config.CANVAS_HEIGHT / 2);
        this.enemies = [];
        this.towers = [];
        this.selectedTower = null;
        this.placingTowerType = null;
        this.mouseX = 0;
        this.mouseY = 0;

        this.currentInput = "";

        this.towerSelectMode = false;
        this.towerSelectPage = 0;

        this.score = 0;
        this.bossProgressScore = 0;
        this.money = 0;

        this.bossesSpawned = 0;
        this.nextBossScore = 300;
        this.bossGroups = {};
        this.bossGroupIdCounter = 0;

        this.threatBudget = 0;
        this.lastTime = null;
        this.timeElapsed = 0;
        this.isGameOver = false;
        this.isManuallyPaused = false;
        this.pausedForHighScores = false;
        
        this.debugInfo = document.getElementById('debug-info');

        this.setupSounds();
        this.setupInputs();
        this.setupMouseInputs();
        this.setupShop();
        HighScores.setActiveGame(this);
        this.updateUI();
        this.animationFrameId = requestAnimationFrame((timestamp) => this.loop(timestamp));
    }

    setupSounds() {
        this.sounds = {
            [ENEMY_TYPES.BASIC]: { normal: new Audio('assets/sounds/enemy_basic_defeat.wav'), boss: new Audio('assets/sounds/enemy_basic_defeat_with_boss.wav') },
            [ENEMY_TYPES.TOUGH]: { normal: new Audio('assets/sounds/enemy_tough_defeat.wav'), boss: new Audio('assets/sounds/enemy_tough_defeat_with_boss.wav') },
            [ENEMY_TYPES.ELITE]: { normal: new Audio('assets/sounds/enemy_elite_defeat.wav'), boss: new Audio('assets/sounds/enemy_elite_defeat_with_boss.wav') },
            [ENEMY_TYPES.SUPER_EASY]: { normal: new Audio('assets/sounds/enemy_easy_defeat.wav'), boss: new Audio('assets/sounds/enemy_easy_defeat_with_boss.wav') },
            [ENEMY_TYPES.SLOW_EASY]: { normal: new Audio('assets/sounds/enemy_easy_defeat.wav'), boss: new Audio('assets/sounds/enemy_easy_defeat_with_boss.wav') },
            [ENEMY_TYPES.BOSS]: { normal: new Audio('assets/sounds/enemy_boss_defeat.wav'), boss: new Audio('assets/sounds/enemy_boss_defeat.wav') },
            [ENEMY_TYPES.BOSS_MINION]: { normal: new Audio('assets/sounds/enemy_boss_minion_defeat.wav'), boss: new Audio('assets/sounds/enemy_boss_minion_defeat.wav') }
        };
    }

    playDefeatSound(enemyType) {
        const hasBoss = this.enemies.some(e => e.type === ENEMY_TYPES.BOSS || e.type === ENEMY_TYPES.BOSS_MINION);
        console.log("playing sound of " + enemyType);
        const soundSet = this.sounds[enemyType];
        if (soundSet) {
            const soundToPlay = hasBoss ? soundSet.boss : soundSet.normal;
            soundToPlay.cloneNode().play().catch(e => console.warn("Audio play failed", e));
        }
    }

    getTowerCost(type) {
        if (type === TOWER_TYPES.SLOW) return SlowTower.getBaseCost();
        if (type === TOWER_TYPES.MORPH) return MorphTower.getBaseCost();
        return 0;
    }

    setupShop() {
        const setupTowerButton = (btnId, key, towerType, displayName) => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.innerHTML = `[${key}] Buy ${displayName}<br>$${this.getTowerCost(towerType)}`;
                btn.addEventListener('click', () => {
                    if (this.money >= this.getTowerCost(towerType)) {
                        this.placingTowerType = towerType;
                        this.selectedTower = null;
                        this.updateUpgradePanel();
                    }
                });
            }
        };

        setupTowerButton('buy-slow-tower', '1', TOWER_TYPES.SLOW, 'Slow');
        setupTowerButton('buy-morph-tower', '2', TOWER_TYPES.MORPH, 'Morph');

        document.getElementById('upg-range').addEventListener('click', () => this.buyUpgrade('range'));
        document.getElementById('upg-slow').addEventListener('click', () => this.buyUpgrade('slowAmount'));
        document.getElementById('upg-targets').addEventListener('click', () => this.buyUpgrade('maxTargets'));
        
        const upgFireRate = document.getElementById('upg-firerate');
        if (upgFireRate) {
            upgFireRate.addEventListener('click', () => this.buyUpgrade('fireRate'));
        }
    }

    buyUpgrade(type) {
        if (!this.selectedTower) return;
        const upg = this.selectedTower.upgrades[type];
        if (upg.maxed) return;
        
        if (this.money >= upg.cost) {
            this.money -= upg.cost;
            this.selectedTower.upgrade(type);
            this.updateUI();
            this.updateUpgradePanel();
        }
    }

    updateUpgradePanel() {
        const panel = document.getElementById('upgrade-panel');
        const shop = document.getElementById('tower-shop');
        if (this.selectedTower) {
            panel.style.display = 'flex';
            shop.style.display = 'none';
            
            let shortcutNum = 1;
            this.upgradeShortcuts = {}; // Map number to upgrade type

            const setupUpgradeButton = (btnId, type, name, formatAmount) => {
                const btn = document.getElementById(btnId);
                if (!btn) return;
                
                if (this.selectedTower.upgrades[type]) {
                    btn.style.display = 'block';
                    const upg = this.selectedTower.upgrades[type];
                    
                    if (upg.maxed) {
                        btn.innerHTML = `[${shortcutNum}] ${name} Lvl ${upg.level}<br>MAX<br><span style="font-size:0.8em; color:#ddd">--</span>`;
                        btn.style.opacity = "0.5";
                        // Do not add to shortcuts if maxed
                    } else {
                        btn.innerHTML = `[${shortcutNum}] ${name} Lvl ${upg.level}<br>$${upg.cost}<br><span style="font-size:0.8em; color:#ddd">${formatAmount(upg.amount)}</span>`;
                        btn.style.opacity = this.money >= upg.cost ? "1" : "0.5";
                        this.upgradeShortcuts[shortcutNum.toString()] = type;
                    }
                    shortcutNum++;
                } else {
                    btn.style.display = 'none';
                }
            };

            setupUpgradeButton('upg-range', 'range', 'Range', amt => `+${amt} Range`);
            setupUpgradeButton('upg-slow', 'slowAmount', 'Slow', amt => `+${Math.round(amt * 100)}% Slow`);
            setupUpgradeButton('upg-targets', 'maxTargets', 'Targets', amt => `+${amt} Targets`);
            setupUpgradeButton('upg-firerate', 'fireRate', 'Fire Rate', amt => `-${amt}ms`);

        } else {
            panel.style.display = 'none';
            shop.style.display = 'flex';
            this.upgradeShortcuts = {};
        }
    }

    setupMouseInputs() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.mouseX = (e.clientX - rect.left) * scaleX;
            this.mouseY = (e.clientY - rect.top) * scaleY;
        });

        this.canvas.addEventListener('click', (e) => {
            if (this.placingTowerType) {
                const overlap = this.towers.some(tower => {
                    return Math.abs(tower.x - this.mouseX) < 40 && Math.abs(tower.y - this.mouseY) < 40;
                });

                if (overlap) return;

                const cost = this.getTowerCost(this.placingTowerType);
                if (cost && this.money >= cost) {
                    this.money -= cost;
                    let newTower;
                    if (this.placingTowerType === TOWER_TYPES.SLOW) {
                        newTower = new SlowTower(this.mouseX, this.mouseY);
                    } else if (this.placingTowerType === TOWER_TYPES.MORPH) {
                        newTower = new MorphTower(this.mouseX, this.mouseY);
                    }
                    
                    if (newTower) {
                        this.towers.push(newTower);
                        this.placingTowerType = null;
                        this.selectedTower = newTower;
                        this.updateUI();
                    }
                }
            } else {
                this.selectedTower = null;
                for (let tower of this.towers) {
                    if (Math.abs(tower.x - this.mouseX) < 20 && Math.abs(tower.y - this.mouseY) < 20) {
                        this.selectedTower = tower;
                        break;
                    }
                }
                this.updateUpgradePanel();
            }
        });
    }

    updateUI() {
        document.getElementById('score-display').innerText = `Score: ${this.score}`;
        document.getElementById('money-display').innerText = `Money: $${this.money}`;
        
        const buySlowBtn = document.getElementById('buy-slow-tower');
        if (buySlowBtn) buySlowBtn.style.opacity = this.money >= this.getTowerCost(TOWER_TYPES.SLOW) ? "1" : "0.5";

        const buyMorphBtn = document.getElementById('buy-morph-tower');
        if (buyMorphBtn) buyMorphBtn.style.opacity = this.money >= this.getTowerCost(TOWER_TYPES.MORPH) ? "1" : "0.5";
        
        this.updateUpgradePanel();
    }

    showHighScoresOverlay({ allowClose, showPlayAgain, showNameEntry, showFinalScore }) {
        HighScores.showOverlay({
            allowClose,
            showPlayAgain,
            showNameEntry,
            showFinalScore,
            score: this.score
        });
    }

    openHighScoresFromHud() {
        if (HighScores.isOverlayOpen()) return;
        if (this.isGameOver) {
            this.showHighScoresOverlay({
                allowClose: false,
                showPlayAgain: true,
                showNameEntry: false,
                showFinalScore: true
            });
            return;
        }
        this.pausedForHighScores = !this.isManuallyPaused;
        if (!this.isManuallyPaused) {
            this.isManuallyPaused = true;
            document.getElementById("pause-btn").innerText = "Resume (`)";
        }
        this.showHighScoresOverlay({
            allowClose: true,
            showPlayAgain: false,
            showNameEntry: false,
            showFinalScore: false
        });
    }

    closeHighScoresOverlay() {
        if (this.isGameOver) return;
        HighScores.hideOverlay();
        if (this.pausedForHighScores) {
            this.isManuallyPaused = false;
            document.getElementById("pause-btn").innerText = "Pause (`)";
        }
        this.pausedForHighScores = false;
    }

    onGameOver() {
        const showNameEntry = HighScores.qualifies(this.score);
        this.showHighScoresOverlay({
            allowClose: false,
            showPlayAgain: !showNameEntry,
            showNameEntry,
            showFinalScore: true
        });
    }

    submitHighScoreName() {
        if (!HighScores.isOverlayOpen() || !HighScores.isNameEntryVisible()) return;
        HighScores.addScore(HighScores.getNameInputValue(), this.score);
        this.showHighScoresOverlay({
            allowClose: false,
            showPlayAgain: true,
            showNameEntry: false,
            showFinalScore: true
        });
    }

    setupInputs() {
        const togglePause = () => {
            if (HighScores.isOverlayOpen() || this.isGameOver) return;
            this.isManuallyPaused = !this.isManuallyPaused;
            document.getElementById('pause-btn').innerText = this.isManuallyPaused ? "Resume (`)" : "Pause (`)";
        };

        document.getElementById('pause-btn').addEventListener('click', togglePause);

        window.addEventListener('blur', () => {
            if (!this.isManuallyPaused && !this.isGameOver) {
                togglePause();
            }
        });

        this.handleKeyDown = (e) => {
            if (HighScores.isOverlayOpen() || this.isGameOver) {
                return;
            }
            if (e.key === '`') {
                togglePause();
                return;
            }
            if (this.isPaused() && !this.placingTowerType && !this.selectedTower && !this.towerSelectMode) {
                if (e.key === ' ' && this.isManuallyPaused) {
                    togglePause();
                }
                return;
            }

            if (this.towerSelectMode) {
                if (e.key === 'Escape' || e.key === 'Enter') {
                    this.towerSelectMode = false;
                    return;
                } else if (e.key === '=' || e.key === '+') {
                    const maxPage = Math.ceil(this.towers.length / 9) - 1;
                    this.towerSelectPage = Math.min(this.towerSelectPage + 1, Math.max(0, maxPage));
                    return;
                } else if (e.key === '-' || e.key === '_') {
                    this.towerSelectPage = Math.max(0, this.towerSelectPage - 1);
                    return;
                } else if (e.key >= '1' && e.key <= '9') {
                    const index = this.towerSelectPage * 9 + (parseInt(e.key) - 1);
                    if (index < this.towers.length) {
                        this.selectedTower = this.towers[index];
                        this.towerSelectMode = false;
                        this.updateUpgradePanel();
                    }
                    return;
                }
                return; // Suppress other typing in tower select mode
            }

            if (this.placingTowerType) {
                if (e.key === 'Escape') {
                    this.placingTowerType = null;
                    this.updateUI();
                    return;
                } else if (e.key === 'Enter') {
                    if (e.repeat) return;
                    const overlap = this.towers.some(tower => {
                        return Math.abs(tower.x - this.mouseX) < 40 && Math.abs(tower.y - this.mouseY) < 40;
                    });

                    if (overlap) return;

                    const cost = this.getTowerCost(this.placingTowerType);
                    if (cost && this.money >= cost) {
                        this.money -= cost;
                        let newTower;
                        if (this.placingTowerType === TOWER_TYPES.SLOW) {
                            newTower = new SlowTower(this.mouseX, this.mouseY);
                        } else if (this.placingTowerType === TOWER_TYPES.MORPH) {
                            newTower = new MorphTower(this.mouseX, this.mouseY);
                        }
                        
                        if (newTower) {
                            this.towers.push(newTower);
                            this.placingTowerType = null;
                            this.selectedTower = newTower;
                            this.updateUI();
                        }
                    }
                    return;
                }
                
                const moveSpeed = 20;
                if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                    this.mouseY -= moveSpeed;
                } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
                    this.mouseY += moveSpeed;
                } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                    this.mouseX -= moveSpeed;
                } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                    this.mouseX += moveSpeed;
                }
                return; // Suppress other typing in placement mode
            }

            if (this.selectedTower) {
                if (e.key === 'Escape' || e.key === 'Enter') {
                    if (e.repeat) return;
                    this.selectedTower = null;
                    this.updateUpgradePanel();
                    return;
                } else if (e.key === '=' || e.key === '+') {
                    this.selectedTower = null;
                    this.updateUpgradePanel();
                    if (this.towers.length > 0) {
                        this.towerSelectMode = true;
                        this.towerSelectPage = 0;
                    }
                    return;
                } else if (e.key >= '1' && e.key <= '9') {
                    const upgradeType = this.upgradeShortcuts && this.upgradeShortcuts[e.key];
                    if (upgradeType) {
                        this.buyUpgrade(upgradeType);
                    }
                    return;
                }
                return; // Suppress other typing in upgrade mode
            }

            if (e.key === '1' && this.money >= this.getTowerCost(TOWER_TYPES.SLOW)) {
                this.placingTowerType = TOWER_TYPES.SLOW;
                this.selectedTower = null;
                this.mouseX = Config.CANVAS_WIDTH / 2;
                this.mouseY = Config.CANVAS_HEIGHT / 2;
                this.updateUpgradePanel();
                return;
            } else if (e.key === '2' && this.money >= this.getTowerCost(TOWER_TYPES.MORPH) && document.getElementById('buy-morph-tower')) {
                this.placingTowerType = TOWER_TYPES.MORPH;
                this.selectedTower = null;
                this.mouseX = Config.CANVAS_WIDTH / 2;
                this.mouseY = Config.CANVAS_HEIGHT / 2;
                this.updateUpgradePanel();
                return;
            } else if (e.key === '=' || e.key === '+') {
                if (this.towers.length > 0) {
                    this.towerSelectMode = true;
                    this.towerSelectPage = 0;
                }
                return;
            }

            if (e.key === 'Backspace') {
                this.currentInput = this.currentInput.slice(0, -1);
            } 
            else if (e.key.length === 1 && e.key.match(/[a-z]/i)) {
                const testInput = this.currentInput + e.key.toLowerCase();
                const hasMatch = this.enemies.some(enemy => enemy.isVisible() && enemy.matchWord.startsWith(testInput));
                if (hasMatch) {
                    this.currentInput = testInput;
                    this.checkForCompletedWord();
                } else {
                    let targetEnemy = null;
                    let matchingEnemies = [];
                    
                    if (this.currentInput.length > 0) {
                        matchingEnemies = this.enemies.filter(enemy => enemy.isVisible() && enemy.matchWord.startsWith(this.currentInput));
                    }

                    if (matchingEnemies.length > 0) {
                        targetEnemy = matchingEnemies[Math.floor(Math.random() * matchingEnemies.length)];
                    } else {
                        let visibleEnemies = this.enemies.filter(enemy => enemy.isVisible());
                        if (visibleEnemies.length > 0) {
                            targetEnemy = visibleEnemies[Math.floor(Math.random() * visibleEnemies.length)];
                        }
                    }

                    if (targetEnemy) {
                        targetEnemy.speed *= 1.5;
                    }
                }
            }
            document.getElementById('current-typing').innerText = this.currentInput;
        };

        window.addEventListener('keydown', this.handleKeyDown);
    }

    checkForCompletedWord() {
        let closestEnemyIndex = -1;
        let minDistance = Infinity;

        for (let i = 0; i < this.enemies.length; i++) {
            let enemy = this.enemies[i];
            if (enemy.isVisible() && enemy.matchWord === this.currentInput) {
                let dx = this.base.x - enemy.x;
                let dy = this.base.y - enemy.y;
                let dist = dx * dx + dy * dy;

                if (dist < minDistance) {
                    minDistance = dist;
                    closestEnemyIndex = i;
                }
            }
        }

        if (closestEnemyIndex !== -1) {
            const defeatedEnemy = this.enemies[closestEnemyIndex];

            this.playDefeatSound(defeatedEnemy.type);

            if (defeatedEnemy.type === ENEMY_TYPES.BOSS) {
                this.handleBossDeath(defeatedEnemy);
            } else if (defeatedEnemy.bossGroupId !== null) {
                this.handleBossMinionDeath(defeatedEnemy.bossGroupId, 'typed');
            }

            this.addScore(defeatedEnemy.scoreValue, defeatedEnemy.type);
            this.money += defeatedEnemy.moneyValue;
            this.updateUI();
            
            this.enemies.splice(closestEnemyIndex, 1);
            this.currentInput = "";
        }
    }

    spawnBoss() {
        this.bossesSpawned++;
        this.nextBossScore = Infinity;

        const bossData = State.BOSS_DATA[Math.floor(Math.random() * State.BOSS_DATA.length)];
        const bossWord = bossData.boss_name.toLowerCase();

        this.bossGroupIdCounter++;
        const groupId = this.bossGroupIdCounter;
        
        this.bossGroups[groupId] = {
            data: bossData,
            splitCount: this.bossesSpawned + 1,
            activeMinions: 0,
            minionsTyped: 0,
            minionsReachedBase: 0,
            totalMinions: 0
        };

        let speedMultiplier = 1 + (this.score / 1000);
        let bossEnemy = new Enemy(bossWord, ENEMY_TYPES.BOSS, speedMultiplier);
        bossEnemy.bossGroupId = groupId;
        
        this.enemies.push(bossEnemy);
    }

    handleBossDeath(boss) {
        const groupId = boss.bossGroupId;
        const groupInfo = this.bossGroups[groupId];
        if (!groupInfo) return;

        let numToSpawn = groupInfo.splitCount;
        let speedMultiplier = 1 + (this.score / 1000);
        
        let words1 = [...groupInfo.data.boss_words_set_1].map(w => w.toLowerCase());
        let words2 = [...groupInfo.data.boss_words_set_2].map(w => w.toLowerCase());
        
        const shuffle = (arr) => arr.sort(() => 0.5 - Math.random());
        shuffle(words1);
        shuffle(words2);
        
        let selectedWords = [];
        
        // Up to 5 from set 1
        let count1 = Math.min(5, words1.length, numToSpawn - selectedWords.length);
        selectedWords.push(...words1.splice(0, count1));
        
        // Up to 10 from set 2
        if (selectedWords.length < numToSpawn) {
            let count2 = Math.min(10, words2.length, numToSpawn - selectedWords.length);
            selectedWords.push(...words2.splice(0, count2));
        }
        
        // Up to 5 from set 1 again
        if (selectedWords.length < numToSpawn) {
            let count3 = Math.min(5, words1.length, numToSpawn - selectedWords.length);
            selectedWords.push(...words1.splice(0, count3));
        }
        
        // Then WORDS_LONG
        if (selectedWords.length < numToSpawn) {
            let longWords = [...State.WORDS_LONG];
            shuffle(longWords);
            selectedWords.push(...longWords.splice(0, numToSpawn - selectedWords.length));
        }

        groupInfo.activeMinions = selectedWords.length;
        groupInfo.totalMinions = selectedWords.length;
        if (groupInfo.activeMinions === 0) {
            this.checkBossGroupComplete(groupId);
            return;
        }

        let dirX = boss.x - this.base.x;
        let dirY = boss.y - this.base.y;
        let distToBase = Math.hypot(dirX, dirY);
        let normX = distToBase > 0 ? dirX / distToBase : 1;
        let normY = distToBase > 0 ? dirY / distToBase : 0;
        
        let centerX = boss.x + normX * 150;
        let centerY = boss.y + normY * 150;

        let angleStep = (Math.PI * 2) / selectedWords.length;
        for (let i = 0; i < selectedWords.length; i++) {
            let minion = new Enemy(selectedWords[i], ENEMY_TYPES.BOSS_MINION, speedMultiplier);
            
            let angle = i * angleStep;
            let distance = 120 + Math.random() * 40; 
            
            let targetX = centerX + Math.cos(angle) * distance;
            let targetY = centerY + Math.sin(angle) * distance;
            
            // Start them at the original boss location
            minion.x = boss.x;
            minion.y = boss.y;
            minion.startSpawnAnimation(targetX, targetY, 0.8);

            minion.speed = boss.speed;
            minion.bossGroupId = groupId;
            this.enemies.push(minion);
        }
    }

    handleBossMinionDeath(groupId, reason) {
        if (this.bossGroups[groupId]) {
            this.bossGroups[groupId].activeMinions--;
            
            if (reason === 'typed') {
                this.bossGroups[groupId].minionsTyped++;
            } else if (reason === 'base') {
                this.bossGroups[groupId].minionsReachedBase++;
            }

            if (this.bossGroups[groupId].activeMinions <= 0) {
                this.checkBossGroupComplete(groupId);
            }
        }
    }

    addScore(amount, type) {
        this.score += amount;
        if (type !== ENEMY_TYPES.SLOW_EASY) {
            this.bossProgressScore += amount;
        }
    }

    handleBossLeak(groupId) {
        if (!this.bossGroups[groupId]) return;
        delete this.bossGroups[groupId];
        this.scheduleNextBoss();
    }

    scheduleNextBoss() {
        this.nextBossScore = this.bossProgressScore + 350 + (this.bossesSpawned - 1) * 50;
    }

    checkBossGroupComplete(groupId) {
        const groupInfo = this.bossGroups[groupId];
        
        let typedRatio = 1; 
        if (groupInfo && groupInfo.totalMinions > 0) {
            typedRatio = groupInfo.minionsTyped / groupInfo.totalMinions;
        }

        delete this.bossGroups[groupId];
        
        this.scheduleNextBoss();
        
        let speedMultiplier = 1 + (this.score / 1000);
        let wordList = State.WORDS_SUPER_SHORT && State.WORDS_SUPER_SHORT.length > 0 ? State.WORDS_SUPER_SHORT : State.WORDS;
        
        let enemiesToMorph = this.enemies.filter(e => e.type !== ENEMY_TYPES.SLOW_EASY);
        let morphCount = Math.floor(enemiesToMorph.length * typedRatio);
        
        const shuffled = enemiesToMorph.sort(() => 0.5 - Math.random());
        const selectedForMorph = shuffled.slice(0, morphCount);
        
        for (let enemy of selectedForMorph) {
            let dx = enemy.x - this.base.x;
            let dy = enemy.y - this.base.y;
            let distance = Math.hypot(dx, dy);
            
            let dirX = distance > 0 ? dx / distance : 1;
            let dirY = distance > 0 ? dy / distance : 0;
            
            let pushDistance = Math.min(Config.CANVAS_WIDTH, Config.CANVAS_HEIGHT) / 2 - 20; 
            if (distance < pushDistance) {
                let targetX = this.base.x + dirX * pushDistance;
                let targetY = this.base.y + dirY * pushDistance;
                enemy.startSpawnAnimation(targetX, targetY, 1.5);
            }

            let randomWord = wordList[Math.floor(Math.random() * wordList.length)];
            // do not apply speed multiplier as a reward for defeating boss
            enemy.morphTo(ENEMY_TYPES.SLOW_EASY, randomWord, 1);
        }
        
        // Clear current typing if we morphed the targeted enemy
        this.currentInput = "";
        document.getElementById('current-typing').innerText = "";
    }

    isPaused() {
        return this.isManuallyPaused || HighScores.isOverlayOpen() || this.placingTowerType !== null || this.selectedTower !== null || this.towerSelectMode;
    }

    update(deltaTime) {
        this.timeElapsed += deltaTime / 1000;
        
        if (this.bossProgressScore >= this.nextBossScore) {
            this.spawnBoss();
        }

        let threatRegenRate = 1 + (Math.min(this.score, 5000) / 5000) * 9;
        if (this.score > 5000) {
            threatRegenRate += (this.score - 5000) * 0.001;
        }

        this.threatBudget += threatRegenRate * (deltaTime / 1000);

        let speedMultiplier = 1 + (this.score / 10000);
        let maxActiveThreat = Math.floor(10 + this.score / 50);

        let currentThreat = this.enemies.reduce((sum, enemy) => sum + (enemy.originalThreat || 0), 0);

        let basicChance, eliteChance, toughChance;

        if (this.score <= 1000) {
            let t = this.score / 1000;
            basicChance = 1.0 - (0.85 * t);
            eliteChance = 0.40 * t;
            toughChance = 0.45 * t;
        } else if (this.score <= 5000) {
            let t = (this.score - 1000) / 4000;
            basicChance = 0.15 - (0.10 * t);
            eliteChance = 0.40 + (0.45 * t);
            toughChance = 0.45 - (0.35 * t);
        } else {
            basicChance = 0.05;
            eliteChance = 0.85;
            toughChance = 0.10;
        }

        if (!this.nextSpawnType) {
            let rand = Math.random();
            if (rand < eliteChance) {
                this.nextSpawnType = ENEMY_TYPES.ELITE;
            } else if (rand < eliteChance + toughChance) {
                this.nextSpawnType = ENEMY_TYPES.TOUGH;
            } else {
                this.nextSpawnType = ENEMY_TYPES.BASIC;
            }
        }

        let nextRequiredThreat = this.nextSpawnType === ENEMY_TYPES.ELITE ? 10 : (this.nextSpawnType === ENEMY_TYPES.TOUGH ? 5 : 2);
        
        while (this.threatBudget >= nextRequiredThreat && currentThreat < maxActiveThreat) {
            let type = this.nextSpawnType;
            let wordList = State.WORDS_SHORT;
            let requiredThreat = nextRequiredThreat;

            if (type === ENEMY_TYPES.ELITE) {
                wordList = State.WORDS_LONG.length > 0 ? State.WORDS_LONG : State.WORDS;
            } else if (type === ENEMY_TYPES.TOUGH) {
                wordList = State.WORDS_MEDIUM.length > 0 ? State.WORDS_MEDIUM : State.WORDS;
            } else {
                wordList = State.WORDS_SHORT.length > 0 ? State.WORDS_SHORT : State.WORDS;
            }
            
            // Downgrade enemy if over cap
            if (currentThreat + requiredThreat > maxActiveThreat) {
                if (type === ENEMY_TYPES.ELITE && currentThreat + 5 <= maxActiveThreat) {
                    type = ENEMY_TYPES.TOUGH;
                    wordList = State.WORDS_MEDIUM.length > 0 ? State.WORDS_MEDIUM : State.WORDS;
                    requiredThreat = 5;
                } else if ((type === ENEMY_TYPES.ELITE || type === ENEMY_TYPES.TOUGH) && currentThreat + 2 <= maxActiveThreat) {
                    type = ENEMY_TYPES.BASIC;
                    wordList = State.WORDS_SHORT.length > 0 ? State.WORDS_SHORT : State.WORDS;
                    requiredThreat = 2;
                } else {
                    break;
                }
            }
            
            const randomWord = wordList[Math.floor(Math.random() * wordList.length)];
            this.enemies.push(new Enemy(randomWord, type, speedMultiplier));
            this.threatBudget -= requiredThreat;
            currentThreat += requiredThreat;
            
            // Roll next spawn
            let rand = Math.random();
            if (rand < eliteChance) {
                this.nextSpawnType = ENEMY_TYPES.ELITE;
            } else if (rand < eliteChance + toughChance) {
                this.nextSpawnType = ENEMY_TYPES.TOUGH;
            } else {
                this.nextSpawnType = ENEMY_TYPES.BASIC;
            }
            nextRequiredThreat = this.nextSpawnType === ENEMY_TYPES.ELITE ? 10 : (this.nextSpawnType === ENEMY_TYPES.TOUGH ? 5 : 2);
        }

        if (this.threatBudget > maxActiveThreat * 2) {
            this.threatBudget = maxActiveThreat * 2;
        }

        for (let enemy of this.enemies) {
            enemy.isSlowedBy = null;
            if (enemy.isMorphedBy && this.timeElapsed - enemy.morphTime > 0.2) {
                enemy.isMorphedBy = null;
                
                // If it was waiting to die after beam rendering, mark it dead now
                if (enemy.pendingDeath) {
                    enemy.isDead = true;
                }
            }
        }
        for (let tower of this.towers) {
            tower.update(this.enemies, this);
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            let enemy = this.enemies[i];
            
            if (enemy.isDead) {
                this.enemies.splice(i, 1);
                continue;
            }
            
            enemy.update(deltaTime, this.base.x, this.base.y);
            
            let dx = this.base.x - enemy.x;
            let dy = this.base.y - enemy.y;
            let distance = Math.hypot(dx, dy);
            
            if (distance < enemy.radius + this.base.size / 2) {
                this.base.takeDamage(enemy.damage);
                let bossGroupId = enemy.bossGroupId;
                this.enemies.splice(i, 1);
                
                if (bossGroupId !== null) {
                    if (enemy.type === ENEMY_TYPES.BOSS) {
                        this.handleBossLeak(bossGroupId);
                    } else {
                        this.handleBossMinionDeath(bossGroupId, 'base');
                    }
                }
                
                if (this.currentInput.length > 0 && enemy.matchWord.startsWith(this.currentInput)) {
                    this.currentInput = "";
                    document.getElementById('current-typing').innerText = "";
                }
                
                if (this.base.currentHealth <= 0 && !this.isGameOver) {
                    this.isGameOver = true;
                    this.onGameOver();
                }
            }
        }

        if (this.debugInfo) {
            // Need to recalculate these for the debug display since they are local variables
            let threatRegenRate = 1 + (Math.min(this.score, 5000) / 5000) * 9;
            if (this.score > 5000) {
                threatRegenRate += (this.score - 5000) * 0.001;
            }
            let maxActiveThreat = Math.floor(10 + this.score / 50);
            let currentThreat = this.enemies.reduce((sum, enemy) => sum + (enemy.originalThreat || 0), 0);
            
            let scoreUntilNextBoss = this.nextBossScore === Infinity ? "Boss Active" : Math.max(0, this.nextBossScore - this.bossProgressScore);
            
            this.debugInfo.innerHTML = `
                <b>Debug Info:</b><br>
                Time Elapsed: ${Math.floor(this.timeElapsed / 60)}m ${Math.floor(this.timeElapsed % 60)}s<br>
                Score Until Next Boss: ${scoreUntilNextBoss}<br>
                Threat Regen/s: ${threatRegenRate.toFixed(2)}<br>
                Threat Budget: ${this.threatBudget.toFixed(1)}<br>
                Current Threat: ${currentThreat} / ${maxActiveThreat}<br>
                Current Enemies: ${this.enemies.length}<br>
                Speed Multiplier: ${speedMultiplier.toFixed(2)}<br>
                Spawn Chances:<br>
                - Basic: ${(basicChance * 100).toFixed(1)}%<br>
                - Tough: ${(toughChance * 100).toFixed(1)}%<br>
                - Elite: ${(eliteChance * 100).toFixed(1)}%
            `;
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, Config.CANVAS_WIDTH, Config.CANVAS_HEIGHT);
        this.base.draw(this.ctx);

        let drawTowersOnTop = this.towerSelectMode || this.selectedTower !== null;

        if (!drawTowersOnTop) {
            for (let tower of this.towers) {
                tower.draw(this.ctx, tower === this.selectedTower);
            }
        }

        let drawnTextRects = [];

        for (let enemy of this.enemies) {
            if (enemy.isSlowedBy) {
                this.ctx.beginPath();
                this.ctx.moveTo(enemy.isSlowedBy.x, enemy.isSlowedBy.y);
                this.ctx.lineTo(enemy.x, enemy.y);
                this.ctx.strokeStyle = 'rgba(142, 68, 173, 0.4)';
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
            }
            if (enemy.isMorphedBy) {
                this.ctx.beginPath();
                this.ctx.moveTo(enemy.isMorphedBy.x, enemy.isMorphedBy.y);
                this.ctx.lineTo(enemy.x, enemy.y);
                this.ctx.strokeStyle = 'rgba(39, 174, 96, 0.8)';
                this.ctx.lineWidth = 5;
                this.ctx.stroke();
            }
            enemy.drawBody(this.ctx);
        }

        for (let enemy of this.enemies) {
            enemy.drawText(this.ctx, this.currentInput, drawnTextRects);
        }

        if (drawTowersOnTop) {
            for (let tower of this.towers) {
                tower.draw(this.ctx, tower === this.selectedTower);
            }
        }

        if (this.towerSelectMode) {
            this.ctx.font = "bold 20px Arial";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            for (let i = 0; i < 9; i++) {
                const index = this.towerSelectPage * 9 + i;
                if (index < this.towers.length) {
                    const tower = this.towers[index];
                    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
                    this.ctx.beginPath();
                    this.ctx.arc(tower.x, tower.y, 15, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    this.ctx.fillStyle = "white";
                    this.ctx.fillText((i + 1).toString(), tower.x, tower.y);
                }
            }
            
            // Draw page info
            this.ctx.fillStyle = "white";
            this.ctx.font = "20px Arial";
            this.ctx.textAlign = "center";
            const maxPage = Math.ceil(this.towers.length / 9) - 1;
            this.ctx.fillText(`Select Tower: Page ${this.towerSelectPage + 1} of ${maxPage + 1} (Press - / = to change)`, Config.CANVAS_WIDTH / 2, 40);
        }

        if (this.placingTowerType === TOWER_TYPES.SLOW) {
            this.ctx.fillStyle = 'rgba(52, 73, 94, 0.5)';
            this.ctx.fillRect(this.mouseX - 20, this.mouseY - 20, 40, 40);
            this.ctx.fillStyle = 'rgba(142, 68, 173, 0.5)';
            this.ctx.beginPath();
            this.ctx.arc(this.mouseX, this.mouseY, 15, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.strokeStyle = 'rgba(142, 68, 173, 0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(this.mouseX, this.mouseY, 200, 0, Math.PI * 2); 
            this.ctx.stroke();
        } else if (this.placingTowerType === TOWER_TYPES.MORPH) {
            this.ctx.fillStyle = 'rgba(52, 73, 94, 0.5)';
            this.ctx.fillRect(this.mouseX - 20, this.mouseY - 20, 40, 40);
            this.ctx.fillStyle = 'rgba(39, 174, 96, 0.5)';
            this.ctx.beginPath();
            this.ctx.moveTo(this.mouseX, this.mouseY - 15);
            this.ctx.lineTo(this.mouseX + 15, this.mouseY + 10);
            this.ctx.lineTo(this.mouseX - 15, this.mouseY + 10);
            this.ctx.fill();
            
            this.ctx.strokeStyle = 'rgba(39, 174, 96, 0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(this.mouseX, this.mouseY, 250, 0, Math.PI * 2); 
            this.ctx.stroke();
        }
        
        if (this.isGameOver) {
            this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            this.ctx.fillRect(0, 0, Config.CANVAS_WIDTH, Config.CANVAS_HEIGHT);
            
            this.ctx.fillStyle = "#e74c3c";
            this.ctx.font = "bold 80px Arial";
            this.ctx.textAlign = "center";
            this.ctx.fillText("GAME OVER", Config.CANVAS_WIDTH / 2, Config.CANVAS_HEIGHT / 2);
            
            this.ctx.fillStyle = "white";
            this.ctx.font = "30px Arial";
            this.ctx.fillText("Score: " + this.score, Config.CANVAS_WIDTH / 2, Config.CANVAS_HEIGHT / 2 + 60);
            this.ctx.textAlign = "left"; 
        } else if (this.isManuallyPaused) {
            this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            this.ctx.fillRect(0, 0, Config.CANVAS_WIDTH, Config.CANVAS_HEIGHT);
            
            this.ctx.fillStyle = "white";
            this.ctx.font = "bold 60px Arial";
            this.ctx.textAlign = "center";
            this.ctx.fillText("PAUSED", Config.CANVAS_WIDTH / 2, Config.CANVAS_HEIGHT / 2);
            this.ctx.textAlign = "left";
        }
    }

    loop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        if (!this.isGameOver && !this.isPaused()) {
            this.update(deltaTime);
        }
        this.draw();
        
        if (!this.isGameOver) {
            this.animationFrameId = requestAnimationFrame((ts) => this.loop(ts));
        }
    }
}
