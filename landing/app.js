/* Undistracted Me — landing page interactions
   Mobile nav · theme toggle · scroll reveal · FAQ accordion · header state */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  /* ---------- Theme toggle ---------- */
  var STORAGE_KEY = 'um-theme';
  var themeToggle = document.querySelector('[data-theme-toggle]');

  function getSystemTheme() {
    return window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  function applyTheme(theme, persist) {
    root.setAttribute('data-theme', theme);
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
    if (!navToggle) return;
    navToggle.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    if (mobileNav) mobileNav.classList.remove('is-open');
  }

  if (navToggle && mobileNav) {
    navToggle.addEventListener('click', function () {
      var isOpen = mobileNav.classList.toggle('is-open');
      navToggle.classList.toggle('is-open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    mobileNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeNav);
    });
  }

  /* ---------- Header scrolled state ---------- */
  var header = document.querySelector('[data-header]');
  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

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

  /* ---------- Scroll reveal ---------- */
  var reduceMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealEls = document.querySelectorAll('.reveal');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) {
      el.classList.add('is-visible');
    });
  } else {
    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    revealEls.forEach(function (el) {
      observer.observe(el);
    });
  }
})();
