/**
 * Zyllo Tech - Client Script
 * Interactive UI/UX, Authentication handling, API integrations
 */

document.addEventListener('DOMContentLoaded', () => {
  initPageLoader();
  initLenisSmoothScroll();
  initHeroAnimations();
  init3DTiltCards();
  initProcessTimeline();
  initTechCanvas();
  initMagneticButtons();
  initScrollspy();
  initNavbar();
  checkAuthState();
  initSearch();
  initContactForm();
  initNewsletterForm();
  initPortfolioFilter();
  initCostEstimator();
  initServicesMarquee();
  initScrollReveal();
  initAiAssistant();
  initFooterParticleTypography();
});

/* ==================== NAVBAR & SCROLL ==================== */
function initNavbar() {
  const navbar = document.querySelector('.zy-navbar');
  if (!navbar) return;

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        if (window.scrollY > 30) {
          navbar.classList.add('scrolled');
        } else {
          navbar.classList.remove('scrolled');
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // Persistent Dropdown handling for desktop & mobile
  document.querySelectorAll('.zy-navbar .dropdown').forEach(dropdown => {
    const toggle = dropdown.querySelector('.dropdown-toggle');
    const menu = dropdown.querySelector('.zy-dropdown-menu');
    if (!toggle || !menu) return;

    dropdown.addEventListener('mouseenter', () => {
      if (window.innerWidth >= 992) {
        dropdown.classList.add('show');
        menu.classList.add('show');
      }
    });

    dropdown.addEventListener('mouseleave', () => {
      if (window.innerWidth >= 992) {
        dropdown.classList.remove('show');
        menu.classList.remove('show');
      }
    });

    // Clicking toggle also keeps it active
    toggle.addEventListener('click', (e) => {
      if (window.innerWidth >= 992) {
        e.preventDefault();
        dropdown.classList.toggle('show');
        menu.classList.toggle('show');
      }
    });
  });
}

/* ==================== AUTH STATE & NAVBAR UPDATE ==================== */
function checkAuthState() {
  const token = localStorage.getItem('zyllotech_token') || sessionStorage.getItem('zy_token');
  const userJson = localStorage.getItem('zyllotech_user') || sessionStorage.getItem('zy_user');
  const authContainers = document.querySelectorAll('#nav-auth-container, .nav-auth-slot');
  const mobileAuthContainers = document.querySelectorAll('#mobile-nav-auth-container, .mobile-auth-slot');

  if (token && userJson) {
    try {
      const user = JSON.parse(userJson);
      let dashboardText = 'Client Portal';
      let dashboardLink = '/portal';
      let roleBadge = 'Portal';

      if (user.role === 'admin') {
        dashboardText = 'Admin Control';
        dashboardLink = '/dashboard';
        roleBadge = 'Admin';
      } else if (user.role === 'hr') {
        dashboardText = 'HR Portal';
        dashboardLink = '/hr';
        roleBadge = 'HR';
      } else if (user.role === 'employee') {
        dashboardText = 'Employee Desk';
        dashboardLink = '/employee';
        roleBadge = 'Staff';
      }

      // 1. Desktop Navbar: Dashboard + Prominently Visible Logout Button
      authContainers.forEach(container => {
        container.innerHTML = `
          <div class="d-flex align-items-center gap-2">
            <a href="${dashboardLink}" class="btn btn-sm btn-brand rounded-pill px-3 py-1.5 d-inline-flex align-items-center gap-1.5 shadow" title="Open ${dashboardText}">
              <i class="bi bi-speedometer2"></i> <span class="d-none d-xl-inline">${dashboardText}</span><span class="d-inline d-xl-none">${roleBadge}</span>
            </a>
            <button type="button" onclick="handleLogout()" class="btn btn-sm btn-outline-danger rounded-pill px-3 py-1.5 d-inline-flex align-items-center gap-1.5 fw-semibold shadow-sm" title="Log Out of Zyllo Tech">
              <i class="bi bi-box-arrow-right"></i> <span>Logout</span>
            </button>
          </div>
        `;
      });

      // 2. Mobile Drawer
      mobileAuthContainers.forEach(container => {
        container.innerHTML = `
          <div class="d-flex flex-column gap-2 mt-3">
            <a href="${dashboardLink}" class="btn btn-brand w-100 py-2 d-flex align-items-center justify-content-center gap-2">
              <i class="bi bi-speedometer2"></i> <span>${dashboardText}</span>
            </a>
            <button type="button" onclick="handleLogout()" class="btn btn-outline-danger rounded-pill w-100 py-2 d-flex align-items-center justify-content-center gap-2">
              <i class="bi bi-box-arrow-right"></i> <span>Logout</span>
            </button>
          </div>
        `;
      });

      // 3. Mobile Bottom Cards
      const mobileBottomCards = document.querySelectorAll('.zy-mobile-bottom-card');
      mobileBottomCards.forEach(card => {
        const loginBtn = card.querySelector('.zy-mobile-login-btn');
        if (loginBtn) {
          loginBtn.href = dashboardLink;
          loginBtn.innerHTML = `<i class="bi bi-speedometer2 me-1"></i> ${dashboardText}`;
          loginBtn.style.background = 'linear-gradient(135deg, #f16623 0%, #d85004 100%)';
          loginBtn.style.boxShadow = '0 4px 15px rgba(249, 103, 6, 0.45)';

          let logoutBtn = card.querySelector('.zy-mobile-logout-btn');
          if (!logoutBtn) {
            logoutBtn = document.createElement('button');
            logoutBtn.className = 'zy-mobile-pill-btn zy-mobile-logout-btn text-danger border-danger border-opacity-25 w-100 mt-2';
            logoutBtn.innerHTML = `<i class="bi bi-box-arrow-right me-1"></i> Log Out (${escapeHtml(user.name.split(' ')[0])})`;
            logoutBtn.onclick = handleLogout;
            card.appendChild(logoutBtn);
          }
        }
      });

      // 4. Floating Return Button (Public Pages)
      const currentPath = window.location.pathname;
      const isDashboardOrPortal = currentPath.includes('/dashboard') || currentPath.includes('/portal') || currentPath.includes('/employee') || currentPath.includes('/hr');
      if (!isDashboardOrPortal) {
        let floatingPill = document.getElementById('zy-auth-floating-pill');
        if (!floatingPill) {
          floatingPill = document.createElement('div');
          floatingPill.id = 'zy-auth-floating-pill';
          floatingPill.style.cssText = 'position: fixed; bottom: 24px; left: 24px; z-index: 1060;';
          floatingPill.innerHTML = `
            <a href="${dashboardLink}" class="btn btn-brand py-2 px-3.5 rounded-pill shadow-lg d-flex align-items-center gap-2 text-decoration-none" style="background: linear-gradient(135deg, #f16623 0%, #d85004 100%) !important; border: 1.5px solid rgba(255,255,255,0.25); box-shadow: 0 8px 25px rgba(249, 103, 6, 0.5) !important;">
              <i class="bi bi-speedometer2 fs-5"></i>
              <span class="fw-bold fs-6">${dashboardText}</span>
            </a>
          `;
          document.body.appendChild(floatingPill);
        }
      }
    } catch (e) {
      console.error('Error parsing stored user data', e);
      clearAuth();
    }
  } else {
    // When logged out, ensure login button is present
    authContainers.forEach(container => {
      container.innerHTML = `
        <a href="/login" class="btn btn-brand d-inline-flex align-items-center gap-1.5">
          <i class="bi bi-box-arrow-in-right"></i> <span>Login</span>
        </a>
      `;
    });
    const floatingPill = document.getElementById('zy-auth-floating-pill');
    if (floatingPill) floatingPill.remove();
  }
}

function handleLogout() {
  if (confirm('Are you sure you want to log out of Zyllo Tech?')) {
    localStorage.removeItem('zyllotech_token');
    localStorage.removeItem('zyllotech_user');
    sessionStorage.removeItem('zy_token');
    sessionStorage.removeItem('zy_user');
    checkAuthState();
    window.location.reload();
  }
}

function clearAuth() {
  localStorage.removeItem('zyllotech_token');
  localStorage.removeItem('zyllotech_user');
  sessionStorage.removeItem('zy_token');
  sessionStorage.removeItem('zy_user');
}

// Immediate and reactive invocation
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuthState);
  } else {
    checkAuthState();
  }
  window.addEventListener('pageshow', checkAuthState);
  window.addEventListener('storage', checkAuthState);
}

