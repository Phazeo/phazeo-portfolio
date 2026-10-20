import { createBrowserRouter, Outlet } from "react-router-dom";

import { RouteErrorFallback } from "../components/RouteErrorFallback";
import { HomePage } from "../features/directory/HomePage";
import { PortfolioPage } from "../features/portfolio/PortfolioPage";
import { NotFoundPage } from "./not-found";

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
