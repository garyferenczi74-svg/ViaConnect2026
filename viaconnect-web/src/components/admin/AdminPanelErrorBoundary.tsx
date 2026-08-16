"use client";

/**
 * Prompt 219I: per-panel error boundary for admin Command Center and sibling
 * admin surfaces. A failing panel never takes down the rest of the page.
 * UI shows panel name, plain message, error ID, Retry only (no stacks, tables, env).
 */

import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { safeLog } from "@/lib/utils/safe-log";

interface Props {
  panelName: string;
  children: React.ReactNode;
  /** Compact inline card for dense grids */
  compact?: boolean;
}

interface State {
  hasError: boolean;
  errorId: string | null;
  message: string;
}

export class AdminPanelErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, errorId: null, message: "failed to load" };

  static getDerivedStateFromError(error: Error): State {
    const digest =
      typeof (error as Error & { digest?: string }).digest === "string"
        ? (error as Error & { digest?: string }).digest!
        : null;
    return {
      hasError: true,
      errorId: digest,
      message: "failed to load",
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    safeLog.error("admin.panel.boundary", "panel render failed", {
      panel: this.props.panelName,
      name: error.name,
      message: error.message,
      digest: (error as Error & { digest?: string }).digest,
      componentStack: info.componentStack?.slice(0, 400),
    });
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, errorId: null, message: "failed to load" });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { panelName, compact } = this.props;
    return (
      <div
        role="alert"
        className={
          compact
            ? "rounded-lg border border-white/10 bg-white/5 p-3 text-left"
            : "rounded-xl border border-white/10 bg-[#1E3054]/50 p-4 md:p-5 text-left"
        }
      >
        <div className="flex items-start gap-2">
          <AlertCircle
            className="w-4 h-4 text-[#B75E18] flex-shrink-0 mt-0.5"
            strokeWidth={1.5}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white/90 truncate">{panelName}</p>
            <p className="text-xs text-white/50 mt-0.5">{this.state.message}</p>
            {this.state.errorId && (
              <p className="text-[10px] text-white/30 font-mono mt-1">
                Error ID: {this.state.errorId}
              </p>
            )}
            <button
              type="button"
              onClick={this.handleRetry}
              className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border border-white/15 text-white/70 hover:bg-white/10"
            >
              <RefreshCw className="w-3 h-3" strokeWidth={1.5} />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }
}

/** Functional wrapper for use in server/client trees. */
export function AdminPanel({
  name,
  children,
  compact,
}: {
  name: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <AdminPanelErrorBoundary panelName={name} compact={compact}>
      {children}
    </AdminPanelErrorBoundary>
  );
}
