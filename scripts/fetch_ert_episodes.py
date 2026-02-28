"""
fetch_ert_episodes.py
=====================
Downloads the ERT (Episodes of Regime Transformation) dataset from
the V-Dem data archive and updates ERT_episodes in countryData.json.

The ERT dataset identifies discrete episodes where regime type is
changing — autocratization, democratization, or stabilization.

Usage
-----
1. Download the ERT dataset from:
       https://www.v-dem.net/data/dataset-archive/
   (look for "Episodes of Regime Transformation" in the list)

2. Run:
       python fetch_ert_episodes.py --csv ERT_v14.csv

Options
-------
  --csv PATH      Path to ERT CSV file  [required]
  --json PATH     Path to countryData.json
  --dry-run       Print changes without writing
"""

import argparse
import json
import sys
from pathlib import Path

try:
    import pandas as pd
except ImportError:
    sys.exit("Missing dependency: run  pip install pandas")

# ERT dataset column names (stable across v12–v14)
ERT_COUNTRY_COL     = "country_name"
ERT_YEAR_START_COL  = "reg_start"      # episode start year
ERT_YEAR_END_COL    = "reg_end"        # episode end year (NaN if ongoing)
ERT_TYPE_COL        = "reg_type"       # e.g. "autocratization", "democratization"
ERT_CHANGE_COL      = "v2x_polyarchy_change"  # direction/magnitude

# ERT regime type codes → human-readable labels
ERT_TYPE_LABELS = {
    "autocratization":   "autocratization",
    "democratization":   "democratization",
    "stabilization":     "stable period",
}

VDEM_NAME_MAP = {
    "United States of America":            "United States",
    "Bolivia (Plurinational State of)":    "Bolivia",
    "Venezuela, Bolivarian Republic of":   "Venezuela",
}


def load_ert(csv_path: Path) -> pd.DataFrame:
    print(f"Loading ERT CSV: {csv_path} …")
    try:
        df = pd.read_csv(csv_path, low_memory=False)
    except Exception as e:
        sys.exit(f"Could not read CSV: {e}")

    # Normalize country names
    df[ERT_COUNTRY_COL] = df[ERT_COUNTRY_COL].replace(VDEM_NAME_MAP)

    required = [ERT_COUNTRY_COL, ERT_YEAR_START_COL, ERT_TYPE_COL]
    missing = [c for c in required if c not in df.columns]
    if missing:
        sys.exit(
            f"Missing columns: {missing}\n"
            "Available: " + ", ".join(df.columns[:30].tolist())
        )

    print(f"Loaded {len(df)} ERT episodes for {df[ERT_COUNTRY_COL].nunique()} countries.")
    return df


def build_episodes(country_name: str, df: pd.DataFrame) -> list[dict]:
    rows = df[df[ERT_COUNTRY_COL] == country_name]
    episodes = []
    for _, row in rows.iterrows():
        ep_type  = str(row.get(ERT_TYPE_COL, "")).lower().strip()
        label    = ERT_TYPE_LABELS.get(ep_type, ep_type)
        start    = int(row[ERT_YEAR_START_COL]) if pd.notna(row.get(ERT_YEAR_START_COL)) else None
        end_raw  = row.get(ERT_YEAR_END_COL)
        end      = int(end_raw) if pd.notna(end_raw) else None

        if start is None:
            continue

        episodes.append({
            "type":        label,
            "start_year":  start,
            "end_year":    end,
            "description": f"ERT-recorded {label} episode ({start}–{'ongoing' if end is None else end}).",
        })

    # Sort by start year
    episodes.sort(key=lambda e: e["start_year"])
    return episodes


def update_tracker(json_path: Path, df: pd.DataFrame, dry_run: bool):
    with open(json_path) as f:
        data = json.load(f)

    updated = 0
    for country in data["countries"]:
        name     = country["name"]
        episodes = build_episodes(name, df)

        if not episodes:
            continue

        old_count = len(country.get("ERT_episodes", []))
        new_count = len(episodes)

        if new_count != old_count:
            print(f"{name}: {old_count} → {new_count} episodes")
            updated += 1

        if not dry_run:
            country["ERT_episodes"] = episodes

    print(f"\n{'[DRY RUN] Would update' if dry_run else 'Updated'} {updated} countries.")

    if not dry_run:
        with open(json_path, "w") as f:
            json.dump(data, f, indent=2)
        print(f"Written to {json_path}")


def main():
    parser = argparse.ArgumentParser(description="Update ERT episodes from V-Dem ERT CSV.")
    parser.add_argument("--csv",     required=True, help="Path to ERT CSV file")
    parser.add_argument("--json",    default=str(Path(__file__).parent.parent / "public" / "data" / "countryData.json"))
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    csv_path  = Path(args.csv)
    json_path = Path(args.json)

    if not csv_path.exists():
        sys.exit(f"CSV not found: {csv_path}")
    if not json_path.exists():
        sys.exit(f"JSON not found: {json_path}")

    df = load_ert(csv_path)
    update_tracker(json_path, df, args.dry_run)


if __name__ == "__main__":
    main()
