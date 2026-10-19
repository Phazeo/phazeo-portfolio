import "#kit/fonts/playfair-display-latin.css";

import { About } from "./components/About";
import { Chatbot } from "./components/Chatbot";
import { Contact } from "./components/Contact";
import { Education } from "./components/Education";
import { Experience } from "./components/Experience";
import { Hero } from "./components/Hero";
import { Navigation } from "./components/Navigation";
import { Projects } from "./components/Projects";
import { Publications } from "./components/Publications";
import { Skills } from "./components/Skills";

/**
 * Sowmipriya Portfolio - Version 1
 * A complete portfolio showcasing Data Science & ML Engineering expertise.
 * Includes an interactive chatbot for Q&A about Sowmipriya.
 */
export default function SowmipriyaProfilePage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <Hero />
      <About />
      <Experience />
      <Education />
      <Skills />
      <Projects />
      <Publications />
      <Contact />
      <Chatbot />
    </div>
  );
}
