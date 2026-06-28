export interface Company {
  ticker: string
  name: string
  sector: string
  isin: string
  market_cap_cr: number
  exchange_listing: string
}

export interface Financials {
  ticker: string
  year: number
  revenue_cr: number
  ebit_cr: number
  ebitda_cr: number
  da_cr: number
  capex_cr: number
  delta_nwc_cr: number
  pat_cr: number
  total_debt_cr: number
  total_equity_cr: number
  roe: number
  roce: number
  fcf_cr: number
  data_quality: 'live' | 'estimated' | 'synthetic'
}

export interface SectorWACC {
  sector: string
  beta: number
  ke: number
  kd: number
  equity_weight: number
  debt_weight: number
  wacc: number
  median_ev_ebitda: number
  avg_terminal_g: number
}

export interface Rate {
  date: string
  gsec_10y: number
  repo_rate: number
  cpi_inflation: number
}

export interface BankingEntity {
  ticker: string
  name: string
  entity_type: 'bank' | 'nbfc'
  nim: number
  cost_of_funds: number
  yield_on_assets: number
  casa_ratio: number
  roe: number
  pb_ratio: number
  coe: number
}
