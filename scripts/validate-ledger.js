#!/usr/bin/env node
'use strict';

/**
 * validate-ledger.js — the gate behind the Program Ledger page.
 *
 * Run from the repository root:
 *   node scripts/validate-ledger.js           check only, exit 1 on any violation
 *   node scripts/validate-ledger.js --stamp   check, then write the validated stamp
 *   node scripts/validate-ledger.js --site    apply the same evidence rule to the pages
 *
 * No dependencies. Node's own crypto/fs only.
 *
 * What it enforces, and why each rule exists:
 *   - every entry carries the required fields, with the right shapes;
 *   - every verdict is one the legend actually defines;
 *   - VERIFIED requires at least one link a reader can open, because a verdict
 *     nobody outside the team can check is not a verdict;
 *   - REPORTED requires zero links, because its legend text says exactly that;
 *   - every link is an https URL with a human label;
 *   - the "validated" stamp names the script that wrote it and pins a hash of
 *     the entries, so an edited ledger with an untouched stamp fails instead of
 *     silently claiming it was checked.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const LEDGER_PATH = path.join(ROOT, 'ledger.json');
const UPTIME_PATH = path.join(ROOT, 'uptime.json');
const STAMP_SCRIPT = 'scripts/validate-ledger.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ENTRY_ID = /^L\d{2,}$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;

const errors = [];
const fail = (message) => errors.push(message);

const readJson = (file) => {
    let text;
    try {
        text = fs.readFileSync(file, 'utf8');
    } catch (error) {
        fail(`${path.relative(ROOT, file)}: cannot be read (${error.code || error.message})`);
        return null;
    }
    try {
        return JSON.parse(text);
    } catch (error) {
        fail(`${path.relative(ROOT, file)}: is not valid JSON (${error.message})`);
        return null;
    }
};

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

/**
 * Hash the entries exactly as they are ordered in the file, with object keys
 * sorted, so re-serialising the same data always produces the same digest.
 */
const canonical = (value) => {
    if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
    if (isPlainObject(value)) {
        return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value === undefined ? null : value);
};

const entriesHash = (entries) => crypto.createHash('sha256').update(canonical(entries)).digest('hex');

const validateLinks = (entry, where) => {
    if (!Array.isArray(entry.links)) {
        fail(`${where}: "links" must be an array (found ${typeof entry.links})`);
        return 0;
    }
    entry.links.forEach((link, index) => {
        const at = `${where}: links[${index}]`;
        if (!isPlainObject(link)) {
            fail(`${at}: must be an object with "url" and "label"`);
            return;
        }
        if (!isNonEmptyString(link.url) || !link.url.startsWith('https://')) {
            fail(`${at}: "url" must be an https:// URL (found ${JSON.stringify(link.url)})`);
        }
        if (!isNonEmptyString(link.label)) {
            fail(`${at}: "label" must be a non-empty string`);
        }
        const extra = Object.keys(link).filter((key) => key !== 'url' && key !== 'label');
        if (extra.length) fail(`${at}: unexpected field(s) ${extra.join(', ')}`);
    });
    return entry.links.length;
};

const validateLedger = (ledger) => {
    if (!isPlainObject(ledger)) {
        fail('ledger.json: top level must be an object');
        return;
    }

    if (ledger.schema_version !== 'xpired-program-ledger-v1') {
        fail(`ledger.json: "schema_version" must be "xpired-program-ledger-v1" (found ${JSON.stringify(ledger.schema_version)})`);
    }

    if ('generated' in ledger) {
        fail('ledger.json: "generated" is retired; nothing generates this file. Use "validated" instead.');
    }

    if (!isPlainObject(ledger.window) || !ISO_DATE.test(ledger.window.from || '') || !ISO_DATE.test(ledger.window.to || '')) {
        fail('ledger.json: "window" must be an object with ISO "from" and "to" dates');
    }

    if (!isPlainObject(ledger.verdict_key) || Object.keys(ledger.verdict_key).length === 0) {
        fail('ledger.json: "verdict_key" must be a non-empty object');
        return;
    }
    Object.entries(ledger.verdict_key).forEach(([verdict, definition]) => {
        if (!isNonEmptyString(definition)) fail(`ledger.json: verdict_key.${verdict} needs a definition`);
    });
    ['VERIFIED', 'REPORTED'].forEach((required) => {
        if (!(required in ledger.verdict_key)) fail(`ledger.json: verdict_key is missing "${required}"`);
    });

    if (!Array.isArray(ledger.entries) || ledger.entries.length === 0) {
        fail('ledger.json: "entries" must be a non-empty array');
        return;
    }

    const allowed = new Set(Object.keys(ledger.verdict_key));
    const seen = new Set();

    ledger.entries.forEach((entry, index) => {
        const where = `ledger.json: entries[${index}]${entry && entry.id ? ` (${entry.id})` : ''}`;
        if (!isPlainObject(entry)) {
            fail(`${where}: must be an object`);
            return;
        }

        if (!isNonEmptyString(entry.id) || !ENTRY_ID.test(entry.id)) {
            fail(`${where}: "id" must look like L01`);
        } else if (seen.has(entry.id)) {
            fail(`${where}: duplicate id`);
        } else {
            seen.add(entry.id);
        }

        ['lane', 'deliverable', 'evidence', 'verified_by'].forEach((field) => {
            if (!isNonEmptyString(entry[field])) fail(`${where}: "${field}" must be a non-empty string`);
        });

        if (!isNonEmptyString(entry.date) || !ISO_DATE.test(entry.date)) {
            fail(`${where}: "date" must be an ISO date (YYYY-MM-DD)`);
        }

        if (!allowed.has(entry.verdict)) {
            fail(`${where}: verdict ${JSON.stringify(entry.verdict)} is not defined in verdict_key`);
        }

        const linkCount = validateLinks(entry, where);

        if (entry.verdict === 'VERIFIED' && linkCount === 0) {
            fail(`${where}: VERIFIED requires at least one link a reader can open; use "REPORTED" until one exists`);
        }
        if (entry.verdict === 'REPORTED' && linkCount > 0) {
            fail(`${where}: REPORTED means no public artefact is linked yet, but ${linkCount} link(s) are present`);
        }

        const known = new Set(['id', 'lane', 'deliverable', 'verdict', 'evidence', 'verified_by', 'date', 'links']);
        Object.keys(entry).filter((key) => !known.has(key)).forEach((key) => {
            fail(`${where}: unexpected field "${key}"`);
        });
    });
};

