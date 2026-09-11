# Bingo After Hours

A solo arcade bingo game. Pick one of three ordinary numbered balls, build lines, and beat increasing stage targets.

- 5×5 card, numbers 1–25. Three distinct balls per draw; every ball returns after each choice.
- Each row, column, or diagonal scores 10 points. Simultaneous lines score together, then only their stamps clear.
- 12 calls and two free redraws per stage. Repeated stamps spend a call.
- Targets start at 10 and increase by 10 per stage. Passing resets the card, score, calls, redraws, and play counts.
- Bag inspector shows all 25 balls, current offers, and how often each number was chosen this stage.

## Run locally

Run `npm start`, then open http://localhost:5173. The game is plain HTML/CSS/JavaScript with no production dependencies or build step. Google Fonts are optional; system monospace is the fallback.

## Checks

`npm test` runs the scoring and progression unit tests. After `npm install`, run `node scripts/browser-check.mjs` with the local server running to smoke-test the UI using an installed Google Chrome. Set `GAME_URL` to test the deployed site.

## Deployment

GitHub Pages serves the root of the `main` branch. Pushes to `main` publish changes.