/* ==================== COMMAND / SEARCH MODAL ==================== */
const searchItems = [
  { title: "Custom Software Development", category: "Services", desc: "Discovery, roadmaps, and enterprise applications", url: "/services#software" },
  { title: "Web Application Development", category: "Services", desc: "Responsive, high-performance web apps & SaaS", url: "/services#web" },
  { title: "Mobile App Development", category: "Services", desc: "iOS, Android, React Native & Flutter builds", url: "/services#mobile" },
  { title: "AI & Machine Learning", category: "Services", desc: "LLMs, predictive analytics, intelligent automation", url: "/services#ai" },
  { title: "Cloud Architecture & DevOps", category: "Services", desc: "AWS, Azure, Docker, Kubernetes, CI/CD", url: "/services#cloud" },
  { title: "UI/UX & Product Design", category: "Services", desc: "Modern interfaces, wireframing, and user research", url: "/services#design" },
  { title: "FinTech & Banking", category: "Industries", desc: "Secure payment gateways and ledger systems", url: "/industries#fintech" },
  { title: "Healthcare & MedTech", category: "Industries", desc: "HIPAA-compliant telehealth platforms", url: "/industries#healthcare" },
  { title: "E-Commerce & Retail", category: "Industries", desc: "Omnichannel shopping with automated fulfillment", url: "/industries#ecommerce" },
  { title: "Portfolio & Case Studies", category: "Company", desc: "See our verified customer delivery track record", url: "/portfolio" },
  { title: "Engineering Blog & Tech Insights", category: "Company", desc: "Technical breakdowns on AI, cloud, and modern software", url: "/blog" },
  { title: "Careers & Open Positions", category: "Company", desc: "Join our high-impact remote engineering team", url: "/careers" },
  { title: "About Zyllo Tech", category: "Company", desc: "Our mission, leadership, and remote engineering team", url: "/about" },
  { title: "Contact Us & Project Quote", category: "Company", desc: "Speak directly with our technical leadership", url: "/contact" },
  { title: "Client & Admin Login", category: "Auth", desc: "Sign in to access your portal and project metrics", url: "/login" }
];

function initSearch() {
  const searchInput = document.getElementById('zy-search-input');
  const searchResults = document.getElementById('zy-search-results');
  const askBtn = document.getElementById('zy-ask-btn');
  if (!searchInput || !searchResults) return;

  // Keyboard shortcut Ctrl+K or Cmd+K
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const modalEl = document.getElementById('searchModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
      }
    }
  });

  function performSearch(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) {
      searchResults.innerHTML = '';
      return;
    }

    const matches = searchItems.filter(item => 
      item.title.toLowerCase().includes(q) || 
      item.desc.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (q.includes('quote') && item.title.includes('Contact')) ||
      (q.includes('service') && item.category === 'Services') ||
      (q.includes('mobile') && item.title.includes('Mobile'))
    );

    if (matches.length === 0) {
      searchResults.innerHTML = `
        <div class="p-3 text-center text-white-50">
          <i class="bi bi-search d-block fs-3 mb-2 text-warning"></i>
          No exact matches for "<span class="text-white fw-semibold">${escapeHtml(query)}</span>". Try asking about <strong class="text-white">web apps</strong>, <strong class="text-white">mobile apps</strong>, <strong class="text-white">AI</strong>, or <strong class="text-white">getting a quote</strong>.
        </div>
      `;
      return;
    }

    searchResults.innerHTML = `
      <div class="small fw-bold text-uppercase mb-2" style="font-size: 0.72rem; letter-spacing: 0.08em; color: #94a3b8;">MATCHING ANSWERS & PAGES</div>
      ${matches.map(item => `
        <a href="${item.url}" class="search-result-card d-flex align-items-center justify-content-between text-decoration-none">
          <div class="pe-3">
            <div class="fw-bold text-white mb-0.5" style="font-size: 0.96rem;">${escapeHtml(item.title)}</div>
            <small class="d-block" style="font-size: 0.82rem; color: #94a3b8;">${escapeHtml(item.desc)}</small>
          </div>
          <span class="badge rounded-pill border-0 ms-2 px-2.5 py-1.5 flex-shrink-0" style="font-size: 0.75rem; background: rgba(249, 103, 6, 0.15); color: #f16623; border: 1px solid rgba(249, 103, 6, 0.4) !important;">${escapeHtml(item.category)} &rarr;</span>
        </a>
      `).join('')}
    `;
  }

  searchInput.addEventListener('input', (e) => {
    performSearch(e.target.value);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch(searchInput.value);
    }
  });

  if (askBtn) {
    askBtn.addEventListener('click', (e) => {
      e.preventDefault();
      performSearch(searchInput.value);
    });
  }

  // Handle suggested questions matching Image 2
  document.querySelectorAll('.zy-try-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const questionText = btn.textContent.trim();
      searchInput.value = questionText;
      performSearch(questionText);
    });
  });
}

/* ==================== CONTACT FORM ==================== */
function initContactForm() {
  const form = document.getElementById('contactForm');
  const alertBox = document.getElementById('contactFormAlert');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Sending...`;

    const formData = {
      name: form.name.value,
      email: form.email.value,
      phone: form.phone ? form.phone.value : '',
      service: form.service ? form.service.value : 'General Inquiry',
      budget: form.budget ? form.budget.value : 'Flexible',
      message: form.message.value
    };

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();

      if (data.success) {
        if (alertBox) {
          alertBox.className = 'alert alert-success d-block bg-success bg-opacity-20 border border-success text-white mb-4';
          alertBox.innerHTML = `<i class="bi bi-check-circle-fill me-2 text-success"></i> ${escapeHtml(data.message)}`;
        }
        form.reset();
      } else {
        if (alertBox) {
          alertBox.className = 'alert alert-danger d-block bg-danger bg-opacity-20 border border-danger text-white mb-4';
          alertBox.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2 text-danger"></i> ${escapeHtml(data.message || 'Submission failed')}`;
        }
      }
    } catch (err) {
      console.error(err);
      if (alertBox) {
        alertBox.className = 'alert alert-danger d-block bg-danger bg-opacity-20 border border-danger text-white mb-4';
        alertBox.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2 text-danger"></i> An unexpected network error occurred. Please try again.`;
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
}

/* ==================== NEWSLETTER FORM ==================== */
function initNewsletterForm() {
  const forms = document.querySelectorAll('.newsletter-form');
  forms.forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      const email = input ? input.value : '';
      if (!email) return;

      try {
        const response = await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await response.json();
        alert(data.message || 'Thank you for subscribing to Zyllo Tech updates!');
        form.reset();
      } catch (err) {
        alert('Subscription failed. Please try again later.');
      }
    });
  });
}

/* ==================== PORTFOLIO CATEGORY FILTER ==================== */
function initPortfolioFilter() {
  const filterBtns = document.querySelectorAll('.portfolio-filter-btn');
  const items = document.querySelectorAll('.portfolio-item');
  if (filterBtns.length === 0 || items.length === 0) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');
      items.forEach(item => {
        const matches = (filter === 'all' || item.getAttribute('data-category') === filter);
        if (matches) {
          item.style.display = 'block';
          if (typeof gsap !== 'undefined') {
            gsap.fromTo(item, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out' });
          } else {
            item.classList.add('animate-fade-in');
          }
        } else {
          if (typeof gsap !== 'undefined') {
            gsap.to(item, {
              opacity: 0,
              scale: 0.94,
              duration: 0.25,
              ease: 'power2.in',
              onComplete: () => { item.style.display = 'none'; }
            });
          } else {
            item.style.display = 'none';
          }
        }
      });
    });
  });
}

/* ==================== INTERACTIVE COST ESTIMATOR ==================== */
function initCostEstimator() {
  const platformSelect = document.getElementById('calc-platform');
  const scopeSelect = document.getElementById('calc-scope');
  const timelineSelect = document.getElementById('calc-timeline');
  const estimateResult = document.getElementById('calc-estimate-result');
  if (!platformSelect || !scopeSelect || !estimateResult) return;

  function recalculate() {
    let base = 500000; // in INR
    const platform = platformSelect.value;
    const scope = scopeSelect.value;
    const timeline = timelineSelect ? timelineSelect.value : 'standard';

    if (platform === 'web') base = 500000;
    else if (platform === 'mobile') base = 700000;
    else if (platform === 'both') base = 1100000;
    else if (platform === 'ai') base = 1250000;

    let multiplier = 1.0;
    if (scope === 'mvp') multiplier = 1.0;
    else if (scope === 'growth') multiplier = 1.8;
    else if (scope === 'enterprise') multiplier = 3.2;

    if (timeline === 'expedited') multiplier *= 1.25;

    const totalMin = Math.round((base * multiplier) / 10000) * 10000;
    const totalMax = Math.round((totalMin * 1.35) / 10000) * 10000;

    estimateResult.textContent = `₹${totalMin.toLocaleString('en-IN')} - ₹${totalMax.toLocaleString('en-IN')}`;
  }

  platformSelect.addEventListener('change', recalculate);
  scopeSelect.addEventListener('change', recalculate);
  if (timelineSelect) timelineSelect.addEventListener('change', recalculate);
  recalculate();
}

