/**
 * Zyllo Tech - Universal Light / Dark Theme Manager
 * Supports immediate theme switching, persistent localStorage, and synchronized UI controls.
 * Default: Professional Light Theme
 */

(function () {
  const THEME_KEY = 'zyllotech_theme_v2';

  // Get current or saved theme (defaults to 'light')
  function getPreferredTheme() {
    return localStorage.getItem(THEME_KEY) || 'light';
  }

  // Apply theme to document
  function applyTheme(theme) {
    const isLight = theme === 'light';
    const body = document.body;
    const html = document.documentElement;

    if (isLight) {
      if (body) {
        body.classList.add('theme-light');
        body.classList.remove('theme-dark', 'bg-dark', 'text-white');
      }
      html.classList.add('theme-light');
      html.classList.remove('theme-dark');
      html.setAttribute('data-bs-theme', 'light');
    } else {
      if (body) {
        body.classList.remove('theme-light');
        body.classList.add('theme-dark');
      }
      html.classList.remove('theme-light');
      html.classList.add('theme-dark');
      html.setAttribute('data-bs-theme', 'dark');
    }

    localStorage.setItem(THEME_KEY, theme);
    updateThemeToggleUI(theme);
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
  }

  // Update theme toggle buttons across the page
  function updateThemeToggleUI(theme) {
    const isLight = theme === 'light';
    const btns = document.querySelectorAll('.zy-theme-toggle-btn, #hrThemeToggleBtn, #adminThemeToggleBtn, #empThemeToggleBtn, #clientThemeToggleBtn');
    
    btns.forEach(btn => {
      const icon = btn.querySelector('i');
      const text = btn.querySelector('.theme-label, #themeLabel');
      
      if (isLight) {
        if (icon) icon.className = 'bi bi-moon-stars-fill text-warning';
        if (text) text.textContent = 'Dark Mode';
        btn.setAttribute('title', 'Switch to Dark Mode');
      } else {
        if (icon) icon.className = 'bi bi-sun-fill text-warning';
        if (text) text.textContent = 'Light Mode';
        btn.setAttribute('title', 'Switch to Light Mode');
      }
    });
  }

  // Global toggle function
  window.toggleTheme = function () {
    const current = getPreferredTheme();
    const next = current === 'light' ? 'dark' : 'light';
    applyTheme(next);
  };

  // Expose toggleHrTheme as alias for backwards compatibility
  window.toggleHrTheme = window.toggleTheme;

  // Initialize immediately before render
  const saved = getPreferredTheme();
  document.documentElement.setAttribute('data-bs-theme', saved);
  if (saved === 'light') {
    document.documentElement.classList.add('theme-light');
  } else {
    document.documentElement.classList.add('theme-dark');
  }

  if (document.body) {
    applyTheme(saved);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      applyTheme(saved);
    });
  }
})();
