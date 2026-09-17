const SCORES_KEY = "ttd_high_scores";
const LAST_NAME_KEY = "ttd_last_name";
const MAX_ENTRIES = 10;
const MAX_NAME_LENGTH = 12;

function safeParse(json) {
    try {
        return JSON.parse(json);
    } catch {
        return null;
    }
}

export function loadScores() {
    const parsed = safeParse(localStorage.getItem(SCORES_KEY));
    if (!Array.isArray(parsed)) return [];
    return parsed
        .filter((entry) => entry && typeof entry.name === "string" && typeof entry.score === "number")
        .slice(0, MAX_ENTRIES);
}

export function saveScores(scores) {
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores.slice(0, MAX_ENTRIES)));
}

export function getLastName() {
    const name = localStorage.getItem(LAST_NAME_KEY);
    return typeof name === "string" ? sanitizeName(name) : "";
}

export function setLastName(name) {
    localStorage.setItem(LAST_NAME_KEY, sanitizeName(name));
}

export function sanitizeName(raw) {
    return String(raw)
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .slice(0, MAX_NAME_LENGTH)
        .trim();
}

export function qualifies(score) {
    const scores = loadScores();
    if (scores.length < MAX_ENTRIES) return true;
    return score > scores[scores.length - 1].score;
}

export function addScore(name, score) {
    const scores = loadScores();
    const entry = {
        name: sanitizeName(name) || "AAA",
        score
    };
    let insertAt = scores.length;
    for (let i = 0; i < scores.length; i++) {
        if (score > scores[i].score) {
            insertAt = i;
            break;
        }
    }
    scores.splice(insertAt, 0, entry);
    const trimmed = scores.slice(0, MAX_ENTRIES);
    saveScores(trimmed);
    setLastName(entry.name);
    return trimmed;
}

let uiBound = false;
let overlayOpen = false;
let activeGame = null;
let overlay;
let listEl;
let nameRow;
let nameInput;
let finalScoreEl;
let closeBtn;
let playAgainBtn;
let submitBtn;

export function isOverlayOpen() {
    return overlayOpen;
}

export function isNameEntryVisible() {
    return nameRow && !nameRow.hidden;
}

export function getNameInputValue() {
    return nameInput ? nameInput.value : "";
}

export function setActiveGame(game) {
    activeGame = game;
}

export function bindUi() {
    if (uiBound) return;
    uiBound = true;

    overlay = document.getElementById("high-scores-overlay");
    listEl = document.getElementById("high-scores-list");
    nameRow = document.getElementById("high-scores-name-row");
    nameInput = document.getElementById("high-scores-name-input");
    finalScoreEl = document.getElementById("high-scores-final-score");
    closeBtn = document.getElementById("high-scores-close");
    playAgainBtn = document.getElementById("high-scores-play-again");
    submitBtn = document.getElementById("high-scores-submit");

    const openBoardFromMenu = () => {
        if (activeGame) {
            activeGame.openHighScoresFromHud();
        } else {
            showOverlay({
                allowClose: true,
                showPlayAgain: false,
                showNameEntry: false,
                showFinalScore: false
            });
        }
    };

    document.getElementById("high-scores-btn").addEventListener("click", openBoardFromMenu);
    document.getElementById("start-high-scores-btn").addEventListener("click", openBoardFromMenu);

    closeBtn.addEventListener("click", () => {
        if (activeGame) {
            activeGame.closeHighScoresOverlay();
        } else {
            hideOverlay();
        }
    });

    playAgainBtn.addEventListener("click", () => {
        window.location.reload();
    });

    submitBtn.addEventListener("click", () => {
        if (activeGame) activeGame.submitHighScoreName();
    });

    nameInput.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
            e.preventDefault();
            if (activeGame) activeGame.submitHighScoreName();
        }
    });

    nameInput.addEventListener("input", () => {
        const cleaned = nameInput.value.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, MAX_NAME_LENGTH);
        if (cleaned !== nameInput.value) {
            nameInput.value = cleaned;
        }
    });
}

export function renderList() {
    const scores = loadScores();
    listEl.innerHTML = "";
    if (scores.length === 0) {
        const empty = document.createElement("li");
        empty.className = "empty";
        empty.textContent = "No high scores yet";
        listEl.appendChild(empty);
        return;
    }
    scores.forEach((entry, index) => {
        const item = document.createElement("li");
        const rank = document.createElement("span");
        rank.className = "rank";
        rank.textContent = `${index + 1}.`;
        const name = document.createElement("span");
        name.className = "name";
        name.textContent = entry.name;
        const score = document.createElement("span");
        score.className = "score";
        score.textContent = String(entry.score);
        item.append(rank, name, score);
        listEl.appendChild(item);
    });
}

export function showOverlay({ allowClose, showPlayAgain, showNameEntry, showFinalScore, score }) {
    overlayOpen = true;
    overlay.hidden = false;
    closeBtn.hidden = !allowClose;
    playAgainBtn.hidden = !showPlayAgain;
    nameRow.hidden = !showNameEntry;
    finalScoreEl.hidden = !showFinalScore;
    if (showFinalScore) {
        finalScoreEl.textContent = `Score: ${score}`;
    }
    renderList();
    if (showNameEntry) {
        nameInput.value = getLastName();
        nameInput.focus();
        nameInput.select();
    }
}

export function hideOverlay() {
    overlay.hidden = true;
    overlayOpen = false;
}
