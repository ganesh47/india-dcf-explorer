import { useCallback, useState } from 'react'
import { useDuckDBContext } from './DuckDBProvider'

export function useDuckDB() {
  const { db, loading: dbLoading, error: dbError, registerParquet } = useDuckDBContext()
  const [queryLoading, setQueryLoading] = useState(false)
  const [queryError, setQueryError] = useState<string | null>(null)

  const query = useCallback(
    async <T = Record<string, unknown>>(
      sql: string,
      parquets: string[] = [],
    ): Promise<T[]> => {
      if (!db) throw new Error('DuckDB not ready')
      setQueryLoading(true)
      setQueryError(null)
      try {
        await Promise.all(parquets.map(registerParquet))
        const conn = await db.connect()
        try {
          const result = await conn.query(sql)
          return result.toArray().map((row) => row.toJSON()) as T[]
        } finally {
          await conn.close()
        }
      } catch (e) {
        const msg = String(e)
        setQueryError(msg)
        throw new Error(msg)
      } finally {
        setQueryLoading(false)
      }
    },
    [db, registerParquet],
  )

  return {
    query,
    loading: dbLoading || queryLoading,
    error: dbError ?? queryError,
    ready: !dbLoading && !dbError && db !== null,
  }
}
