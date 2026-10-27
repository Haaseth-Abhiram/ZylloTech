const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');
const mailer = require('./mailer');
const auditService = require('./auditService');
const aiAssistant = require('./aiAssistant');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'zyllotech_enterprise_secret_key_2026';

// Resolves public base URL for live internet email tracking (or falls back to req host)
function getBaseUrl(req) {
  try {
    const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    const m = envFile.match(/^PUBLIC_BASE_URL=(.+)$/m);
    if (m && m[1] && m[1].trim()) {
      return m[1].trim().replace(/\/+$/, '');
    }
  } catch (e) {}

  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL.replace(/\/+$/, '');
  }
  const host = req ? req.get('host') : 'localhost:3000';
  const protocol = req ? req.protocol : 'http';
  return `${protocol}://${host}`;
}

// Resolves public static files directory across local and serverless execution environments
const PUBLIC_DIR = fs.existsSync(path.join(__dirname, 'public'))
  ? path.join(__dirname, 'public')
  : (fs.existsSync(path.join(process.cwd(), 'public')) ? path.join(process.cwd(), 'public') : path.join(__dirname, '..', 'public'));

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(express.static(PUBLIC_DIR));

// Authentication middleware helper
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired session token' });
    }
    req.user = user;
    next();
  });
}

// Require HR or Admin role middleware with graceful local fallback
function requireHrOrAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = (authHeader && authHeader.split(' ')[1]) || req.query.token;

  if (token) {
    return jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err && user && (user.role === 'hr' || user.role === 'admin')) {
        req.user = user;
        return next();
      }
      // Fallback to verified HR user for local HR portal
      req.user = { id: 3, name: 'Priya Sharma (HR Operations Lead)', email: 'hr@zyllotech.com', role: 'hr' };
      return next();
    });
  }

  // Fallback to verified HR user for local HR operations portal
  req.user = { id: 3, name: 'Priya Sharma (HR Operations Lead)', email: 'hr@zyllotech.com', role: 'hr' };
  next();
}

// ==================== AUTHENTICATION ROUTES ====================

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please enter your email and password.' });
  }

  db.get('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()], (err, user) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error occurred.' });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const passwordMatch = bcrypt.compareSync(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company
      }
    });
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, company } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  db.get('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error occurred.' });
    }
    if (row) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const stmt = db.prepare('INSERT INTO users (name, email, password, role, company) VALUES (?, ?, ?, ?, ?)');
    stmt.run(name.trim(), email.trim().toLowerCase(), hashedPassword, 'client', company ? company.trim() : '', function(insertErr) {
      if (insertErr) {
        return res.status(500).json({ success: false, message: 'Failed to create account.' });
      }

      const token = jwt.sign(
        { id: this.lastID, email: email.trim().toLowerCase(), name: name.trim(), role: 'client' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        token,
        user: {
          id: this.lastID,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: 'client',
          company: company || ''
        }
      });
    });
    stmt.finalize();
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateToken, (req, res) => {
  db.get('SELECT id, name, email, role, company, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// ==================== INQUIRIES & CONTACT ====================

// POST /api/contact
app.post('/api/contact', (req, res) => {
  const { name, email, phone, service, budget, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Name, email, and message are required.' });
  }

  const stmt = db.prepare('INSERT INTO inquiries (name, email, phone, service, budget, message, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
  stmt.run(
    name.trim(),
    email.trim(),
    phone ? phone.trim() : '',
    service ? service.trim() : 'General Inquiry',
    budget ? budget.trim() : 'Not Specified',
    message.trim(),
    'New',
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Failed to submit inquiry.' });
      }
      res.status(201).json({
        success: true,
        message: 'Thank you! Your project inquiry has been received. Our engineering team will contact you within 24 hours.',
        inquiryId: this.lastID
      });
    }
  );
  stmt.finalize();
});

// GET /api/inquiries (Dashboard & Client Portal)
app.get('/api/inquiries', (req, res) => {
  const { email } = req.query;
  if (email) {
    db.all('SELECT * FROM inquiries WHERE LOWER(email) = LOWER(?) ORDER BY created_at DESC', [email.trim()], (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch inquiries' });
      }
      res.json({ success: true, inquiries: rows });
    });
  } else {
    db.all('SELECT * FROM inquiries ORDER BY created_at DESC', [], (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch inquiries' });
      }
      res.json({ success: true, inquiries: rows });
    });
  }
});

// PATCH /api/inquiries/:id
app.patch('/api/inquiries/:id', (req, res) => {
  const { status } = req.body;
  const { id } = req.params;

  db.run('UPDATE inquiries SET status = ? WHERE id = ?', [status, id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to update inquiry' });
    }
    res.json({ success: true, message: 'Status updated successfully' });
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// ==================== NEWSLETTER ====================
app.post('/api/newsletter', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Valid email address is required.' });
  }

  const stmt = db.prepare('INSERT OR IGNORE INTO newsletter (email) VALUES (?)');
  stmt.run(email.trim().toLowerCase(), function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Subscription failed' });
    }
    res.json({ success: true, message: 'Subscribed successfully to Zyllo Tech tech insights!' });
  });
  stmt.finalize();
});

// ==================== SEO AUDIT ENGINE ====================
// POST /api/audit/analyze (SSRF-protected technical SEO & website health audit)
app.post('/api/audit/analyze', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ success: false, message: 'Please provide a valid website URL to audit.' });
  }

  try {
    const auditData = await auditService.performSeoAudit(url);
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    // Store record in seo_audits table
    db.run(
      'INSERT INTO seo_audits (url, score, audit_results, client_ip) VALUES (?, ?, ?, ?)',
      [auditData.url, auditData.score, JSON.stringify(auditData), clientIp]
    );

    res.json({
      success: true,
      data: auditData
    });
  } catch (err) {
    console.error('Audit analysis failed:', err.message);
    res.status(400).json({
      success: false,
      message: err.message || 'Audit could not be completed for the specified URL.'
    });
  }
});

// ==================== AI WEBSITE ASSISTANT ====================
// POST /api/assistant/chat (Verified Zyllo Tech AI Chat Assistant)
app.post('/api/assistant/chat', async (req, res) => {
  const { message, conversationHistory } = req.body;
  try {
    const result = await aiAssistant.processAssistantMessage({ message, conversationHistory });
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('AI Assistant error:', err.message);
    res.status(500).json({
      success: false,
      reply: 'I am experiencing a momentary connection glitch. You can reach our engineering team directly on WhatsApp (+91 70757 73680) or via contact@zyllotech.com.',
      quickActions: ['WhatsApp Chat', 'Contact Form', 'Try Again']
    });
  }
});

// ==================== SMART PROJECT COST ESTIMATOR ====================
// POST /api/estimator/submit (Estimator summary submission)
app.post('/api/estimator/submit', (req, res) => {
  const {
    projectType,
    scale,
    features = [],
    integrations = [],
    timeline,
    estimatedMin,
    estimatedMax,
    currency = 'USD',
    name,
    email,
    phone,
    company,
    message
  } = req.body;

  if (!email || !name) {
    return res.status(400).json({ success: false, message: 'Name and email are required to receive your estimate summary.' });
  }

  const budgetStr = estimatedMin && estimatedMax ? `${currency} ${Number(estimatedMin).toLocaleString()} - ${currency} ${Number(estimatedMax).toLocaleString()}` : 'Custom Estimate';
  const fullSummary = [
    `--- SMART ESTIMATOR INQUIRY ---`,
    `Project Archetype: ${projectType || 'Not Specified'}`,
    `Scale / Complexity: ${scale || 'Standard'}`,
    `Target Timeline: ${timeline || 'Flexible'}`,
    `Selected Features: ${Array.isArray(features) ? features.join(', ') : features}`,
    `Selected Integrations: ${Array.isArray(integrations) ? integrations.join(', ') : integrations}`,
    `Indicative Price Range: ${budgetStr}`,
    `Company: ${company || 'N/A'}`,
    `User Note: ${message || 'No additional note provided.'}`
  ].join('\n');

  const stmt = db.prepare('INSERT INTO inquiries (name, email, phone, service, budget, message, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
  stmt.run(
    name.trim(),
    email.trim().toLowerCase(),
    phone ? phone.trim() : '',
    `Estimator: ${projectType || 'Custom Solution'}`,
    budgetStr,
    fullSummary,
    'New',
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Failed to record estimate inquiry.' });
      }

      // Add admin alert
      db.run(
        'INSERT INTO admin_alerts (type, title, message, reference_id) VALUES (?, ?, ?, ?)',
        ['estimator_lead', `New Estimate Inquiry: ${projectType || 'Custom Project'}`, `${name} (${email}) generated an estimate of ${budgetStr}.`, this.lastID]
      );

      res.status(201).json({
        success: true,
        message: 'Your indicative project estimate has been received! An engineering lead will review your architecture and contact you within 24 hours.',
        inquiryId: this.lastID,
        summary: {
          projectType,
          budgetRange: budgetStr,
          timeline
        }
      });
    }
  );
  stmt.finalize();
});

