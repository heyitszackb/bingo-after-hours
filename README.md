# Binglatro

A solo arcade bingo game with a portrait table, numbered stamps, a bag, and two starting rule cards.

## Rules

- Each normal draw offers one available ball and one random empty space. Swipe up to stamp that space, or down to pass. Passing returns the ball to the bag, changes the ball and location when alternatives exist, and spends no money or play. Tap a ball, stamp, or card to inspect it. Tap the bag to inspect your surviving collection, including added items; played pieces are greyed out and destroyed pieces are absent.
- A deliberate swipe commits on release; returning to its start cancels. Arrow Up/Down are keyboard equivalents. Dragging onto the board also works.
- Start with $5, 15 plays and 10 passes. A placement removes its piece from the bag for the round and uses one play, except Rocks, which cost no play. Plays and passes replenish each round. Targets are **5, 10, 15, 20, 30, 40, 55, 70, 90, 120**.
- **Bingo:** score rows, columns, and diagonals of five. Each physical line activates once per round. Stamps remain on the board and may activate in other newly completed lines. Squares and corners alone do not score.
- **Face Value:** scored tiles earn their ball’s number in points. Removing Bingo prevents line activations; other trigger cards still work. Removing Face Value preserves activations but awards zero points. Drag either rule card to the trash to remove it for the run.
- Each unused play pays $1 after a win, then the shop opens. The next round resets placements and refills the bag, plays, and passes. Money and run pattern counts carry over.

The header contains menu, current score / target, and money. Scoring lights the complete line with Bingo, then activates each tile and Face Value in order. Points fly into the persistent header counter. No sound is generated. Mobile layouts fit without scrolling.

## Developer bag editor

Open **View Bag → Debug** to edit a draft of the full collection, including currently played pieces. Change each row’s type, value and copy count; add/remove rows; or use **Base 1–25**, **Current Bag**, and **Clear**. The editor supports up to 500 pieces, duplicate numbers, zero/negative values, Bombs, dice, powered 100 Balls and Rocks. Dice use the Value field as a permanent roll modifier (0 means normal). A plain numbered 100 has no special power.

**Apply & Restart Round** replaces the collection and restarts the current round with a clear board, zero round score, 15 plays and 10 passes. It preserves the stage, money, cards and historical pattern counts. Closing the editor or returning to bag inspection discards the draft. Applied bags persist through reloads and round transitions; starting a fresh run restores the standard 1–25 collection.

`node scripts/debug-bag-check.mjs` covers draft/cancel/reset, responsive layout, custom values and duplicates, validation, applying to a progressed round, scoring, and save/round persistence. `test/debug-bag.test.js` verifies independent identities and interactions with powers.

## Shop

All shop additions are **free while testing**. Every available purchase appears on one horizontally scrollable shelf, with a type label, effect description, owned count and add action. Swipe sideways, use the browse arrows, or focus the shelf and use the keyboard. Bought cards stay visible as added; bag pieces can be added repeatedly.

- **Cards:** **High Five** is free: playing a 1–5 scores itself and occupied neighbors immediately above, right, below, and left. Trigger groups resolve in rack order. Bingo and High Five can score the same tile separately; each activation uses Face Value if owned. Scoring a tile never re-triggers High Five, and dice qualify by their rolled value. Up to five purchased cards can be held and removed through the rack.

- **Ball Upgrades:** no upgrades are currently available, so there are no empty purchase placeholders.
- **Items:** new pieces added to the bag. **Bomb**, **20-Sided Die**, **100 Ball**, and **Rock** are available with a repeatable “Add to Bag” action and an owned count.

Each Bomb has a unique identity and the same per-piece draw probability as a numbered ball. It rolls and passes normally, and an unplayed Bomb survives round transitions. It is not a ball upgrade and has no number, so Face Value awards it zero points.

Placing a Bomb immediately triggers its explosion, before any scoring checks or card activations. Scoring uses the surviving board, so lines broken by the blast do not score. It permanently destroys itself and every item in its eight neighboring spaces for the rest of the run. The board spaces remain usable. Items outside that neighborhood survive; nearby Bombs are destroyed without starting chain explosions. Scored physical lines still activate at most once per round. The explosion also resolves on the final play; it cannot earn points from the line it destroys.

The **20-Sided Die** has the same draw odds as every other piece and shows `?` before placement. Playing it rolls uniformly from 1–20, then scoring uses that number. Its faceted stamp keeps the result for the round, including later line activations. Passing never rolls it. The next round returns surviving dice to the bag unrolled; Bombs can permanently destroy them. The roll animation finishes before Bingo and Face Value activate.

The **100 Ball** starts at value 100. When played, it permanently subtracts 1 from each occupied orthogonal neighbor with a numeric value, before any scoring groups are built. Empty and numberless spaces are unaffected; diagonals and the source are excluded. Reductions accumulate through zero into negatives and stay with the affected pieces across rounds and reloads. Dice keep the permanent modifier on future rolls. Destruction removes a piece’s modifiers, and a new run resets them.

Number-changing effects emit a common source/tile/before/after/delta event. The UI holds the pre-effect board, pulses the source, sends a colored marker to each target, flips its old number into the new one, and settles all changes before activating scoring cards. Negative scoring uses signed labels; the header progress bar never becomes negative.

**Rock** is numberless and contributes zero points, but occupies a space for Bingo and other scoring groups. Placing one costs no play; passing still spends one pass. Rocks leave the bag when placed and return next round if they survive. High Five can include a Rock but a Rock cannot trigger it. Value-changing effects skip Rocks; Bombs destroy them. A win preserves the unused play for the normal cash payout.

