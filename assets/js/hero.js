/* ==========================================================================
   Mischief Marketing — "Particle Raccoon" hero
   The raccoon "M" logo is rebuilt from ~2,000 particles. They fly in and
   assemble on load, scatter away from the cursor (or a finger on touch
   screens) and spring back. Click/tap the raccoon for a full mischief burst.
   A light field of drifting dust fills the rest of the hero.

   Performance: typed arrays, one canvas, DPR capped, particle budget scales
   with screen size, and the loop pauses when the hero is off-screen or the
   tab is hidden. Honors prefers-reduced-motion (static logo is kept).
   ========================================================================== */
(function () {
  'use strict';

  var hero = document.getElementById('hero');
  var canvas = document.getElementById('hero-canvas');
  var stage = document.getElementById('hero-stage');
  if (!hero || !canvas || !stage || !canvas.getContext) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var ctx = canvas.getContext('2d', { alpha: true });
  var src = canvas.getAttribute('data-src');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Colours (match CSS palette)
  var INK = '#0c0c0c';
  var INK_FAST = '#8c8a86';
  var DUST = 'rgba(140,138,134,0.45)';

  // Geometry of the mark inside the stage (fractions of stage size)
  var MARK_SIZE = 0.68;   // mark width relative to stage
  var MARK_CY = 0.39;     // vertical centre of mark within stage

  var W = 0, H = 0, dpr = 1;
  var markX = 0, markY = 0, markS = 0; // mark box in hero CSS px
  var img = new Image();

  // Particle buffers
  var n = 0, px, py, vx, vy, hx, hy, ps, seed;
  var fastIdx;
  // Dust buffers
  var dn = 0, dx, dy, dvx, dvy, ds;

  // Pointer
  var mx = -9999, my = -9999, pointerActive = false, lastMove = 0;
  var ringR = 0, ringTarget = 0;
  var ox = 0, oy = 0; // parallax offset of the whole mark

  // Spring strength: ramps up during intro / after a burst
  var k = 0.002, kTarget = 0.075, kRamp = 0.012;

  var live = false, running = false, visible = true, raf = 0, built = false, lastT = 0, t0 = 0;
  var lastW = 0, lastH = 0;

  /* ── Build ─────────────────────────────────────────────── */
  function measure() {
    var hr = hero.getBoundingClientRect();
    var sr = stage.getBoundingClientRect();
    W = Math.round(hr.width);
    H = Math.round(hr.height);
    dpr = Math.min(window.devicePixelRatio || 1, W < 700 ? 1.75 : 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    markS = sr.width * MARK_SIZE;
    markX = (sr.left - hr.left) + (sr.width - markS) / 2;
    markY = (sr.top - hr.top) + sr.height * MARK_CY - markS / 2;
  }

  function sample() {
    var size = Math.max(80, Math.round(markS));
    var off = document.createElement('canvas');
    off.width = off.height = size;
    var o = off.getContext('2d');
    o.fillStyle = '#fff';
    o.fillRect(0, 0, size, size);
    o.drawImage(img, 0, 0, size, size);
    var data = o.getImageData(0, 0, size, size).data;

    // Count dark pixels to pick a gap that hits the particle budget
    var dark = 0;
    for (var i = 0; i < data.length; i += 16) if (data[i] < 110) dark++;
    dark *= 4;
    var budget = W < 700 ? 1600 : W < 1100 ? 2600 : 3400;
    var gap = Math.max(2.2, Math.sqrt(dark / budget));

    var pts = [];
    for (var y = 0; y < size; y += gap) {
      for (var x = 0; x < size; x += gap) {
        var ix = (Math.round(y) * size + Math.round(x)) * 4;
        if (data[ix] < 110) pts.push(x, y);
      }
    }

    var prevN = n, oldX = px, oldY = py;
    n = pts.length / 2;
    px = new Float32Array(n); py = new Float32Array(n);
    vx = new Float32Array(n); vy = new Float32Array(n);
    hx = new Float32Array(n); hy = new Float32Array(n);
    ps = new Float32Array(n); seed = new Float32Array(n);
    fastIdx = new Int32Array(n);

    var dot = Math.max(1.4, gap * 0.8);
    for (var j = 0; j < n; j++) {
      hx[j] = pts[j * 2];
      hy[j] = pts[j * 2 + 1];
      ps[j] = dot * (0.94 + Math.random() * 0.12);
      seed[j] = Math.random() * Math.PI * 2;
      if (built && oldX && j < prevN) {
        // keep continuity on resize
        px[j] = oldX[j]; py[j] = oldY[j];
      } else {
        // intro: start scattered across the hero
        var a = Math.random() * Math.PI * 2;
        var r = Math.max(W, H) * (0.35 + Math.random() * 0.6);
        px[j] = markX + markS / 2 + Math.cos(a) * r;
        py[j] = markY + markS / 2 + Math.sin(a) * r;
      }
    }

    // Ambient dust
    dn = Math.min(220, Math.round((W * H) / 7000));
    dx = new Float32Array(dn); dy = new Float32Array(dn);
    dvx = new Float32Array(dn); dvy = new Float32Array(dn); ds = new Float32Array(dn);
    for (var d = 0; d < dn; d++) {
      dx[d] = Math.random() * W; dy[d] = Math.random() * H;
      dvx[d] = (Math.random() - 0.5) * 0.25; dvy[d] = (Math.random() - 0.5) * 0.25;
      ds[d] = 0.8 + Math.random() * 1.4;
    }
  }

  function build() {
    measure();
    sample();
    lastW = W; lastH = H;
    if (!built) {
      built = true;
      t0 = performance.now();
    }
  }

  /* ── Loop ──────────────────────────────────────────────── */
  function frame(t) {
    raf = 0;
    if (!running) return;
    var dt = lastT ? Math.min(2.5, (t - lastT) / 16.667) : 1;
    lastT = t;
    var time = (t - t0) / 1000;

    // spring ramp
    if (k < kTarget) k = Math.min(kTarget, k + kRamp * k * dt + 0.0004 * dt);

    // parallax toward pointer
    var cx = markX + markS / 2, cy = markY + markS / 2;
    var tx = 0, ty = 0;
    if (pointerActive) {
      tx = Math.max(-1, Math.min(1, (mx - cx) / (W / 2))) * markS * 0.035;
      ty = Math.max(-1, Math.min(1, (my - cy) / (H / 2))) * markS * 0.035;
    }
    ox += (tx - ox) * 0.06 * dt;
    oy += (ty - oy) * 0.06 * dt;

    // pointer fades out after inactivity on touch
    if (pointerActive && !finePointer && t - lastMove > 900) pointerActive = false;
    ringTarget = pointerActive ? markS * 0.07 : 0;
    ringR += (ringTarget - ringR) * 0.15 * dt;

    var R = Math.max(56, markS * 0.3);
    var R2 = R * R;
    var force = 6;
    var fr = Math.pow(0.84, dt);
    var mxL = pointerActive ? mx : -9999, myL = pointerActive ? my : -9999;
    var breathe = markS * 0.0016;

    ctx.clearRect(0, 0, W, H);
    if (!live) { live = true; hero.classList.add('hero-live'); }

    // dust
    ctx.fillStyle = DUST;
    for (var d = 0; d < dn; d++) {
      var ddx = dx[d] - mxL, ddy = dy[d] - myL, dd2 = ddx * ddx + ddy * ddy;
      if (dd2 < R2 * 2.2) {
        var dd = Math.sqrt(dd2) || 1, df = (1 - dd / (R * 1.48)) * 0.6;
        dvx[d] += ddx / dd * df; dvy[d] += ddy / dd * df;
      }
      dvx[d] *= 0.96; dvy[d] *= 0.96;
      dx[d] += (dvx[d] + 0.05) * dt; dy[d] += (dvy[d] - 0.03) * dt;
      if (dx[d] < -5) dx[d] = W + 5; else if (dx[d] > W + 5) dx[d] = -5;
      if (dy[d] < -5) dy[d] = H + 5; else if (dy[d] > H + 5) dy[d] = -5;
      ctx.fillRect(dx[d], dy[d], ds[d], ds[d]);
    }

    // mark particles
    var nf = 0;
    ctx.fillStyle = INK;
    var baseX = markX + ox, baseY = markY + oy;
    for (var i = 0; i < n; i++) {
      var s = seed[i];
      var homeX = baseX + hx[i] + Math.sin(time * 1.3 + s) * breathe;
      var homeY = baseY + hy[i] + Math.cos(time * 1.1 + s) * breathe;
      var x = px[i], y = py[i];
      var ax = (homeX - x) * k, ay = (homeY - y) * k;

      var qx = x - mxL, qy = y - myL, q2 = qx * qx + qy * qy;
      if (q2 < R2) {
        var q = Math.sqrt(q2) || 1;
        var f = (1 - q / R);
        f = f * f * force;
        ax += qx / q * f + (-qy / q) * f * 0.35; // push + slight swirl
        ay += qy / q * f + (qx / q) * f * 0.35;
      }

      var nvx = (vx[i] + ax * dt) * fr, nvy = (vy[i] + ay * dt) * fr;
      vx[i] = nvx; vy[i] = nvy;
      x += nvx * dt; y += nvy * dt;
      px[i] = x; py[i] = y;

      if (nvx * nvx + nvy * nvy > 2.2) fastIdx[nf++] = i;
      else ctx.fillRect(x, y, ps[i], ps[i]);
    }
    if (nf) {
      ctx.fillStyle = INK_FAST;
      for (var j = 0; j < nf; j++) {
        var p = fastIdx[j];
        ctx.fillRect(px[p], py[p], ps[p], ps[p]);
      }
    }

    // pointer ring (desktop)
    if (ringR > 0.5 && finePointer) {
      ctx.beginPath();
      ctx.arc(mx, my, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(12,12,12,0.22)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || !built || !visible || document.hidden) return;
    running = true;
    lastT = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  /* ── Interaction ───────────────────────────────────────── */
  function setPointer(clientX, clientY) {
    var r = hero.getBoundingClientRect();
    mx = clientX - r.left;
    my = clientY - r.top;
    pointerActive = mx >= 0 && my >= 0 && mx <= r.width && my <= r.height;
    lastMove = performance.now();
  }

  function burst(cx, cy) {
    for (var i = 0; i < n; i++) {
      var ax = px[i] - cx, ay = py[i] - cy;
      var d = Math.sqrt(ax * ax + ay * ay) || 1;
      var sp = 14 + Math.random() * 26;
      var spin = (Math.random() - 0.5) * 0.9;
      vx[i] += (ax / d + -ay / d * spin) * sp;
      vy[i] += (ay / d + ax / d * spin) * sp;
    }
    k = 0.001; // let them fly, then the spring ramps back up
  }

  function inMark(x, y) {
    var pad = markS * 0.08;
    return x > markX - pad && x < markX + markS + pad && y > markY - pad && y < markY + markS + pad;
  }

  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') setPointer(e.clientX, e.clientY);
  }, { passive: true });
  hero.addEventListener('pointerleave', function (e) {
    if (e.pointerType === 'mouse') pointerActive = false;
  });

  // Touch: follow the finger without blocking page scroll
  hero.addEventListener('touchstart', function (e) {
    var t = e.touches[0]; if (t) setPointer(t.clientX, t.clientY);
  }, { passive: true });
  hero.addEventListener('touchmove', function (e) {
    var t = e.touches[0]; if (t) setPointer(t.clientX, t.clientY);
  }, { passive: true });

  hero.addEventListener('click', function (e) {
    if (e.target.closest('a, button')) return;
    var r = hero.getBoundingClientRect();
    var x = e.clientX - r.left, y = e.clientY - r.top;
    if (inMark(x, y)) burst(x, y);
  });

  /* ── Lifecycle ─────────────────────────────────────────── */
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var r = hero.getBoundingClientRect();
      // ignore mobile URL-bar height jitter
      if (Math.abs(r.width - lastW) < 2 && Math.abs(r.height - lastH) < 140) return;
      build();
    }, 180);
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      visible ? start() : stop();
    }, { threshold: 0 }).observe(hero);
  }
  document.addEventListener('visibilitychange', function () {
    document.hidden ? stop() : start();
  });

  img.decoding = 'async';
  img.onload = function () {
    try {
      build();
      start();
    } catch (err) {
      // e.g. canvas tainted when opened from file:// — keep static logo
      hero.classList.remove('hero-live');
    }
  };
  img.src = src;
})();
