import { Component, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="min-h-screen flex items-center justify-center bg-(--color-background) px-4">
            <div className="text-center max-w-md">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Something went wrong</h1>
              <p className="text-gray-600 mb-6">
                This profile failed to load. Try refreshing the page or return home.
              </p>
              <a
                href="/"
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
              >
                Back to profiles
              </a>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