const validateStamp = (ledger) => {
    const stamp = ledger && ledger.validated;
    if (!isPlainObject(stamp)) {
        fail('ledger.json: "validated" must be an object written by this script');
        return;
    }
    if (stamp.script !== STAMP_SCRIPT) {
        fail(`ledger.json: validated.script must be "${STAMP_SCRIPT}"`);
    }
    if (!isNonEmptyString(stamp.at) || !ISO_DATE.test(stamp.at)) {
        fail('ledger.json: validated.at must be an ISO date');
    }
    if (!isNonEmptyString(stamp.entries_sha256) || !SHA256_HEX.test(stamp.entries_sha256)) {
        fail('ledger.json: validated.entries_sha256 must be a sha256 hex digest');
        return;
    }
    if (Array.isArray(ledger.entries) && stamp.entries_sha256 !== entriesHash(ledger.entries)) {
        fail('ledger.json: the validated stamp is stale — the entries changed since it was written. Re-run: node scripts/validate-ledger.js --stamp');
    }
};

/** uptime.json feeds prose on the ledger page, so its shape is part of this gate. */
const validateUptime = (uptime) => {
    if (!isPlainObject(uptime)) {
        fail('uptime.json: top level must be an object');
        return;
    }
    if (uptime.schema_version !== 'xpired-uptime-v1') {
        fail(`uptime.json: "schema_version" must be "xpired-uptime-v1" (found ${JSON.stringify(uptime.schema_version)})`);
    }
    if (!['not_started', 'measuring'].includes(uptime.status)) {
        fail(`uptime.json: "status" must be "not_started" or "measuring" (found ${JSON.stringify(uptime.status)})`);
    }
    if (!Number.isInteger(uptime.window_days) || uptime.window_days <= 0) {
        fail('uptime.json: "window_days" must be a positive integer');
    }
    if (!Array.isArray(uptime.counted)) {
        fail('uptime.json: "counted" must be an array');
    }
    ['worst_lane_uptime_7d', 'mean_uptime_7d'].forEach((field) => {
        if (!(field in uptime) || (uptime[field] !== null && typeof uptime[field] !== 'number')) {
            fail(`uptime.json: "${field}" must be a number or null`);
        }
    });
    if (uptime.status === 'not_started') {
        if (Array.isArray(uptime.counted) && uptime.counted.length > 0) {
            fail('uptime.json: status is "not_started" but lanes are already counted');
        }
        ['worst_lane_uptime_7d', 'mean_uptime_7d'].forEach((field) => {
            if (uptime[field] !== null) fail(`uptime.json: status is "not_started" so "${field}" must be null`);
        });
    }
    const notCounted = uptime.not_counted;
    if (!isPlainObject(notCounted)) {
        fail('uptime.json: "not_counted" must be an object');
        return;
    }
    ['existing_moved', 'new_checks', 'mac_bound'].forEach((field) => {
        if (!Number.isInteger(notCounted[field]) || notCounted[field] < 0) {
            fail(`uptime.json: not_counted.${field} must be a non-negative integer`);
        }
    });
    if (!Array.isArray(notCounted.categories) || notCounted.categories.some((item) => !isNonEmptyString(item))) {
        fail('uptime.json: not_counted.categories must be an array of non-empty strings');
    }
    if (!isNonEmptyString(uptime.note)) {
        fail('uptime.json: "note" must be a non-empty string');
    }
};

/* ------------------------------------------------------------------------- *
 * --site mode
 *
 * The ledger mode above enforces the program's evidence rule on ledger.json.
 * This mode enforces the same rule on the pages, where the badges are markup
 * instead of JSON:
 *
 *   - a VERIFIED badge needs at least one openable public link in the same
 *     block, otherwise the correct label is REPORTED;
 *   - no page may redefine VERIFIED into something weaker: any legend that
 *     defines the word must state the public-link requirement;
 *   - no personal name but the program lead's, and no employer or
 *     out-of-scope term, appears in any .html, .md or .json file;
 *   - pages.json and `ls *.html` must agree.
 *
 * Fail-closed floors, because a selector that matches nothing must fail
 * instead of passing (the hub's own GT5):
 *   - the badge parser is run against a built-in fixture with known answers
 *     before it is trusted on the tree;
 *   - the denylist matcher is run against a built-in canary before it is
 *     trusted on the tree;
 *   - the tree must yield at least SITE_MIN_BADGES evidence badges.
 * ------------------------------------------------------------------------- */