/* ==================== UTILITY ESCAPING ==================== */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ==================== SERVICES HORIZONTAL INFINITE MARQUEE ==================== */
const servicesMarqueeData = [
  {
    title: 'Cloud Solutions',
    slug: 'cloud-solutions',
    tagline: 'Scales as you grow',
    taglineColor: '#ff7d3b',
    icon: 'bi-cloud',
    iconColor: '#ff7d3b',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80',
    desc: 'Scalable cloud infrastructure and deployment solutions for secure, reliable, and high-performing applications.'
  },
  {
    title: 'AI Solutions',
    slug: 'ai-solutions',
    tagline: 'Practical, not novelty',
    taglineColor: '#a855f7',
    icon: 'bi-stars',
    iconColor: '#a855f7',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
    desc: 'AI-powered applications and automation that improve efficiency and enable smarter business decisions.'
  },
  {
    title: 'Maintenance & Support',
    slug: 'software-development',
    tagline: 'Healthy, long after launch',
    taglineColor: '#10b981',
    icon: 'bi-tools',
    iconColor: '#10b981',
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80',
    desc: 'Reliable maintenance and continuous support to keep your applications secure, updated, and running smoothly.'
  },
  {
    title: 'Cybersecurity',
    slug: 'cloud-solutions',
    tagline: 'Security-first delivery',
    taglineColor: '#ef4444',
    icon: 'bi-shield-check',
    iconColor: '#ef4444',
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&q=80',
    desc: 'Comprehensive security solutions to protect your applications, systems, and business data.'
  },
  {
    title: 'Quality Assurance',
    slug: 'software-development',
    tagline: 'Caught before it ships',
    taglineColor: '#f59e0b',
    icon: 'bi-pencil',
    iconColor: '#f59e0b',
    image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&q=80',
    desc: 'End-to-end testing services to ensure reliable, secure, and high-quality software delivery.'
  },
  {
    title: 'UI/UX Design',
    slug: 'ui-ux-design',
    tagline: 'Designs that enhance',
    taglineColor: '#ec4899',
    icon: 'bi-palette',
    iconColor: '#ec4899',
    image: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&q=80',
    desc: 'Engaging digital experiences that captivate users and elevate brand identity.'
  },
  {
    title: 'Web Development',
    slug: 'web-development',
    tagline: 'Built fast, built to grow',
    taglineColor: '#f16623',
    icon: 'bi-browser-chrome',
    iconColor: '#f16623',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    desc: 'High-performance business portals, custom SaaS web applications, and headless e-commerce.'
  },
  {
    title: 'Software Development',
    slug: 'software-development',
    tagline: 'From idea to roadmap',
    taglineColor: '#f16623',
    icon: 'bi-code-slash',
    iconColor: '#f16623',
    image: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80',
    desc: 'Custom software solutions designed to streamline operations, improve productivity, and support business growth.'
  }
];

function initServicesMarquee() {
  const tracks = document.querySelectorAll('.zy-services-marquee-track');
  if (tracks.length === 0) return;

  const cardsHtml = servicesMarqueeData.map(item => `
    <a href="/services/${item.slug}" class="zy-service-scroll-card">
      <div class="zy-scroll-card-image-wrap">
        <img src="${item.image}" alt="${escapeHtml(item.title)}" loading="lazy">
        <div class="zy-scroll-card-badge" style="color: ${item.iconColor};">
          <i class="bi ${item.icon}"></i>
        </div>
      </div>
      <div class="zy-scroll-card-body">
        <h4 class="zy-scroll-card-title">${escapeHtml(item.title)}</h4>
        <div class="zy-scroll-card-tagline" style="color: ${item.taglineColor};">
          ${escapeHtml(item.tagline)}
        </div>
        <p class="zy-scroll-card-desc">
          ${escapeHtml(item.desc)}
        </p>
        <div class="zy-scroll-card-link">
          Learn how we help <i class="bi bi-arrow-right"></i>
        </div>
      </div>
    </a>
  `).join('');

  tracks.forEach(track => {
    track.innerHTML = cardsHtml + cardsHtml;
  });
}

/* ==================== PAGE TRANSITION & FULLSCREEN LOADER ==================== */
function initPageLoader() {
  let loader = document.getElementById('zy-page-loader');

  // If loader doesn't exist in markup, dynamically inject it into <body>
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'zy-page-loader';
    loader.innerHTML = `
      <div class="loader-ambient-left"></div>
      <div class="loader-ambient-right"></div>
      
      <!-- Floating Ambient Badges Matching Screenshot -->
      <div class="loader-floating-icon icon-cyan loader-icon-1"><i class="bi bi-tools"></i></div>
      <div class="loader-floating-icon icon-cyan loader-icon-2"><i class="bi bi-code-slash"></i></div>
      <div class="loader-floating-icon icon-orange loader-icon-3"><i class="bi bi-lightbulb"></i></div>
      <div class="loader-floating-icon icon-cyan loader-icon-4"><i class="bi bi-cloud"></i></div>
      <div class="loader-floating-icon icon-orange loader-icon-5"><i class="bi bi-stars"></i></div>
      <div class="loader-floating-icon icon-cyan loader-icon-6"><i class="bi bi-pencil"></i></div>
      <div class="loader-floating-icon icon-cyan loader-icon-7"><i class="bi bi-phone"></i></div>
      <div class="loader-floating-icon icon-orange loader-icon-8"><i class="bi bi-shield-check"></i></div>
      <div class="loader-floating-icon icon-orange loader-icon-9"><i class="bi bi-palette"></i></div>

      <!-- Center Rotating Spinner & Brand Hub -->
      <div class="loader-center-hub">
        <div class="loader-circle-wrapper">
          <div class="loader-circle-track"></div>
          <div class="loader-circle-spinner"></div>
          <div class="loader-center-disc">
            <img src="/assets/images/zyllo-icon.png" alt="Zyllo Tech">
          </div>
        </div>
        <div class="loader-brand-title">
          <span class="brand-part-zyllo">ZYLLO</span>
          <span class="brand-part-tech">TECH</span>
        </div>
        <div class="loader-dots-row">
          <span class="loader-dot loader-dot-1"></span>
          <span class="loader-dot loader-dot-2"></span>
          <span class="loader-dot loader-dot-3"></span>
        </div>
        <div class="loader-typewriter-box">
          <span id="loader-typewriter-text"></span><span class="loader-cursor"></span>
        </div>
      </div>
    `;
    document.body.prepend(loader);
  }

  // Typewriter effect matching original site
  const typeTextEl = loader.querySelector('#loader-typewriter-text');
  if (typeTextEl) {
    const textSequence = ['Connecting...', 'Initializing system...', 'Loading experience...'];
    let seqIdx = 0;
    let charIdx = 0;
    let deleting = false;

    function stepTypewriter() {
      const currentText = textSequence[seqIdx];
      if (deleting) {
        charIdx--;
        typeTextEl.textContent = currentText.substring(0, charIdx);
        if (charIdx === 0) {
          deleting = false;
          seqIdx = (seqIdx + 1) % textSequence.length;
          setTimeout(stepTypewriter, 350);
          return;
        }
        setTimeout(stepTypewriter, 35);
      } else {
        charIdx++;
        typeTextEl.textContent = currentText.substring(0, charIdx);
        if (charIdx === currentText.length) {
          deleting = true;
          setTimeout(stepTypewriter, 1400);
          return;
        }
        setTimeout(stepTypewriter, 90);
      }
    }
    stepTypewriter();
  }

  // Top glowing progress line
  const progressBar = document.getElementById('zy-page-loader-progress');
  if (progressBar) {
    progressBar.style.width = '35%';
    setTimeout(() => { if (progressBar) progressBar.style.width = '75%'; }, 180);
  }

  // Hide loader after page render (smooth fadeout)
  const hideLoader = () => {
    if (progressBar) {
      progressBar.style.width = '100%';
      setTimeout(() => { progressBar.style.opacity = '0'; }, 320);
    }
    setTimeout(() => {
      loader.classList.add('loaded');
    }, 380);
  };

  if (document.readyState === 'complete') {
    hideLoader();
  } else {
    window.addEventListener('load', hideLoader);
  }

  // Handle browser back / forward cache
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      loader.classList.add('loaded');
    }
  });

  // Intercept internal link clicks to trigger transition loader
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Check if link should be ignored (hashes, external, dropdown toggles, modal toggles)
    if (
      href.startsWith('#') ||
      href.startsWith('javascript:') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      link.target === '_blank' ||
      link.hasAttribute('download') ||
      link.getAttribute('data-bs-toggle') ||
      link.getAttribute('data-bs-target') ||
      link.classList.contains('dropdown-toggle')
    ) {
      return;
    }

    // Don't intercept if modifier keys are pressed (e.g. Ctrl+click to open new tab)
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

    // Check if internal navigation
    try {
      const targetUrl = new URL(link.href, window.location.href);
      if (targetUrl.origin === window.location.origin) {
        // If clicking exact same page URL with pure hash anchor, do not trigger loader
        if (targetUrl.pathname === window.location.pathname && targetUrl.search === window.location.search && targetUrl.hash) {
          return;
        }

        e.preventDefault();
        loader.classList.remove('loaded');

        // Smooth transition before navigating
        setTimeout(() => {
          window.location.href = link.href;
        }, 220);
      }
    } catch (err) {
      // Fallback
    }
  });
}

