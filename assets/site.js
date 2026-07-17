/* Monegrid v2 shared behavior: animated grid background, scroll reveals,
   count-up stats, nav scroll state, mobile menu, footer year. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- animated electrical grid background ---------- */
  var canvas = document.getElementById('grid-bg');
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, CELL = 84, cols = 0, rows = 0;
    var pulses = [];
    var running = !reduceMotion;

    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(W / CELL) + 1;
      rows = Math.ceil(H / CELL) + 1;
      drawStatic();
    }

    function drawStatic() {
      ctx.clearRect(0, 0, W, H);
      var g = ctx.createRadialGradient(W * 0.5, H * 0.25, 0, W * 0.5, H * 0.25, Math.max(W, H) * 0.9);
      g.addColorStop(0, 'rgba(37, 99, 235, 0.055)');
      g.addColorStop(0.55, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.055)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var c = 0; c <= cols; c++) { ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, H); }
      for (var r = 0; r <= rows; r++) { ctx.moveTo(0, r * CELL); ctx.lineTo(W, r * CELL); }
      ctx.stroke();
      ctx.fillStyle = 'rgba(148, 163, 184, 0.10)';
      for (var i = 0; i <= cols; i++) {
        for (var j = 0; j <= rows; j++) {
          ctx.fillRect(i * CELL - 1, j * CELL - 1, 2, 2);
        }
      }
    }

    function spawnPulse() {
      var horizontal = Math.random() < 0.5;
      var line = horizontal
        ? Math.floor(Math.random() * rows)
        : Math.floor(Math.random() * cols);
      var startLow = Math.random() < 0.5;
      pulses.push({
        h: horizontal,
        line: line,
        pos: startLow ? -0.1 : 1.1,
        dir: startLow ? 1 : -1,
        speed: (0.12 + Math.random() * 0.22) / 100,
        len: 90 + Math.random() * 130
      });
    }

    var last = 0;
    function frame(t) {
      if (!running) return;
      if (!last) last = t;
      var dt = Math.min(t - last, 50);
      last = t;

      drawStatic();

      if (pulses.length < 7 && Math.random() < 0.045) spawnPulse();

      for (var i = pulses.length - 1; i >= 0; i--) {
        var p = pulses[i];
        p.pos += p.dir * p.speed * dt;
        if (p.pos < -0.25 || p.pos > 1.25) { pulses.splice(i, 1); continue; }

        var span = p.h ? W : H;
        var head = p.pos * span;
        var fixed = p.line * CELL;
        var x0, y0, x1, y1;
        if (p.h) { x0 = head - p.dir * p.len; y0 = fixed; x1 = head; y1 = fixed; }
        else { x0 = fixed; y0 = head - p.dir * p.len; x1 = fixed; y1 = head; }

        var lg = ctx.createLinearGradient(x0, y0, x1, y1);
        lg.addColorStop(0, 'rgba(59, 130, 246, 0)');
        lg.addColorStop(0.7, 'rgba(96, 165, 250, 0.32)');
        lg.addColorStop(1, 'rgba(191, 219, 254, 0.85)');
        ctx.strokeStyle = lg;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();

        ctx.save();
        ctx.shadowColor = 'rgba(96, 165, 250, 0.9)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'rgba(219, 234, 254, 0.95)';
        ctx.beginPath();
        ctx.arc(x1, y1, 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', function () {
      if (reduceMotion) return;
      if (document.hidden) { running = false; }
      else if (!running) { running = true; last = 0; requestAnimationFrame(frame); }
    });
    if (running) requestAnimationFrame(frame);
  }

  /* ---------- scroll reveal ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('on'); });
  }

  /* ---------- count-up stats ---------- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target)) return;
    var decimals = (el.getAttribute('data-count').split('.')[1] || '').length;
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    var dur = 1400, start = null;
    function step(t) {
      if (!start) start = t;
      var k = Math.min((t - start) / dur, 1);
      var eased = 1 - Math.pow(1 - k, 3);
      var val = (target * eased).toFixed(decimals);
      if (decimals === 0) val = Math.round(target * eased).toLocaleString('en-US');
      el.innerHTML = prefix + val + suffix;
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var countEls = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animateCount(e.target); cio.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    countEls.forEach(function (el) { cio.observe(el); });
  }

  /* ---------- nav scroll state ---------- */
  var nav = document.getElementById('site-nav');
  if (nav) {
    var onScroll = function () {
      if (window.scrollY > 24) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- mobile menu ---------- */
  var mb = document.getElementById('menu-btn');
  var mm = document.getElementById('mobile-menu');
  if (mb && mm) {
    mb.addEventListener('click', function () { mm.classList.toggle('hidden'); });
  }

  /* ---------- footer year ---------- */
  var yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();
})();
