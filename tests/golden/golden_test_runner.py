#!/usr/bin/env python3
"""Validate ChatPDM golden fixtures against the product response schema.

Usage:
    python chatpdm/tests/golden/golden_test_runner.py

This runner intentionally does one thing only:
validate every fixture under tests/golden/fixtures against docs/product/response-schema.json.

How to add a new fixture:
1. Add a JSON file under tests/golden/fixtures/
2. Make sure it represents an approved output scenario
3. Run this script and fix any schema errors before commit
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

try:
    import jsonschema
except ImportError as error:  # pragma: no cover - environment issue, not logic
    print(f"FAIL missing dependency: {error}")
    print("Install python jsonschema before running golden fixture validation.")
    sys.exit(1)


ROOT_DIR = Path(__file__).resolve().parents[2]
SCHEMA_PATH = ROOT_DIR / "docs" / "product" / "response-schema.json"
FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


def load_json(path: Path) -> object:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def main() -> int:
    try:
        schema = load_json(SCHEMA_PATH)
    except FileNotFoundError:
        print(f"FAIL missing schema: {SCHEMA_PATH}")
        return 1
    except json.JSONDecodeError as error:
        print(f"FAIL invalid schema JSON: {SCHEMA_PATH} ({error})")
        return 1

    fixtures = sorted(FIXTURES_DIR.glob("*.json"))
    if not fixtures:
        print(f"FAIL no fixtures found in {FIXTURES_DIR}")
        return 1

    validator = jsonschema.Draft202012Validator(schema)
    failures = 0

    for fixture_path in fixtures:
        try:
            payload = load_json(fixture_path)
        except json.JSONDecodeError as error:
            print(f"FAIL {fixture_path.name}: invalid JSON ({error})")
            failures += 1
            continue

        errors = sorted(validator.iter_errors(payload), key=lambda item: list(item.path))
        if errors:
            print(f"FAIL {fixture_path.name}")
            for error in errors:
                location = "/".join(str(part) for part in error.path) or "<root>"
                print(f"  - {location}: {error.message}")
            failures += 1
            continue

        print(f"PASS {fixture_path.name}")

    total = len(fixtures)
    passed = total - failures
    print(f"\nSummary: {passed} passed, {failures} failed, {total} total")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
