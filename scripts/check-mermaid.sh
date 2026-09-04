#!/usr/bin/env bash
# check-mermaid.sh — prove every committed diagram PNG is the .mmd source rendered.
#
#   bash scripts/check-mermaid.sh
#
# assets/diagrams/ carries both the Mermaid source and the rendered PNG. Nothing
# guaranteed they matched, so an edited .mmd could ship beside a stale picture
# and the page would teach from the old system. This re-renders each .mmd to a
# temporary PNG and compares sha256 against the committed file — the hub's own
# GT1, read back every write.
#
# It fails closed, always, and says which kind of failure it is:
#   - no mmdc on the machine                  -> CANNOT VERIFY (exit 2)
#   - mmdc present but cannot render          -> CANNOT VERIFY (exit 2)
#   - a source will not render identically
#     twice on this machine                   -> CANNOT VERIFY (exit 2)
#   - a repeatable render differs from the
#     committed PNG                           -> MISMATCH      (exit 1)
#   - no .mmd found at all                    -> CANNOT VERIFY (exit 2)
# A check that silently passes when it could not look is worth less than no
# check, so "I could not verify" is never reported as a pass.
#
# Every source is rendered twice, per diagram, and not just once for a probe.
# One of this repository's own diagrams renders to different bytes every time
# while the other two are stable, so a single probe would have "proved"
# determinism and then reported that diagram as changed on every run, for ever.
# A gate that fails for reasons unrelated to the change is a gate people learn
# to ignore, so an unrepeatable diagram is reported as unverifiable by name.
#
# It installs nothing. mermaid-cli needs a Chrome/Chromium to render; point
# PUPPETEER_EXECUTABLE_PATH at one you already have, or install the browser
# yourself with `npx puppeteer browsers install chrome-headless-shell`.
#
# Local-only by design: see .github/workflows/validate.yml for why it is not
# wired into CI.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIAGRAMS="${ROOT}/assets/diagrams"
# PNGs with no .mmd of their own. system-map-lr.png is system-map.mmd drawn
# left-to-right at -s 2; it reproduces byte for byte from that source with its
# first line set to `flowchart LR` (sha256 b518ccc4…), so it is a second size of
# an existing diagram rather than an unregenerable picture.
ALLOWLIST_ORPHAN_PNG=("system-map-lr.png")

TMPDIR_RUN="$(mktemp -d "${TMPDIR:-/tmp}/check-mermaid.XXXXXX")"
cleanup() { rm -rf "${TMPDIR_RUN}"; }
trap cleanup EXIT

cannot_verify() {
    echo "CHECK-MERMAID result=CANNOT-VERIFY $*" >&2
    exit 2
}

sha() { shasum -a 256 "$1" | awk '{print $1}'; }

# PNG width and height, straight out of the IHDR header, so an unverifiable
# diagram still tells you whether it is even the same shape as the committed one.
dimensions() {
    node -e '
        const fs = require("fs");
        try {
            const buffer = fs.readFileSync(process.argv[1]);
            process.stdout.write(`${buffer.readUInt32BE(16)}x${buffer.readUInt32BE(20)}`);
        } catch (error) { process.stdout.write("unknown"); }
    ' "$1" 2>/dev/null || printf 'unknown'
}

# --- the renderer -----------------------------------------------------------

MMDC=""
if command -v mmdc >/dev/null 2>&1; then
    MMDC="$(command -v mmdc)"
elif [ -x "${ROOT}/node_modules/.bin/mmdc" ]; then
    MMDC="${ROOT}/node_modules/.bin/mmdc"
else
    cannot_verify "mermaid-cli (mmdc) is not installed, so the committed PNGs cannot be checked against their .mmd sources. Install it locally (npm i -g @mermaid-js/mermaid-cli) and re-run."
fi

if [ -z "${PUPPETEER_EXECUTABLE_PATH:-}" ]; then
    for candidate in \
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
        "/Applications/Chromium.app/Contents/MacOS/Chromium" \
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
        "$(command -v chromium 2>/dev/null || true)" \
        "$(command -v google-chrome 2>/dev/null || true)"; do
        if [ -n "${candidate}" ] && [ -x "${candidate}" ]; then
            export PUPPETEER_EXECUTABLE_PATH="${candidate}"
            echo "CHECK-MERMAID browser=${candidate} (auto-detected; set PUPPETEER_EXECUTABLE_PATH to override)"
            break
        fi
    done
fi

# The options the committed PNGs were produced with. They are pinned here
# because a PNG rendered at another scale is a different file and would read as
# a stale diagram; `-s 3` reproduces every committed PNG byte for byte.
MMDC_ARGS=(--quiet -s 3)

render() {
    # render <source.mmd> <target.png>; non-zero on any failure, including the
    # case where mmdc prints an error and still exits 0.
    local source="$1" target="$2" log="${TMPDIR_RUN}/mmdc.log"
    rm -f "${target}"
    if ! "${MMDC}" "${MMDC_ARGS[@]}" -i "${source}" -o "${target}" >"${log}" 2>&1; then
        return 1
    fi
    if [ ! -s "${target}" ]; then
        return 1
    fi
    return 0
}

render_error() { tail -n 20 "${TMPDIR_RUN}/mmdc.log" 2>/dev/null | sed 's/^/    /'; }

# --- fail-closed self test --------------------------------------------------
# Before any "matches" is believed, prove the renderer runs here and repeats
# itself byte for byte. Without this a broken renderer reports every diagram as
# unverifiable, and a nondeterministic one reports every diagram as changed.

