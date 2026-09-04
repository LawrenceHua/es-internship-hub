# ES Internship Hub Architecture

## Purpose

This repository is the static public-information hub for the eight-week core + three-week extension ES Summer 2026 internship.
It explains the schedule, current FreshLens goal, evidence boundaries, owner lanes, and reference
material. The FreshLens application itself lives in a separate repository and is not vendored here.

The hub is an operational program surface, not release proof. Time-bound issue, pull-request,
device, model, deployment, and publication claims must remain labeled with their observed source
and date.

## Pages

The site is twelve HTML pages. Any change to that list must be made here, in the classroom-series
footers, and in the verification command below, together.

**Program surface**

- **`index.html`** — program overview, eight-week core + three-week extension schedule, the Monday
  sequence, owner/issue map, evidence snapshot, and links to the detailed project board. It is
  preserved as a dated snapshot of the Week 12 start page; see the historical note on the page itself.
- **`freshlens.html`** — FreshLens product framing, local claim-loop boundary, convergence plan,
  readiness matrix, owner lanes, and a collapsed historical Week 7 record fenced as history.
- **`provenance.html`** — research reference for signed decision evidence. It explicitly separates
  local binding/mock-anchor proof from blocked durability and external-trust work.
- **`w1.html`** — beginner Week 1 tutorial with copy controls, persisted step progress, and an
  optional timer.
- **`ledger.html`** — the Program Ledger reader. It fetches `ledger.json` and `uptime.json` at
  runtime and renders them; it hardcodes no row, no total, and no date.
- **`how-it-works.html`** — the system map in plain language: apps, AI boundary, storage, and the
  release/watcher robots.

**Classroom series** — six pages, read in a fixed order. All six carry the same ordered footer nav,
and every one of the six must list all six.

1. **`day-of-a-change.html`** — eleven stations from brief to post-deploy record.
2. **`automation.html`** — the inventory of workflows, backend schedulers, watchers, and agent lanes,
   each with a status label and a "must never do" boundary.
3. **`ml-loop.html`** — the five-stage ML pipeline and its consent boundaries.
4. **`ground-truths.html`** — fifteen ranked ground truths with evidence labels.
5. **`lesson-plan.html`** — six lessons plus one stretch exercise a student can run on a free account.
6. **`diagrams.html`** — the rendered system diagrams and the presentation track.

**Data and tooling**

- **`ledger.json`** — the hand-written program ledger: `window`, `verdict_key`, `entries`, and a
  `validated` stamp. Nothing generates it; the stamp is the only freshness claim it makes.
- **`uptime.json`** — a hand-maintained cloud-uptime snapshot. It carries `curated_at` and
  `"source": "hand-maintained"` precisely because no producer writes it. `ledger.html` renders it.
- **`scripts/validate-ledger.js`** — the gate behind both files. No dependencies. It enforces the
  entry schema, the verdict vocabulary, the rule that VERIFIED requires at least one openable public
  link and REPORTED requires zero, and the `uptime.json` shape. `--stamp` rewrites the `validated`
  stamp with a sha256 of the entries, so an edited ledger with an untouched stamp fails.
- **`assets/diagrams/`** — `system-map`, `plan-order` and `where-robots-run` as both `.mmd` source and
  committed `.png`, plus `system-map-lr.png`. Nothing today re-renders the PNGs from the `.mmd`, so a
  change to one must be made to the other by hand.

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

```bash
node scripts/validate-ledger.js
npx --yes html-validate index.html freshlens.html provenance.html w1.html ledger.html \
  how-it-works.html day-of-a-change.html automation.html ml-loop.html ground-truths.html \
  lesson-plan.html diagrams.html
python3 ~/.codex/skills/design-quality-gate/scripts/check-ai-tells.py \
  index.html freshlens.html provenance.html w1.html ledger.html \
  how-it-works.html day-of-a-change.html automation.html ml-loop.html ground-truths.html \
  lesson-plan.html diagrams.html
git diff --check
```

Every page must be named on both command lines. A validator that is pointed at a subset of the site
reports a clean result for pages it never opened, which is the same failure the hub teaches against.
`ls *.html | wc -l` must equal the number of files listed above.

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
  repository is **REPORTED**. `scripts/validate-ledger.js` enforces this for `ledger.json`;
  `ground-truths.html` and `lesson-plan.html` must state the same rule in their legends.
- No personal name other than the program lead's appears on any page, and no GitHub handle of a
  cohort member appears anywhere. Use role labels ("a Week 12 intern", "the cohort", "two
  reviewers", "Faculty co-lead"), or let an issue or pull-request number carry the identity.
- The production API host is not published on this site (see hub commit `89a9422`). The canary host
  is withheld on the same grounds; describe a health check without naming its URL.
- Never infer native, TestFlight, rendered-product, model/data, recipe, durability, issuance,
  staging, or production readiness from a green static-site preview.
- Deployment is repository-connected and configured outside this source tree. Preview success,
  protected merge, production deployment, and post-deploy probes are separate gates.
