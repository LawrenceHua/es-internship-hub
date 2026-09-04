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
| 1 | `index.html` | Program surface 1 | Program overview | Program overview, eight-week core plus three-week extension schedule, the Monday sequence, owner/issue map, evidence snapshot, and links to the detailed project board. Preserved as a dated snapshot of the Week 12 start page; see the historical note on the page itself. |
| 2 | `freshlens.html` | Program surface 2 | FreshLens | FreshLens product framing, local claim-loop boundary, convergence plan, readiness matrix, owner lanes, and a collapsed historical Week 7 record fenced as history. |
| 3 | `provenance.html` | Program surface 3 | Provenance receipts | Research reference for signed decision evidence. It explicitly separates local binding and mock-anchor proof from blocked durability and external-trust work. |
| 4 | `w1.html` | Program surface 4 | Week 1 tutorial | Beginner Week 1 tutorial with copy controls, persisted step progress, and an optional timer. |
| 5 | `ledger.html` | Program surface 5 | Program Ledger | The Program Ledger reader. It fetches ledger.json and uptime.json at runtime and renders them; it hardcodes no row, no total, and no date. |
| 6 | `how-it-works.html` | Program surface 6 | How Xpired works | The system map in plain language: apps, the AI boundary, storage, and the release and watcher robots. |
| 7 | `day-of-a-change.html` | Classroom series 1 | A day of a change | Eleven stations from brief to post-deploy record. |
| 8 | `automation.html` | Classroom series 2 | The automation inventory | The inventory of workflows, backend schedulers, watchers, and agent lanes, each with a status label and a "must never do" boundary. |
| 9 | `ml-loop.html` | Classroom series 3 | The ML loop today | The five-stage ML pipeline and its consent boundaries. |
| 10 | `ground-truths.html` | Classroom series 4 | Ground truths | Fifteen ranked ground truths with evidence labels. |
| 11 | `lesson-plan.html` | Classroom series 5 | Lesson plan | Six lessons plus one stretch exercise a student can run on a free account. |
| 12 | `diagrams.html` | Classroom series 6 | The system in pictures | The rendered system diagrams with their sources, plus the backup deep-dives for the 9/10 presentation. |
| 13 | `presentation.html` | Classroom series 7 | The 9/10 presentation | The deck for the September 10 class talk: the end-to-end loop diagram, seven stations from marketing to ops monitoring with what fires, what each must never do, and where the evidence lands, closing on the four decisions that stay human. |

The site is 13 HTML pages. This table is generated: add or remove a page in `pages.json` and
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
  the mtime of each job's declared output, and derives the status from those three — loaded with a
  fresh artifact is live, a definition present but not loaded is dark, a retired definition is
  retired. It carries `generated_at`, which the page shows.
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
  `ls *.html`, and the denied names and terms must appear in no `.html`, `.md` or `.json` file. It
  fails closed: the badge parser and the denylist matcher are proved against built-in fixtures before
  the tree is scanned, and fewer than 20 badges site-wide is itself a failure.
- **`scripts/denylist.json`** — the denied personal names and out-of-scope terms, stored as salted
  digests rather than in clear text, so keeping them off the site does not publish them in the
  repository instead. See `scripts/README-denylist.md`.
- **`scripts/render-pages.js`** — generates the page table and verification command line in this file
  from `pages.json`, checks the six classroom footers against it, and fails when `pages.json` and
  `ls *.html` disagree.
- **`scripts/check-mermaid.sh`** — re-renders every `assets/diagrams/*.mmd` with `mmdc` and compares
  the result against the committed `.png`. It renders each source twice, so a diagram that will not
  draw identically twice is reported as unverifiable by name rather than as changed. It is local-only
  and fails closed: with no `mmdc` on the machine it reports that it cannot verify rather than
  passing. It keeps two allowlists, each on its own counter so a PASS never absorbs one: PNGs with no
  `.mmd` of their own, and PNGs this machine cannot re-render twice alike. An entry on the second
  list does not say the picture is right; it says this gate cannot answer for it, and the script
  records the measurement and the date a human last compared the two by eye.
- **`assets/diagrams/`** — `system-map`, `plan-order` and `where-robots-run` as both `.mmd` source and
  committed `.png`, plus `system-map-lr.png`, the same system map at a smaller scale, which shares
  `system-map.mmd` and is therefore on the no-source allowlist. As of 2026-09-04 `system-map.png` and
  `where-robots-run.png` reproduce from their committed sources; `plan-order.png` does not reproduce
  on this machine at all and is on the unreproducible allowlist with its measurement.

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
next gate run. Neither is scheduled; a human runs them and commits the result.

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
npx --yes html-validate index.html freshlens.html provenance.html w1.html \
  ledger.html how-it-works.html day-of-a-change.html automation.html \
  ml-loop.html ground-truths.html lesson-plan.html diagrams.html \
  presentation.html
python3 ~/.codex/skills/design-quality-gate/scripts/check-ai-tells.py \
  index.html freshlens.html provenance.html w1.html \
  ledger.html how-it-works.html day-of-a-change.html automation.html \
  ml-loop.html ground-truths.html lesson-plan.html diagrams.html \
  presentation.html
bash scripts/check-mermaid.sh
git diff --check
```

Every one of the 13 pages is named on both command lines, and both lists are generated from
`pages.json`. A validator pointed at a subset reports a clean result for pages it never opened,
which is the same failure the hub teaches against.

<!-- END GENERATED verification — written by scripts/render-pages.js from pages.json; do not edit by hand -->

Also inspect all twelve pages in a real browser at desktop and mobile widths. Check skip links, main
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
