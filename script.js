const gate = document.getElementById('gate');
const site = document.getElementById('site');
const openBtn = document.getElementById('openInvitation');
const music = document.getElementById('bgMusic');
const musicToggle = document.getElementById('musicToggle');

document.body.classList.add('locked');

openBtn.addEventListener('click', async () => {
  gate.classList.add('hide');
  site.classList.remove('site-hidden');
  site.classList.add('site-visible');
  document.body.classList.remove('locked');
  document.querySelector('.hero .reveal')?.classList.add('in');

  try {
    await music.play();
    musicToggle.classList.remove('hidden');
    musicToggle.textContent = '♫';
  } catch {
    // The page works without music. Add assets/music.mp3 later to enable it.
  }

  setTimeout(() => gate.remove(), 900);
});

music.addEventListener('error', () => musicToggle.classList.add('hidden'));

musicToggle.addEventListener('click', async () => {
  if (music.paused) {
    try {
      await music.play();
      musicToggle.textContent = '♫';
    } catch {}
  } else {
    music.pause();
    musicToggle.textContent = '♪';
  }
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('in');
  });
}, { threshold: 0.16 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

const target = new Date('2026-10-30T06:00:00+05:30').getTime();
function updateCountdown(){
  const now = Date.now();
  const distance = Math.max(0, target - now);
  const days = Math.floor(distance / 86400000);
  const hours = Math.floor((distance % 86400000) / 3600000);
  const minutes = Math.floor((distance % 3600000) / 60000);
  const seconds = Math.floor((distance % 60000) / 1000);
  document.getElementById('days').textContent = String(days).padStart(2,'0');
  document.getElementById('hours').textContent = String(hours).padStart(2,'0');
  document.getElementById('minutes').textContent = String(minutes).padStart(2,'0');
  document.getElementById('seconds').textContent = String(seconds).padStart(2,'0');
}
updateCountdown();
setInterval(updateCountdown,1000);

// Scratch-to-reveal card
const canvas = document.getElementById('scratchCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently:true });
let scratching = false;

function paintCover(){
  const gradient = ctx.createLinearGradient(0,0,canvas.width,canvas.height);
  gradient.addColorStop(0,'#b08f68');
  gradient.addColorStop(.48,'#d4bd93');
  gradient.addColorStop(1,'#8f6f55');
  ctx.globalCompositeOperation='source-over';
  ctx.fillStyle=gradient;
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='rgba(45,28,30,.8)';
  ctx.textAlign='center';
  ctx.font='600 34px Inter, sans-serif';
  ctx.fillText('SCRATCH TO REVEAL',canvas.width/2,canvas.height/2+10);
}
paintCover();

function scratch(x,y){
  const rect=canvas.getBoundingClientRect();
  const sx=(x-rect.left)*(canvas.width/rect.width);
  const sy=(y-rect.top)*(canvas.height/rect.height);
  ctx.globalCompositeOperation='destination-out';
  ctx.beginPath();
  ctx.arc(sx,sy,52,0,Math.PI*2);
  ctx.fill();
}
function pointFromEvent(e){
  if(e.touches?.[0]) return {x:e.touches[0].clientX,y:e.touches[0].clientY};
  return {x:e.clientX,y:e.clientY};
}
canvas.addEventListener('pointerdown',e=>{scratching=true;scratch(e.clientX,e.clientY)});
canvas.addEventListener('pointermove',e=>{if(scratching)scratch(e.clientX,e.clientY)});
window.addEventListener('pointerup',()=>scratching=false);
canvas.addEventListener('touchstart',e=>{scratching=true;const p=pointFromEvent(e);scratch(p.x,p.y)},{passive:true});
canvas.addEventListener('touchmove',e=>{if(scratching){const p=pointFromEvent(e);scratch(p.x,p.y)}},{passive:true});
window.addEventListener('touchend',()=>scratching=false);
