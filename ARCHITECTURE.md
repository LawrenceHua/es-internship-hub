# ES Internship Hub Architecture

## Purpose

This repository is the static public-information hub for the eight-week ES Summer 2026 internship.
It explains the schedule, current FreshLens goal, evidence boundaries, owner lanes, and reference
material. The FreshLens application itself lives in a separate repository and is not vendored here.

The hub is an operational program surface, not release proof. Time-bound issue, pull-request,
device, model, deployment, and publication claims must remain labeled with their observed source
and date.

## Pages

- **`index.html`** — program overview, eight-week schedule, action-first Week 8 app/automation
  cards, a closed detailed-evidence disclosure, and collapsed historical week records.
- **`freshlens.html`** — FreshLens product framing, local claim-loop boundary, current Week 7/8
  truth, action-first install/lead/demo cards, guarded agent factory, iPhone/model boundary, a
  disclosed readiness matrix, owner lanes, and collapsed historical Week 6 record.
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
python3 scripts/verify_static_html.py
python3 scripts/verify_week8_contract.py --self-test
npx --yes html-validate index.html freshlens.html provenance.html w1.html
git diff --check
```

Also inspect all four pages in a real browser at desktop and mobile widths. Check skip links, main
landmarks, focus visibility, disclosure targets, table overflow, broken assets, and horizontal
clipping. Run design-tell checks against rendered visible copy and screenshots, not raw URL/date
attributes: immutable names such as `WEEK-08-...` resemble numbered UI labels to simple regex
linters. Passing these local checks does not prove production publication; after an approved merge,
verify the deployed revision and live URLs separately.

## Maintenance boundaries

- CSS tokens and components are duplicated across page-local style blocks. Shared visual changes
  must be checked on all affected pages.
- `index.html` and `freshlens.html` intentionally repeat the current goal at different detail
  levels. Keep the Day 1 truth gate, Tuesday/Thursday team sessions, Friday handoff, canonical
  status vocabulary, issue state, source revision, and automation authority boundaries consistent.
- Historical Week 6 material is preserved inside labeled disclosures. Current Week 7/8 instructions
  supersede it; Week 7 is also collapsed on the program overview once Week 8 begins.
- **`scripts/verify_static_html.py`** — deterministic, network-free validation for required page
  metadata, duplicate IDs, local links/fragments, and the Week 8 contract. The agent-factory recipe
  invokes this checked-in file; it does not execute inline interpreter code.
- **`scripts/verify_week8_contract.py`** — binds both public Week 8 start layers to the immutable
  curriculum commit and rejects app-status conflation, invented schedules/archive links, demo
  drift, device-matrix conflation, public-factory assumptions, and forbidden Slack routing. Its
  self-test mutates high-risk claims and proves the verifier fails closed.
- Never infer native, TestFlight, rendered-product, model/data, recipe, durability, issuance,
  staging, or production readiness from a green static-site preview.
- Agents return bounded `ACTION`, exact `EVIDENCE`, and explicit `REFUSAL` outputs. They do not
  silently mutate a PRD, promote a model, merge, deploy, publish, spend, or issue value.
- Simulator evidence may cover install, launch, navigation, permissions, offline/retry messaging,
  and retake states. Camera capture, hardware performance, thermals, archive lineage, and real-device
  model behavior require separately identified physical-device evidence.
- Deployment is repository-connected and configured outside this source tree. Preview success,
  protected merge, production deployment, and post-deploy probes are separate gates.
