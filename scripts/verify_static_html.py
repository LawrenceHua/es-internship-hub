#!/usr/bin/env python3
"""Fail closed on broken local links and minimum HTML document metadata."""

from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

from verify_week8_contract import verify as verify_week8_contract


class PageAudit(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: set[str] = set()
        self.references: list[str] = []
        self.has_language = False
        self.has_viewport = False
        self.has_title = False

    def handle_starttag(
        self,
        tag: str,
        attrs: list[tuple[str, str | None]],
    ) -> None:
        data = dict(attrs)
        self.has_language |= tag == "html" and bool(data.get("lang"))
        self.has_viewport |= (
            tag == "meta" and data.get("name", "").lower() == "viewport"
        )
        self.has_title |= tag == "title"

        identifier = data.get("id")
        if identifier:
            if identifier in self.ids:
                raise AssertionError(f"duplicate id: {identifier}")
            self.ids.add(identifier)

        for attribute in ("href", "src"):
            reference = data.get(attribute)
            if reference:
                self.references.append(reference)


def verify(root: Path) -> int:
    pages = sorted(root.glob("*.html"))
    if not pages:
        raise AssertionError("no HTML pages")

    parsed: dict[Path, PageAudit] = {}
    for page in pages:
        audit = PageAudit()
        audit.feed(page.read_text(encoding="utf-8"))
        if not (audit.has_language and audit.has_viewport and audit.has_title):
            raise AssertionError(f"missing lang, viewport, or title: {page}")
        parsed[page] = audit

    for page, audit in parsed.items():
        for reference in audit.references:
            parts = urlsplit(reference)
            if parts.scheme or reference.startswith(("mailto:", "tel:", "data:")):
                continue
            target = page if not parts.path else page.parent / parts.path
            if parts.path.endswith("/"):
                target /= "index.html"
            if not target.exists():
                raise AssertionError(
                    f"missing local target from {page}: {reference}"
                )
            if parts.fragment and target.suffix == ".html":
                target_audit = parsed.get(target)
                if target_audit is None:
                    target_audit = PageAudit()
                    target_audit.feed(target.read_text(encoding="utf-8"))
                if parts.fragment not in target_audit.ids:
                    raise AssertionError(
                        f"missing fragment target from {page}: {reference}"
                    )

    verify_week8_contract(root)
    print(f"VERIFIED: {len(pages)} HTML pages; local targets and fragments resolve")
    return 0


if __name__ == "__main__":
    raise SystemExit(verify(Path.cwd()))