const PAGES_PATH = path.join(ROOT, 'pages.json');
const DENYLIST_PATH = path.join(ROOT, 'scripts', 'denylist.json');
const SITE_MIN_BADGES = 20;
const SCAN_EXTENSIONS = new Set(['.html', '.md', '.json']);
const SKIP_DIRS = new Set(['.git', 'node_modules', '.vercel', '.github']);

const EVIDENCE_VERDICTS = new Set([
    'VERIFIED', 'REPORTED', 'INFERRED', 'BLOCKED', 'INCONCLUSIVE', 'DEFERRED', 'CODE-SHIPPED-NOT-VERIFIED'
]);
/**
 * A badge is an element carrying one of these classes whose whole text is a verdict.
 * `.chip` marks the evidence-citation taxonomy (VERIFIED requires a public link,
 * else REPORTED). `.status-label` is deliberately NOT a marker: it carries the
 * estate's engineering-readiness taxonomy (VERIFIED / CODE-SHIPPED-NOT-VERIFIED /
 * BLOCKED / INCONCLUSIVE), where REPORTED is not a valid value and the four
 * sibling labels make the vocabulary self-describing. See 2026-09-03: three
 * freshlens.html readiness rows were false-positived by scanning status-label.
 */
const BADGE_MARKERS = new Set(['chip', 'badge', 'verdict', 'verdict-label']);
/** The block a badge speaks for: a row, a card, a list item, or a section. */
const BLOCK_TAGS = new Set(['tr', 'li', 'article', 'aside', 'blockquote', 'dd', 'figure', 'section', 'main', 'body']);
/** Legend containers define the vocabulary; they are judged by the legend rule, not the link rule. */
const LEGEND_CLASSES = /^(label-card|label-guide|label-key|legend|legend-card|verdict-key)$/;
/** A link a reader can open. Font/CDN hosts are not evidence. */
const NON_EVIDENCE_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);
/** A legend for VERIFIED has to say this much. */
const PUBLIC_LINK_REQUIRED = /public link|link (?:a reader|you|anyone|someone) can open|openable (?:public )?link|at least one link/i;

const VOID_TAGS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'
]);
const RAW_TEXT_TAGS = new Set(['script', 'style']);

const NAMED_ENTITIES = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–',
    rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', hellip: '…',
    middot: '·', times: '×', rarr: '→', larr: '←', deg: '°', trade: '™'
};

const decodeEntities = (text) => text
    .replace(/&#x([0-9a-fA-F]+);/g, (whole, hex) => codePoint(parseInt(hex, 16), whole))
    .replace(/&#(\d+);/g, (whole, dec) => codePoint(parseInt(dec, 10), whole))
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (whole, name) => {
        const key = name.toLowerCase();
        return key in NAMED_ENTITIES ? NAMED_ENTITIES[key] : whole;
    });

function codePoint(value, whole) {
    if (!Number.isFinite(value) || value < 0 || value > 0x10ffff) return whole;
    try {
        return String.fromCodePoint(value);
    } catch (error) {
        return whole;
    }
}

const stripTags = (html) => html.replace(/<[^>]*>/g, ' ');

const badgeText = (html) => decodeEntities(stripTags(html)).replace(/\s+/g, ' ').trim().toUpperCase();

const classListOf = (attrs) => {
    const match = /class\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs || '');
    if (!match) return [];
    return (match[1] || match[2] || '').split(/\s+/).filter(Boolean).map((name) => name.toLowerCase());
};

/**
 * A deliberately small HTML element scanner. It records where every element
 * opens and closes so a badge can be resolved to the block it speaks for.
 * An unmatched close tag auto-closes the elements below it, so an unclosed
 * <p> or <li> degrades instead of derailing the whole parse.
 */