/* ==================== HIGH-PERFORMANCE SCROLL REVEAL ==================== */
/* ==================== REPEATING BIDIRECTIONAL SCROLL REVEAL ANIMATION ==================== */
function initScrollReveal() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  const selector = 'section h2, section h3, .section-heading, .zy-section-header, .zy-card, .zy-service-deliver-card, .zy-remote-card, .stat-box, .portfolio-card, .pod-card, .zy-tech-glance-card, .hr-stat-pill, .emp-stat-pill, .zy-reveal, .reveal-on-scroll';
  const elements = Array.from(document.querySelectorAll(selector)).filter(el => {
    // Exclude elements inside modals, offcanvas, dropdowns, navigation, login card, or tech canvas
    return !el.closest('.modal, .offcanvas, .dropdown-menu, .zy-navbar, .zy-tech-canvas-overlay, .login-card-inner');
  });

  if (elements.length === 0) return;

  // Stagger siblings in rows
  elements.forEach((el) => {
    el.classList.add('zy-reveal');
    const parent = el.closest('.row, .zy-stacked-cards, .grid, .d-flex');
    if (parent) {
      const siblings = Array.from(parent.querySelectorAll(selector));
      const idx = siblings.indexOf(el);
      if (idx >= 0) {
        el._staggerDelay = (idx % 4) * 0.08;
      }
    }
  });

  // 1. GSAP ScrollTrigger Bidirectional Animation (Preferred)
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      const inViewOnLoad = rect.top < window.innerHeight && rect.bottom > 0;
      
      if (inViewOnLoad) {
        gsap.set(el, { y: 0, opacity: 1 });
      } else if (rect.top >= window.innerHeight) {
        gsap.set(el, { y: 45, opacity: 0 });
      } else {
        gsap.set(el, { y: -45, opacity: 0 });
      }

      ScrollTrigger.create({
        trigger: el,
        start: 'top 92%',
        end: 'bottom 8%',
        onEnter: () => {
          // Scrolling DOWN: block enters from BELOW and moves upward into normal position
          gsap.fromTo(el, 
            { y: 45, opacity: 0 }, 
            { y: 0, opacity: 1, duration: 0.65, ease: 'power2.out', delay: el._staggerDelay || 0, overwrite: 'auto' }
          );
        },
        onLeave: () => {
          // Scrolling DOWN past viewport: leaves top, resets state for upward re-entry
          gsap.to(el, { y: -45, opacity: 0, duration: 0.35, ease: 'power2.in', overwrite: 'auto' });
        },
        onEnterBack: () => {
          // Scrolling UP: block enters from ABOVE and moves downward into normal position
          gsap.fromTo(el, 
            { y: -45, opacity: 0 }, 
            { y: 0, opacity: 1, duration: 0.65, ease: 'power2.out', delay: el._staggerDelay || 0, overwrite: 'auto' }
          );
        },
        onLeaveBack: () => {
          // Scrolling UP past viewport: leaves bottom, resets state for downward re-entry
          gsap.to(el, { y: 45, opacity: 0, duration: 0.35, ease: 'power2.in', overwrite: 'auto' });
        }
      });
    });

    window.initBidirectionalScrollReveal = initScrollReveal;
    return;
  }

  // 2. High-Performance Bidirectional IntersectionObserver Fallback
  let lastScrollY = window.scrollY;
  let scrollDir = 'down';
  window.addEventListener('scroll', () => {
    const currentY = window.scrollY;
    scrollDir = currentY > lastScrollY ? 'down' : 'up';
    lastScrollY = currentY;
  }, { passive: true });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const el = entry.target;
      if (entry.isIntersecting) {
        const startY = scrollDir === 'down' ? 45 : -45;
        el.style.transition = 'none';
        el.style.transform = `translate3d(0, ${startY}px, 0)`;
        el.style.opacity = '0';

        void el.offsetHeight;
        el.style.transition = `transform 0.65s cubic-bezier(0.16, 1, 0.3, 1) ${el._staggerDelay || 0}s, opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1) ${el._staggerDelay || 0}s`;
        el.style.transform = 'translate3d(0, 0, 0)';
        el.style.opacity = '1';
      } else {
        const exitY = entry.boundingClientRect.top < 0 ? -45 : 45;
        el.style.transition = 'transform 0.35s ease-in, opacity 0.35s ease-in';
        el.style.transform = `translate3d(0, ${exitY}px, 0)`;
        el.style.opacity = '0';
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '20px 0px -20px 0px'
  });

  elements.forEach(el => observer.observe(el));
  window.initBidirectionalScrollReveal = initScrollReveal;
}

/* ==================== AI WEBSITE ASSISTANT (FLOATING WIDGET) ==================== */
function initAiAssistant() {
  const currentPath = window.location.pathname;
  if (currentPath.includes('/dashboard')) return;

  if (document.getElementById('zy-ai-toggle')) return;

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'zy-ai-toggle';
  toggleBtn.setAttribute('aria-label', 'Open Zyllo Tech AI Engineering Assistant');
  toggleBtn.title = 'Chat with Zyllo Tech AI Assistant';
  toggleBtn.innerHTML = `
    <i class="bi bi-robot"></i>
    <span class="ai-status-indicator"></span>
  `;

  const widget = document.createElement('div');
  widget.id = 'zy-ai-widget';
  widget.className = 'hidden';
  widget.innerHTML = `
    <div class="zy-ai-header">
      <div class="d-flex align-items-center gap-2">
        <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #f16623, #262262); display: flex; align-items: center; justify-content: center; color: #fff;">
          <i class="bi bi-robot"></i>
        </div>
        <div>
          <strong class="zy-ai-header-title small d-block" style="font-size: 0.88rem; line-height: 1.2;">Zyllo AI Assistant</strong>
          <small class="text-success" style="font-size: 0.72rem;"><i class="bi bi-record-fill"></i> Verified Knowledge · Online</small>
        </div>
      </div>
      <div class="d-flex align-items-center gap-1">
        <button class="btn btn-sm text-white-50 p-1" onclick="toggleAiWidget()" title="Minimize"><i class="bi bi-dash-lg"></i></button>
      </div>
    </div>

    <div class="zy-ai-messages" id="zy-ai-msg-container">
      <div class="zy-msg zy-msg-assistant">
        Hello! 👋 I am the <strong>Zyllo Tech AI Engineering Assistant</strong>. I can answer questions about our verified software, web, mobile, and AI capabilities, or help scope your project!
        <div class="d-flex flex-wrap gap-1 mt-2">
          <span class="zy-msg-quick-chip" onclick="sendAiQuickMessage('How much does it cost to build a web application?')">💰 Web App Cost</span>
          <span class="zy-msg-quick-chip" onclick="sendAiQuickMessage('What AI solutions do you build?')">🤖 AI Solutions</span>
          <span class="zy-msg-quick-chip" onclick="sendAiQuickMessage('Do you build mobile apps for iOS and Android?')">📱 Mobile Apps</span>
          <span class="zy-msg-quick-chip" onclick="sendAiQuickMessage('Where are you located and how do you work with remote clients?')">📍 Location & Remote</span>
        </div>
      </div>
    </div>

    <form class="zy-ai-input-bar" id="zy-ai-chat-form" onsubmit="handleAiChatSubmit(event)">
      <input type="text" id="zy-ai-text-input" placeholder="Ask about services, tech stack, or pricing..." autocomplete="off">
      <button type="submit" class="zy-ai-send-btn" id="zy-ai-send-btn" title="Send Message">
        <i class="bi bi-send-fill"></i>
      </button>
    </form>

    <div class="zy-ai-footer-bar">
      <span>Instant Channels:</span>
      <div class="d-flex gap-2">
        <a href="https://wa.me/917075773680?text=Hello%20Zyllo%20Tech%2C%20I%20would%20like%20to%20discuss%20a%20software%20project." target="_blank" class="text-success text-decoration-none fw-bold" style="font-size: 0.76rem;">
          <i class="bi bi-whatsapp"></i> WhatsApp
        </a>
        <a href="mailto:contact@zyllotech.com" class="text-info text-decoration-none" style="font-size: 0.76rem;">
          <i class="bi bi-envelope"></i> Email
        </a>
        <a href="/estimator" class="text-warning text-decoration-none" style="font-size: 0.76rem;">
          <i class="bi bi-calculator"></i> Estimator
        </a>
      </div>
    </div>
  `;

  document.body.appendChild(toggleBtn);
  document.body.appendChild(widget);

  toggleBtn.addEventListener('click', toggleAiWidget);
}

