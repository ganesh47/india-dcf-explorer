import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/dcf-builder', label: 'DCF Builder' },
  { to: '/wacc-lab', label: 'WACC Lab' },
  { to: '/fcf-waterfall', label: 'FCF Waterfall' },
  { to: '/sensitivity', label: 'Sensitivity' },
  { to: '/rates', label: 'Rate Tracker' },
  { to: '/screener', label: 'Screener' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-6 h-14">
          <a href="/india-dcf-explorer/" className="font-bold text-blue-700 text-lg tracking-tight shrink-0">
            India DCF
          </a>
          <nav className="flex gap-1 overflow-x-auto text-sm">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto shrink-0">
            <a
              href="https://ganesh47.github.io/blog/discounted-cash-flows-the-math-part-1/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-blue-600"
            >
              Read the series →
            </a>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
      <footer className="border-t border-slate-200 mt-12 py-6 text-center text-xs text-slate-400">
        Data: NSE/BSE filings, Damodaran (NYU Stern), RBI DBIE. For educational use.{' '}
        <a
          href="https://ganesh47.github.io"
          className="underline hover:text-slate-600"
          target="_blank"
          rel="noopener noreferrer"
        >
          ganesh47.github.io
        </a>
      </footer>
    </div>
  )
}
