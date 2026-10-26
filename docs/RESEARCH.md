# Market research & product decision

**Research date:** 2026-10-26 (US Eastern). **Research type:** targeted web search, supplier/competitor feature pages, product repositories and qualitative public discussions. **Confidence:** directional; no interviews, search volume study, willingness-to-pay experiment, or statistically representative survey was conducted.

## Decision

Build **Dayfair**, a stand-alone, local-first reconciliation worksheet for shared household utility bills when the number of residents changes during each billing period. The intended users are roommates, housemates, student houses, subletters and people coordinating shared bills. The job is not merely *divide $150 by 3*. It is *explain how different billing periods, residence windows and time away affect each person's share, then settle what each member already paid*.

Dayfair's hypothesis is that a transparent worksheet spanning **several bills and payers** has practical utility in the gap between single-bill calculators and general shared-expense ledgers. This is a hypothesis, not proven market whitespace or a claim that no competitor supports the workflow.

## Evidence of the problem

| Evidence (public, anecdotal) | What it supports | Caution |
|---|---|---|
| r/roommateproblems, Mar 13, 2024: discussion of whether vacation absence affects fixed versus usage charges. [Thread](https://www.reddit.com/r/roommateproblems/comments/1be5saa/how_should_utilities_be_split_if_one_roommate_is/) | Users debate fee separation and daily calculation method. | Comments disagree; not a consensus or legal norm. |
| r/badroommates, Feb 24, 2025: housemates' refusal to pay during summer absence. [Thread](https://www.reddit.com/r/badroommates/comments/1ix3eaa/all_3_roommates_will_be_gone_for_summer_break/) | Real household payment disputes are not just arithmetic; agreements are required. | Self-reported account, not a population estimate. |
| r/roommates, Aug 4, 2026: July move-out after 17 days and how much of a bill should be paid. [Thread](https://www.reddit.com/r/roommates/comments/1vfnfe6/utility_split/) | Mid-period move-outs are a live user question. | Isolated anecdote; parties' prior agreement may govern. |
| r/WhatShouldIDo, May 1, 2026: dispute over a shared utility calculation and the correct number of days away. [Thread](https://www.reddit.com/r/WhatShouldIDo/comments/1t0un0j/roommate_changed_utilities_split_without/) | Explicit days and explainable method reduce ambiguity. | Anecdotal; calculator cannot decide fairness. |
| r/excel, Feb 26, 2025: comparing CSV exports with changing rows during data migration. [Thread](https://www.reddit.com/r/excel/comments/1iyz24v/compare_2_csv_files/) | Strong demand for practical browser utilities more broadly, but this was *not* chosen due to competition. | Separate product category. |

## Direct alternatives (sources checked on 2026-10-26)

| Product | Confirmed public offer | Dayfair focus / tradeoff |
|---|---|---|
| [TNAADO move-in/move-out calculator](https://tools.tnaado.ca/calculators/general/roommate-bill-split-move-in-move-out-calculator/) | Splits a single bill daily among active occupants, with inclusive move dates; runs in browser. | Dayfair layers several billing periods, fixed-fee methods, payer credits and net settlements together. |
| [hausync calculators](https://www.hausync.com/tools) | Includes a utility split calculator for move-ins/out and travel days, plus a separate rent-split calculator. | Dayfair is a combined multi-bill worksheet, not a replacement for full house management. |
| [bill.ninja utility split calculator](https://bill.ninja/utility-split-calculator/) | Single-bill methods for equal split, by days or room weight, including a fixed service charge. | Dayfair emphasizes per-calendar-day occupancy and a payer ledger across different bill windows. |
| [billmates utility bill splitter](https://billmates.me/utility-bill-splitter/) | Split a single bill by roommate days; free, no signup. | Dayfair uses explicit inclusive dates and multiple bills rather than just totals of days. |
| [Spliit (open-source)](https://github.com/spliit-app/spliit) | Mature shared-expense tracker with groups, uneven splits, receipts and balances; stores group data on a server as described in its [privacy policy](https://spliit.app/privacy-policy). | Spliit is better for collaborative shared-expense tracking. Dayfair avoids accounts/server storage and specializes in bill-date allocation. |
| [Splitwise](https://feedback.splitwise.com/knowledgebase/articles/2010350) | Official help page confirms a daily expense limit on its free tier. | Not a claim that Splitwise lacks date-based custom splits; Dayfair intentionally avoids recurring account features. |

Prices are intentionally omitted when current pricing could not be verified with enough precision. Product feature descriptions are based on their published pages, not first-hand competitor QA. **No claim of unique market exclusivity is made**; the niche already has credible alternatives.

## Candidate comparison (qualitative, team judgment)

| Candidate | Need | Competition | Static feasibility | Retention mechanism | Decision |
|---|---|---|---|---|---|
| General CSV reconciliation | High for some business workflows; public forum evidence | Numerous sophisticated products: [CSV Reconcile](https://tools.cosmovexapps.com/csv-reconcile), [CSV Diff](https://www.csvdiff.org/), [Diffchecker](https://www.diffchecker.com/excel-compare/) | Excellent | Recurring system exports | Not selected: strong overlap with existing mature tools. |
| Shift and hourly pay calculator | Paychecking and overnight shifts are real pains | Strong free options such as [TimeWorked](https://timeworked.net/) and [Hourcard](https://hourcard.net/) | Excellent | Weekly use | Not selected: differentiation would be narrow and legal overtime complexity grows fast. |
| Simple utility bill calculator | Clear household tensions | Free single-bill tools widely available | Excellent | Monthly use | Not selected *alone*: too easy to clone; weak advantage. |
| **Multi-bill, day-explainable household reconciliation** | Narrow but emotionally and financially salient; supports shared discussions | General ledgers and one-bill calculators provide substitutes | Excellent | Each new billing period; reusable household dates and backups | **Selected**: focused combination of dates, charges, payers, auditability, no backend. |

This ranking is a qualitative decision matrix, *not* a numerical user study. Winning assumes enough users manage multiple overlapping household bills to prefer a specialized worksheet.

## Why this version exists

- The first view is a **completed interactive example**. A user can adjust one date and immediately see totals change.
- **Every bill retains its own start/end dates**, payer, usage amount and fixed fee, so electricity and water cycles need not align.
- **Fixed fee allocation is a choice**: equal among people resident during that bill, or proportional to residence days. The product does not silently impose a moral or legal rule.
- **Per-day allocation** means a day with one resident does not cost the same per resident as a day with three. This differs from dividing the entire charge only by total person-days.
- Exact cents, visible daily activity strips, member-by-bill reports, balances and suggested transfers support explaining and documenting an agreement.
- No login, third-party API, expense import or hosted group link, keeping hosting and privacy simple; the tradeoff is no multi-device collaboration.

## Distribution hypotheses and realistic tests

**Search intent:** “split utilities roommate moved out mid month”, “shared utility bill different dates”, “roommate absent fixed service charge”, and “calculate who owes each roommate for electric and internet.” Product documentation should explain precise answers, not mass-generate SEO pages.

**Sharing:** users can send an intentionally exported CSV report or copied summary in a roommate discussion. There is no public/shareable URL containing personal data. A self-hostable, static MIT repository is another discoverability hook for privacy-conscious audiences.

**Validation after launch:** recruit 5–8 households with varied move-in and vacation scenarios, ask them to solve a recent bill without coaching, time the task, observe disagreements about methods, and measure whether they trust the breakdown. Record opt-in qualitative feedback; no analytics SDK is included. Test the landing headline and documentation search phrases only after user demand is validated. Optional monetization is not implemented; a future paid hosted collaboration service would be a *separate opt-in offering* while keeping the local core free.

## Brand/name check

A quick web query on 2026-10-26 did not surface an obvious exact-match result for “Dayfair” in the specific utility-bill-splitting context. Search results cannot establish domain, corporate name or trademark availability. **No trademark clearance was performed.** Conduct a jurisdiction-appropriate legal/name search before commercialization.

## Further reading

- [GitHub Pages custom workflows (official)](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), accessed 2026-10-26.
- [Engineering-team skills catalog](https://github.com/alirezarezvani/claude-skills/blob/main/engineering-team/skills/engineering-skills/SKILL.md), accessed 2026-10-26; useful architecture/QA orientation, not copied code.

**Source hygiene:** competitor facts are labeled as vendor claims; public threads are anecdotes. No traffic, revenue, pricing projections, invented usage metrics, fake reviews or market-size estimates are used.

## Pricing model check (2026-10-26)

The rejected CSV-compare category supplies an example of a paid incumbent: [Diffchecker's published pricing page](https://www.diffchecker.com/pricing/) lists a free Basic tier, a Pro + Desktop tier advertised at $15/user/month with offline desktop access and exports, and an annual Enterprise tier at $40/user/month. The vendor may change rates or the monthly-vs-annual presentation. The household expense category shows both free no-account options (e.g. Spliit's open-source hosted service) and [Splitwise's Pro upsell](https://feedback.splitwise.com/knowledgebase/articles/2010350) to remove a documented daily free-tier expense limit. We did **not** confirm Splitwise's exact subscription price and do not infer it. Dayfair v1 is free open-source software with no commercial features.
