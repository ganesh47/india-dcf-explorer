"""Generate financials.parquet — synthetic mode uses sector norms; live mode uses yfinance."""
import random
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from pathlib import Path

# Sector financial profile: (revenue_cagr, ebit_margin, da_pct_rev, capex_pct_rev,
#                             nwc_growth_pct_rev, tax_rate, debt_equity_ratio)
SECTOR_PROFILES = {
    'FMCG':        (0.10, 0.18, 0.02, 0.03, 0.01, 0.25168, 0.10),
    'Pharma':      (0.12, 0.20, 0.03, 0.06, 0.02, 0.25168, 0.20),
    'IT':          (0.15, 0.22, 0.01, 0.02, 0.01, 0.25168, 0.05),
    'Utilities':   (0.08, 0.22, 0.08, 0.18, 0.02, 0.25168, 0.80),
    'Real Estate': (0.15, 0.25, 0.01, 0.05, 0.08, 0.25168, 1.20),
    'Banking':     (0.14, 0.30, 0.01, 0.01, 0.00, 0.25168, 0.00),
    'NBFC':        (0.20, 0.35, 0.01, 0.01, 0.00, 0.25168, 0.00),
    'Auto':        (0.10, 0.12, 0.04, 0.06, 0.02, 0.25168, 0.30),
    'Metals':      (0.08, 0.15, 0.05, 0.07, 0.03, 0.25168, 0.60),
    'Telecom':     (0.06, 0.35, 0.12, 0.20, 0.01, 0.25168, 1.50),
    'Energy':      (0.07, 0.12, 0.04, 0.08, 0.02, 0.25168, 0.50),
    'Consumer':    (0.12, 0.15, 0.02, 0.03, 0.02, 0.25168, 0.15),
}

SECTOR_MAP = {
    'FMCG': 'FMCG', 'Pharma': 'Pharma', 'IT': 'IT', 'Utilities': 'Utilities',
    'Real Estate': 'Real Estate', 'Banking': 'Banking', 'NBFC': 'NBFC',
    'Auto': 'Auto', 'Metals': 'Metals', 'Telecom': 'Telecom',
    'Energy': 'Energy', 'Consumer': 'Consumer',
}

TAX = 0.25168
YEARS = [2021, 2022, 2023, 2024, 2025]


def _synthetic_financials(ticker: str, sector: str, market_cap_cr: float) -> list[dict]:
    profile_key = SECTOR_MAP.get(sector, 'Consumer')
    (cagr, ebit_m, da_p, capex_p, nwc_p, tax, de) = SECTOR_PROFILES[profile_key]

    # Base FY2021 revenue estimated from market cap / typical EV/Revenue
    ev_rev = {'FMCG': 4.5, 'Pharma': 3.5, 'IT': 4.0, 'Utilities': 2.0,
              'Real Estate': 2.5, 'Banking': 0.0, 'NBFC': 0.0, 'Auto': 1.2,
              'Metals': 1.0, 'Telecom': 3.5, 'Energy': 1.5, 'Consumer': 2.5}
    base_ev_r = ev_rev.get(profile_key, 2.0)
    base_rev = (market_cap_cr * (1 + de)) / base_ev_r if base_ev_r > 0 else market_cap_cr * 0.5

    rows = []
    for i, year in enumerate(YEARS):
        noise = random.uniform(0.95, 1.05)
        rev = base_rev * (1 + cagr) ** i * noise
        ebit = rev * ebit_m * random.uniform(0.92, 1.08)
        da = rev * da_p
        ebitda = ebit + da
        capex = rev * capex_p * random.uniform(0.88, 1.12)
        delta_nwc = rev * nwc_p * random.uniform(0.80, 1.20)
        nopat = ebit * (1 - TAX)
        fcf = nopat + da - delta_nwc - capex
        pat = nopat * random.uniform(0.85, 1.05)  # PAT ≈ NOPAT ± financing
        total_equity = market_cap_cr * random.uniform(0.6, 0.9) / (1 + de)
        total_debt = total_equity * de
        roe = (pat / total_equity * 100) if total_equity > 0 else 0
        capital_employed = total_equity + total_debt
        roce = (ebit * (1 - TAX) / capital_employed * 100) if capital_employed > 0 else 0

        rows.append({
            'ticker': ticker, 'year': year,
            'revenue_cr': round(rev, 2), 'ebit_cr': round(ebit, 2),
            'ebitda_cr': round(ebitda, 2), 'da_cr': round(da, 2),
            'capex_cr': round(capex, 2), 'delta_nwc_cr': round(delta_nwc, 2),
            'pat_cr': round(pat, 2), 'total_debt_cr': round(total_debt, 2),
            'total_equity_cr': round(total_equity, 2),
            'roe': round(roe, 2), 'roce': round(roce, 2),
            'fcf_cr': round(fcf, 2), 'data_quality': 'synthetic',
        })
    return rows


def generate_financials_synthetic(output_dir: Path) -> None:
    from fetch_companies import NIFTY100_BASE
    random.seed(42)
    all_rows = []
    for ticker, _name, sector, _isin, mcap in NIFTY100_BASE:
        all_rows.extend(_synthetic_financials(ticker, sector, float(mcap)))
    df = pd.DataFrame(all_rows)
    path = output_dir / 'financials.parquet'
    pq.write_table(pa.Table.from_pandas(df, preserve_index=False), path)
    print(f"  ✓ financials.parquet — {len(df)} rows ({len(NIFTY100_BASE)} companies × {len(YEARS)} years, synthetic)")


