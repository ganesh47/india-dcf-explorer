import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import DCFBuilder from './pages/DCFBuilder'
import WACCLab from './pages/WACCLab'
import FCFWaterfall from './pages/FCFWaterfall'
import SensitivityMatrix from './pages/SensitivityMatrix'
import RateTracker from './pages/RateTracker'
import Screener from './pages/Screener'

function Wrap({ children }: { children: React.ReactNode }) {
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Wrap><Home /></Wrap>} />
        <Route path="/dcf-builder" element={<Wrap><DCFBuilder /></Wrap>} />
        <Route path="/dcf-builder/:ticker" element={<Wrap><DCFBuilder /></Wrap>} />
        <Route path="/wacc-lab" element={<Wrap><WACCLab /></Wrap>} />
        <Route path="/fcf-waterfall" element={<Wrap><FCFWaterfall /></Wrap>} />
        <Route path="/sensitivity" element={<Wrap><SensitivityMatrix /></Wrap>} />
        <Route path="/rates" element={<Wrap><RateTracker /></Wrap>} />
        <Route path="/screener" element={<Wrap><Screener /></Wrap>} />
      </Routes>
    </HashRouter>
  )
}
