import { TextGenerateEffect } from "../ui/text-generate";

const aboutSkills = [
  "Python",
  "LLM Agents",
  "LangChain",
  "Spark",
  "NLP",
  "Gemini Vertex AI",
  "Cloud AI",
  "Snowflake",
  "Vector Databases",
  "Rust",
];

const paragraph1 =
  "I'm a Data Scientist with 11+ years of experience in IT, currently focused on building LLM-powered AI agents and intelligent data systems. I specialize in applying machine learning, NLP, and large-scale data processing to transform complex enterprise data into production-ready, high-impact AI solutions, including optimization systems, advanced NLP frameworks, and scalable analytics platforms";

const paragraph2 =
  "I've worked extensively in telecom, banking, the global media and marketing industry, supporting high-volume customer data, complex business rules, and SLA-driven production systems, with a strong emphasis on reliability, performance, and real-world impact. I'm passionate about end-to-end data science and enjoy turning business problems into robust, interpretable, and scalable solutions.";

export function About() {
  return (
    <section id="about" className="py-16 md:py-24 bg-slate-50/80 border-t border-slate-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-12 bg-linear-to-r from-(--color-primary) via-(--color-secondary) to-(--color-accent) bg-clip-text text-transparent">
          About Me
        </h2>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs hover:shadow-md transition-shadow">
          <TextGenerateEffect words={paragraph1} className="text-slate-700 leading-relaxed mb-6" />
          <TextGenerateEffect words={paragraph2} className="text-slate-700 leading-relaxed" />

          <div className="mt-8 flex flex-wrap gap-3">
            {aboutSkills.map((skill) => (
              <span
                key={skill}
                className="px-4 py-2 bg-(--color-primary)/10 text-(--color-primary) rounded-lg text-sm font-semibold border border-(--color-primary)/20"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
