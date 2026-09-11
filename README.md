# Binglatro

A solo arcade bingo game built for one mobile screen, with a title screen, pause menu, help, restart, and saved-run resume.

- Each new run and stage shuffles all 25 board numbers. Rows, columns, diagonals, scoring animations, and paint effects follow the visible tile positions. The layout stays fixed during the stage and survives pause, rerolls, and saved-run resume.
- Unpainted balls and stamps are grey. Red paint supplies the ×2 scoring effect; saved orange paint upgrades migrate to red.
- Drag balls along the track to reorder them for free, with neighboring balls sliding into place. Drag one of three numbered balls anywhere onto the card; it snaps to its matching square. Tap a ball or board space for an anchored tooltip without spending a call. Space tooltips show “Nothing special” when unmodified and describe active paint effects. Tap again, tap elsewhere, or press Escape to dismiss.
- Each row, column, or diagonal activates its five spaces in order for points equal to each tile’s number, with red multipliers applied on top. For example, 3, 8, 12, 19, and 25 score 67 points, or 134 with one red ball in that line. Each activation pops, shows its actual points, and ticks the score up. Simultaneous lines each activate all five spaces, including shared spaces, then only their stamps clear.
- 12 calls per stage. Rerolls cost $1 each and spend no calls; they are disabled at $0. The played ball is removed for the rest of the stage, including after its stamp scores and clears. Unchosen balls return; redraws remove nothing. Each new stage refills all 25 balls.
- Ten stages with targets of 5, 10, 20, 40, 100, 200, 500, 1,000, 5,000, and 10,000. The stage map marks your current stage, completed stages, and locked future stages. Completing stage 10 finishes the run.
- The bag always displays all 25 balls. Played balls are greyed out for the rest of the stage, even after their stamps clear; they cannot be drawn again. Current offers have a cyan dot. The bag counter shows how many balls remain available.
- Compact score, money, and stage counters. Runs start with $5. Money carries between stages and resets to $5 on a new run; rerolls cost $1. Clearing a stage pays $1 per unused call. The call-meter pips lift off as pixel coins and fly into the money counter, which ticks up on each arrival. The paint shop opens after the payout, with no result modal. Failed stages pay no bonus.
- Original pixel-drawn ball, stamp, and felt SVG assets; strong mint highlights identify the three offered numbers on the board.
- A low-resolution teal-and-blue swirl drifts behind the game and ripples with a brief vibration on each played ball. Background movement is disabled for reduced-motion preferences.
- Rolling, magnetic placement, stamp impacts, pixel particles, synthesized impact sounds, and supported-device haptics. Reduced-motion preferences are respected.
- Keyboard: Enter inspects a focused ball; Space plays it. All icon controls have accessible labels.

## Paint shop

After each successful stage (except the final stage), three random balls from the full set are offered for painting. Drag gold, red, or blue paint onto a ball for $3; selecting paint then selecting a ball also works with touch or keyboard. Refresh the three balls for $2, or leave for the next stage at any time. Replacing an existing color costs $3; applying the same color again costs nothing and makes no change. Paint persists for the run and appears on the track, board, and bag. Painted tiles stay visibly tinted on the card even before they are stamped. Dragging paint previews its color on the nearest ball in the drop area. Shops and purchases are saved immediately.

- Gold balls pay $1 each time their space activates in a completed row, column, or diagonal. A coin flies into the wallet during scoring; adjacent plays give no bonus.
- Blue balls grant 3 extra calls each time their space activates in a completed row, column, or diagonal. The bonus flies into the call counter immediately during scoring. Calls can exceed 12; unused bonus calls are included in the stage payout. New stages start with 12 calls again. If every ball has been played below target, the run ends even with bonus calls remaining.
- Shared spaces activate once per completed pattern, including their gold or blue bonus. Red multiplies points only, not money or extra calls.
- Red balls double the points of every completed pattern containing them: horizontal rows, vertical columns, and diagonals. Multipliers are calculated only when a pattern scores. Multiple red balls multiply together (two give ×4), independently for each simultaneously completed pattern. The completed pattern flashes its multiplier before its spaces activate for multiplied points.

## Navigation and saves

Play starts a run. The pause icon opens Resume, Restart Run, Main Menu, and a sound toggle. Escape opens/closes pause between calls. Completed actions and ball order are saved locally; Resume restores the run after returning to the menu or refreshing. Restart asks before replacing the current run. Navigation is briefly disabled while a call or cash tally resolves.

Stage targets are unchanged. The current paint economy and late-stage difficulty have not yet been balanced; further scoring mechanics will be needed for the highest targets.

## Run locally

Run `npm start`, then open http://localhost:5173. Plain HTML/CSS/JavaScript; no production dependencies or build step. Google Fonts are optional with a system monospace fallback.

## Checks

`npm test` runs scoring and progression tests. After `npm install`, with the local server running and Google Chrome installed:

- `node scripts/paint-flow-check.mjs`: forgiving touch/mouse paint drops, preview, matching colors across bag/track/card/stamps, saved paint, and versioned resources.
- `node scripts/board-check.mjs`: shuffled run/stage layouts, position-based scoring and paint effects, drag placement, layout persistence, and saved-board validation.
- `node scripts/browser-check.mjs`: six viewport sizes, actual touch input, inspection, valid/invalid drops, bag, stage map, and redraws. Set `GAME_URL` to check the deployed site.
- `node scripts/navigation-check.mjs`: title, help, pause, restart, saved-run resume, sound settings, targets, and corrupt-save recovery.
- `node scripts/reorder-check.mjs`: touch and mouse reordering, cancellation, unchanged money/calls, and dragging from a reordered track onto the board. Set `GAME_URL` to check the live site.
- `node scripts/shop-check.mjs`: mobile shop layouts, touch/mouse painting, payment guards, saved offers, color persistence, gold payouts, red multipliers, and keyboard purchases.
- `node scripts/stage-check.mjs`: normal-motion scoring, stage progression, and final-stage restart using deterministic browser fixtures.

## Deployment

GitHub Pages serves the root of `main`. Before committing a release, run `python3 scripts/version-assets.py` to fingerprint the browser assets and avoid mixing cached code and styles. Pushes to `main` publish changes.
