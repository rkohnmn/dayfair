# Architecture, algorithms and product rules

Dayfair v1 uses HTML5, a single stylesheet and JavaScript ES modules. No dependencies, bundler, server, database or API. Static hosting serves `/index.html`, `/privacy.html`, `/css/*`, `/js/*` and `/assets/*`. Every URL is relative to the current repo folder. GitHub Pages subpaths work because assets use `css/styles.css` and `js/app.js`, links use `./` and `./#workspace`.

## Files and responsibilities

| File | Purpose |
|---|---|
| `js/engine.js` | Pure calendar parsing, strict money validation, per-day occupancy accounting, integer-cent allocation, multi-bill settlement, imported backup validation. |
| `js/sample.js` | Explicit worked example and fresh starter household. |
| `js/export.js` | CSV and plain-text reports; quotes cells and blocks spreadsheet formula interpretation of untrusted names. |
| `js/app.js` | UI event delegation, safe escaped editor rendering, live results, backups, local persistence, toasts, print and theme. |
| `css/styles.css` | Responsive editorial design system, tokens, focus states, dark/light themes and printable report. |
| `tests/engine.test.js` | Deterministic business logic tests (`node --test`). |
| `tests/browser_smoke.py` | Optional browser interaction/screenshot smoke test (needs Python Playwright and Chromium). |

No user content is evaluated or sent anywhere. User-controlled strings are HTML-escaped before insertion into editor/result markup. Backups have a versioned envelope and must recalculate validly before import.

## What “fair” means here

These are **editable assumptions**, not binding fairness or legal rules. A member has a first and final day of residence, plus zero or more inclusive absence periods. First/last day are both counted. Marking an absence removes that member from the **usage pool** but not from resident eligibility for fixed charges.

For a bill with a date range of `D` days and total `T` cents, fixed portion `F` cents, variable portion `V = T − F`:

1. Check that `F <= T` and that each bill is at most 366 calendar days.
2. For each calendar day in the bill, find the present residents (inside residence dates and outside declared absences).
3. If `V > 0` and a day has no present resident, **reject** the calculation and show the first uncovered date rather than silently allocating that day's usage to other people.
4. For each present resident on that day, add `1 / numberPresent` to their accumulated usage weight. Across the bill these weights add up to `D` if every day is covered.
5. Split `V` cents proportional to usage weights; separately allocate `F` by either (a) equal weights for everybody whose residence overlaps that bill or (b) number of days their residence overlaps the bill. A contracted-but-absent resident still carries fixed fees.
6. Turn the computed fractional cents into integer cents using **largest remainders**: floor each fractional share and assign leftover cents to highest fractional remainders, breaking exact ties in listed resident order.
7. For each resident: `balance = sum of bills they paid − sum of shares assigned to them` (integer cents). Positive balances are owed money; negative balances owe money. Match debtors to creditors greedily by descending absolute balance, producing settling transfers. This is an efficient netting procedure, not a mathematically proven minimal-edge transfer optimizer.

When a bill is entirely fixed, uncovered days are allowed. Zero-amount bills are also allowed. The app never asserts that a person actually used a given amount of electricity. It does not infer actual metered usage, a jurisdiction's regulations, or whether a personal agreement is enforceable. Dates are treated as civil UTC calendar days, not 24-hour elapsed intervals; DST transitions cannot change the day count.

## State & storage

`localStorage['dayfair-household-v1']` contains members, bills and currency on the current origin; `localStorage['dayfair-theme']` contains the theme choice. A sample household appears on first load without being silently saved. Inputs save on edit. `Clear` deletes the household key and displays a fresh, unsaved starter. The UI warns if browser storage is unavailable; users can export JSON at any point. Invalid **intermediate edits** may be saved locally so the user can fix them after refresh; imports are stricter and only accepted when the entire imported model is valid. The exported backup is a portable JSON file with `format: dayfair-v1`, a creation date and the data. The app does not sync with other devices.

## Limits and chosen simplifications

16 residents, 16 absence windows per resident, 40 bills and 366 days per bill. This keeps validation and day-by-day recomputation responsive in standard browsers without Web Workers and avoids accidental very large imports. Amounts are two-decimal, nonnegative, and at most 99,999,999.99 per bill. Five currencies are supported for *display denomination only*; changing currency does not convert amounts. No tax treatment, interest, payment rails, receipt ingestion, occupancy by hours, custom share percentages, legal jurisdiction data, recurring automation or individual meter data. Users decide which fixed portion to use; the app cannot extract a fixed fee from a PDF itself.

## Security model

The deployment is static. There are no third-party runtime scripts, analytics, fonts, HTTP APIs, service workers or postback forms. CSV escaping handles the spreadsheet formula-injection prefix class; imported JSON is length-limited and type/shape checked. `app.js` escapes HTML interpolated with household input. Remaining risks include local device access, browser extensions, pasted/external exported files and site-hosting operator logs. Do not frame localStorage as encryption.


## Search and sharing metadata

Source files omit canonical URLs until the deployment hostname is known. `scripts/build-site.mjs` takes the HTTPS site base URL from `actions/configure-pages@v5` (`base_url`) and writes a static `site/` artifact with canonical links (including `privacy.html`), absolute Open Graph and X image URLs, and `WebApplication` JSON-LD for the homepage. The published app never fetches metadata through an API. The source HTML remains fully functional without building, although rich social previews need the publication-time stamp.
