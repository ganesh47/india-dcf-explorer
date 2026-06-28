import { createContext, useContext, useEffect, useRef, useState } from 'react'
import * as duckdb from '@duckdb/duckdb-wasm'

interface DuckDBContextValue {
  db: duckdb.AsyncDuckDB | null
  loading: boolean
  error: string | null
  registerParquet: (name: string) => Promise<void>
}

const DuckDBContext = createContext<DuckDBContextValue | null>(null)

const registered = new Set<string>()

export function DuckDBProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<duckdb.AsyncDuckDB | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const dbRef = useRef<duckdb.AsyncDuckDB | null>(null)

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles()
        const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES)
        const worker = await duckdb.createWorker(bundle.mainWorker!)
        const logger = new duckdb.ConsoleLogger()
        const instance = new duckdb.AsyncDuckDB(logger, worker)
        await instance.instantiate(bundle.mainModule, bundle.pthreadWorker)
        if (!cancelled) {
          dbRef.current = instance
          setDb(instance)
          setLoading(false)
        }
      } catch (e) {
        if (!cancelled) {
          setError(String(e))
          setLoading(false)
        }
      }
    }
    init()
    return () => { cancelled = true }
  }, [])

  const registerParquet = async (name: string) => {
    const instance = dbRef.current
    if (!instance || registered.has(name)) return
    const url = `${import.meta.env.BASE_URL}data/${name}`
    await instance.registerFileURL(name, url, duckdb.DuckDBDataProtocol.HTTP, false)
    registered.add(name)
  }

  return (
    <DuckDBContext.Provider value={{ db, loading, error, registerParquet }}>
      {children}
    </DuckDBContext.Provider>
  )
}

export function useDuckDBContext() {
  const ctx = useContext(DuckDBContext)
  if (!ctx) throw new Error('useDuckDBContext must be used inside DuckDBProvider')
  return ctx
}
