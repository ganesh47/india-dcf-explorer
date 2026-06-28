import { useState } from 'react'
import ReactECharts from 'echarts-for-react'
import SliderControl from '../components/SliderControl'
import FormulaBox from '../components/FormulaBox'

const WACC_VALUES = [0.08, 0.085, 0.09, 0.095, 0.10]
const G_VALUES = [0.02, 0.025, 0.03, 0.035, 0.04]
const YEARS = 10

function pvTV(fcf10: number, wacc: number, g: number): number {
  if (wacc <= g) return Infinity
  const tv = (fcf10 * (1 + g)) / (wacc - g)
  return tv / Math.pow(1 + wacc, YEARS)
}

export default function SensitivityMatrix() {
  const [fcf10, setFcf10] = useState(100)

  const heatData = WACC_VALUES.flatMap((w, wi) =>
    G_VALUES.map((g, gi) => {
      const val = pvTV(fcf10, w, g)
      return [gi, WACC_VALUES.length - 1 - wi, Math.round(val)]
    }),
  )

  const min = Math.min(...heatData.map((d) => d[2]))
  const max = Math.max(...heatData.map((d) => d[2]))

  const heatOption = {
    backgroundColor: '#fff',
    tooltip: {
      formatter: (params: { data: number[] }) => {
        const [gi, wRev] = params.data
        const g = G_VALUES[gi]
        const w = WACC_VALUES[WACC_VALUES.length - 1 - wRev]
        const val = pvTV(fcf10, w, g)
        return `WACC ${(w * 100).toFixed(1)}% × g ${(g * 100).toFixed(1)}%<br/>PV(TV) = ₹${Math.round(val).toLocaleString('en-IN')} cr`
      },
    },
    grid: { left: 70, right: 80, top: 20, bottom: 60 },
    xAxis: {
      type: 'category',
      data: G_VALUES.map((g) => `g=${(g * 100).toFixed(1)}%`),
      name: 'Terminal Growth Rate',
      nameLocation: 'middle',
      nameGap: 40,
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: 'category',
      data: [...WACC_VALUES].reverse().map((w) => `${(w * 100).toFixed(1)}%`),
      name: 'WACC',
      nameLocation: 'middle',
      nameGap: 50,
      axisLabel: { fontSize: 11 },
    },
    visualMap: {
      min, max,
      calculable: true,
      orient: 'vertical',
      right: 0,
      top: 20,
      inRange: { color: ['#ef4444', '#fbbf24', '#10b981'] },
      text: ['High', 'Low'],
      textStyle: { fontSize: 10 },
    },
    series: [{
      type: 'heatmap',
      data: heatData,
      label: {
        show: true,
        formatter: (p: { data: number[] }) => `₹${p.data[2].toLocaleString('en-IN')}`,
        fontSize: 11,
        fontWeight: 'bold',
        color: '#1e293b',
      },
    }],
  }

  const lineOption = {
    backgroundColor: '#fff',
    tooltip: { trigger: 'axis' },
    legend: { data: G_VALUES.map((g) => `g=${(g * 100).toFixed(1)}%`), bottom: 0 },
    grid: { left: 70, right: 20, top: 20, bottom: 60 },
    xAxis: {
      type: 'category',
      data: WACC_VALUES.map((w) => `${(w * 100).toFixed(1)}%`),
      name: 'WACC',
      nameLocation: 'middle',
      nameGap: 36,
    },
    yAxis: {
      type: 'value',
      name: 'PV(TV) ₹ cr',
      nameLocation: 'middle',
      nameGap: 56,
      axisLabel: { formatter: (v: number) => `₹${v.toLocaleString('en-IN')}` },
    },
    series: G_VALUES.map((g) => ({
      name: `g=${(g * 100).toFixed(1)}%`,
      type: 'line',
      smooth: true,
      data: WACC_VALUES.map((w) => Math.round(pvTV(fcf10, w, g))),
    })),
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Sensitivity Matrix</h1>
        <p className="text-sm text-slate-500 mt-1">
          How terminal value changes across WACC and perpetual growth rate combinations. Every cell is present value of terminal value only.
        </p>
      </div>

      <FormulaBox
        formula="PV(TV) = FCF₁₀ × (1+g) / (WACC−g) / (1+WACC)¹⁰"
        caption="Terminal value dominates DCF — typically 60–80% of total enterprise value."
      />

      <div className="max-w-xs">
        <SliderControl
          label="Year 10 Free Cash Flow"
          value={fcf10}
          min={10}
          max={1000}
          step={10}
          format={(v) => `₹${v.toLocaleString('en-IN')} cr`}
          onChange={setFcf10}
          description="Drag to see how PV(TV) scales with FCF magnitude"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">PV of Terminal Value — WACC × Growth Grid (₹ crore)</h2>
          <ReactECharts option={heatOption} style={{ height: 320 }} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">PV(TV) vs WACC — one line per growth rate</h2>
          <ReactECharts option={lineOption} style={{ height: 320 }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <strong className="text-red-800">Most pessimistic</strong>
          <div className="text-red-700 text-lg font-bold mt-1">
            ₹{Math.round(pvTV(fcf10, 0.10, 0.02)).toLocaleString('en-IN')} cr
          </div>
          <div className="text-red-600 text-xs">WACC 10%, g 2%</div>
        </div>
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
          <strong className="text-emerald-800">Most optimistic</strong>
          <div className="text-emerald-700 text-lg font-bold mt-1">
            ₹{Math.round(pvTV(fcf10, 0.08, 0.04)).toLocaleString('en-IN')} cr
          </div>
          <div className="text-emerald-600 text-xs">WACC 8%, g 4%</div>
        </div>
      </div>

      <div className="rounded-lg bg-amber-50 border border-amber-200 px-5 py-4 text-sm text-amber-900">
        <strong>The range is 2.5×</strong> between the most pessimistic and optimistic combinations — with identical FCF projections. This is why a point-estimate DCF is almost always wrong. The honest way to present a DCF is as this range, with assumptions stated explicitly.
        {' '}<a href="https://ganesh47.github.io/blog/discounted-cash-flows-the-math-part-1/#sensitivity-analysis" target="_blank" rel="noopener noreferrer" className="underline">Read more in Part 1 →</a>
      </div>
    </div>
  )
}
