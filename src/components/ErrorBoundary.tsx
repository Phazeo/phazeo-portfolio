import { Component, type ReactNode } from "react";

import { ErrorFallback } from "./ErrorFallback";

type ErrorBoundaryProps = {
  children: ReactNode;
  /** When any value changes, a previously caught error is cleared. */
  resetKeys?: ReadonlyArray<string | number | undefined>;
  onReset?: () => void;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: unknown;
};

function resetKeysChanged(
  prev: ReadonlyArray<string | number | undefined> | undefined,
  next: ReadonlyArray<string | number | undefined> | undefined
): boolean {
  if (prev === next) {
    return false;
  }
  if (!prev || !next) {
    return prev !== next;
  }
  if (prev.length !== next.length) {
    return true;
  }
  return prev.some((value, index) => value !== next[index]);
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.hasError && resetKeysChanged(prevProps.resetKeys, this.props.resetKeys)) {
      this.reset();
    }
  }

  reset = (): void => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} resetErrorBoundary={this.reset} />;
    }
    return this.props.children;
  }
}
