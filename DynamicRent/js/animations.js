/**
 * animations.js
 * Scroll-triggered reveals via IntersectionObserver, animated number
 * counters, the initial page-load screen, and a gentle hero parallax.
 * All respect prefers-reduced-motion by not re-adding hidden state.
 */

const DRAnimations = (() => {
  const { qs, qsa, clamp } = window.DR.utils;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Scroll reveal ----
  const initReveal = () => {
    const targets = qsa('.reveal, .reveal-scale, .reveal-left, .reveal-right, .reveal-stagger, .underline-draw');
    if (!targets.length) return;
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      targets.forEach((t) => t.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    targets.forEach((t) => observer.observe(t));
  };

  // ---- Animated counters: <span data-counter data-target="2400" data-suffix="+"> ----
  const animateCounter = (el) => {
    const target = parseFloat(el.dataset.target || '0');
    const suffix = el.dataset.suffix || '';
    const isDecimal = target % 1 !== 0;
    const duration = 1400;
    const start = performance.now();

    const tick = (now) => {
      const progress = clamp((now - start) / duration, 0, 1);
      const eased = 1 - (1 - progress) ** 3; // ease-out cubic
      const current = target * eased;
      el.textContent = (isDecimal ? current.toFixed(1) : Math.round(current).toLocaleString()) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    };
    if (prefersReducedMotion) {
      el.textContent = (isDecimal ? target.toFixed(1) : target.toLocaleString()) + suffix;
    } else {
      requestAnimationFrame(tick);
    }
  };

  const initCounters = () => {
    const counters = qsa('[data-counter]');
    if (!counters.length) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach((c) => observer.observe(c));
  };

  // ---- Page loader ----
  const initPageLoader = () => {
    const loader = qs('.page-loader');
    if (!loader) return;
    const hide = () => loader.classList.add('is-hidden');
    if (document.readyState === 'complete') {
      setTimeout(hide, 300);
    } else {
      window.addEventListener('load', () => setTimeout(hide, 300));
    }
    // Safety net: never block the page for more than 2.2s
    setTimeout(hide, 2200);
  };

  // ---- Gentle parallax for hero photos: data-parallax="0.06" ----
  const initParallax = () => {
    const els = qsa('[data-parallax]');
    if (!els.length || prefersReducedMotion) return;
    const onScroll = () => {
      const y = window.scrollY;
      els.forEach((el) => {
        const speed = parseFloat(el.dataset.parallax) || 0.05;
        el.style.transform = `translateY(${y * speed}px)`;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  };

  const initAll = () => {
    initReveal();
    initCounters();
    initPageLoader();
    initParallax();
  };

  return { initAll, animateCounter };
})();

window.DR = window.DR || {};
window.DR.animations = DRAnimations;

document.addEventListener('DOMContentLoaded', () => DRAnimations.initAll());
