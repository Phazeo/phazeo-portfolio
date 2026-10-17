import { RouterProvider } from "react-router-dom";

import { ThemeProvider } from "./contexts/ThemeContext";
import { router } from "./router";

export function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
