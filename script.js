const gate = document.getElementById('gate');
const site = document.getElementById('site');
const openButton = document.getElementById('openInvitation');
const chapterNav = document.getElementById('chapterNav');
const chapters = [...document.querySelectorAll('.chapter')];
const navLinks = [...chapterNav.querySelectorAll('a')];

function openInvitation() {
  site.classList.remove('site-hidden');
  site.classList.add('site-visible');
  chapterNav.classList.remove('hidden');
  document.body.classList.remove('locked');
  document.querySelector('.hero .reveal')?.classList.add('in');
  gate.classList.add('hide');
  window.scrollTo({ top: 0, behavior: 'instant' });
  setTimeout(() => gate.remove(), 950);
}

openButton.addEventListener('click', openInvitation);

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('in');
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.15, rootMargin: '0px 0px -7% 0px' });

document.querySelectorAll('.reveal, .reveal-photo').forEach((element) => {
  revealObserver.observe(element);
});

const chapterObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const index = chapters.indexOf(entry.target);
    navLinks.forEach((link, linkIndex) => link.classList.toggle('active', linkIndex === index));
    chapterNav.classList.toggle('on-light', entry.target.dataset.tone === 'light');
  });
}, { rootMargin: '-43% 0px -43% 0px', threshold: 0 });

chapters.forEach((chapter) => chapterObserver.observe(chapter));

let ticking = false;
function updateParallax() {
  document.querySelectorAll('.parallax-media').forEach((media) => {
    const section = media.parentElement;
    const rect = section.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
    const y = (progress - 0.5) * 42;
    media.style.transform = `translate3d(0, ${y}px, 0) scale(1.035)`;
  });
  ticking = false;
}

window.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(updateParallax);
}, { passive: true });

updateParallax();

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
setInterval(updateCountdown, 1000);
