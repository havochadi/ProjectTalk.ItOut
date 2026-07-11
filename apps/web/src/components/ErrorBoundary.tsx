import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  compact?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('UI runtime error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    const {
      children,
      title = 'Something went wrong',
      description = 'A UI error occurred. You can retry without reloading the whole app.',
      compact = false,
    } = this.props;

    if (!this.state.hasError) {
      return children;
    }

    if (compact) {
      return (
        <div className="flex h-full min-h-[240px] items-center justify-center rounded-3xl border border-border bg-surface p-6 text-center">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-text">{title}</p>
            <p className="text-sm text-muted">{description}</p>
            <button
              type="button"
              onClick={this.handleReset}
              className="rounded-full bg-beige1 px-4 py-2 text-sm font-semibold text-black shadow-soft transition hover:brightness-105"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-8 text-center shadow-soft">
          <h2 className="text-xl font-semibold text-text">{title}</h2>
          <p className="mt-2 text-sm text-muted">{description}</p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-5 rounded-full bg-beige1 px-5 py-2.5 text-sm font-semibold text-black shadow-soft transition hover:brightness-105"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
