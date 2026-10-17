/**
 * Open-source chatbot knowledge base for portfolio "Ask about me" Q&A.
 * Answers are derived from portfolio content. No external API.
 */

export const BOT_NAME = "Sowmi Bot";
export const BOT_GREETING =
  'Hi! I\'m here to help you learn more about Sowmipriya. You can ask about her experience, skills, projects, education, publications, or how to get in touch. Try: "What does she do?" or "Tell me about her experience".';

interface KnowledgeEntry {
  keywords: string[];
  answer: string;
}

export const KNOWLEDGE: KnowledgeEntry[] = [
  // Who / role
  {
    keywords: [
      "who",
      "what does she do",
      "role",
      "title",
      "job",
      "profession",
      "occupation",
      "work as",
      "do for living",
    ],
    answer:
      "Sowmipriya Rajendiran is a Data Scientist and Machine Learning Engineer. She specializes in Large Language Models (LLM), NLP, and applied AI-building intelligent moderation systems, classifiers, and data pipelines that drive real-world impact.",
  },
  {
    keywords: ["name", "who is she", "about sowmi", "about her"],
    answer:
      "Sowmipriya Rajendiran is a Data Scientist & ML Engineer based in Paris, France. She has 5+ years of experience, focuses on LLMs and NLP, and holds a Master's in Big Data and Data Science from CY Cergy Paris University.",
  },
  // Location / contact
  {
    keywords: ["where", "location", "based", "live", "city", "country", "paris", "france"],
    answer:
      "Sowmipriya is based in Paris, France. You can reach her at priyasowmi94@gmail.com or +33 7 55 16 78 96. Scroll to the Contact section for more details.",
  },
  {
    keywords: ["contact", "email", "phone", "reach", "get in touch", "hire", "linkedin"],
    answer:
      "Get in touch: Email priyasowmi94@gmail.com, Phone +33 7 55 16 78 96. She's open to opportunities in AI, ML, and data science-LLM applications, NLP systems, or data-driven products.",
  },
  // Experience
  {
    keywords: ["experience", "work", "jobs", "career", "companies", "employed", "current role"],
    answer:
      "Current: Expert Data at Pareto.AI (Oct '25 – Present), working on LLM training and evaluation. Previous: NLP ML Engineer at Adyoulike (OPENWEB) Paris; Data Scientist at KaisensData; Data Analyst at Latentview (BMW/Bisnode); Software Developer at 91digital. Scroll to the Experience section for the full timeline.",
  },
  {
    keywords: ["pareto", "current job", "current company", "present"],
    answer:
      "She's currently Expert Data at Pareto.AI (Oct '25 – Present), collaborating on training large language models-crafting prompts and evaluating model performance and response quality.",
  },
  {
    keywords: ["adyoulike", "openweb", "ad you like"],
    answer:
      "At Adyoulike (OPENWEB) in Paris (Mar '22 – Feb '24) she was NLP Machine Learning Engineer: built in-house AI moderation with LLMs, created an IAB classifier from scratch for web page categorization, and did high-precision data labeling for NLP datasets.",
  },
  {
    keywords: ["kaisens", "kaisensdata"],
    answer:
      "At KaisensData (May '21 – Nov '21) she was Data Scientist (Intern): built an ML/NLP system to detect and track cyberbullying and harassment on social media, and ensured annotation quality for ML training.",
  },
  {
    keywords: ["latentview", "bmw", "bisnode"],
    answer:
      "At Latentview Analytics (Nov '17 – Jul '19), as Data Analyst consultant for BMW and Bisnode: built interactive visualizations, predictive models for vehicle defect/breakdown patterns using vehicle and warranty data.",
  },
  {
    keywords: ["91digital"],
    answer:
      "At 91digital Web Private Ltd (June '15 – Aug '17) she was Software Developer: developed a real-time price update algorithm refreshing product prices every 2–5 minutes.",
  },
  // Skills
  {
    keywords: ["skills", "technologies", "tech stack", "tools", "expertise", "proficient", "knows"],
    answer:
      "Key areas: AI & LLM (RAG, prompt engineering, Langchain, Transformers, PyTorch), ML (classification, clustering, model evaluation), Python/R/Scala/JS, Data Engineering (Spark, Kafka, Airflow, DBT, scraping), Databases (MySQL, BigQuery, PostgreSQL), Visualization (Tableau, Looker, Power BI), Cloud (AWS, Databricks, GCP, Azure). Scroll to Skills for the full list.",
  },
  {
    keywords: ["llm", "language model", "nlp", "natural language"],
    answer:
      "She works with Large Language Models and NLP: prompt engineering, model evaluation, RAG, Langchain, Transformers, text classification, and production NLP systems (e.g. moderation, IAB classification).",
  },
  {
    keywords: ["languages spoken", "french", "english", "tamil"],
    answer: "Languages: English (Fluent), French (Intermediate, DELF B1), Tamil (Native).",
  },
  // Education
  {
    keywords: [
      "education",
      "degree",
      "university",
      "study",
      "graduated",
      "master",
      "bachelor",
      "diploma",
    ],
    answer:
      "Education: Diplôme d'études en langue française (Exatice, Paris, 2024); Master in Big Data and Data Science (CY Cergy Paris University, 2019–2021); Bachelor of Computer Science and Engineering (VRSCET, Anna University, India, 2011–2015).",
  },
  {
    keywords: ["cy cergy", "anna university", "vrscet", "exatice"],
    answer:
      "CY Cergy Paris University (Master Big Data & Data Science), VRSCET/Anna University (Bachelor CSE, India), Exatice Paris (French diploma DELF).",
  },
  // Projects
  {
    keywords: ["projects", "work projects", "what has she built", "built"],
    answer:
      "Notable projects: AI Moderation System (LLM-based content moderation at scale); IAB Content Classifier (crawling to scoring for web pages); Cyber Bullying Detection (NLP/ML at KaisensData); Predictive Vehicle Maintenance (BMW/Latentview); Real-Time Price Update Algorithm (91digital). See the Projects section for details.",
  },
  {
    keywords: ["moderation", "ai moderation", "content moderation"],
    answer:
      "She developed production-grade AI moderation systems using LLMs at Adyoulike (OPENWEB): automated message interception, restricted word detection, and blocking based on ML scores for real-time moderation at scale.",
  },
  {
    keywords: ["iab", "classifier", "content classification"],
    answer:
      "She built an IAB classifier from scratch: web crawling, processing, feature extraction, and scoring to categorize web pages accurately at scale (Adyoulike/OPENWEB).",
  },
  {
    keywords: ["cyberbullying", "cyber bullying", "harassment detection"],
    answer:
      "At KaisensData she built an ML/NLP system to detect and track cyberbullying and harassment on social media, contributing to safer online environments.",
  },
  // Publications
  {
    keywords: ["publications", "papers", "research", "published"],
    answer:
      "Two publications: (1) 'Unprofessional Problems and Potential Healthcare Risks in Individual's Social Media Use' – National Institute of Health, Jan 2021; (2) 'An Emergency Response System for Injuries During Physical Education Training Using Deep Learning' – Emerald Group Publishing, Nov 2020. See Publications section.",
  },
  // General / help
  {
    keywords: ["hello", "hi", "hey", "thanks", "thank you", "bye", "goodbye"],
    answer:
      "You're welcome! Ask me anything about Sowmipriya-experience, skills, projects, education, or contact-or scroll through her portfolio sections.",
  },
  {
    keywords: ["help", "what can you do", "how does this work"],
    answer:
      "I answer questions about Sowmipriya using her portfolio. Try: 'What does she do?', 'Where does she work?', 'What are her skills?', 'Tell me about her projects', 'How can I contact her?', or 'What is her education?'",
  },
];

/**
 * Normalize user message for matching: lowercase, trim, remove extra spaces.
 */
export function normalizeMessage(text: string): string {
  return (text || "").toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Find the best matching answer for a user message (keyword-based).
 * Returns answer string or null if no match.
 */
export function getReply(userMessage: string): string | null {
  const normalized = normalizeMessage(userMessage);
  if (!normalized) {
    return null;
  }

  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const entry of KNOWLEDGE) {
    let score = 0;
    for (const keyword of entry.keywords) {
      if (normalized.includes(keyword)) {
        score += keyword.length;
        if (
          normalized === keyword ||
          normalized.startsWith(`${keyword} `) ||
          normalized.endsWith(` ${keyword}`)
        ) {
          score += 10;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry.answer;
    }
  }

  return bestMatch;
}
