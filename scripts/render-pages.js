#!/usr/bin/env node
'use strict';

/**
 * render-pages.js — pages.json is the single source for which pages exist.
 *
 *   node scripts/render-pages.js              check; exit 1 on any drift
 *   node scripts/render-pages.js --check      the same, said out loud
 *   node scripts/render-pages.js --write      regenerate the ARCHITECTURE.md regions
 *   node scripts/render-pages.js --print-footer   print the classroom footer markup
 *
 * No dependencies. Node's own fs only.
 *
 * What it does, and why:
 *   - ARCHITECTURE.md's page table and its verification command line are
 *     generated between markers, so the document cannot drift from the site.
 *     The audit found a document describing 4 of 12 pages and a published
 *     verification command that validated those same 4, which is how eight
 *     pages went unchecked while the command reported clean.
 *   - the classroom-series footers are checked, not rewritten. The pages
 *     already carry the corrected six-item footers; this proves they still
 *     match pages.json rather than silently overwriting whatever is there.
 *   - pages.json and `ls *.html` must agree. That one check makes both
 *     defects unrepeatable.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PAGES_PATH = path.join(ROOT, 'pages.json');
const ARCHITECTURE_PATH = path.join(ROOT, 'ARCHITECTURE.md');
const CLASSROOM = 'classroom';
const AI_TELLS = 'python3 ~/.codex/skills/design-quality-gate/scripts/check-ai-tells.py';

const problems = [];
const fail = (message) => problems.push(message);

const readPages = () => {
    const pages = JSON.parse(fs.readFileSync(PAGES_PATH, 'utf8'));
    if (!Array.isArray(pages.pages) || pages.pages.length === 0) {
        throw new Error('pages.json: "pages" must be a non-empty array');
    }
    return pages;
};

const inOrder = (pages, series) => pages.pages
    .filter((page) => page.series === series)
    .sort((left, right) => left.series_order - right.series_order);

const allInOrder = (pages) => Object.keys(pages.series_titles || {})
    .flatMap((series) => inOrder(pages, series));

const escapeCell = (text) => text.replace(/\|/g, '\\|');

/* --- generated regions ---------------------------------------------------- */

const marker = (name, edge) => `<!-- ${edge} GENERATED ${name} — written by scripts/render-pages.js from pages.json; do not edit by hand -->`;

const pagesTable = (pages) => {
    const lines = [
        '| # | Page | Series | Title | What it is |',
        '|---|---|---|---|---|'
    ];
    let index = 0;
    Object.entries(pages.series_titles || {}).forEach(([series, seriesTitle]) => {
        inOrder(pages, series).forEach((page) => {
            index += 1;
            lines.push(`| ${index} | \`${page.file}\` | ${escapeCell(seriesTitle)} ${page.series_order} | ${escapeCell(page.title)} | ${escapeCell(page.summary)} |`);
        });
    });
    lines.push('');
    lines.push(`The site is ${index} HTML pages. This table is generated: add or remove a page in \`pages.json\` and`);
    lines.push('re-run `node scripts/render-pages.js --write`. The classroom series is read in the order above,');
    lines.push('and every one of its pages carries a footer listing all of them.');
    return lines.join('\n');
};

const wrapArguments = (files, indent) => {
    const rows = [];
    for (let i = 0; i < files.length; i += 4) rows.push(files.slice(i, i + 4).join(' '));
    return rows.map((row, index) => (index === 0 ? row : `${indent}${row}`)).join(' \\\n');
};

const verificationBlock = (pages) => {
    const files = allInOrder(pages).map((page) => page.file);
    return [
        '```bash',
        'node scripts/validate-ledger.js',
        'node scripts/validate-ledger.js --site',
        'node scripts/render-pages.js --check',
        `npx --yes html-validate ${wrapArguments(files, '  ')}`,
        `${AI_TELLS} \\`,
        `  ${wrapArguments(files, '  ')}`,
        'bash scripts/check-mermaid.sh',
        'git diff --check',
        '```',
        '',
        `Every one of the ${files.length} pages is named on both command lines, and both lists are generated from`,
        '`pages.json`. A validator pointed at a subset reports a clean result for pages it never opened,',
        'which is the same failure the hub teaches against.'
    ].join('\n');
};

const replaceRegion = (document, name, body) => {
    const open = marker(name, 'BEGIN');
    const close = marker(name, 'END');
    const start = document.indexOf(open);
    const end = document.indexOf(close);
    if (start === -1 || end === -1 || end < start) {
        throw new Error(`ARCHITECTURE.md: the "${name}" generated region markers are missing or out of order`);
    }
    return `${document.slice(0, start)}${open}\n\n${body}\n\n${document.slice(end)}`;
};

const renderArchitecture = (pages, current) => {
    let next = replaceRegion(current, 'pages-table', pagesTable(pages));
    next = replaceRegion(next, 'verification', verificationBlock(pages));
    return next;
};

/* --- classroom footers ---------------------------------------------------- */

