"""Generate companies.parquet — NIFTY 100 base + optional yfinance enrichment."""
import time
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from pathlib import Path

# NIFTY 100 companies: (ticker, name, sector, isin, approx_market_cap_cr)
# Market caps are June 2026 approximations
NIFTY100_BASE = [
    ('RELIANCE.NS', 'Reliance Industries', 'Energy', 'INE002A01018', 1950000),
    ('TCS.NS', 'Tata Consultancy Services', 'IT', 'INE467B01029', 1480000),
    ('HDFCBANK.NS', 'HDFC Bank', 'Banking', 'INE040A01034', 1320000),
    ('BHARTIARTL.NS', 'Bharti Airtel', 'Telecom', 'INE397D01024', 920000),
    ('ICICIBANK.NS', 'ICICI Bank', 'Banking', 'INE090A01021', 910000),
    ('INFY.NS', 'Infosys', 'IT', 'INE009A01021', 750000),
    ('SBIN.NS', 'State Bank of India', 'Banking', 'INE062A01020', 740000),
    ('HINDUNILVR.NS', 'Hindustan Unilever', 'FMCG', 'INE030A01027', 580000),
    ('ITC.NS', 'ITC Limited', 'FMCG', 'INE154A01025', 560000),
    ('LT.NS', 'Larsen & Toubro', 'Utilities', 'INE018A01030', 540000),
    ('BAJFINANCE.NS', 'Bajaj Finance', 'NBFC', 'INE296A01024', 520000),
    ('HCLTECH.NS', 'HCL Technologies', 'IT', 'INE860A01027', 490000),
    ('KOTAKBANK.NS', 'Kotak Mahindra Bank', 'Banking', 'INE237A01028', 470000),
    ('SUNPHARMA.NS', 'Sun Pharmaceutical', 'Pharma', 'INE044A01036', 460000),
    ('WIPRO.NS', 'Wipro', 'IT', 'INE075A01022', 310000),
    ('MARUTI.NS', 'Maruti Suzuki', 'Auto', 'INE585B01010', 360000),
    ('AXISBANK.NS', 'Axis Bank', 'Banking', 'INE238A01034', 350000),
    ('ADANIENT.NS', 'Adani Enterprises', 'Energy', 'INE423A01024', 340000),
    ('ADANIPORTS.NS', 'Adani Ports', 'Utilities', 'INE742F01042', 330000),
    ('TATAMOTORS.NS', 'Tata Motors', 'Auto', 'INE155A01022', 320000),
    ('ULTRACEMCO.NS', 'UltraTech Cement', 'Metals', 'INE481G01011', 310000),
    ('BAJAJFINSV.NS', 'Bajaj Finserv', 'NBFC', 'INE918I01026', 290000),
    ('ONGC.NS', 'ONGC', 'Energy', 'INE213A01029', 280000),
    ('NTPC.NS', 'NTPC', 'Utilities', 'INE733E01010', 360000),
    ('TITAN.NS', 'Titan Company', 'Consumer', 'INE280A01028', 330000),
    ('POWERGRID.NS', 'Power Grid', 'Utilities', 'INE752E01010', 280000),
    ('M&M.NS', 'Mahindra & Mahindra', 'Auto', 'INE101A01026', 340000),
    ('NESTLEIND.NS', 'Nestle India', 'FMCG', 'INE239A01016', 220000),
    ('COALINDIA.NS', 'Coal India', 'Energy', 'INE522F01014', 240000),
    ('DRREDDY.NS', "Dr. Reddy's Laboratories", 'Pharma', 'INE089A01023', 200000),
    ('TATASTEEL.NS', 'Tata Steel', 'Metals', 'INE081A01012', 185000),
    ('GRASIM.NS', 'Grasim Industries', 'Metals', 'INE047A01021', 175000),
    ('TECHM.NS', 'Tech Mahindra', 'IT', 'INE669C01036', 165000),
    ('HINDALCO.NS', 'Hindalco Industries', 'Metals', 'INE038A01020', 160000),
    ('HEROMOTOCO.NS', 'Hero MotoCorp', 'Auto', 'INE158A01026', 155000),
    ('CIPLA.NS', 'Cipla', 'Pharma', 'INE059A01026', 150000),
    ('BPCL.NS', 'BPCL', 'Energy', 'INE029A01011', 145000),
    ('JSWSTEEL.NS', 'JSW Steel', 'Metals', 'INE019A01038', 190000),
    ('APOLLOHOSP.NS', 'Apollo Hospitals', 'Pharma', 'INE437A01024', 140000),
    ('ASIANPAINT.NS', 'Asian Paints', 'Consumer', 'INE021A01026', 215000),
    ('EICHERMOT.NS', 'Eicher Motors', 'Auto', 'INE066A01021', 130000),
    ('INDUSINDBK.NS', 'IndusInd Bank', 'Banking', 'INE095A01012', 82000),
    ('SHRIRAMFIN.NS', 'Shriram Finance', 'NBFC', 'INE721A01013', 100000),
    ('VEDL.NS', 'Vedanta', 'Metals', 'INE205A01025', 95000),
    ('TATACONSUM.NS', 'Tata Consumer Products', 'FMCG', 'INE192A01025', 90000),
    ('BRITANNIA.NS', 'Britannia Industries', 'FMCG', 'INE216A01030', 115000),
    ('ZOMATO.NS', 'Zomato', 'Consumer', 'INE758T01015', 250000),
    ('PIDILITIND.NS', 'Pidilite Industries', 'Consumer', 'INE318A01026', 130000),
    ('BAJAJ-AUTO.NS', 'Bajaj Auto', 'Auto', 'INE917I01010', 215000),
    ('DIVISLAB.NS', "Divi's Laboratories", 'Pharma', 'INE361B01024', 110000),
    ('HAVELLS.NS', 'Havells India', 'Consumer', 'INE176B01034', 95000),
    ('BEL.NS', 'Bharat Electronics', 'Utilities', 'INE263A01024', 185000),
    ('SIEMENS.NS', 'Siemens India', 'Utilities', 'INE003A01024', 145000),
    ('HAL.NS', 'Hindustan Aeronautics', 'Utilities', 'INE066F01020', 260000),
    ('IRFC.NS', 'Indian Railway Finance Corp', 'NBFC', 'INE053F01010', 190000),
    ('PFC.NS', 'Power Finance Corp', 'NBFC', 'INE134E01011', 155000),
    ('RECLTD.NS', 'REC Limited', 'NBFC', 'INE020B01018', 150000),
    ('NYKAA.NS', 'Nykaa (FSN E-Commerce)', 'Consumer', 'INE388Y01029', 45000),
    ('PAYTM.NS', 'One97 Communications (Paytm)', 'Consumer', 'INE982J01020', 35000),
    ('POLICYBZR.NS', 'PB Fintech (Policybazaar)', 'NBFC', 'INE417T01026', 48000),
    ('NUVAMA.NS', 'Nuvama Wealth', 'NBFC', 'INE672K01018', 22000),
    ('CAMS.NS', 'CAMS', 'NBFC', 'INE596I01012', 18000),
    ('DMART.NS', 'Avenue Supermarts (DMart)', 'Consumer', 'INE192R01011', 240000),
    ('TRENT.NS', 'Trent', 'Consumer', 'INE849A01020', 185000),
    ('PAGEIND.NS', 'Page Industries (Jockey)', 'FMCG', 'INE761H01022', 42000),
    ('MARICO.NS', 'Marico', 'FMCG', 'INE196A01026', 68000),
    ('COLPAL.NS', 'Colgate-Palmolive India', 'FMCG', 'INE259A01022', 55000),
    ('DABUR.NS', 'Dabur India', 'FMCG', 'INE016A01026', 82000),
    ('GODREJCP.NS', 'Godrej Consumer Products', 'FMCG', 'INE102D01028', 75000),
    ('BERGEPAINT.NS', 'Berger Paints', 'Consumer', 'INE463A01038', 65000),
    ('KANSAINER.NS', 'Kansai Nerolac Paints', 'Consumer', 'INE531A01024', 28000),
    ('MUTHOOTFIN.NS', 'Muthoot Finance', 'NBFC', 'INE414G01012', 68000),
    ('CANBK.NS', 'Canara Bank', 'Banking', 'INE476A01014', 55000),
    ('BANKBARODA.NS', 'Bank of Baroda', 'Banking', 'INE028A01039', 55000),
    ('UNIONBANK.NS', 'Union Bank of India', 'Banking', 'INE692A01016', 42000),
    ('PNBHOUSING.NS', 'PNB Housing Finance', 'NBFC', 'INE572E01012', 18000),
    ('IDFCFIRSTB.NS', 'IDFC First Bank', 'Banking', 'INE501W01021', 35000),
    ('AUBANK.NS', 'AU Small Finance Bank', 'Banking', 'INE949L01017', 48000),
    ('BANDHANBNK.NS', 'Bandhan Bank', 'Banking', 'INE545U01014', 30000),
    ('OFSS.NS', 'Oracle Financial Services', 'IT', 'INE881D01027', 95000),
    ('MPHASIS.NS', 'Mphasis', 'IT', 'INE356A01018', 40000),
    ('LTIM.NS', 'LTIMindtree', 'IT', 'INE214T01019', 130000),
    ('PERSISTENT.NS', 'Persistent Systems', 'IT', 'INE262H01021', 75000),
    ('COFORGE.NS', 'Coforge', 'IT', 'INE591G01017', 48000),
    ('LTTS.NS', 'L&T Technology Services', 'IT', 'INE010V01017', 42000),
    ('KPITTECH.NS', 'KPIT Technologies', 'IT', 'INE058I01014', 38000),
    ('TATAPOWER.NS', 'Tata Power', 'Utilities', 'INE245A01021', 115000),
    ('TORNTPOWER.NS', 'Torrent Power', 'Utilities', 'INE813H01021', 55000),
    ('CESC.NS', 'CESC', 'Utilities', 'INE486A01013', 18000),
    ('ADANIGREEN.NS', 'Adani Green Energy', 'Utilities', 'INE364U01010', 185000),
    ('ADANIPOWER.NS', 'Adani Power', 'Utilities', 'INE814H01011', 160000),
    ('SAIL.NS', 'Steel Authority of India', 'Metals', 'INE114A01011', 38000),
    ('NATIONALUM.NS', 'National Aluminium', 'Metals', 'INE139A01034', 28000),
    ('HINDCOPPER.NS', 'Hindustan Copper', 'Metals', 'INE531E01026', 25000),
    ('NMDC.NS', 'NMDC', 'Metals', 'INE584A01023', 65000),
    ('APOLLOTYRE.NS', 'Apollo Tyres', 'Auto', 'INE713A01011', 30000),
    ('MRF.NS', 'MRF', 'Auto', 'INE883A01011', 48000),
    ('MOTHERSON.NS', 'Samvardhana Motherson', 'Auto', 'INE775A01035', 68000),
    ('BOSCHLTD.NS', 'Bosch India', 'Auto', 'INE323A01026', 75000),
    ('ZYDUSLIFE.NS', 'Zydus Lifesciences', 'Pharma', 'INE010B01027', 75000),
    ('TORNTPHARM.NS', 'Torrent Pharmaceuticals', 'Pharma', 'INE685A01028', 95000),
    ('LUPIN.NS', 'Lupin', 'Pharma', 'INE326A01037', 68000),
    ('ALKEM.NS', 'Alkem Laboratories', 'Pharma', 'INE540L01014', 48000),
    ('OBEROIRLTY.NS', 'Oberoi Realty', 'Real Estate', 'INE093I01010', 45000),
    ('DLF.NS', 'DLF', 'Real Estate', 'INE271C01023', 180000),
    ('PRESTIGE.NS', 'Prestige Estates', 'Real Estate', 'INE811K01011', 55000),
    ('GODREJPROP.NS', 'Godrej Properties', 'Real Estate', 'INE484J01027', 62000),
    ('BRIGADE.NS', 'Brigade Enterprises', 'Real Estate', 'INE791I01019', 22000),
]


