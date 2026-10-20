import { useRouteError } from "react-router-dom";

import { ErrorFallback } from "./ErrorFallback";

/**
 * Top-level router errorElement - shows ErrorFallback for crashes outside a profile.
 * "Try again" reloads the page.
 */
export function RouteErrorFallback() {
  const error = useRouteError();
  return <ErrorFallback error={error} resetErrorBoundary={() => window.location.reload()} />;
}
