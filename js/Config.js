export const ENEMY_TYPES = {
    BASIC: 'basic',
    TOUGH: 'tough',
    ELITE: 'elite',
    SUPER_EASY: 'super_easy',
    SLOW_EASY: 'slow_easy',
    BOSS: 'boss',
    BOSS_MINION: 'boss_minion'
};

export const TOWER_TYPES = {
    SLOW: 'slow',
    MORPH: 'morph'
};

export const Config = {
    CANVAS_WIDTH: 1600,
    CANVAS_HEIGHT: 900,
    
    // Economy Constants
    BASE_COST_PER_ETMPS: 60,
    UPG_COST_PER_ETMPS: 75
};

export const State = {
    WORDS: [],
    WORDS_SUPER_SHORT: [],
    WORDS_SHORT: [],
    WORDS_MEDIUM: [],
    WORDS_LONG: [],
    BOSS_DATA: [],
    
    setWords(words) {
        this.WORDS = words;
        this.WORDS_SUPER_SHORT = words.filter(w => w.length <= 2);
        this.WORDS_SHORT = words.filter(w => w.length >= 3 && w.length <= 4);
        this.WORDS_MEDIUM = words.filter(w => w.length >= 5 && w.length <= 7);
        this.WORDS_LONG = words.filter(w => w.length >= 8);
    },
    
    setBossData(data) {
        this.BOSS_DATA = data;
    }
};
