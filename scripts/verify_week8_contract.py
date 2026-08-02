#!/usr/bin/env python3
"""Fail closed when the public Week 8 start layer drifts from its source contract."""

from __future__ import annotations

import argparse
import re
from pathlib import Path


FRESHLENS_CURRICULUM_SHA = "2fc3791d49d42a94ae26652b429e4c0bb4e76f00"
FRESHLENS_DRAFT_PR_URL = "https://github.com/LawrenceHua/es-intern-freshlens/pull/204"
MANIFEST_PATH = "docs/WEEK-08-START-HERE-2026-08-03.md"
TESTFLIGHT_URL = "https://testflight.apple.com/join/74ZbJPm6"
BUILD = "4.2.0 (2026072807)"
FRESHLENS_OPEN_PR_COUNT = 12
DETAILS_MARKER = '<details class="week8-audit-details">'
QUICK_MARKER = '<div class="week8-quick-grid">'

FORBIDDEN_WEEK8_CLAIMS = (
    "Scanner functionality · VERIFIED",
    "AIVD is permitted as fallback",
    "PR #204 is merged and final",
    "the scanner is fully available and verified",
)


def _week8_slice(name: str, text: str) -> str:
    if name == "index.html":
        start = text.find("<!-- WEEK 8 -->")
        end = text.find("<!-- Guest Speakers -->", start)
    else:
        start = text.find('<section class="block" id="final-convergence">')
        end = text.find('<section class="block" id="week-6">', start)
    if start < 0 or end < 0:
        return ""
    return text[start:end]


def contract_errors(pages: dict[str, str]) -> list[str]:
    errors: list[str] = []
    expected_pages = {"index.html", "freshlens.html"}
    if set(pages) != expected_pages:
        return [f"expected {sorted(expected_pages)}, received {sorted(pages)}"]

    manifest_pattern = re.compile(
        r"https://github\.com/LawrenceHua/es-intern-freshlens/blob/"
        rf"([^/\"'?#]+)/{re.escape(MANIFEST_PATH)}"
    )

    for name, full_text in pages.items():
        section = _week8_slice(name, full_text)
        if not section:
            errors.append(f"{name}: Week 8 section markers are missing")
            continue

        quick_at = section.find(QUICK_MARKER)
        details_at = section.find(DETAILS_MARKER)
        if quick_at < 0 or details_at < 0 or quick_at >= details_at:
            errors.append(f"{name}: action-first cards must precede the audit disclosure")
            continue

        quick = section[quick_at:details_at]
        detailed = section[details_at:]
        normalized = " ".join(section.split())
        quick_normalized = " ".join(quick.split())

        manifest_refs = manifest_pattern.findall(quick)
        if not manifest_refs:
            errors.append(f"{name}: quick layer lacks an immutable Monday manifest URL")
        invalid_manifest_refs = sorted(
            {ref for ref in manifest_refs if ref != FRESHLENS_CURRICULUM_SHA}
        )
        if invalid_manifest_refs:
            errors.append(
                f"{name}: manifest URLs include mutable or unexpected refs "
                f"{invalid_manifest_refs}, expected only {FRESHLENS_CURRICULUM_SHA}"
            )

        required_quick = (
            TESTFLIGHT_URL,
            FRESHLENS_DRAFT_PR_URL,
            BUILD,
            "Install availability · VERIFIED",
            "Source lineage · INCONCLUSIVE",
            "Scanner functionality · BLOCKED",
            "public beta description and build-specific What to Test copy were corrected",
            "installed scanner path is still <code>BLOCKED</code>",
            "Bill leads Week 8",
            "Bill and Ziyun",
            "BLOCKED_SCHEDULE",
            "actual time and invitation",
            "demo archive URL is <code>BLOCKED</code>",
            "two to three minutes each",
            "All eight interns execute or pair for learning",
            "release matrix counts only direct runs",
            "docs/WEEK_08_AGENT_FACTORY_RUNBOOK.md",
            "automation/expired_solutions_factory/",
            "local, not public",
            "reducer, alert, and improvement fixtures",
            "Product, model, release, marketplace, and operations go only to Expired Solutions",
            "Internship coordination may use Expired Solutions or TalkMeUp",
            "AIVD is never permitted",
            "does not authorize a send",
        )
        for requirement in required_quick:
            if requirement not in quick_normalized:
                errors.append(f"{name}: quick layer is missing {requirement!r}")

        for forbidden in FORBIDDEN_WEEK8_CLAIMS:
            if forbidden.casefold() in normalized.casefold():
                errors.append(f"{name}: Week 8 contains forbidden claim {forbidden!r}")

        expected_pr_copy = (
            "Twelve PRs are open"
            if name == "index.html"
            else f"Reconcile all {FRESHLENS_OPEN_PR_COUNT} open PRs"
        )
        if expected_pr_copy not in detailed:
            errors.append(
                f"{name}: detailed evidence is missing current PR count copy "
                f"{expected_pr_copy!r}"
            )
        if name == "index.html" and "Twelve pull requests are open" not in full_text:
            errors.append(f"{name}: evidence snapshot is missing the current PR count")
        if re.search(r"\b(?:Eleven|11)\s+(?:open\s+)?(?:pull requests|PRs)\b", full_text):
            errors.append(f"{name}: stale eleven-PR claim remains")

        if "2,267 passed" in quick:
            errors.append(f"{name}: CI counts leaked into the action-first layer")
        if "2,267 passed" not in detailed:
            errors.append(f"{name}: detailed evidence lost the historical CI receipt")
        if re.search(r'<details class="week8-audit-details"[^>]*\sopen(?:\s|>)', section):
            errors.append(f"{name}: detailed audit disclosure must be closed by default")
        if "one-minute" in normalized.lower() or "one minute" in normalized.lower():
            errors.append(f"{name}: Week 8 reintroduced the retired one-minute demo standard")
        if "all-eight device matrix" in normalized.lower():
            errors.append(f"{name}: participation is conflated with the release device matrix")

        if ".week8-quick-grid { grid-template-columns: 1fr; }" not in full_text:
            errors.append(f"{name}: mobile one-column quick-card rule is missing")

    return errors


