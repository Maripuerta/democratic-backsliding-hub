"""
update_from_vdem.py
===================
Reads a V-Dem country-year CSV file and updates countryData.json
with the latest polyarchy and liberal democracy scores, plus
appends a new data point to each country's polyarchy_trend.

Usage
-----
1. Download the V-Dem country-year dataset from:
       https://www.v-dem.net/data/the-v-dem-dataset/
   (free registration required; choose "Country-Year: V-Dem Full+Others")

2. Place the downloaded CSV in this directory (or pass its path with --csv).

3. Run:
       python update_from_vdem.py --csv V-Dem-CY-Full+Others-v14.1.csv

Options
-------
  --csv PATH      Path to V-Dem country-year CSV  [required]
  --year INT      Which year's data to pull (default: latest available)
  --json PATH     Path to countryData.json (default: ../public/data/countryData.json)
  --dry-run       Print changes without writing to disk
"""

import argparse
import json
import sys
from pathlib import Path

try:
    import pandas as pd
except ImportError:
    sys.exit("Missing dependency: run  pip install pandas")


# ── V-Dem column names ──────────────────────────────────────────────────────
# These are stable across recent V-Dem releases (v13/v14)
VDEM_POLYARCHY_COL = "v2x_polyarchy"   # Electoral Democracy Index
VDEM_LIBDEM_COL    = "v2x_libdem"      # Liberal Democracy Index
VDEM_COUNTRY_COL   = "country_name"
VDEM_YEAR_COL      = "year"

# Map V-Dem country names → tracker country names where they differ
VDEM_NAME_MAP = {
    "United States of America": "United States",
    "South Korea":               "South Korea",
    "Republic of Korea":         "South Korea",
    "Dominican Republic":        "Dominican Republic",
    "Bolivia (Plurinational State of)": "Bolivia",
    "Venezuela, Bolivarian Republic of": "Venezuela",
    "Iran, Islamic Republic of": "Iran",
}


def load_vdem(csv_path: Path, year: int | None) -> pd.DataFrame:
    print(f"Loading V-Dem CSV: {csv_path} …")
    cols = [VDEM_COUNTRY_COL, VDEM_YEAR_COL, VDEM_POLYARCHY_COL, VDEM_LIBDEM_COL]
    try:
        df = pd.read_csv(csv_path, usecols=cols, low_memory=False)
    except ValueError:
        # Some releases use slightly different column names
        df = pd.read_csv(csv_path, low_memory=False)
        missing = [c for c in cols if c not in df.columns]
        if missing:
            sys.exit(
                f"Could not find columns {missing} in the CSV.\n"
                "Check V-Dem column names at https://www.v-dem.net/data/reference-documents/"
            )
        df = df[cols]

    if year is None:
        year = int(df[VDEM_YEAR_COL].max())
        print(f"Using latest available year: {year}")
    else:
        if year not in df[VDEM_YEAR_COL].values:
            sys.exit(f"Year {year} not found in the dataset.")

    df = df[df[VDEM_YEAR_COL] == year].copy()
    df[VDEM_COUNTRY_COL] = df[VDEM_COUNTRY_COL].replace(VDEM_NAME_MAP)
    df = df.set_index(VDEM_COUNTRY_COL)
    print(f"Loaded {len(df)} country rows for year {year}.")
    return df, year


def update_tracker(json_path: Path, df: pd.DataFrame, year: int, dry_run: bool):
    with open(json_path) as f:
        data = json.load(f)

    updated = 0
    not_found = []

    for country in data["countries"]:
        name = country["name"]
        if name not in df.index:
            not_found.append(name)
            continue

        row = df.loc[name]
        poly = round(float(row[VDEM_POLYARCHY_COL]), 3) if pd.notna(row[VDEM_POLYARCHY_COL]) else None
        lib  = round(float(row[VDEM_LIBDEM_COL]),    3) if pd.notna(row[VDEM_LIBDEM_COL])    else None

        old_poly = country.get("V-Dem_polyarchy_index")
        old_lib  = country.get("libdem_index")

        changes = []
        if poly is not None and poly != old_poly:
            changes.append(f"  polyarchy: {old_poly} → {poly}")
            country["V-Dem_polyarchy_index"] = poly
        if lib is not None and lib != old_lib:
            changes.append(f"  libdem:    {old_lib} → {lib}")
            country["libdem_index"] = lib

        # Append to trend if this year isn't already there
        trend = country.setdefault("polyarchy_trend", [])
        existing_years = {pt["year"] for pt in trend}
        if poly is not None and year not in existing_years:
            trend.append({"year": year, "value": poly})
            trend.sort(key=lambda p: p["year"])
            changes.append(f"  trend: added {year}={poly}")

        if changes:
            updated += 1
            print(f"{name}:")
            for c in changes:
                print(c)

    if not_found:
        print(f"\nCountries not found in V-Dem CSV (no update): {', '.join(not_found)}")

    print(f"\n{'[DRY RUN] Would update' if dry_run else 'Updated'} {updated}/{len(data['countries'])} countries.")

    if not dry_run:
        with open(json_path, "w") as f:
            json.dump(data, f, indent=2)
        print(f"Written to {json_path}")


def main():
    parser = argparse.ArgumentParser(description="Update tracker JSON from V-Dem CSV.")
    parser.add_argument("--csv",     required=True, help="Path to V-Dem country-year CSV")
    parser.add_argument("--year",    type=int,      help="Year to pull (default: latest)")
    parser.add_argument("--json",    default=str(Path(__file__).parent.parent / "public" / "data" / "countryData.json"),
                        help="Path to countryData.json")
    parser.add_argument("--dry-run", action="store_true", help="Show changes without writing")
    args = parser.parse_args()

    csv_path  = Path(args.csv)
    json_path = Path(args.json)

    if not csv_path.exists():
        sys.exit(f"CSV not found: {csv_path}")
    if not json_path.exists():
        sys.exit(f"JSON not found: {json_path}")

    df, year = load_vdem(csv_path, args.year)
    update_tracker(json_path, df, year, args.dry_run)


if __name__ == "__main__":
    main()