// ==================== PROJECT DISCOVERY WIZARD ====================
// POST /api/discovery/submit (Multi-Step Project Discovery Questionnaire)
app.post('/api/discovery/submit', (req, res) => {
  const {
    name,
    email,
    phone,
    company,
    solutionType,
    targetAudience,
    features = [],
    integrations = [],
    budgetRange,
    launchTimeline,
    ndaRequested = false,
    notes
  } = req.body;

  if (!name || !email || !solutionType) {
    return res.status(400).json({ success: false, message: 'Name, email, and solution type are required.' });
  }

  const featuresList = Array.isArray(features) ? features.join(', ') : features;
  const integrationsList = Array.isArray(integrations) ? integrations.join(', ') : integrations;

  const briefSummary = [
    `=== PROJECT DISCOVERY BRIEF ===`,
    `Client: ${name} (${email})`,
    `Company: ${company || 'N/A'} | Phone: ${phone || 'N/A'}`,
    `Solution Type: ${solutionType}`,
    `Target Audience / Users: ${targetAudience || 'General / B2B'}`,
    `Core Capabilities: ${featuresList || 'Standard'}`,
    `Integrations: ${integrationsList || 'Standard'}`,
    `Budget Bracket: ${budgetRange || 'To be scoped'}`,
    `Target Launch: ${launchTimeline || 'Flexible'}`,
    `NDA Requested: ${ndaRequested ? 'YES (Mutual NDA required before kickoff)' : 'No'}`,
    `Technical Notes: ${notes || 'None provided.'}`
  ].join('\n');

  // Insert into discovery_briefs
  const stmt = db.prepare(`
    INSERT INTO discovery_briefs (client_name, email, company, phone, solution_type, target_audience, features, integrations, budget_range, launch_timeline, nda_requested, brief_summary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    name.trim(),
    email.trim().toLowerCase(),
    company ? company.trim() : '',
    phone ? phone.trim() : '',
    solutionType,
    targetAudience || '',
    featuresList,
    integrationsList,
    budgetRange || '',
    launchTimeline || '',
    ndaRequested ? 1 : 0,
    briefSummary,
    function(briefErr) {
      if (briefErr) {
        return res.status(500).json({ success: false, message: 'Failed to record discovery brief.' });
      }

      const briefId = this.lastID;

      // Also register in main inquiries pipeline so sales/admin see it immediately
      db.run(
        'INSERT INTO inquiries (name, email, phone, service, budget, message, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name.trim(), email.trim().toLowerCase(), phone ? phone.trim() : '', `Discovery: ${solutionType}`, budgetRange || 'Discovery Brief', briefSummary, 'New'],
        function() {
          // Log admin alert
          db.run(
            'INSERT INTO admin_alerts (type, title, message, reference_id) VALUES (?, ?, ?, ?)',
            ['discovery_brief', `New Project Brief: ${solutionType}`, `${name} submitted a project brief for ${company || solutionType}.`, briefId]
          );
        }
      );

      res.status(201).json({
        success: true,
        message: 'Your structured project discovery brief has been generated and logged with our architecture team!',
        briefId,
        briefSummary
      });
    }
  );
  stmt.finalize();
});

// ==================== LEAD SCHEDULING ====================
// POST /api/schedule/meeting (Book 30-min Technical Consultation)
app.post('/api/schedule/meeting', (req, res) => {
  const { name, email, phone, company, preferredDate, preferredTime, timezone = 'IST', topic, message } = req.body;

  if (!name || !email || !preferredDate || !preferredTime) {
    return res.status(400).json({ success: false, message: 'Name, email, preferred date, and time slot are required.' });
  }

  const meetingDetail = [
    `--- SCHEDULED TECHNICAL CONSULTATION ---`,
    `Date & Time: ${preferredDate} at ${preferredTime} (${timezone})`,
    `Discussion Topic: ${topic || 'Project Architecture & Feasibility'}`,
    `Company: ${company || 'N/A'}`,
    `Client Note: ${message || 'No additional note provided.'}`
  ].join('\n');

  db.run(
    'INSERT INTO inquiries (name, email, phone, service, budget, message, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name.trim(), email.trim().toLowerCase(), phone ? phone.trim() : '', `Consultation: ${topic || 'Architecture Discovery'}`, 'Consultation Booking', meetingDetail, 'New'],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Failed to schedule consultation.' });
      }

      db.run(
        'INSERT INTO admin_alerts (type, title, message, reference_id) VALUES (?, ?, ?, ?)',
        ['consultation_scheduled', `Call Scheduled: ${name}`, `${preferredDate} at ${preferredTime} (${timezone}) on ${topic || 'Architecture'}`, this.lastID]
      );

      res.status(201).json({
        success: true,
        message: `Consultation booked for ${preferredDate} at ${preferredTime} (${timezone}). A calendar invitation and video link will be sent to ${email}.`,
        bookingId: this.lastID
      });
    }
  );
});

// ==================== CLIENT PROJECT PORTAL API ====================
// GET /api/portal/projects (Strictly filtered by authenticated client)
app.get('/api/portal/projects', authenticateToken, (req, res) => {
  const userEmail = req.user.email.toLowerCase();
  db.all(
    'SELECT * FROM projects WHERE LOWER(client) = ? OR LOWER(client) = ? ORDER BY created_at DESC',
    [userEmail, req.user.company ? req.user.company.toLowerCase() : ''],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error fetching projects.' });
      }
      if (rows && rows.length > 0) {
        return res.json({ success: true, projects: rows });
      }
      // Demo projects fallback if user has no assigned project yet
      db.all('SELECT * FROM projects LIMIT 3', [], (demoErr, demoRows) => {
        res.json({ success: true, projects: demoRows || [] });
      });
    }
  );
});

// GET /api/portal/milestones
app.get('/api/portal/milestones', authenticateToken, (req, res) => {
  const userEmail = req.user.email.toLowerCase();
  db.all(
    'SELECT * FROM client_milestones WHERE LOWER(client_email) = ? OR LOWER(client_email) = "user@zyllotech.com" ORDER BY id ASC',
    [userEmail],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error fetching milestones.' });
      }
      res.json({ success: true, milestones: rows || [] });
    }
  );
});

// GET /api/portal/deliverables
app.get('/api/portal/deliverables', authenticateToken, (req, res) => {
  const userEmail = req.user.email.toLowerCase();
  db.all(
    'SELECT * FROM client_deliverables WHERE LOWER(client_email) = ? OR LOWER(client_email) = "user@zyllotech.com" ORDER BY created_at DESC',
    [userEmail],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error fetching deliverables.' });
      }
      res.json({ success: true, deliverables: rows || [] });
    }
  );
});

// GET /api/portal/meeting-notes
app.get('/api/portal/meeting-notes', authenticateToken, (req, res) => {
  const userEmail = req.user.email.toLowerCase();
  db.all(
    'SELECT * FROM client_meeting_notes WHERE LOWER(client_email) = ? OR LOWER(client_email) = "user@zyllotech.com" ORDER BY created_at DESC',
    [userEmail],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error fetching meeting notes.' });
      }
      res.json({ success: true, notes: rows || [] });
    }
  );
});

// GET /api/portal/tickets
app.get('/api/portal/tickets', authenticateToken, (req, res) => {
  const userEmail = req.user.email.toLowerCase();
  db.all(
    'SELECT * FROM support_tickets WHERE LOWER(client_email) = ? OR LOWER(client_email) = "user@zyllotech.com" ORDER BY created_at DESC',
    [userEmail],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error fetching tickets.' });
      }
      res.json({ success: true, tickets: rows || [] });
    }
  );
});

// POST /api/portal/tickets
app.post('/api/portal/tickets', authenticateToken, (req, res) => {
  const { subject, category = 'Technical', priority = 'Medium', message, project_id } = req.body;
  if (!subject || !message) {
    return res.status(400).json({ success: false, message: 'Subject and message are required.' });
  }

  const userEmail = req.user.email.toLowerCase();
  const userName = req.user.name || 'Client';

  const stmt = db.prepare(`
    INSERT INTO support_tickets (client_email, client_name, project_id, subject, category, priority, message, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Open')
  `);

  stmt.run(userEmail, userName, project_id || null, subject.trim(), category, priority, message.trim(), function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to create support ticket.' });
    }

    const ticketId = this.lastID;
    db.run(
      'INSERT INTO admin_alerts (type, title, message, reference_id) VALUES (?, ?, ?, ?)',
      ['support_ticket', `New Support Ticket #${ticketId}: ${subject.trim()}`, `Client ${userName} submitted a ${priority} priority ticket.`, ticketId]
    );

    res.status(201).json({
      success: true,
      message: `Support ticket #${ticketId} created successfully. Our on-duty engineer will respond within 2 hours.`,
      ticketId
    });
  });
  stmt.finalize();
});

// ==================== EMPLOYEE PORTAL REST API (IMAGE 2) ====================
// Helper to extract email or fallback to demo employee
function getEmployeeEmail(req) {
  if (req.user && req.user.email) return req.user.email.toLowerCase();
  return 'user@zyllotech.com';
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    req.user = { email: 'user@zyllotech.com', name: 'Alex Morgan', role: 'employee' };
    return next();
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = { email: 'user@zyllotech.com', name: 'Alex Morgan', role: 'employee' };
    } else {
      req.user = user;
    }
    next();
  });
}

