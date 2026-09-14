# Binglatro

A solo arcade bingo game with a portrait table, numbered stamps, a bag, and two starting rule cards.

## Rules

- Each normal draw offers one available ball and one random empty space. Swipe up to stamp that space, or down to pass. Passing returns the ball to the bag, changes the ball and location when alternatives exist, and spends no money or play. Tap a ball, stamp, or card to inspect it. Tap the bag to inspect your surviving collection, including added items; played pieces are greyed out and destroyed pieces are absent.
- A deliberate swipe commits on release; returning to its start cancels. Arrow Up/Down are keyboard equivalents. Dragging onto the board also works.
- Start with $5, 15 plays and 10 passes. A placement uses one play and removes its ball from the bag for the round. Plays and passes replenish each round. Targets are **5, 10, 15, 20, 30, 40, 55, 70, 90, 120**.
- **Bingo:** score rows, columns, and diagonals of five. Each physical line activates once per round. Stamps remain on the board and may activate in other newly completed lines. Squares and corners alone do not score.
- **Face Value:** scored tiles earn their ball’s number in points. Removing Bingo prevents all activations; removing Face Value preserves activations but awards zero points. Drag either rule card to the trash to remove it for the run.
- Each unused play pays $1 after a win, then the shop opens. The next round resets placements and refills the bag, plays, and passes. Money and run pattern counts carry over.

The header contains menu, current score / target, and money. Scoring lights the complete line with Bingo, then activates each tile and Face Value in order. Points fly into the persistent header counter. No sound is generated. Mobile layouts fit without scrolling.

## Shop

All shop additions are **free while testing**. The shop has three categories:

- **Cards:** persistent effects above the board; two blank slots for now.
- **Ball Upgrades:** changes to existing balls; two blank slots for now.
- **Items:** new pieces added to the bag. **Bomb** is available with a repeatable “Add to Bag” action and an owned count.

Each Bomb has a unique identity and the same per-piece draw probability as a numbered ball. It rolls and passes normally, and an unplayed Bomb survives round transitions. It is not a ball upgrade and has no number, so Face Value awards it zero points.

Placing a Bomb first completes and scores any eligible lines, including the Bomb’s occupied space. After every scoring activation finishes, the Bomb explodes. It permanently destroys itself and every item in its eight neighboring spaces for the rest of the run. The board spaces remain usable. Items outside that neighborhood survive; nearby Bombs are destroyed without starting chain explosions. Scored physical lines still activate at most once per round. Winning a round does not skip the explosion.

The collection tracks permanent ownership separately from the current bag. Every new round refills the bag from surviving items only. A new run restores the original 25 numbered balls. Saves preserve added Bombs, destroyed items, played availability and progress; pre-item saves receive the original collection.

Previous shop effects remain retired. The earlier migration removes them and restores original ball values while preserving money, earned score, round progress, board positions, availability, and resources. Removed starting rules stay removed.

## Development and verification

`npm start` serves http://localhost:5173. `npm test` covers drawing, passing, placement, scoring and rule removal, persistent stamps, round resets, shop behavior, Bomb draw/placement/scoring/destruction order, permanent collection changes, and save migration.

Browser checks use local Chrome and Playwright. Set `GAME_URL` to check deployment:

- `node scripts/bomb-check.mjs`: free repeated additions, responsive shop, dynamic bag/tooltip, scoring-before-explosion, no-line explosions, passing, reload and round persistence. Set `REAL_MOTION=1` for full-speed animation checks.
- `node scripts/shop-scaffold-check.mjs`: responsive empty shop, inert placeholders, no obsolete purchase controls, saved-shop and active-run migrations, menu/reload, and next-round resources.
- `node scripts/swipe-layout-check.mjs`: portrait layout, persistent score, bag inspection, mouse/touch swipes, pause/reload, payout and next round.
- `node scripts/starting-rules-check.mjs`: trigger-before-points order, five Face Value activations, score-counter increments, absent rules, save migration, input locking and no audio. Set `REAL_MOTION=1` to inspect full animation timing.

Other browser scripts document retired interfaces and effects. Tests for the removed powers have been replaced by retirement and migration regression checks.

Run `python3 scripts/version-assets.py` before committing to fingerprint browser resources. GitHub Pages publishes the root of `main`.

Motion references: [LocalThunk on the solitaire feel](https://localthunk.com/blog/solitaire), [Indieklem’s Balatro UI analysis](https://indieklem.substack.com/p/20-a-look-at-100-interface-games), and [Folmer Kelly on contextual game polish](https://www.gdcvault.com/play/1020861/).