const parseElements = (html) => {
    const nodes = [];
    const stack = [];
    const tagRe = /<!--[\s\S]*?-->|<(\/)?([a-zA-Z][a-zA-Z0-9:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)(\/)?>/g;
    let match;
    while ((match = tagRe.exec(html)) !== null) {
        if (match[0].startsWith('<!--')) continue;
        const tag = match[2].toLowerCase();
        if (match[1]) {
            let index = -1;
            for (let i = stack.length - 1; i >= 0; i -= 1) {
                if (stack[i].tag === tag) { index = i; break; }
            }
            if (index === -1) continue;
            for (let i = stack.length - 1; i >= index; i -= 1) {
                stack[i].innerEnd = match.index;
                stack[i].end = i === index ? match.index + match[0].length : match.index;
            }
            stack.length = index;
            continue;
        }
        if (VOID_TAGS.has(tag) || match[4]) continue;
        const node = {
            tag,
            classes: classListOf(match[3]),
            start: match.index,
            innerStart: match.index + match[0].length,
            innerEnd: html.length,
            end: html.length,
            parent: stack.length ? stack[stack.length - 1] : null
        };
        nodes.push(node);
        if (RAW_TEXT_TAGS.has(tag)) {
            const close = html.toLowerCase().indexOf(`</${tag}`, node.innerStart);
            node.innerEnd = close === -1 ? html.length : close;
            const gt = close === -1 ? -1 : html.indexOf('>', close);
            node.end = gt === -1 ? html.length : gt + 1;
            tagRe.lastIndex = node.end;
            continue;
        }
        stack.push(node);
    }
    return nodes;
};

const ancestorMatching = (node, predicate) => {
    let current = node.parent;
    while (current) {
        if (predicate(current)) return current;
        current = current.parent;
    }
    return null;
};

const lineOf = (html, offset) => {
    let line = 1;
    for (let i = 0; i < offset && i < html.length; i += 1) if (html.charCodeAt(i) === 10) line += 1;
    return line;
};

/**
 * Several pages ship with their body on one 5,000-character line, where a line
 * number alone points at the whole page. Every position is reported line:column
 * so a hit can actually be found.
 */
const columnOf = (html, offset) => offset - html.lastIndexOf('\n', Math.max(0, offset - 1));

/**
 * Links inside a slice that a reader could actually open for evidence: an
 * https URL, or a relative link to an artifact this repository publishes.
 * A relative link to another page of this site is navigation, not evidence,
 * and a font host is neither.
 */
const evidenceLinks = (html, repoFiles) => {
    const anchorRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
    let match;
    let count = 0;
    while ((match = anchorRe.exec(html)) !== null) {
        const href = /href\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(match[1]);
        const url = href ? decodeEntities((href[1] || href[2] || '').trim()) : '';
        if (!url) continue;
        if (!decodeEntities(stripTags(match[2])).trim()) continue;
        if (url.toLowerCase().startsWith('https://')) {
            let host = '';
            try {
                host = new URL(url).hostname.toLowerCase();
            } catch (error) {
                continue;
            }
            if (NON_EVIDENCE_HOSTS.has(host)) continue;
            count += 1;
            continue;
        }
        if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//') || url.startsWith('#')) continue;
        const target = url.split(/[?#]/)[0].replace(/^\.\//, '');
        if (!target || target.toLowerCase().endsWith('.html')) continue;
        if (repoFiles && repoFiles.has(target)) count += 1;
    }
    return count;
};

/**
 * Every VERIFIED definition a page publishes, from two directions: a legend
 * container that holds a VERIFIED badge, and prose of the form
 * "VERIFIED — ..." or "a VERIFIED chip means ...". Both must state the
 * public-link requirement.
 */
const verifiedDefinitions = (html, nodes) => {
    const found = [];
    const seen = new Set();
    const push = (offset, text) => {
        const key = `${offset}:${text.slice(0, 40)}`;
        if (seen.has(key)) return;
        seen.add(key);
        found.push({ line: lineOf(html, offset), column: columnOf(html, offset), text });
    };

    nodes.forEach((node) => {
        if (!node.classes.some((name) => BADGE_MARKERS.has(name))) return;
        if (badgeText(html.slice(node.innerStart, node.innerEnd)) !== 'VERIFIED') return;
        const legend = ancestorMatching(node, (candidate) => candidate.classes.some((name) => LEGEND_CLASSES.test(name)));
        if (!legend) return;
        push(legend.start, decodeEntities(stripTags(html.slice(legend.innerStart, legend.innerEnd))).replace(/\s+/g, ' ').trim());
    });

    const text = decodeEntities(stripTags(html)).replace(/\s+/g, ' ');
    const dashForm = /\bVERIFIED\b\s*(?:—|–|--)\s*([^.]{15,300}\.)/g;
    const meansForm = /\bVERIFIED\b(?:\s+\w+){0,3}\s+means\b([^.]{10,300}\.)/gi;
    [dashForm, meansForm].forEach((pattern) => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const anchor = html.indexOf(match[0].slice(0, 30).trim());
            push(anchor === -1 ? 0 : anchor, match[0]);
        }
    });

    // One legend can be seen twice: once as the whole card and once as the
    // sentence inside it. Report the sentence and drop the card that contains
    // it, so one defect is one line.
    return found.filter((definition) => !found.some((other) => (
        other !== definition
        && other.line === definition.line
        && other.text !== definition.text
        && definition.text.includes(other.text)
    )));
};

const DEFINITION_FORMS = [
    /\bVERIFIED\b\s*(?:\u2014|\u2013|--)\s*[^.]{15,300}\./,
    /\bVERIFIED\b(?:\s+\w+){0,3}\s+means\b[^.]{10,300}\./i
];

/**
 * Chips that sit side by side with nothing but whitespace between them, showing
 * two or more different labels, are a key: they tell the reader the vocabulary
 * rather than claiming anything about the block they head. One VERIFIED chip
 * above a heading is a claim; "VERIFIED INFERRED FLAG-GATED" above "How to read
 * this inventory" is a caption for the labels themselves.
 *
 * The distinction has to exist or the gate cries wolf on every key on the site,
 * and a gate that cries wolf gets switched off. It is not an escape hatch: a
 * claim can only reach it by putting a second, differently-labelled chip next to
 * itself, which is visible on the page.
 */
const vocabularyKeyNodes = (html, nodes) => {
    const chips = nodes
        .filter((node) => node.classes.some((name) => BADGE_MARKERS.has(name)))
        .map((node) => ({ node, text: badgeText(html.slice(node.innerStart, node.innerEnd)) }));
    const keyed = new Set();
    let start = 0;
    while (start < chips.length) {
        let end = start + 1;
        while (
            end < chips.length
            && chips[end].node.parent === chips[start].node.parent
            && html.slice(chips[end - 1].node.end, chips[end].node.start).trim() === ''
        ) end += 1;
        const run = chips.slice(start, end);
        if (run.length >= 2 && new Set(run.map((chip) => chip.text)).size >= 2) {
            run.forEach((chip) => keyed.add(chip.node));
        }
        start = end;
    }
    return keyed;
};

/**
 * Every evidence badge on a page, resolved to the block it speaks for.
 * A badge that sits in a legend card, in a vocabulary key, or in a block that
 * defines its own verdict, is a sample of the vocabulary rather than a claim:
 * it is judged by the legend rule instead of the link rule.
 */
const collectBadges = (html, repoFiles) => {
    const nodes = parseElements(html);
    const keyed = vocabularyKeyNodes(html, nodes);
    const badges = [];
    nodes.forEach((node) => {
        if (!node.classes.some((name) => BADGE_MARKERS.has(name))) return;
        const verdict = badgeText(html.slice(node.innerStart, node.innerEnd));
        if (!EVIDENCE_VERDICTS.has(verdict)) return;
        const block = ancestorMatching(node, (candidate) => BLOCK_TAGS.has(candidate.tag));
        const inLegendCard = Boolean(ancestorMatching(node, (candidate) => candidate.classes.some((name) => LEGEND_CLASSES.test(name))));
        const blockHtml = block ? html.slice(block.innerStart, block.innerEnd) : '';
        const blockText = decodeEntities(stripTags(blockHtml)).replace(/\s+/g, ' ');
        const definesItself = verdict === 'VERIFIED' && DEFINITION_FORMS.some((form) => form.test(blockText));
        badges.push({
            verdict,
            line: lineOf(html, node.start),
            column: columnOf(html, node.start),
            isLegend: inLegendCard || definesItself || keyed.has(node),
            blockTag: block ? block.tag : '(none)',
            links: block ? evidenceLinks(blockHtml, repoFiles) : 0
        });
    });
    return { badges, nodes };
};

/* --- denylist ------------------------------------------------------------ *
 * The denied names and terms are stored as salted digests, never in clear
 * text, because writing them into this repository to keep them off the site
 * would publish exactly what the rule protects. This is obfuscation, not
 * secrecy: the salt is published beside the digests. It stops a name being
 * greppable, indexable or readable in a public file; it is not a secret store.
 * ------------------------------------------------------------------------- */

/**
 * Inline markup between two halves of a word must not break the word: a name
 * hidden as L<b>ezhi</b> is still that name. Inline tags are replaced with a
 * sentinel the dense scanner steps over; every other tag becomes a space and
 * therefore ends the run.
 */
const INLINE_MARKUP = 1;
const SENTINEL = String.fromCharCode(INLINE_MARKUP);
const INLINE_TAGS = new Set([
    'a', 'abbr', 'b', 'cite', 'code', 'em', 'i', 'kbd', 'mark', 'q', 's', 'samp',
    'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var'
]);

const sha256 = (text) => crypto.createHash('sha256').update(text, 'utf8').digest('hex');

const djb2From = (start, text) => {
    let hash = start;
    for (let i = 0; i < text.length; i += 1) hash = (Math.imul(hash, 33) + text.charCodeAt(i)) | 0;
    return hash;
};

/**
 * Reduce a file to scannable text while preserving every byte offset, so a
 * hit still reports the true line. Tags, script and style bodies become
 * spaces; entities and \\uXXXX escapes become their character plus padding.
 */
const scannableText = (file, raw) => {
    const extension = path.extname(file).toLowerCase();
    let text = raw;
    if (extension === '.html') {
        text = text.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, (whole) => ' '.repeat(whole.length));
        text = text.replace(/<!--[\s\S]*?-->/g, (whole) => ' '.repeat(whole.length));
        text = text.replace(/<\/?([a-zA-Z][a-zA-Z0-9:-]*)[^>]*>/g, (whole, tag) => (
            INLINE_TAGS.has(tag.toLowerCase()) ? SENTINEL.repeat(whole.length) : ' '.repeat(whole.length)
        ));
        text = text.replace(/<[^>]*>/g, (whole) => ' '.repeat(whole.length));
        text = text.replace(/&#x([0-9a-fA-F]+);|&#(\d+);|&([a-zA-Z][a-zA-Z0-9]*);/g, (whole) => {
            const decoded = decodeEntities(whole);
            return decoded === whole ? whole : decoded + ' '.repeat(whole.length - decoded.length);
        });
    }
    if (extension === '.json') {
        text = text.replace(/\\u([0-9a-fA-F]{4})/g, (whole, hex) => {
            const decoded = codePoint(parseInt(hex, 16), whole);
            return decoded === whole ? whole : decoded + ' '.repeat(whole.length - decoded.length);
        });
    }
    return text;
};

