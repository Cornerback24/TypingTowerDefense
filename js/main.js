import { State } from './Config.js';
import { Game } from './Game.js';

window.onload = async () => {
    const startBtn = document.getElementById('start-btn');

    try {
        const [wordsResponse, bossResponse] = await Promise.all([
            fetch('words.txt'),
            fetch('boss_words.json')
        ]);

        if (!wordsResponse.ok) throw new Error("Could not read words file");
        if (!bossResponse.ok) throw new Error("Could not read boss words file");

        const text = await wordsResponse.text();
        const bossData = await bossResponse.json();

        const words = text.split('\n')
                    .map(word => word.trim().toLowerCase()) 
                    .filter(word => word.length > 0);       

        State.setWords(words);
        State.setBossData(bossData);

        startBtn.innerText = "Start Game";
        startBtn.disabled = false;

        startBtn.addEventListener('click', () => {
            document.getElementById('start-screen').style.display = 'none';

            document.getElementById('gameCanvas').style.display = 'block';
            document.getElementById('top-ui').style.display = 'block';

            new Game();
        });

    } catch (error) {
        console.error("Error loading words:", error);
        startBtn.innerText = "Error loading words.txt!";
        startBtn.style.backgroundColor = "#e74c3c"; 
    }
};