The collection tracks permanent ownership separately from the current bag. Every new round refills the bag from surviving items only. A new run restores the original 25 numbered balls. Saves preserve added Bombs, destroyed items, played availability and progress; pre-item saves receive the original collection.

Previous shop effects remain retired. The earlier migration removes them and restores original ball values while preserving money, earned score, round progress, board positions, availability, and resources. Removed starting rules stay removed.

## Development and verification

`npm start` serves http://localhost:5173. `npm test` covers drawing, passing, placement, scoring and rule removal, persistent stamps, round resets, shop behavior, Bomb draw/placement/destruction-before-scoring order, permanent collection changes, and save migration.

Browser checks use local Chrome and Playwright. Set `GAME_URL` to check deployment:

- `node scripts/bomb-check.mjs`: free repeated additions, responsive shop, dynamic bag/tooltip, explosion-before-scoring, no-line explosions, passing, reload and round persistence. Set `REAL_MOTION=1` for full-speed animation checks.
- `node scripts/shop-scaffold-check.mjs`: responsive horizontal shop, no obsolete purchase controls, saved-shop and active-run migrations, menu/reload, and next-round resources.
- `node scripts/swipe-layout-check.mjs`: portrait layout, persistent score, bag inspection, mouse/touch swipes, pause/reload, payout and next round.
- `node scripts/starting-rules-check.mjs`: trigger-before-points order, five Face Value activations, score-counter increments, absent rules, save migration, input locking and no audio. Set `REAL_MOTION=1` to inspect full animation timing.

Other browser scripts document retired interfaces and effects. Tests for the removed powers have been replaced by retirement and migration regression checks.

Run `python3 scripts/version-assets.py` before committing to fingerprint browser resources. GitHub Pages publishes the root of `main`.

Motion references: [LocalThunk on the solitaire feel](https://localthunk.com/blog/solitaire), [Indieklem’s Balatro UI analysis](https://indieklem.substack.com/p/20-a-look-at-100-interface-games), and [Folmer Kelly on contextual game polish](https://www.gdcvault.com/play/1020861/).

`node scripts/rock-check.mjs` verifies shop/debug availability, free placement, numberless presentation, zero-point scoring, reloads, preserved-play payout, and next-round availability.

### Encore and card order
Drag the cards above the board to reorder them; nearby cards slide aside to preview the position. Left/Right arrow keys also move a focused card. Drag to the trash or press Delete to remove it. Order persists across reloads and rounds.

Encore is a free shop card that retriggers the card immediately to its right. It repeats Bingo/High Five scoring groups or Face Value contributions per tile. Rightward Encore chains are finite; a rightmost Encore does nothing. Each replay animates Encore, then its target card. Physical Bingo history still counts each completed line once.

Checks: `node scripts/encore-check.mjs` (optional `REAL_MOTION=1`) covers reordering, saved order, replay animations, removal, and shop purchase.

### Seed
Seed is a free, repeatable shop bag piece, also available in the Debug bag editor. It starts at 1 and spends one play when placed. Each subsequent piece played grows every Seed already on the board by +1, including free Rocks and other Seeds. Passing, scoring, and Encore replays do not grow Seeds. Growth is permanent across rounds and resolves before scoring (after the 100 Ball's reductions and before a Bomb explodes). High Five checks the placed Seed's current value. Destroyed Seeds leave the collection normally.

Growth uses the shared signed-value animation, with green +1 badges. Multiple changes to the same space animate sequentially so a 100 Ball's -1 and a Seed's +1 remain legible. `node scripts/seed-check.mjs` checks shop, art, growth/scoring order, persistence and debug values; `REAL_MOTION=1` runs full animations.

### One-pick reward shop
After the round payout, choose one free reward from two distinct random cards and two distinct random bag pieces. The selection immediately starts the next round; there is no separate Continue button. Offers persist across reloads and only one reward can be claimed. The two card offers are sampled without duplicates from the current card catalog. The five purchased-card limit still applies; full racks can choose a bag piece. Debug bag editing remains available for unrestricted testing. `node scripts/reward-shop-check.mjs` verifies this flow; older catalog browser scripts describe the previous multi-purchase shop.

### Silver Lining and active cards
Silver Lining adds +30 each time a negative-valued tile scores. It is a points modifier, never a scoring trigger. Face Value still contributes the negative number, so -4 earns -4 + 30 = 26 with both cards. Zero and numberless pieces do not qualify. Encore retriggers this contribution normally.

Full Sweep introduces active cards: inspect the card, then Activate to score every occupied tile in board order through the same points-card pipeline. It costs no play/pass, keeps the offered piece/location and all stamps, does not trigger placement powers or alter Bingo history, and can win the round. Each copy is usable once per round and remembers its used state across reloads; a new round refreshes it. Encore immediately to its left retriggers that activation. Empty boards cannot spend an activation. Cards remain draggable/removable. Both cards join the four-choice reward shop pool.

`node scripts/active-cards-check.mjs` verifies contribution animations, activation/reload, wins/payout, and reward purchases. Use `REAL_MOTION=1` for full-motion checks.

### Compact reward layout
The reward shop shows all four offers together: two smaller cards on the top row, two tokens beneath. Short effect summaries replace full paragraphs and owned counts; full descriptions remain in accessible labels. There is no scrolling shelf or browse control. The one-free-choice flow is unchanged. Responsive browser checks verify all four choices fit simultaneously at 320×568, 390×844, 1000×800, and 844×390.
