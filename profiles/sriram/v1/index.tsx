import type { ProfileVersion } from "../../../types";
import { seo, theme } from "./theme";

import { About } from "./components/About";
import { Achievements } from "./components/Achievements";
import { Contact } from "./components/Contact";
import { Education } from "./components/Education";
import { Experience } from "./components/Experience";
import { Hero } from "./components/Hero";
import { Navigation } from "./components/Navigation";
import { Projects } from "./components/Projects";
import { Skills } from "./components/Skills";

function SriramV1() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <Hero />
      <About />
      <Projects />
      <Experience />
      <Education />
      <Skills />
      <Achievements />
      <Contact />
    </div>
  );
}

export const profileVersion: ProfileVersion = {
  Component: SriramV1,
  theme,
  seo,
};

export default profileVersion;