def generate_financials_live(output_dir: Path) -> None:
    """Fetch real financials via yfinance. Falls back to synthetic per company on failure."""
    try:
        import yfinance as yf
    except ImportError:
        print("  ⚠ yfinance not installed — using synthetic")
        generate_financials_synthetic(output_dir)
        return

    from fetch_companies import NIFTY100_BASE
    random.seed(42)
    all_rows = []

    checkpoint = output_dir.parent.parent / 'data-pipeline' / 'checkpoint_financials.csv'
    done_tickers: set[str] = set()
    if checkpoint.exists():
        done_df = pd.read_csv(checkpoint)
        done_tickers = set(done_df['ticker'].unique())
        all_rows = done_df.to_dict('records')
        print(f"  → Resuming from checkpoint: {len(done_tickers)} tickers done")

    for ticker, _name, sector, _isin, mcap in NIFTY100_BASE:
        if ticker in done_tickers:
            continue
        try:
            t = yf.Ticker(ticker)
            cf = t.quarterly_cashflow
            inc = t.quarterly_income_stmt
            bs = t.quarterly_balance_sheet
            if cf is None or cf.empty:
                raise ValueError("No cashflow data")

            # Aggregate quarterly to FY (April-March for India)
            rows = _aggregate_yfinance(ticker, cf, inc, bs, sector, float(mcap))
            all_rows.extend(rows)
            done_tickers.add(ticker)
            print(f"  ✓ {ticker}: {len(rows)} years")
        except Exception as e:
            print(f"  ⚠ {ticker}: {e} — using synthetic")
            all_rows.extend(_synthetic_financials(ticker, sector, float(mcap)))
            done_tickers.add(ticker)

        # Checkpoint every 20 companies
        if len(done_tickers) % 20 == 0:
            pd.DataFrame(all_rows).to_csv(checkpoint, index=False)

        import time
        time.sleep(1.0)

    df = pd.DataFrame(all_rows)
    path = output_dir / 'financials.parquet'
    pq.write_table(pa.Table.from_pandas(df, preserve_index=False), path)
    checkpoint.unlink(missing_ok=True)
    print(f"  ✓ financials.parquet — {len(df)} rows (live)")


def _aggregate_yfinance(ticker, cf, inc, bs, sector, mcap):
    """Aggregate quarterly yfinance data to FY2021–2025."""
    import numpy as np

    def get_row(df, *keys):
        for k in keys:
            if k in df.index:
                return df.loc[k]
        return pd.Series(dtype=float)

    rows = []
    for fy in YEARS:
        try:
            # Indian FY: April to March. For FY2025 = Q1 Apr-Jun 2024 through Q4 Jan-Mar 2025
            start = pd.Timestamp(f'{fy - 1}-04-01')
            end = pd.Timestamp(f'{fy}-03-31')
            cols = [c for c in cf.columns if start <= c <= end]
            if not cols:
                continue

            def sum_fy(series):
                vals = series[cols].dropna()
                return float(vals.sum()) / 1e7 if len(vals) > 0 else np.nan

            capex = abs(sum_fy(get_row(cf, 'Capital Expenditure', 'Purchase Of Ppe')))
            op_cf = sum_fy(get_row(cf, 'Operating Cash Flow', 'Cash From Operating Activities'))
            da = abs(sum_fy(get_row(cf, 'Depreciation And Amortization', 'Depreciation Amortization Depletion')))
            revenue = sum_fy(get_row(inc, 'Total Revenue'))
            ebit = sum_fy(get_row(inc, 'EBIT', 'Operating Income'))
            pat = sum_fy(get_row(inc, 'Net Income', 'Net Income Common Stockholders'))

            ebitda = (ebit or 0) + (da or 0)
            nopat = (ebit or 0) * (1 - TAX)
            delta_nwc = (op_cf or 0) - nopat - (da or 0) if op_cf else 0
            fcf = nopat + (da or 0) - abs(delta_nwc) - (capex or 0)

            total_equity = float((get_row(bs, 'Stockholders Equity', 'Total Stockholder Equity')[cols].dropna().mean() or mcap * 0.6) / 1e7)
            total_debt = float((get_row(bs, 'Total Debt', 'Long Term Debt')[cols].dropna().mean() or 0) / 1e7)
            roe = (pat / total_equity * 100) if total_equity else 0
            roce = (nopat / (total_equity + total_debt) * 100) if (total_equity + total_debt) else 0

            rows.append({
                'ticker': ticker, 'year': fy,
                'revenue_cr': round(revenue or 0, 2),
                'ebit_cr': round(ebit or 0, 2),
                'ebitda_cr': round(ebitda, 2),
                'da_cr': round(da or 0, 2),
                'capex_cr': round(capex or 0, 2),
                'delta_nwc_cr': round(abs(delta_nwc), 2),
                'pat_cr': round(pat or 0, 2),
                'total_debt_cr': round(total_debt, 2),
                'total_equity_cr': round(total_equity, 2),
                'roe': round(roe, 2), 'roce': round(roce, 2),
                'fcf_cr': round(fcf, 2), 'data_quality': 'live',
            })
        except Exception:
            continue

    if not rows:
        rows = _synthetic_financials(ticker, sector, mcap)
        for r in rows:
            r['data_quality'] = 'estimated'
    return rows


if __name__ == '__main__':
    out = Path(__file__).parent.parent / 'public' / 'data'
    out.mkdir(parents=True, exist_ok=True)
    generate_financials_synthetic(out)