let aiHistory = [];

function toggleAiWidget() {
  const widget = document.getElementById('zy-ai-widget');
  if (!widget) return;
  widget.classList.toggle('hidden');
  if (!widget.classList.contains('hidden')) {
    const input = document.getElementById('zy-ai-text-input');
    if (input) input.focus();
  }
}

function sendAiQuickMessage(text) {
  const input = document.getElementById('zy-ai-text-input');
  if (input) {
    input.value = text;
    handleAiChatSubmit(new Event('submit'));
  }
}

async function handleAiChatSubmit(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('zy-ai-text-input');
  const sendBtn = document.getElementById('zy-ai-send-btn');
  const msgContainer = document.getElementById('zy-ai-msg-container');
  if (!input || !msgContainer) return;

  const text = input.value.trim();
  if (!text) return;

  const userBubble = document.createElement('div');
  userBubble.className = 'zy-msg zy-msg-user';
  userBubble.textContent = text;
  msgContainer.appendChild(userBubble);
  input.value = '';
  msgContainer.scrollTop = msgContainer.scrollHeight;

  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'zy-ai-typing';
  typingIndicator.id = 'zy-ai-loading-indicator';
  typingIndicator.innerHTML = `
    <span class="zy-ai-dot"></span>
    <span class="zy-ai-dot"></span>
    <span class="zy-ai-dot"></span>
  `;
  msgContainer.appendChild(typingIndicator);
  msgContainer.scrollTop = msgContainer.scrollHeight;

  if (sendBtn) sendBtn.disabled = true;

  try {
    const res = await fetch('/api/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        conversationHistory: aiHistory
      })
    });

    const data = await res.json();
    const loadingEl = document.getElementById('zy-ai-loading-indicator');
    if (loadingEl) loadingEl.remove();

    if (data.reply) {
      aiHistory.push({ role: 'user', content: text });
      aiHistory.push({ role: 'assistant', content: data.reply });

      const assistantBubble = document.createElement('div');
      assistantBubble.className = 'zy-msg zy-msg-assistant';

      let formatted = escapeHtml(data.reply)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        .replace(/\n/g, '<br>');

      assistantBubble.innerHTML = formatted;

      if (data.quickActions && Array.isArray(data.quickActions)) {
        const chipsWrap = document.createElement('div');
        chipsWrap.className = 'd-flex flex-wrap gap-1 mt-2';
        data.quickActions.forEach(action => {
          const chip = document.createElement('span');
          chip.className = 'zy-msg-quick-chip';
          chip.textContent = action;
          chip.onclick = () => {
            if (action.includes('WhatsApp')) {
              window.open('https://wa.me/917075773680', '_blank');
            } else if (action.includes('LinkedIn')) {
              window.open('https://www.linkedin.com/company/zyllo-tech/', '_blank');
            } else if (action.includes('Estimator')) {
              window.location.href = '/estimator';
            } else if (action.includes('Discovery')) {
              window.location.href = '/contact#discovery';
            } else {
              sendAiQuickMessage(action);
            }
          };
          chipsWrap.appendChild(chip);
        });
        assistantBubble.appendChild(chipsWrap);
      }

      msgContainer.appendChild(assistantBubble);
    }
  } catch (err) {
    const loadingEl = document.getElementById('zy-ai-loading-indicator');
    if (loadingEl) loadingEl.remove();

    const errorBubble = document.createElement('div');
    errorBubble.className = 'zy-msg zy-msg-assistant text-warning';
    errorBubble.innerHTML = `
      <i class="bi bi-wifi-off me-1"></i> Connection error. You can reach our engineering team directly on WhatsApp or email:
      <div class="mt-2 d-flex gap-2">
        <a href="https://wa.me/917075773680" target="_blank" class="btn btn-sm btn-success py-0 px-2" style="font-size: 0.75rem;"><i class="bi bi-whatsapp"></i> WhatsApp</a>
        <a href="/contact" class="btn btn-sm btn-brand-outline py-0 px-2" style="font-size: 0.75rem;">Contact Page</a>
      </div>
    `;
    msgContainer.appendChild(errorBubble);
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }
}



/* ===================================================================
   ADVANCED MOTION & INTERACTION SUITE
   - Lenis Virtual Smooth Scrolling + GSAP ScrollTrigger Integration
   - Hero Stagger, Dynamic Accent Rotator & Desktop Parallax
   - Statistics Number Counter Interpolation
   - 3D Perspective Tilt Cards with Dynamic Radial Cursor Torch
   - Scroll-Linked Process Timeline with Live SVG Spine
   - Interactive Connected Technology Node Canvas
   - Desktop Magnetic CTAs with GSAP quickTo
   - Intelligent Navigation Scrollspy
   =================================================================== */

/* 1. ZERO-LAG NATIVE SCROLLING & SMOOTH ANCHOR NAVIGATION */
function initLenisSmoothScroll() {
  // Use native high-performance GPU compositor scrolling for 0ms input latency
  // In-page anchor clicks glide smoothly to sections without wheel hijacking
  document.querySelectorAll('a[href^="#"]:not([href="#"]):not([data-bs-toggle]):not([data-bs-dismiss])').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const hash = anchor.getAttribute('href');
      if (!hash || hash.length <= 1) return;
      const target = document.querySelector(hash);
      if (target) {
        e.preventDefault();
        const navHeight = 74;
        const targetTop = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
        window.scrollTo({
          top: targetTop,
          behavior: 'smooth'
        });
      }
    });
  });
}

