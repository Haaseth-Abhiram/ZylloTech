const os = require('os');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Safe loader for native sqlite3: prevents function crash if binary architecture mismatches (ELF header error)
let sqlite3 = null;
try {
  sqlite3 = require('sqlite3').verbose();
} catch (loadErr) {
  console.warn('⚠️ Warning: Native sqlite3 could not be loaded in this environment (ELF/architecture mismatch):', loadErr.message);
  sqlite3 = null;
}

// Resilient in-memory database fallback to ensure zero downtime and HTTP 200 responses on serverless platforms
function createFallbackDb() {
  console.log('⚡ Using resilient in-memory database fallback for serverless environment');
  
  let salt = '$2a$10$wT8K8U1QZ2VwL.HqBqA/he';
  try {
    salt = bcrypt.genSaltSync(10);
  } catch (e) {}
  
  const adminPass = bcrypt.hashSync ? bcrypt.hashSync('admin123', salt) : 'admin123';
  const userPass = bcrypt.hashSync ? bcrypt.hashSync('user123', salt) : 'user123';
  const hrPass = bcrypt.hashSync ? bcrypt.hashSync('hr123', salt) : 'hr123';

  const state = {
    users: [
      { id: 1, name: 'Zyllo Administrator', email: 'admin@zyllotech.com', password: adminPass, role: 'admin', company: 'Zyllo Tech Software Solutions', created_at: new Date().toISOString() },
      { id: 2, name: 'Alex Morgan', email: 'user@zyllotech.com', password: userPass, role: 'client', company: 'HyperCloud Global', created_at: new Date().toISOString() },
      { id: 3, name: 'Priya Sharma (HR Operations Lead)', email: 'hr@zyllotech.com', password: hrPass, role: 'hr', company: 'Zyllo Tech People Operations', created_at: new Date().toISOString() }
    ],
    inquiries: [
      { id: 1, name: 'David Vance', email: 'david.vance@finscale.io', phone: '+1 (555) 234-5678', service: 'Custom Software Development', budget: '$25,000 - $50,000', message: 'We need an enterprise compliance automation portal built with high scalability.', status: 'In Review', created_at: new Date().toISOString() },
      { id: 2, name: 'Sarah Al-Mansoor', email: 'sarah@desertlogistics.ae', phone: '+971 50 123 4567', service: 'AI & Machine Learning', budget: '$50,000+', message: 'Looking to deploy predictive route optimization and fleet analytics for GCC operations.', status: 'New', created_at: new Date().toISOString() },
      { id: 3, name: 'Michael Chen', email: 'mchen@healthbridge.com.au', phone: '+61 2 9876 5432', service: 'Mobile App Development', budget: '$10,000 - $25,000', message: 'Cross-platform patient monitoring app for iOS and Android with HIPAA compliance.', status: 'Contacted', created_at: new Date().toISOString() },
      { id: 4, name: 'Alex Morgan', email: 'user@zyllotech.com', phone: '+1 (555) 789-0123', service: 'AI & Machine Learning', budget: '$50,000 - $100,000', message: 'Enterprise real-time predictive analytics and automation model integration for HyperCloud Global.', status: 'In Review', created_at: new Date().toISOString() }
    ],
    jobs: [
      { id: 1, title: 'Full Stack Developer', category: 'IT', location: 'Guntur Office', job_type: 'Full-time', openings: 2, accent: 'blue', featured: 1, description: 'We are looking for a skilled Full Stack Developer to design, build, and maintain scalable web applications.', requirements: 'JavaScript, React, Node.js, SQL', responsibilities: 'Build web applications, clean APIs', status: 'Active', created_at: new Date().toISOString() },
      { id: 2, title: 'QA Engineer', category: 'QUALITY ASSURANCE', location: 'Guntur Office', job_type: 'Full-time', openings: 10, accent: 'blue', featured: 0, description: 'We are looking for a QA Engineer to ensure the quality and reliability of our software products.', requirements: 'QA methodologies, automated testing', responsibilities: 'Execute test suites, automated scripts', status: 'Active', created_at: new Date().toISOString() },
      { id: 3, title: 'UI/UX Designer', category: 'DESIGN', location: 'Hybrid/ India', job_type: 'Full-time', openings: 1, accent: 'blue', featured: 0, description: 'Creative UI/UX Designer to craft world-class software experiences.', requirements: 'Figma, Design Systems', responsibilities: 'Design intuitive interfaces', status: 'Active', created_at: new Date().toISOString() }
    ],
    job_applications: [],
    email_logs: [],
    admin_alerts: [],
    newsletter: [],
    settings: {
      smtp_host: 'smtp.gmail.com',
      smtp_port: '465',
      smtp_secure: 'true',
      smtp_user: 'haasethabhiram@gmail.com',
      smtp_from: 'haasethabhiram@gmail.com'
    },
    projects: [
      { id: 1, title: 'Enterprise Cloud Migration', client: 'HyperCloud Global', category: 'Cloud Infrastructure', status: 'In Progress', progress: 65, completion_date: 'Nov 2026', created_at: new Date().toISOString() }
    ],
    client_milestones: [],
    blog_articles: [
      {
        id: 1,
        slug: 'multi-agent-llm',
        title: 'Architecting Multi-Agent LLM Systems for Enterprise Workflows',
        category: 'AI Systems',
        date: 'October 2026',
        read_time: '8 min read',
        image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80',
        author: 'Dr. Evelyn Vance & Zyllo AI Pod',
        excerpt: 'Modern enterprise workflows require more than a single LLM prompt. Moving beyond rudimentary chatbots demands a coordinated mesh of specialized agents operating with strict state boundaries.',
        content: `<p class="lead">Modern enterprise workflows require more than a single LLM prompt. Moving beyond rudimentary chatbots demands a coordinated mesh of specialized agents operating with strict state boundaries, deterministic error handling, and automated output verification.</p><h3>1. Why Monolithic Prompts Fail at Enterprise Scale</h3><p>Early generative AI implementations frequently suffered from context contamination, drifting system constraints, and unpredictability when handling multi-step reasoning. At Zyllo Tech, we solved this by breaking complex business logic into dedicated role-based pods: an <strong>Orchestrator Agent</strong>, a <strong>Tool Execution Agent</strong>, and a <strong>Verification & Compliance Auditor</strong>.</p><div class="blog-callout"><strong>Key Architectural Rule:</strong> Never allow an agent that generates code or database queries to also self-certify its output. Separate generation from validation to maintain 99.8% output compliance.</div>`,
        status: 'Published',
        views: 1420
      },
      {
        id: 2,
        slug: 'frontend-performance',
        title: 'Sub-Second Page Loads: High-Performance Frontend Strategies',
        category: 'Web Performance',
        date: 'September 2026',
        read_time: '5 min read',
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80',
        author: 'Zyllo Frontend Engineering Team',
        excerpt: 'Every 100 milliseconds of latency directly degrades user conversion rates and search rankings. Achieving sub-second LCP and zero CLS requires strict discipline across bundling and asset delivery.',
        content: `<p class="lead">Every 100 milliseconds of latency directly degrades user conversion rates and search rankings. Achieving sub-second Largest Contentful Paint (LCP) and zero Cumulative Layout Shift (CLS) requires strict discipline across bundling, asset delivery, and execution pipelines.</p><h3>1. Granular Code-Splitting & Dynamic Module Prefetching</h3><p>Rather than shipping monolithic JavaScript vendor bundles, our engineering team breaks applications into granular, route-isolated modules.</p>`,
        status: 'Published',
        views: 980
      },
      {
        id: 3,
        slug: 'k8s-zero-downtime',
        title: 'Zero-Downtime Database Migrations on Kubernetes',
        category: 'Cloud DevOps',
        date: 'August 2026',
        read_time: '7 min read',
        image: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1200&q=80',
        author: 'Cloud Infrastructure Squad',
        excerpt: 'Applying structural database changes to high-throughput relational databases without dropping a single active customer query is one of the greatest challenges in backend engineering.',
        content: `<p class="lead">Applying structural database changes to high-throughput relational databases without dropping a single active customer query is one of the greatest challenges in backend engineering.</p><h3>1. The Expand-and-Contract (Parallel Run) Pattern</h3><p>Direct schema mutations inevitably lock tables and break running pods. We enforce the Expand-and-Contract pattern: Expand new columns, Dual-write, Asynchronously backfill, and safely Contract legacy fields.</p>`,
        status: 'Published',
        views: 875
      },
      {
        id: 4,
        slug: 'rag-pipelines',
        title: "Designing RAG Pipelines That Don't Hallucinate",
        category: 'AI Engineering',
        date: 'July 2026',
        read_time: '6 min read',
        image: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=1200&q=80',
        author: 'Data Intelligence Pod',
        excerpt: 'Retrieval-Augmented Generation (RAG) is the gold standard for connecting LLMs to private corporate data. However, naive chunking triggers disastrous hallucinations.',
        content: `<p class="lead">Retrieval-Augmented Generation (RAG) is the gold standard for connecting LLMs to private corporate data. However, naive chunking and top-k vector searches frequently return irrelevant context, triggering disastrous hallucinations.</p><h3>1. Semantic Chunking Over Fixed-Token Splitting</h3><p>Fixed 500-token slicing fractures sentences and tables. We implement semantic chunking with document AST parsing, preserving table relationships and conceptual context.</p>`,
        status: 'Published',
        views: 1120
      },
      {
        id: 5,
        slug: 'flutter-vs-native',
        title: 'Flutter vs Native in 2026: An Honest Production Comparison',
        category: 'Mobile Engineering',
        date: 'June 2026',
        read_time: '9 min read',
        image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&q=80',
        author: 'Mobile Systems Architects',
        excerpt: "With Flutter's Impeller rendering engine fully mature across both iOS and Android, the historic trade-off between cross-platform speed and native performance has shifted dramatically.",
        content: `<p class="lead">With Flutter's Impeller rendering engine fully mature across both iOS and Android, the historic trade-off between cross-platform speed and native performance has shifted dramatically.</p><h3>1. The Impeller Advantage</h3><p>By pre-compiling complete GPU shaders at build time rather than runtime, Impeller completely eliminates the infamous shader compilation jank.</p>`,
        status: 'Published',
        views: 750
      },
      {
        id: 6,
        slug: 'jwt-security',
        title: 'Hardening JWTs & Session Management in Microservices',
        category: 'Security Architecture',
        date: 'May 2026',
        read_time: '6 min read',
        image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&q=80',
        author: 'Cybersecurity Red Team',
        excerpt: 'JSON Web Tokens are widely adopted for stateless authorization, but poor implementation choices frequently create severe vulnerabilities.',
        content: `<p class="lead">JSON Web Tokens are widely adopted for stateless authorization, but poor implementation choices frequently create severe vulnerabilities: lack of token revocation, token theft via XSS, and insecure signature algorithms.</p><h3>1. The Dual-Token Architecture</h3><p>We mandate short-lived Access Tokens in memory paired with HttpOnly, SameSite=Strict, Secure cookies for Refresh Tokens.</p>`,
        status: 'Published',
        views: 930
      },
      {
        id: 7,
        slug: 'prototype-to-enterprise',
        title: 'From Prototype to Enterprise: When to Refactor',
        category: 'Product Architecture',
        date: 'April 2026',
        read_time: '5 min read',
        image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
        author: 'Principal Engineering Group',
        excerpt: 'Startups often either over-engineer their initial MVP with premature microservices or construct messy spaghetti code that crumbles under their first surge of paying customers.',
        content: `<p class="lead">Startups often either over-engineer their initial MVP with premature microservices or construct messy spaghetti code that crumbles under their first surge of paying customers.</p><h3>1. The Modular Monolith Phase</h3><p>Our recommendation for seed-stage startups is always a well-structured modular monolith. Clean folder boundaries provide 10x faster feature iteration.</p>`,
        status: 'Published',
        views: 640
      }
    ]
  };

  const mockDb = {
    serialize(fn) {
      if (typeof fn === 'function') {
        try { fn(); } catch (e) { console.warn('Mock serialize error:', e.message); }
      }
      return this;
    },
    run(sql, params, callback) {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      const s = String(sql || '').trim();
      const p = Array.isArray(params) ? params : (params != null ? [params] : []);

      if (/^INSERT\s+INTO\s+inquiries/i.test(s)) {
        state.inquiries.push({
          id: state.inquiries.length + 1,
          name: p[0] || 'Inquiry',
          email: p[1] || '',
          phone: p[2] || '',
          service: p[3] || '',
          budget: p[4] || '',
          message: p[5] || '',
          status: p[6] || 'New',
          created_at: new Date().toISOString()
        });
      } else if (/^INSERT\s+INTO\s+newsletter/i.test(s)) {
        state.newsletter.push({
          id: state.newsletter.length + 1,
          email: p[0] || '',
          subscribed_at: new Date().toISOString()
        });
      } else if (/^INSERT\s+INTO\s+job_applications/i.test(s)) {
        state.job_applications.push({
          id: state.job_applications.length + 1,
          role: p[0] || '',
          name: p[1] || '',
          email: p[2] || '',
          phone: p[3] || '',
          created_at: new Date().toISOString()
        });
      }

      if (typeof callback === 'function') {
        callback.call({ lastID: Date.now(), changes: 1 }, null);
      }
      return this;
    },
    get(sql, params, callback) {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      const s = String(sql || '').trim();
      const p = Array.isArray(params) ? params : (params != null ? [params] : []);

      let result = null;
      if (/FROM\s+users/i.test(s)) {
        if (/LOWER\(email\)\s*=\s*LOWER\(\?\)/i.test(s) && p[0]) {
          result = state.users.find(u => u.email.toLowerCase() === String(p[0]).toLowerCase()) || null;
        } else if (/id\s*=\s*\?/i.test(s) && p[0]) {
          result = state.users.find(u => u.id === Number(p[0])) || null;
        } else {
          result = state.users[0] || null;
        }
      } else if (/FROM\s+blog_articles/i.test(s)) {
        if (/slug\s*=\s*\?/i.test(s) && p[0]) {
          result = state.blog_articles.find(a => a.slug === String(p[0])) || null;
        } else if (/id\s*=\s*\?/i.test(s) && p[0]) {
          result = state.blog_articles.find(a => a.id === Number(p[0])) || null;
        } else {
          result = state.blog_articles[0] || null;
        }
      } else if (/COUNT\(\*\)\s*AS\s*count/i.test(s)) {
        let count = 0;
        if (/FROM\s+users/i.test(s)) count = state.users.length;
        else if (/FROM\s+blog_articles/i.test(s)) count = state.blog_articles.length;
        else if (/FROM\s+jobs/i.test(s)) count = state.jobs.length;
        else if (/FROM\s+inquiries/i.test(s)) count = state.inquiries.length;
        result = { count };
      } else if (/FROM\s+settings/i.test(s)) {
        const key = p[0];
        result = key && state.settings[key] ? { key, value: state.settings[key] } : null;
      }

      if (typeof callback === 'function') {
        callback(null, result);
      }
      return this;
    },
    all(sql, params, callback) {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      const s = String(sql || '').trim();
      const p = Array.isArray(params) ? params : (params != null ? [params] : []);

      let results = [];
      if (/FROM\s+blog_articles/i.test(s)) {
        results = [...state.blog_articles];
      } else if (/FROM\s+users/i.test(s)) {
        results = [...state.users];
      } else if (/FROM\s+jobs/i.test(s)) {
        results = [...state.jobs];
      } else if (/FROM\s+inquiries/i.test(s)) {
        results = [...state.inquiries];
      } else if (/FROM\s+projects/i.test(s)) {
        results = [...state.projects];
      } else if (/FROM\s+job_applications/i.test(s)) {
        results = [...state.job_applications];
      } else if (/FROM\s+email_logs/i.test(s)) {
        results = [...state.email_logs];
      } else if (/FROM\s+admin_alerts/i.test(s)) {
        results = [...state.admin_alerts];
      } else if (/FROM\s+settings/i.test(s)) {
        results = Object.keys(state.settings).map(k => ({ key: k, value: state.settings[k] }));
      }

      if (typeof callback === 'function') {
        callback(null, results);
      }
      return this;
    },
    prepare(sql, callback) {
      const stmt = {
        run(...args) {
          const cb = args.find(a => typeof a === 'function');
          if (cb) cb.call({ lastID: Date.now(), changes: 1 }, null);
          return stmt;
        },
        get(...args) {
          const cb = args.find(a => typeof a === 'function');
          if (cb) cb(null, null);
          return stmt;
        },
        all(...args) {
          const cb = args.find(a => typeof a === 'function');
          if (cb) cb(null, []);
          return stmt;
        },
        finalize(cb) {
          if (typeof cb === 'function') cb(null);
          return stmt;
        }
      };
      if (typeof callback === 'function') callback(null, stmt);
      return stmt;
    },
    exec(sql, callback) {
      if (typeof callback === 'function') callback(null);
      return this;
    },
    close(callback) {
      if (typeof callback === 'function') callback(null);
      return this;
    }
  };

  return mockDb;
}

