import type { ProfileVersion } from "../../../types";
import { seo, theme } from "./theme";

import { Contact } from "./components/Contact";
import { Hero } from "./components/Hero";

function TesterRobotV1() {
  return (
    <div className="min-h-screen">
      <Hero />
      <Contact />
    </div>
  );
}

export const profileVersion: ProfileVersion = {
  Component: TesterRobotV1,
  theme,
  seo,
};

export default profileVersion;
