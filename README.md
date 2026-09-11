# Binglatro

A solo arcade bingo game built for one mobile screen, with a title screen, pause menu, help, restart, and saved-run resume.

- Drag balls along the track to reorder them for free, with neighboring balls sliding into place. Drag one of three ordinary numbered balls anywhere onto the card; it snaps to its matching square. Tap a ball or board space for an anchored tooltip without spending a call. Space tooltips show “Nothing special” until effects are added. Tap again, tap elsewhere, or press Escape to dismiss. Balls have no powers yet.
- Each row, column, or diagonal activates its five spaces in order for 1 point each (5 points per bingo). Each activation pops, shows +1, and ticks the score up. Simultaneous lines each activate all five spaces, including shared spaces, then only their stamps clear.
- 12 calls per stage. Rerolls cost $1 each and spend no calls; they are disabled at $0. The played ball is removed for the rest of the stage, including after its stamp scores and clears. Unchosen balls return; redraws remove nothing. Each new stage refills all 25 balls.
- Ten stages with targets of 5, 10, 20, 40, 100, 200, 500, 1,000, 5,000, and 10,000. The stage map marks your current stage, completed stages, and locked future stages. Completing stage 10 finishes the run.
- The bag always displays all 25 balls. Played balls are greyed out for the rest of the stage, even after their stamps clear; they cannot be drawn again. Current offers have a cyan dot. The bag counter shows how many balls remain available.
- Compact score, money, and stage counters. Runs start with $5. Money carries between stages and resets to $5 on a new run; rerolls cost $1. Clearing a stage pays $1 per unused call. The call-meter pips lift off as pixel coins and fly into the money counter, which ticks up on each arrival. The next-stage controls then appear on the track, with no result modal. Failed stages pay no bonus.
- Original pixel-drawn ball, stamp, and felt SVG assets; strong mint highlights identify the three offered numbers on the board.
- A low-resolution teal-and-blue swirl drifts behind the game and ripples with a brief vibration on each played ball. Background movement is disabled for reduced-motion preferences.
- Rolling, magnetic placement, stamp impacts, pixel particles, synthesized impact sounds, and supported-device haptics. Reduced-motion preferences are respected.
- Keyboard: Enter inspects a focused ball; Space plays it. All icon controls have accessible labels.

## Navigation and saves

Play starts a run. The pause icon opens Resume, Restart Run, Main Menu, and a sound toggle. Escape opens/closes pause between calls. Completed actions and ball order are saved locally; Resume restores the run after returning to the menu or refreshing. Restart asks before replacing the current run. Navigation is briefly disabled while a call or cash tally resolves.

The requested late-stage targets exceed what the current ordinary balls, 5-point lines, and 12-call limit can earn. Scoring powers or another progression mechanic are still needed to make all ten stages winnable.

## Run locally

Run `npm start`, then open http://localhost:5173. Plain HTML/CSS/JavaScript; no production dependencies or build step. Google Fonts are optional with a system monospace fallback.

## Checks

`npm test` runs scoring and progression tests. After `npm install`, with the local server running and Google Chrome installed:

- `node scripts/browser-check.mjs`: six viewport sizes, actual touch input, inspection, valid/invalid drops, bag, stage map, and redraws. Set `GAME_URL` to check the deployed site.
- `node scripts/navigation-check.mjs`: title, help, pause, restart, saved-run resume, sound settings, targets, and corrupt-save recovery.
- `node scripts/reorder-check.mjs`: touch and mouse reordering, cancellation, unchanged money/calls, and dragging from a reordered track onto the board. Set `GAME_URL` to check the live site.
- `node scripts/stage-check.mjs`: normal-motion scoring, stage progression, and final-stage restart using deterministic browser fixtures.

## Deployment

GitHub Pages serves the root of `main`. Pushes to `main` publish changes.
