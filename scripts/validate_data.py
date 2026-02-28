"""
validate_data.py
================
Checks countryData.json for common data quality issues.
Run this after any update to catch missing fields, out-of-range scores,
or broken trend arrays before deploying to the site.

Usage
-----
    python validate_data.py
    python validate_data.py --json ../public/data/countryData.json
"""

import argparse
import json
import sys
from pathlib import Path

VALID_STATUSES = {"stable", "recovering", "at risk", "backsliding", "autocracy"}
VALID_REGIONS  = {"Latin America", "Europe", "Asia", "Africa", "North America", "Middle East"}
REQUIRED_FIELDS = [
    "name", "iso2", "region",
    "V-Dem_polyarchy_index", "libdem_index",
    "ERT_episodes", "BTI_governance_score",
    "DEED_event_counts", "status_indicator",
]


def validate(data: dict) -> list[str]:
    errors = []
    names  = set()

    for i, c in enumerate(data.get("countries", [])):
        label = c.get("name", f"[index {i}]")

        # Duplicate names
        if label in names:
            errors.append(f"{label}: duplicate entry")
        names.add(label)

        # Required fields present
        for field in REQUIRED_FIELDS:
            if field not in c:
                errors.append(f"{label}: missing field '{field}'")

        # Score ranges
        poly = c.get("V-Dem_polyarchy_index")
        lib  = c.get("libdem_index")
        bti  = c.get("BTI_governance_score")

        if poly is not None and not (0.0 <= poly <= 1.0):
            errors.append(f"{label}: V-Dem_polyarchy_index {poly} out of range [0,1]")
        if lib is not None and not (0.0 <= lib <= 1.0):
            errors.append(f"{label}: libdem_index {lib} out of range [0,1]")
        if bti is not None and not (1.0 <= bti <= 10.0):
            errors.append(f"{label}: BTI_governance_score {bti} out of range [1,10]")

        # LibDem should not exceed polyarchy
        if poly is not None and lib is not None and lib > poly + 0.05:
            errors.append(f"{label}: libdem_index ({lib}) > polyarchy ({poly}) — unusual, please verify")

        # Status
        status = (c.get("status_indicator") or "").lower()
        if status not in VALID_STATUSES:
            errors.append(f"{label}: status_indicator '{status}' not in {VALID_STATUSES}")

        # Region
        region = c.get("region", "")
        if region not in VALID_REGIONS:
            errors.append(f"{label}: region '{region}' not in {VALID_REGIONS}")

        # ERT episodes
        for j, ep in enumerate(c.get("ERT_episodes", [])):
            if "start_year" not in ep:
                errors.append(f"{label}: ERT episode {j} missing start_year")
            if "type" not in ep:
                errors.append(f"{label}: ERT episode {j} missing type")
            start = ep.get("start_year")
            end   = ep.get("end_year")
            if start and end and end < start:
                errors.append(f"{label}: ERT episode end_year ({end}) before start_year ({start})")

        # Trend data
        trend = c.get("polyarchy_trend", [])
        if trend:
            years = [pt.get("year") for pt in trend]
            if years != sorted(years):
                errors.append(f"{label}: polyarchy_trend years not sorted")
            for pt in trend:
                v = pt.get("value")
                if v is not None and not (0.0 <= v <= 1.0):
                    errors.append(f"{label}: trend value {v} for year {pt.get('year')} out of range")

    return errors


def main():
    parser = argparse.ArgumentParser(description="Validate countryData.json")
    parser.add_argument(
        "--json",
        default=str(Path(__file__).parent.parent / "public" / "data" / "countryData.json"),
        help="Path to countryData.json"
    )
    args = parser.parse_args()
    json_path = Path(args.json)

    if not json_path.exists():
        sys.exit(f"File not found: {json_path}")

    with open(json_path) as f:
        data = json.load(f)

    country_count = len(data.get("countries", []))
    print(f"Validating {country_count} countries in {json_path} …\n")

    errors = validate(data)

    if errors:
        print(f"Found {len(errors)} issue(s):\n")
        for err in errors:
            print(f"  ✗ {err}")
        sys.exit(1)
    else:
        print(f"✓ All {country_count} countries passed validation.")


if __name__ == "__main__":
    main()
