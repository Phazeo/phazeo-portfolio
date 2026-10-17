import { CardBody, CardContainer, CardItem } from "../ui/card-3d";
import { SpotlightCard } from "../ui/spotlight-card";

/* ------------------------------------------------------------------ */
/* Project data - set hidden: true on any project to remove it from   */
/* the rendered page. Flip back to false to re-show it.               */
/* ------------------------------------------------------------------ */

interface Project {
  id: string;
  title: string;
  context: string;
  gradient: string;
  /** Short 1-2 sentence summary (the hook - read this and you get it) */
  summary: string;
  /** Optional bullet points for scannable detail (flagship cards) */
  highlights?: string[];
  technologies: string[];
  impact: string;
  /** Group label shown above a cluster of projects */
  group?: string;
  /** Set to true to hide this project from the page */
  hidden: boolean;
  /** If true, renders with a "Flagship" badge for recruiter visibility */
  flagship?: boolean;
}

const projects: Project[] = [
  /* ============================================================== */
  /*  Flagship Projects                                              */
  /* ============================================================== */
  {
    id: "media-agent",
    title: "Media Agent",
    context: "AI Engineering · Omnicom",
    gradient: "var(--color-primary)",
    group: "Flagship Projects",
    flagship: true,
    summary:
      "Multi-agent AI platform for creating, optimizing, and analyzing digital media campaigns through natural-language conversations.",
    highlights: [
      "Copilot interface with LangGraph state-graph routing user intents to specialized sub-agents",
      "Channel allocation via Budget Allocation Math Engine (reach/revenue optimization with MILP)",
      "Natural-language scenario modification - 'Move $100K from TV to Digital'",
      "Partner selection, brief analysis (RAG), and client knowledge-base capabilities",
      "Real-time WebSocket streaming to React/TypeScript frontend",
      "Quality ensured via Deepeval + Gemini-as-judge evaluation pipelines",
    ],
    technologies: [
      "LangGraph",
      "LangChain",
      "Vertex AI (Gemini)",
      "FastAPI",
      "Python",
      "PostgreSQL",
      "WebSockets",
      "React/TypeScript",
      "Deepeval",
      "Docker",
    ],
    impact:
      "Enterprise planners create and optimize multi-channel media plans through conversations",
    hidden: false,
  },
  {
    id: "fuseprocess",
    title: "FuseProcess",
    context: "Data Engineering · Kinesso",
    gradient: "var(--color-secondary)",
    group: "Flagship Projects",
    flagship: true,
    summary:
      "Production-grade data fusion engine performing individual-level statistical matching at 800M+ record scale for audience decisioning platforms.",
    highlights: [
      "Three matching strategies - R-based legacy, Python exact (MILP, Hungarian), Python heuristic (stratified parallel)",
      "Pluggable task orchestration with auto-discovery, Pydantic-typed contracts",
      "End-to-end pipeline: working-set build → algorithm → fusion pairs → Snowflake export",
      "Report generation, SAV merge, and verification modules",
      "Integrated LLM for variable categorization and mapping suggestions",
    ],
    technologies: [
      "Python",
      "R",
      "scipy (MILP)",
      "Snowflake",
      "S3",
      "Pydantic",
      "Pandas",
      "GCP",
      "Docker",
    ],
    impact:
      "Reliable fusion powering multi-country audience analytics across US, UK, DE, FR, JP, AU",
    hidden: false,
  },

  /* ============================================================== */
  /*  ML / NLP / CV Projects                                        */
  /* ============================================================== */
  {
    id: "question-survey",
    title: "Question Survey Similarity Framework",
    context: "NLP",
    gradient: "var(--color-primary)",
    summary:
      "End-to-end NLP framework for analyzing survey data using custom word embeddings, LDA topic modeling, and cosine similarity for cross-survey pattern identification.",
    technologies: ["NLTK", "Gensim", "BERT", "PyTorch", "Bi-LSTM", "word2vec"],
    impact: "Enhanced analysis accuracy through POS tagging and feature extraction",
    hidden: false,
  },
  {
    id: "credit-card-fraud",
    title: "European Credit Card Fraud Detection",
    context: "Machine Learning",
    gradient: "var(--color-secondary)",
    summary:
      "Real-time fraud detection system analyzing debit/credit transactions with high precision using autoencoder-based anomaly detection.",
    technologies: ["Keras", "TensorFlow", "Autoencoder", "K-Means", "Neural Networks"],
    impact: "98.01% accuracy",
    hidden: false,
  },
  {
    id: "product-image",
    title: "Product Image Recognition",
    context: "Computer Vision",
    gradient: "var(--color-primary)",
    summary:
      "Deep CNN for classifying 81 classes of groceries, vegetables, fruits, and packaged items using transfer learning with production-grade accuracy.",
    technologies: ["VGG16", "ResNet50", "Keras", "Transfer Learning"],
    impact: "98%+ accuracy, production-ready",
    hidden: false,
  },
  {
    id: "resume-eval",
    title: "NLP Resume Evaluation System",
    context: "NLP",
    gradient: "var(--color-secondary)",
    summary:
      "Automated pipeline to parse PDF resumes and rank candidate skillsets using keyword embedding and TfidfVectorizer.",
    technologies: ["Spacy", "NLTK", "PyPDF2", "Pandas"],
    impact: "Streamlined candidate screening process",
    hidden: false,
  },
  {
    id: "house-price",
    title: "Real-time House Price Analysis",
    context: "Big Data",
    gradient: "var(--color-primary)",
    summary:
      "End-to-end streaming pipeline for French housing data with Spark Streaming transformations, Kafka integration, and real-time dashboarding.",
    technologies: ["Spark Streaming", "Kafka", "MongoDB", "Real-time ETL"],
    impact: "Real-time dashboard for performance monitoring",
    hidden: false,
  },
  {
    id: "disease-recognition",
    title: "Disease Recognition System",
    context: "Computer Vision",
    gradient: "var(--color-secondary)",
    summary:
      "Multi-condition diagnostic system for Diabetes, Pneumonia, and Malaria using deep CNNs with clinical-grade performance.",
    technologies: ["CNN", "NMS Algorithm", "Supervised ML"],
    impact: "Clinical-grade accuracy for multiple conditions",
    hidden: false,
  },
  {
    id: "spam-detector",
    title: "Email/Message Spam Detector",
    context: "NLP",
    gradient: "var(--color-primary)",
    summary:
      "Sequential neural network for spam detection combining data preprocessing, word embeddings, and bidirectional sequence modeling.",
    technologies: ["RNN", "LSTM", "Bi-LSTM", "TensorFlow", "Keras"],
    impact: "High precision spam classification",
    hidden: false,
  },
  {
    id: "tattoo-gan",
    title: "Remove Body Tattoo with GAN",
    context: "Deep Learning",
    gradient: "var(--color-accent)",
    summary:
      "Generative Adversarial Network for image-to-image translation, removing black & white tattoos from human body images.",
    technologies: ["GAN", "PyTorch", "Torchvision", "Fastai"],
    impact: "Advanced image-to-image translation",
    hidden: false,
  },

  /* ============================================================== */
  /*  Earlier Enterprise & Analytics Projects (TCS era)             */
  /* ============================================================== */
  {
    id: "nps",
    title: "Net Promoter Score (NPS)",
    context: "Enterprise Analytics",
    gradient: "var(--color-secondary)",
    group: "Earlier Enterprise & Analytics Projects",
    summary:
      "Enterprise-scale customer experience analytics platform that consolidated survey data and customer interactions, enabling improved visibility into satisfaction metrics across multiple business units.",
    technologies: ["Informatica ETL", "SQL", "Data Warehousing", "CRM Analytics"],
    impact: "Consolidated customer satisfaction metrics across business units",
    hidden: false,
  },
  {
    id: "ebu-relationship",
    title: "EBU Relationship",
    context: "Enterprise Analytics",
    gradient: "var(--color-primary)",
    group: "Earlier Enterprise & Analytics Projects",
    summary:
      "Analytics initiative focused on understanding enterprise customer relationships across Wireless, Cable, and IoT services, supporting data-driven insights into engagement and experience.",
    technologies: ["SQL", "ETL", "Data Warehousing", "Business Intelligence"],
    impact: "Data-driven insights across Wireless, Cable & IoT verticals",
    hidden: false,
  },
  {
    id: "bcb",
    title: "BCB (Better Choice Bundle)",
    context: "Enterprise Analytics",
    gradient: "var(--color-secondary)",
    group: "Earlier Enterprise & Analytics Projects",
    summary:
      "Data-driven program managing customer experience during service migration and product restructuring, ensuring data consistency and reliability across interconnected systems.",
    technologies: ["Informatica", "PL/SQL", "Data Quality", "Migration Tools"],
    impact: "Ensured data integrity across large-scale service migration",
    hidden: false,
  },
  {
    id: "dq-migration",
    title: "Data Quality (DQ)",
    context: "Enterprise Analytics",
    gradient: "var(--color-primary)",
    group: "Earlier Enterprise & Analytics Projects",
    summary:
      "Data quality and migration initiatives to improve accuracy, consistency, and reliability of enterprise datasets supporting downstream analytics and reporting.",
    technologies: ["SQL", "ETL", "Data Profiling", "Quality Frameworks"],
    impact: "Improved enterprise data accuracy for downstream reporting",
    hidden: false,
  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function spotlightFor(gradient: string): string {
  if (gradient === "var(--color-secondary)") {
    return "rgba(124, 58, 237, 0.08)";
  }
  if (gradient === "var(--color-accent)") {
    return "rgba(8, 145, 178, 0.08)";
  }
  return "rgba(37, 99, 235, 0.08)";
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function Projects() {
  const visible = projects.filter((p) => !p.hidden);

  const flagshipProjects = visible.filter((p) => p.group === "Flagship Projects");
  const ungrouped = visible.filter((p) => !p.group);
  const grouped = visible.filter((p) => p.group && p.group !== "Flagship Projects");

  const groupLabels: string[] = [];
  for (const p of grouped) {
    if (p.group && !groupLabels.includes(p.group)) {
      groupLabels.push(p.group);
    }
  }

  return (
    <section
      id="projects"
      className="py-16 md:py-24 bg-(--color-background) relative overflow-hidden border-t border-slate-200"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <div className="w-16 h-16 bg-(--color-primary) rounded-2xl flex items-center justify-center text-3xl shadow-lg">
              🚀
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-8 md:mb-12 bg-linear-to-r from-(--color-primary) via-(--color-secondary) to-(--color-accent) bg-clip-text text-transparent">
            Selected Projects
          </h2>
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="h-1 w-12 bg-(--color-primary) rounded-full" />
            <div className="h-1 w-8 bg-(--color-secondary) rounded-full" />
            <div className="h-1 w-12 bg-(--color-accent) rounded-full" />
          </div>
        </div>

        {/* Flagship projects */}
        {flagshipProjects.length > 0 && (
          <div className="mb-16">
            <h3 className="text-xl md:text-2xl font-display font-bold text-slate-800 mb-8 text-center">
              Flagship Projects
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {flagshipProjects.map((p) => (
                <FlagshipCard key={p.id} project={p} />
              ))}
            </div>
          </div>
        )}

        {/* Regular projects */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {ungrouped.map((p) => (
            <CompactCard key={p.id} project={p} />
          ))}
        </div>

        {/* Grouped projects */}
        {groupLabels.map((label) => (
          <div key={label} className="mt-16">
            <h3 className="text-xl md:text-2xl font-display font-bold text-slate-800 mb-8 text-center">
              {label}
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {grouped
                .filter((p) => p.group === label)
                .map((p) => (
                  <CompactCard key={p.id} project={p} />
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Flagship card - structured layout with summary + bullet highlights  */
/* ------------------------------------------------------------------ */

function FlagshipCard({ project }: { project: Project }) {
  return (
    <CardContainer containerClassName="w-full" className="w-full">
      <CardBody className="w-full h-full">
        <SpotlightCard
          className="bg-white border border-slate-200 rounded-xl shadow-xs hover:shadow-lg transition-shadow duration-300 w-full h-full flex flex-col"
          spotlightColor={spotlightFor(project.gradient)}
        >
          {/* Top stripe */}
          <div
            className="h-1.5 rounded-t-xl"
            style={{
              background: `linear-gradient(90deg, ${project.gradient}, ${project.gradient === "var(--color-primary)" ? "var(--color-secondary)" : "var(--color-accent)"})`,
            }}
          />

          <div className="p-6 md:p-8 flex flex-col flex-1">
            {/* Badge row */}
            <CardItem translateZ={30} className="w-full">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="text-[11px] font-display font-semibold uppercase tracking-wider"
                  style={{ color: project.gradient }}
                >
                  {project.context}
                </span>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-wider rounded-full border border-amber-200">
                  Flagship
                </span>
              </div>
            </CardItem>

            {/* Title */}
            <CardItem translateZ={50} className="w-full">
              <h3 className="text-xl md:text-2xl font-display font-bold text-slate-900 mb-3">
                {project.title}
              </h3>
            </CardItem>

            {/* Summary - the hook */}
            <CardItem translateZ={20} className="w-full">
              <p className="text-slate-600 text-sm leading-relaxed mb-5">{project.summary}</p>
            </CardItem>

            {/* Bullet highlights */}
            {project.highlights && (
              <CardItem translateZ={25} className="w-full flex-1">
                <ul className="space-y-2 mb-6">
                  {project.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <span
                        className="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: project.gradient }}
                      />
                      <span className="leading-snug">{h}</span>
                    </li>
                  ))}
                </ul>
              </CardItem>
            )}

            {/* Tech tags */}
            <CardItem translateZ={35} className="w-full">
              <div className="flex flex-wrap gap-1.5 mb-5">
                {project.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-50 text-slate-600 border border-slate-200"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </CardItem>

            {/* Impact footer */}
            <CardItem translateZ={30} className="w-full mt-auto">
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-start gap-2">
                  <span className="text-base mt-0.5">✦</span>
                  <p className="text-sm text-slate-600 leading-snug">
                    <span className="font-semibold text-slate-700">Impact</span> {project.impact}
                  </p>
                </div>
              </div>
            </CardItem>
          </div>
        </SpotlightCard>
      </CardBody>
    </CardContainer>
  );
}

/* ------------------------------------------------------------------ */
/* Compact card - for regular / enterprise projects                    */
/* ------------------------------------------------------------------ */

function CompactCard({ project }: { project: Project }) {
  return (
    <CardContainer containerClassName="w-full" className="w-full">
      <CardBody className="w-full h-full">
        <SpotlightCard
          className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-xs hover:shadow-lg transition-shadow duration-300 w-full h-full flex flex-col"
          spotlightColor={spotlightFor(project.gradient)}
        >
          <CardItem translateZ={30} className="w-full">
            <span
              className="text-xs font-display font-semibold uppercase tracking-wide"
              style={{ color: project.gradient }}
            >
              {project.context}
            </span>
          </CardItem>

          <CardItem translateZ={50} className="w-full">
            <h3 className="text-xl md:text-2xl font-display font-bold text-slate-900 mt-2 mb-3">
              {project.title}
            </h3>
          </CardItem>

          <CardItem translateZ={20} className="w-full flex-1">
            <p className="text-slate-700 text-sm leading-relaxed mb-6">{project.summary}</p>
          </CardItem>

          <CardItem translateZ={40} className="w-full">
            <div className="mb-5">
              <div className="flex flex-wrap gap-1.5">
                {project.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-50 text-slate-600 border border-slate-200"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </CardItem>

          <CardItem translateZ={30} className="w-full mt-auto">
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-start gap-2">
                <span className="text-base mt-0.5">✦</span>
                <p className="text-sm text-slate-600 leading-snug">
                  <span className="font-semibold text-slate-700">Impact</span> {project.impact}
                </p>
              </div>
            </div>
          </CardItem>
        </SpotlightCard>
      </CardBody>
    </CardContainer>
  );
}
