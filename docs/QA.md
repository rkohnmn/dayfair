# QA record — 2026-10-26

## Automated unit checks

Command: `npm run check`. It performs JavaScript syntax checks and Node's built-in unit tests. 17 automated test cases were run and passed for money/date validation, daily occupancy, fixed-fee modes, absences, uncovered days, exact cent preservation, payer settlement, CSV formula escaping, validation failures and JSON backups.

## Browser interaction checks (actual Chromium, constrained environment)

Python Playwright and local Chromium were available. Direct browser navigation to `http://127.0.0.1:8765/`, a custom `https://.../repository-name/` route and a `file://` URL all returned `net::ERR_BLOCKED_BY_ADMINISTRATOR` in the provided sandbox, **despite an HTTP 200 check with curl**. To exercise user interactions despite that restriction, the optional smoke script used `page.set_content` with the repository's real CSS and combined the exact JavaScript module contents into an inline script, preserving the original behavior without network navigation. This exercises DOM/events/calculation code and layout but **does not prove asset requests, origin-restricted clipboard APIs or localStorage on a deployed origin**.

Executed browser checks passed for:

- Example renders `$351.00`, no JavaScript page errors.
- Add resident; change inclusive dates; recalculate without crash.
- Invalid fixed amount shows descriptive error; valid correction restores results.
- CSV report download, full-print-statement print action and JSON backup download.
- Start-fresh confirmation and backup restore round trip.
- Theme toggle.
- Desktop screenshot at 1440 pixels and mobile screenshot at 390 pixels.
- Mobile document did not overflow horizontally in the smoke check.

**Artifacts:** [desktop screenshot](screenshot-desktop.png) and [mobile screenshot](screenshot-mobile.png) are browser captures of actual generated page/logic. They are not design mockups. **Limitation:** the supplied sandbox blocks real URL navigation from Chromium. On a real GitHub Pages URL repeat the checks via browser without inlining and confirm storage, copy and navigation functions. Do not interpret sandbox smoke results as a real live Pages deployment verification.

## Subpath/static audit

All application links and asset references are relative: `./`, `./#workspace`, `privacy.html`, `assets/...`, `css/...`, `js/...`. The files are not dependent on a hostname root. Python's standard HTTP server returned HTTP 200 for `/`. The workflow packages only static files in `site/`, not Node modules. `python3 tests/static_audit.py` additionally assembled a static site under `/repository-name/`, checked HTML links and fetched all principal assets with HTTP 200 responses. However, **the end-to-end network request for a mocked `/repository-name/` was blocked by the sandbox administrator**, so a real subpath smoke test after publication is still necessary.

## Manual release checklist

- [x] Unit tests and JS syntax checks
- [x] Chromium inlined UI smoke interactions
- [x] Responsive no-horizontal-overflow check at 390 px
- [x] Dark/light toggle behavior smoke
- [x] Backup and CSV downloads smoke
- [x] Human visual review of screenshots; corrected low contrast of secondary results buttons
- [x] Repo relative-path audit and actual HTTP GETs under a subpath
- [x] GitHub Pages metadata build and canonical/social image URLs under a simulated repo subpath
- [ ] Live GitHub Pages deployment (requires repository owner to publish)
- [ ] Real-origin clipboard and localStorage behavior (blocked sandbox navigation)
- [ ] Independent screen-reader testing with NVDA/VoiceOver
- [ ] Exhaustive cross-browser compatibility (Safari/Firefox)
- [ ] Lighthouse performance/axe automated audit (not run)

## Operational notes

The 2026-10-26 1.0.1 release added four build/metadata tests. `npm run build -- --base-url https://example.github.io/dayfair/` produced a static site whose index and privacy canonical references, Open Graph image URL and X image URL were verified. The GitHub Pages action was not run because no public repository is connected.

Unit tests use no packages. The browser smoke test requires installing Python `playwright` plus an executable Chromium; this is **optional**, not required for application operation. Browser screenshots in this repository came from that script. Do not claim benchmark performance scores without real measurement.
