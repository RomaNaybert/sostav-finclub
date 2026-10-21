# Design QA

Previous result: blocked

Source visual truth: `design/references/02-noticeboard.png` (1487×1058).
Implementation: `docs/screenshots/desktop-tab.png`, normalized comparison crop `docs/screenshots/desktop.png` (1488×1058).
Viewport: approximately 1488×1058 CSS px, browser zoom 0.9. In-app screenshot/export and raw CDP screenshots used different backing density. Full-page screenshot was read at its natural CSS content size; reference width normalized by 1 px. Incorrect intermediate raw CDP captures are excluded from accepted evidence.
State: Maria signed in, feed, all categories, four seeded active publications. Additional test publication is closed.

## Comparison history

1. Initial capture: rectangular hero background, missing custom project marks, spacing drift (P1/P2). Fixed by matching blend mode and generating separate raster assets.
2. Combined comparison `docs/screenshots/comparison-desktop.jpg` and focused `comparison-cards.jpg`: main composition, palette, hero, four-column feed are present. Custom stamp selector initially inherited hero image dimensions; fixed by narrowing the selector. Sticky note and project illustrations were enlarged toward the source proportions.
3. Responsive pass found 7 px horizontal overflow near 981 px and 4 px near 1200 px caused by the rotated stamp. Fixed by moving stamp inward and reducing its size in the affected range. Final capture and remeasurement are pending because browser access was disabled.

## Required fidelity surfaces

- Typography: local Golos Text, 400–900 weights, readable Cyrillic. Similar heavy heading, but exact reference typeface and paper print rendering differ. Card line wrapping needs final comparison after fixes.
- Spacing/layout: major four-column desktop composition and single-column phone composition implemented. Narrow desktop stamp overflow fixed in source, not reverified.
- Colors: cream, forest green, coral and pink card mapped to CSS tokens. Texture is cleaner than generated paper.
- Images: separate generated binder clips, stamp, note, coffee illustration, Nota/Orbit marks and fictional portraits. WebP versions preserve transparency; no CSS drawing substitutes for these assets.
- Copy: all core headings and four project concepts retained. Authors simplified to the two real demo accounts to make all data and actions consistent. Additional fields/states extend the mock to satisfy the assignment.

## Findings

- [P2] Final responsive recheck pending at 981/1200 px. Do not assert absence of overflow until measured again.
- [P2] Final visual comparison pending after asset sizing and component extraction.
- [P3] Paper texture and precise generated typography are not pixel-identical.

## Interactions checked

Browser: login/logout, candidate response, owner acceptance, candidate result/contact, create draft, publish, close, restored session, vacancy filter, empty state, network failure/retry, mobile dialog scrolling and Escape. Browser JS error logs were empty before access was disabled.

## Implementation checklist

1. Enable Local browser use in Work settings.
2. Reopen local preview, check final desktop and mobile states.
3. Recheck 981/1200 px overflow and save final evidence.
4. Compare final full view and focused cards to source before changing result to passed.


## Final live pass — 21 October 2026

Source: `design/references/02-noticeboard.png`, 1487×1058, normalized width by 1 px.
Implementation: https://roman-naipert.com/finclub/ . `docs/screenshots/live-desktop.png` (1488×1125 full page), `live-desktop-viewport.png` (1488×1058 viewport crop). Explicit browser viewport API used, CSS viewport 1488×1058, screenshot density 1. No stretching of implementation.

Full comparison: `docs/screenshots/live-comparison.jpg`. Focused comparison: `docs/screenshots/live-cards-comparison.jpg`. Phone: `docs/screenshots/live-mobile.png`, 390 CSS px. State: Maria, feed, all four seeded projects.

Earlier P1/P2 issues resolved: standalone assets present, hero rectangular background removed, stamp selector corrected, responsive overflow removed. The ten-width final pass has no horizontal overflow or broken images (`docs/responsive-final.json`).

Typography: readable local Golos Text at intended hierarchy, large heavy heading and smaller UI labels; exact generated type shapes differ. Layout: header, headline/hero, search, filters and four-column board retained; mobile stacks without losing controls. Colors: cream/forest/coral/pink palette retained. Assets: individually generated real raster art in the selected direction, crisp WebP with alpha. Copy: headings and projects preserved, authors intentionally mapped to the two demo accounts. These source differences are documented and do not claim a pixel-identical render.

Remaining P3 polish: generated paper grain is cleaner in implementation; hero sculpture and small illustration shapes are close recreations rather than identical pixels; small font metrics differ. No blocking P0/P1/P2 functional or responsive findings remain.

Live interactions: login, logout, application send, owner acceptance, candidate outcome and Telegram contact, reload with retained secure cookie. Earlier local browser verified create/publish/close draft, filters, empty/error/retry, mobile forms and Escape. Browser JS error log empty in final live pass.

final result: passed
