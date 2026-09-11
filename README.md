# Bingo After Hours

A solo arcade bingo game built for one mobile screen.

- Drag one of three ordinary numbered balls anywhere onto the card; it snaps to its matching square. Tap a ball to inspect it without spending a call. Balls have no powers yet.
- Each row, column, or diagonal activates its five spaces in order for 1 point each (5 points per bingo). Each activation pops, shows +1, and ticks the score up. Simultaneous lines each activate all five spaces, including shared spaces, then only their stamps clear.
- 12 calls and two free redraws per stage. The played ball is removed for the rest of the stage, including after its stamp scores and clears. Unchosen balls return; redraws remove nothing. Each new stage refills all 25 balls.
- Ten stages with targets from 10 to 100. The stage map marks your current stage, completed stages, and locked future stages. Completing stage 10 finishes the run.
- The bag displays only remaining balls and marks current offers with a cyan dot. Its counter decreases after each play.
- Compact score, money, and stage counters. Money starts at $0; earning and spending are not implemented.
- Rolling, magnetic placement, stamp impacts, pixel particles, synthesized impact sounds, and supported-device haptics. Reduced-motion preferences are respected.
- Keyboard: Enter inspects a focused ball; Space plays it. All icon controls have accessible labels.

## Run locally

Run `npm start`, then open http://localhost:5173. Plain HTML/CSS/JavaScript; no production dependencies or build step. Google Fonts are optional with a system monospace fallback.

## Checks

`npm test` runs scoring and progression tests. After `npm install`, with the local server running and Google Chrome installed:

- `node scripts/browser-check.mjs`: six viewport sizes, actual touch input, inspection, valid/invalid drops, bag, stage map, and redraws. Set `GAME_URL` to check the deployed site.
- `node scripts/stage-check.mjs`: normal-motion scoring, stage progression, and final-stage restart using deterministic browser fixtures.

## Deployment

GitHub Pages serves the root of `main`. Pushes to `main` publish changes.
