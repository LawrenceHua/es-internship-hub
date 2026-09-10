# ES Internship Hub Architecture

## Purpose

This repository is the static public-information hub for the eight-week core + three-week extension ES Summer 2026 internship.
It explains the schedule, current FreshLens goal, evidence boundaries, owner lanes, and reference
material. The FreshLens application itself lives in a separate repository and is not vendored here.

The hub is an operational program surface, not release proof. Time-bound issue, pull-request,
device, model, deployment, and publication claims must remain labeled with their observed source
and date.

## Pages

`pages.json` is the single source for this list. Change it there, then run
`node scripts/render-pages.js --write`; `--check` fails when this table, the verification
command line, or a classroom footer has drifted from it.

<!-- BEGIN GENERATED pages-table — written by scripts/render-pages.js from pages.json; do not edit by hand -->

| # | Page | Series | Title | What it is |
|---|---|---|---|---|
| 1 | `index.html` | Show and tell 1 | Show and tell | The front door for the September 10 lecture: one founder directing six connected business and technical systems through bounded agents, evidence gates, human decisions and feedback. The last generated product readback is retained as an explicitly dated disclosure, not presented as current state. |
| 2 | `build-your-own.html` | Show and tell 2 | Build your own | The pattern in plain language for running a one-founder product company with AI agents: agents write, gates verify, a human presses release. The minimum stack to copy, what to copy first, what it costs, and three lessons drawn from the program ledger. |
| 3 | `system-business.html` | Six connected systems 1 | Business system | How the founder identifies a problem, defines evidence, directs bounded work and owns business and release decisions. |
| 4 | `system-marketing.html` | Six connected systems 2 | Marketing system | How evidence-backed promises, audience response and human publication approval connect marketing to product decisions. |
| 5 | `system-frontend.html` | Six connected systems 3 | Frontend system | How the shopper interface and public teaching surfaces turn capability into clear, accessible and testable interactions. |
| 6 | `system-backend.html` | Six connected systems 4 | Backend system | How API routes, services, persistence and manual release gates turn interface intent into bounded operations. |
| 7 | `system-data.html` | Six connected systems 5 | Data and database system | How application records, curated reference data, consented feedback and training-eligible examples stay distinct. |
| 8 | `system-ml.html` | Six connected systems 6 | Machine-learning system | How consent, dataset eligibility, candidate evaluation and human promotion keep machine learning evidence-gated. |
| 9 | `how-it-works.html` | How it is built 1 | How Xpired works | The system map in plain language: apps, the AI boundary, storage, and the release and watcher robots. |
| 10 | `ledger.html` | How it is built 2 | Program Ledger | The Program Ledger reader. It fetches ledger.json and uptime.json at runtime and renders them; it hardcodes no row, no total, and no date. |
| 11 | `provenance.html` | How it is built 3 | Provenance receipts | Research reference for signed decision evidence. It explicitly separates local binding and mock-anchor proof from blocked durability and external-trust work. |
| 12 | `day-of-a-change.html` | Classroom series 1 | A day of a change | Eleven stations from brief to post-deploy record. |
| 13 | `automation.html` | Classroom series 2 | The automation inventory | The inventory of workflows, backend schedulers, watchers, and agent lanes, each with a status label and a "must never do" boundary. |
| 14 | `ml-loop.html` | Classroom series 3 | The ML loop today | The five-stage ML pipeline and its consent boundaries. |
| 15 | `ground-truths.html` | Classroom series 4 | Ground truths | Fifteen ranked ground truths with evidence labels. |
| 16 | `diagrams.html` | Classroom series 5 | The system in pictures | System diagrams with their Mermaid sources, phone layouts, and the daily timeline, rollback path and service cost checklist. |
| 17 | `w1.html` | Program archive 1 | Week 1 tutorial (moved) | One-line redirect stub. The beginner Week 1 tutorial moved to program/w1.html when the site was reframed for the September 10 show-and-tell; the page itself is unchanged. |
| 18 | `lesson-plan.html` | Program archive 2 | Lesson plan (moved) | One-line redirect stub. The six-lesson plan moved to program/lesson-plan.html when the site was reframed for the September 10 show-and-tell; the page itself is unchanged. |
| 19 | `presentation.html` | Program archive 3 | The 9/10 presentation (moved) | One-line redirect stub. The original September 10 internship deck moved to program/presentation.html; the current site's front door supersedes it for the new audience. |
| 20 | `freshlens.html` | Program archive 4 | FreshLens (moved) | One-line redirect stub. The FreshLens program page moved to program/freshlens.html when the site was reframed for the September 10 show-and-tell; the page itself is unchanged. |

The site is 20 HTML pages. This table is generated: add or remove a page in `pages.json` and
re-run `node scripts/render-pages.js --write`. The classroom series is read in the order above,
and every one of its pages carries a footer listing all of them.

<!-- END GENERATED pages-table — written by scripts/render-pages.js from pages.json; do not edit by hand -->

**Data and tooling**

- **`ledger.json`** — the hand-written program ledger: `window`, `verdict_key`, `entries`, and a
  `validated` stamp. Nothing generates it; the stamp is the only freshness claim it makes.
