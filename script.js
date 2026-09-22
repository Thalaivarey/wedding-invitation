(() => {
  'use strict';
  const gate = document.getElementById('gate');
  const site = document.getElementById('site');
  const openButton = document.getElementById('openInvitation');
  const chapterNav = document.getElementById('chapterNav');
  const motionButton = document.getElementById('motionToggle');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const chapters = [...document.querySelectorAll('.chapter')];
  const navLinks = [...chapterNav.querySelectorAll('a')];
  let userPaused = false;
  let opened = false;
  let stopSparkles = () => {};
  const motionAllowed = () => !reducedMotion.matches && !userPaused;

  function syncMotion() {
    const paused = !motionAllowed();
    document.documentElement.classList.toggle('motion-paused', paused);
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.disabled = reducedMotion.matches;
    motionButton.textContent = reducedMotion.matches ? 'Reduced motion enabled' : paused ? 'Resume animation' : 'Pause animation';
    if (paused) document.querySelectorAll('.parallax-media').forEach((el) => el.style.removeProperty('transform'));
  }
  motionButton.addEventListener('click', () => { userPaused = !userPaused; syncMotion(); });
  reducedMotion.addEventListener?.('change', syncMotion);
  syncMotion();

  function openInvitation(hash = '') {
    if (opened) return;
    opened = true;
    stopSparkles();
    site.classList.remove('site-hidden');
    site.inert = false;
    site.removeAttribute('aria-hidden');
    chapterNav.classList.remove('hidden');
    document.body.classList.remove('locked');
    document.querySelector('.hero .reveal')?.classList.add('in');
    gate.classList.add('hide');
    gate.inert = true;
    document.getElementById('coupleTitle')?.focus({ preventScroll: true });
    const destination = hash && document.getElementById(hash.slice(1));
    if (destination) destination.scrollIntoView({ behavior: 'instant' });
    else window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => gate.remove(), motionAllowed() ? 950 : 0);
  }
  openButton.addEventListener('click', () => openInvitation());
  document.querySelector('.skip-link').addEventListener('click', () => openInvitation('#celebrate'));

  // Default HTML remains readable if JavaScript is disabled or cannot load.
  document.documentElement.classList.add('js');
  gate.hidden = false;
  site.classList.add('site-hidden');
  site.inert = true;
  site.setAttribute('aria-hidden', 'true');
  document.body.classList.add('locked');

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal, .reveal-photo').forEach((el) => revealObserver.observe(el));

    const chapterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const index = chapters.indexOf(entry.target);
        navLinks.forEach((link, i) => {
          link.classList.toggle('active', i === index);
          if (i === index) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
        chapterNav.classList.toggle('on-light', entry.target.dataset.tone === 'light');
      });
    }, { rootMargin: '-43% 0px -43% 0px', threshold: 0 });
    chapters.forEach((chapter) => chapterObserver.observe(chapter));
  } else {
    document.querySelectorAll('.reveal, .reveal-photo').forEach((el) => el.classList.add('in'));
  }

  let parallaxFrame = 0;
  function updateParallax() {
    parallaxFrame = 0;
    if (!opened || !motionAllowed() || document.hidden) return;
    document.querySelectorAll('.parallax-media').forEach((media) => {
      const rect = media.parentElement.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      media.style.transform = `translate3d(0, ${(progress - 0.5) * 42}px, 0) scale(1.035)`;
    });
  }
  window.addEventListener('scroll', () => {
    if (!parallaxFrame && opened && motionAllowed()) parallaxFrame = requestAnimationFrame(updateParallax);
  }, { passive: true });

  const weddingTime = new Date('2026-10-30T06:00:00+05:30').getTime();
  function updateCountdown() {
    const distance = Math.max(0, weddingTime - Date.now());
    const units = {
      days: Math.floor(distance / 86400000),
      hours: Math.floor((distance % 86400000) / 3600000),
      minutes: Math.floor((distance % 3600000) / 60000),
      seconds: Math.floor((distance % 60000) / 1000)
    };
    Object.entries(units).forEach(([id, value]) => {
      document.getElementById(id).textContent = String(value).padStart(2, '0');
    });
  }
  updateCountdown();
  let countdownTimer = setInterval(updateCountdown, 1000);
  document.addEventListener('visibilitychange', () => {
    clearInterval(countdownTimer);
    if (!document.hidden) {
      updateCountdown();
      countdownTimer = setInterval(updateCountdown, 1000);
    }
  });

  // RSVP submission: same-origin POST keeps the Zoho Flow webhook private on the server.
  const rsvpForm = document.getElementById('rsvpForm');
  const rsvpStatus = document.getElementById('rsvpStatus');
  if (rsvpForm && rsvpStatus) {
    rsvpForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      rsvpStatus.className = 'rsvp-status';
      rsvpStatus.textContent = '';
      if (!rsvpForm.reportValidity()) return;

      const submitButton = rsvpForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.textContent = 'Sending…';

      const data = Object.fromEntries(new FormData(rsvpForm).entries());
      data.side = document.body.dataset.side || 'bride';
      data.source_url = window.location.href;

      try {
        const response = await fetch('/api/rsvp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Unable to submit RSVP.');
        rsvpStatus.classList.add('success');
        rsvpStatus.textContent = 'Thank you — your RSVP has been received.';
        rsvpForm.reset();
      } catch (error) {
        rsvpStatus.classList.add('error');
        rsvpStatus.textContent = error.message || 'Unable to submit RSVP. Please try again.';
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Send RSVP';
      }
    });
  }

  // Opening-only canvas: bounded particle count and pixel density; no touch scroll blocking.
  function startSparkles() {
    const canvas = document.getElementById('openingSparkles');
    const ctx = canvas.getContext('2d');
    if (!ctx) return () => {};
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastFrame = 0;
    let lastPointer = 0;
    let elapsed = 0;
    let dead = false;
    let ambient = [];
    let trails = [];
    const maxTrails = 72;

    function resize() {
      const rect = gate.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ambient = Array.from({ length: width < 600 ? 22 : 36 }, () => ({
        x: Math.random() * width, y: Math.random() * height,
        size: 0.5 + Math.random() * 1.3, phase: Math.random() * Math.PI * 2,
        speed: 5 + Math.random() * 9
      }));
    }

    function star(x, y, size, alpha, rotation = 0) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = '#f6dfb3';
      ctx.beginPath();
      for (let point = 0; point < 8; point++) {
        const angle = point * Math.PI / 4;
        const radius = point % 2 === 0 ? size : size * 0.22;
        const xPoint = Math.cos(angle) * radius;
        const yPoint = Math.sin(angle) * radius;
        if (point === 0) ctx.moveTo(xPoint, yPoint);
        else ctx.lineTo(xPoint, yPoint);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function draw(timestamp) {
      frame = 0;
      if (dead || !motionAllowed() || document.hidden) return;
      frame = requestAnimationFrame(draw);
      if (timestamp - lastFrame < 32) return;
      const delta = Math.min((timestamp - lastFrame) / 1000, 0.06);
      lastFrame = timestamp;
      elapsed += delta;
      ctx.clearRect(0, 0, width, height);
      ambient.forEach((point) => {
        point.y = (point.y - point.speed * delta + height) % height;
        star(point.x, point.y, point.size, 0.2 + (Math.sin(elapsed + point.phase) + 1) * 0.17);
      });
      const radiusX = Math.min(width * 0.4, 295);
      const radiusY = Math.min(height * 0.35, 260);
      for (let i = 0; i < 14; i++) {
        const angle = elapsed * 0.27 - i * 0.025;
        star(width / 2 + Math.cos(angle) * radiusX, height / 2 + Math.sin(angle) * radiusY,
          i === 0 ? 5 : 2.2, (1 - i / 14) * 0.7, angle);
      }
      trails = trails.filter((point) => point.life > 0);
      trails.forEach((point) => {
        point.life -= delta;
        point.x += point.vx * delta;
        point.y += point.vy * delta;
        point.vy += delta * 12;
        star(point.x, point.y, point.size * Math.max(0, point.life / point.maxLife), Math.min(1, point.life), point.life);
      });
    }

    function move(event) {
      if (dead || !motionAllowed() || document.hidden || !event.isPrimary) return;
      const now = performance.now();
      if (event.type === 'pointermove' && now - lastPointer < 24) return;
      lastPointer = now;
      const rect = gate.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      gate.style.setProperty('--glow-x', `${x}px`);
      gate.style.setProperty('--glow-y', `${y}px`);
      const count = event.type === 'pointerdown' ? 12 : 4;
      for (let i = 0; i < count; i++) {
        const life = 0.65 + Math.random() * 0.75;
        trails.push({ x, y, vx: (Math.random() - 0.5) * 75, vy: (Math.random() - 0.65) * 75,
          size: 2 + Math.random() * 4, life, maxLife: life });
      }
      if (trails.length > maxTrails) trails.splice(0, trails.length - maxTrails);
    }

    function resumeOrPause() {
      cancelAnimationFrame(frame);
      frame = 0;
      if (!motionAllowed() || document.hidden) {
        trails = [];
        ctx.clearRect(0, 0, width, height);
      } else if (!dead) {
        lastFrame = performance.now();
        frame = requestAnimationFrame(draw);
      }
    }
    resize();
    window.addEventListener('resize', resize);
    gate.addEventListener('pointermove', move, { passive: true });
    gate.addEventListener('pointerdown', move, { passive: true });
    motionButton.addEventListener('click', resumeOrPause);
    reducedMotion.addEventListener?.('change', resumeOrPause);
    document.addEventListener('visibilitychange', resumeOrPause);
    resumeOrPause();
    return () => {
      dead = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      gate.removeEventListener('pointermove', move);
      gate.removeEventListener('pointerdown', move);
      motionButton.removeEventListener('click', resumeOrPause);
      reducedMotion.removeEventListener?.('change', resumeOrPause);
      document.removeEventListener('visibilitychange', resumeOrPause);
      trails = [];
      ctx.clearRect(0, 0, width, height);
    };
  }
  // A graphics failure must never block the invitation button.
  try { stopSparkles = startSparkles(); } catch { /* The static opening still works. */ }
  if (chapters.some((chapter) => `#${chapter.id}` === window.location.hash)) openInvitation(window.location.hash);
})();
