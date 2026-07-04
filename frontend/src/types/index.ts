export interface PredictionResponse {
  label: 'cat' | 'dog'
  confidence: number
  confidence_pct: number
  probabilities: {
    cat: number
    dog: number
  }
  inference_ms: number
  result_id: string
  gradcam_b64?: string
}

export type PredictionState =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'scanning' }
  | { status: 'done'; result: PredictionResponse; imageUrl: string }
  | { status: 'error'; message: string }

export interface HistoryItem {
  id: string
  label: 'cat' | 'dog'
  confidence: number
  confidence_pct: number
  probabilities: {
    cat: number
    dog: number
  }
  inference_ms: number
  gradcam_b64?: string
  created_at: string
  has_feedback: boolean
  feedback_correct?: boolean
}

export interface HistoryResponse {
  items: HistoryItem[]
  total: number
  page: number
  pages: number
}

export interface StatsResponse {
  total_predictions: number
  accuracy_pct: number | null
  avg_confidence: number
  predictions_today: number
  label_distribution: {
    cat: number
    dog: number
  }
  avg_inference_ms: number
}

export interface ShareResponse {
  label: 'cat' | 'dog'
  confidence_pct: number
  gradcam_b64?: string
  created_at: string
}