const footerMarkup = (pages, currentFile) => {
    const items = inOrder(pages, CLASSROOM).map((page) => {
        const currentAttribute = page.file === currentFile ? ' aria-current="page"' : '';
        return `<li><a href="${page.file}"${currentAttribute}>${page.series_order}. ${page.title}</a></li>`;
    });
    return [
        '<nav class="series" aria-label="Classroom reading order">',
        '<p class="series-title">Classroom series: read in this order</p>',
        `<ol class="series-list">${items.join('')}</ol>`,
        '</nav>'
    ].join('');
};

const collapse = (text) => text.replace(/\s+/g, ' ').trim();

const checkFooters = (pages) => {
    const expected = inOrder(pages, CLASSROOM);
    if (expected.length === 0) fail('pages.json: no page is in the classroom series');
    expected.forEach((page) => {
        const html = fs.readFileSync(path.join(ROOT, page.file), 'utf8');
        const lists = html.match(/<ol class="series-list">[\s\S]*?<\/ol>/g) || [];
        if (lists.length !== 1) {
            fail(`${page.file}: expected exactly one classroom-series footer, found ${lists.length}`);
            return;
        }
        const items = [...lists[0].matchAll(/<li>\s*<a\s+href="([^"]+)"([^>]*)>([\s\S]*?)<\/a>\s*<\/li>/g)];
        if (items.length !== expected.length) {
            fail(`${page.file}: the classroom footer lists ${items.length} pages; pages.json has ${expected.length}`);
            return;
        }
        items.forEach((item, index) => {
            const target = expected[index];
            const label = collapse(item[3]);
            const wanted = `${target.series_order}. ${target.title}`;
            if (item[1] !== target.file) {
                fail(`${page.file}: classroom footer position ${index + 1} links to ${item[1]}; pages.json says ${target.file}`);
            }
            if (label !== wanted) {
                fail(`${page.file}: classroom footer position ${index + 1} reads "${label}"; pages.json says "${wanted}"`);
            }
            const marksSelf = /aria-current\s*=\s*"page"/.test(item[2]);
            if (target.file === page.file && !marksSelf) {
                fail(`${page.file}: its own classroom footer entry does not carry aria-current="page"`);
            }
            if (target.file !== page.file && marksSelf) {
                fail(`${page.file}: classroom footer entry for ${target.file} wrongly carries aria-current="page"`);
            }
        });
    });

    // The series must also be reachable from the program overview, or a reader
    // following the site never arrives at it.
    const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    expected.forEach((page) => {
        if (!index.includes(`href="${page.file}"`)) {
            fail(`index.html: does not link to classroom page ${page.file}`);
        }
    });
};

/* --- file list ------------------------------------------------------------ */

const checkFileList = (pages) => {
    const onDisk = fs.readdirSync(ROOT).filter((name) => name.endsWith('.html')).sort();
    const declared = pages.pages.map((page) => page.file).sort();
    onDisk.filter((file) => !declared.includes(file)).forEach((file) => {
        fail(`pages.json: ${file} exists in the repository root but is not declared`);
    });
    declared.filter((file) => !onDisk.includes(file)).forEach((file) => {
        fail(`pages.json: declares ${file}, which is not in the repository root`);
    });
    if (onDisk.length !== declared.length) {
        fail(`pages.json: declares ${declared.length} pages; \`ls *.html\` finds ${onDisk.length}`);
    }
    // A file-list check that compares two empty lists proves nothing.
    if (onDisk.length === 0) fail('site: no HTML pages were found at the repository root; this fails closed');
    return onDisk.length;
};

/* --- entry point ---------------------------------------------------------- */

const main = () => {
    const write = process.argv.includes('--write');
    const printFooter = process.argv.includes('--print-footer');
    const pages = readPages();

    if (printFooter) {
        console.log(footerMarkup(pages, null));
        return;
    }

    const pageCount = checkFileList(pages);
    checkFooters(pages);

    const current = fs.readFileSync(ARCHITECTURE_PATH, 'utf8');
    const rendered = renderArchitecture(pages, current);
    if (write) {
        if (rendered !== current) {
            fs.writeFileSync(ARCHITECTURE_PATH, rendered, 'utf8');
            console.log('RENDER-PAGES wrote ARCHITECTURE.md generated regions');
        } else {
            console.log('RENDER-PAGES ARCHITECTURE.md generated regions already current');
        }
    } else if (rendered !== current) {
        fail('ARCHITECTURE.md: the generated regions are stale. Re-run: node scripts/render-pages.js --write');
    }

    if (problems.length) {
        problems.forEach((message) => console.error(`FAIL ${message}`));
        console.error(`RENDER-PAGES result=FAIL pages=${pageCount} violations=${problems.length}`);
        process.exit(1);
    }
    console.log(
        `RENDER-PAGES result=PASS pages=${pageCount} classroom=${inOrder(pages, CLASSROOM).length} ` +
        `generated=ARCHITECTURE.md violations=0`
    );
};

main();
