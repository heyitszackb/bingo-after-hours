# Binglatro

A solo arcade bingo game with a horizontal table, numbered stamps, a bag, and scoring cards.

## Rules

- Each draw offers three available balls and three random empty spaces. Drag any ball toward an offered space; release over the board to use the closest valid space. Drag along the ball track to reorder. Tap a ball, stamp, or card to inspect it.
- Playing uses one call and removes that ball from the bag until the next stage. Start with 12 calls and $5; in-game rerolls cost $1. Stage targets remain **5, 10, 15, 20, 30, 40, 55, 70, 90, 120**.
- Start with Bingo. A completed row, column, or full diagonal scores one base point per tile. Each physical line pays once per stage. All stamps remain until the next stage; shared stamps can activate in another newly completed line. Squares and corners alone do not score.
- Unused calls pay $1 each after a win, then the shop opens. New stages replenish the bag and calls, and reset stamps and their values. Cards, ball upgrades, money, and run pattern counts carry over.

## Shop

Each shop offers two distinct random card types and two distinct random ball upgrades. Most purchases cost $3; Number Cruncher costs $7. Sold offers and rolled ranges stay fixed across reloads. Refresh all offers for $2; new Second Wind offers roll a new range.

Keep up to **five purchased cards alongside Bingo**. Copies stack and activate separately. Select a card to inspect it; drag it into the trash to remove that individual copy and free a slot. Bingo can also be removed, disabling line scoring.

- **Single Digits:** +1 when a stamp showing 1–9 scores.
- **Outer Layer:** +5 when a stamp in any of the 16 outermost spaces scores.
- **Number Cruncher ($7):** add the stamp’s current numeric value on top of its base point and other bonuses. X adds no numeric bonus. Doubled values count.
- **Second Wind ($3):** a random inclusive range of five numbers, starting anywhere from 1 through 21, is rolled for each shop offer. Each matching scored stamp restores one call, capped at 12. The bought range persists across stages. Resolve these bonuses before checking for a last-call loss; a stamp can restore calls again through another newly completed line.

Ball upgrades are applied to a chosen ball from all 25. A purchase replaces that ball’s previous upgrade; choosing the same upgrade cannot charge money.

- **Plasma:** the next turn reveals three empty spaces and makes every remaining bag ball available. The track and Plasma picker allow choosing after seeing those spaces. Picking costs nothing; placement uses one call and consumes the effect. Rerolls still cost $1 and retain the choice for that turn. Playing another Plasma can chain the effect; stage transitions reset it.
- **X:** no numeric value; displays X everywhere and can occupy any empty space. It completes lines and earns positional bonuses, but never qualifies for numeric bonuses or doubling.
- **Tornado:** on placement, randomly redistribute all placed stamps, including itself, among the 25 board spaces. Identity and current values travel with each stamp. Check the resulting board for unscored lines after the shuffle.
- **Dynamite:** return every neighboring stamp (all eight surrounding spaces) to the bag before scoring. Dynamite remains placed and unavailable in the bag. Returned balls retain upgrades and current values and can be drawn again. Play counts remain historical; bag availability is tracked separately.
- **Doubler:** on placement, double the current numbers in all eight neighboring spaces, excluding itself and X stamps. This changes eligibility for numeric card bonuses, not the one-point base score. Double before evaluating scoring.

Paints and the former free Single Digits card are removed when migrating older saves. Wallet, stage progress, existing stamps, and run counts remain; the old shop is replaced. New upgrades and purchases persist across reloads.

## Development and verification

`npm start` serves http://localhost:5173. `npm test` covers line scoring, persistent stamps, numeric and positional bonuses, all upgrades, resource costs, card limits, sold offers, and stage resets.

Browser checks require local Chrome and the installed Playwright dependency. Set `GAME_URL` to verify deployment:

- `node scripts/upgrade-shop-check.mjs`: purchases, responsive shop, five-card limit, touch trash, X placement, Doubler values, Tornado identity/value preservation, saves, and migration.
- `node scripts/number-engines-check.mjs`: new joker pricing, fixed ranges across reload/stage changes, call and point activations, Plasma choice and reload, drag placement, and mobile layouts. Set `REAL_MOTION=1` to check full animations.
- `node scripts/dynamite-check.mjs`: return flights, bag availability, replay values, and Tornado migration.
- `node scripts/scoring-motion-check.mjs`: sequential line activation, running subtotals, retained stamps, and effect cleanup.

Run `python3 scripts/version-assets.py` before committing to fingerprint browser resources. GitHub Pages publishes the root of `main`.

Existing scramble upgrades and saved scramble shop offers migrate from Dynamite to Tornado. Dynamite is a separate ball upgrade.