PROBE="${TMPDIR_RUN}/probe.mmd"
printf 'flowchart LR\n  A[Source] --> B[Rendered]\n' >"${PROBE}"

if ! render "${PROBE}" "${TMPDIR_RUN}/probe-1.png"; then
    echo "CHECK-MERMAID the renderer could not draw a two-node probe diagram:" >&2
    render_error >&2
    cannot_verify "mmdc is installed at ${MMDC} but cannot render on this machine (usually a missing headless browser, or no network on first run). Nothing was compared."
fi

if ! render "${PROBE}" "${TMPDIR_RUN}/probe-2.png"; then
    cannot_verify "the renderer worked once and failed on the second identical run; the result cannot be trusted."
fi

if [ "$(sha "${TMPDIR_RUN}/probe-1.png")" != "$(sha "${TMPDIR_RUN}/probe-2.png")" ]; then
    cannot_verify "this mmdc build is not byte-deterministic here: the same source rendered twice gave two different PNGs, so a sha256 comparison against the committed file cannot distinguish a stale diagram from renderer noise."
fi

echo "CHECK-MERMAID selftest=PASS renderer=${MMDC} options=\"${MMDC_ARGS[*]}\" deterministic=yes"

# --- the diagrams -----------------------------------------------------------

if [ ! -d "${DIAGRAMS}" ]; then
    cannot_verify "${DIAGRAMS} does not exist."
fi

shopt -s nullglob
sources=("${DIAGRAMS}"/*.mmd)
pngs=("${DIAGRAMS}"/*.png)
shopt -u nullglob

if [ "${#sources[@]}" -eq 0 ]; then
    cannot_verify "no .mmd sources were found in ${DIAGRAMS}. A check that finds nothing proves nothing."
fi

failures=0
unverifiable=0
matched=0
checked=0
for source in "${sources[@]}"; do
    name="$(basename "${source}" .mmd)"
    committed="${DIAGRAMS}/${name}.png"
    if [ ! -f "${committed}" ]; then
        echo "FAIL ${name}.mmd has no committed ${name}.png beside it" >&2
        failures=$((failures + 1))
        continue
    fi
    if ! render "${source}" "${TMPDIR_RUN}/${name}-1.png"; then
        echo "CANNOT-VERIFY ${name}.mmd did not render:" >&2
        render_error >&2
        unverifiable=$((unverifiable + 1))
        continue
    fi
    if ! render "${source}" "${TMPDIR_RUN}/${name}-2.png"; then
        echo "CANNOT-VERIFY ${name}.mmd rendered once and failed on an identical second run." >&2
        unverifiable=$((unverifiable + 1))
        continue
    fi
    checked=$((checked + 1))
    want="$(sha "${committed}")"
    first="$(sha "${TMPDIR_RUN}/${name}-1.png")"
    second="$(sha "${TMPDIR_RUN}/${name}-2.png")"
    if [ "${first}" != "${second}" ]; then
        echo "CANNOT-VERIFY ${name}.png: this source does not render byte-identically twice on this machine" >&2
        echo "     (${first} then ${second}), so sha256 cannot tell a stale diagram from renderer noise." >&2
        echo "     committed ${committed##*/} is $(dimensions "${committed}"), a re-render is $(dimensions "${TMPDIR_RUN}/${name}-1.png") — compare those by eye." >&2
        unverifiable=$((unverifiable + 1))
    elif [ "${want}" != "${first}" ]; then
        echo "FAIL ${name}.png does not match its source: committed sha256 ${want}, re-rendered ${first} (twice, identically)." >&2
        echo "     committed is $(dimensions "${committed}"), the re-render is $(dimensions "${TMPDIR_RUN}/${name}-1.png")." >&2
        echo "     Reproduce with: mmdc ${MMDC_ARGS[*]} -i assets/diagrams/${name}.mmd -o assets/diagrams/${name}.png" >&2
        failures=$((failures + 1))
    else
        matched=$((matched + 1))
        echo "OK   ${name}.png matches ${name}.mmd (sha256 ${want}, rendered twice)"
    fi
done

# A PNG with no source is a picture nobody can regenerate.
for png in "${pngs[@]}"; do
    base="$(basename "${png}")"
    name="${base%.png}"
    [ -f "${DIAGRAMS}/${name}.mmd" ] && continue
    allowed=0
    for entry in "${ALLOWLIST_ORPHAN_PNG[@]}"; do
        [ "${base}" = "${entry}" ] && allowed=1
    done
    if [ "${allowed}" -eq 1 ]; then
        echo "NOTE ${base} has no .mmd source and is on the allowlist"
    else
        echo "FAIL ${base} has no .mmd source and is not on the allowlist in this script" >&2
        failures=$((failures + 1))
    fi
done

if [ "${failures}" -gt 0 ]; then
    echo "CHECK-MERMAID result=FAIL diagrams=${#sources[@]} matched=${matched} mismatched=${failures} unverifiable=${unverifiable}" >&2
    exit 1
fi

if [ "${unverifiable}" -gt 0 ]; then
    echo "CHECK-MERMAID result=CANNOT-VERIFY diagrams=${#sources[@]} matched=${matched} mismatched=0 unverifiable=${unverifiable}" >&2
    exit 2
fi

echo "CHECK-MERMAID result=PASS diagrams=${checked} matched=${matched} mismatched=0 unverifiable=0"