/** Words and adjacent word pairs, so a two-word name is caught as well. */
const wordKeys = (text) => {
    const keys = new Set();
    const words = text.replace(new RegExp(SENTINEL, 'g'), '').toLowerCase().match(/[a-z0-9]+/g) || [];
    words.forEach((word, index) => {
        keys.add(word);
        if (index + 1 < words.length) keys.add(`${word} ${words[index + 1]}`);
    });
    return keys;
};

/**
 * One dense string per whitespace-delimited run, with a map back to the
 * original offsets. Per-run rather than per-file on purpose: a whole-file
 * dense string glues neighbouring words together and invents names that
 * nobody wrote. Within a run, punctuation and inline markup are dropped, so
 * a handle or a path still gives up the name inside it.
 */
const denseRuns = (text) => {
    const runs = [];
    const lower = text.toLowerCase();
    let chars = [];
    let offsets = [];
    const flush = () => {
        if (chars.length) runs.push({ dense: chars.join(''), offsets });
        chars = [];
        offsets = [];
    };
    for (let i = 0; i < lower.length; i += 1) {
        const code = lower.charCodeAt(i);
        if (code === INLINE_MARKUP) continue; // inline markup stood here; the word runs through it
        if (code === 32 || code === 9 || code === 10 || code === 13 || code === 12 || code === 0x00a0) {
            flush();
            continue;
        }
        if ((code >= 97 && code <= 122) || (code >= 48 && code <= 57)) {
            chars.push(lower[i]);
            offsets.push(i);
        }
    }
    flush();
    return runs;
};

