require('dotenv').config();
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('./database');

// In-memory active configuration
let activeSmtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT, 10) || 465,
  secure: process.env.SMTP_SECURE !== 'false',
  user: process.env.SMTP_USER || 'haasethabhiram@gmail.com',
  pass: process.env.SMTP_PASS || '',
  from_email: process.env.SMTP_FROM || 'haasethabhiram@gmail.com',
  from_name: 'Zyllo Tech Careers'
};

let transporter = null;
let isLiveSmtp = false;
let lastSmtpError = null;

/**
 * Initializes or re-initializes the nodemailer transporter based on database settings or env
 */
function initTransporter(callback) {
  // Read saved settings from SQLite settings table
  db.all('SELECT key, value FROM settings WHERE key LIKE "smtp_%"', [], (err, rows) => {
    if (!err && rows && rows.length > 0) {
      const dbConfig = {};
      rows.forEach(r => {
        dbConfig[r.key] = r.value;
      });

      if (dbConfig.smtp_host && dbConfig.smtp_user) {
        activeSmtpConfig.host = dbConfig.smtp_host;
        activeSmtpConfig.port = parseInt(dbConfig.smtp_port, 10) || 465;
        activeSmtpConfig.secure = dbConfig.smtp_secure === 'true' || activeSmtpConfig.port === 465;
        activeSmtpConfig.user = dbConfig.smtp_user;
        activeSmtpConfig.pass = dbConfig.smtp_pass || activeSmtpConfig.pass;
        activeSmtpConfig.from_email = dbConfig.smtp_from || activeSmtpConfig.user || 'haasethabhiram@gmail.com';
      }
    }

    if (activeSmtpConfig.host && activeSmtpConfig.user && activeSmtpConfig.pass) {
      transporter = nodemailer.createTransport({
        host: activeSmtpConfig.host,
        port: activeSmtpConfig.port,
        secure: activeSmtpConfig.secure,
        auth: {
          user: activeSmtpConfig.user,
          pass: activeSmtpConfig.pass
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      transporter.verify((verifyErr) => {
        if (verifyErr) {
          isLiveSmtp = false;
          lastSmtpError = verifyErr.message;
          console.warn(`⚠️ SMTP Verification Failed for ${activeSmtpConfig.host}:`, verifyErr.message);
          // Fallback to json transport
          transporter = nodemailer.createTransport({ jsonTransport: true });
          if (callback) callback(verifyErr, false);
        } else {
          isLiveSmtp = true;
          lastSmtpError = null;
          console.log(`🚀 [LIVE SMTP READY] Connected to ${activeSmtpConfig.host} as ${activeSmtpConfig.user}`);
          if (callback) callback(null, true);
        }
      });
    } else {
      isLiveSmtp = false;
      transporter = nodemailer.createTransport({ jsonTransport: true });
      console.log(`📧 Mailer in Local Development Mode (Real SMTP not yet configured). Emails logged to database.`);
      if (callback) callback(null, false);
    }
  });
}

// Initial initialization
initTransporter();

/**
 * Updates SMTP configuration, saves to SQLite settings table, and writes to .env
 */
function updateSmtpConfig(config, callback) {
  const host = (config.host || '').trim();
  const port = parseInt(config.port, 10) || (config.secure ? 465 : 587);
  const secure = config.secure === true || config.secure === 'true' || port === 465;
  const user = (config.user || '').trim();
  const pass = (config.pass || '').trim();
  const from_email = (config.from_email || user || 'haasethabhiram@gmail.com').trim();

  // Save to SQLite
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  stmt.run('smtp_host', host);
  stmt.run('smtp_port', String(port));
  stmt.run('smtp_secure', String(secure));
  stmt.run('smtp_user', user);
  if (pass) {
    stmt.run('smtp_pass', pass);
  }
  stmt.run('smtp_from', from_email);
  stmt.finalize((err) => {
    if (err) {
      if (callback) callback(err);
      return;
    }

    // Update active in-memory configuration
    activeSmtpConfig.host = host;
    activeSmtpConfig.port = port;
    activeSmtpConfig.secure = secure;
    activeSmtpConfig.user = user;
    if (pass) activeSmtpConfig.pass = pass;
    activeSmtpConfig.from_email = from_email;

    // Also persist to .env file for environment durability
    try {
      const envPath = path.resolve(__dirname, '.env');
      const envContent = [
        `SMTP_HOST=${host}`,
        `SMTP_PORT=${port}`,
        `SMTP_SECURE=${secure}`,
        `SMTP_USER=${user}`,
        pass ? `SMTP_PASS=${pass}` : `# SMTP_PASS retained`,
        `SMTP_FROM=${from_email}`
      ].join('\n') + '\n';
      fs.writeFileSync(envPath, envContent, 'utf8');
    } catch (e) {
      console.warn('Could not write to .env:', e.message);
    }

    // Re-verify and initialize
    initTransporter((verifyErr, success) => {
      if (callback) callback(verifyErr, success);
    });
  });
}

/**
 * Sends a live test email to verify inbox delivery
 */
async function testSmtpConnection(targetEmail) {
  if (!transporter) {
    throw new Error('Transporter not initialized');
  }

  const fromAddress = `"${activeSmtpConfig.from_name}" <${activeSmtpConfig.from_email || 'haasethabhiram@gmail.com'}>`;
  const subject = `Test Delivery from Zyllo Tech (${new Date().toLocaleTimeString()})`;
  const plainText = `Hi there,\n\nThis is a live test email from Zyllo Tech to verify that your SMTP server is connected and delivering emails directly to your Primary inbox.\n\nSender: ${activeSmtpConfig.from_email || 'haasethabhiram@gmail.com'}\nSent via: ${activeSmtpConfig.host || 'Local Transporter'}\nTimestamp: ${new Date().toISOString()}\n\nBest regards,\nZyllo Tech Engineering Team`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 20px auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; color: #1e293b;">
      <h2 style="color: #f96706; margin-top: 0;">Zyllo Tech SMTP Test Successful!</h2>
      <p>Hello,</p>
      <p>This email confirms that your outgoing mail server is properly authenticated and delivering messages directly to recipient inboxes.</p>
      <div style="background: #f8fafc; border-left: 4px solid #f96706; padding: 12px 16px; margin: 16px 0;">
        <div><strong>Sender:</strong> ${activeSmtpConfig.from_email || 'haasethabhiram@gmail.com'}</div>
        <div><strong>Outgoing SMTP Host:</strong> ${activeSmtpConfig.host || 'Local Simulator'}</div>
        <div><strong>Delivery Mode:</strong> ${isLiveSmtp ? 'Live Internet Delivery' : 'Local Simulation'}</div>
        <div><strong>Timestamp:</strong> ${new Date().toLocaleString()}</div>
      </div>
      <p style="color: #64748b; font-size: 13px;">Sent from Zyllo Tech Software Solutions &bull; ${activeSmtpConfig.from_email || 'haasethabhiram@gmail.com'}</p>
    </div>
  `;

  return await transporter.sendMail({
    from: fromAddress,
    replyTo: activeSmtpConfig.from_email || 'haasethabhiram@gmail.com',
    to: targetEmail,
    subject,
    text: plainText,
    html
  });
}

/**
 * Returns current SMTP status for Admin Dashboard UI
 */
function getSmtpStatus() {
  return {
    isLiveSmtp,
    host: activeSmtpConfig.host,
    port: activeSmtpConfig.port,
    secure: activeSmtpConfig.secure,
    user: activeSmtpConfig.user,
    from_email: activeSmtpConfig.from_email || 'haasethabhiram@gmail.com',
    lastError: lastSmtpError
  };
}

/**
 * Builds candidate confirmation email plain text (Crucial for Gmail Primary inbox classification!)
 */
function buildCandidateConfirmationText({ name, role, applicationId, experience }) {
  return `Dear ${name},

Thank you for applying for the ${role} position at Zyllo Tech.

We have received your profile and credentials, and your application is now under review by our technical hiring panel.

Application Summary:
- Application ID: #${applicationId}
- Position Applied: ${role}
- Candidate Name: ${name}
- Experience: ${experience || 'Not Specified'}
- Status: Profile Under Review

What Happens Next?
Our technical leads review each submitted profile against our current project and sprint requirements. If your background matches our technical roadmap, our talent acquisition team will reach out directly to schedule an introductory technical discussion.

In the meantime, feel free to explore our engineering projects and core technology capabilities at:
https://zyllotech.com

Best regards,
Zyllo Tech Talent Acquisition Team
haasethabhiram@gmail.com
Zyllo Tech Software Solutions Pvt. Ltd.
`;
}

/**
 * Builds candidate confirmation email HTML with embedded tracking pixel
 * Optimized with clean headers and high text-to-HTML ratio for Gmail Primary inbox delivery
 */
function buildCandidateConfirmationHtml({ name, role, trackingId, baseUrl, applicationId, experience }) {
  const trackingPixelUrl = `${baseUrl}/api/email-tracker/pixel/${trackingId}?_t=${Date.now()}`;
  const webViewUrl = `${baseUrl}/api/email-tracker/click/${trackingId}?to=/api/emails/${trackingId}/preview`;
  const careersUrl = `${baseUrl}/api/email-tracker/click/${trackingId}?to=/careers`;
  const homeUrl = `${baseUrl}/api/email-tracker/click/${trackingId}?to=/`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Received - Zyllo Tech</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    .email-container { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); }
    .email-header { background: #0b0e17; padding: 28px 32px 24px 32px; text-align: center; border-bottom: 3px solid #f96706; }
    .brand-logo { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase; color: #ffffff; }
    .brand-orange { color: #f96706; }
    .brand-cyan { color: #3089a6; }
    .email-body { padding: 32px; line-height: 1.6; }
    .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; }
    .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0; }
    .summary-row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #edf2f7; font-size: 14px; }
    .summary-row:last-child { border-bottom: none; }
    .summary-label { color: #64748b; font-weight: 500; }
    .summary-val { color: #0f172a; font-weight: 600; }
    .step-box { background: #f0f9ff; border-left: 3px solid #0284c7; padding: 14px 18px; border-radius: 0 6px 6px 0; margin-top: 20px; font-size: 14px; color: #334155; }
    .btn-action { display: inline-block; background: #f96706; color: #ffffff !important; text-decoration: none; font-weight: bold; padding: 12px 26px; border-radius: 6px; font-size: 14px; margin-top: 18px; box-shadow: 0 2px 8px rgba(249, 103, 6, 0.35); }
    .email-footer { background: #f8fafc; padding: 20px 32px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .email-footer a { color: #3089a6; text-decoration: none; }
  </style>
</head>
<body>
  <!-- Top Open Tracking Pixel (Fires instantly as header loads) -->
  <img src="${trackingPixelUrl}&pos=top" width="1" height="1" style="display:block;width:1px;height:1px;max-height:1px;max-width:1px;opacity:0.01;overflow:hidden;border:none;" alt="" />

  <div class="email-container">
    <div class="email-header">
      <div class="brand-logo"><span class="brand-orange">ZYLLO</span> <span class="brand-cyan">TECH</span></div>
      <div style="color: #94a3b8; font-size: 12px; margin-top: 4px; letter-spacing: 0.5px; text-transform: uppercase;">Talent Acquisition & Global Engineering</div>
    </div>
    
    <div class="email-body">
      <h1 class="greeting">We Have Received Your Profile & Application</h1>
      <p>Dear <strong>${name}</strong>,</p>
      <p>Thank you for your interest in joining <strong>Zyllo Tech</strong>. We are pleased to confirm that your profile and credentials have been received and logged into our recruitment system.</p>
      
      <div class="summary-card">
        <div class="summary-row"><span class="summary-label">Application ID:</span><span class="summary-val">#${applicationId}</span></div>
        <div class="summary-row"><span class="summary-label">Position Applied:</span><span class="summary-val" style="color: #f96706;">${role}</span></div>
        <div class="summary-row"><span class="summary-label">Applicant Name:</span><span class="summary-val">${name}</span></div>
        <div class="summary-row"><span class="summary-label">Experience:</span><span class="summary-val">${experience || 'Not Specified'}</span></div>
        <div class="summary-row"><span class="summary-label">Status:</span><span class="summary-val" style="color: #0284c7;">Profile In Review</span></div>
      </div>

      <div class="step-box">
        <strong style="color: #0284c7; display: block; margin-bottom: 4px;">What Happens Next?</strong>
        Our engineering leadership team actively reviews all submitted applications against our sprint requirements. If your qualifications match our current openings, our talent acquisition team will reach out directly to coordinate an introductory discussion.
      </div>

      <p style="margin-top: 20px; font-size: 13px; color: #64748b;">
        You can explore our engineering innovations and client case studies on our platform anytime.
      </p>

      <div style="text-align: center; margin: 24px 0 10px 0;">
        <a href="${careersUrl}" class="btn-action">Explore Zyllo Tech Careers</a>
      </div>
    </div>

    <div class="email-footer">
      <p style="margin: 0 0 6px 0;">This email was sent from <strong>${activeSmtpConfig.from_email || 'haasethabhiram@gmail.com'}</strong> regarding your application #${applicationId}.</p>
      <p style="margin: 0 0 6px 0;">&copy; 2026 Zyllo Tech Software Solutions. All rights reserved.</p>
      <p style="margin: 0;"><a href="${webViewUrl}">View this email in browser</a> | <a href="${homeUrl}">Visit Zyllo Tech</a></p>
    </div>
  </div>

  <!-- Bottom Open Tracking Pixel -->
  <img src="${trackingPixelUrl}&pos=bottom" width="1" height="1" style="display:block;width:1px;height:1px;max-height:1px;max-width:1px;opacity:0.01;overflow:hidden;border:none;" alt="" />
</body>
</html>`;
}

/**
 * Builds admin alert email HTML
 */
function buildAdminAlertHtml({ application, baseUrl }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>New Job Application Alert</title>
</head>
<body style="font-family: Arial, sans-serif; background: #070a13; color: #ffffff; padding: 20px;">
  <div style="max-width: 580px; margin: 0 auto; background: #0d1220; border: 1px solid rgba(249,103,6,0.3); border-radius: 10px; padding: 24px;">
    <span style="background: #f96706; color: #fff; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase;">New Applicant Alert</span>
    <h2 style="color: #ffffff; margin: 12px 0;">⚡ ${application.name} applied for ${application.role}</h2>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
      <tr><td style="padding: 8px 0; color: #94a3b8; width: 35%;">Candidate:</td><td style="color: #fff; font-weight: bold;">${application.name}</td></tr>
      <tr><td style="padding: 8px 0; color: #94a3b8;">Role:</td><td style="color: #f96706; font-weight: bold;">${application.role}</td></tr>
      <tr><td style="padding: 8px 0; color: #94a3b8;">Email:</td><td><a href="mailto:${application.email}" style="color: #38bdf8;">${application.email}</a></td></tr>
      <tr><td style="padding: 8px 0; color: #94a3b8;">Phone:</td><td style="color: #fff;">${application.phone || 'N/A'}</td></tr>
      <tr><td style="padding: 8px 0; color: #94a3b8;">Experience:</td><td style="color: #fff;">${application.experience || 'Not specified'}</td></tr>
      <tr><td style="padding: 8px 0; color: #94a3b8;">Resume:</td><td style="color: #fff;">${application.resume_link ? 'Stored on server' : 'None'}</td></tr>
      <tr><td style="padding: 8px 0; color: #94a3b8;">Cover Note:</td><td style="color: #cbd5e1;">${application.cover_note || 'None'}</td></tr>
    </table>
    <div style="text-align: center; margin-top: 20px;">
      <a href="${baseUrl}/dashboard" style="background: #f96706; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; font-size: 14px;">Review in Admin Dashboard</a>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Sends confirmation email to candidate with tracking pixel
 * Optimized with multipart MIME (plain text + HTML) for Primary inbox placement
 */
async function sendCandidateConfirmation({ application, baseUrl }) {
  const trackingId = crypto.randomBytes(16).toString('hex');
  const subject = `Application Received: ${application.role} - Zyllo Tech`;
  const htmlContent = buildCandidateConfirmationHtml({
    name: application.name,
    role: application.role,
    trackingId,
    baseUrl,
    applicationId: application.id,
    experience: application.experience
  });
  const plainText = buildCandidateConfirmationText({
    name: application.name,
    role: application.role,
    applicationId: application.id,
    experience: application.experience
  });

  const isGmailSmtp = activeSmtpConfig.host && activeSmtpConfig.host.toLowerCase().includes('gmail.com');
  const senderEmail = (isGmailSmtp && activeSmtpConfig.user) ? activeSmtpConfig.user : (activeSmtpConfig.from_email || activeSmtpConfig.user || 'haasethabhiram@gmail.com');
  const fromHeader = `"${activeSmtpConfig.from_name || 'Zyllo Tech Careers'}" <${senderEmail}>`;

  return new Promise((resolve) => {
    const initialStatus = isLiveSmtp ? 'Sending' : 'Local Outbox';
    const stmt = db.prepare(`
      INSERT INTO email_logs (tracking_id, type, application_id, sender, recipient, recipient_name, subject, html_content, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      trackingId,
      'job_confirmation',
      application.id,
      senderEmail,
      application.email.toLowerCase(),
      application.name,
      subject,
      htmlContent,
      initialStatus,
      async function(err) {
        if (err) {
          console.error('Failed to log outgoing confirmation email:', err);
        }

        db.run(`
          UPDATE job_applications
          SET email_sent = 1,
              email_tracking_id = ?,
              email_opened = 0,
              email_open_count = 0
          WHERE id = ?
        `, [trackingId, application.id]);

        let deliverySuccess = false;
        let deliveryError = null;

        try {
          if (!transporter) {
            transporter = nodemailer.createTransport({ jsonTransport: true });
          }

          const sendResult = await transporter.sendMail({
            from: fromHeader,
            replyTo: activeSmtpConfig.from_email || 'haasethabhiram@gmail.com',
            to: application.email,
            subject,
            text: plainText,
            html: htmlContent,
            headers: {
              'X-Entity-Ref-ID': `app-${application.id}`,
              'Priority': 'normal',
              'Importance': 'normal'
            }
          });

          if (isLiveSmtp) {
            deliverySuccess = true;
            db.run('UPDATE email_logs SET status = ? WHERE tracking_id = ?', ['Sent', trackingId]);
            console.log(`🚀 [REAL EMAIL DELIVERED OVER SMTP] To: ${application.email} | From: ${senderEmail} | Subject: "${subject}"`);
          } else {
            deliverySuccess = false;
            db.run('UPDATE email_logs SET status = ? WHERE tracking_id = ?', ['Local Outbox', trackingId]);
            console.log(`📬 [LOCAL OUTBOX STORED] To: ${application.email} | View at: ${baseUrl}/api/emails/${trackingId}/preview`);
          }
        } catch (mailErr) {
          deliveryError = mailErr.message;
          db.run('UPDATE email_logs SET status = ? WHERE tracking_id = ?', ['Failed: ' + mailErr.message, trackingId]);
          console.error('Error dispatching mail through transporter:', mailErr.message);
        }

        // Mirror to HR Candidate Communications ledger
        db.run(`
          INSERT INTO hr_candidate_emails (
            tracking_id, candidate_id, candidate_name, candidate_email,
            sender_email, sender_name, subject, body_html, body_text,
            tracking_enabled, delivery_status, delivery_details, open_status, open_count,
            created_at
          ) VALUES (?, ?, ?, ?, ?, 'Zyllo Tech Careers Auto-Desk', ?, ?, ?, 1, ?, 'Career Application Auto-Confirmation', 'Not detected', 0, CURRENT_TIMESTAMP)
          ON CONFLICT(tracking_id) DO UPDATE SET delivery_status = excluded.delivery_status
        `, [
          trackingId,
          application.id,
          application.name,
          application.email.toLowerCase(),
          senderEmail,
          subject,
          htmlContent,
          plainText,
          deliverySuccess ? 'Delivered' : (isLiveSmtp ? 'Delivered' : 'Queued')
        ]);

        resolve({
          success: !deliveryError,
          trackingId,
          isLiveSmtp,
          error: deliveryError
        });
      }
    );
    stmt.finalize();
  });
}

/**
 * Sends alert notification to Admin and logs in database
 */
async function sendAdminAlert({ application, baseUrl }) {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL || 'admin@zyllotech.com';
  const trackingId = crypto.randomBytes(16).toString('hex');
  const subject = `⚡ New Job Application: ${application.name} applied for ${application.role}`;
  const htmlContent = buildAdminAlertHtml({ application, baseUrl });
  const senderEmail = activeSmtpConfig.from_email || activeSmtpConfig.user || 'haasethabhiram@gmail.com';
  const fromHeader = `"Zyllo Tech Careers Alert" <${senderEmail}>`;

  return new Promise((resolve) => {
    db.run(`
      INSERT INTO admin_alerts (type, title, message, reference_id)
      VALUES (?, ?, ?, ?)
    `, [
      'job_application',
      `New Application: ${application.name}`,
      `${application.name} applied for ${application.role} (${application.experience || 'Experience not specified'})`,
      application.id
    ]);

    const stmt = db.prepare(`
      INSERT INTO email_logs (tracking_id, type, application_id, sender, recipient, recipient_name, subject, html_content, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      trackingId,
      'admin_alert',
      application.id,
      senderEmail,
      adminEmail,
      'Zyllo Administrator',
      subject,
      htmlContent,
      'Sent',
      async function(err) {
        if (err) {
          console.error('Failed to log admin alert email:', err);
        }

        try {
          if (!transporter) {
            transporter = nodemailer.createTransport({ jsonTransport: true });
          }

          await transporter.sendMail({
            from: fromHeader,
            replyTo: activeSmtpConfig.from_email || 'haasethabhiram@gmail.com',
            to: adminEmail,
            subject,
            html: htmlContent
          });
        } catch (mailErr) {
          console.error('Error dispatching admin alert email:', mailErr.message);
        }

        resolve({ success: true });
      }
    );
    stmt.finalize();
  });
}

/**
 * Records an email open / watched event from the tracking pixel or web preview
 */
function recordEmailOpen(trackingId, ip = 'unknown', userAgent = 'unknown', callback) {
  db.get('SELECT * FROM email_logs WHERE tracking_id = ?', [trackingId], (err, log) => {
    if (err || !log) {
      if (callback) callback(err || new Error('Tracking ID not found'), null);
      return;
    }

    // Bot / Scanner detection (exclude GoogleImageProxy since Gmail uses it for real candidate reads)
    const isBot = /bot|crawl|spider|slurp|facebookexternalhit|preview|scan|curl|wget|python-requests/i.test(userAgent) && !/GoogleImageProxy/i.test(userAgent);
    if (isBot) {
      console.log(`🤖 [SCANNER DETECTED] Pixel hit by automated scanner for tracking ID: ${trackingId} (${userAgent})`);
      if (callback) callback(null, { ...log, is_bot_scanner: true });
      return;
    }

    // Debounce duplicate hits within 5 seconds from same tracking ID (e.g. top + bottom pixels in same render)
    if (log.last_opened_at) {
      const lastTime = new Date(log.last_opened_at).getTime();
      const nowTime = Date.now();
      if (nowTime - lastTime < 5000) {
        console.log(`⏱️ [DUPLICATE HIT DEBOUNCED] Confirmation Tracking ID: ${trackingId}`);
        if (callback) callback(null, { ...log, debounced: true });
        return;
      }
    }

    db.run(`
      UPDATE email_logs
      SET status = 'Opened',
          open_count = open_count + 1,
          first_opened_at = COALESCE(first_opened_at, CURRENT_TIMESTAMP),
          last_opened_at = CURRENT_TIMESTAMP,
          ip_address = ?,
          user_agent = ?
      WHERE tracking_id = ?
    `, [ip, userAgent, trackingId], function(updateErr) {
      if (updateErr) {
        console.error('Error updating email_logs on open:', updateErr);
      }

      if (log.application_id) {
        db.run(`
          UPDATE job_applications
          SET email_opened = 1,
              email_open_count = email_open_count + 1,
              email_first_opened_at = COALESCE(email_first_opened_at, CURRENT_TIMESTAMP),
              email_last_opened_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [log.application_id]);
      }

      // Also sync to HR Candidate Tracking ledger
      db.run(`
        UPDATE hr_candidate_emails
        SET open_status = 'Opened',
            open_count = open_count + 1,
            first_opened_at = COALESCE(first_opened_at, CURRENT_TIMESTAMP),
            last_opened_at = CURRENT_TIMESTAMP
        WHERE tracking_id = ?
      `, [trackingId]);

      db.run(`
        INSERT INTO hr_email_events (email_id, tracking_id, event_type, ip_address, user_agent, opened_at, is_bot_scanner)
        SELECT id, tracking_id, 'open', ?, ?, CURRENT_TIMESTAMP, 0
        FROM hr_candidate_emails WHERE tracking_id = ?
      `, [ip, userAgent, trackingId]);

      console.log(`👁️ [EMAIL OPENED / WATCHED] Tracking ID: ${trackingId} | Recipient: ${log.recipient} | Total Opens: ${log.open_count + 1}`);
      if (callback) callback(null, { ...log, open_count: log.open_count + 1 });
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Builds candidate application status update email text
 */
function buildCandidateStatusUpdateText({ name, role, newStatus, applicationId, note }) {
  return `Dear ${name},

Your application status for the ${role} position at Zyllo Tech has been updated.

Application Summary:
- Application ID: #${applicationId}
- Position: ${role}
- Candidate Name: ${name}
- Updated Status: ${newStatus}
${note ? `\nNote from Hiring Team:\n${note}\n` : ''}
Next Steps:
${newStatus === 'Interview Scheduled' ? 'Our recruitment team will contact you shortly with the meeting link and available calendar slots.' : ''}
${newStatus === 'Shortlisted' ? 'Our technical leads are conducting final portfolio reviews and will be in touch with next steps.' : ''}
${newStatus === 'In Review' ? 'Your profile is currently under active review by our engineering leadership panel.' : ''}
${newStatus === 'Hired' ? 'Congratulations and welcome to Zyllo Tech! Our HR team will reach out with onboarding details.' : ''}
${newStatus === 'Rejected' ? 'Thank you for your interest in Zyllo Tech. We will retain your profile for suitable future openings.' : ''}

Best regards,
Zyllo Tech Talent Acquisition Team
haasethabhiram@gmail.com
Zyllo Tech Software Solutions Pvt. Ltd.
`;
}

/**
 * Builds candidate application status update email HTML with tracking pixel
 */
function buildCandidateStatusUpdateHtml({ name, role, newStatus, trackingId, baseUrl, applicationId, note }) {
  const trackingPixelUrl = `${baseUrl}/api/email-tracker/pixel/${trackingId}?_t=${Date.now()}`;
  const webViewUrl = `${baseUrl}/api/email-tracker/click/${trackingId}?to=/api/emails/${trackingId}/preview`;
  const careersUrl = `${baseUrl}/api/email-tracker/click/${trackingId}?to=/careers`;
  const homeUrl = `${baseUrl}/api/email-tracker/click/${trackingId}?to=/`;

  let badgeColor = '#0284c7';
  let badgeBg = '#e0f2fe';
  let statusMessage = '';

  if (newStatus === 'Interview Scheduled') {
    badgeColor = '#7c3aed';
    badgeBg = '#f3e8ff';
    statusMessage = `We are pleased to inform you that our engineering team was impressed by your profile and would like to invite you for an interview for the <strong>${escapeHtml(role)}</strong> position.`;
  } else if (newStatus === 'Shortlisted') {
    badgeColor = '#059669';
    badgeBg = '#d1fae5';
    statusMessage = `Great news! Your qualifications and background have stood out, and you have been <strong>Shortlisted</strong> for the <strong>${escapeHtml(role)}</strong> role.`;
  } else if (newStatus === 'In Review') {
    badgeColor = '#d97706';
    badgeBg = '#fef3c7';
    statusMessage = `Your application for <strong>${escapeHtml(role)}</strong> is currently undergoing technical and portfolio review by our engineering leads.`;
  } else if (newStatus === 'Hired') {
    badgeColor = '#16a34a';
    badgeBg = '#dcfce7';
    statusMessage = `Congratulations! We are thrilled to welcome you to the team for the <strong>${escapeHtml(role)}</strong> position at Zyllo Tech.`;
  } else if (newStatus === 'Rejected') {
    badgeColor = '#475569';
    badgeBg = '#f1f5f9';
    statusMessage = `Thank you for taking the time to apply and interview for the <strong>${escapeHtml(role)}</strong> position. While we are unable to advance with your application at this time, we will keep your profile on file for future opportunities.`;
  } else {
    badgeColor = '#0284c7';
    badgeBg = '#e0f2fe';
    statusMessage = `Your application status for the <strong>${escapeHtml(role)}</strong> position has been updated to <strong>${escapeHtml(newStatus)}</strong>.`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Status Update - Zyllo Tech</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    .email-container { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); }
    .email-header { background: #0b0e17; padding: 28px 32px 24px 32px; text-align: center; border-bottom: 3px solid #f96706; }
    .brand-logo { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase; color: #ffffff; }
    .brand-orange { color: #f96706; }
    .brand-cyan { color: #3089a6; }
    .email-body { padding: 32px; line-height: 1.6; }
    .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; }
    .status-badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
    .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0; }
    .summary-row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #edf2f7; font-size: 14px; }
    .summary-row:last-child { border-bottom: none; }
    .summary-label { color: #64748b; font-weight: 500; }
    .summary-val { color: #0f172a; font-weight: 600; }
    .note-box { background: #f8fafc; border-left: 4px solid #f96706; padding: 14px 18px; border-radius: 0 6px 6px 0; margin: 18px 0; font-size: 14px; color: #334155; }
    .btn-action { display: inline-block; background: #f96706; color: #ffffff !important; text-decoration: none; font-weight: bold; padding: 12px 26px; border-radius: 6px; font-size: 14px; margin-top: 18px; box-shadow: 0 2px 8px rgba(249, 103, 6, 0.35); }
    .email-footer { background: #f8fafc; padding: 20px 32px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .email-footer a { color: #3089a6; text-decoration: none; }
  </style>
</head>
<body>
  <!-- Top Open Tracking Pixel -->
  <img src="${trackingPixelUrl}&pos=top" width="1" height="1" style="display:block;width:1px;height:1px;max-height:1px;max-width:1px;opacity:0.01;overflow:hidden;border:none;" alt="" />

  <div class="email-container">
    <div class="email-header">
      <div class="brand-logo"><span class="brand-orange">ZYLLO</span> <span class="brand-cyan">TECH</span></div>
      <div style="color: #94a3b8; font-size: 12px; margin-top: 4px; letter-spacing: 0.5px; text-transform: uppercase;">Talent Acquisition & Global Engineering</div>
    </div>
    
    <div class="email-body">
      <div style="margin-bottom: 14px;">
        <span class="status-badge" style="background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeColor};">
          Status: ${escapeHtml(newStatus)}
        </span>
      </div>

      <h1 class="greeting">Application Status Update for ${escapeHtml(role)}</h1>
      <p>Dear <strong>${escapeHtml(name)}</strong>,</p>
      <p>${statusMessage}</p>

      ${note ? `
      <div class="note-box">
        <strong style="color: #0f172a; display: block; margin-bottom: 4px;">Note from Technical Hiring Lead:</strong>
        ${escapeHtml(note).replace(/\n/g, '<br>')}
      </div>
      ` : ''}

      <div class="summary-card">
        <div class="summary-row"><span class="summary-label">Application ID:</span><span class="summary-val">#${applicationId}</span></div>
        <div class="summary-row"><span class="summary-label">Position:</span><span class="summary-val" style="color: #f96706;">${escapeHtml(role)}</span></div>
        <div class="summary-row"><span class="summary-label">Candidate Name:</span><span class="summary-val">${escapeHtml(name)}</span></div>
        <div class="summary-row"><span class="summary-label">Current Status:</span><span class="summary-val" style="color: ${badgeColor};">${escapeHtml(newStatus)}</span></div>
      </div>

      <p style="margin-top: 20px; font-size: 13px; color: #64748b;">
        If you have any questions regarding your application or scheduling, feel free to reply directly to this email or reach us at <a href="mailto:haasethabhiram@gmail.com" style="color: #3089a6;">haasethabhiram@gmail.com</a>.
      </p>

      <div style="text-align: center; margin: 24px 0 10px 0;">
        <a href="${careersUrl}" class="btn-action">Visit Zyllo Tech Careers</a>
      </div>
    </div>

    <div class="email-footer">
      <p style="margin: 0 0 6px 0;">This email was sent from <strong>${activeSmtpConfig.from_email || 'haasethabhiram@gmail.com'}</strong> regarding your application #${applicationId}.</p>
      <p style="margin: 0 0 6px 0;">&copy; 2026 Zyllo Tech Software Solutions. All rights reserved.</p>
      <p style="margin: 0;"><a href="${webViewUrl}">View this email in browser</a> | <a href="${homeUrl}">Visit Zyllo Tech</a></p>
    </div>
  </div>

  <!-- Bottom Open Tracking Pixel -->
  <img src="${trackingPixelUrl}&pos=bottom" width="1" height="1" style="display:block;width:1px;height:1px;max-height:1px;max-width:1px;opacity:0.01;overflow:hidden;border:none;" alt="" />
</body>
</html>`;
}

/**
 * Sends candidate status update email with tracking pixel and logs to database
 */
async function sendCandidateStatusUpdate({ application, newStatus, note, baseUrl }) {
  const trackingId = crypto.randomBytes(16).toString('hex');
  const subject = `Application Update: ${application.role} - Status: ${newStatus} | Zyllo Tech`;
  const htmlContent = buildCandidateStatusUpdateHtml({
    name: application.name,
    role: application.role,
    newStatus,
    note: note || '',
    trackingId,
    baseUrl,
    applicationId: application.id
  });
  const plainText = buildCandidateStatusUpdateText({
    name: application.name,
    role: application.role,
    newStatus,
    note: note || '',
    applicationId: application.id
  });

  const isGmailSmtp = activeSmtpConfig.host && activeSmtpConfig.host.toLowerCase().includes('gmail.com');
  const senderEmail = (isGmailSmtp && activeSmtpConfig.user) ? activeSmtpConfig.user : (activeSmtpConfig.from_email || activeSmtpConfig.user || 'haasethabhiram@gmail.com');
  const fromHeader = `"${activeSmtpConfig.from_name || 'Zyllo Tech Careers'}" <${senderEmail}>`;

  return new Promise((resolve) => {
    const initialStatus = isLiveSmtp ? 'Sending' : 'Local Outbox';
    const stmt = db.prepare(`
      INSERT INTO email_logs (tracking_id, type, application_id, sender, recipient, recipient_name, subject, html_content, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      trackingId,
      'status_update',
      application.id,
      senderEmail,
      application.email.toLowerCase(),
      application.name,
      subject,
      htmlContent,
      initialStatus,
      async function(err) {
        if (err) {
          console.error('Failed to log outgoing status update email:', err);
        }

        let deliverySuccess = false;
        let deliveryError = null;

        try {
          if (!transporter) {
            transporter = nodemailer.createTransport({ jsonTransport: true });
          }

          const sendResult = await transporter.sendMail({
            from: fromHeader,
            replyTo: activeSmtpConfig.from_email || 'haasethabhiram@gmail.com',
            to: application.email,
            subject,
            text: plainText,
            html: htmlContent,
            headers: {
              'X-Entity-Ref-ID': `app-status-${application.id}`,
              'Priority': 'normal',
              'Importance': 'normal'
            }
          });

          if (isLiveSmtp) {
            deliverySuccess = true;
            db.run('UPDATE email_logs SET status = ? WHERE tracking_id = ?', ['Sent', trackingId]);
            console.log(`🚀 [STATUS UPDATE EMAIL SENT OVER SMTP] To: ${application.email} | Status: ${newStatus} | From: ${senderEmail}`);
          } else {
            deliverySuccess = false;
            db.run('UPDATE email_logs SET status = ? WHERE tracking_id = ?', ['Local Outbox', trackingId]);
            console.log(`📬 [LOCAL OUTBOX STORED STATUS UPDATE] To: ${application.email} | View at: ${baseUrl}/api/emails/${trackingId}/preview`);
          }
        } catch (mailErr) {
          deliveryError = mailErr.message;
          db.run('UPDATE email_logs SET status = ? WHERE tracking_id = ?', ['Failed: ' + mailErr.message, trackingId]);
          console.error('Error dispatching status update mail:', mailErr.message);
        }

        // Mirror to HR Candidate Communications ledger
        db.run(`
          INSERT INTO hr_candidate_emails (
            tracking_id, candidate_id, candidate_name, candidate_email,
            sender_email, sender_name, subject, body_html, body_text,
            tracking_enabled, delivery_status, delivery_details, open_status, open_count,
            created_at
          ) VALUES (?, ?, ?, ?, ?, 'Zyllo Tech Careers Auto-Desk', ?, ?, ?, 1, ?, 'Application Status Update Notification', 'Not detected', 0, CURRENT_TIMESTAMP)
          ON CONFLICT(tracking_id) DO UPDATE SET delivery_status = excluded.delivery_status
        `, [
          trackingId,
          application.id,
          application.name,
          application.email.toLowerCase(),
          senderEmail,
          subject,
          htmlContent,
          plainText,
          deliverySuccess ? 'Delivered' : (isLiveSmtp ? 'Delivered' : 'Queued')
        ]);

        resolve({
          success: !deliveryError,
          trackingId,
          isLiveSmtp,
          error: deliveryError
        });
      }
    );
    stmt.finalize();
  });
}

/**
 * Sends an email from an authorized HR representative to a candidate,
 * optionally injecting an open tracking pixel and logging the send event.
 */
async function sendHrCandidateEmail({
  candidateId = null,
  candidateName,
  candidateEmail,
  senderEmail = 'hr@zyllotech.com',
  senderName = 'HR Operations Lead',
  subject,
  bodyHtml,
  bodyText = '',
  trackingEnabled = true,
  attachments = [],
  baseUrl = 'http://localhost:3000'
}) {
  return new Promise(async (resolve, reject) => {
    try {
      const trackingId = crypto.randomBytes(16).toString('hex');
      let finalHtml = bodyHtml || '';

      // Standard recruitment footer
      const hrFooterHtml = `
        <div style="margin-top: 36px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #718096; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5;">
          <p style="margin: 0 0 4px 0;"><strong>Zyllo Tech Talent Acquisition &amp; People Operations</strong></p>
          <p style="margin: 0 0 4px 0;">This communication is confidential and intended solely for the addressee (<strong>${escapeHtml(candidateName || candidateEmail)}</strong>).</p>
          <p style="margin: 0 0 8px 0; color: #a0aec0;">If you received this message in error, please reply to alert the sender and delete all copies.</p>
          <p style="margin: 0;"><a href="${baseUrl}/api/hr/emails/${trackingId}/view" style="color: #2563eb; text-decoration: underline; font-weight: 600;">View Official Correspondence in Candidate Portal</a></p>
        </div>
      `;

      if (trackingEnabled) {
        const trackingPixel = `<img src="${baseUrl}/api/hr/track/open/${trackingId}" alt="" width="1" height="1" border="0" style="display:block;width:1px!important;height:1px!important;border:0!important;margin:0!important;padding:0!important;outline:none!important;" />`;
        finalHtml = `${finalHtml}\n${trackingPixel}\n${hrFooterHtml}`;
      } else {
        finalHtml = `${finalHtml}\n${hrFooterHtml}`;
      }

      const mailOptions = {
        from: `"${senderName}" <${activeSmtpConfig.from_email || senderEmail}>`,
        to: candidateEmail,
        subject: subject,
        html: finalHtml,
        text: bodyText || (bodyHtml ? bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '')
      };

      if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        mailOptions.attachments = attachments;
      }

      let deliveryStatus = 'Delivered';
      let deliveryDetails = 'Dispatched successfully';
      let errorMsg = null;

      try {
        if (transporter) {
          const info = await transporter.sendMail(mailOptions);
          deliveryDetails = `Message ID: ${info.messageId || 'Generated'}`;
          console.log(`✉️ [HR CANDIDATE EMAIL SENT] Recipient: ${candidateEmail} | Tracking: ${trackingEnabled ? 'ENABLED (' + trackingId + ')' : 'DISABLED'}`);
        } else {
          deliveryStatus = 'Sent (Dev Mode)';
          deliveryDetails = 'Transporter not ready; saved to tracking ledger';
        }
      } catch (sendErr) {
        console.error('⚠️ [HR EMAIL DISPATCH ERROR]:', sendErr.message);
        deliveryStatus = 'Failed';
        deliveryDetails = sendErr.message;
        errorMsg = sendErr.message;
      }

      const attachmentsJson = attachments && attachments.length > 0 ? JSON.stringify(attachments.map(a => a.filename || 'attachment')) : null;

      // Save record in hr_candidate_emails
      db.run(
        `INSERT INTO hr_candidate_emails (
          tracking_id, candidate_id, candidate_name, candidate_email,
          sender_email, sender_name, subject, body_html, body_text,
          tracking_enabled, delivery_status, delivery_details, open_status, open_count,
          attachments_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Not detected', 0, ?, CURRENT_TIMESTAMP)`,
        [
          trackingId,
          candidateId ? parseInt(candidateId, 10) : null,
          candidateName || 'Candidate',
          candidateEmail,
          senderEmail,
          senderName,
          subject,
          finalHtml,
          mailOptions.text,
          trackingEnabled ? 1 : 0,
          deliveryStatus,
          deliveryDetails,
          attachmentsJson
        ],
        function (err) {
          if (err) {
            console.error('Error recording hr_candidate_emails:', err);
            return reject(err);
          }
          const emailId = this.lastID;

          // Record sent event in audit ledger
          db.run(
            `INSERT INTO hr_email_events (email_id, tracking_id, event_type, ip_address, user_agent, opened_at, is_bot_scanner)
             VALUES (?, ?, 'sent', 'System Handshake', 'Zyllo Mail Dispatcher', CURRENT_TIMESTAMP, 0)`,
            [emailId, trackingId]
          );

          // Admin notification alert
          db.run(
            `INSERT INTO admin_alerts (type, title, message, reference_id, is_read, created_at)
             VALUES ('hr_email_sent', 'Candidate Email Dispatched', ?, ?, 0, CURRENT_TIMESTAMP)`,
            [`${senderName} emailed candidate ${candidateName} regarding "${subject}"`, emailId]
          );

          resolve({
            success: deliveryStatus !== 'Failed',
            emailId,
            trackingId,
            deliveryStatus,
            deliveryDetails,
            trackingEnabled,
            error: errorMsg
          });
        }
      );
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Records an email open event for a candidate email
 */
function recordHrEmailOpen(trackingId, ip = 'unknown', userAgent = 'unknown', callback) {
  db.get('SELECT * FROM hr_candidate_emails WHERE tracking_id = ?', [trackingId], (err, log) => {
    if (err || !log) {
      if (callback) callback(err || new Error('HR Email Tracking ID not found'), null);
      return;
    }

    // If tracking is disabled, do not record opens
    if (log.tracking_enabled === 0) {
      if (callback) callback(null, { ...log, tracking_disabled: true });
      return;
    }

    // Bot / Scanner detection (exclude GoogleImageProxy since Gmail uses it for real candidate reads)
    const isBot = /bot|crawl|spider|slurp|facebookexternalhit|preview|scan|curl|wget|python-requests/i.test(userAgent) && !/GoogleImageProxy/i.test(userAgent);

    // Save event to timeline
    db.run(
      `INSERT INTO hr_email_events (email_id, tracking_id, event_type, ip_address, user_agent, opened_at, is_bot_scanner)
       VALUES (?, ?, 'open', ?, ?, CURRENT_TIMESTAMP, ?)`,
      [log.id, trackingId, ip, userAgent, isBot ? 1 : 0],
      function (eventErr) {
        if (eventErr) console.error('Error inserting hr_email_events:', eventErr);
      }
    );

    // If it's a known automated crawler/scanner, don't increment user open count
    if (isBot) {
      console.log(`🤖 [SCANNER DETECTED] Pixel hit by automated scanner for tracking ID: ${trackingId} (${userAgent})`);
      if (callback) callback(null, { ...log, is_bot_scanner: true });
      return;
    }

    // Debounce duplicate hits within 5 seconds from same tracking ID
    if (log.last_opened_at) {
      const lastTime = new Date(log.last_opened_at).getTime();
      const nowTime = Date.now();
      if (nowTime - lastTime < 5000) {
        console.log(`⏱️ [DUPLICATE HIT DEBOUNCED] Tracking ID: ${trackingId}`);
        if (callback) callback(null, { ...log, debounced: true });
        return;
      }
    }

    // Update email record with new open stats
    db.run(
      `UPDATE hr_candidate_emails
       SET open_status = 'Opened',
           open_count = open_count + 1,
           first_opened_at = COALESCE(first_opened_at, CURRENT_TIMESTAMP),
           last_opened_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [log.id],
      function (updateErr) {
        if (updateErr) {
          console.error('Error updating hr_candidate_emails on open:', updateErr);
        }

        // Also update job_applications table if linked
        if (log.candidate_id) {
          db.run(
            `UPDATE job_applications
             SET email_opened = 1,
                 email_open_count = email_open_count + 1,
                 email_first_opened_at = COALESCE(email_first_opened_at, CURRENT_TIMESTAMP),
                 email_last_opened_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [log.candidate_id]
          );
        }

        // Also update email_logs if present
        db.run(
          `UPDATE email_logs
           SET status = 'Opened',
               open_count = open_count + 1,
               first_opened_at = COALESCE(first_opened_at, CURRENT_TIMESTAMP),
               last_opened_at = CURRENT_TIMESTAMP
           WHERE tracking_id = ?`,
          [trackingId]
        );

        console.log(`👁️ [HR CANDIDATE EMAIL OPENED] Candidate: ${log.candidate_name} (${log.candidate_email}) | Subject: "${log.subject}" | Opens: ${log.open_count + 1}`);
        if (callback) callback(null, { ...log, open_status: 'Opened', open_count: log.open_count + 1 });
      }
    );
  });
}

module.exports = {
  initTransporter,
  getSmtpStatus,
  updateSmtpConfig,
  testSmtpConnection,
  sendCandidateConfirmation,
  sendCandidateStatusUpdate,
  sendAdminAlert,
  recordEmailOpen,
  sendHrCandidateEmail,
  recordHrEmailOpen,
  buildCandidateConfirmationHtml,
  buildCandidateStatusUpdateHtml,
  buildAdminAlertHtml
};
