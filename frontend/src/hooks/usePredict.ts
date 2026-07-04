import { useState, useCallback } from 'react'
import axios from 'axios'
import type { PredictionState, PredictionResponse } from '../types'

// In dev, Vite proxies /api → http://localhost:8000.
// In production, set VITE_API_URL to your deployed backend.
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

const VALID_MIME_TYPES = new Set(['image/jpeg', 'image/png'])
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export function usePredict() {
  const [state, setState] = useState<PredictionState>({ status: 'idle' })

  const predict = useCallback(async (file: File) => {
    // ── Client-side pre-flight validation ──────────────────────────────────
    if (!VALID_MIME_TYPES.has(file.type)) {
      setState({
        status: 'error',
        message: 'Only JPEG and PNG images are supported.',
      })
      return
    }
    if (file.size > MAX_BYTES) {
      setState({
        status: 'error',
        message: 'File exceeds the 10 MB limit. Please choose a smaller image.',
      })
      return
    }

    // Create object URL for preview before the request finishes
    const imageUrl = URL.createObjectURL(file)

    setState({ status: 'scanning' })

    try {
      const formData = new FormData()
      formData.append('file', file)

      const { data } = await axios.post<PredictionResponse>(
        `${API_BASE}/predict`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 30_000,
        }
      )

      setState({ status: 'done', result: data, imageUrl })
    } catch (err: unknown) {
      // Revoke the object URL on failure to avoid memory leak
      URL.revokeObjectURL(imageUrl)

      let message = 'Prediction failed. Please try again.'

      if (axios.isAxiosError(err)) {
        const status = err.response?.status
        const detail = err.response?.data?.detail as string | undefined

        if (status === 413) {
          message = 'File too large. The server limit is 10 MB.'
        } else if (status === 429) {
          message = 'Rate limit reached. Please wait a minute before trying again.'
        } else if (status === 400) {
          message = detail ?? 'Invalid image. Please upload a valid JPEG or PNG.'
        } else if (status === 500) {
          message = 'Server error. Please try again later.'
        } else if (err.code === 'ECONNABORTED') {
          message = 'Request timed out. Check that the backend is running.'
        } else if (err.code === 'ERR_NETWORK') {
          message = 'Cannot reach the server. Is the backend running on port 8000?'
        }
      }

      setState({ status: 'error', message })
    }
  }, [])

  const reset = useCallback(() => {
    // Revoke object URL to free memory before resetting
    if (state.status === 'done') {
      URL.revokeObjectURL(state.imageUrl)
    }
    setState({ status: 'idle' })
  }, [state])

  return { state, predict, reset }
}