// Determine database path: On Vercel / AWS Lambda, use os.tmpdir() (the only writable directory in serverless)
const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
let dbPath;

if (isVercel) {
  const tmpDir = os.tmpdir();
  if (!fs.existsSync(tmpDir)) {
    try {
      fs.mkdirSync(tmpDir, { recursive: true });
    } catch (e) {}
  }
  dbPath = path.join(tmpDir, 'zyllotech.db');
  const sourceDbPath = path.resolve(__dirname, 'zyllotech.db');
  try {
    if (!fs.existsSync(dbPath) && fs.existsSync(sourceDbPath)) {
      fs.copyFileSync(sourceDbPath, dbPath);
      console.log('Copied bundled zyllotech.db to', dbPath);
    }
  } catch (err) {
    console.error('Failed to copy database to tmp directory:', err.message);
  }
} else {
  dbPath = path.resolve(__dirname, 'zyllotech.db');
}

let db;
if (sqlite3) {
  try {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error connecting to SQLite database, falling back:', err.message);
        db = createFallbackDb();
      } else {
        console.log('Connected to SQLite database at:', dbPath);
      }
    });
  } catch (err) {
    console.error('Failed to initialize SQLite database, falling back:', err.message);
    db = createFallbackDb();
  }
} else {
  db = createFallbackDb();
}

