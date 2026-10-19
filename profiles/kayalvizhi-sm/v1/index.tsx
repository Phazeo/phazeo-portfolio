import type { ProfileVersion } from "#kit";
import { seo, theme } from "./theme";

export const profileVersion: ProfileVersion = {
  componentLoader: () => import("./ProfilePage"),
  theme,
  seo,
};

export default profileVersion;
