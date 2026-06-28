"""Generate rates.parquet from documented RBI policy history — no network required."""
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from pathlib import Path
from datetime import date

# RBI repo rate policy decisions (date = effective from)
REPO_DECISIONS = [
    ('2015-01', 7.75), ('2015-03', 7.50), ('2015-06', 7.25), ('2015-09', 6.75),
    ('2016-04', 6.50), ('2016-10', 6.25),
    ('2017-08', 6.00),
    ('2019-02', 6.25), ('2019-04', 6.00), ('2019-06', 5.75), ('2019-08', 5.40),
    ('2019-10', 5.15),
    ('2020-03', 4.40), ('2020-05', 4.00),
    ('2022-05', 4.40), ('2022-06', 4.90), ('2022-08', 5.40),
    ('2022-09', 5.90), ('2022-12', 6.25),
    ('2023-02', 6.50),
    ('2025-02', 6.25), ('2025-04', 6.00), ('2025-06', 5.75),
    ('2025-08', 5.50), ('2025-10', 5.25),
]

# G-Sec 10Y approximate level by period (documented from RBI/CCIL reports)
GSEC_BY_PERIOD = [
    ('2015-01', 7.80), ('2015-06', 7.90), ('2015-12', 7.75),
    ('2016-01', 7.75), ('2016-06', 7.45), ('2016-12', 6.60),
    ('2017-01', 6.45), ('2017-06', 6.50), ('2017-12', 7.30),
    ('2018-01', 7.40), ('2018-06', 7.85), ('2018-12', 7.50),
    ('2019-01', 7.30), ('2019-06', 6.90), ('2019-12', 6.55),
    ('2020-01', 6.60), ('2020-05', 5.75), ('2020-08', 5.90), ('2020-12', 5.95),
    ('2021-01', 5.95), ('2021-06', 6.05), ('2021-12', 6.45),
    ('2022-01', 6.55), ('2022-06', 7.45), ('2022-12', 7.30),
    ('2023-01', 7.35), ('2023-06', 7.10), ('2023-12', 7.20),
    ('2024-01', 7.15), ('2024-06', 7.00), ('2024-09', 6.85), ('2024-12', 6.75),
    ('2025-01', 6.70), ('2025-06', 6.50), ('2025-12', 6.55),
    ('2026-01', 6.60), ('2026-03', 6.70), ('2026-06', 6.84),
]

# CPI approximate annual avg by year
CPI_BY_YEAR = {
    2015: 4.9, 2016: 4.5, 2017: 3.6, 2018: 3.4, 2019: 4.8,
    2020: 6.2, 2021: 5.1, 2022: 6.7, 2023: 5.7, 2024: 4.8,
    2025: 4.2, 2026: 3.9,
}


def _interpolate_series(decisions: list[tuple[str, float]], months: list[str]) -> list[float]:
    """Forward-fill rate series from policy decision dates."""
    rate_map = {}
    for m, r in decisions:
        rate_map[m] = r
    result, current = [], decisions[0][1]
    for m in months:
        if m in rate_map:
            current = rate_map[m]
        result.append(current)
    return result


def generate_rates(output_dir: Path) -> None:
    months = pd.date_range('2015-01', '2026-06', freq='MS').strftime('%Y-%m').tolist()
    repo_rates = _interpolate_series(REPO_DECISIONS, months)
    gsec_rates = _interpolate_series(GSEC_BY_PERIOD, months)
    cpi = [CPI_BY_YEAR.get(int(m[:4]), 4.5) for m in months]

    df = pd.DataFrame({'date': months, 'gsec_10y': gsec_rates, 'repo_rate': repo_rates, 'cpi_inflation': cpi})
    path = output_dir / 'rates.parquet'
    pq.write_table(pa.Table.from_pandas(df, preserve_index=False), path)
    print(f"  ✓ rates.parquet — {len(df)} rows ({months[0]} to {months[-1]})")


if __name__ == '__main__':
    out = Path(__file__).parent.parent / 'public' / 'data'
    out.mkdir(parents=True, exist_ok=True)
    generate_rates(out)
