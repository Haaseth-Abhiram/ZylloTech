/**
 * Zyllo Tech - Interactive Blog Articles Viewer
 * Supports rich modal view for all articles, social sharing, and responsive theming.
 */

const blogArticlesDatabase = {
  'multi-agent-llm': {
    title: 'Architecting Multi-Agent LLM Systems for Enterprise Workflows',
    category: 'Featured Publication · AI Systems',
    date: 'October 2026',
    meta: '8 min read',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80',
    content: `
      <p class="lead">Modern enterprise workflows require more than a single LLM prompt. Moving beyond rudimentary chatbots demands a coordinated mesh of specialized agents operating with strict state boundaries, deterministic error handling, and automated output verification.</p>
      
      <h3>1. Why Monolithic Prompts Fail at Enterprise Scale</h3>
      <p>Early generative AI implementations frequently suffered from context contamination, drifting system constraints, and unpredictability when handling multi-step reasoning. At Zyllo Tech, we solved this by breaking complex business logic into dedicated role-based pods: an <strong>Orchestrator Agent</strong>, a <strong>Tool Execution Agent</strong>, and a <strong>Verification & Compliance Auditor</strong>.</p>
      
      <div class="blog-callout">
        <strong>Key Architectural Rule:</strong> Never allow an agent that generates code or database queries to also self-certify its output. Separate generation from validation to maintain 99.8% output compliance.
      </div>

      <h3>2. Semantic Tool-Calling & Strict Schema Enforcement</h3>
      <p>Agents interact with databases, external REST APIs, and file systems exclusively through strictly typed JSON Schemas with Pydantic or TypeScript validation. If an agent emits a malformed payload or attempts an unauthorized parameter mutation, the semantic gateway intercepts the request and issues an immediate targeted correction prompt without surfacing errors to end users.</p>

      <h3>3. Production Deployment & Memory Caching</h3>
      <p>By pairing vector database retrieval (Qdrant/Pinecone) with short-term Redis state caches, our multi-agent pipelines maintain low latency (under 800ms) while retaining cross-session context. Enterprise clients in fintech and logistics have deployed this architecture to automate 85% of complex manual contract and invoice processing.</p>
    `
  },
  'frontend-performance': {
    title: 'Sub-Second Page Loads: High-Performance Frontend Strategies',
    category: 'Web Performance',
    date: 'September 2026',
    meta: '5 min read',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80',
    content: `
      <p class="lead">Every 100 milliseconds of latency directly degrades user conversion rates and search rankings. Achieving sub-second Largest Contentful Paint (LCP) and zero Cumulative Layout Shift (CLS) requires strict discipline across bundling, asset delivery, and execution pipelines.</p>

      <h3>1. Granular Code-Splitting & Dynamic Module Prefetching</h3>
      <p>Rather than shipping monolithic JavaScript vendor bundles, our engineering team breaks applications into granular, route-isolated modules. High-probability next routes are intelligently prefetched in the background during user idle periods via requestIdleCallback, ensuring subsequent page transitions render instantaneously.</p>

      <div class="blog-callout">
        <strong>Production Result:</strong> Migrating an enterprise SaaS platform from monolithic bundles to edge-cached dynamic modules reduced mobile LCP from 2.8s to 640ms, boosting checkout conversions by 22%.
      </div>

      <h3>2. Critical CSS Inlining & Zero-Layout-Shift Images</h3>
      <p>We eliminate render-blocking CSS by inlining critical viewport styles directly into the HTML document header while asynchronously streaming secondary utility styles. All media elements are strictly wrapped in intrinsic aspect-ratio containers, guaranteeing absolute zero layout shifts during mobile scroll interactions.</p>
    `
  },
  'k8s-zero-downtime': {
    title: 'Zero-Downtime Database Migrations on Kubernetes',
    category: 'Cloud DevOps',
    date: 'August 2026',
    meta: '7 min read',
    image: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1200&q=80',
    content: `
      <p class="lead">Applying structural database changes to high-throughput relational databases without dropping a single active customer query is one of the greatest challenges in backend engineering.</p>

      <h3>1. The Expand-and-Contract (Parallel Run) Pattern</h3>
      <p>Direct schema mutations (like renaming columns or changing constraints) inevitably lock tables and break running pods. We enforce the <em>Expand-and-Contract</em> pattern:
      <ul>
        <li><strong>Phase 1 (Expand):</strong> Add new columns or tables as nullable or default-populated without modifying existing fields.</li>
        <li><strong>Phase 2 (Dual Write):</strong> Update application code to read from the old schema while dual-writing to both old and new representations.</li>
        <li><strong>Phase 3 (Backfill):</strong> Asynchronously backfill historical records in non-blocking batches.</li>
        <li><strong>Phase 4 (Contract):</strong> Switch active reads to the new schema and safely decommission legacy columns in subsequent releases.</li>
      </ul>
      </p>

      <div class="blog-callout">
        <strong>Reliability Metric:</strong> Successfully executed schema migrations over an active 14-million record PostgreSQL cluster with 0 dropped transactions and 100% service uptime.
      </div>
    `
  },
  'rag-pipelines': {
    title: 'Designing RAG Pipelines That Don\'t Hallucinate',
    category: 'AI Engineering',
    date: 'July 2026',
    meta: '6 min read',
    image: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=1200&q=80',
    content: `
      <p class="lead">Retrieval-Augmented Generation (RAG) is the gold standard for connecting LLMs to private corporate data. However, naive chunking and top-k vector searches frequently return irrelevant context, triggering disastrous hallucinations.</p>

      <h3>1. Semantic Chunking Over Fixed-Token Splitting</h3>
      <p>Fixed 500-token slicing inevitably fractures sentences, tables, and conceptual context. We implement semantic chunking with document AST parsing, preserving table relationships, code snippets, and paragraph boundaries as unified semantic units.</p>

      <h3>2. Hybrid Keyword + Dense Vector Search</h3>
      <p>Vector similarity excels at conceptual matching but falters on exact part numbers, acronyms, or error codes. We combine dense embeddings (OpenAI / Cohere) with BM25 sparse keyword indices, followed by a Cross-Encoder Re-ranker to surface the top 3 most authoritative passages with verifiable source citations.</p>
    `
  },
  'flutter-vs-native': {
    title: 'Flutter vs Native in 2026: An Honest Production Comparison',
    category: 'Mobile Engineering',
    date: 'June 2026',
    meta: '9 min read',
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&q=80',
    content: `
      <p class="lead">With Flutter's Impeller rendering engine fully mature across both iOS and Android, the historic trade-off between cross-platform speed and native performance has shifted dramatically.</p>

      <h3>1. The Impeller Advantage</h3>
      <p>By pre-compiling complete GPU shaders at build time rather than runtime, Impeller completely eliminates the infamous first-run shader jank that plagued early hybrid frameworks. Both scrolling and complex physics transitions render reliably at 60 to 120 FPS.</p>

      <h3>2. When Native Is Still the Right Choice</h3>
      <p>While Flutter covers 90% of business applications with a 40% reduction in development costs, we still advise pure Swift (iOS) and Kotlin (Android) when building deep hardware-level Bluetooth integrations, custom real-time audio DSP engines, or battery-sensitive background geolocation trackers.</p>
    `
  },
  'jwt-security': {
    title: 'Hardening JWTs & Session Management in Microservices',
    category: 'Security Architecture',
    date: 'May 2026',
    meta: '6 min read',
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&q=80',
    content: `
      <p class="lead">JSON Web Tokens are widely adopted for stateless authorization, but poor implementation choices frequently create severe vulnerabilities: lack of token revocation, token theft via XSS, and insecure signature algorithms.</p>

      <h3>1. The Dual-Token Architecture</h3>
      <p>We mandate short-lived Access Tokens (10-15 minute lifespan) stored exclusively in memory, paired with strictly scoped Refresh Tokens stored in <strong>HttpOnly, SameSite=Strict, Secure cookies</strong>. This eliminates credential harvesting via client-side JavaScript injection.</p>

      <div class="blog-callout">
        <strong>Revocation Strategy:</strong> Using Redis token families, any attempt to reuse an expired or rotated refresh token automatically invalidates the entire token lineage, immediately blocking suspected hijacked sessions.
      </div>
    `
  },
  'prototype-to-enterprise': {
    title: 'From Prototype to Enterprise: When to Refactor',
    category: 'Product Architecture',
    date: 'April 2026',
    meta: '5 min read',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
    content: `
      <p class="lead">Startups often either over-engineer their initial MVP with premature microservices or construct messy spaghetti code that crumbles under their first surge of paying customers.</p>

      <h3>1. The Modular Monolith Phase</h3>
      <p>Our recommendation for seed-stage startups is always a well-structured <em>modular monolith</em>. Clean folder boundaries and explicit internal service interfaces give you 10x faster feature iteration while ensuring clear separation of concerns.</p>

      <h3>2. The Tipping Points for Service Extraction</h3>
      <p>Only extract a service into an independent microservice when:
      <ul>
        <li>Specific workloads (like AI processing or video transcoding) have asymmetric compute requirements that starve the main API.</li>
        <li>Autonomous engineering squads need independent CI/CD release cycles without code merge bottlenecks.</li>
        <li>Strict regulatory data boundaries (e.g. PCI-DSS cardholder environments) require isolated infrastructure.</li>
      </ul>
      </p>
    `
  }
};

