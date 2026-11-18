/* Mischief Marketing — site-wide interactions (no dependencies) */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ── Nav: shrink on scroll ─────────────────────────────── */
  var nav = document.getElementById('nav');
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      nav.classList.toggle('is-scrolled', window.scrollY > 40);
      updateTimeline();
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ── Nav: mobile menu ─────────────────────────────────── */
  var toggle = document.getElementById('nav-toggle');
  var menu = document.getElementById('nav-menu');
  function setMenu(open) {
    root.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  toggle.addEventListener('click', function () { setMenu(!root.classList.contains('nav-open')); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  window.addEventListener('resize', function () { if (window.innerWidth > 860) setMenu(false); });

  /* ── Scroll reveal ────────────────────────────────────── */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ── Rotating hero word ───────────────────────────────── */
  var rot = document.querySelector('.rotator');
  if (rot && !reduceMotion) {
    var words = (rot.getAttribute('data-words') || '').split('|').filter(Boolean);
    var i = 0;
    if (words.length > 1) {
      setInterval(function () {
        var current = rot.querySelector('.rotator-word');
        current.classList.add('is-out');
        setTimeout(function () {
          i = (i + 1) % words.length;
          var next = document.createElement('span');
          next.className = 'rotator-word is-in';
          next.textContent = words[i];
          rot.replaceChild(next, current);
        }, 420);
      }, 2600);
    }
  }

  /* ── Pointer-driven polish (desktop only) ─────────────── */
  if (finePointer && !reduceMotion) {
    // Spotlight glow that follows the cursor on cards
    document.querySelectorAll('.spotlight').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });

    // Magnetic buttons
    document.querySelectorAll('.magnetic').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.18;
        var y = (e.clientY - r.top - r.height / 2) * 0.3;
        el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });

    // CTA band glow follows cursor
    document.querySelectorAll('.cta-band').forEach(function (band) {
      var glow = band.querySelector('.cta-glow');
      band.addEventListener('pointermove', function (e) {
        var r = band.getBoundingClientRect();
        glow.style.setProperty('--gx', ((e.clientX - r.left) / r.width * 100) + '%');
        glow.style.setProperty('--gy', ((e.clientY - r.top) / r.height * 100) + '%');
      });
    });

    // Inner-page hero raccoon parallax
    var mark = document.querySelector('.page-hero-mark img');
    if (mark) {
      var ph = document.querySelector('.page-hero');
      ph.addEventListener('pointermove', function (e) {
        var r = ph.getBoundingClientRect();
        mark.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5) * -30);
        mark.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5) * -30);
      });
    }
  }

  /* ── Process timeline progress ────────────────────────── */
  var timeline = document.getElementById('timeline');
  var steps = timeline ? timeline.querySelectorAll('.timeline-step') : [];
  function updateTimeline() {
    if (!timeline) return;
    var r = timeline.getBoundingClientRect();
    var mid = window.innerHeight * 0.6;
    var p = Math.min(1, Math.max(0, (mid - r.top) / r.height));
    timeline.style.setProperty('--progress', p.toFixed(4));
    steps.forEach(function (s) {
      s.classList.toggle('is-active', s.getBoundingClientRect().top < mid);
    });
  }
  updateTimeline();
  onScroll();
})();
