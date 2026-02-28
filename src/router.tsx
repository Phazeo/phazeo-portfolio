import { createBrowserRouter } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PortfolioPage } from "./pages/PortfolioPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/:slug",
    element: <PortfolioPage />,
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
