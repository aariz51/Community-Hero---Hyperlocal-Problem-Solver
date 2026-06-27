import { useEffect, useState } from 'react'
import { subscribeReports } from '../lib/reports'

export function useReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const unsub = subscribeReports((r) => { setReports(r); setLoading(false) })
    return unsub
  }, [])
  return { reports, loading }
}