const denylistMatcher = (denylist) => {
    const salted = `${denylist.salt}:`;
    const seed = djb2From(5381, salted);
    const byWord = new Map();
    const byLength = new Map();
    denylist.terms.forEach((term) => {
        byWord.set(term.sha256, term);
        if (term.compact_len) {
            if (!byLength.has(term.compact_len)) byLength.set(term.compact_len, new Map());
            byLength.get(term.compact_len).set(term.compact_h32, term);
        }
    });

    return (text) => {
        const hits = [];
        wordKeys(text).forEach((key) => {
            const term = byWord.get(sha256(`${salted}${key}`));
            if (term) hits.push({ term, offset: -1, form: 'word' });
        });
        if (byLength.size) {
            denseRuns(text).forEach(({ dense, offsets }) => {
                byLength.forEach((candidates, length) => {
                    for (let i = 0; i + length <= dense.length; i += 1) {
                        const window = dense.slice(i, i + length);
                        const term = candidates.get((djb2From(seed, window) >>> 0).toString(16));
                        if (term && sha256(`${salted}${window}`) === term.sha256) {
                            hits.push({ term, offset: offsets[i], form: 'compact' });
                        }
                    }
                });
            });
        }
        return hits;
    };
};

/** Every tracked-ish file in the repository, so a relative link can be proved openable. */
const walkAll = (dir, out = []) => {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
        if (entry.isDirectory()) {
            if (SKIP_DIRS.has(entry.name)) return;
            walkAll(path.join(dir, entry.name), out);
            return;
        }
        out.push(path.join(dir, entry.name));
    });
    return out;
};

const walkFiles = (dir, out = []) => {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
        if (entry.isDirectory()) {
            if (SKIP_DIRS.has(entry.name)) return;
            walkFiles(path.join(dir, entry.name), out);
            return;
        }
        if (SCAN_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) out.push(path.join(dir, entry.name));
    });
    return out;
};

/* --- fail-closed self tests ---------------------------------------------- */

const SELFTEST_HTML = [
    '<section class="section"><span class="chip verified">VERIFIED</span><h2>Linked</h2>',
    '<p><a href="https://example.org/proof">proof</a></p></section>',
    '<section class="section"><span class="chip verified">VERIFIED</span><h2>Unlinked</h2><p>no link here</p></section>',
    '<section class="section"><span class="chip verified">VERIFIED</span><h2>Fonts only</h2>',
    '<p><a href="https://fonts.googleapis.com/css2">font</a></p></section>',
    '<div class="label-card verified"><span class="chip verified">VERIFIED</span>',
    '<p>Backed by at least one public link a reader can open and check.</p></div>',
    // the readiness taxonomy is NOT scanned: an unlinked status-label VERIFIED
    // must not produce a badge at all (negative control for the 2026-09-03 fix)
    '<table><tbody><tr><td><span class="status-label verified">VERIFIED</span></td>',
    '<td>internal evidence only, no link</td></tr></tbody></table>',
    '<section class="section"><span class="chip reported">REPORTED</span><h2>Reported</h2><p>private only</p></section>',
    '<section class="section"><span class="chip live">LIVE</span><h2>Not a verdict</h2></section>',
    // a vocabulary key: two different labels side by side, claiming nothing
    '<section class="section"><span class="chip verified">VERIFIED</span><span class="chip inferred">INFERRED</span>',
    '<h2>How to read this</h2><p>no link here</p></section>',
    // the negative control for that rule: the same label twice is still a claim
    '<section class="section"><span class="chip verified">VERIFIED</span><span class="chip verified">VERIFIED</span>',
    '<h2>Still a claim</h2><p>no link here</p></section>'
].join('');

/**
 * The denylist canary. It is a real token the matcher must find, and it lives
 * in this script rather than in scripts/denylist.json so that no scanned file
 * ever contains a token the scanner is looking for.
 */
const SELFTEST_CANARY = 'zqxvhubdenylistcanary';

const SELFTEST_BAD_LEGEND = [
    '<div class="label-card verified"><span class="chip verified">VERIFIED</span>',
    '<p>Read in the cited file, commit, receipt, or workflow.</p></div>'
].join('');

