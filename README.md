# Binglatro

A solo arcade bingo game with a portrait table, numbered stamps, a bag, and scoring cards.

## Rules

- Each normal draw offers one available ball and one random empty space. Swipe the ball up to stamp the highlighted space, or down to pass and draw again. A deliberate vertical swipe commits on release; moving back before release cancels. Arrow Up/Down provide keyboard equivalents, and board dragging still works. Passing returns the offered ball to the bag, changes the ball and location when alternatives exist, and spends no money or play. Tap a ball, stamp, or card to inspect it. Tap the bag below the ball to open the unchanged bag inspection menu; inspecting never spends a resource.
- Playing uses one play and removes that ball from the bag until the next stage. Start with $5. Each round starts with 15 plays and 10 passes. Running out of passes only disables passing; playing remains available. Stage targets remain **5, 10, 15, 20, 30, 40, 55, 70, 90, 120**.
- Start with two removable rules: **Bingo** activates rows, columns, and diagonals of five; **Face Value** awards each scored tile its ball’s current number in points. X earns zero base points. Removing Bingo prevents all activations. Removing Face Value preserves activations and non-point effects, but awards zero points, including point bonuses. Each physical line pays once per stage. All stamps remain until the next stage; shared stamps can activate in another newly completed line. Squares and corners alone do not score.
- Unused plays pay $1 each after a win, then the shop opens. New stages replenish the bag, 15 plays and 10 passes, and reset stamps and their values. Cards, ball upgrades, money, and run pattern counts carry over.

The main screen has a compact menu/money header, the card rack, board, and a swipe lane with plays and passes remaining. The rack starts with Bingo, Face Value, and three blank placeholders; it fits additional owned cards without changing purchase limits. During scoring, a temporary tally replaces the ball lane: the entire scoring set lights up with Bingo, then each tile activates its points cards in order and sends its total to the tally. The final total settles before play resumes. No sound is generated. The pause summary retains round progress; stage and pattern viewers remain hidden.

## Shop

Each shop offers two distinct random card types and two distinct random ball upgrades. Most purchases cost $3; Number Cruncher costs $7. Sold offers and rolled ranges stay fixed across reloads. Refresh all offers for $2; new Second Wind offers roll a new range.

Keep up to **five purchased cards alongside the two starting rules**. Copies stack and activate separately. Select a card to inspect it; drag it into the trash to remove that individual copy and free a slot. Bingo can also be removed, disabling line scoring.

- **Single Digits:** +1 when a stamp showing 1–9 scores.
- **Outer Layer:** +5 when a stamp in any of the 16 outermost spaces scores.
- **Number Cruncher ($7):** add the stamp’s current numeric value on top of its Face Value points and other bonuses. X adds no numeric bonus. Doubled values count.
- **Second Wind ($3):** a random inclusive range of five numbers, starting anywhere from 1 through 21, is rolled for each shop offer. Each matching scored stamp restores one play, capped at 15. The bought range persists across stages. Resolve these bonuses before checking for a last-play loss; a stamp can restore plays again through another newly completed line.

Ball upgrades are applied to a chosen ball from all 25. A purchase replaces that ball’s previous upgrade; choosing the same upgrade cannot charge money.

- **Plasma:** the next turn reveals one empty space and makes every remaining bag ball available. The track and Plasma picker allow choosing after seeing that space. Picking costs nothing; placement uses one play and consumes the effect. Passing spends a pass, changes the location, and retains the choice until a ball is played. Playing another Plasma can chain the effect; stage transitions reset it.
- **X:** no numeric value; displays X everywhere and can occupy any empty space. It completes lines and earns positional bonuses, but never qualifies for numeric bonuses or doubling.
- **Tornado:** on placement, randomly redistribute all placed stamps, including itself, among the 25 board spaces. Identity and current values travel with each stamp. Check the resulting board for unscored lines after the shuffle.
- **Dynamite:** return every neighboring stamp (all eight surrounding spaces) to the bag before scoring. Dynamite remains placed and unavailable in the bag. Returned balls retain upgrades and current values and can be drawn again. Play counts remain historical; bag availability is tracked separately.
- **Doubler:** on placement, double the current numbers in all eight neighboring spaces, excluding itself and X stamps. This changes both Face Value points and eligibility for numeric card bonuses. Double before evaluating scoring.

Paints and the former free Single Digits card are removed when migrating older saves. Wallet, stage progress, existing stamps, and run counts remain; the old shop is replaced. New upgrades and purchases persist across reloads.

## Development and verification

`npm start` serves http://localhost:5173. `npm test` covers line scoring, persistent stamps, numeric and positional bonuses, all upgrades, resource costs, card limits, sold offers, and stage resets.

Browser checks require local Chrome and the installed Playwright dependency. Set `GAME_URL` to verify deployment:

- `node scripts/swipe-layout-check.mjs`: portrait layout, blank slots, unchanged bag inspection, mouse/touch swipes, release/cancel behavior, depleted passes, pause/reload, scoring payout, card purchases and round refill. Set `REAL_MOTION=1` to check full animations. The older `pass-play-check.mjs` documents the previous button interface.
- `node scripts/upgrade-shop-check.mjs`: purchases, responsive shop, five-card limit, touch trash, X placement, Doubler values, Tornado identity/value preservation, saves, and migration.
- `node scripts/number-engines-check.mjs`: new joker pricing, fixed ranges across reload/stage changes, call and point activations, Plasma choice and reload, drag placement, and mobile layouts. Set `REAL_MOTION=1` to check full animations.
- `node scripts/dynamite-check.mjs`: return flights, bag availability, replay values, and Tornado migration.
- `node scripts/starting-rules-check.mjs`: trigger-before-points ordering, exactly five Face Value activations per line, bonus ordering, zero-point activations, absent Bingo, migration and removed-rule persistence, and no audio. Set `REAL_MOTION=1` for full timing and scoring screenshots. Earlier scoring scripts preserve checks for previous rulesets.

Run `python3 scripts/version-assets.py` before committing to fingerprint browser resources. GitHub Pages publishes the root of `main`.

Existing scramble upgrades and saved scramble shop offers migrate from Dynamite to Tornado. Dynamite is a separate ball upgrade.

Old three-ball saves migrate to single draws and receive 10 passes; active rounds keep the number of plays already used against the new 15-play allowance. Finished-round payouts are preserved.

Existing saves receive Face Value once via joker version 4. Trashing either rule then persists across reloads and rounds. Stage targets are unchanged.

Motion references: [LocalThunk on the familiar solitaire feel](https://localthunk.com/blog/solitaire), [Indieklem’s Balatro UI analysis](https://indieklem.substack.com/p/20-a-look-at-100-interface-games), and [Folmer Kelly on contextual game polish](https://www.gdcvault.com/play/1020861/). The implementation uses an explicit trigger hold, synchronized contribution pulses, short squash/overshoot/settle beats, and a visible point destination. Reduced-motion settings retain the attribution sequence without travel effects.
