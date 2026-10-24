const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const logoPath = path.join(__dirname, 'public', 'assets', 'images', 'zyllo-logo.png');
let logoBase64 = '';
if (fs.existsSync(logoPath)) {
  logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
}

function getHtml(theme = 'dark') {
  const isDark = theme === 'dark';

  const bgVoid = isDark ? '#0b0922' : '#ffffff';
  const cardBg = isDark ? 'rgba(20, 17, 56, 0.75)' : '#f8f9fd';
  const textMain = isDark ? '#ffffff' : '#141138';
  const textMuted = isDark ? '#9fa7ce' : '#575c7e';
  const borderCol = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(38, 34, 98, 0.12)';
  const gridLine = isDark ? 'rgba(255, 255, 255, 0.025)' : 'rgba(38, 34, 98, 0.035)';
  const glow1 = isDark ? 'rgba(241, 102, 35, 0.22)' : 'rgba(241, 102, 35, 0.12)';
  const glow2 = isDark ? 'rgba(38, 34, 98, 0.55)' : 'rgba(38, 34, 98, 0.08)';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Zyllo Tech Corporate Cover Page (${theme})</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@500;600;700;800&display=swap');

    @page {
      size: A4 portrait;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      width: 210mm;
      height: 297mm;
      max-width: 210mm;
      max-height: 297mm;
      background-color: ${bgVoid};
      color: ${textMain};
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      overflow: hidden;
      position: relative;
    }

    .bg-mesh {
      position: absolute;
      inset: 0;
      background-image: 
        radial-gradient(circle at 18% 18%, ${glow1} 0%, transparent 45%),
        radial-gradient(circle at 82% 82%, ${glow2} 0%, transparent 55%),
        radial-gradient(circle at 75% 20%, rgba(241, 102, 35, 0.1) 0%, transparent 35%),
        linear-gradient(${gridLine} 1px, transparent 1px),
        linear-gradient(90deg, ${gridLine} 1px, transparent 1px);
      background-size: 100% 100%, 100% 100%, 100% 100%, 36px 36px, 36px 36px;
      z-index: 1;
    }

    .accent-bar {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 7mm;
      background: linear-gradient(180deg, #f16623 0%, #ff7d3b 35%, #262262 70%, #16133d 100%);
      z-index: 10;
    }

    .geom-wireframe {
      position: absolute;
      top: 22mm;
      right: 18mm;
      width: 80mm;
      height: 80mm;
      border: 1px dashed rgba(241, 102, 35, 0.28);
      border-radius: 50%;
      z-index: 2;
      pointer-events: none;
    }

    .geom-wireframe-inner {
      position: absolute;
      top: 10mm;
      left: 10mm;
      right: 10mm;
      bottom: 10mm;
      border: 1px solid rgba(241, 102, 35, 0.15);
      border-radius: 50%;
      background: radial-gradient(circle, rgba(241, 102, 35, 0.06) 0%, transparent 70%);
    }

    .page-content {
      position: relative;
      z-index: 5;
      width: 100%;
      height: 100%;
      padding: 20mm 20mm 18mm 25mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid ${borderCol};
      padding-bottom: 6mm;
    }

    .brand-logo-img {
      height: 48px;
      width: auto;
      object-fit: contain;
      filter: drop-shadow(0 2px 8px rgba(0,0,0,0.25));
    }

    .header-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 14px;
      border-radius: 9999px;
      background: rgba(241, 102, 35, 0.1);
      border: 1px solid rgba(241, 102, 35, 0.35);
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #f16623;
    }

    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #f16623;
      box-shadow: 0 0 8px #f16623;
    }

    /* Hero */
    .hero-section {
      padding: 5mm 0 3mm 0;
    }

    .hero-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #f16623;
      margin-bottom: 4mm;
    }

    .hero-eyebrow::before {
      content: '';
      display: inline-block;
      width: 24px;
      height: 2px;
      background: #f16623;
    }

    .hero-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 38px;
      font-weight: 800;
      line-height: 1.12;
      letter-spacing: -1.2px;
      margin-bottom: 5mm;
      max-width: 162mm;
    }

    .gradient-highlight {
      background: linear-gradient(110deg, #f16623 0%, #ff8542 50%, ${isDark ? '#ffffff' : '#262262'} 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .hero-subtitle {
      font-size: 13.5px;
      line-height: 1.6;
      color: ${textMuted};
      max-width: 155mm;
      margin-bottom: 6mm;
      font-weight: 400;
    }

    /* 4 Pillars */
    .capabilities-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 4mm;
      margin-bottom: 5mm;
    }

    .cap-card {
      background: ${cardBg};
      border: 1px solid ${borderCol};
      border-left: 3.5px solid #f16623;
      border-radius: 10px;
      padding: 4mm 5mm;
    }

    .cap-num {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 1.5px;
      color: #f16623;
      margin-bottom: 2px;
      text-transform: uppercase;
    }

    .cap-title {
      font-size: 13px;
      font-weight: 700;
      color: ${textMain};
      margin-bottom: 3px;
    }

    .cap-desc {
      font-size: 10.5px;
      line-height: 1.45;
      color: ${textMuted};
    }

    /* Trust Metrics */
    .metrics-bar {
      display: flex;
      justify-content: space-between;
      background: ${isDark ? 'linear-gradient(90deg, rgba(38, 34, 98, 0.55) 0%, rgba(241, 102, 35, 0.16) 100%)' : '#eef1fa'};
      border: 1px solid ${borderCol};
      border-radius: 10px;
      padding: 3.5mm 6mm;
      margin-bottom: 5mm;
    }

    .metric-item {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .metric-val {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 17px;
      font-weight: 800;
      color: ${textMain};
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .metric-val span {
      color: #f16623;
    }

    .metric-lbl {
      font-size: 9px;
      font-weight: 600;
      color: ${textMuted};
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-top: 2px;
    }

    /* Footer */
    .footer {
      border-top: 1px solid ${borderCol};
      padding-top: 5mm;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .meta-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .meta-title {
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #f16623;
    }

    .meta-value {
      font-size: 11.5px;
      font-weight: 600;
      color: ${textMain};
    }

    .meta-desc {
      font-size: 9.5px;
      color: ${textMuted};
    }

    .footer-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }

    .doc-stamp {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
      color: #f16623;
      padding: 4px 10px;
      background: ${isDark ? 'rgba(38, 34, 98, 0.6)' : '#e2e5f5'};
      border: 1px solid ${borderCol};
      border-radius: 5px;
    }

    .contact-line {
      font-size: 9.5px;
      color: ${textMuted};
    }
  </style>
</head>
<body>
  <div class="accent-bar"></div>
  <div class="bg-mesh"></div>
  <div class="geom-wireframe"><div class="geom-wireframe-inner"></div></div>

  <div class="page-content">
    <!-- Header -->
    <div class="header">
      ${logoBase64 ? `<img src="${logoBase64}" alt="Zyllo Tech Logo" class="brand-logo-img">` : '<div style="font-size:22px;font-weight:800;color:#f16623;">ZYLLO TECH</div>'}
      <div class="header-badge">
        <span class="badge-dot"></span>
        <span>Corporate Capabilities Profile</span>
      </div>
    </div>

    <!-- Hero Content -->
    <div class="hero-section">
      <div class="hero-eyebrow">Enterprise Technology & AI Engineering</div>
      <h1 class="hero-title">
        Engineering Scalable <span class="gradient-highlight">Digital Realities</span> & Enterprise Intelligence.
      </h1>
      <p class="hero-subtitle">
        Architecting robust distributed systems, deterministic multi-agent AI ecosystems, zero-downtime cloud infrastructure, and cross-platform native mobility for global enterprise leaders.
      </p>

      <!-- 4 Pillars Grid -->
      <div class="capabilities-grid">
        <div class="cap-card">
          <div class="cap-num">01 / CLOUD & DEVOPS</div>
          <div class="cap-title">Resilient Cloud Infrastructure</div>
          <div class="cap-desc">Kubernetes microservices, automated multi-region CI/CD pipelines, and zero-downtime database migrations.</div>
        </div>
        <div class="cap-card">
          <div class="cap-num">02 / ARTIFICIAL INTELLIGENCE</div>
          <div class="cap-title">Agentic AI & Enterprise RAG</div>
          <div class="cap-desc">Multi-agent orchestrations, vector database retrieval (Qdrant/Pinecone), and domain-specific LLM copilots.</div>
        </div>
        <div class="cap-card">
          <div class="cap-num">03 / WEB ENGINEERING</div>
          <div class="cap-title">High-Scale SaaS & Web Apps</div>
          <div class="cap-desc">Next.js & Node.js architecture delivering sub-second LCP, hardened JWT security, and resilient APIs.</div>
        </div>
        <div class="cap-card">
          <div class="cap-num">04 / MOBILE SYSTEMS</div>
          <div class="cap-title">Cross-Platform & Native Mobile</div>
          <div class="cap-desc">Impeller-accelerated 60fps Flutter, React Native, and native iOS/Android with offline-first data sync.</div>
        </div>
      </div>

      <!-- Trust & Performance Metrics Bar -->
      <div class="metrics-bar">
        <div class="metric-item">
          <div class="metric-val">99.98<span>%</span></div>
          <div class="metric-lbl">Infrastructure Uptime</div>
        </div>
        <div class="metric-item">
          <div class="metric-val">&lt; 800<span>ms</span></div>
          <div class="metric-lbl">Global Response Latency</div>
        </div>
        <div class="metric-item">
          <div class="metric-val">5<span>+</span></div>
          <div class="metric-lbl">Global Regions (US, UK, UAE, AUS, IND)</div>
        </div>
        <div class="metric-item">
          <div class="metric-val">100<span>%</span></div>
          <div class="metric-lbl">On-Time Sprint Delivery</div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="meta-col">
        <span class="meta-title">PREPARED BY</span>
        <span class="meta-value">Zyllo Tech Engineering Pod</span>
        <span class="meta-desc">Global Technology Practice</span>
      </div>
      <div class="meta-col">
        <span class="meta-title">GLOBAL HEADQUARTERS</span>
        <span class="meta-value">Guntur, Andhra Pradesh, India</span>
        <span class="meta-desc">Delivering Globally to US • UK • UAE • Australia</span>
      </div>
      <div class="meta-col">
        <span class="meta-title">EDITION & RELEASE</span>
        <span class="meta-value">October 2026</span>
        <span class="meta-desc">Version 2.4 (Enterprise Confidential)</span>
      </div>
      <div class="footer-right">
        <div class="doc-stamp">ZT-CORP-2026-A4</div>
        <div class="contact-line">contact@zyllotech.com • zyllotech.com</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const artifactDir = path.join('C:', 'Users', 'Abhi', '.gemini', 'antigravity', 'brain', '56a4ba33-2ffa-4543-bb94-b46f7324ff80');

// Generate Dark Edition
const darkHtml = getHtml('dark');
const darkTempHtml = path.join(__dirname, 'cover_dark_temp.html');
const darkPdf = path.join(__dirname, 'ZylloTech_Cover_Page.pdf');
const darkPdfArtifact = path.join(artifactDir, 'ZylloTech_Cover_Page.pdf');
const darkScreenshot = path.join(artifactDir, 'cover_dark_preview.png');

fs.writeFileSync(darkTempHtml, darkHtml, 'utf8');
console.log('Printing Flagship Deep Tech PDF...');
execSync(`"${edgePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --no-pdf-header-footer --print-to-pdf="${darkPdf}" "file:///${darkTempHtml.replace(/\\\\/g, '/')}"`);
fs.copyFileSync(darkPdf, darkPdfArtifact);
execSync(`"${edgePath}" --headless --disable-gpu --window-size=794,1123 --screenshot="${darkScreenshot}" "file:///${darkTempHtml.replace(/\\\\/g, '/')}"`);

// Generate Light Edition
const lightHtml = getHtml('light');
const lightTempHtml = path.join(__dirname, 'cover_light_temp.html');
const lightPdf = path.join(__dirname, 'ZylloTech_Cover_Page_Light.pdf');
const lightPdfArtifact = path.join(artifactDir, 'ZylloTech_Cover_Page_Light.pdf');
const lightScreenshot = path.join(artifactDir, 'cover_light_preview.png');

fs.writeFileSync(lightTempHtml, lightHtml, 'utf8');
console.log('Printing Executive Light PDF...');
execSync(`"${edgePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --no-pdf-header-footer --print-to-pdf="${lightPdf}" "file:///${lightTempHtml.replace(/\\\\/g, '/')}"`);
fs.copyFileSync(lightPdf, lightPdfArtifact);
execSync(`"${edgePath}" --headless --disable-gpu --window-size=794,1123 --screenshot="${lightScreenshot}" "file:///${lightTempHtml.replace(/\\\\/g, '/')}"`);

console.log('All PDFs and high-res previews successfully generated!');
