import { RouterProvider } from "react-router-dom";

import { ThemeProvider } from "./providers/ThemeProvider";
import { router } from "./router";

export function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
