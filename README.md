# Binglatro

A solo arcade bingo game with a portrait table, numbered stamps, a bag, and two starting rule cards.

## Rules

- Each normal draw offers one available ball and one random empty space. Swipe up to stamp that space, or down to pass. Passing returns the ball to the bag, changes the ball and location when alternatives exist, and spends no money or play. Tap a ball, stamp, or card to inspect it. Tap the bag to inspect all 25 balls; played balls are greyed out.
- A deliberate swipe commits on release; returning to its start cancels. Arrow Up/Down are keyboard equivalents. Dragging onto the board also works.
- Start with $5, 15 plays and 10 passes. A placement uses one play and removes its ball from the bag for the round. Plays and passes replenish each round. Targets are **5, 10, 15, 20, 30, 40, 55, 70, 90, 120**.
- **Bingo:** score rows, columns, and diagonals of five. Each physical line activates once per round. Stamps remain on the board and may activate in other newly completed lines. Squares and corners alone do not score.
- **Face Value:** scored tiles earn their ball’s number in points. Removing Bingo prevents all activations; removing Face Value preserves activations but awards zero points. Drag either rule card to the trash to remove it for the run.
- Each unused play pays $1 after a win, then the shop opens. The next round resets placements and refills the bag, plays, and passes. Money and run pattern counts carry over.

The header contains menu, current score / target, and money. Scoring lights the complete line with Bingo, then activates each tile and Face Value in order. Points fly into the persistent header counter. No sound is generated. Mobile layouts fit without scrolling.

## Shop scaffold

The shop currently contains exactly two categories:

- **Cards:** persistent effects that live above the board. Two blank card slots.
- **Ball Upgrades:** powers applied to balls. Two blank circular slots.

Both catalogs in `game.js` are empty. Slots are visual placeholders, not purchasable items. There are no prices, reroll controls, or upgrade-selection dialogs. The shop shows money, a menu control, and **Next Round**. Add future item definitions and their behavior as those designs are agreed.

The previous shop cards and ball powers are retired. Shop-version migration removes purchased effects and restores altered ball values to their original numbers while retaining money, earned score, round progress, board positions, bag availability, and resource counts. Existing shop offers become blank slots. An active Plasma offer reduces to its first ball and current highlighted location. Removed starting rules stay removed.

## Development and verification

`npm start` serves http://localhost:5173. `npm test` covers drawing, passing, placement, scoring and rule removal, persistent stamps, round resets, empty shop behavior, and retirement of old effects and saves.

Browser checks use local Chrome and Playwright. Set `GAME_URL` to check deployment:

- `node scripts/shop-scaffold-check.mjs`: responsive empty shop, inert placeholders, no obsolete purchase controls, saved-shop and active-run migrations, menu/reload, and next-round resources.
- `node scripts/swipe-layout-check.mjs`: portrait layout, persistent score, bag inspection, mouse/touch swipes, pause/reload, payout and next round.
- `node scripts/starting-rules-check.mjs`: trigger-before-points order, five Face Value activations, score-counter increments, absent rules, save migration, input locking and no audio. Set `REAL_MOTION=1` to inspect full animation timing.

Other browser scripts document retired interfaces and effects. Tests for the removed powers have been replaced by retirement and migration regression checks.

Run `python3 scripts/version-assets.py` before committing to fingerprint browser resources. GitHub Pages publishes the root of `main`.

Motion references: [LocalThunk on the solitaire feel](https://localthunk.com/blog/solitaire), [Indieklem’s Balatro UI analysis](https://indieklem.substack.com/p/20-a-look-at-100-interface-games), and [Folmer Kelly on contextual game polish](https://www.gdcvault.com/play/1020861/).
