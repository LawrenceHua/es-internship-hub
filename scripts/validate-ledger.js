#!/usr/bin/env node
'use strict';

/**
 * validate-ledger.js — the gate behind the Program Ledger page.
 *
 * Run from the repository root:
 *   node scripts/validate-ledger.js           check only, exit 1 on any violation
 *   node scripts/validate-ledger.js --stamp   check, then write the validated stamp
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

main();
