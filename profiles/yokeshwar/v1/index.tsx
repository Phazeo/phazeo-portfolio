import type { ProfileVersion } from "../../../types";
import { seo, theme } from "./theme";

import { About } from "./components/About";
import { Contact } from "./components/Contact";
import { Education } from "./components/Education";
import { Experience } from "./components/Experience";
import { Hero } from "./components/Hero";
import { Navigation } from "./components/Navigation";
import { Projects } from "./components/Projects";
import { Skills } from "./components/Skills";

/**
 * Yokeshwar Portfolio - Version 1
 * A modern portfolio showcasing EEE student with focus on EVs and IoT.
 */
function YokeshwarV1() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <Hero />
      <About />
      <Projects />
      <Experience />
      <Education />
      <Skills />
      <Contact />
    </div>
  );
}

export const profileVersion: ProfileVersion = {
  Component: YokeshwarV1,
  theme,
  seo,
};

export default profileVersion;
