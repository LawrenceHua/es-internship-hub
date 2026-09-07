#!/usr/bin/env python3
"""Offline regression checks for the permitted external producer change."""
import importlib.util
from pathlib import Path
import sys
import contextlib
import io

sys.dont_write_bytecode = True
root = Path(__file__).resolve().parent.parent
path = Path.home() / 'es-ops/bin/emit_automation_inventory.py'
spec = importlib.util.spec_from_file_location('hub_inventory', path)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
cases = [
    (['/usr/bin/env', 'python3', '/opt/jobs/digest.py'], '/opt/jobs/digest.py'),
    (['/usr/bin/python3', '-u', '/opt/jobs/digest.py'], '/opt/jobs/digest.py'),
    (['bash', '/opt/jobs/digest.sh'], '/opt/jobs/digest.sh'),
    (['/usr/bin/env', 'bash', '-c', 'set -a; source "$HOME/private.env"; set +a; python3 "$HOME/.openclaw/tools/feedback_digest/feedback_digest.py"'], '.openclaw/tools/feedback_digest/feedback_digest.py'),
    (['env', 'VALUE=private', 'bash', '-lc', 'exec python3 "$HOME/jobs/digest.py"'], 'jobs/digest.py'),
    (['env', '-u', 'VALUE', 'python3', '/opt/jobs/digest.py'], '/opt/jobs/digest.py'),
    (['env', '-S', 'python3 -u /opt/jobs/digest.py'], '/opt/jobs/digest.py'),
    (['/opt/jobs/worker'], '/opt/jobs/worker'),
    (['python3', '-c', 'print("private")'], ''),
    (['python3', '-m', 'module'], ''),
    (['bash', '-c', 'echo /private/credential.py'], ''),
    (['bash', '-c', 'source /private/credential.sh'], ''),
    (['env', 'VALUE=/private/credential.sh'], ''),
    (['bash', '-c', 'python3 "$(hidden)/job.py"'], ''),
    (['bash', '-c', 'python3 "unterminated'], ''),
    (['/usr/bin/env'], ''),
    ([], ''),
]
for args, expected in cases:
    actual = m.script_of(args)
    assert actual == expected, (args, actual, expected)
assert m.human_age(780) == '13 min before this reading'
assert m.human_age(None) == 'not measured'
legacy = '\n'.join(m.marker(edge).replace(': written', ' \u2014 written') for edge in ('BEGIN', 'END'))
assert '\u2014' not in m.replace_region(legacy, '<p>new</p>')
assert m.replace_region(m.replace_region(legacy, '<p>new</p>'), '<p>again</p>').count('<p>again</p>') == 1
# The release adapter accepts both marker generations without reading a live source.
spec = importlib.util.spec_from_file_location('hub_refresh', root / 'scripts/refresh-release-state.py')
wrapper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(wrapper)
release = wrapper.load_producer(Path.home() / 'es-ops/bin/emit_release_state.py')
for name in ('index.html', 'freshlens.html', 'how-it-works.html'):
    page = (root / name).read_text()
    for candidate in (page, page.replace('release-state: written', 'release-state \u2014 written')):
        changed = release.replace_region(candidate, '<p>adapter fixture</p>', name)
        assert '<p>adapter fixture</p>' in changed
        assert '\u2014' not in changed
try:
    with contextlib.redirect_stderr(io.StringIO()) as errors:
        release.replace_region('<p>missing markers</p>', 'fixture', 'fixture.html')
except SystemExit as error:
    assert error.code == 2
else:
    raise AssertionError('marker refusal was weakened')
print(f'PRODUCER-REGRESSION result=PASS command_cases={len(cases)} freshness=PASS marker_compatibility=PASS refusal=PASS')