const runSelfTests = (matcher, denylist) => {
    const problems = [];

    const { badges, nodes } = collectBadges(SELFTEST_HTML, new Set(['assets/diagrams/system-map.mmd']));
    if (badges.length !== 9) {
        problems.push(`badge parser self-test: expected 9 evidence badges in the fixture (the status-label row must not be collected), found ${badges.length}`);
    }
    const unlinked = badges.filter((badge) => badge.verdict === 'VERIFIED' && !badge.isLegend && badge.links === 0);
    if (unlinked.length !== 4) {
        problems.push(`badge parser self-test: expected 4 unlinked VERIFIED badges in the fixture, found ${unlinked.length}`);
    }
    const linked = badges.filter((badge) => badge.verdict === 'VERIFIED' && !badge.isLegend && badge.links > 0);
    if (linked.length !== 1) {
        problems.push(`badge parser self-test: expected 1 linked VERIFIED badge in the fixture, found ${linked.length}`);
    }
    // one legend card, plus the two chips of the vocabulary key. The same label
    // twice is deliberately not a key, and its two chips must stay claims.
    const legends = badges.filter((badge) => badge.isLegend);
    if (legends.length !== 3) {
        problems.push(`badge parser self-test: expected 3 legend badges in the fixture (one card, one two-label key), found ${legends.length}`);
    }
    const goodDefinitions = verifiedDefinitions(SELFTEST_HTML, nodes);
    if (!goodDefinitions.length || !goodDefinitions.every((definition) => PUBLIC_LINK_REQUIRED.test(definition.text))) {
        problems.push('legend self-test: the compliant fixture legend was not read as compliant');
    }
    const badParse = collectBadges(SELFTEST_BAD_LEGEND, new Set());
    const badDefinitions = verifiedDefinitions(SELFTEST_BAD_LEGEND, badParse.nodes);
    if (!badDefinitions.length || badDefinitions.some((definition) => PUBLIC_LINK_REQUIRED.test(definition.text))) {
        problems.push('legend self-test: a legend that omits the public-link requirement was not caught');
    }

    if (!isPlainObject(denylist.selftest) || !SHA256_HEX.test(denylist.selftest.sha256 || '')) {
        problems.push('denylist self-test: scripts/denylist.json carries no usable selftest canary');
    } else {
        // The canary lives here, in the script, and only its digest lives in the
        // JSON — so proving the matcher works never puts a scannable token in a
        // scanned file.
        const canaryMatcher = denylistMatcher({ salt: denylist.salt, terms: [denylist.selftest] });
        if (!canaryMatcher(`alpha ${SELFTEST_CANARY} omega`).length) {
            problems.push('denylist self-test: the canary was not found as a word; the matcher is not working');
        }
        if (!canaryMatcher(`alpha @${SELFTEST_CANARY}Handle omega`).some((hit) => hit.form === 'compact')) {
            problems.push('denylist self-test: the canary was not found inside a handle; compact matching is not working');
        }
        if (canaryMatcher('alpha beta gamma delta').length) {
            problems.push('denylist self-test: the matcher reported a hit on a clean probe string');
        }
    }

    // A truncated or empty term list would make every file "clean".
    if (!Array.isArray(denylist.terms) || !Number.isInteger(denylist.terms_expected)) {
        problems.push('denylist: "terms" must be an array and "terms_expected" an integer');
    } else if (denylist.terms.length !== denylist.terms_expected) {
        problems.push(`denylist: declares terms_expected=${denylist.terms_expected} but carries ${denylist.terms.length} terms`);
    } else if (denylist.terms_expected < 10) {
        problems.push(`denylist: terms_expected=${denylist.terms_expected} is below the floor of 10`);
    }
    denylist.terms.forEach((term, index) => {
        if (!isPlainObject(term) || !isNonEmptyString(term.id) || !isNonEmptyString(term.kind) || !SHA256_HEX.test(term.sha256 || '')) {
            problems.push(`denylist: terms[${index}] needs "id", "kind" and a sha256 digest`);
        }
    });
    if (matcher('alpha beta gamma delta').length) {
        problems.push('denylist self-test: the loaded matcher reported a hit on a clean probe string');
    }
    return problems;
};

/* --- the site gate -------------------------------------------------------- */

