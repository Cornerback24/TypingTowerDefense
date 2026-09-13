# Typing Tower Defense

## Goal
The goal of this project is to build an interactive, browser-based typing tower defense game.

## Gameplay Mechanics
- **The Base:** The player defends a central base.
- **The Enemies:** Enemies spawn from all edges of the screen and move toward the base. Each enemy has a word attached to it.
- **Combat:** The player defeats enemies by typing the words attached to them.
- **Economy & Upgrades:** Successfully typing words and defeating enemies rewards the player with in-game money.
- **Towers:** Money can be used to purchase and place various towers. These towers will provide helpful effects to the player, such as slowing down enemies, dealing damage over time, or simplifying the words needed to be typed.

## Setup
Simply open `typing_game.html` in a web browser. The words dictionary is loaded from `words.txt`.

## Roadmap
1. Build the core game loop (enemies spawning, base health, word typing).
2. Implement the economy system (money drops).
3. Design and develop distinct tower types.
4. Build the UI for tower purchasing and placement.
5. Add levels, scaling difficulty, and a game-over state.