def generate_companies_synthetic(output_dir: Path) -> None:
    rows = []
    for ticker, name, sector, isin, mcap in NIFTY100_BASE:
        rows.append({
            'ticker': ticker, 'name': name, 'sector': sector,
            'isin': isin, 'market_cap_cr': float(mcap),
            'exchange_listing': 'NSE',
        })
    df = pd.DataFrame(rows)
    path = output_dir / 'companies.parquet'
    pq.write_table(pa.Table.from_pandas(df, preserve_index=False), path)
    print(f"  ✓ companies.parquet — {len(df)} companies (synthetic)")


def generate_companies_live(output_dir: Path) -> None:
    try:
        import yfinance as yf
    except ImportError:
        print("  ⚠ yfinance not installed — run: pip install yfinance")
        generate_companies_synthetic(output_dir)
        return

    rows = []
    for ticker, name, sector, isin, base_mcap in NIFTY100_BASE:
        try:
            info = yf.Ticker(ticker).fast_info
            mcap_raw = getattr(info, 'market_cap', None)
            mcap = float(mcap_raw) / 1e7 if mcap_raw else float(base_mcap)  # convert to crore
        except Exception as e:
            print(f"    {ticker}: {e}, using base")
            mcap = float(base_mcap)
        rows.append({'ticker': ticker, 'name': name, 'sector': sector,
                     'isin': isin, 'market_cap_cr': mcap, 'exchange_listing': 'NSE'})
        time.sleep(0.5)

    df = pd.DataFrame(rows)
    path = output_dir / 'companies.parquet'
    pq.write_table(pa.Table.from_pandas(df, preserve_index=False), path)
    print(f"  ✓ companies.parquet — {len(df)} companies (live)")


if __name__ == '__main__':
    out = Path(__file__).parent.parent / 'public' / 'data'
    out.mkdir(parents=True, exist_ok=True)
    generate_companies_synthetic(out)
