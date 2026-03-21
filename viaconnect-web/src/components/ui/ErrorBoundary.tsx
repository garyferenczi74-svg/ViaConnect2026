"use client";

import { Component } from "react";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "./Button";

// ─── React Error Boundary (class component required) ─────────────────────────

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose/10 border border-rose/20 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-rose" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1">
            Something went wrong
          </h3>
          <p className="text-sm text-gray-500 max-w-xs mb-5">
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ─── Network Error (full-page retry) ─────────────────────────────────────────

export function NetworkError({
  onRetry,
  message = "Unable to connect. Please check your internet connection.",
}: {
  onRetry: () => void;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-5">
        <WifiOff className="w-7 h-7 text-gray-500" />
      </div>
      <h2 className="text-lg font-semibold text-white mb-2">
        Connection Lost
      </h2>
      <p className="text-sm text-gray-500 max-w-sm mb-6">{message}</p>
      <Button variant="primary" size="sm" onClick={onRetry}>
        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
        Try Again
      </Button>
    </div>
  );
}
