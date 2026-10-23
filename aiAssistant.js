const fs = require('fs');
const path = require('path');

// Load verified services configuration
let verifiedServices = [];
try {
  const servicesRaw = fs.readFileSync(path.join(__dirname, 'public', 'assets', 'data', 'services.json'), 'utf8');
  verifiedServices = JSON.parse(servicesRaw);
} catch (err) {
  console.warn('Could not load services.json for AI Assistant:', err.message);
}

const COMPANY_KNOWLEDGE = {
  name: 'Zyllo Tech',
  fullName: 'Zyllo Tech Software Solutions',
  location: 'Guntur, Andhra Pradesh, India (Delivering remotely to global clients across US, UK, UAE, Australia, and worldwide)',
  turnaroundTime: 'We respond to every consultation inquiry within 1 business day.',
  whatsappNumber: '+91 70757 73680',
  whatsappUrl: 'https://wa.me/917075773680?text=Hello%20Zyllo%20Tech%20Team%2C%20I%20would%20like%20to%20discuss%20a%20project.',
  linkedinUrl: 'https://www.linkedin.com/company/zyllo-tech/',
  xUrl: 'https://x.com/ZylloS85154',
  contactEmail: 'contact@zyllotech.com',
  careersEmail: 'careers@zyllotech.com',
  services: [
    {
      name: 'Custom Software Development',
      slug: 'software-development',
      tech: ['Node.js', 'Python', 'Go', 'PostgreSQL', 'Microservices'],
      summary: 'Tailored enterprise software, back-office workflows, and business application roadmaps.'
    },
    {
      name: 'Web Applications & SaaS',
      slug: 'web-development',
      tech: ['React', 'Next.js', 'Node.js', 'PostgreSQL', 'GraphQL', 'Redis'],
      summary: 'High-performance web applications, customer portals, multi-tenant SaaS, and cloud APIs.'
    },
    {
      name: 'Mobile App Development',
      slug: 'mobile-app-development',
      tech: ['Flutter', 'React Native', 'Swift (iOS)', 'Kotlin (Android)'],
      summary: 'Native and cross-platform apps delivering fluid 60fps performance and offline-first data sync.'
    },
    {
      name: 'AI & Machine Learning',
      slug: 'ai-solutions',
      tech: ['Python', 'FastAPI', 'PyTorch', 'Vector DBs (Qdrant/Pinecone)', 'LLM RAG Pipelines'],
      summary: 'Practical enterprise AI copilots, intelligent process automation, and domain-specific RAG agents.'
    },
    {
      name: 'Cloud & DevOps',
      slug: 'cloud-solutions',
      tech: ['AWS', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD'],
      summary: 'Scalable cloud infrastructure, automated zero-downtime deployment pipelines, and 24/7 SLA monitoring.'
    },
    {
      name: 'UI/UX & Product Design',
      slug: 'ui-ux-design',
      tech: ['Figma', 'Interactive Prototypes', 'Design Systems', 'Usability Testing'],
      summary: 'High-converting user interfaces, wireframes, interactive prototypes, and design systems.'
    }
  ],
  engagementModels: [
    'Dedicated Engineering Pods (Monthly embedded team for scaling startups and enterprises)',
    'Sprint-based Milestone Delivery (Bi-weekly demo releases with clear acceptance criteria)',
    'Fixed-scope MVP Development (For clearly scoped prototypes and initial launch versions)'
  ],
  pricingPolicy: 'We do not use rigid cookie-cutter price lists because every architectural requirement is unique. Typical project phases start at indicative ₹5,00,000 for focused MVPs to ₹35,00,000+ for large-scale enterprise suites. We provide a guaranteed, detailed proposal after our initial discovery session.'
};

/**
 * Handles incoming chat messages from the AI assistant.
 * If external OpenAI or Gemini key is configured in process.env, it calls the LLM with strict grounding.
 * Otherwise, it uses our verified deterministic matching engine with contextual suggestions and lead capture.
 */
async function processAssistantMessage({ message, conversationHistory = [] }) {
  const cleanInput = (message || '').trim();
  if (!cleanInput) {
    return {
      reply: 'Hello! I am the Zyllo Tech Engineering Assistant. How can I assist you with your software, web, mobile, or AI engineering plans today?',
      quickActions: ['Estimate Project Cost', 'Explore AI Solutions', 'Book Discovery Call', 'Chat on WhatsApp']
    };
  }

  const lower = cleanInput.toLowerCase();

  // Check for LLM API integration if credentials are provided in environment
  if (process.env.OPENAI_API_KEY) {
    try {
      return await callOpenAI(cleanInput, conversationHistory);
    } catch (err) {
      console.warn('OpenAI API request failed, falling back to verified knowledge engine:', err.message);
    }
  }

  // Built-in verified knowledge engine
  return generateVerifiedResponse(cleanInput, lower);
}

/**
 * Deterministic verified knowledge engine.
 */
function generateVerifiedResponse(originalText, lower) {
  // 1. Contact / Talk to human / WhatsApp / Call / LinkedIn / X (Twitter)
  if (lower.includes('contact') || lower.includes('talk') || lower.includes('human') || lower.includes('call') || lower.includes('phone') || lower.includes('whatsapp') || lower.includes('reach out') || lower.includes('linkedin') || lower.includes('social') || lower.includes('twitter') || lower.includes('x.com') || lower.includes('x account') || lower.includes('x profile') || lower.includes('x link')) {
    return {
      reply: `You can connect directly with our engineering leadership through multiple instant channels:
- 💬 **WhatsApp**: [Chat directly on WhatsApp](${COMPANY_KNOWLEDGE.whatsappUrl}) (+91 70757 73680)
- 💼 **LinkedIn**: [Follow Zyllo Tech on LinkedIn](${COMPANY_KNOWLEDGE.linkedinUrl})
- ✖️ **X (Twitter)**: [Follow @ZylloS85154 on X](${COMPANY_KNOWLEDGE.xUrl})
- ✉️ **Email**: [${COMPANY_KNOWLEDGE.contactEmail}](mailto:${COMPANY_KNOWLEDGE.contactEmail})
- 📋 **Project Discovery Form**: You can also use our [Contact & Inquiry Form](/contact) or [Project Discovery Wizard](/contact#discovery).
- ⏱️ **Turnaround**: We respond to all inquiries within one business day!`,
      quickActions: ['Open WhatsApp', 'LinkedIn Page', 'Project Discovery Wizard', 'Cost Estimator']
    };
  }

  // 2. Cost / Pricing / Rates / Budget / Estimation
  if (lower.includes('cost') || lower.includes('price') || lower.includes('pricing') || lower.includes('quote') || lower.includes('rate') || lower.includes('budget') || lower.includes('how much')) {
    return {
      reply: `At **Zyllo Tech**, we tailor our solutions to your technical scope rather than pushing rigid boilerplate packages.
- **Engagement Options**: We offer Dedicated Engineering Pods, Sprint-based delivery, or Fixed-scope MVP milestones.
- **Indicative Baseline**: Focused MVPs typically start around indicative ₹5,00,000 to ₹15,00,000, while complex enterprise systems range ₹35,00,000–₹75,00,000+.
- 💡 **Try our Smart Estimator**: You can configure your exact feature set, platform, and timeline using our interactive **[Project Cost Estimator](/estimator)** to get an immediate indicative breakdown!`,
      quickActions: ['Launch Cost Estimator', 'Book Discovery Call', 'Chat on WhatsApp']
    };
  }

  // 3. AI / LLM / Machine Learning / RAG / Automation
  if (lower.includes('ai') || lower.includes('llm') || lower.includes('machine learning') || lower.includes('gpt') || lower.includes('rag') || lower.includes('bot') || lower.includes('automation')) {
    return {
      reply: `**Zyllo Tech** delivers high-impact, practical enterprise AI solutions engineered around your proprietary data:
- **Enterprise Copilots & Assistants**: In-app AI copilots that assist your team and end-users with contextual intelligence.
- **Secure RAG Pipelines**: High-speed vector search (Qdrant/Pinecone) combined with on-premise or cloud LLMs with strict zero-data-leakage guarantees.
- **Workflow Automation**: Automating complex document processing, OCR, triage, and multi-step business operations.
Would you like to review our case study on our real-time financial risk engine or discuss your specific AI pipeline?`,
      quickActions: ['AI Case Studies', 'Estimate AI Project', 'Contact Engineering']
    };
  }

  // 4. Mobile Apps / iOS / Android / Flutter
  if (lower.includes('mobile') || lower.includes('app') || lower.includes('ios') || lower.includes('android') || lower.includes('flutter') || lower.includes('react native')) {
    return {
      reply: `Our mobile engineering practice builds high-performance handheld applications:
- **Cross-Platform**: Unified Flutter and React Native codebases delivering native 60fps performance across iOS and Android.
- **Native Builds**: Swift (iOS) and Kotlin (Android) for hardware-intensive or low-level sensor integrations.
- **Core Strengths**: Offline-first synchronization, secure biometric authentication, payment gateways, and end-to-end App Store & Google Play deployment.
Explore our [Mobile App Development Services](/services/mobile-app-development) or test our cost estimator.`,
      quickActions: ['Mobile App Services', 'Mobile Cost Estimate', 'Book Discovery Call']
    };
  }

  // 5. Web Development / SaaS / Frontend / Backend
  if (lower.includes('web') || lower.includes('website') || lower.includes('saas') || lower.includes('react') || lower.includes('node') || lower.includes('frontend') || lower.includes('backend') || lower.includes('portal')) {
    return {
      reply: `We build modern, resilient web applications and SaaS platforms:
- **Frontend**: React, Next.js, TypeScript, responsive mobile-first UI with sub-second page loads.
- **Backend & APIs**: Node.js/Express, Python/FastAPI, microservices architectures, REST & GraphQL endpoints.
- **Database & Cloud**: PostgreSQL, Redis caching, multi-tenant databases, AWS/GCP cloud deployments.
Check out our recent SaaS builds in our [Portfolio](/portfolio)!`,
      quickActions: ['Explore Portfolio', 'Web App Services', 'Cost Estimator']
    };
  }

  // 6. Location / Office / Remote collaboration
  if (lower.includes('where') || lower.includes('location') || lower.includes('office') || lower.includes('guntur') || lower.includes('india') || lower.includes('remote')) {
    return {
      reply: `**Zyllo Tech** is headquartered in **Guntur, Andhra Pradesh, India** (operating on Indian Standard Time - IST with global client overlap), serving clients worldwide across North America, Europe, the Middle East, and Asia-Pacific.
- Collaboration runs smoothly via synchronous video calls, Jira/GitHub project tracking, and bi-weekly sprint demos.
- You also have access to our real-time **[Client Portal](/portal)** to track milestones, test staging builds, and access shared deliverables!`,
      quickActions: ['About Zyllo Tech', 'Open Client Portal', 'Book Discovery Call']
    };
  }

  // 7. Careers / Hiring / Jobs
  if (lower.includes('career') || lower.includes('job') || lower.includes('hiring') || lower.includes('internship') || lower.includes('vacancy') || lower.includes('apply')) {
    return {
      reply: `We are actively hiring engineering, design, and QA talent at Zyllo Tech!
- Open positions include: **Full Stack Developer**, **QA Engineer**, **UI/UX Designer**, **Backend Developer**, and **Junior Software Developer**.
- You can review open positions, job descriptions, and apply directly with your resume on our **[Careers Page](/careers)**.
- Every application receives an immediate tracked confirmation email.`,
      quickActions: ['View Careers Page', 'Apply Now', 'Company Culture']
    };
  }

  // 8. Default fallback with helpful navigation
  return {
    reply: `Thank you for asking! **Zyllo Tech** is an enterprise software engineering company specializing in **Custom Software**, **Web & SaaS Applications**, **Mobile Development**, **AI/ML Solutions**, and **Cloud Infrastructure**.

How would you like to proceed?
1. 🧮 **Get an instant price estimate** with our [Smart Cost Estimator](/estimator).
2. 📑 **Design your project brief** using the [Discovery Wizard](/contact#discovery).
3. 💬 **Speak directly with our engineering team** on [WhatsApp](${COMPANY_KNOWLEDGE.whatsappUrl}) or via [Email](mailto:${COMPANY_KNOWLEDGE.contactEmail}).`,
    quickActions: ['Smart Cost Estimator', 'Project Discovery Wizard', 'WhatsApp Chat', 'Explore Services']
  };
}

/**
 * Optional OpenAI API caller if OPENAI_API_KEY is supplied.
 */
async function callOpenAI(userMessage, history = []) {
  const systemPrompt = `You are the official AI Website Assistant for Zyllo Tech Software Solutions (headquartered in Guntur, Andhra Pradesh, India, delivering remotely worldwide).
Verified Company Information:
- Services: Custom Software Development, Web Applications (Next.js/React/Node), Mobile App Development (Flutter/React Native/iOS/Android), AI & Machine Learning (RAG pipelines, agents, workflow automation), Cloud & DevOps (AWS/GCP/Kubernetes), UI/UX & Product Design.
- Engagement Models: Dedicated engineering pods, sprint milestones, fixed-scope MVPs.
- Pricing: Indicative ₹5,00,000+ for MVPs, ₹35,00,000–₹75,00,000+ for complex platforms in INR; no rigid price lists, scoping is customized.
- Contact: WhatsApp (+91 70757 73680), Email (${COMPANY_KNOWLEDGE.contactEmail}).
Rules:
1. Answer visitor questions professionally, accurately, and concisely.
2. Never invent fake client names, certifications, or fabricated prices.
3. Encourage visitors to use the Project Cost Estimator, Discovery Wizard, or connect on WhatsApp.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-4).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: userMessage }
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.3,
      max_tokens: 300
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI responded with ${response.status}`);
  }

  const data = await response.json();
  const reply = data.choices[0].message.content;

  return {
    reply,
    quickActions: ['Smart Cost Estimator', 'Book Discovery Call', 'Chat on WhatsApp']
  };
}

module.exports = {
  processAssistantMessage,
  COMPANY_KNOWLEDGE
};
