import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import type { HistoryItem, HistoryResponse } from '../types'

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPage = useCallback(async (targetPage: number) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await axios.get<HistoryResponse>(
        `${API_BASE}/api/v1/history?page=${targetPage}&limit=10`
      )
      setHistory(data.items)
      setTotal(data.total)
      setPage(data.page)
      setPages(data.pages)
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Failed to load prediction history.')
    } finally {
      setLoading(false)
    }
  }, [])

  const refresh = useCallback(() => {
    fetchPage(1)
  }, [fetchPage])

  useEffect(() => {
    fetchPage(1)
  }, [fetchPage])

  return { history, total, page, pages, loading, error, fetchPage, refresh }
}
