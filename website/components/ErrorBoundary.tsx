"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-surface border border-border rounded-2xl p-8 flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 border border-danger rounded-2xl flex items-center justify-center">
            <span className="text-danger text-sm font-mono">!</span>
          </div>
          <p className="text-sm text-dim">
            {this.props.fallbackLabel ?? "Something went wrong"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-6 py-4 text-sm text-primary border border-border rounded-2xl hover:bg-elevated transition-all duration-150"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
