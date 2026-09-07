#!/usr/bin/env python3
"""Run the external release-state producer with this checkout's ASCII markers.

The external producer is deliberately unchanged. Its exact marker strings use
legacy punctuation, so adapt only that formatting at the module boundary. All
source reads, refusal checks and atomic writes still belong to the producer.

    python3 scripts/refresh-release-state.py [--dry-run]

Writes only into the checkout containing this script. Does not run Git.
"""
import argparse
import importlib.util
from pathlib import Path
import sys

sys.dont_write_bytecode = True


def load_producer(path):
    spec = importlib.util.spec_from_file_location('hub_release_state', path)
    module = importlib.util.module_from_spec(spec)
    # The producer imports its inventory sibling for the shared denylist.
    sys.path.insert(0, str(path.parent))
    spec.loader.exec_module(module)
    original_marker = module.marker
    module.marker = lambda edge: original_marker(edge).replace(' \u2014 ', ': ')
    original_replace = module.replace_region

    def replace_region(page, body, name):
        for edge in ('BEGIN', 'END'):
            page = page.replace(original_marker(edge), module.marker(edge))
        return original_replace(page, body, name)

    module.replace_region = replace_region
    return module


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    hub = Path(__file__).resolve().parent.parent
    path = Path.home() / 'es-ops/bin/emit_release_state.py'
    module = load_producer(path)
    sys.argv = [str(path), '--hub', str(hub)] + (['--dry-run'] if args.dry_run else [])
    return module.main()


if __name__ == '__main__':
    raise SystemExit(main())
