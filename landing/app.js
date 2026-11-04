/* Undistracted Me — landing page interactions
   Theme toggle · mobile nav · header state · scrollspy · FAQ accordion */
(function () {
  'use strict';

  var root = document.documentElement;

  /* ---------- Theme toggle ---------- */
  var STORAGE_KEY = 'um-theme';
  var themeToggle = document.querySelector('[data-theme-toggle]');
  var themeColorMeta = document.querySelector('meta[name="theme-color"]');

  function getSystemTheme() {
    return window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  function applyTheme(theme, persist) {
    // Suppress transitions during the swap (designed dark mode, no color tween).
    root.classList.add('theme-switching');
    root.setAttribute('data-theme', theme);
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', theme === 'dark' ? '#121b17' : '#f6efe3');
    }
    // Remove the flag after the paint so transitions resume for future interactions.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        root.classList.remove('theme-switching');
      });
    });

    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch (e) {
        /* storage may be unavailable — ignore */
      }
    }
  }

  // Resolve "auto" -> explicit value so the toggle icon stays accurate.
  (function initTheme() {
    var saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      saved = null;
    }
    applyTheme(saved === 'light' || saved === 'dark' ? saved : getSystemTheme(), false);
  })();

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next, true);
    });
  }

  /* ---------- Mobile navigation ---------- */
  var navToggle = document.querySelector('[data-nav-toggle]');
  var mobileNav = document.querySelector('[data-mobile-nav]');

  function closeNav() {
    if (!navToggle || !mobileNav) return;
    navToggle.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open menu');
    mobileNav.classList.remove('is-open');
  }

  if (navToggle && mobileNav) {
    navToggle.addEventListener('click', function () {
      var isOpen = mobileNav.classList.toggle('is-open');
      navToggle.classList.toggle('is-open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
      navToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    });

    mobileNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeNav);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeNav();
    });

    var desktopQuery = window.matchMedia('(min-width: 961px)');
    var onDesktop = function (event) {
      if (event.matches) closeNav();
    };
    if (desktopQuery.addEventListener) {
      desktopQuery.addEventListener('change', onDesktop);
    } else if (desktopQuery.addListener) {
      desktopQuery.addListener(onDesktop);
    }
  }

  /* ---------- Header scrolled state ---------- */
  var header = document.querySelector('[data-header]');

  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Scrollspy for primary nav ---------- */
  var spyLinks = document.querySelectorAll('.site-nav .nav-link');
  var spyIds = ['features', 'focus', 'web', 'privacy', 'faq'];

  if (spyLinks.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var target = '#' + entry.target.id;

          spyLinks.forEach(function (link) {
            var active = link.getAttribute('href') === target;
            link.classList.toggle('is-active', active);
            if (active) {
              link.setAttribute('aria-current', 'true');
            } else {
              link.removeAttribute('aria-current');
            }
          });
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );

    spyIds.forEach(function (id) {
      var section = document.getElementById(id);
      if (section) spy.observe(section);
    });
  }

  /* ---------- FAQ: single-open accordion ---------- */
  var faqList = document.querySelector('[data-faq]');
  if (faqList) {
    faqList.querySelectorAll('details').forEach(function (detail) {
      detail.addEventListener('toggle', function () {
        if (!detail.open) return;
        faqList.querySelectorAll('details[open]').forEach(function (other) {
          if (other !== detail) other.open = false;
        });
      });
    });
  }
})();