const runSite = () => {
    const pages = readJson(PAGES_PATH);
    const denylist = readJson(DENYLIST_PATH);
    if (!pages || !denylist) {
        errors.forEach((message) => console.error(`FAIL ${message}`));
        console.error(`VALIDATE-SITE result=FAIL violations=${errors.length}`);
        process.exit(1);
    }

    const matcher = denylistMatcher(denylist);
    runSelfTests(matcher, denylist).forEach(fail);

    // pages.json is the single source for the file list.
    const onDisk = fs.readdirSync(ROOT).filter((name) => name.endsWith('.html')).sort();
    if (!Array.isArray(pages.pages) || pages.pages.length === 0) {
        fail('pages.json: "pages" must be a non-empty array');
        pages.pages = [];
    }
    const declared = pages.pages.map((page) => page && page.file).filter(isNonEmptyString).sort();
    onDisk.filter((file) => !declared.includes(file)).forEach((file) => {
        fail(`pages.json: ${file} exists in the repository root but is not declared`);
    });
    declared.filter((file) => !onDisk.includes(file)).forEach((file) => {
        fail(`pages.json: declares ${file}, which is not in the repository root`);
    });
    const orders = new Map();
    pages.pages.forEach((page, index) => {
        const where = `pages.json: pages[${index}]${page && page.file ? ` (${page.file})` : ''}`;
        if (!isPlainObject(page)) { fail(`${where}: must be an object`); return; }
        ['file', 'title', 'series', 'summary'].forEach((field) => {
            if (!isNonEmptyString(page[field])) fail(`${where}: "${field}" must be a non-empty string`);
        });
        if (!Number.isInteger(page.series_order) || page.series_order < 1) {
            fail(`${where}: "series_order" must be a positive integer`);
        }
        const key = `${page.series}#${page.series_order}`;
        if (orders.has(key)) fail(`${where}: series_order ${page.series_order} is already used by ${orders.get(key)} in series "${page.series}"`);
        else orders.set(key, page.file);
    });

    // The evidence rule, page by page.
    const repoFiles = new Set(walkAll(ROOT).map((absolute) => path.relative(ROOT, absolute)));
    let totalBadges = 0;
    let verifiedBadges = 0;
    let legendBadges = 0;
    let definitionsChecked = 0;
    onDisk.forEach((file) => {
        const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
        const { badges, nodes } = collectBadges(html, repoFiles);
        totalBadges += badges.length;
        badges.forEach((badge) => {
            if (badge.isLegend) { legendBadges += 1; return; }
            if (badge.verdict !== 'VERIFIED') return;
            verifiedBadges += 1;
            if (badge.links === 0) {
                fail(`${file}:${badge.line}:${badge.column}: VERIFIED badge with no openable public link in its <${badge.blockTag}> block; the correct label is REPORTED`);
            }
        });
        verifiedDefinitions(html, nodes).forEach((definition) => {
            definitionsChecked += 1;
            if (!PUBLIC_LINK_REQUIRED.test(definition.text)) {
                fail(`${file}:${definition.line}:${definition.column}: this page redefines VERIFIED without the public-link requirement: "${definition.text.slice(0, 120)}"`);
            }
        });
    });
    if (totalBadges < SITE_MIN_BADGES) {
        fail(`site: found ${totalBadges} evidence badges across ${onDisk.length} pages, below the floor of ${SITE_MIN_BADGES}. A selector that matches nothing proves nothing, so this fails closed.`);
    }

    // Denied names and terms, everywhere they could be published.
    const scanned = walkFiles(ROOT);
    scanned.forEach((absolute) => {
        const relative = path.relative(ROOT, absolute);
        const text = scannableText(absolute, fs.readFileSync(absolute, 'utf8'));
        const reported = new Set();
        let lines = null;
        matcher(text).forEach((hit) => {
            let line = hit.offset >= 0 ? lineOf(text, hit.offset) : 0;
            const column = hit.offset >= 0 ? `:${columnOf(text, hit.offset)}` : '';
            if (line === 0) {
                // A word-form hit knows the file but not the place. Re-run the
                // same matcher line by line to put a number on it; "somewhere
                // in this file" is a much weaker thing to hand a maintainer.
                if (lines === null) lines = text.split('\n');
                for (let i = 0; i < lines.length; i += 1) {
                    if (matcher(lines[i]).some((again) => again.term.id === hit.term.id)) {
                        line = i + 1;
                        break;
                    }
                }
            }
            const key = `${hit.term.id}:${line}`;
            if (reported.has(key)) return;
            reported.add(key);
            fail(`${relative}${line ? `:${line}${column}` : ''}: denied ${hit.term.kind} "${hit.term.id}" appears here (matched ${hit.form}); it must not be published on this site`);
        });
    });

    if (errors.length) {
        errors.forEach((message) => console.error(`FAIL ${message}`));
        console.error(`VALIDATE-SITE result=FAIL pages=${onDisk.length} badges=${totalBadges} violations=${errors.length}`);
        process.exit(1);
    }
    console.log(
        `VALIDATE-SITE result=PASS pages=${onDisk.length} badges=${totalBadges} verified=${verifiedBadges} ` +
        `legends=${legendBadges} definitions=${definitionsChecked} filesScanned=${scanned.length} violations=0`
    );
};

const main = () => {
    const stampMode = process.argv.includes('--stamp');
    const ledger = readJson(LEDGER_PATH);
    const uptime = readJson(UPTIME_PATH);

    if (ledger) validateLedger(ledger);
    if (uptime) validateUptime(uptime);

    if (ledger && !stampMode) validateStamp(ledger);

    if (errors.length) {
        errors.forEach((message) => console.error(`FAIL ${message}`));
        console.error(`VALIDATE-LEDGER result=FAIL violations=${errors.length}`);
        process.exit(1);
    }

    if (stampMode && ledger) {
        ledger.validated = {
            script: STAMP_SCRIPT,
            at: new Date().toISOString().slice(0, 10),
            entries_sha256: entriesHash(ledger.entries)
        };
        const ordered = {
            schema_version: ledger.schema_version,
            validated: ledger.validated,
            window: ledger.window,
            verdict_key: ledger.verdict_key,
            entries: ledger.entries
        };
        fs.writeFileSync(LEDGER_PATH, `${JSON.stringify(ordered, null, 2)}\n`, 'utf8');
        console.log(`VALIDATE-LEDGER stamped at=${ledger.validated.at} entries_sha256=${ledger.validated.entries_sha256}`);
    }

    const verified = ledger.entries.filter((entry) => entry.verdict === 'VERIFIED').length;
    const reported = ledger.entries.filter((entry) => entry.verdict === 'REPORTED').length;
    const linked = ledger.entries.filter((entry) => entry.links.length > 0).length;
    console.log(
        `VALIDATE-LEDGER result=PASS entries=${ledger.entries.length} verified=${verified} reported=${reported} ` +
        `entriesWithLinks=${linked} links=${ledger.entries.reduce((sum, entry) => sum + entry.links.length, 0)} violations=0`
    );
};

if (process.argv.includes('--site')) runSite();
else main();