// Sync articles from backend database
async function syncBlogArticlesFromApi() {
  try {
    const res = await fetch('/api/blog/posts');
    const data = await res.json();
    if (data.success && Array.isArray(data.articles)) {
      data.articles.forEach(art => {
        blogArticlesDatabase[art.slug] = {
          title: art.title,
          category: art.category,
          date: art.date,
          meta: art.read_time,
          image: art.image,
          content: art.content
        };
      });
    }
  } catch (err) {
    // Graceful fallback to static database
  }
}

document.addEventListener('DOMContentLoaded', () => {
  syncBlogArticlesFromApi();
});

async function openBlogArticle(key) {
  let data = blogArticlesDatabase[key];
  if (!data) {
    try {
      const res = await fetch(`/api/blog/posts/${key}`);
      const apiData = await res.json();
      if (apiData.success && apiData.article) {
        data = {
          title: apiData.article.title,
          category: apiData.article.category,
          date: apiData.article.date,
          meta: apiData.article.read_time,
          image: apiData.article.image,
          content: apiData.article.content
        };
        blogArticlesDatabase[key] = data;
      }
    } catch (e) {
      console.warn('Could not fetch article from API:', e);
    }
  }

  if (!data) return;

  const catEl = document.getElementById('modalBlogCategory');
  const titleEl = document.getElementById('modalBlogTitle');
  const dateEl = document.getElementById('modalBlogDate');
  const metaEl = document.getElementById('modalBlogMeta');
  const imgEl = document.getElementById('modalBlogImage');
  const bodyEl = document.getElementById('modalBlogBody');

  if (catEl) catEl.innerHTML = `<span class="tag-dot"></span>${data.category}`;
  if (titleEl) titleEl.innerText = data.title;
  if (dateEl) dateEl.innerText = data.date;
  if (metaEl) metaEl.innerHTML = `<i class="bi bi-clock me-1"></i> ${data.meta || data.read_time || '5 min read'}`;
  if (imgEl) {
    imgEl.src = data.image;
    imgEl.alt = data.title;
  }
  if (bodyEl) bodyEl.innerHTML = data.content;

  const modalEl = document.getElementById('blogPostDetailModal');
  if (modalEl && typeof bootstrap !== 'undefined') {
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
  }
}