- **`uptime.json`** — a hand-maintained cloud-uptime snapshot. It carries `curated_at` and
  `"source": "hand-maintained"` precisely because no producer writes it. `ledger.html` renders it.
- **`automation.json`** — the watcher inventory `automation.html` renders. Generated, not typed:
  `emit_automation_inventory.py` reads `launchctl list`, the job definitions on the owner's Mac, and
  the mtime of each job's declared output, and derives the status from those three: loaded with a
  fresh artifact is live, a definition present but not loaded is dark, a retired definition is
  retired. It carries `generated_at`, which the page shows above the inventory table. Output ages explicitly say "before this reading".
- **`automation-copy.json`** — the human half of that inventory, keyed by launchd label: what a job
  does and what it must never do. It owns meaning and nothing else; cadence, freshness and status
  come from the machine. A job the producer finds in scope with no entry here renders as
  **undocumented**, which is how a job nobody has described surfaces instead of being silently
  absent from the page.
- **`release-state.json`** — where the product actually is: the App Store review state and how long
  it has been waiting, the commit the production server reports, how far behind the release branch
  that is, and whether any in-house model is loaded. `emit_release_state.py` writes it and the
  matching block on `index.html`, `freshlens.html` and `how-it-works.html`. Every source is private
  to the owner's machine or is an endpoint this site does not name, so the block is REPORTED, never
  VERIFIED, and it states when each source was read.
- **`pages.json`** — the single source for which pages exist: `file`, `title`, `series`,
  `series_order` and `summary` per page. The table and the verification command line above are
  generated from it, and the classroom footers are checked against it.
- **`scripts/validate-ledger.js`** — the gate behind both files. No dependencies. It enforces the
  entry schema, the verdict vocabulary, the rule that VERIFIED requires at least one openable public
  link and REPORTED requires zero, and the `uptime.json` shape. `--stamp` rewrites the `validated`
  stamp with a sha256 of the entries, so an edited ledger with an untouched stamp fails. `--site`
  applies the same evidence rule to the pages: every VERIFIED badge needs an openable public link in
  its own block, no page may redefine VERIFIED without that requirement, `pages.json` must agree with
  `ls *.html`, and the denied names and terms must appear in no `.html`, `.md`, `.mmd` or `.json` file.
  Literal and encoded em dashes are rejected in HTML, including generated comments. It
  fails closed: the badge parser and the denylist matcher are proved against built-in fixtures before
  the tree is scanned, and fewer than 20 badges site-wide is itself a failure.
- **`scripts/denylist.json`** — the denied personal names and out-of-scope terms, stored as salted
  digests rather than in clear text, so keeping them off the site does not publish them in the
  repository instead. See `scripts/README-denylist.md`.
- **`scripts/render-pages.js`** — generates the page table and verification command line in this file
  from `pages.json`, checks the six classroom footers against it, and fails when `pages.json` and
  `ls *.html` disagree.
- **`scripts/check-mermaid.sh`** re-renders each source twice using `mmdc --quiet -s 3`
  and requires both PNG hashes to equal the committed PNG. Every source-backed picture is checked;
  no renderer exception remains. `system-map-lr.png` is the existing alternate-scale picture on the
  no-source allowlist.
- **`assets/diagrams/`** holds the original system, work-order and runtime-location diagrams,
  the business and feedback loops, phone variants of the system, work-order and runtime-location maps,
  and the daily timeline, rollback path and service cost checklist. Phone labels are wrapped
  in the source instead of shrinking a wide diagram. The timeline is a dated reading of
  `automation.json`, including inactive schedule definitions labeled DARK or RETIRED.
- **`scripts/check-classroom.py`** reads `pages.json`, captures every page at 390 and 1440 pixels,
  checks page overflow, console errors and broken images, and measures evidence-chip contrast
  from computed foreground/background styles in light and dark mode. It also measures the
  business-loop CSS height and requires at least 600 pixels at the phone width.
- **`scripts/test-automation-producer.py`** runs offline wrapper, command-resolution, freshness,
  marker migration and refusal regressions against the external producers. It does not run a job.
- **`scripts/refresh-release-state.py`** invokes the external release producer for this checkout,
  adapting its legacy generated-comment punctuation in memory. This keeps its source probes and
  fail-closed writes while using the site's plain-punctuation marker format. The external release
  producer itself is unchanged; use this entry point for future refreshes of this branch.

Two producers write into this repository from outside it, because the facts they publish only exist
on the owner's machine: **`es-ops/bin/emit_automation_inventory.py`** and
**`es-ops/bin/emit_release_state.py`**. Each writes its `.json` and rewrites one marker-delimited
generated region on the pages, in the same `<!-- BEGIN GENERATED … -->` idiom `render-pages.js` uses,
so a hand edit inside a region is overwritten rather than quietly kept. Both are fail-closed in the
same way: if a source cannot be read — no `launchctl`, no health response, an unparseable artifact —
the producer exits 2 and leaves every published file byte-identical, so a page can show an old
`generated_at` but can never show an empty table or a blank state. Both also re-check the exact text
they are about to write against `scripts/denylist.json`, using a matcher that proves itself against
the validator's canary first, so a denied name is refused at the producer instead of waiting for the
next gate run. Scheduling and publication are external to this repository. Refreshes do not commit or publish by themselves.

