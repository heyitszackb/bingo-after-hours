# Binglatro

A solo arcade bingo MVP designed to fit one mobile screen.

## Current prototype

- The 5×5 board starts blank. Tiles have no permanent numbers or ball identities.
- Every draw pairs three random available balls (numbered 1–25) with three distinct random empty tiles. Only those destinations temporarily display their offered ball numbers. Rerolling changes both the balls and destinations. Reordering balls does not change their destinations.
- Drag a ball anywhere onto the card to stamp its assigned destination. The number disappears; the tile retains the played ball’s paint. Unchosen tiles become blank again. Played balls leave the bag until the next stage; unchosen balls remain available.
- Five pattern types score: full rows (5), columns (5), diagonals (5), the four outer board corners (4), and filled 2×2 squares anywhere (4). 3×3 squares do not score as a separate pattern. Each scoring tile earns 1 base point. Ball numbers have no scoring value. Simultaneous patterns each activate their tiles, including shared tiles, then their stamps clear. Other stamps remain. A cleared tile can later receive a different ball.
- Grey is the default paint. Red doubles the entire scoring pattern, stacking per red stamp. Gold pays $1 when its stamp scores. Blue grants 3 extra calls when its stamp scores. Shared stamps trigger once per completed pattern. Red multiplies points only, not money or calls.
- Each stage starts with 12 calls. Every play uses one. Rerolls cost $1, without using a call. Start a run with $5. Unused calls, including blue bonuses, fly into the wallet for $1 each after a win. Running out of calls or available balls below target ends the run.
- Prototype targets: **5, 10, 15, 20, 30, 40, 55, 70, 90, 120**. These are a starting curve for the one-point placement rules and need playtesting.
- After payout, the paint shop offers three random balls from all 25. Drag gold, red or blue paint onto a ball for $3. Refresh the shop’s balls for $2. Paint persists across stages. Repainting the same color makes no purchase. Touch/mouse drops preview their color; selecting paint then selecting a ball also works.
- The bag shows all 25 balls, with played balls greyed out and current offers marked. Tap a ball or tile for an anchored tooltip. Tile tooltips show their 1-point base and current paint effect.
- A bingo ledger opens from the grid button or score panel, with mini-board diagrams, base points, and scored counts for each pattern type. Counts persist across stages and reloads and reset on a new run. Overlapping instances count separately; red multipliers and paint activations do not inflate counts. Older saves start with zero counts.
- Main menu, pause/resume, restart confirmation, sound toggle, stage map and local saves. Saved destinations and placed paint survive reloading. Old numbered-board saves preserve stage, paints and money, but reset an active stage to the new blank board.
- Pixel ball and stamp sprites, rolling/snapping, sequential scoring, money and draw-bonus flights, background pulses, sound and haptics. Reduced-motion preferences are respected.

## Run and check

`npm start` serves the game at http://localhost:5173. No production dependencies or build step.

`npm test` covers deals, destinations, scoring, paint interactions, resource costs and progression. Browser checks require `npm install` and local Google Chrome. Each accepts `GAME_URL` for a deployed site:

- `node scripts/pattern-check.mjs`: scoring ledger, square scoring, run count persistence, restart and mobile layout.
- `node scripts/board-check.mjs`: blank board, random assignments, scoring and save migration.
- `node scripts/browser-check.mjs`: mobile sizes, touch drag, tooltips, bag and rerolls.
- `node scripts/reorder-check.mjs`: touch/mouse reordering and drag-to-play.
- `node scripts/navigation-check.mjs`: menus, pause, saves and stage targets.
- `node scripts/stage-check.mjs`: scoring, payout, progression and final restart.
- `node scripts/shop-check.mjs`: shopping, prices, paint bonuses and saved purchases.
- `node scripts/paint-flow-check.mjs`: paint preview and colors across bag, track, destinations and stamps.

## Publish

Run `python3 scripts/version-assets.py` before committing a release to fingerprint browser resources. GitHub Pages serves the root of `main`; pushing publishes changes.
