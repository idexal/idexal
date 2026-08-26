import React, { Component, ErrorInfo, ReactNode } from 'react'
import {
  FaExclamationTriangle, FaSync, FaCopy, FaCode
} from '../Icon'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    console.error('ErrorBoundary caught:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleCopyError = async () => {
    const errorText = `Error: ${this.state.error?.message}\n\n${this.state.errorInfo?.componentStack}`
    await navigator.clipboard.writeText(errorText)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex items-center justify-center min-h-[200px] p-6">
          <div className="max-w-md w-full bg-ide-surface border border-ide-border rounded-lg p-6 text-center">
            <FaExclamationTriangle className="w-12 h-12 text-ide-warning mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-ide-text mb-2">Something went wrong</h3>
            <p className="text-sm text-ide-text-muted mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>

            {/* Error Details */}
            <details className="mb-4 text-left">
              <summary className="text-xs text-ide-text-muted cursor-pointer hover:text-ide-text">
                Show error details
              </summary>
              <pre className="mt-2 p-3 bg-ide-bg rounded text-xs text-ide-error overflow-auto max-h-32">
                {this.state.error?.stack}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>

            {/* Actions */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-ide-accent text-white rounded-lg hover:bg-ide-accent-hover transition-colors"
              >
                <FaSync className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={this.handleCopyError}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-ide-bg border border-ide-border text-ide-text rounded-lg hover:border-ide-accent transition-colors"
              >
                <FaCopy className="w-4 h-4" />
                Copy Error
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
