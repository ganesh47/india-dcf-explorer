import { useState, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import SliderControl from '../components/SliderControl'
import FormulaBox from '../components/FormulaBox'
import ELI5Box from '../components/ELI5Box'

const SECTORS = [
  { sector: 'FMCG / Staples', beta: 0.50, equityW: 0.85, debtW: 0.15, kd: 7.0 },
  { sector: 'Pharma', beta: 0.70, equityW: 0.80, debtW: 0.20, kd: 7.5 },
  { sector: 'Utilities / Infra', beta: 0.80, equityW: 0.55, debtW: 0.45, kd: 8.0 },
  { sector: 'IT / Technology', beta: 1.00, equityW: 0.90, debtW: 0.10, kd: 6.5 },
  { sector: 'Auto / EV', beta: 1.05, equityW: 0.70, debtW: 0.30, kd: 7.8 },
  { sector: 'NBFC / Finance', beta: 1.10, equityW: 0.60, debtW: 0.40, kd: 9.0 },
  { sector: 'Real Estate', beta: 1.20, equityW: 0.45, debtW: 0.55, kd: 11.0 },
  { sector: 'Metals / Mining', beta: 1.30, equityW: 0.65, debtW: 0.35, kd: 9.5 },
  { sector: 'Telecom', beta: 0.90, equityW: 0.40, debtW: 0.60, kd: 8.5 },
  { sector: 'Consumer Disc.', beta: 0.95, equityW: 0.75, debtW: 0.25, kd: 7.5 },
  { sector: 'Energy / Oil & Gas', beta: 0.85, equityW: 0.55, debtW: 0.45, kd: 8.0 },
  { sector: 'Banking', beta: 1.00, equityW: 1.00, debtW: 0.00, kd: 0 },
]

const TAX = 0.25168
const CS_OPTIONS = [
  { label: '20/80 E/D', ew: 0.20, dw: 0.80 },
  { label: '40/60', ew: 0.40, dw: 0.60 },
  { label: '50/50', ew: 0.50, dw: 0.50 },
  { label: '60/40', ew: 0.60, dw: 0.40 },
  { label: '80/20', ew: 0.80, dw: 0.20 },
]

export default function WACCLab() {
  const [rf, setRf] = useState(6.84)
  const [erp, setErp] = useState(7.08)
  const [selectedSector, setSelectedSector] = useState('IT / Technology')

  const computed = useMemo(() =>
    SECTORS.map((s) => {
      const ke = rf + s.beta * erp
      const wacc = s.equityW * ke + s.debtW * s.kd * (1 - TAX)
      return { ...s, ke, wacc }
    }),
  [rf, erp])

  const selected = computed.find((s) => s.sector === selectedSector)!

  const scatterOption = {
    backgroundColor: '#fff',
    tooltip: {
      formatter: (p: { data: [number, number, string] }) =>
        `<strong>${p.data[2]}</strong><br/>β = ${p.data[0]}<br/>Ke = ${p.data[1].toFixed(2)}%`,
    },
    xAxis: { name: 'Beta (β)', min: 0.3, max: 1.5, nameLocation: 'middle', nameGap: 30 },
    yAxis: { name: 'Cost of Equity Ke (%)', nameLocation: 'middle', nameGap: 50,
      axisLabel: { formatter: '{value}%' } },
    grid: { left: 70, right: 20, top: 30, bottom: 50 },
    series: [{
      type: 'scatter',
      symbolSize: 14,
      data: computed.map((s) => [s.beta, +s.ke.toFixed(2), s.sector]),
      label: {
        show: true,
        formatter: (p: { data: [number, number, string] }) => p.data[2],
        position: 'right',
        fontSize: 9,
        color: '#475569',
      },
      itemStyle: {
        color: (p: { data: [number, number, string] }) =>
          p.data[2] === selectedSector ? '#1d4ed8' : '#94a3b8',
      },
    }],
  }

  const breakdownOption = {
    backgroundColor: '#fff',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['Equity component', 'Debt component (post-tax)'], bottom: 0 },
    xAxis: { type: 'category', data: [selected.sector] },
    yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
    grid: { left: 60, right: 20, top: 20, bottom: 60 },
    series: [
      { name: 'Equity component', type: 'bar', stack: 'wacc',
        data: [+(selected.equityW * selected.ke).toFixed(2)], itemStyle: { color: '#1d4ed8' } },
      { name: 'Debt component (post-tax)', type: 'bar', stack: 'wacc',
        data: [+(selected.debtW * selected.kd * (1 - TAX)).toFixed(2)], itemStyle: { color: '#10b981' } },
    ],
  }

  const heatData = SECTORS.flatMap((s, si) =>
    CS_OPTIONS.map((cs, ci) => {
      const ke = rf + s.beta * erp
      const w = cs.ew * ke + cs.dw * s.kd * (1 - TAX)
      return [ci, SECTORS.length - 1 - si, +w.toFixed(2)]
    }),
  )

  const heatOption = {
    backgroundColor: '#fff',
    tooltip: {
      formatter: (p: { data: number[] }) => {
        const s = SECTORS[SECTORS.length - 1 - p.data[1]]
        const cs = CS_OPTIONS[p.data[0]]
        return `${s.sector} · ${cs.label}<br/>WACC = ${p.data[2]}%`
      },
    },
    xAxis: { type: 'category', data: CS_OPTIONS.map((c) => c.label),
      name: 'Capital Structure', nameLocation: 'middle', nameGap: 32, axisLabel: { fontSize: 9 } },
    yAxis: { type: 'category',
      data: [...SECTORS].reverse().map((s) => s.sector.replace(' / ', '/').substring(0, 14)),
      axisLabel: { fontSize: 9 } },
    visualMap: { min: 6, max: 16, inRange: { color: ['#10b981', '#fbbf24', '#ef4444'] },
      orient: 'horizontal', bottom: 0, left: 'center', text: ['High WACC', 'Low WACC'], textStyle: { fontSize: 9 } },
    series: [{ type: 'heatmap', data: heatData,
      label: { show: true, fontSize: 8, formatter: (p: { data: number[] }) => `${p.data[2]}%` } }],
    grid: { left: 80, right: 20, top: 10, bottom: 80 },
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">WACC Lab</h1>
      <p className="text-sm text-slate-500">Drag the sliders — all sector costs of capital recalculate instantly.</p>

      <ELI5Box>
        <p>When a company needs money to grow, it raises it from two sources: shareholders (equity) and lenders (debt). Each has a cost — lenders charge interest; shareholders expect returns. WACC (Weighted Average Cost of Capital) blends these two costs based on how much of each the company uses.</p>
        <p>Think of it as the company's minimum pass mark. If a new project earns less than the WACC, the company is destroying value — even if the project is "profitable" on paper. Move the risk-free rate (what the government pays to borrow money) and equity risk premium (extra return investors demand for taking on Indian market risk) and watch how every sector's hurdle rate shifts.</p>
        <p>Notice how Real Estate and Metals have much higher WACCs than FMCG — their businesses are riskier, so investors demand more return, making future cash flows worth less today.</p>
      </ELI5Box>

      <FormulaBox
        formula="Ke = Rf + β × ERP    |    WACC = (E/V)×Ke + (D/V)×Kd×(1−t)"
        caption="Current anchors: Rf = 6.84% (G-Sec 10Y, Jun 2026) · ERP = 7.08% (Damodaran India 2026)"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
        <SliderControl label="Risk-Free Rate (Rf)" value={rf} min={4} max={9} step={0.01}
          format={(v) => `${v.toFixed(2)}%`} onChange={setRf} description="10-year G-Sec yield" />
        <SliderControl label="Equity Risk Premium (ERP)" value={erp} min={4} max={12} step={0.01}
          format={(v) => `${v.toFixed(2)}%`} onChange={setErp} description="Damodaran total ERP for India" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-600 mb-1">Sector Cost of Equity — beta vs Ke</h2>
          <p className="text-xs text-slate-400 mb-3">Click a dot to see WACC breakdown</p>
          <ReactECharts
            option={scatterOption}
            style={{ height: 320 }}
            onEvents={{ click: (p: { data: [number, number, string] }) => setSelectedSector(p.data[2]) }}
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-600 mb-3">WACC Breakdown — {selectedSector}</h2>
            <ReactECharts option={breakdownOption} style={{ height: 180 }} />
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div><div className="font-bold text-blue-700">{selected.ke.toFixed(2)}%</div><div className="text-slate-500">Ke</div></div>
              <div><div className="font-bold text-emerald-700">{(selected.kd * (1 - TAX)).toFixed(2)}%</div><div className="text-slate-500">Kd (post-tax)</div></div>
              <div><div className="font-bold text-slate-800">{selected.wacc.toFixed(2)}%</div><div className="text-slate-500">WACC</div></div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-600 mb-3">Sector × Capital Structure WACC Heatmap</h2>
            <ReactECharts option={heatOption} style={{ height: 260 }} />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100">
              {['Sector', 'β', 'Ke', 'Kd', 'E/V', 'D/V', 'WACC'].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600 border border-slate-200">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {computed.map((s) => (
              <tr key={s.sector}
                className={`cursor-pointer hover:bg-blue-50 ${s.sector === selectedSector ? 'bg-blue-50' : ''}`}
                onClick={() => setSelectedSector(s.sector)}
              >
                <td className="px-3 py-1.5 border border-slate-200 font-medium">{s.sector}</td>
                <td className="px-3 py-1.5 border border-slate-200">{s.beta.toFixed(2)}</td>
                <td className="px-3 py-1.5 border border-slate-200 text-blue-700 font-medium">{s.ke.toFixed(2)}%</td>
                <td className="px-3 py-1.5 border border-slate-200">{s.kd.toFixed(1)}%</td>
                <td className="px-3 py-1.5 border border-slate-200">{(s.equityW * 100).toFixed(0)}%</td>
                <td className="px-3 py-1.5 border border-slate-200">{(s.debtW * 100).toFixed(0)}%</td>
                <td className="px-3 py-1.5 border border-slate-200 font-bold text-slate-800">{s.wacc.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