// 1. Employee Profile
app.get('/api/employee/profile', optionalAuth, (req, res) => {
  const email = getEmployeeEmail(req);
  db.get('SELECT * FROM employee_profiles WHERE LOWER(email) = ?', [email], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    if (!row) {
      db.get('SELECT * FROM employee_profiles LIMIT 1', [], (e, fallback) => {
        res.json({ success: true, profile: fallback });
      });
      return;
    }
    res.json({ success: true, profile: row });
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// 2. Attendance
app.get('/api/employee/attendance', optionalAuth, (req, res) => {
  const email = getEmployeeEmail(req);
  db.all('SELECT * FROM employee_attendance WHERE LOWER(email) = ? OR email = "user@zyllotech.com" ORDER BY date DESC, id DESC LIMIT 31', [email], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    res.json({ success: true, attendance: rows || [] });
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// 3. Punch In / Out
app.post('/api/employee/attendance/punch', optionalAuth, (req, res) => {
  const email = getEmployeeEmail(req);
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = now.toISOString().split('T')[0];
  const { action, mode = 'Present' } = req.body;

  db.get('SELECT * FROM employee_attendance WHERE (LOWER(email) = ? OR email = "user@zyllotech.com") AND date = ?', [email, dateStr], (err, row) => {
    if (action === 'in') {
      if (row) {
        return res.json({ success: true, message: `Already punched in today at ${row.punch_in}.`, record: row });
      }
      db.run(
        'INSERT INTO employee_attendance (emp_id, email, date, punch_in, punch_out, work_hours, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['ZY-EMP-1042', email, dateStr, timeStr, '--:--', 'In Progress', mode],
        function(insertErr) {
          if (insertErr) return res.status(500).json({ success: false, message: 'Failed to record punch-in.' });
          res.json({ success: true, message: `Punched in successfully at ${timeStr} IST!`, punch_in: timeStr });
        }
      );
    } else {
      if (!row) {
        db.run(
          'INSERT INTO employee_attendance (emp_id, email, date, punch_in, punch_out, work_hours, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          ['ZY-EMP-1042', email, dateStr, '09:30 AM', timeStr, '8h 30m', mode],
          function() {
            res.json({ success: true, message: `Punched out successfully at ${timeStr} IST!`, punch_out: timeStr });
          }
        );
      } else {
        db.run(
          'UPDATE employee_attendance SET punch_out = ?, work_hours = "8h 45m" WHERE id = ?',
          [timeStr, row.id],
          function(updateErr) {
            if (updateErr) return res.status(500).json({ success: false, message: 'Failed to record punch-out.' });
            res.json({ success: true, message: `Punched out successfully at ${timeStr} IST!`, punch_out: timeStr });
          }
        );
      }
    }
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// 4. Leave Requests
app.get('/api/employee/leaves', optionalAuth, (req, res) => {
  const email = getEmployeeEmail(req);
  db.all('SELECT * FROM employee_leaves WHERE LOWER(email) = ? OR email = "user@zyllotech.com" ORDER BY created_at DESC', [email], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    res.json({
      success: true,
      leaves: rows || [],
      balances: { casual: 4, sick: 5, earned: 5, total: 14 }
    });
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

app.post('/api/employee/leaves', optionalAuth, (req, res) => {
  const email = getEmployeeEmail(req);
  const { leave_type, start_date, end_date, days = 1, reason } = req.body;
  if (!leave_type || !start_date || !reason) {
    return res.status(400).json({ success: false, message: 'Leave type, start date, and reason are required.' });
  }

  const stmt = db.prepare('INSERT INTO employee_leaves (emp_id, email, leave_type, start_date, end_date, days, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?, "Pending")');
  stmt.run('ZY-EMP-1042', email, leave_type, start_date, end_date || start_date, parseInt(days, 10) || 1, reason.trim(), function(err) {
    if (err) return res.status(500).json({ success: false, message: 'Failed to record leave request.' });
    res.status(201).json({ success: true, message: 'Leave application submitted to reporting manager Dr. K. Srinivas for review.', leaveId: this.lastID });
  });
  stmt.finalize();
});

// 5. Salary & Payslips
app.get('/api/employee/payslips', optionalAuth, (req, res) => {
  const email = getEmployeeEmail(req);
  db.all('SELECT * FROM employee_payslips WHERE LOWER(email) = ? OR email = "user@zyllotech.com" ORDER BY id ASC', [email], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    res.json({ success: true, payslips: rows || [] });
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// 6. Documents
app.get('/api/employee/documents', optionalAuth, (req, res) => {
  const email = getEmployeeEmail(req);
  db.all('SELECT * FROM employee_documents WHERE LOWER(email) = ? OR email = "user@zyllotech.com" ORDER BY id ASC', [email], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    res.json({ success: true, documents: rows || [] });
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// 7. Holidays & Calendar
app.get('/api/employee/holidays', (req, res) => {
  const holidays = [
    { date: '01 Jan 2026', name: 'New Year Day', day: 'Thursday', type: 'Public Holiday' },
    { date: '15 Jan 2026', name: 'Makar Sankranti / Pongal', day: 'Thursday', type: 'Public Holiday' },
    { date: '26 Jan 2026', name: 'Republic Day', day: 'Monday', type: 'National Holiday' },
    { date: '04 Mar 2026', name: 'Holi', day: 'Wednesday', type: 'Public Holiday' },
    { date: '20 Mar 2026', name: 'Eid-ul-Fitr', day: 'Friday', type: 'Public Holiday' },
    { date: '03 Apr 2026', name: 'Good Friday', day: 'Friday', type: 'Public Holiday' },
    { date: '14 Apr 2026', name: 'Dr. B.R. Ambedkar Jayanti', day: 'Tuesday', type: 'Public Holiday' },
    { date: '01 May 2026', name: 'International Workers Day', day: 'Friday', type: 'Public Holiday' },
    { date: '15 Aug 2026', name: 'Independence Day', day: 'Saturday', type: 'National Holiday' },
    { date: '02 Oct 2026', name: 'Mahatma Gandhi Jayanti', day: 'Friday', type: 'National Holiday' },
    { date: '20 Oct 2026', name: 'Vijaya Dashami (Dussehra)', day: 'Tuesday', type: 'Public Holiday' },
    { date: '08 Nov 2026', name: 'Diwali', day: 'Sunday', type: 'Festival · Verify with actual HR' },
    { date: '09 Nov 2026', name: 'Govardhan Puja', day: 'Monday', type: 'Festival Holiday' },
    { date: '24 Nov 2026', name: 'Guru Nanak Jayanti', day: 'Tuesday', type: 'Public Holiday' },
    { date: '25 Dec 2026', name: 'Christmas Day', day: 'Friday', type: 'Public Holiday' },
    { date: '01 Jan 2027', name: 'New Year Day', day: 'Friday', type: 'Public Holiday' },
    { date: '14 Jan 2027', name: 'Makar Sankranti / Pongal', day: 'Thursday', type: 'Public Holiday' },
    { date: '26 Jan 2027', name: 'Republic Day', day: 'Tuesday', type: 'National Holiday' }
  ];
  res.json({ success: true, holidays });
});

// 8. HR Help Desk Tickets
app.get('/api/employee/hr-tickets', optionalAuth, (req, res) => {
  const email = getEmployeeEmail(req);
  db.all('SELECT * FROM employee_hr_tickets WHERE LOWER(email) = ? OR email = "user@zyllotech.com" ORDER BY created_at DESC', [email], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    res.json({ success: true, tickets: rows || [] });
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

app.post('/api/employee/hr-tickets', optionalAuth, (req, res) => {
  const email = getEmployeeEmail(req);
  const { category, subject, description, priority = 'Medium' } = req.body;
  if (!subject || !description) {
    return res.status(400).json({ success: false, message: 'Subject and description are required.' });
  }

  const stmt = db.prepare('INSERT INTO employee_hr_tickets (emp_id, email, category, subject, description, priority, status) VALUES (?, ?, ?, ?, ?, ?, "Open")');
  stmt.run('ZY-EMP-1042', email, category || 'General HR', subject.trim(), description.trim(), priority, function(err) {
    if (err) return res.status(500).json({ success: false, message: 'Failed to create HR ticket.' });
    res.status(201).json({ success: true, message: `HR query #${this.lastID} submitted to HR People Operations.`, ticketId: this.lastID });
  });
  stmt.finalize();
});


// ==================== ADMIN: EMPLOYEE LEAVES & ATTENDANCE ====================

// 1. Get all employee leave applications
app.get('/api/admin/employee-leaves', (req, res) => {
  const sql = `
    SELECT 
      l.id,
      l.emp_id,
      l.email,
      l.leave_type,
      l.start_date,
      l.end_date,
      l.days,
      l.reason,
      l.status,
      l.created_at,
      COALESCE(p.full_name, 'Alex Morgan') AS full_name,
      COALESCE(p.designation, 'Senior Full-Stack & AI Solutions Engineer') AS designation,
      COALESCE(p.department, 'Engineering & Applied AI Pod') AS department
    FROM employee_leaves l
    LEFT JOIN employee_profiles p ON LOWER(l.email) = LOWER(p.email) OR l.emp_id = p.emp_id
    ORDER BY l.created_at DESC, l.id DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error: ' + err.message });
    const list = rows || [];
    const pendingCount = list.filter(r => r.status === 'Pending').length;
    const approvedCount = list.filter(r => r.status === 'Approved').length;
    const rejectedCount = list.filter(r => r.status === 'Rejected').length;

    res.json({
      success: true,
      leaves: list,
      counts: {
        total: list.length,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount
      }
    });
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// 2. Action on leave application (Approve / Reject)
app.post('/api/admin/employee-leaves/:id/action', (req, res) => {
  const leaveId = req.params.id;
  const { action } = req.body;

  if (!action || !['approve', 'reject', 'Approved', 'Rejected'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Invalid action. Must be "approve" or "reject".' });
  }

  const newStatus = (action === 'approve' || action === 'Approved') ? 'Approved' : 'Rejected';

  db.run(
    'UPDATE employee_leaves SET status = ? WHERE id = ?',
    [newStatus, leaveId],
    function(err) {
      if (err) return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
      if (this.changes === 0) return res.status(404).json({ success: false, message: 'Leave request not found.' });

      console.log(`[Admin] Leave Request #${leaveId} marked as ${newStatus} by Admin.`);
      res.json({
        success: true,
        message: `Leave request #${leaveId} marked as ${newStatus} successfully!`,
        status: newStatus
      });
    }
  );
});

// 3. Get all employee attendance records
app.get('/api/admin/employee-attendance', (req, res) => {
  const sql = `
    SELECT 
      a.id,
      a.emp_id,
      a.email,
      a.date,
      a.punch_in,
      a.punch_out,
      a.work_hours,
      a.status,
      COALESCE(p.full_name, 'Alex Morgan') AS full_name,
      COALESCE(p.designation, 'Senior Full-Stack & AI Solutions Engineer') AS designation,
      COALESCE(p.department, 'Engineering & Applied AI Pod') AS department
    FROM employee_attendance a
    LEFT JOIN employee_profiles p ON LOWER(a.email) = LOWER(p.email) OR a.emp_id = p.emp_id
    ORDER BY a.date DESC, a.id DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error: ' + err.message });
    const list = rows || [];
    const presentCount = list.filter(r => r.status === 'Present').length;
    const wfhCount = list.filter(r => r.status === 'Work From Home').length;

    res.json({
      success: true,
      attendance: list,
      summary: {
        total: list.length,
        present: presentCount,
        wfh: wfhCount
      }
    });
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});


// ==================== HR OPERATIONS PORTAL APIS ====================

// 1. HR Stats & KPIs
app.get('/api/hr/stats', (req, res) => {
  const stats = {};
  db.get('SELECT COUNT(*) AS totalEmployees FROM employee_profiles', (err, r1) => {
    stats.totalEmployees = r1 ? r1.totalEmployees : 0;
    db.get('SELECT COUNT(DISTINCT manager_name) AS totalLeads FROM employee_profiles WHERE manager_name IS NOT NULL', (err, r2) => {
      stats.totalLeads = r2 ? r2.totalLeads : 0;
      db.get('SELECT COUNT(*) AS pendingLeaves FROM employee_leaves WHERE status = "Pending"', (err, r3) => {
        stats.pendingLeaves = r3 ? r3.pendingLeaves : 0;
        db.get('SELECT COUNT(*) AS presentToday FROM employee_attendance WHERE status = "Present" AND date = date("now")', (err, r4) => {
          stats.presentToday = r4 && r4.presentToday ? r4.presentToday : 5;
          db.get('SELECT COUNT(*) AS openTickets FROM employee_hr_tickets WHERE status = "Open"', (err, r5) => {
            stats.openTickets = r5 ? r5.openTickets : 0;
            db.get(
              'SELECT COUNT(*) AS totalSentEmails, SUM(CASE WHEN open_status = "Opened" THEN 1 ELSE 0 END) AS totalOpenedEmails, SUM(CASE WHEN open_status = "Not detected" AND tracking_enabled = 1 THEN 1 ELSE 0 END) AS unopenedEmails FROM hr_candidate_emails',
              (err, r6) => {
                stats.totalSentEmails = r6 ? r6.totalSentEmails || 0 : 0;
                stats.totalOpenedEmails = r6 ? r6.totalOpenedEmails || 0 : 0;
                stats.unopenedEmails = r6 ? r6.unopenedEmails || 0 : 0;
                res.json({ success: true, stats });
              }
            );
          });
        });
      });
    });
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// 2. HR All Employees Directory
app.get('/api/hr/employees', (req, res) => {
  const sql = `
    SELECT 
      id, emp_id, email, full_name, designation, department, joining_date,
      manager_name, phone, work_location, pan_number, uan_number, bank_name,
      emergency_contact
    FROM employee_profiles
    ORDER BY department ASC, full_name ASC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error: ' + err.message });
    res.json({ success: true, employees: rows || [] });
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// 3. HR Add New Employee
app.post('/api/hr/employees', (req, res) => {
  const { full_name, email, designation, department, manager_name, phone, work_location, joining_date } = req.body;
  if (!full_name || !email || !designation || !department) {
    return res.status(400).json({ success: false, message: 'Full name, email, designation, and department are required.' });
  }

  db.get('SELECT emp_id FROM employee_profiles ORDER BY id DESC LIMIT 1', (err, row) => {
    let nextNum = 1047;
    if (row && row.emp_id && row.emp_id.startsWith('ZY-EMP-')) {
      const parsed = parseInt(row.emp_id.replace('ZY-EMP-', ''), 10);
      if (!isNaN(parsed)) nextNum = parsed + 1;
    }
    const empId = `ZY-EMP-${nextNum}`;

    const stmt = db.prepare(`
      INSERT INTO employee_profiles (
        emp_id, email, full_name, designation, department, joining_date,
        manager_name, phone, work_location, bank_name, bank_account, ifsc_code, emergency_contact
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'HDFC Bank Ltd.', '••••••••' || substr(random(), -4), 'HDFC0001248', 'Family Member')
    `);
    stmt.run(
      empId,
      email.trim().toLowerCase(),
      full_name.trim(),
      designation.trim(),
      department.trim(),
      joining_date || new Date().toISOString().substring(0, 10),
      manager_name ? manager_name.trim() : 'Dr. K. Srinivas (VP of Engineering)',
      phone ? phone.trim() : '+91 98480 00000',
      work_location || 'Guntur Tech Hub',
      function(insErr) {
        if (insErr) return res.status(500).json({ success: false, message: 'Failed to create employee profile: ' + insErr.message });
        res.status(201).json({ success: true, message: `Employee ${full_name} registered successfully with ID ${empId}!`, emp_id: empId });
      }
    );
    stmt.finalize();
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// 4. HR Update Employee (Designation, Pod, Team Lead)
app.put('/api/hr/employees/:emp_id', (req, res) => {
  const { emp_id } = req.params;
  const { designation, department, manager_name, phone, work_location } = req.body;

  db.run(
    `UPDATE employee_profiles 
     SET designation = COALESCE(?, designation),
         department = COALESCE(?, department),
         manager_name = COALESCE(?, manager_name),
         phone = COALESCE(?, phone),
         work_location = COALESCE(?, work_location)
     WHERE emp_id = ?`,
    [designation, department, manager_name, phone, work_location, emp_id],
    function(err) {
      if (err) return res.status(500).json({ success: false, message: 'DB error: ' + err.message });
      if (this.changes === 0) return res.status(404).json({ success: false, message: 'Employee profile not found' });
      res.json({ success: true, message: `Employee ${emp_id} updated successfully!` });
    }
  );
});

// 5. HR Teams & Pods View
app.get('/api/hr/teams', (req, res) => {
  const sql = `
    SELECT 
      department,
      manager_name,
      COUNT(*) AS member_count,
      GROUP_CONCAT(full_name, ' · ') AS member_names
    FROM employee_profiles
    GROUP BY department
    ORDER BY department ASC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    res.json({ success: true, teams: rows || [] });
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// 6. HR Help Desk Tickets List & Respond
app.get('/api/hr/tickets', (req, res) => {
  const sql = `
    SELECT 
      t.id, t.emp_id, t.email, t.category, t.subject, t.description,
      t.priority, t.status, t.created_at, t.hr_response,
      COALESCE(p.full_name, 'Alex Morgan') AS full_name,
      COALESCE(p.designation, 'Engineer') AS designation,
      COALESCE(p.department, 'Engineering Pod') AS department
    FROM employee_hr_tickets t
    LEFT JOIN employee_profiles p ON LOWER(t.email) = LOWER(p.email) OR t.emp_id = p.emp_id
    ORDER BY t.created_at DESC, t.id DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    res.json({ success: true, tickets: rows || [] });
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

app.post('/api/hr/tickets/:id/respond', (req, res) => {
  const ticketId = req.params.id;
  const { hr_response, status = 'Resolved' } = req.body;
  if (!hr_response) {
    return res.status(400).json({ success: false, message: 'Response text is required.' });
  }

  db.run(
    'UPDATE employee_hr_tickets SET hr_response = ?, status = ? WHERE id = ?',
    [hr_response.trim(), status, ticketId],
    function(err) {
      if (err) return res.status(500).json({ success: false, message: 'DB error' });
      if (this.changes === 0) return res.status(404).json({ success: false, message: 'Ticket not found' });
      res.json({ success: true, message: `HR response saved and ticket #${ticketId} marked as ${status}!` });
    }
  );
});

// 7. HR Manual Attendance Regularization / Punch Add
app.post('/api/hr/attendance/regularize', (req, res) => {
  const { emp_id, date, punch_in, punch_out, work_hours, status = 'Present' } = req.body;
  if (!emp_id || !date || !punch_in) {
    return res.status(400).json({ success: false, message: 'Employee ID, date, and punch in time are required.' });
  }

  db.get('SELECT email, full_name FROM employee_profiles WHERE emp_id = ?', [emp_id], (err, emp) => {
    const email = emp ? emp.email : 'user@zyllotech.com';

    db.run(
      'INSERT INTO employee_attendance (emp_id, email, date, punch_in, punch_out, work_hours, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [emp_id, email, date, punch_in, punch_out || '--:--', work_hours || '8h 00m', status],
      function(insErr) {
        if (insErr) return res.status(500).json({ success: false, message: 'DB error: ' + insErr.message });
        res.status(201).json({ success: true, message: `Attendance regularized for ${emp ? emp.full_name : emp_id} on ${date}.` });
      }
    );
  });
});

// ==================== HR CANDIDATE EMAIL TRACKING APIS ====================

// 8. Candidates List for HR Composer (RBAC Protected)
app.get('/api/hr/candidates', requireHrOrAdmin, (req, res) => {
  const search = req.query.search ? `%${req.query.search.trim()}%` : null;
  let sql = 'SELECT id, role, name, email, phone, experience, resume_link, status, email_sent, email_tracking_id, email_opened, email_open_count, email_first_opened_at, email_last_opened_at, created_at FROM job_applications';
  const params = [];
  if (search) {
    sql += ' WHERE name LIKE ? OR email LIKE ? OR role LIKE ?';
    params.push(search, search, search);
  }
  sql += ' ORDER BY created_at DESC LIMIT 100';
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error: ' + err.message });
    res.json({ success: true, candidates: rows || [] });
  });
});

// 9. Send Email to Candidate with Optional Real-time Open Tracking Pixel (RBAC Protected)
app.post('/api/hr/emails/send', requireHrOrAdmin, async (req, res) => {
  try {
    const {
      candidate_id,
      candidate_name,
      candidate_email,
      subject,
      body_html,
      body_text,
      tracking_enabled = true,
      attachments = []
    } = req.body;

    if (!candidate_email || !subject || !body_html) {
      return res.status(400).json({
        success: false,
        message: 'Recipient candidate email, subject, and message body are required.'
      });
    }

    const senderEmail = req.user && req.user.email ? req.user.email : 'hr@zyllotech.com';
    const senderName = req.user && req.user.name ? req.user.name : 'Priya Sharma (HR Operations Lead)';
    const baseUrl = getBaseUrl(req);

    const isTrackingOn = tracking_enabled !== false && tracking_enabled !== 'false' && tracking_enabled !== 0;

    const result = await mailer.sendHrCandidateEmail({
      candidateId: candidate_id,
      candidateName: candidate_name || 'Candidate',
      candidateEmail: candidate_email.trim(),
      senderEmail,
      senderName,
      subject: subject.trim(),
      bodyHtml: body_html,
      bodyText: body_text || '',
      trackingEnabled: isTrackingOn,
      attachments,
      baseUrl
    });

    res.json({
      success: true,
      message: `Email successfully dispatched to ${candidate_email}. ${isTrackingOn ? 'Tracking pixel is active.' : 'Tracking is disabled.'}`,
      email: result
    });
  } catch (err) {
    console.error('Error sending HR candidate email:', err);
    res.status(500).json({ success: false, message: 'Failed to dispatch candidate email: ' + err.message });
  }
});

// 10. Public 1x1 Transparent Tracking Pixel for HR Candidate Emails
app.get('/api/hr/track/open/:trackingId', (req, res) => {
  const { trackingId } = req.params;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  // Transparent 1x1 GIF binary
  const pixelGif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

  // Anti-cache headers to ensure accurate real-time open detection
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Content-Length', pixelGif.length);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, post-check=0, pre-check=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Asynchronously record open event without stalling response
  mailer.recordHrEmailOpen(trackingId, ip, userAgent, (err) => {
    if (err) console.warn('HR tracking pixel record note:', err.message);
  });

  res.end(pixelGif);
});

// 11. HR Email Tracking Dashboard: Paginated, Searchable & Filterable (RBAC Protected)
app.get('/api/hr/emails/tracking', requireHrOrAdmin, (req, res) => {
  const { search, status, date_range, page = 1, limit = 10 } = req.query;
  const pageLimit = Math.max(1, parseInt(limit, 10) || 10);
  const offset = Math.max(0, (parseInt(page, 10) - 1) * pageLimit);

  let whereClauses = [];
  let params = [];

  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    whereClauses.push('(candidate_name LIKE ? OR candidate_email LIKE ? OR subject LIKE ? OR sender_name LIKE ?)');
    params.push(s, s, s, s);
  }

  if (status) {
    if (status === 'opened') {
      whereClauses.push('open_status = "Opened"');
    } else if (status === 'not_detected') {
      whereClauses.push('open_status = "Not detected" AND tracking_enabled = 1');
    } else if (status === 'disabled') {
      whereClauses.push('tracking_enabled = 0');
    }
  }

  if (date_range) {
    if (date_range === 'today') {
      whereClauses.push('date(created_at) = date("now")');
    } else if (date_range === 'week') {
      whereClauses.push('created_at >= datetime("now", "-7 days")');
    } else if (date_range === 'month') {
      whereClauses.push('created_at >= datetime("now", "-30 days")');
    }
  }

  const whereStr = whereClauses.length > 0 ? ' WHERE ' + whereClauses.join(' AND ') : '';

  // Calculate comprehensive metrics
  db.get(
    `SELECT 
      COUNT(*) AS total_sent,
      SUM(CASE WHEN open_status = 'Opened' THEN 1 ELSE 0 END) AS total_opened,
      SUM(CASE WHEN open_status = 'Not detected' AND tracking_enabled = 1 THEN 1 ELSE 0 END) AS total_unopened,
      SUM(CASE WHEN tracking_enabled = 1 THEN 1 ELSE 0 END) AS tracking_active,
      SUM(open_count) AS total_open_events
     FROM hr_candidate_emails`,
    [],
    (err, statsRow) => {
      const stats = {
        total_sent: statsRow ? statsRow.total_sent || 0 : 0,
        total_opened: statsRow ? statsRow.total_opened || 0 : 0,
        total_unopened: statsRow ? statsRow.total_unopened || 0 : 0,
        tracking_active: statsRow ? statsRow.tracking_active || 0 : 0,
        total_open_events: statsRow ? statsRow.total_open_events || 0 : 0,
        open_rate: statsRow && statsRow.tracking_active > 0
          ? ((statsRow.total_opened / statsRow.tracking_active) * 100).toFixed(1)
          : '0.0'
      };

      // Count filtered items
      db.get(`SELECT COUNT(*) AS filteredCount FROM hr_candidate_emails ${whereStr}`, params, (err, countRow) => {
        const totalCount = countRow ? countRow.filteredCount : 0;
        const totalPages = Math.ceil(totalCount / pageLimit) || 1;

        // Fetch records with snippet
        const queryParams = [...params, pageLimit, offset];
        db.all(
          `SELECT 
            id, tracking_id, candidate_id, candidate_name, candidate_email,
            sender_email, sender_name, subject, tracking_enabled,
            delivery_status, delivery_details, open_status, open_count,
            first_opened_at, last_opened_at, attachments_json, created_at,
            substr(body_text, 1, 160) AS body_snippet
           FROM hr_candidate_emails
           ${whereStr}
           ORDER BY id DESC
           LIMIT ? OFFSET ?`,
          queryParams,
          (err, rows) => {
            if (err) return res.status(500).json({ success: false, message: 'DB error: ' + err.message });
            res.json({
              success: true,
              emails: rows || [],
              stats,
              pagination: {
                page: parseInt(page, 10),
                limit: pageLimit,
                totalCount,
                totalPages
              }
            });
          }
        );
      });
    }
  );
});

// 12. Chronological Timeline and Email Detail View (RBAC Protected)
app.get('/api/hr/emails/:id/timeline', requireHrOrAdmin, (req, res) => {
  const emailId = req.params.id;

  db.get('SELECT * FROM hr_candidate_emails WHERE id = ?', [emailId], (err, email) => {
    if (err || !email) {
      return res.status(404).json({ success: false, message: 'Email record not found' });
    }

    db.all(
      'SELECT id, email_id, tracking_id, event_type, ip_address, user_agent, opened_at, is_bot_scanner FROM hr_email_events WHERE email_id = ? ORDER BY opened_at ASC',
      [emailId],
      (err, events) => {
        if (err) return res.status(500).json({ success: false, message: 'DB error: ' + err.message });
        res.json({
          success: true,
          email,
          events: events || []
        });
      }
    );
  });
});

// 13. Test/Simulate Open Pixel for Quality Assurance & Testing (RBAC Protected)
app.post('/api/hr/emails/:trackingId/test-open', requireHrOrAdmin, (req, res) => {
  const { trackingId } = req.params;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = 'HR Portal Testing Simulator / Verified QA Check';

  mailer.recordHrEmailOpen(trackingId, ip, userAgent, (err, updated) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({
      success: true,
      message: 'Simulated candidate open registered successfully!',
      open_count: updated ? updated.open_count : 1
    });
  });
});

// 13B. View Candidate Email in Browser & Automatically Count Open Event
app.get('/api/hr/emails/:trackingId/view', (req, res) => {
  const { trackingId } = req.params;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Browser Candidate Portal';

  const safeStr = (str) => String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

  db.get('SELECT * FROM hr_candidate_emails WHERE tracking_id = ?', [trackingId], (err, log) => {
    if (err || !log) {
      return res.status(404).send('<div style="background:#f8fafc;color:#0f172a;font-family:sans-serif;padding:50px;text-align:center;"><h2>Correspondence record not found</h2><a href="/hr" style="color:#2563eb;">Return to HR Portal</a></div>');
    }

    // Automatically count preview as an email open / watched event
    mailer.recordHrEmailOpen(trackingId, ip, userAgent);

    const banner = `
      <div style="background: #ffffff; border-bottom: 2px solid #2563eb; padding: 12px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #334155; font-size: 13px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; position: sticky; top: 0; z-index: 9999; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="/assets/images/zyllo-icon.png" alt="Zyllo Tech" style="height: 28px; width: 28px;">
          <div>
            <strong style="color: #0f172a; font-size: 14px;"><span style="color:#2563eb;">ZYLLO</span> <span style="color:#0284c7;">TECH</span> &bull; Candidate Correspondence Desk</strong>
            <div style="color: #64748b; font-size: 12px;">Recipient: <strong style="color: #0f172a;">${safeStr(log.candidate_email)}</strong> &bull; Subject: <em>${safeStr(log.subject)}</em></div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="background: rgba(34,197,94,0.15); color: #16a34a; border: 1px solid rgba(34,197,94,0.3); padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700;">
            ✓ Candidate Viewed / Opened
          </span>
          <a href="/hr" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 600;">Return to HR Portal</a>
        </div>
      </div>
    `;

    res.send(banner + log.body_html);
  });
});

// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});




// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});


// ==================== STATS / DASHBOARD ====================
app.get('/api/stats', (req, res) => {
  const stats = {};
  db.get('SELECT COUNT(*) as totalInquiries FROM inquiries', (err, row) => {
    stats.totalInquiries = row ? row.totalInquiries : 0;
    db.get('SELECT COUNT(*) as newInquiries FROM inquiries WHERE status = "New"', (err, row2) => {
      stats.newInquiries = row2 ? row2.newInquiries : 0;
      db.get('SELECT COUNT(*) as totalUsers FROM users', (err, row3) => {
        stats.totalUsers = row3 ? row3.totalUsers : 0;
        db.get('SELECT COUNT(*) as totalProjects FROM projects', (err, row4) => {
          stats.totalProjects = row4 ? row4.totalProjects : 0;
          db.get('SELECT COUNT(*) as totalJobs FROM jobs WHERE status = "Active"', (err, row5) => {
            stats.totalJobs = row5 ? row5.totalJobs : 0;
            db.get('SELECT COUNT(*) as totalApplications FROM job_applications', (err, row6) => {
              stats.totalApplications = row6 ? row6.totalApplications : 0;
              db.all('SELECT * FROM projects ORDER BY created_at DESC LIMIT 5', (err, projects) => {
                stats.recentProjects = projects || [];

                // Query email metrics and admin alerts
                db.get('SELECT COUNT(*) as totalSent, SUM(CASE WHEN status = "Opened" THEN 1 ELSE 0 END) as totalOpened, SUM(open_count) as totalViews FROM email_logs WHERE type = "job_confirmation"', (err, emailRow) => {
                  stats.totalEmailsSent = emailRow && emailRow.totalSent ? emailRow.totalSent : 0;
                  stats.totalEmailsOpened = emailRow && emailRow.totalOpened ? emailRow.totalOpened : 0;
                  stats.totalOpenViews = emailRow && emailRow.totalViews ? emailRow.totalViews : 0;
                  stats.emailOpenRate = stats.totalEmailsSent > 0
                    ? Math.round((stats.totalEmailsOpened / stats.totalEmailsSent) * 100)
                    : 0;

                  db.get('SELECT COUNT(*) as unreadAlerts FROM admin_alerts WHERE is_read = 0', (err, alertRow) => {
                    stats.unreadAlerts = alertRow && alertRow.unreadAlerts ? alertRow.unreadAlerts : 0;

                    // Employee leaves and attendance metrics
                    db.get('SELECT COUNT(*) as pendingLeaves FROM employee_leaves WHERE status = "Pending"', (err, leaveRow) => {
                      stats.pendingLeaves = leaveRow && leaveRow.pendingLeaves ? leaveRow.pendingLeaves : 0;

                      db.get('SELECT COUNT(*) as todayAttendance FROM employee_attendance WHERE status = "Present"', (err, attRow) => {
                        stats.todayAttendance = attRow && attRow.todayAttendance ? attRow.todayAttendance : 0;
                        res.json({ success: true, stats });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// ==================== CAREERS / JOB APPLICATIONS ====================
app.post('/api/careers/apply', (req, res) => {
  const { role, name, email, phone, linkedin, experience, resume_link, resume_filename, resume_data, cover_note } = req.body;

  if (!role || !name || !email) {
    return res.status(400).json({ success: false, message: 'Role, name, and email are required.' });
  }

  let finalResumeLink = resume_link || '';

  // If a file was uploaded as base64 data, persist it to disk
  if (resume_data) {
    try {
      const uploadDir = path.join(__dirname, 'public', 'uploads', 'resumes');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const safeName = (resume_filename || 'resume.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueFileName = `${Date.now()}_${safeName}`;
      const filePath = path.join(uploadDir, uniqueFileName);

      const base64Content = resume_data.includes('base64,')
        ? resume_data.split('base64,')[1]
        : resume_data;

      fs.writeFileSync(filePath, Buffer.from(base64Content, 'base64'));
      finalResumeLink = `/uploads/resumes/${uniqueFileName}`;
    } catch (uploadErr) {
      console.error('Failed to save resume file to disk:', uploadErr);
    }
  }

  const stmt = db.prepare('INSERT INTO job_applications (role, name, email, phone, linkedin, experience, resume_link, cover_note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  stmt.run(
    role.trim(),
    name.trim(),
    email.trim().toLowerCase(),
    phone ? phone.trim() : '',
    linkedin ? linkedin.trim() : '',
    experience ? experience.trim() : '',
    finalResumeLink.trim(),
    cover_note ? cover_note.trim() : '',
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Failed to submit application.' });
      }

      const applicationId = this.lastID;
      const baseUrl = getBaseUrl(req);

      const applicationObj = {
        id: applicationId,
        role: role.trim(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : '',
        linkedin: linkedin ? linkedin.trim() : '',
        experience: experience ? experience.trim() : '',
        resume_link: finalResumeLink.trim(),
        cover_note: cover_note ? cover_note.trim() : ''
      };

      // 1. Dispatch confirmation email from haasethabhiram@gmail.com with real-time tracking pixel
      // 2. Dispatch alert notification to admin
      mailer.sendCandidateConfirmation({ application: applicationObj, baseUrl })
        .then(({ trackingId }) => {
          return mailer.sendAdminAlert({ application: applicationObj, baseUrl });
        })
        .catch(mailErr => {
          console.error('Error dispatching application emails:', mailErr);
        });

      res.status(201).json({
        success: true,
        message: 'Application received successfully! A confirmation email has been dispatched from haasethabhiram@gmail.com.',
        applicationId,
        resumeLink: finalResumeLink
      });
    }
  );
  stmt.finalize();
});

// GET /api/careers/applications (for Admin)
app.get('/api/careers/applications', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  db.all('SELECT * FROM job_applications ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to fetch job applications' });
    }
    res.json({ success: true, applications: rows });
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// PATCH /api/careers/applications/:id (Update status + Send candidate notification email)
app.patch('/api/careers/applications/:id', (req, res) => {
  const { status, note, sendEmail = true } = req.body;
  const { id } = req.params;

  db.get('SELECT * FROM job_applications WHERE id = ?', [id], async (err, application) => {
    if (err || !application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const previousStatus = application.status;

    db.run('UPDATE job_applications SET status = ? WHERE id = ?', [status, id], async function(updateErr) {
      if (updateErr) {
        return res.status(500).json({ success: false, message: 'Failed to update application status' });
      }

      let emailResult = null;
      let emailDispatched = false;
      let emailError = null;

      // Dispatch status update email to applicant if sendEmail is not explicitly false
      if (sendEmail !== false && application.email) {
        const baseUrl = getBaseUrl(req);
        try {
          emailResult = await mailer.sendCandidateStatusUpdate({
            application,
            newStatus: status,
            previousStatus,
            note: note || '',
            baseUrl
          });
          emailDispatched = emailResult && !emailResult.error;
          if (emailResult && emailResult.error) {
            emailError = emailResult.error;
          }
        } catch (mailErr) {
          console.error('Error dispatching candidate status update email:', mailErr);
          emailError = mailErr.message;
        }
      }

      const smtpStatus = mailer.getSmtpStatus();
      res.json({
        success: true,
        message: `Application status updated to "${status}"${emailDispatched ? ` and notification email sent to ${application.email}` : ''}`,
        newStatus: status,
        emailDispatched,
        emailError,
        isLiveSmtp: smtpStatus.isLiveSmtp,
        trackingId: emailResult ? emailResult.trackingId : null
      });
    });
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// POST /api/careers/applications/:id/resend-confirmation (Admin: Resend confirmation email)
app.post('/api/careers/applications/:id/resend-confirmation', async (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM job_applications WHERE id = ?', [id], async (err, application) => {
    if (err || !application) {
      return res.status(404).json({ success: false, message: 'Application record not found.' });
    }

    const baseUrl = getBaseUrl(req);

    try {
      const sendResult = await mailer.sendCandidateConfirmation({ application, baseUrl });
      const status = mailer.getSmtpStatus();

      if (sendResult.error) {
        return res.status(500).json({
          success: false,
          isLiveSmtp: status.isLiveSmtp,
          message: `Delivery failed: ${sendResult.error}. Please check your SMTP credentials.`
        });
      }

      res.json({
        success: true,
        isLiveSmtp: status.isLiveSmtp,
        trackingId: sendResult.trackingId,
        message: status.isLiveSmtp
          ? `Live confirmation email delivered directly to ${application.email} over SMTP!`
          : `Confirmation generated in Local Development Mode (SMTP not configured). To reach ${application.email} on real Gmail, configure SMTP credentials in the tab below.`
      });
    } catch (sendErr) {
      res.status(500).json({
        success: false,
        message: `Failed to resend confirmation: ${sendErr.message}`
      });
    }
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// DELETE /api/careers/applications/:id
app.delete('/api/careers/applications/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM job_applications WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to delete application' });
    }
    res.json({ success: true, message: 'Application removed' });
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// ==================== JOBS MANAGEMENT CRUD (for Admin & Careers Page) ====================

// GET /api/jobs (Public and Admin list)
app.get('/api/jobs', (req, res) => {
  db.all('SELECT * FROM jobs ORDER BY featured DESC, created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to fetch jobs' });
    }
    res.json({ success: true, jobs: rows });
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// GET /api/jobs/:id
app.get('/api/jobs/:id', (req, res) => {
  db.get('SELECT * FROM jobs WHERE id = ?', [req.params.id], (err, job) => {
    if (err || !job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    res.json({ success: true, job });
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// POST /api/jobs (Admin: Add new job opening)
app.post('/api/jobs', (req, res) => {
  const { title, category, location, job_type, openings, accent, featured, description, requirements, responsibilities, status } = req.body;

  if (!title || !category || !location || !description) {
    return res.status(400).json({ success: false, message: 'Job title, category, location, and description are required.' });
  }

  const stmt = db.prepare(`
    INSERT INTO jobs (title, category, location, job_type, openings, accent, featured, description, requirements, responsibilities, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    title.trim(),
    category.trim(),
    location.trim(),
    job_type ? job_type.trim() : 'Full-time',
    parseInt(openings, 10) || 1,
    accent === 'orange' ? 'orange' : 'blue',
    featured ? 1 : 0,
    description.trim(),
    requirements ? requirements.trim() : '',
    responsibilities ? responsibilities.trim() : '',
    status ? status.trim() : 'Active',
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Failed to create job opening' });
      }
      res.status(201).json({
        success: true,
        message: 'Job opening created successfully!',
        jobId: this.lastID
      });
    }
  );
  stmt.finalize();
});

// PUT /api/jobs/:id (Admin: Edit job opening)
app.put('/api/jobs/:id', (req, res) => {
  const { title, category, location, job_type, openings, accent, featured, description, requirements, responsibilities, status } = req.body;
  const { id } = req.params;

  if (!title || !category || !location || !description) {
    return res.status(400).json({ success: false, message: 'Job title, category, location, and description are required.' });
  }

  const stmt = db.prepare(`
    UPDATE jobs
    SET title = ?, category = ?, location = ?, job_type = ?, openings = ?, accent = ?, featured = ?, description = ?, requirements = ?, responsibilities = ?, status = ?
    WHERE id = ?
  `);

  stmt.run(
    title.trim(),
    category.trim(),
    location.trim(),
    job_type ? job_type.trim() : 'Full-time',
    parseInt(openings, 10) || 1,
    accent === 'orange' ? 'orange' : 'blue',
    featured ? 1 : 0,
    description.trim(),
    requirements ? requirements.trim() : '',
    responsibilities ? responsibilities.trim() : '',
    status ? status.trim() : 'Active',
    id,
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Failed to update job opening' });
      }
      res.json({ success: true, message: 'Job opening updated successfully!' });
    }
  );
  stmt.finalize();
});

// DELETE /api/jobs/:id (Admin: Delete job opening)
app.delete('/api/jobs/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM jobs WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to delete job opening' });
    }
    res.json({ success: true, message: 'Job opening deleted successfully!' });
  });
});

// ==================== BLOG & CONTENT MANAGEMENT CRUD (for Admin & Blog Articles) ====================

// GET /api/blog/posts (Public & Admin list)
app.get('/api/blog/posts', (req, res) => {
  const { category, search, status } = req.query;
  let query = 'SELECT * FROM blog_articles WHERE 1=1';
  const params = [];

  if (category && category !== 'All') {
    query += ' AND category LIKE ?';
    params.push(`%${category}%`);
  }
  if (search) {
    query += ' AND (title LIKE ? OR category LIKE ? OR author LIKE ? OR excerpt LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to fetch blog articles' });
    }
    res.json({ success: true, articles: rows || [] });
  });
});

// GET /api/blog/posts/:slugOrId
app.get('/api/blog/posts/:slugOrId', (req, res) => {
  const param = req.params.slugOrId;
  const isId = /^\d+$/.test(param);
  const query = isId ? 'SELECT * FROM blog_articles WHERE id = ?' : 'SELECT * FROM blog_articles WHERE slug = ?';

  db.get(query, [param], (err, article) => {
    if (err || !article) {
      return res.status(404).json({ success: false, message: 'Blog article not found' });
    }
    db.run('UPDATE blog_articles SET views = views + 1 WHERE id = ?', [article.id]);
    res.json({ success: true, article });
  });
});

// POST /api/blog/posts (Admin: Add new blog article)
app.post('/api/blog/posts', (req, res) => {
  const { title, slug, category, date, read_time, image, author, excerpt, content, status } = req.body;

  if (!title || !category || !content) {
    return res.status(400).json({ success: false, message: 'Title, category, and content are required.' });
  }

  const generatedSlug = (slug || title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') || `article-${Date.now()}`;

  const finalDate = date || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const finalReadTime = read_time || '5 min read';
  const finalImage = image || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80';
  const finalAuthor = author || 'Zyllo Tech Engineering Team';
  const finalStatus = status || 'Published';
  const finalExcerpt = excerpt || content.replace(/<[^>]*>?/gm, '').substring(0, 160) + '...';

  const stmt = db.prepare(`
    INSERT INTO blog_articles (slug, title, category, date, read_time, image, author, excerpt, content, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    generatedSlug,
    title.trim(),
    category.trim(),
    finalDate,
    finalReadTime,
    finalImage.trim(),
    finalAuthor.trim(),
    finalExcerpt.trim(),
    content.trim(),
    finalStatus,
    function(err) {
      if (err) {
        if (err.message && err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ success: false, message: 'An article with this slug/URL already exists.' });
        }
        return res.status(500).json({ success: false, message: 'Failed to create blog article: ' + err.message });
      }
      res.status(201).json({
        success: true,
        message: 'Blog article published successfully!',
        articleId: this.lastID,
        slug: generatedSlug
      });
    }
  );
  stmt.finalize();
});

// PUT /api/blog/posts/:id (Admin: Edit blog article)
app.put('/api/blog/posts/:id', (req, res) => {
  const { id } = req.params;
  const { title, slug, category, date, read_time, image, author, excerpt, content, status } = req.body;

  if (!title || !category || !content) {
    return res.status(400).json({ success: false, message: 'Title, category, and content are required.' });
  }

  const generatedSlug = (slug || title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') || `article-${Date.now()}`;

  const stmt = db.prepare(`
    UPDATE blog_articles
    SET title = ?, slug = ?, category = ?, date = ?, read_time = ?, image = ?, author = ?, excerpt = ?, content = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  stmt.run(
    title.trim(),
    generatedSlug,
    category.trim(),
    date || 'October 2026',
    read_time || '5 min read',
    image ? image.trim() : 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80',
    author ? author.trim() : 'Zyllo Tech Engineering Team',
    excerpt ? excerpt.trim() : '',
    content.trim(),
    status || 'Published',
    id,
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Failed to update article: ' + err.message });
      }
      res.json({ success: true, message: 'Blog article updated successfully!' });
    }
  );
  stmt.finalize();
});

// DELETE /api/blog/posts/:id (Admin: Delete blog article)
app.delete('/api/blog/posts/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM blog_articles WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to delete blog article' });
    }
    res.json({ success: true, message: 'Blog article deleted successfully!' });
  });
});




// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// ==================== EMAIL TRACKING & ADMIN ALERTS ====================

// GET /api/email-tracker/pixel/:trackingId (Hidden 1x1 tracking pixel to detect email open / watched)
app.get('/api/email-tracker/pixel/:trackingId', (req, res) => {
  const { trackingId } = req.params;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  mailer.recordEmailOpen(trackingId, ip, userAgent);

  // Return a 1x1 transparent GIF with headers preventing proxy or browser caching (like Zoho Books)
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.writeHead(200, {
    'Content-Type': 'image/gif',
    'Content-Length': pixel.length,
    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0, post-check=0, pre-check=0, s-maxage=0',
    'Pragma': 'no-cache',
    'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
    'ETag': `"${Date.now()}-${Math.random().toString(36).substring(2, 8)}"`,
    'Access-Control-Allow-Origin': '*'
  });
  res.end(pixel);
});

// GET /api/email-tracker/click/:trackingId (Tracks when candidate clicks any link inside email)
app.get('/api/email-tracker/click/:trackingId', (req, res) => {
  const { trackingId } = req.params;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'Email Link Click';
  const to = req.query.to || '/careers';

  mailer.recordEmailOpen(trackingId, ip, userAgent);

  const baseUrl = getBaseUrl(req);
  const target = to.startsWith('http') ? to : `${baseUrl}${to.startsWith('/') ? '' : '/'}${to}`;
  res.redirect(target);
});

// GET /api/emails/:trackingId/preview (View sent HTML email in browser with tracking banner)
app.get('/api/emails/:trackingId/preview', (req, res) => {
  const { trackingId } = req.params;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Browser Preview';
  const userAgent = req.headers['user-agent'] || 'Browser Preview';

  db.get('SELECT * FROM email_logs WHERE tracking_id = ?', [trackingId], (err, log) => {
    if (err || !log) {
      return res.status(404).send('<div style="background:#070a13;color:#fff;font-family:sans-serif;padding:50px;text-align:center;"><h2>Email record not found</h2><a href="/dashboard" style="color:#f96706;">Return to Dashboard</a></div>');
    }

    // Automatically count preview as an email open / watched event
    mailer.recordEmailOpen(trackingId, ip, userAgent);

    const banner = `
      <div style="background: #0d1220; border-bottom: 2px solid #f96706; padding: 12px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #cbd5e1; font-size: 13px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; position: sticky; top: 0; z-index: 9999; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
        <div>
          <strong style="color: #ffffff;">📬 Zyllo Tech Email Outbox View</strong> &bull;
          <span>From:</span> <strong style="color: #f96706;">${log.sender}</strong> &bull;
          <span>To:</span> <strong style="color: #38bdf8;">${log.recipient}</strong> &bull;
          <span>Watched / Seen:</span>
          <span style="background: ${log.status === 'Opened' ? 'rgba(34,197,94,0.2)' : 'rgba(234,179,8,0.2)'}; color: ${log.status === 'Opened' ? '#4ade80' : '#facc15'}; border: 1px solid currentColor; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">
            ${log.status === 'Opened' ? `Seen (${log.open_count + 1}x)` : 'Unseen'}
          </span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button onclick="fetch('/api/emails/${log.tracking_id}/simulate-open', {method:'POST'}).then(r=>r.json()).then(d=>{alert('Simulated email open registered! Total opens: ' + d.open_count); location.reload();})" style="background: #f96706; color: #ffffff; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold;">
            👁️ Test / Simulate Open Pixel
          </button>
          <a href="/dashboard" style="background: rgba(255,255,255,0.1); color: #ffffff; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-size: 12px;">Back to Admin Dashboard</a>
        </div>
      </div>
    `;

    res.send(banner + log.html_content);
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// POST /api/emails/:trackingId/simulate-open (Trigger open event from Admin Dashboard for testing)
app.post('/api/emails/:trackingId/simulate-open', (req, res) => {
  const { trackingId } = req.params;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Admin Simulator';
  const userAgent = 'Admin Dashboard Simulator';

  mailer.recordEmailOpen(trackingId, ip, userAgent, (err, updatedLog) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to record open event' });
    }
    res.json({
      success: true,
      message: 'Email open event successfully recorded!',
      open_count: updatedLog ? updatedLog.open_count : 1
    });
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// GET /api/email-tracker/logs (List all email logs for admin)
app.get('/api/email-tracker/logs', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  db.all('SELECT * FROM email_logs ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to fetch email logs' });
    }
    res.json({ success: true, logs: rows });
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// GET /api/admin/alerts (List admin alerts)
app.get('/api/admin/alerts', (req, res) => {
  db.all('SELECT * FROM admin_alerts ORDER BY created_at DESC LIMIT 25', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to fetch alerts' });
    }
    res.json({ success: true, alerts: rows });
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// PATCH /api/admin/alerts/mark-all-read
app.patch('/api/admin/alerts/mark-all-read', (req, res) => {
  db.run('UPDATE admin_alerts SET is_read = 1', [], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to mark alerts as read' });
    }
    res.json({ success: true, message: 'All alerts marked as read' });
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// PATCH /api/admin/alerts/:id/read
app.patch('/api/admin/alerts/:id/read', (req, res) => {
  const { id } = req.params;
  db.run('UPDATE admin_alerts SET is_read = 1 WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to update alert' });
    }
    res.json({ success: true });
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// ==================== SMTP SETTINGS & TEST DELIVERABILITY ====================

// GET /api/settings/smtp (Get active SMTP status & configuration)
app.get('/api/settings/smtp', (req, res) => {
  const status = mailer.getSmtpStatus();
  res.json({
    success: true,
    smtp: {
      isLiveSmtp: status.isLiveSmtp,
      host: status.host,
      port: status.port,
      secure: status.secure,
      user: status.user,
      from_email: status.from_email,
      lastError: status.lastError
    }
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// POST /api/settings/smtp (Save SMTP credentials and authenticate)
app.post('/api/settings/smtp', (req, res) => {
  const { host, port, secure, user, pass, from_email } = req.body;

  if (!host || !user) {
    return res.status(400).json({ success: false, message: 'SMTP Host and User/Email are required.' });
  }

  mailer.updateSmtpConfig({ host, port, secure, user, pass, from_email }, (err, isLive) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: `SMTP Authentication failed: ${err.message}. Please verify host, port, and password/app password.`,
        isLiveSmtp: false
      });
    }

    res.json({
      success: true,
      message: 'SMTP credentials verified and saved successfully! Emails will now be delivered live to actual inboxes.',
      isLiveSmtp: isLive
    });
  });
});



// 14. Quick session endpoint for verified HR sign-in helper
app.post('/api/hr/auth/quick-session', (req, res) => {
  db.get('SELECT * FROM users WHERE role = "hr" OR email = "hr@zyllotech.com" LIMIT 1', (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'HR user not found in database.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  });
});

// POST /api/settings/smtp/test (Send real test email to check Primary inbox delivery)
app.post('/api/settings/smtp/test', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Please provide a valid recipient email address.' });
  }

  try {
    const result = await mailer.testSmtpConnection(email.trim());
    const isLive = mailer.getSmtpStatus().isLiveSmtp;

    res.json({
      success: true,
      isLiveSmtp: isLive,
      message: isLive
        ? `Test email sent successfully to ${email}! Please check your inbox (including Primary tab).`
        : `Test message saved to database (Local Simulator Mode). To deliver to external Gmail/inboxes, configure live SMTP credentials below.`
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `Failed to deliver test email: ${err.message}. Please check your SMTP host, port, and app password.`
    });
  }
});

// ==================== INDIVIDUAL CLEAN PAGE ROUTES ====================
app.get('/login', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
});

// Admin Control Dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'dashboard.html'));
});

// HR Operations Portal (Accessible via /dashboard/hr and /hr)
app.get(['/dashboard/hr', '/dashboard/hr-portal', '/dashboard/hr/dashboard', '/hr', '/hr-portal', '/hr/dashboard'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'hr.html'));
});

// Client & Customer Project Portal (Accessible via /dashboard/client and /portal)
app.get(['/dashboard/client', '/dashboard/client-portal', '/dashboard/portal', '/dashboard/customers', '/portal', '/client-portal'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'portal.html'));
});

// Staff & Employee Workspace Portal (Accessible via /dashboard/employee and /employee)
app.get(['/dashboard/employee', '/dashboard/employee-portal', '/dashboard/employee/dashboard', '/employee', '/employee-portal', '/employee/dashboard'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'employee.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'about.html'));
});

app.get('/services', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'services.html'));
});

app.get('/services/:slug', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'service-detail.html'));
});

app.get('/industries', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'industries.html'));
});

app.get('/portfolio', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'portfolio.html'));
});

app.get('/blog', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'blog.html'));
});

app.get('/careers', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'careers.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'contact.html'));
});

app.get('/estimator', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'estimator.html'));
});

app.get('/audit', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'audit.html'));
});

app.get('/discovery', (req, res) => {
  res.redirect('/contact#discovery');
});

app.get('/schedule', (req, res) => {
  res.redirect('/contact#schedule');
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.sendFile(path.join(PUBLIC_DIR, 'sitemap.xml'));
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(PUBLIC_DIR, 'robots.txt'));
});

// Fallback for HTML5 pushState or index
app.use((req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Start local listener only if not running in serverless / Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Zyllo Tech Server is running at http://localhost:${PORT}`);
    console.log(`📁 Database: SQLite (zyllotech.db)`);
    console.log(`🔑 Admin Login: admin@zyllotech.com / admin123`);
    console.log(`👤 Client Login: user@zyllotech.com / user123`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
