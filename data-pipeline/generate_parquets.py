#!/usr/bin/env python3
"""Orchestrator: generate all parquet files for the India DCF Explorer.

Usage:
    python generate_parquets.py              # synthetic mode (no network, fast)
    python generate_parquets.py --mode live  # live mode via yfinance (slower)
"""
import argparse
import sys
from pathlib import Path

OUTPUT_DIR = Path(__file__).parent.parent / 'public' / 'data'
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

sys.path.insert(0, str(Path(__file__).parent))

parser = argparse.ArgumentParser(description='Generate parquet data files for India DCF Explorer')
parser.add_argument('--mode', choices=['synthetic', 'live'], default='synthetic',
                    help='synthetic: no network deps; live: fetch from yfinance + Damodaran')
args = parser.parse_args()

print(f"\n=== India DCF Explorer — Data Pipeline ({args.mode} mode) ===\n")

print("1/5  Generating rates.parquet (RBI rate history)…")
from fetch_rates import generate_rates
generate_rates(OUTPUT_DIR)

print("2/5  Generating banking.parquet (FY25 NIM/spread data)…")
from fetch_banking import generate_banking
generate_banking(OUTPUT_DIR)

print("3/5  Generating sector_wacc.parquet (Damodaran + EY-NSE benchmarks)…")
from fetch_damodaran import generate_sector_wacc
generate_sector_wacc(OUTPUT_DIR)

if args.mode == 'live':
    print("4/5  Fetching companies (yfinance)…")
    from fetch_companies import generate_companies_live
    generate_companies_live(OUTPUT_DIR)

    print("5/5  Fetching financials (yfinance quarterly → annual)…")
    from fetch_financials import generate_financials_live
    generate_financials_live(OUTPUT_DIR)
else:
    print("4/5  Generating companies (NIFTY 100, synthetic)…")
    from fetch_companies import generate_companies_synthetic
    generate_companies_synthetic(OUTPUT_DIR)

    print("5/5  Generating financials (sector-norm synthetic)…")
    from fetch_financials import generate_financials_synthetic
    generate_financials_synthetic(OUTPUT_DIR)

print(f"\n=== Done. Parquets in {OUTPUT_DIR} ===\n")
for p in sorted(OUTPUT_DIR.glob('*.parquet')):
    size_kb = p.stat().st_size / 1024
    print(f"  {p.name:40s} {size_kb:7.1f} KB")
