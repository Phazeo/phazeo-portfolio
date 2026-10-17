import { createBrowserRouter, Outlet } from "react-router-dom";

import { RouteErrorFallback } from "./components/RouteErrorFallback";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PortfolioPage } from "./pages/PortfolioPage";

function RootLayout() {
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorFallback />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: ":slug",
        element: <PortfolioPage />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);