Refresh only the checkout you intend to review:

```bash
python3 ~/es-ops/bin/emit_automation_inventory.py --hub "$PWD"
python3 scripts/refresh-release-state.py
```

The release-state wrapper accepts `--dry-run`. A scheduler still calling the external
release producer directly must adopt the repository wrapper when this marker-format
change is merged. Scheduler definitions are outside this PR's write scope.


All pages use relative links for local navigation and link to exact GitHub issues, pull requests,
commits, and documents when those identities matter.

## Runtime and assets

- Plain HTML with page-local CSS; there is no framework or build step.
- Two pages run client-side JavaScript. `w1.html` has copy buttons, local progress persistence, and
  the optional timer. `ledger.html` fetches and renders `ledger.json` and `uptime.json`, sanitising
  both before display and degrading to a plain-data link when either fetch fails. The other ten
  pages are static documents.
- Fonts load from Google Fonts when network access is available; system fallbacks remain declared.
- Social-preview PNGs, the SVG favicon, and the Apple touch icon are tracked in this repository.
- There is no backend, model, API, credential, customer data, or application state in this repo.

Serve the directory locally:

```bash
python3 -m http.server 8000
```

Then open `http://127.0.0.1:8000/`.

## Verification

There is no repository-pinned package manifest. The current review workflow uses an ephemeral HTML
validator plus browser inspection:

<!-- BEGIN GENERATED verification — written by scripts/render-pages.js from pages.json; do not edit by hand -->

```bash
node scripts/validate-ledger.js
node scripts/validate-ledger.js --site
node scripts/render-pages.js --check
npx --yes html-validate index.html build-your-own.html system-business.html system-marketing.html \
  system-frontend.html system-backend.html system-data.html system-ml.html \
  how-it-works.html ledger.html provenance.html day-of-a-change.html \
  automation.html ml-loop.html ground-truths.html diagrams.html \
  w1.html lesson-plan.html presentation.html freshlens.html
python3 ~/.codex/skills/design-quality-gate/scripts/check-ai-tells.py \
  index.html build-your-own.html system-business.html system-marketing.html \
  system-frontend.html system-backend.html system-data.html system-ml.html \
  how-it-works.html ledger.html provenance.html day-of-a-change.html \
  automation.html ml-loop.html ground-truths.html diagrams.html \
  w1.html lesson-plan.html presentation.html freshlens.html
bash scripts/check-mermaid.sh
git diff --check
```

Every one of the 20 pages is named on both command lines, and both lists are generated from
`pages.json`. A validator pointed at a subset reports a clean result for pages it never opened,
which is the same failure the hub teaches against.

<!-- END GENERATED verification — written by scripts/render-pages.js from pages.json; do not edit by hand -->

Also inspect every page in `pages.json` in a real browser at desktop and mobile widths. Check skip links, main
landmarks, focus visibility, disclosure targets, table overflow, broken assets, and horizontal
clipping. Passing these local checks does not prove production publication; after an approved merge,
verify the deployed revision and live URLs separately.

## Maintenance boundaries

- CSS tokens and components are duplicated across page-local style blocks. Shared visual changes
  must be checked on all affected pages.
- `index.html` and `freshlens.html` intentionally repeat the goal at different detail levels. Keep
  the Monday order, deadlines, canonical status vocabulary, owner map, and source revision
  consistent between them.
- Historical material is preserved inside labeled disclosures and dated snapshot lines, never
  deleted and never presented as current. As of 2026-09-03 the dated program material on
  `index.html` (Week 12, Monday Aug 17), the Week 7 block on `freshlens.html` (Jul 27–31) and the
  Week 7 framing on `provenance.html` are all historical notes, not live instructions. When this
  file previously described a "current Week 7 goal" it was describing the program as it stood in
  July 2026.
- Evidence vocabulary is program-wide and is not redefined per page: **VERIFIED** requires at least
  one public link a reader can open; a citation that resolves only inside the private product
  repository is **REPORTED**. `scripts/validate-ledger.js` enforces this for `ledger.json` and
  `node scripts/validate-ledger.js --site` enforces it on every page, legends included.
- No personal name other than the program lead's appears on any page, and no GitHub handle of a
  cohort member appears anywhere. Use role labels ("a Week 12 intern", "the cohort", "two
  reviewers", "Faculty co-lead"), or let an issue or pull-request number carry the identity.
- The production API host is not published on this site (see hub commit `89a9422`). The canary host
  is withheld on the same grounds; describe a health check without naming its URL.
- Never infer native, TestFlight, rendered-product, model/data, recipe, durability, issuance,
  staging, or production readiness from a green static-site preview.
- Deployment is repository-connected and configured outside this source tree. Preview success,
  protected merge, production deployment, and post-deploy probes are separate gates.
