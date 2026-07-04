import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-red-500/10 border border-red-500/20 mb-6">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-3xl font-bold mb-3 font-sans">System Fault Detected</h1>
          <p className="text-white/40 text-sm max-w-md mb-6 leading-relaxed">
            NeuralPaw encountered an unexpected UI crash. This has been logged and the system sandbox has been secured.
          </p>
          {this.state.error && (
            <pre className="glass p-4 rounded-xl text-left text-xs font-mono text-red-400 max-w-lg overflow-auto mb-6">
              {this.state.error.toString()}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            className="btn-primary text-sm"
          >
            Reboot Interface
          </button>
        </div>
      )
    }

    return this.children
  }
}
