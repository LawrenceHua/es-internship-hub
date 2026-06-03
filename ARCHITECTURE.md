# ARCHITECTURE

## What it is
A static, two-page marketing/landing website for the "Talk Me Up" Summer 2026 internship program (run under the brand "Expired Solutions"), pitching a 10-week AI-first internship whose flagship project is **FreshLens** (a multi-item produce freshness-scanning feature). It is a website *about* the program — not the internship's application code.

## Stack
- **Plain HTML + inline CSS.** No build step, no framework, no JavaScript logic (only static SVG icons inline in markup).
- External fonts via Google Fonts (`Inter`).
- No package manager, no `package.json`, no dependencies, no tests, no CI/deploy config in the repo.

## How to run
Open the files directly in a browser, or serve the directory statically:
```
open index.html                  # macOS, opens in default browser
# or serve the folder:
python3 -m http.server 8000      # then visit http://localhost:8000/
```
There is nothing to install or build.

## Architecture
Two self-contained pages; all styling lives in a `<style>` block inside each file (no shared/external CSS). Navigation between them is plain relative `<a href>` links.

- **`index.html`** — program overview / landing page. Sections: hero, the FreshLens project pitch (3 "pillars"), production-stats band, two-week onboarding, a 10-week timeline with start-date pills, weekly schedule, guest-speaker cards, and a tools/stack grid. Links out to `freshlens.html` and to external GitHub repos.
- **`freshlens.html`** — deep-dive on the flagship project: the "leap" framing, how-it-works pillars, a shopper-flow strip, an ASCII architecture diagram (camera frame → object detector → per-item crop → freshness model → overlay → Claude action layer), and a Week 5–8 build plan. Links back to `index.html` and out to the starter repo.

Data flow: none at runtime. These are fully static documents; the only network calls a browser makes are for the Google Fonts stylesheet/font files.

## Key files
- `index.html` — main landing page (~1065 lines; hero, timeline, schedule, tools).
- `freshlens.html` — FreshLens project detail page (~295 lines; architecture diagram + 4-week build plan).
- `ARCHITECTURE.md` — this file.

## Notes / gotchas
- **The repo is just these two HTML files.** No backend, ML model, or API actually lives here. The "214 API endpoints", "596K data rows", "99%+ ML accuracy", YOLO/PyTorch/FastAPI/Claude stack, and the FreshLens architecture diagram are *marketing copy describing the internship project*, not code present in this repository.
- The actual starter/project code is referenced as an external repo: `github.com/LawrenceHua/es-intern-freshlens` (linked from both pages; not vendored here).
- CSS is duplicated per page (each has its own `:root` token block and rules); a change to shared styling must be made in both files.
- No favicon, no `.nojekyll`/`CNAME`/`vercel.json`/`netlify.toml` — deployment target is not defined in-repo; suitable for any static host (e.g. GitHub Pages, Netlify) as-is.
- Project naming has churned over history (Expired Solutions → "Talk Me Up"; FreshProof → FreshLens), so older external references may use prior names.