/* 2. HERO ANIMATIONS, DYNAMIC ACCENT & PARALLAX */
function initHeroAnimations() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Staggered Entrance
  if (!prefersReduced && typeof gsap !== 'undefined') {
    const tl = gsap.timeline({ delay: 0.12 });
    tl.from('.hero-badge-wrap', { y: -18, opacity: 0, duration: 0.55, ease: 'power2.out' })
      .from('.zy-hero-headline', { y: 25, opacity: 0, duration: 0.7, ease: 'power3.out' }, '-=0.3')
      .from('.hero-lead', { y: 20, opacity: 0, duration: 0.6, ease: 'power2.out' }, '-=0.4')
      .fromTo('.hero-cta-group .btn', { y: 16, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.45, ease: 'power2.out', clearProps: 'all' }, '-=0.3')
      .from('.hero-trust-bar', { y: 25, opacity: 0, duration: 0.7, ease: 'power3.out' }, '-=0.3');
  }

  // Dynamic Accent Text Rotator
  const rotatorEl = document.getElementById('hero-accent-rotator');
  if (rotatorEl) {
    const phrases = [
      'Scalable Digital Products',
      'Enterprise AI Solutions',
      'High-Performance Web Platforms',
      'Mission-Critical Cloud SaaS',
      'Cross-Platform Mobile Apps'
    ];
    let phraseIdx = 0;
    setInterval(() => {
      phraseIdx = (phraseIdx + 1) % phrases.length;
      if (typeof gsap !== 'undefined' && !prefersReduced) {
        gsap.to(rotatorEl, {
          opacity: 0,
          y: -8,
          duration: 0.22,
          ease: 'power2.in',
          onComplete: () => {
            rotatorEl.textContent = phrases[phraseIdx];
            gsap.fromTo(rotatorEl, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
          }
        });
      } else {
        rotatorEl.textContent = phrases[phraseIdx];
      }
    }, 3600);
  }

  // Background Parallax Mousemove on Desktop (Throttled with requestAnimationFrame)
  const heroSection = document.querySelector('.hero-section');
  if (heroSection && window.innerWidth >= 992 && !prefersReduced && typeof gsap !== 'undefined') {
    const orb1 = heroSection.querySelector('.hero-orb-1');
    const orb2 = heroSection.querySelector('.hero-orb-2');
    const bgImg = heroSection.querySelector('.hero-backdrop img');

    const xToOrb1 = orb1 ? gsap.quickTo(orb1, 'x', { duration: 1.2, ease: 'power2.out' }) : null;
    const yToOrb1 = orb1 ? gsap.quickTo(orb1, 'y', { duration: 1.2, ease: 'power2.out' }) : null;
    const xToOrb2 = orb2 ? gsap.quickTo(orb2, 'x', { duration: 1.5, ease: 'power2.out' }) : null;
    const yToOrb2 = orb2 ? gsap.quickTo(orb2, 'y', { duration: 1.5, ease: 'power2.out' }) : null;
    const xToImg = bgImg ? gsap.quickTo(bgImg, 'x', { duration: 1.8, ease: 'power2.out' }) : null;
    const yToImg = bgImg ? gsap.quickTo(bgImg, 'y', { duration: 1.8, ease: 'power2.out' }) : null;

    let ticking = false;
    heroSection.addEventListener('mousemove', (e) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const rect = heroSection.getBoundingClientRect();
          const normX = (e.clientX - rect.left) / rect.width - 0.5;
          const normY = (e.clientY - rect.top) / rect.height - 0.5;

          if (xToOrb1 && yToOrb1) { xToOrb1(normX * 40); yToOrb1(normY * 40); }
          if (xToOrb2 && yToOrb2) { xToOrb2(-normX * 50); yToOrb2(-normY * 50); }
          if (xToImg && yToImg) { xToImg(normX * 15); yToImg(normY * 15); }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    heroSection.addEventListener('mouseleave', () => {
      if (xToOrb1 && yToOrb1) { xToOrb1(0); yToOrb1(0); }
      if (xToOrb2 && yToOrb2) { xToOrb2(0); yToOrb2(0); }
      if (xToImg && yToImg) { xToImg(0); yToImg(0); }
    });
  }

  // Statistics Number Count-Up Animation
  const statNums = document.querySelectorAll('.stat-num[data-count]');
  if (statNums.length > 0 && typeof ScrollTrigger !== 'undefined' && !prefersReduced) {
    statNums.forEach(numEl => {
      const targetVal = parseFloat(numEl.getAttribute('data-count'));
      const suffix = numEl.getAttribute('data-suffix') || '';
      const decimals = parseInt(numEl.getAttribute('data-decimals') || '0', 10);
      const obj = { val: 0 };

      ScrollTrigger.create({
        trigger: numEl,
        start: 'top 92%',
        once: true,
        onEnter: () => {
          gsap.to(obj, {
            val: targetVal,
            duration: 1.6,
            ease: 'power2.out',
            onUpdate: () => {
              numEl.textContent = (decimals > 0 ? obj.val.toFixed(decimals) : Math.floor(obj.val)) + suffix;
            }
          });
        }
      });
    });
  }
}

/* 3. 3D PERSPECTIVE TILT CARDS & RADIAL CURSOR TORCH (THROTTLED) */
function init3DTiltCards() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || window.innerWidth < 768) return;

  const tiltCards = document.querySelectorAll('.zy-tilt-card, .zy-service-deliver-card');
  tiltCards.forEach(card => {
    let ticking = false;
    card.addEventListener('mousemove', (e) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;

          card.style.setProperty('--mouse-x', `${x}px`);
          card.style.setProperty('--mouse-y', `${y}px`);

          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const rotX = ((y - centerY) / centerY) * -6.5;
          const rotY = ((x - centerX) / centerX) * 6.5;

          card.style.transform = `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--mouse-x', '-999px');
      card.style.setProperty('--mouse-y', '-999px');
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });
  });
}

/* 4. SCROLL-LINKED PROCESS TIMELINE (GPU COMPOSITED) */
function initProcessTimeline() {
  const processSection = document.getElementById('process');
  const spineFill = document.getElementById('processSpineFill');
  const steps = document.querySelectorAll('.zy-process-step');
  if (!processSection || !spineFill || steps.length === 0) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (typeof ScrollTrigger !== 'undefined' && !prefersReduced) {
    ScrollTrigger.create({
      trigger: processSection,
      start: 'top 70%',
      end: 'bottom 85%',
      scrub: 0.25,
      onUpdate: (self) => {
        spineFill.style.transform = `scaleY(${self.progress})`;
      }
    });

    steps.forEach((step) => {
      ScrollTrigger.create({
        trigger: step,
        start: 'top 72%',
        onEnter: () => step.classList.add('active'),
        onLeaveBack: () => step.classList.remove('active')
      });
    });
  } else {
    spineFill.style.transform = 'scaleY(1)';
    steps.forEach(s => s.classList.add('active'));
  }
}

/* 5. INTERACTIVE TECHNOLOGY NODE CANVAS GRAPH (OFFSCREEN-PAUSED, ZERO-SHADOW-BLUR) */
function initTechCanvas() {
  const canvas = document.getElementById('zy-tech-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 16 Enterprise Nodes across 4 Clusters
  const nodes = [
    // Software & Web (Cyan #262262)
    { id: 'react', name: 'React 19', cluster: 'software', color: '#262262', x: 0.18, y: 0.28, vx: 0.15, vy: 0.12, radius: 24 },
    { id: 'nextjs', name: 'Next.js', cluster: 'software', color: '#262262', x: 0.32, y: 0.20, vx: -0.12, vy: 0.14, radius: 22 },
    { id: 'nodejs', name: 'Node.js', cluster: 'software', color: '#262262', x: 0.25, y: 0.45, vx: 0.14, vy: -0.11, radius: 25 },
    { id: 'ts', name: 'TypeScript', cluster: 'software', color: '#262262', x: 0.38, y: 0.38, vx: -0.15, vy: -0.13, radius: 21 },
    { id: 'python', name: 'Python', cluster: 'software', color: '#262262', x: 0.44, y: 0.22, vx: 0.11, vy: 0.15, radius: 23 },

    // Cloud & DevOps (Blue #f16623)
    { id: 'aws', name: 'AWS Cloud', cluster: 'cloud', color: '#f16623', x: 0.58, y: 0.25, vx: -0.13, vy: 0.12, radius: 26 },
    { id: 'docker', name: 'Docker', cluster: 'cloud', color: '#f16623', x: 0.70, y: 0.32, vx: 0.12, vy: -0.14, radius: 23 },
    { id: 'k8s', name: 'Kubernetes', cluster: 'cloud', color: '#f16623', x: 0.65, y: 0.48, vx: -0.14, vy: 0.11, radius: 24 },
    { id: 'cicd', name: 'CI/CD Pipelines', cluster: 'cloud', color: '#f16623', x: 0.52, y: 0.42, vx: 0.13, vy: -0.12, radius: 22 },

    // Frontier AI & ML (Orange #f16623)
    { id: 'pytorch', name: 'PyTorch', cluster: 'ai', color: '#6366f1', x: 0.28, y: 0.75, vx: 0.12, vy: -0.13, radius: 23 },
    { id: 'openai', name: 'OpenAI API', cluster: 'ai', color: '#6366f1', x: 0.42, y: 0.68, vx: -0.11, vy: 0.14, radius: 25 },
    { id: 'langchain', name: 'LangChain', cluster: 'ai', color: '#6366f1', x: 0.36, y: 0.85, vx: 0.14, vy: -0.12, radius: 22 },
    { id: 'hf', name: 'Hugging Face', cluster: 'ai', color: '#6366f1', x: 0.50, y: 0.82, vx: -0.12, vy: -0.15, radius: 21 },

    // Data & Storage (Emerald #10b981)
    { id: 'postgres', name: 'PostgreSQL', cluster: 'data', color: '#10b981', x: 0.68, y: 0.72, vx: 0.15, vy: -0.11, radius: 25 },
    { id: 'redis', name: 'Redis Cache', cluster: 'data', color: '#10b981', x: 0.80, y: 0.62, vx: -0.13, vy: 0.12, radius: 22 },
    { id: 'mongodb', name: 'MongoDB', cluster: 'data', color: '#10b981', x: 0.78, y: 0.82, vx: 0.12, vy: 0.13, radius: 23 }
  ];

  const connections = [
    ['react', 'nextjs'], ['nextjs', 'nodejs'], ['nodejs', 'ts'], ['ts', 'python'],
    ['nodejs', 'postgres'], ['python', 'pytorch'], ['pytorch', 'openai'], ['openai', 'langchain'],
    ['langchain', 'hf'], ['nodejs', 'docker'], ['docker', 'aws'], ['docker', 'k8s'],
    ['aws', 'cicd'], ['k8s', 'cicd'], ['postgres', 'redis'], ['postgres', 'mongodb'],
    ['openai', 'postgres'], ['aws', 'postgres'], ['nextjs', 'aws']
  ];

  const pulses = connections.map(([fromId, toId], idx) => ({
    fromId,
    toId,
    progress: (idx * 0.18) % 1,
    speed: 0.003 + (idx % 3) * 0.001
  }));

  let width = 0;
  let height = 0;
  let activeCluster = 'all';
  let hoveredNode = null;
  const mouse = { x: -1000, y: -1000, isOver: false };
  let isCanvasVisible = false;
  let animFrameId = null;

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Mouse interaction
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.isOver = true;

    hoveredNode = null;
    for (const node of nodes) {
      const nx = node.x * width;
      const ny = node.y * height;
      const dist = Math.hypot(mouse.x - nx, mouse.y - ny);
      if (dist <= node.radius + 6) {
        hoveredNode = node;
        break;
      }
    }
  }, { passive: true });

  canvas.addEventListener('mouseleave', () => {
    mouse.isOver = false;
    mouse.x = -1000;
    mouse.y = -1000;
    hoveredNode = null;
  });

  // Filter Pills Handling
  const filterBtns = document.querySelectorAll('#techClusterFilters .zy-tech-pill-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCluster = btn.getAttribute('data-cluster') || 'all';
    });
  });

  const nodeMap = new Map();
  nodes.forEach(n => nodeMap.set(n.id, n));

  // Animation Loop (Zero software shadow-blur for maximum 120 FPS performance)
  function drawGraph() {
    if (!isCanvasVisible && !prefersReduced) {
      animFrameId = null;
      return;
    }

    ctx.clearRect(0, 0, width, height);

    if (!prefersReduced) {
      nodes.forEach(node => {
        node.x += node.vx * 0.0005;
        node.y += node.vy * 0.0005;
        if (node.x < 0.1 || node.x > 0.9) node.vx *= -1;
        if (node.y < 0.15 || node.y > 0.88) node.vy *= -1;

        if (mouse.isOver) {
          const nx = node.x * width;
          const ny = node.y * height;
          const dx = mouse.x - nx;
          const dy = mouse.y - ny;
          const dist = Math.hypot(dx, dy);
          if (dist < 120 && dist > 1) {
            node.x += (dx / dist) * 0.0004;
            node.y += (dy / dist) * 0.0004;
          }
        }
      });
    }

    // Draw Edges
    connections.forEach(([fromId, toId]) => {
      const from = nodeMap.get(fromId);
      const to = nodeMap.get(toId);
      if (!from || !to) return;

      const x1 = from.x * width;
      const y1 = from.y * height;
      const x2 = to.x * width;
      const y2 = to.y * height;

      const isConnectedToHovered = hoveredNode && (hoveredNode.id === fromId || hoveredNode.id === toId);
      const isClusterActive = activeCluster === 'all' || from.cluster === activeCluster || to.cluster === activeCluster;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);

      const isDark = document.body.classList.contains('theme-dark');
      if (isConnectedToHovered) {
        ctx.strokeStyle = isDark ? 'rgba(241, 102, 35, 0.95)' : 'rgba(241, 102, 35, 0.95)';
        ctx.lineWidth = 2.5;
      } else if (isClusterActive) {
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(241, 102, 35, 0.35)';
        ctx.lineWidth = 1.8;
      } else {
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(148, 163, 184, 0.2)';
        ctx.lineWidth = 1.0;
      }
      ctx.stroke();
    });

    // Draw Traveling Energy Pulses (Pure alpha arc glow, no expensive shadowBlur)
    if (!prefersReduced) {
      pulses.forEach(pulse => {
        const from = nodeMap.get(pulse.fromId);
        const to = nodeMap.get(pulse.toId);
        if (!from || !to) return;

        pulse.progress = (pulse.progress + pulse.speed) % 1;
        const px = from.x * width + (to.x * width - from.x * width) * pulse.progress;
        const py = from.y * height + (to.y * height - from.y * height) * pulse.progress;

        const isClusterActive = activeCluster === 'all' || from.cluster === activeCluster || to.cluster === activeCluster;
        if (isClusterActive) {
          // Halo
          ctx.beginPath();
          ctx.arc(px, py, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = from.color + '33';
          ctx.fill();

          // Core
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fillStyle = from.color;
          ctx.fill();
        }
      });
    }

    // Draw Nodes
    nodes.forEach(node => {
      const nx = node.x * width;
      const ny = node.y * height;
      const isHovered = hoveredNode && hoveredNode.id === node.id;
      const isClusterMatch = activeCluster === 'all' || node.cluster === activeCluster;

      // Outer glow disc
      if (isHovered || (isClusterMatch && activeCluster !== 'all')) {
        ctx.beginPath();
        ctx.arc(nx, ny, node.radius + 6, 0, Math.PI * 2);
        ctx.fillStyle = node.color + '26';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(nx, ny, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? '#1e293b' : '#0d1322';
      ctx.strokeStyle = node.color + (isClusterMatch ? 'dd' : '33');
      ctx.lineWidth = isHovered ? 2.2 : 1.6;
      ctx.fill();
      ctx.stroke();

      ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isClusterMatch ? '#ffffff' : 'rgba(255, 255, 255, 0.3)';
      ctx.fillText(node.name, nx, ny);
    });

    if (!prefersReduced && isCanvasVisible) {
      animFrameId = requestAnimationFrame(drawGraph);
    } else {
      animFrameId = null;
    }
  }

  // Performance Observer: Only animate when canvas is visible in viewport!
  const canvasObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      isCanvasVisible = entry.isIntersecting;
      if (isCanvasVisible && !animFrameId && !prefersReduced) {
        animFrameId = requestAnimationFrame(drawGraph);
      } else if (!isCanvasVisible && animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
    });
  }, { threshold: 0.05 });

  canvasObserver.observe(canvas);
}

/* 6. DESKTOP MAGNETIC CTAs WITH GSAP quickTo */
function initMagneticButtons() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || window.innerWidth < 992 || typeof gsap === 'undefined') return;

  const magneticBtns = document.querySelectorAll('.zy-magnetic, .btn-brand, .btn-brand-outline');
  magneticBtns.forEach(btn => {
    const xTo = gsap.quickTo(btn, 'x', { duration: 0.35, ease: 'power2.out' });
    const yTo = gsap.quickTo(btn, 'y', { duration: 0.35, ease: 'power2.out' });

    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - (rect.left + rect.width / 2);
      const y = e.clientY - (rect.top + rect.height / 2);
      xTo(Math.max(-14, Math.min(14, x * 0.3)));
      yTo(Math.max(-14, Math.min(14, y * 0.3)));
    }, { passive: true });

    btn.addEventListener('mouseleave', () => {
      xTo(0);
      yTo(0);
    });
  });
}

/* 7. INTELLIGENT SCROLLSPY */
function initScrollspy() {
  const sections = Array.from(document.querySelectorAll('section[id]'));
  const navLinks = Array.from(document.querySelectorAll('.zy-navbar .zy-nav-link'));
  if (sections.length === 0 || navLinks.length === 0) return;

  function setActiveLink(activeId) {
    let matched = false;
    navLinks.forEach(link => {
      const href = link.getAttribute('href') || '';
      const cleanHref = href.includes('#') ? href.split('#')[1] : href.replace(/^\//, '');
      const isMatch = (href === `#${activeId}`) ||
                      (href === `/#${activeId}`) ||
                      (href === `/${activeId}`) ||
                      (cleanHref === activeId);
      if (isMatch) {
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        matched = true;
      }
    });
    // Fallback to home if no matching link for that section
    if (!matched && (activeId === 'home' || activeId === 'remote-delivery')) {
      navLinks.forEach(l => {
        const href = l.getAttribute('href') || '';
        if (href === '/#home' || href === '#home') l.classList.add('active');
        else l.classList.remove('active');
      });
    }
  }

  function handleScroll() {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    if (scrollY < 260) {
      setActiveLink('home');
      return;
    }

    let activeSectionId = null;
    const offset = 180;
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      const top = sec.offsetTop - offset;
      const bottom = top + sec.offsetHeight;
      if (scrollY >= top && scrollY < bottom) {
        activeSectionId = sec.getAttribute('id');
        break;
      }
    }

    if (activeSectionId) {
      setActiveLink(activeSectionId);
    }
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        handleScroll();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  handleScroll();
}

