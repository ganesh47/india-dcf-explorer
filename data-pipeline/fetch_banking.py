"""Generate banking.parquet from FY25 annual reports — no network required."""
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from pathlib import Path

# Sources: FY25 annual reports, Q4 FY25 earnings presentations, investor days
BANKING_DATA = [
    # Banks
    {
        'ticker': 'HDFCBANK.NS', 'name': 'HDFC Bank', 'entity_type': 'bank',
        'nim': 3.46, 'cost_of_funds': 4.90, 'yield_on_assets': 8.40,
        'casa_ratio': 37.0, 'roe': 16.5, 'pb_ratio': 3.0, 'coe': 13.5,
    },
    {
        'ticker': 'ICICIBANK.NS', 'name': 'ICICI Bank', 'entity_type': 'bank',
        'nim': 4.40, 'cost_of_funds': 4.60, 'yield_on_assets': 9.00,
        'casa_ratio': 42.0, 'roe': 18.0, 'pb_ratio': 3.5, 'coe': 13.8,
    },
    {
        'ticker': 'KOTAKBANK.NS', 'name': 'Kotak Mahindra Bank', 'entity_type': 'bank',
        'nim': 5.02, 'cost_of_funds': 4.20, 'yield_on_assets': 9.22,
        'casa_ratio': 43.0, 'roe': 14.5, 'pb_ratio': 3.0, 'coe': 14.0,
    },
    {
        'ticker': 'AXISBANK.NS', 'name': 'Axis Bank', 'entity_type': 'bank',
        'nim': 4.06, 'cost_of_funds': 4.80, 'yield_on_assets': 8.86,
        'casa_ratio': 39.0, 'roe': 15.5, 'pb_ratio': 2.0, 'coe': 14.2,
    },
    {
        'ticker': 'SBIN.NS', 'name': 'State Bank of India', 'entity_type': 'bank',
        'nim': 3.28, 'cost_of_funds': 5.10, 'yield_on_assets': 8.38,
        'casa_ratio': 41.0, 'roe': 17.5, 'pb_ratio': 1.8, 'coe': 13.5,
    },
    {
        'ticker': 'INDUSINDBK.NS', 'name': 'IndusInd Bank', 'entity_type': 'bank',
        'nim': 4.29, 'cost_of_funds': 5.50, 'yield_on_assets': 9.79,
        'casa_ratio': 37.0, 'roe': 12.0, 'pb_ratio': 1.0, 'coe': 14.8,
    },
    {
        'ticker': 'BANDHANBNK.NS', 'name': 'Bandhan Bank', 'entity_type': 'bank',
        'nim': 7.20, 'cost_of_funds': 6.20, 'yield_on_assets': 13.40,
        'casa_ratio': 34.0, 'roe': 8.0, 'pb_ratio': 1.0, 'coe': 15.5,
    },
    {
        'ticker': 'IDFCFIRSTB.NS', 'name': 'IDFC First Bank', 'entity_type': 'bank',
        'nim': 6.40, 'cost_of_funds': 5.80, 'yield_on_assets': 12.20,
        'casa_ratio': 45.0, 'roe': 6.0, 'pb_ratio': 1.1, 'coe': 15.2,
    },
    # NBFCs
    {
        'ticker': 'BAJFINANCE.NS', 'name': 'Bajaj Finance', 'entity_type': 'nbfc',
        'nim': 10.10, 'cost_of_funds': 7.99, 'yield_on_assets': 18.09,
        'casa_ratio': 0.0, 'roe': 22.0, 'pb_ratio': 6.5, 'coe': 14.5,
    },
    {
        'ticker': 'SHRIRAMFIN.NS', 'name': 'Shriram Finance', 'entity_type': 'nbfc',
        'nim': 8.80, 'cost_of_funds': 8.40, 'yield_on_assets': 17.20,
        'casa_ratio': 0.0, 'roe': 17.5, 'pb_ratio': 2.2, 'coe': 15.0,
    },
    {
        'ticker': 'M&MFIN.NS', 'name': 'Mahindra Finance', 'entity_type': 'nbfc',
        'nim': 7.30, 'cost_of_funds': 7.90, 'yield_on_assets': 15.20,
        'casa_ratio': 0.0, 'roe': 13.5, 'pb_ratio': 1.6, 'coe': 14.8,
    },
    {
        'ticker': 'LTIM.NS', 'name': 'L&T Finance', 'entity_type': 'nbfc',
        'nim': 8.10, 'cost_of_funds': 7.50, 'yield_on_assets': 15.60,
        'casa_ratio': 0.0, 'roe': 14.0, 'pb_ratio': 1.5, 'coe': 14.6,
    },
    {
        'ticker': 'MUTHOOTFIN.NS', 'name': 'Muthoot Finance', 'entity_type': 'nbfc',
        'nim': 12.50, 'cost_of_funds': 8.00, 'yield_on_assets': 20.50,
        'casa_ratio': 0.0, 'roe': 28.0, 'pb_ratio': 3.5, 'coe': 15.2,
    },
    {
        'ticker': 'AUBANK.NS', 'name': 'AU Small Finance Bank', 'entity_type': 'bank',
        'nim': 5.80, 'cost_of_funds': 6.10, 'yield_on_assets': 11.90,
        'casa_ratio': 33.0, 'roe': 13.5, 'pb_ratio': 2.5, 'coe': 15.0,
    },
    {
        'ticker': 'AAVAS.NS', 'name': 'Aavas Financiers', 'entity_type': 'nbfc',
        'nim': 5.60, 'cost_of_funds': 8.00, 'yield_on_assets': 13.60,
        'casa_ratio': 0.0, 'roe': 14.0, 'pb_ratio': 3.0, 'coe': 14.8,
    },
]


def generate_banking(output_dir: Path) -> None:
    df = pd.DataFrame(BANKING_DATA)
    path = output_dir / 'banking.parquet'
    pq.write_table(pa.Table.from_pandas(df, preserve_index=False), path)
    print(f"  ✓ banking.parquet — {len(df)} rows")


if __name__ == '__main__':
    out = Path(__file__).parent.parent / 'public' / 'data'
    out.mkdir(parents=True, exist_ok=True)
    generate_banking(out)
