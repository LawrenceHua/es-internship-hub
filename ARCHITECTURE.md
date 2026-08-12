# Internship hub architecture

## Purpose

This static hub is the operating brief for the eight-intern refrigerator
inventory pivot. It explains the Weeks 9–11 outcome, technical boundaries,
owner lanes, source/access limits, acceptance evidence, and three-week cadence.
It is not application source or release proof.

## Current truth boundary

- The intern product sandbox is an old, history-free snapshot and remains
  `UNBOUND` until an owner maps it to an exact pivot candidate SHA.
- All eight interns retain write access to the sandbox and hub for branches,
  pull requests, and review.
- Interns have no canonical product repository, production credential,
  deployment, signing, TestFlight upload, App Store submission, customer data,
  raw training corpus, or broad inbox authority.
- Legacy scanner, claim, service-provider, and model code is historical
  reference only. It does not define the pivot.

## Pages

- `index.html` — current outcome, three-week schedule, eight owner lanes, access
  boundary, and evidence rules.
- `freshlens.html` — detailed multi-capture, segmentation/tracking,
  identity/OOD, condition eligibility, receipt reconciliation, product journey,
  evaluation, privacy, and source-binding contract.
- `provenance.html` — archived notice for the retired claim-era research page;
  it redirects active work to the pivot brief.
- `w1.html` — historical beginner tutorial, not a current assignment surface.

## Runtime and verification

The hub is plain HTML with page-local CSS and no application backend. Serve it
locally with:

```bash
python3 -m http.server 8000
```

Verify with:

```bash
npx --yes html-validate index.html freshlens.html provenance.html w1.html
python3 ~/.codex/skills/design-quality-gate/scripts/check-ai-tells.py \
  index.html freshlens.html provenance.html w1.html
git diff --check
```

Also inspect desktop and mobile widths for clipping, table overflow, keyboard
focus, landmarks, link targets, and readable first-viewport hierarchy. Passing
local checks does not prove publication or product readiness.

## Maintenance rules

- Keep `index.html`, `freshlens.html`, and the sandbox Weeks 9–11 plan aligned.
- Do not replace `UNBOUND` with a candidate claim until the content-addressed
  source-binding manifest is complete and independently verified.
- Keep source, model/eval, iOS build, device, backend, deployment, TestFlight,
  App Store, website publication, and production evidence separate.
- Any contract, taxonomy, prompt, threshold, model, or candidate-SHA change
  invalidates affected downstream evidence.