/* ==================== INTERACTIVE PARTICLE TYPOGRAPHY (FOOTER WORDMARK) ==================== */
/* Replicates the exact uniform dot-matrix typography from reference image (media_1792732121121_0bd01af2.png) */
function initFooterParticleTypography() {
  const canvas = document.getElementById('zy-footer-particle-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width = 0;
  let height = 0;
  let particles = [];
  let animFrameId = null;
  let isCanvasVisible = true;
  const mouse = { x: -1000, y: -1000, isOver: false, radius: 110 };

  const word = 'ZYLLOTECH';

  // Sample "ZYLLOTECH" into a pure uniform dot-matrix grid matching reference image
  function initParticles() {
    const rect = canvas.getBoundingClientRect();
    width = Math.floor(rect.width) || canvas.clientWidth || 1140;
    height = Math.floor(rect.height) || canvas.clientHeight || 150;

    if (width <= 50 || height <= 20) {
      width = 1140;
      height = 150;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Offscreen canvas for typography mask
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const oCtx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!oCtx) return;

    // Use wide geometric typography matching reference image (Syncopate / Space Grotesk)
    // Calculate responsive font size & tracking so ZYLLOTECH spans ~88% of canvas
    let fontSize = Math.floor(height * 0.62);
    fontSize = Math.min(Math.max(fontSize, 30), 105);
    let tracking = Math.max(6, Math.floor(width * 0.015));

    function measureWordWidth(tCtx, fSize, trk) {
      tCtx.font = `700 ${fSize}px "Syncopate", "Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      let totalW = 0;
      for (let i = 0; i < word.length; i++) {
        totalW += tCtx.measureText(word[i]).width;
        if (i < word.length - 1) totalW += trk;
      }
      return totalW;
    }

    const targetW = width * (width < 600 ? 0.94 : 0.88);
    let measuredW = measureWordWidth(oCtx, fontSize, tracking);
    if (measuredW > 0) {
      const scale = targetW / measuredW;
      fontSize = Math.min(Math.max(Math.floor(fontSize * scale), 22), Math.floor(height * 0.76));
      tracking = Math.max(3, Math.floor(tracking * scale));
    }

    oCtx.font = `700 ${fontSize}px "Syncopate", "Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    oCtx.fillStyle = '#ffffff';
    oCtx.textAlign = 'center';
    oCtx.textBaseline = 'middle';

    // Measure exact letter widths for precise horizontal centering
    let totalRenderW = 0;
    const letterWidths = [];
    for (let i = 0; i < word.length; i++) {
      const lw = oCtx.measureText(word[i]).width;
      letterWidths.push(lw);
      totalRenderW += lw;
      if (i < word.length - 1) totalRenderW += tracking;
    }

    // Render characters with uniform tracking across canvas center
    let currentX = (width - totalRenderW) / 2;
    const centerY = Math.floor(height / 2);
    for (let i = 0; i < word.length; i++) {
      oCtx.fillText(word[i], currentX + letterWidths[i] / 2, centerY);
      currentX += letterWidths[i] + tracking;
    }

    const imgData = oCtx.getImageData(0, 0, width, height).data;

    // Dot grid step and radius matching the exact pitch of UNITEDCARRIERS reference
    const step = width < 480 ? 3.6 : (width < 992 ? 4.0 : 4.2);
    const dotRadius = width < 480 ? 1.05 : 1.25;

    const newParticles = [];
    for (let y = Math.floor(step / 2); y < height; y += step) {
      for (let x = Math.floor(step / 2); x < width; x += step) {
        const px = Math.floor(x);
        const py = Math.floor(y);
        const pixelIndex = (py * width + px) * 4 + 3;
        // Check pixel mask coverage
        if (imgData[pixelIndex] > 40) {
          newParticles.push({
            originX: x,
            originY: y,
            x: x,       // EXACT grid point on start (zero jitter)
            y: y,       // EXACT grid point on start (zero jitter)
            vx: 0,
            vy: 0,
            radius: dotRadius
          });
        }
      }
    }

    particles = newParticles;
  }

  // Animation & Physics Loop
  function updateAndDraw() {
    if (particles.length === 0) return;

    ctx.clearRect(0, 0, width, height);

    const isDark = document.body.classList.contains('theme-dark');
    // Subtle, clean light grey in Light Mode matching reference image; luminous silver in Dark Mode
    const baseColor = isDark ? '#9f9cb8' : '#6b6894';
    const activeSwirlColor = isDark ? '#f16623' : '#262262';

    const maxDist = mouse.radius;
    let anyMoving = false;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Mouse repulsion and tangential swirl
      if (!prefersReduced && mouse.isOver) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.hypot(dx, dy);

        if (dist < maxDist && dist > 0.001) {
          const force = Math.pow(1 - dist / maxDist, 1.4);
          const angle = Math.atan2(dy, dx);

          // Local repulsion away from cursor
          const repX = Math.cos(angle) * force * 7.5;
          const repY = Math.sin(angle) * force * 7.5;

          // Tangential fluid swirl
          const swirlX = -Math.sin(angle) * force * 5.0;
          const swirlY = Math.cos(angle) * force * 5.0;

          p.vx += repX + swirlX;
          p.vy += repY + swirlY;
          anyMoving = true;
        }
      }

      // Spring force returning particle to exact home grid coordinate
      const homeDx = p.originX - p.x;
      const homeDy = p.originY - p.y;
      p.vx += homeDx * 0.085;
      p.vy += homeDy * 0.085;

      // Velocity damping / friction
      p.vx *= 0.82;
      p.vy *= 0.82;

      p.x += p.vx;
      p.y += p.vy;

      // Crisp settle check: snap to exact grid position when close to stop jitter
      const speed = Math.hypot(p.vx, p.vy);
      const distFromHome = Math.hypot(homeDx, homeDy);
      if (!mouse.isOver && speed < 0.04 && distFromHome < 0.15) {
        p.x = p.originX;
        p.y = p.originY;
        p.vx = 0;
        p.vy = 0;
      } else if (speed > 0.04 || distFromHome > 0.15) {
        anyMoving = true;
      }

      // Dynamic color: subtle grey at rest, energetic blue swirl when disturbed
      ctx.fillStyle = speed > 1.8 ? activeSwirlColor : baseColor;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Keep loop running if mouse is hovering or particles are still returning
    if (!prefersReduced && isCanvasVisible && (mouse.isOver || anyMoving)) {
      animFrameId = requestAnimationFrame(updateAndDraw);
    } else {
      animFrameId = null;
    }
  }

  function startAnimationLoop() {
    if (!animFrameId && isCanvasVisible && !prefersReduced) {
      animFrameId = requestAnimationFrame(updateAndDraw);
    }
  }

  // Initialize immediately
  initParticles();
  updateAndDraw();

  // If web fonts load after script execution, re-render to capture Syncopate letterforms
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      initParticles();
      updateAndDraw();
    });
  }

  // Backup font re-sample timers
  setTimeout(() => { initParticles(); updateAndDraw(); }, 300);
  setTimeout(() => { initParticles(); updateAndDraw(); }, 900);

  window.addEventListener('load', () => {
    initParticles();
    updateAndDraw();
  });

  // Mouse & Touch Interaction Listeners
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.isOver = true;
    startAnimationLoop();
  }, { passive: true });

  canvas.addEventListener('mouseenter', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.isOver = true;
    startAnimationLoop();
  }, { passive: true });

  canvas.addEventListener('mouseleave', () => {
    mouse.isOver = false;
    mouse.x = -1000;
    mouse.y = -1000;
    startAnimationLoop();
  });

  // Touch Support for Mobile
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.touches[0].clientX - rect.left;
      mouse.y = e.touches[0].clientY - rect.top;
      mouse.isOver = true;
      startAnimationLoop();
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.touches[0].clientX - rect.left;
      mouse.y = e.touches[0].clientY - rect.top;
      mouse.isOver = true;
      startAnimationLoop();
    }
  }, { passive: true });

  canvas.addEventListener('touchend', () => {
    mouse.isOver = false;
    mouse.x = -1000;
    mouse.y = -1000;
    startAnimationLoop();
  });

  // Responsive Resize Handling with debounce
  let resizeTimeout = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      initParticles();
      updateAndDraw();
    }, 150);
  });

  // Listen to themeChanged event to update particle colors
  window.addEventListener('themeChanged', () => {
    initParticles();
    updateAndDraw();
  });

  // IntersectionObserver: Only render when visible in viewport
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      isCanvasVisible = entry.isIntersecting;
      if (isCanvasVisible) {
        if (particles.length === 0) {
          initParticles();
        }
        updateAndDraw();
      } else if (!isCanvasVisible && animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
    });
  }, { threshold: 0.02 });

  observer.observe(canvas);
}

// Auto-run if DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(initFooterParticleTypography, 50);
}