def verify(root: Path) -> int:
    pages = {
        name: (root / name).read_text(encoding="utf-8")
        for name in ("index.html", "freshlens.html")
    }
    errors = contract_errors(pages)
    if errors:
        raise AssertionError("Week 8 contract failed:\n- " + "\n- ".join(errors))
    print(
        "VERIFIED: Week 8 action layer, immutable curriculum, app truth, "
        "leadership, demo, factory, device, and Slack contracts"
    )
    return 0


def self_test(root: Path) -> int:
    baseline = {
        name: (root / name).read_text(encoding="utf-8")
        for name in ("index.html", "freshlens.html")
    }
    if contract_errors(baseline):
        raise AssertionError("self-test baseline must pass before mutation checks")

    immutable_manifest_url = (
        "https://github.com/LawrenceHua/es-intern-freshlens/blob/"
        f"{FRESHLENS_CURRICULUM_SHA}/{MANIFEST_PATH}"
    )
    mutations = (
        (
            "mutable curriculum coexists",
            "index.html",
            immutable_manifest_url,
            immutable_manifest_url
            + " https://github.com/LawrenceHua/es-intern-freshlens/blob/main/"
            + MANIFEST_PATH,
        ),
        (
            "scanner false green coexists",
            "freshlens.html",
            "Scanner functionality · BLOCKED",
            "Scanner functionality · BLOCKED; Scanner functionality · VERIFIED",
        ),
        (
            "merged PR false green coexists",
            "index.html",
            "draft PR #204</a> remains the human review and merge boundary.",
            "draft PR #204</a> remains the human review and merge boundary. "
            "PR #204 is merged and final.",
        ),
        (
            "TestFlight scanner false green coexists",
            "freshlens.html",
            "installed scanner path is still <code>BLOCKED</code>",
            "installed scanner path is still <code>BLOCKED</code>; "
            "the scanner is fully available and verified",
        ),
        (
            "retired demo length",
            "index.html",
            "two to three minutes each",
            "one minute each",
        ),
        (
            "forbidden Slack fallback coexists",
            "freshlens.html",
            "AIVD is never permitted.",
            "AIVD is never permitted. AIVD is permitted as fallback.",
        ),
    )

    for label, page, old, new in mutations:
        if old not in baseline[page]:
            raise AssertionError(f"self-test fixture missing for {label}: {old!r}")
        candidate = dict(baseline)
        candidate[page] = candidate[page].replace(old, new, 1)
        if not contract_errors(candidate):
            raise AssertionError(f"self-test failed open for {label}")

    print(f"VERIFIED: {len(mutations)} default-REFUTED Week 8 mutations were rejected")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    verify(root)
    if args.self_test:
        self_test(root)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