// Initialize tables and seed demo data
db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'client',
      company TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Inquiries / Leads table
  db.run(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      service TEXT,
      budget TEXT,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'New',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Newsletter table
  db.run(`
    CREATE TABLE IF NOT EXISTS newsletter (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Projects table
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      client TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT DEFAULT 'In Progress',
      progress INTEGER DEFAULT 0,
      completion_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Job Applications table
  db.run(`
    CREATE TABLE IF NOT EXISTS job_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      linkedin TEXT,
      experience TEXT,
      resume_link TEXT,
      cover_note TEXT,
      status TEXT DEFAULT 'Pending Review',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      email_sent INTEGER DEFAULT 0,
      email_tracking_id TEXT,
      email_opened INTEGER DEFAULT 0,
      email_open_count INTEGER DEFAULT 0,
      email_first_opened_at DATETIME,
      email_last_opened_at DATETIME
    )
  `);

  // Email Logs table for tracking sent emails and open events
  db.run(`
    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tracking_id TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      application_id INTEGER,
      sender TEXT NOT NULL DEFAULT 'haasethabhiram@gmail.com',
      recipient TEXT NOT NULL,
      recipient_name TEXT,
      subject TEXT NOT NULL,
      html_content TEXT,
      status TEXT DEFAULT 'Sent',
      open_count INTEGER DEFAULT 0,
      first_opened_at DATETIME,
      last_opened_at DATETIME,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Admin Alerts table for in-dashboard notifications
  db.run(`
    CREATE TABLE IF NOT EXISTS admin_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL DEFAULT 'job_application',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      reference_id INTEGER,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Settings table for dynamic SMTP and portal configurations
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // Blog Articles & Content Management Table
  db.run(`
    CREATE TABLE IF NOT EXISTS blog_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      read_time TEXT NOT NULL,
      image TEXT NOT NULL,
      author TEXT DEFAULT 'Zyllo Tech Engineering Team',
      excerpt TEXT,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'Published',
      views INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration helper: Ensure existing job_applications table has tracking columns
  db.all('PRAGMA table_info(job_applications)', [], (err, columns) => {
    if (!err && columns) {
      const colNames = columns.map(c => c.name);
      if (!colNames.includes('email_sent')) {
        db.run('ALTER TABLE job_applications ADD COLUMN email_sent INTEGER DEFAULT 0');
      }
      if (!colNames.includes('email_tracking_id')) {
        db.run('ALTER TABLE job_applications ADD COLUMN email_tracking_id TEXT');
      }
      if (!colNames.includes('email_opened')) {
        db.run('ALTER TABLE job_applications ADD COLUMN email_opened INTEGER DEFAULT 0');
      }
      if (!colNames.includes('email_open_count')) {
        db.run('ALTER TABLE job_applications ADD COLUMN email_open_count INTEGER DEFAULT 0');
      }
      if (!colNames.includes('email_first_opened_at')) {
        db.run('ALTER TABLE job_applications ADD COLUMN email_first_opened_at DATETIME');
      }
      if (!colNames.includes('email_last_opened_at')) {
        db.run('ALTER TABLE job_applications ADD COLUMN email_last_opened_at DATETIME');
      }
    }
  });

  // Seed default admin and user if not exists
  db.get('SELECT COUNT(*) AS count FROM users', (err, row) => {
    if (!err && row.count === 0) {
      const salt = bcrypt.genSaltSync(10);
      const adminPass = bcrypt.hashSync('admin123', salt);
      const userPass = bcrypt.hashSync('user123', salt);

      const stmt = db.prepare('INSERT INTO users (name, email, password, role, company) VALUES (?, ?, ?, ?, ?)');
      stmt.run('Zyllo Administrator', 'admin@zyllotech.com', adminPass, 'admin', 'Zyllo Tech Software Solutions');
      stmt.run('Alex Morgan', 'user@zyllotech.com', userPass, 'client', 'HyperCloud Global');
      stmt.run('Priya Sharma (HR Operations Lead)', 'hr@zyllotech.com', bcrypt.hashSync('hr123', salt), 'hr', 'Zyllo Tech People Operations');
      stmt.finalize();
      console.log('Seed users created: admin@zyllotech.com / admin123, hr@zyllotech.com / hr123, user@zyllotech.com / user123');
    }
  });

  // Seed initial inquiries if empty
  db.get('SELECT COUNT(*) AS count FROM inquiries', (err, row) => {
    if (!err && row.count === 0) {
      const stmt = db.prepare('INSERT INTO inquiries (name, email, phone, service, budget, message, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
      stmt.run('David Vance', 'david.vance@finscale.io', '+1 (555) 234-5678', 'Custom Software Development', '$25,000 - $50,000', 'We need an enterprise compliance automation portal built with high scalability.', 'In Review');
      stmt.run('Sarah Al-Mansoor', 'sarah@desertlogistics.ae', '+971 50 123 4567', 'AI & Machine Learning', '$50,000+', 'Looking to deploy predictive route optimization and fleet analytics for GCC operations.', 'New');
      stmt.run('Michael Chen', 'mchen@healthbridge.com.au', '+61 2 9876 5432', 'Mobile App Development', '$10,000 - $25,000', 'Cross-platform patient monitoring app for iOS and Android with HIPAA compliance.', 'Contacted');
      stmt.finalize();
      console.log('Sample inquiries seeded.');
    }
  });

  // Ensure demo client account has an inquiry for client portal demonstration
  db.get('SELECT COUNT(*) AS count FROM inquiries WHERE LOWER(email) = "user@zyllotech.com"', (err, row) => {
    if (!err && row && row.count === 0) {
      db.run(
        'INSERT INTO inquiries (name, email, phone, service, budget, message, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['Alex Morgan', 'user@zyllotech.com', '+1 (555) 789-0123', 'AI & Machine Learning', '$50,000 - $100,000', 'Enterprise real-time predictive analytics and automation model integration for HyperCloud Global.', 'In Review']
      );
    }
  });

  // Jobs table
  db.run(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT NOT NULL,
      job_type TEXT DEFAULT 'Full-time',
      openings INTEGER DEFAULT 1,
      accent TEXT DEFAULT 'blue',
      featured INTEGER DEFAULT 0,
      description TEXT NOT NULL,
      requirements TEXT,
      responsibilities TEXT,
      status TEXT DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed initial jobs if empty
  db.get('SELECT COUNT(*) AS count FROM jobs', (err, row) => {
    if (!err && row.count === 0) {
      const stmt = db.prepare('INSERT INTO jobs (title, category, location, job_type, openings, accent, featured, description, requirements, responsibilities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      stmt.run(
        'Full Stack Developer',
        'IT',
        'Guntur Office',
        'Full-time',
        2,
        'blue',
        1,
        'We are looking for a skilled Full Stack Developer to design, build, and maintain scalable web applications. You will work across the front end and back end, collaborating with cross-functional teams to deliver high-quality digital solutions.',
        'Proven experience as a Full Stack Developer. Strong knowledge of modern JavaScript/TypeScript, React, Node.js, and SQL databases. Familiarity with cloud platforms (AWS/GCP) and CI/CD pipelines.',
        'Build robust web applications, design clean RESTful APIs, optimize backend performance, collaborate on architecture with senior engineers.',
        'Active'
      );
      stmt.run(
        'QA Engineer',
        'QUALITY ASSURANCE',
        'Guntur Office',
        'Full-time',
        10,
        'blue',
        0,
        'We are looking for a QA Engineer to ensure the quality and reliability of our software products. You will perform manual and automated testing, identify software defects, and collaborate with developers to enhance user experience.',
        'Solid understanding of QA methodologies, automated testing frameworks (Playwright, Selenium, Jest), API testing with Postman, and bug tracking systems.',
        'Develop test plans, execute test suites, write automated regression scripts, verify security and performance standards.',
        'Active'
      );
      stmt.run(
        'UI/UX Designer',
        'DESIGN',
        'Hybrid/ India',
        'Full-time',
        10,
        'orange',
        0,
        'We are seeking a creative UI/UX Designer to design intuitive and visually appealing digital experiences. You will create wireframes, prototypes, and user interfaces that align with client requirements and industry best practices.',
        'Proficiency with Figma, modern design systems, user journey mapping, high-fidelity interactive prototyping, and responsive design.',
        'Design elegant interfaces, craft UI components, conduct usability reviews, collaborate closely with frontend developers.',
        'Active'
      );
      stmt.run(
        'Backend Developer',
        'ENGINEERING',
        'Hybrid / India',
        'Full-time',
        9,
        'blue',
        0,
        'We are looking for a Backend Developer to build secure, scalable, and high performance server side applications. You will develop APIs, manage databases, and optimize backend architecture for enterprise solutions.',
        'Extensive experience with Node.js/Express, Python/Django or Go, relational databases (PostgreSQL/MySQL), Redis caching, and microservices.',
        'Architect scalable microservices, manage database migrations, ensure security and compliance, monitor system uptime.',
        'Active'
      );
      stmt.run(
        'Frontend Developer',
        'ENGINEERING',
        'Hybrid / India',
        'Full-time',
        7,
        'blue',
        0,
        'We are looking for a Frontend Developer to create responsive and user friendly web interfaces. The ideal candidate should have experience with modern JavaScript frameworks, CSS animations, and performance optimization.',
        'Deep expertise in React.js, Next.js, modern CSS/SCSS, responsive design, state management, and web accessibility standards.',
        'Translate UI/UX designs into pixel-perfect code, optimize page load speed and animations, integrate REST/GraphQL APIs.',
        'Active'
      );
      stmt.run(
        'Junior Software Developer',
        'ENGINEERING',
        'Hybrid / India',
        'Full-time',
        10,
        'blue',
        0,
        'We are looking for a motivated Junior Software Developer to join our team. The ideal candidate should have a passion for software development, a willingness to learn new technologies, and a solid foundation in computer science.',
        'Degree in Computer Science or equivalent practical experience. Understanding of data structures, algorithms, Git, and web technologies.',
        'Write clean, well-tested code, participate in code reviews, fix bugs, learn modern software development best practices.',
        'Active'
      );
      stmt.finalize();
      console.log('Sample jobs seeded into database.');
    }
  });

  // Seed initial projects
  db.get('SELECT COUNT(*) AS count FROM projects', (err, row) => {
    if (!err && row.count === 0) {
      const stmt = db.prepare('INSERT INTO projects (title, client, category, status, progress, completion_date) VALUES (?, ?, ?, ?, ?, ?)');
      stmt.run('AeroTrack Logistics Hub', 'Desert Logistics UAE', 'AI / Web', 'In Progress', 75, 'Dec 2026');
      stmt.run('MedPulse Telehealth Suite', 'HealthBridge Australia', 'Mobile / Cloud', 'Testing', 90, 'Nov 2026');
      stmt.run('FinCore AI Risk Engine', 'FinScale New York', 'AI / Backend', 'Active', 45, 'Jan 2027');
      stmt.run('HyperCloud AI Analytics Suite', 'user@zyllotech.com', 'AI & Cloud Infrastructure', 'In Progress', 82, 'Nov 2026');
      stmt.finalize();
      console.log('Sample projects seeded.');
    }
  });

  // Seed initial blog articles
  db.get('SELECT COUNT(*) AS count FROM blog_articles', (err, row) => {
    if (!err && row.count === 0) {
      const stmt = db.prepare(`
        INSERT INTO blog_articles (slug, title, category, date, read_time, image, author, excerpt, content, status, views)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        'multi-agent-llm',
        'Architecting Multi-Agent LLM Systems for Enterprise Workflows',
        'AI Systems',
        'October 2026',
        '8 min read',
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80',
        'Dr. Evelyn Vance & Zyllo AI Pod',
        'Modern enterprise workflows require more than a single LLM prompt. Moving beyond rudimentary chatbots demands a coordinated mesh of specialized agents operating with strict state boundaries.',
        `<p class="lead">Modern enterprise workflows require more than a single LLM prompt. Moving beyond rudimentary chatbots demands a coordinated mesh of specialized agents operating with strict state boundaries, deterministic error handling, and automated output verification.</p>
        <h3>1. Why Monolithic Prompts Fail at Enterprise Scale</h3>
        <p>Early generative AI implementations frequently suffered from context contamination, drifting system constraints, and unpredictability when handling multi-step reasoning. At Zyllo Tech, we solved this by breaking complex business logic into dedicated role-based pods: an <strong>Orchestrator Agent</strong>, a <strong>Tool Execution Agent</strong>, and a <strong>Verification & Compliance Auditor</strong>.</p>
        <div class="blog-callout"><strong>Key Architectural Rule:</strong> Never allow an agent that generates code or database queries to also self-certify its output. Separate generation from validation to maintain 99.8% output compliance.</div>
        <h3>2. Semantic Tool-Calling & Strict Schema Enforcement</h3>
        <p>Agents interact with databases, external REST APIs, and file systems exclusively through strictly typed JSON Schemas with Pydantic or TypeScript validation.</p>
        <h3>3. Production Deployment & Memory Caching</h3>
        <p>By pairing vector database retrieval (Qdrant/Pinecone) with short-term Redis state caches, our multi-agent pipelines maintain low latency (under 800ms) while retaining cross-session context.</p>`,
        'Published',
        1420
      );

      stmt.run(
        'frontend-performance',
        'Sub-Second Page Loads: High-Performance Frontend Strategies',
        'Web Performance',
        'September 2026',
        '5 min read',
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80',
        'Zyllo Frontend Engineering Team',
        'Every 100 milliseconds of latency directly degrades user conversion rates and search rankings. Achieving sub-second LCP and zero CLS requires strict discipline across bundling and asset delivery.',
        `<p class="lead">Every 100 milliseconds of latency directly degrades user conversion rates and search rankings. Achieving sub-second Largest Contentful Paint (LCP) and zero Cumulative Layout Shift (CLS) requires strict discipline across bundling, asset delivery, and execution pipelines.</p>
        <h3>1. Granular Code-Splitting & Dynamic Module Prefetching</h3>
        <p>Rather than shipping monolithic JavaScript vendor bundles, our engineering team breaks applications into granular, route-isolated modules.</p>
        <div class="blog-callout"><strong>Production Result:</strong> Migrating an enterprise SaaS platform from monolithic bundles to edge-cached dynamic modules reduced mobile LCP from 2.8s to 640ms, boosting checkout conversions by 22%.</div>
        <h3>2. Critical CSS Inlining & Zero-Layout-Shift Images</h3>
        <p>We eliminate render-blocking CSS by inlining critical viewport styles directly into the HTML document header while asynchronously streaming secondary utility styles.</p>`,
        'Published',
        980
      );

      stmt.run(
        'k8s-zero-downtime',
        'Zero-Downtime Database Migrations on Kubernetes',
        'Cloud DevOps',
        'August 2026',
        '7 min read',
        'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1200&q=80',
        'Cloud Infrastructure Squad',
        'Applying structural database changes to high-throughput relational databases without dropping a single active customer query is one of the greatest challenges in backend engineering.',
        `<p class="lead">Applying structural database changes to high-throughput relational databases without dropping a single active customer query is one of the greatest challenges in backend engineering.</p>
        <h3>1. The Expand-and-Contract (Parallel Run) Pattern</h3>
        <p>Direct schema mutations inevitably lock tables and break running pods. We enforce the Expand-and-Contract pattern: Expand new columns, Dual-write, Asynchronously backfill, and safely Contract legacy fields.</p>
        <div class="blog-callout"><strong>Reliability Metric:</strong> Successfully executed schema migrations over an active 14-million record PostgreSQL cluster with 0 dropped transactions and 100% service uptime.</div>`,
        'Published',
        875
      );

      stmt.run(
        'rag-pipelines',
        'Designing RAG Pipelines That Don\'t Hallucinate',
        'AI Engineering',
        'July 2026',
        '6 min read',
        'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=1200&q=80',
        'Data Intelligence Pod',
        'Retrieval-Augmented Generation (RAG) is the gold standard for connecting LLMs to private corporate data. However, naive chunking triggers disastrous hallucinations.',
        `<p class="lead">Retrieval-Augmented Generation (RAG) is the gold standard for connecting LLMs to private corporate data. However, naive chunking and top-k vector searches frequently return irrelevant context, triggering disastrous hallucinations.</p>
        <h3>1. Semantic Chunking Over Fixed-Token Splitting</h3>
        <p>Fixed 500-token slicing fractures sentences and tables. We implement semantic chunking with document AST parsing, preserving table relationships and conceptual context.</p>
        <h3>2. Hybrid Keyword + Dense Vector Search</h3>
        <p>We combine dense embeddings with BM25 sparse keyword indices, followed by a Cross-Encoder Re-ranker to surface verifiable source citations.</p>`,
        'Published',
        1120
      );

      stmt.run(
        'flutter-vs-native',
        'Flutter vs Native in 2026: An Honest Production Comparison',
        'Mobile Engineering',
        'June 2026',
        '9 min read',
        'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&q=80',
        'Mobile Systems Architects',
        'With Flutter\'s Impeller rendering engine fully mature across both iOS and Android, the historic trade-off between cross-platform speed and native performance has shifted dramatically.',
        `<p class="lead">With Flutter's Impeller rendering engine fully mature across both iOS and Android, the historic trade-off between cross-platform speed and native performance has shifted dramatically.</p>
        <h3>1. The Impeller Advantage</h3>
        <p>By pre-compiling complete GPU shaders at build time rather than runtime, Impeller completely eliminates the infamous shader compilation jank.</p>
        <h3>2. When Native Is Still the Right Choice</h3>
        <p>While Flutter covers 90% of business applications, pure Swift and Kotlin remain essential for low-level Bluetooth DSP and custom kernel integrations.</p>`,
        'Published',
        750
      );

      stmt.run(
        'jwt-security',
        'Hardening JWTs & Session Management in Microservices',
        'Security Architecture',
        'May 2026',
        '6 min read',
        'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&q=80',
        'Cybersecurity Red Team',
        'JSON Web Tokens are widely adopted for stateless authorization, but poor implementation choices frequently create severe vulnerabilities.',
        `<p class="lead">JSON Web Tokens are widely adopted for stateless authorization, but poor implementation choices frequently create severe vulnerabilities: lack of token revocation, token theft via XSS, and insecure signature algorithms.</p>
        <h3>1. The Dual-Token Architecture</h3>
        <p>We mandate short-lived Access Tokens in memory paired with HttpOnly, SameSite=Strict, Secure cookies for Refresh Tokens.</p>
        <div class="blog-callout"><strong>Revocation Strategy:</strong> Using Redis token families, any attempt to reuse an expired token automatically invalidates the entire token lineage.</div>`,
        'Published',
        930
      );

      stmt.run(
        'prototype-to-enterprise',
        'From Prototype to Enterprise: When to Refactor',
        'Product Architecture',
        'April 2026',
        '5 min read',
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
        'Principal Engineering Group',
        'Startups often either over-engineer their initial MVP with premature microservices or construct messy spaghetti code that crumbles under their first surge of paying customers.',
        `<p class="lead">Startups often either over-engineer their initial MVP with premature microservices or construct messy spaghetti code that crumbles under their first surge of paying customers.</p>
        <h3>1. The Modular Monolith Phase</h3>
        <p>Our recommendation for seed-stage startups is always a well-structured modular monolith. Clean folder boundaries provide 10x faster feature iteration.</p>
        <h3>2. The Tipping Points for Service Extraction</h3>
        <p>Only extract a service when workloads have asymmetric compute requirements, or autonomous squads need independent release cycles.</p>`,
        'Published',
        640
      );

      stmt.finalize();
      console.log('Sample blog articles seeded into database.');
    }
  });

  // Client Milestones table
  db.run(`
    CREATE TABLE IF NOT EXISTS client_milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      client_email TEXT NOT NULL,
      title TEXT NOT NULL,
      phase TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'In Progress',
      due_date TEXT,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Client Deliverables table
  db.run(`
    CREATE TABLE IF NOT EXISTS client_deliverables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      client_email TEXT NOT NULL,
      title TEXT NOT NULL,
      deliverable_type TEXT NOT NULL,
      file_url TEXT NOT NULL,
      version TEXT DEFAULT 'v1.0',
      status TEXT DEFAULT 'Ready for Review',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Client Meeting Notes table
  db.run(`
    CREATE TABLE IF NOT EXISTS client_meeting_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      client_email TEXT NOT NULL,
      title TEXT NOT NULL,
      meeting_date TEXT NOT NULL,
      attendees TEXT,
      summary TEXT,
      action_items TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Support Tickets table
  db.run(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_email TEXT NOT NULL,
      client_name TEXT,
      project_id INTEGER,
      subject TEXT NOT NULL,
      category TEXT DEFAULT 'Technical',
      priority TEXT DEFAULT 'Medium',
      message TEXT NOT NULL,
      status TEXT DEFAULT 'Open',
      admin_response TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Discovery Briefs table
  db.run(`
    CREATE TABLE IF NOT EXISTS discovery_briefs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name TEXT NOT NULL,
      email TEXT NOT NULL,
      company TEXT,
      phone TEXT,
      solution_type TEXT,
      target_audience TEXT,
      features TEXT,
      integrations TEXT,
      budget_range TEXT,
      launch_timeline TEXT,
      nda_requested INTEGER DEFAULT 0,
      brief_summary TEXT,
      status TEXT DEFAULT 'New',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // SEO Audits table
  db.run(`
    CREATE TABLE IF NOT EXISTS seo_audits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      score INTEGER,
      audit_results TEXT,
      client_ip TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed demo client records for HyperCloud Global (user@zyllotech.com)
  db.get("SELECT COUNT(*) AS count FROM client_milestones WHERE client_email = 'user@zyllotech.com'", (err, row) => {
    if (!err && row && row.count === 0) {
      const stmt = db.prepare('INSERT INTO client_milestones (project_id, client_email, title, phase, description, status, due_date, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      stmt.run(1, 'user@zyllotech.com', 'System Architecture & Data Schema Sign-off', 'Sprint 1', 'Architectural blueprint approved for microservices and vector DB indexing pipeline.', 'Completed', '05 Oct 2026', '2026-10-05 14:00:00');
      stmt.run(1, 'user@zyllotech.com', 'Model Fine-tuning & RAG Pipeline Deployment', 'Sprint 2', 'Integrated domain-specific embeddings and low-latency hybrid search engine.', 'Completed', '15 Oct 2026', '2026-10-15 18:30:00');
      stmt.run(1, 'user@zyllotech.com', 'Frontend Portal & Dashboard Integration', 'Sprint 3', 'Connecting multi-tenant UI components with enterprise RBAC authentication.', 'In Progress', '28 Oct 2026', null);
      stmt.run(1, 'user@zyllotech.com', 'End-to-End Penetration Testing & SLA Audit', 'Sprint 4', 'Security hardening, load stress tests up to 25k concurrent users, and zero-downtime cutover.', 'Pending', '15 Nov 2026', null);
      stmt.finalize();
    }
  });

  db.get("SELECT COUNT(*) AS count FROM client_deliverables WHERE client_email = 'user@zyllotech.com'", (err, row) => {
    if (!err && row && row.count === 0) {
      const stmt = db.prepare('INSERT INTO client_deliverables (project_id, client_email, title, deliverable_type, file_url, version, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
      stmt.run(1, 'user@zyllotech.com', 'Enterprise System Architecture & API Blueprint', 'Architecture Spec', '/assets/docs/HyperCloud_Architecture_v1.2.pdf', 'v1.2', 'Approved');
      stmt.run(1, 'user@zyllotech.com', 'Interactive High-Fidelity Figma Component Suite', 'Figma Prototype', 'https://figma.com/file/sample-zyllotech-hypercloud', 'v2.0', 'Approved');
      stmt.run(1, 'user@zyllotech.com', 'Sprint 3 Staging Build & Test Suite', 'Source Code / Build', 'https://staging.zyllotech.com/hypercloud-preview', 'v0.9-rc', 'Ready for Review');
      stmt.run(1, 'user@zyllotech.com', 'REST & GraphQL Security Audit Report', 'QA Report', '/assets/docs/Security_Audit_Sprint2.pdf', 'v1.0', 'Approved');
      stmt.finalize();
    }
  });

  db.get("SELECT COUNT(*) AS count FROM client_meeting_notes WHERE client_email = 'user@zyllotech.com'", (err, row) => {
    if (!err && row && row.count === 0) {
      const stmt = db.prepare('INSERT INTO client_meeting_notes (project_id, client_email, title, meeting_date, attendees, summary, action_items) VALUES (?, ?, ?, ?, ?, ?, ?)');
      stmt.run(
        1,
        'user@zyllotech.com',
        'Sprint 2 Review & Model Performance Evaluation',
        '16 Oct 2026',
        'Alex Morgan (Client VP), Zyllo Lead Architect, QA Lead',
        'Reviewed vector search response latency (38ms average). Confirmed accuracy benchmarks exceed 96.4% on validation set. Approved progression into UI dashboard integration.',
        '1. Zyllo team to deploy staging release candidate by Oct 28.\n2. HyperCloud IT team to provision production VPC peering credentials.\n3. Scheduled next sync for Nov 02.'
      );
      stmt.run(
        1,
        'user@zyllotech.com',
        'Architecture Kickoff & Scope Validation',
        '02 Oct 2026',
        'Alex Morgan, Zyllo Solutions Director',
        'Finalized project boundaries, data retention compliance (SOC2/GDPR), and established bi-weekly milestone sign-offs.',
        '1. Architecture sign-off completed.\n2. CI/CD automated test harness initiated.'
      );
      stmt.finalize();
    }
  });

  db.get("SELECT COUNT(*) AS count FROM support_tickets WHERE client_email = 'user@zyllotech.com'", (err, row) => {
    if (!err && row && row.count === 0) {
      const stmt = db.prepare('INSERT INTO support_tickets (client_email, client_name, project_id, subject, category, priority, message, status, admin_response) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      stmt.run(
        'user@zyllotech.com',
        'Alex Morgan',
        1,
        'VPC Peering CIDR block confirmation for staging environment',
        'Deployment',
        'Medium',
        'Could the infrastructure team confirm whether 10.120.0.0/16 is acceptable for the staging VPC peering connection?',
        'Resolved',
        'Confirmed. 10.120.0.0/16 has been whitelisted on our AWS transit gateway. Connectivity tests succeeded.'
      );
      stmt.finalize();
    }
  });

  // ==================== EMPLOYEE PORTAL SCHEMA & SEED DATA (IMAGE 2) ====================
  db.run(`
    CREATE TABLE IF NOT EXISTS employee_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      emp_id TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      designation TEXT NOT NULL,
      department TEXT NOT NULL,
      joining_date TEXT NOT NULL,
      manager_name TEXT NOT NULL,
      phone TEXT,
      work_location TEXT,
      pan_number TEXT,
      uan_number TEXT,
      bank_name TEXT,
      bank_account TEXT,
      ifsc_code TEXT,
      emergency_contact TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS employee_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      emp_id TEXT NOT NULL,
      email TEXT NOT NULL,
      date TEXT NOT NULL,
      punch_in TEXT NOT NULL,
      punch_out TEXT,
      work_hours TEXT,
      status TEXT NOT NULL DEFAULT 'Present'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS employee_leaves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      emp_id TEXT NOT NULL,
      email TEXT NOT NULL,
      leave_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      days INTEGER NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS employee_payslips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      emp_id TEXT NOT NULL,
      email TEXT NOT NULL,
      month_year TEXT NOT NULL,
      basic_salary REAL NOT NULL,
      hra REAL NOT NULL,
      special_allowance REAL NOT NULL,
      gross_salary REAL NOT NULL,
      pf_deduction REAL NOT NULL,
      prof_tax REAL NOT NULL,
      tds_tax REAL NOT NULL,
      net_take_home REAL NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'Paid',
      paid_on TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS employee_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      emp_id TEXT NOT NULL,
      email TEXT NOT NULL,
      title TEXT NOT NULL,
      doc_type TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_size TEXT NOT NULL,
      uploaded_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS employee_hr_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      emp_id TEXT NOT NULL,
      email TEXT NOT NULL,
      category TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'Medium',
      status TEXT NOT NULL DEFAULT 'Open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      hr_response TEXT
    )
  `);

  // Seed default employee profile
  db.get("SELECT COUNT(*) AS count FROM employee_profiles WHERE email = 'user@zyllotech.com'", (err, row) => {
    if (!err && row && row.count === 0) {
      const stmt = db.prepare(`
        INSERT INTO employee_profiles (
          emp_id, email, full_name, designation, department, joining_date, manager_name,
          phone, work_location, pan_number, uan_number, bank_name, bank_account, ifsc_code, emergency_contact
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        'ZY-EMP-1042',
        'user@zyllotech.com',
        'Alex Morgan',
        'Senior Full-Stack & AI Solutions Engineer',
        'Engineering & Applied AI Pod',
        '15 Jan 2024',
        'Dr. K. Srinivas (VP of Engineering)',
        '+91 98480 22334',
        'Guntur Tech Hub / Hybrid Global',
        'ABCDE1234F',
        '101234567890',
        'HDFC Bank Ltd.',
        '••••••••4921',
        'HDFC0001248',
        'Rajesh Morgan (+91 98480 99887)'
      );

      const moreEmployees = [
        ['ZY-EMP-1043', 'vikram.rao@zyllotech.com', 'Vikram Rao', 'Frontend UI/UX & React Engineer', 'Frontend & Design Pod', '01 Jun 2024', 'Alex Morgan (Lead Engineer)', '+91 98480 33445', 'Guntur Tech Hub', 'FGHIJ5678K', '101234567891', 'ICICI Bank', '••••••••8812', 'ICIC0001002', 'Sunita Rao (+91 98480 77665)'],
        ['ZY-EMP-1044', 'sneha.patel@zyllotech.com', 'Sneha Patel', 'Cloud DevOps & Kubernetes Lead', 'Cloud & Infrastructure Pod', '10 Feb 2024', 'Dr. K. Srinivas (VP of Engineering)', '+91 98480 44556', 'Hyderabad Remote Pod', 'KLMNO9012P', '101234567892', 'Axis Bank', '••••••••3390', 'UTIB0000456', 'Kiran Patel (+91 98480 66554)'],
        ['ZY-EMP-1045', 'ananya.roy@zyllotech.com', 'Ananya Roy', 'AI Research & NLP Specialist', 'Engineering & Applied AI Pod', '15 Mar 2024', 'Dr. K. Srinivas (VP of Engineering)', '+91 98480 55667', 'Bangalore Remote Pod', 'PQRST3456U', '101234567893', 'HDFC Bank Ltd.', '••••••••7721', 'HDFC0001248', 'Debashish Roy (+91 98480 55443)'],
        ['ZY-EMP-1046', 'karthik.nair@zyllotech.com', 'Karthik Nair', 'Senior Backend & Security Engineer', 'Backend & Security Pod', '01 Aug 2024', 'Alex Morgan (Lead Engineer)', '+91 98480 66778', 'Guntur Tech Hub', 'UVWXY7890Z', '101234567894', 'State Bank of India', '••••••••1145', 'SBIN0004567', 'Meera Nair (+91 98480 44332)'],
        ['ZY-EMP-1040', 'srinivas@zyllotech.com', 'Dr. K. Srinivas', 'VP of Engineering & Pod Director', 'Engineering Leadership', '10 Jan 2023', 'Dr. S. K. Roy (CTO)', '+91 98480 11223', 'Guntur Tech Hub', 'ABCDE9999Z', '101234567800', 'HDFC Bank Ltd.', '••••••••9001', 'HDFC0001248', 'Lakshmi Srinivas (+91 98480 22110)'],
        ['ZY-EMP-1041', 'hr@zyllotech.com', 'Priya Sharma', 'HR & People Operations Lead', 'People & Culture', '05 Jan 2024', 'Dr. S. K. Roy (CTO)', '+91 98480 77889', 'Guntur Tech Hub', 'BCDEF8888Y', '101234567801', 'Kotak Mahindra Bank', '••••••••5512', 'KKBK0000889', 'Amit Sharma (+91 98480 33221)']
      ];
      moreEmployees.forEach(e => stmt.run(...e));
      stmt.finalize();

      // Seed Attendance
      const attStmt = db.prepare('INSERT INTO employee_attendance (emp_id, email, date, punch_in, punch_out, work_hours, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
      attStmt.run('ZY-EMP-1042', 'user@zyllotech.com', '2026-10-21', '09:15 AM', '--:--', 'In Progress', 'Present');
      attStmt.run('ZY-EMP-1042', 'user@zyllotech.com', '2026-10-20', '09:20 AM', '06:35 PM', '9h 15m', 'Present');
      attStmt.run('ZY-EMP-1042', 'user@zyllotech.com', '2026-10-19', '09:30 AM', '06:45 PM', '9h 15m', 'Work From Home');
      attStmt.run('ZY-EMP-1042', 'user@zyllotech.com', '2026-10-18', '09:12 AM', '06:22 PM', '9h 10m', 'Present');
      attStmt.run('ZY-EMP-1042', 'user@zyllotech.com', '2026-10-17', '09:25 AM', '06:30 PM', '9h 05m', 'Present');
      attStmt.run('ZY-EMP-1042', 'user@zyllotech.com', '2026-10-16', '09:15 AM', '06:30 PM', '9h 15m', 'Present');
      attStmt.run('ZY-EMP-1042', 'user@zyllotech.com', '2026-10-15', '09:40 AM', '06:40 PM', '9h 00m', 'Work From Home');
      attStmt.finalize();

      // Seed Leaves
      const leaveStmt = db.prepare('INSERT INTO employee_leaves (emp_id, email, leave_type, start_date, end_date, days, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      leaveStmt.run('ZY-EMP-1042', 'user@zyllotech.com', 'Casual Leave', '14 Aug 2026', '15 Aug 2026', 2, 'Family function in hometown', 'Approved');
      leaveStmt.run('ZY-EMP-1042', 'user@zyllotech.com', 'Sick Leave', '02 Jul 2026', '02 Jul 2026', 1, 'Routine medical consultation', 'Approved');
      leaveStmt.run('ZY-EMP-1042', 'user@zyllotech.com', 'Earned Leave', '28 Oct 2026', '29 Oct 2026', 2, 'Diwali festival travel', 'Pending');
      leaveStmt.finalize();

      // Seed Payslips (in INR)
      const payStmt = db.prepare('INSERT INTO employee_payslips (emp_id, email, month_year, basic_salary, hra, special_allowance, gross_salary, pf_deduction, prof_tax, tds_tax, net_take_home, payment_status, paid_on) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      payStmt.run('ZY-EMP-1042', 'user@zyllotech.com', 'September 2026', 52500, 26250, 26250, 105000, 1800, 200, 14550, 88450, 'Paid', '30 Sep 2026');
      payStmt.run('ZY-EMP-1042', 'user@zyllotech.com', 'August 2026', 52500, 26250, 26250, 105000, 1800, 200, 14550, 88450, 'Paid', '31 Aug 2026');
      payStmt.run('ZY-EMP-1042', 'user@zyllotech.com', 'July 2026', 52500, 26250, 26250, 105000, 1800, 200, 14550, 88450, 'Paid', '31 Jul 2026');
      payStmt.run('ZY-EMP-1042', 'user@zyllotech.com', 'June 2026', 52500, 26250, 26250, 105000, 1800, 200, 14550, 88450, 'Paid', '30 Jun 2026');
      payStmt.finalize();

      // Seed Documents
      const docStmt = db.prepare('INSERT INTO employee_documents (emp_id, email, title, doc_type, file_url, file_size, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
      docStmt.run('ZY-EMP-1042', 'user@zyllotech.com', 'Official Appointment Order & Offer Letter', 'Appointment Letter', '/assets/docs/Zyllo_Appointment_ZY1042.pdf', '1.4 MB', '15 Jan 2024');
      docStmt.run('ZY-EMP-1042', 'user@zyllotech.com', 'Employee Non-Disclosure & IP Agreement (NDA)', 'Legal Agreement', '/assets/docs/Zyllo_NDA_ZY1042.pdf', '980 KB', '16 Jan 2024');
      docStmt.run('ZY-EMP-1042', 'user@zyllotech.com', 'Form 16 Tax Withholding Certificate (FY 2025-26)', 'Tax Certificate', '/assets/docs/Form16_FY2526_ZY1042.pdf', '2.1 MB', '10 Jun 2026');
      docStmt.run('ZY-EMP-1042', 'user@zyllotech.com', 'Annual Merit & Compensation Revision Letter 2026', 'Appraisal Letter', '/assets/docs/Appraisal_Letter_2026.pdf', '640 KB', '01 Apr 2026');
      docStmt.finalize();

      // Seed HR Tickets
      const hrStmt = db.prepare('INSERT INTO employee_hr_tickets (emp_id, email, category, subject, description, priority, status, hr_response) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      hrStmt.run(
        'ZY-EMP-1042',
        'user@zyllotech.com',
        'Payroll & Tax',
        'Investment proof submission window confirmation',
        'Could HR please confirm the last date for submitting 80C & medical insurance receipts?',
        'Medium',
        'Resolved',
        'The tax proof portal window is open until November 15th, 2026. Please upload through the Documents section.'
      );
      hrStmt.run(
        'ZY-EMP-1042',
        'user@zyllotech.com',
        'IT & Hardware',
        'Secondary 4K display requisition for AI model testing',
        'Requisitioning an additional high-res display for prompt evaluation workflows.',
        'Low',
        'In Progress',
        'Requisition approved by Dr. Srinivas. Hardware pod is dispatching the Dell UltraSharp 4K monitor this week.'
      );
      hrStmt.finalize();
    }
  });

  // ==================== HR CANDIDATE EMAIL TRACKING SCHEMA ====================
  db.run(`
    CREATE TABLE IF NOT EXISTS hr_candidate_emails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tracking_id TEXT UNIQUE NOT NULL,
      candidate_id INTEGER,
      candidate_name TEXT NOT NULL,
      candidate_email TEXT NOT NULL,
      sender_email TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      subject TEXT NOT NULL,
      body_html TEXT NOT NULL,
      body_text TEXT,
      tracking_enabled INTEGER DEFAULT 1,
      delivery_status TEXT DEFAULT 'Delivered',
      delivery_details TEXT,
      open_status TEXT DEFAULT 'Not detected',
      open_count INTEGER DEFAULT 0,
      first_opened_at DATETIME,
      last_opened_at DATETIME,
      attachments_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS hr_email_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email_id INTEGER NOT NULL,
      tracking_id TEXT NOT NULL,
      event_type TEXT DEFAULT 'open',
      ip_address TEXT,
      user_agent TEXT,
      opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_bot_scanner INTEGER DEFAULT 0,
      FOREIGN KEY (email_id) REFERENCES hr_candidate_emails(id) ON DELETE CASCADE
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_hr_candidate_emails_tracking ON hr_candidate_emails(tracking_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_hr_candidate_emails_candidate ON hr_candidate_emails(candidate_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_hr_email_events_email ON hr_email_events(email_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_hr_email_events_tracking ON hr_email_events(tracking_id)`);

  // Sync career application confirmation emails from email_logs into hr_candidate_emails
  db.all(
    `SELECT 
      l.id, l.tracking_id, l.application_id, l.sender, l.recipient, l.recipient_name,
      l.subject, l.html_content, l.status, l.open_count, l.first_opened_at, l.last_opened_at, l.created_at
     FROM email_logs l
     WHERE l.type IN ('job_confirmation', 'status_update')`,
    [],
    (err, rows) => {
      if (!err && rows && rows.length > 0) {
        const stmt = db.prepare(`
          INSERT INTO hr_candidate_emails (
            tracking_id, candidate_id, candidate_name, candidate_email,
            sender_email, sender_name, subject, body_html, body_text,
            tracking_enabled, delivery_status, delivery_details, open_status, open_count,
            first_opened_at, last_opened_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'Delivered via Careers Auto-Mailer', ?, ?, ?, ?, ?)
          ON CONFLICT(tracking_id) DO UPDATE SET
            open_status = excluded.open_status,
            open_count = excluded.open_count,
            first_opened_at = excluded.first_opened_at,
            last_opened_at = excluded.last_opened_at
        `);
        rows.forEach(r => {
          const isOpened = r.status === 'Opened' || (r.open_count && r.open_count > 0);
          const openStatus = isOpened ? 'Opened' : 'Not detected';
          const deliveryStatus = r.status === 'Local Outbox' ? 'Queued' : 'Delivered';
          const senderName = r.type === 'status_update' ? 'Priya Sharma (HR Operations)' : 'Zyllo Tech Careers Auto-Desk';
          stmt.run(
            r.tracking_id,
            r.application_id,
            r.recipient_name || 'Candidate',
            r.recipient,
            r.sender || 'haasethabhiram@gmail.com',
            senderName,
            r.subject,
            r.html_content,
            r.subject,
            deliveryStatus,
            openStatus,
            r.open_count || 0,
            r.first_opened_at,
            r.last_opened_at || r.first_opened_at,
            r.created_at
          );
        });
        stmt.finalize();
      }
    }
  );
});

module.exports = db;
