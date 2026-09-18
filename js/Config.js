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

    // Mean center-to-edge distance on the 1600x900 canvas
    AVG_PATH_PX: 660,
    REF_AVG_THREAT: 4,
    // Typical absorbed-partner threat under Morph priority targeting (merge removes a unit)
    REF_MORPH_DELTA: 3.5,
    REF_MORPH_RANGE: 250,
    // Below corner coverage from center (~918). Enough for a strong circle, not the whole map.
    MAX_TOWER_RANGE: 500,

    // Delay and morph are not full threat deletion; typing stays primary DPS
    LEAK_FRACTION: 0.08,
    // Absorbed partner is gone; spawn may refill freed threat — stickier than old tier-drop Morph (0.15)
    MORPH_STICKINESS: 0.2,
    MORPH_UPTIME: 0.70,

    MORPH_MERGE_TETHER: 120,
    MORPH_NUDGE_PX: 22,
    MORPH_NUDGE_DURATION: 0.18,

    // C ≳ 600 so all-in tower spend cannot outrun late regen
    BASE_COST_PER_ETMPS: 700,
    UPG_COST_PER_ETMPS: 875,

    // Small outward nudge when an enemy is defeated (nearby enemies further from base)
    DEFEAT_KNOCKBACK_RADIUS: 80,
    DEFEAT_KNOCKBACK_BASE_PX: 10,
    DEFEAT_KNOCKBACK_MAX_PX: 25,
    DEFEAT_KNOCKBACK_DURATION: 0.18,
    DEFEAT_KNOCKBACK_BOSS_RESIST: 15
};

export function pathOccupancy(range) {
    return Math.max(0, range / Config.AVG_PATH_PX);
}

export function morphRangeUptime(range) {
    // No upper cap: a hard clamp made further range upgrades cost $0.
    return Math.max(0.85, range / Config.REF_MORPH_RANGE);
}

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
