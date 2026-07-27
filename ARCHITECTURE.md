# ES Internship Hub Architecture

## Purpose

This repository is the static public-information hub for the eight-week ES Summer 2026 internship.
It explains the schedule, current FreshLens goal, evidence boundaries, owner lanes, and reference
material. The FreshLens application itself lives in a separate repository and is not vendored here.

The hub is an operational program surface, not release proof. Time-bound issue, pull-request,
device, model, deployment, and publication claims must remain labeled with their observed source
and date.

## Pages

- **`index.html`** — program overview, eight-week schedule, current Week 7 goal, Monday sequence,
  owner/issue map, evidence snapshot, and links to the detailed project board.
- **`freshlens.html`** — FreshLens product framing, local claim-loop boundary, current Week 7/8
  convergence plan, readiness matrix, owner lanes, and collapsed historical Week 6 record.
- **`provenance.html`** — research reference for signed decision evidence. It explicitly separates
  local binding/mock-anchor proof from blocked durability and external-trust work.
- **`w1.html`** — beginner Week 1 tutorial with copy controls, persisted step progress, and an
  optional timer.

All pages use relative links for local navigation and link to exact GitHub issues, pull requests,
commits, and documents when those identities matter.

## Runtime and assets

- Plain HTML with page-local CSS; there is no framework or build step.
- `w1.html` contains small client-side JavaScript for copy buttons, local progress persistence, and
  the optional timer. The other pages are static documents.
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
npx --yes html-validate index.html freshlens.html provenance.html w1.html
python3 ~/.codex/skills/design-quality-gate/scripts/check-ai-tells.py \
  index.html freshlens.html provenance.html w1.html
git diff --check
```

Also inspect all four pages in a real browser at desktop and mobile widths. Check skip links, main
landmarks, focus visibility, disclosure targets, table overflow, broken assets, and horizontal
clipping. Passing these local checks does not prove production publication; after an approved merge,
verify the deployed revision and live URLs separately.

## Maintenance boundaries

- CSS tokens and components are duplicated across page-local style blocks. Shared visual changes
  must be checked on all affected pages.
- `index.html` and `freshlens.html` intentionally repeat the current goal at different detail
  levels. Keep the Monday order, deadlines, canonical status vocabulary, owner map, and source
  revision consistent between them.
- Historical Week 6 material is preserved inside labeled disclosures. Current Week 7/8 instructions
  supersede it.
- Never infer native, TestFlight, rendered-product, model/data, recipe, durability, issuance,
  staging, or production readiness from a green static-site preview.
- Deployment is repository-connected and configured outside this source tree. Preview success,
  protected merge, production deployment, and post-deploy probes are separate gates.
