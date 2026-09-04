# `scripts/denylist.json` — how it works and how to add a term

Two rules on this site have no room for judgement: no personal name other than the program
lead's appears anywhere, and out-of-scope work is never named. `node scripts/validate-ledger.js
--site` enforces both across every `.html`, `.md` and `.json` file in the repository.

A gate like that normally needs a list of the forbidden words. Writing that list into a public
repository would publish the exact names the rule exists to keep off the site — the check would
become the leak. So `scripts/denylist.json` stores **salted digests** instead of words.

The salt is published in the same file. This is obfuscation, not a secret store: it defeats
casual reading, `grep`, and search indexing of this repository, and nothing more. Treat a digest
as public.

## What the matcher looks for

Each term is stored in up to two forms, and a file fails on either.

**Word form** (`sha256`, always present). The scanned text is lowercased and cut into runs of
`[a-z0-9]`. Every single word and every adjacent pair of words is hashed as
`sha256(salt + ":" + key)` and looked up. This is what catches a name written normally, spaced or
punctuated however you like: `Ada Lovelace`, `ada-lovelace` and `Ada, Lovelace` all reduce to the
key `ada lovelace`.

Only one- and two-word keys are generated. A term of three or more words separated by spaces
cannot be caught in this form.

**Compact form** (`compact_len` + `compact_h32`, optional). Every whitespace-delimited run is
reduced to letters and digits only, and each window of `compact_len` characters is checked — a
fast `djb2` hash first, then a full `sha256` to confirm. This is what catches a name buried inside
a token nobody would space out: a social handle, an email local part, a file path, a URL slug.

Two details make it behave:

- The dense string is built **per whitespace-delimited run**, never over the whole file. A
  whole-file dense string glues the end of one word to the start of the next and invents names
  nobody wrote; that false positive is what this shape exists to avoid.
- Inline markup (`<b>`, `<span>`, `<a>` …) is transparent, so `L<b>ovelace</b>` still reads as one
  run.

Omit the compact form when the dense spelling is short or is an ordinary English substring. A
four-letter compact term will fire inside real words, and a gate that cries wolf gets switched
off. The word form alone is enough for anything that is only ever written with spaces around it.

`scripts/validate-ledger.js` proves the matcher works before it trusts a clean scan: a canary
token is hashed into the `selftest` entry of the JSON, and the plain token lives only inside the
script — so proving the scanner can find something never puts a findable token in a scanned file.
The scan also fails if `terms.length` and `terms_expected` disagree, or if fewer than 10 terms are
loaded. A list that quietly emptied itself would otherwise report every file clean.

## Adding a term

Never type the term as a command argument, and never paste it into a file in this repository —
argument lists reach the shell history, and a file in the repository is the thing we are avoiding.
Read it from standard input instead:

```bash
read -rs -p 'term (not echoed): ' NEW_TERM

printf '%s' "$NEW_TERM" | node -e '
  const crypto = require("crypto");
  let raw = "";
  process.stdin.on("data", (chunk) => { raw += chunk; });
  process.stdin.on("end", () => {
    const salted = JSON.parse(require("fs").readFileSync("scripts/denylist.json", "utf8")).salt + ":";
    const term = raw.trim().toLowerCase();
    const word = term.replace(/[^a-z0-9]+/g, " ").trim();
    const dense = term.replace(/[^a-z0-9]/g, "");
    const sha = (t) => crypto.createHash("sha256").update(salted + t, "utf8").digest("hex");
    const djb2 = (start, t) => {
      let h = start;
      for (let i = 0; i < t.length; i += 1) h = (Math.imul(h, 33) + t.charCodeAt(i)) | 0;
      return h;
    };
    if (word.split(" ").length > 2) {
      console.error("warning: more than two words; only the compact form will match this");
    }
    console.log(JSON.stringify({
      id: "CHANGE-ME",
      kind: "name",
      sha256: sha(word),
      compact_len: dense.length,
      compact_h32: (djb2(djb2(5381, salted), dense) >>> 0).toString(16)
    }, null, 2));
  });
'

unset NEW_TERM
```

Then:

1. Paste the printed object into `terms`, and give it an `id` that describes the *category*, never
   the term — `cohort-name-11`, `employer-brand-04`. An `id` containing the term would make this
   file fail its own check.
2. Drop `compact_len` and `compact_h32` if the dense spelling is short or common, per above.
3. Increment `terms_expected`.
4. Run `node scripts/validate-ledger.js --site`. It fails if the count is wrong, and it fails on
   any file that now contains the term — including this one and `scripts/denylist.json`, which is
   the point.

To check whether a term is *already* covered without adding it, hash it the same way and search
`scripts/denylist.json` for the digest.

## Removing a term

Delete the entry and decrement `terms_expected`. There is no audit trail of what a digest was, by
design; if you need to know which entry corresponds to which term, hash the term and match the
digest.
