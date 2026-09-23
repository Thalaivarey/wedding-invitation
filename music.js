// Public invitation soundtrack. Audio starts only from a guest's click.
(() => {
  'use strict';
  const button = document.getElementById('musicToggle');
  if (!button) return;
  const base = new URL('assets/music/', document.currentScript.src);
  const tracks = [
    { file:'welcome.mp3', label:'Welcome' },
    { file:'moments.mp3', label:'Our moments' },
    { file:'ceremony.mp3', label:'The celebration' },
    { file:'forever.mp3', label:'Forever' }
  ];
  const buffers = new Map();
  const retiring = new Set();
  const LEVEL = .38;
  const FADE = 3;
  let context, master, current, desired = 0;
  let enabled = false, opened = false, loading = false, request = 0;
  let rememberedMute = false;
  try { rememberedMute = sessionStorage.getItem('invitation-music-muted') === 'true'; } catch {}

  function showState() {
    const playing = enabled && current && context?.state === 'running';
    button.dataset.state = playing ? 'playing' : enabled && loading ? 'loading' : 'off';
    button.setAttribute('aria-pressed', String(!!playing));
    button.textContent = playing ? `♫ Mute · ${tracks[current.index].label}` : enabled && loading ? '♫ Starting music…' : '♫ Play music';
    button.setAttribute('aria-label', playing ? `Mute music. Now playing: ${tracks[current.index].label}` : enabled && loading ? 'Cancel music playback' : 'Play gentle background music');
  }
  function remember() {
    rememberedMute = !enabled;
    try { sessionStorage.setItem('invitation-music-muted', String(!enabled)); } catch {}
  }
  function audioContext() {
    if (context) return context;
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    if (!AudioEngine) throw Error('Audio playback unavailable');
    context = new AudioEngine({ latencyHint:'playback' });
    master = context.createGain();
    master.gain.value = LEVEL;
    master.connect(context.destination);
    context.addEventListener('statechange', showState);
    return context;
  }
  function ramp(param, value, duration) {
    const now = context.currentTime;
    if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(now);
    else { const held = param.value; param.cancelScheduledValues(now); param.setValueAtTime(held,now); }
    param.linearRampToValueAtTime(value, now + duration);
  }
  async function buffer(index) {
    if (!buffers.has(index)) {
      const pending = fetch(new URL(tracks[index].file,base)).then(response => {
        if (!response.ok) throw Error('Track unavailable');
        return response.arrayBuffer();
      }).then(bytes => context.decodeAudioData(bytes)).catch(error => { buffers.delete(index); throw error; });
      buffers.set(index,pending);
    }
    return buffers.get(index);
  }
  async function changeTrack(index) {
    desired = index;
    if (!enabled || !context || document.hidden) return;
    if (current?.index === index) { ++request; loading = false; showState(); return; }
    const thisRequest = ++request;
    loading = true;
    showState();
    try {
      const decoded = await buffer(index);
      if (thisRequest !== request || !enabled || document.hidden || context.state !== 'running') return;
      // Keep rapid scroll changes from accumulating overlapping tracks.
      for (const old of retiring) { ramp(old.gain.gain,0,.1); old.source.stop(context.currentTime+.12); }
      retiring.clear();
      const voice = { index, source:context.createBufferSource(), gain:context.createGain() };
      voice.source.buffer = decoded;
      voice.source.loop = true;
      voice.gain.gain.value = 0;
      voice.source.connect(voice.gain);
      voice.gain.connect(master);
      voice.source.onended = () => { voice.source.disconnect(); voice.gain.disconnect(); retiring.delete(voice); };
      voice.source.start();
      ramp(voice.gain.gain,1,current ? FADE : 1.5);
      if (current) {
        retiring.add(current);
        ramp(current.gain.gain,0,FADE);
        current.source.stop(context.currentTime+FADE+.1);
      }
      current = voice;
      loading = false;
      showState();
    } catch {
      if (thisRequest !== request) return;
      loading = false;
      // Preserve the currently audible track if another section fails to load.
      if (!current) { enabled = false; button.textContent = '♫ Tap to retry music'; button.setAttribute('aria-label','Retry background music'); button.dataset.state='off'; }
      else showState();
    }
  }
  async function play() {
    enabled = true;
    loading = !current;
    showState();
    try {
      const engine = audioContext();
      await engine.resume();
      if (!enabled || document.hidden) { if (!document.hidden) ramp(master.gain,0,.2); return; }
      ramp(master.gain,LEVEL,.6);
      await changeTrack(desired);
    } catch { enabled=false; loading=false; showState(); }
  }
  function mute() {
    enabled = false;
    loading = false;
    ++request;
    if (context) ramp(master.gain,0,.35);
    remember();
    showState();
  }
  function revealControl() { opened=true; button.hidden=false; showState(); }
  document.addEventListener('invitation:opened', () => {
    revealControl();
    // This event fires synchronously inside the Open invitation click.
    if (!rememberedMute) void play();
  });
  document.addEventListener('invitation:chapter', event => {
    const index = Number(event.detail);
    if (Number.isInteger(index) && index >= 0 && index < tracks.length) void changeTrack(index);
  });
  button.addEventListener('click', () => {
    if (enabled) mute();
    else { rememberedMute=false; void play(); remember(); }
  });
  async function foreground() {
    if (!context) return;
    if (document.hidden) { ++request; await context.suspend().catch(() => {}); showState(); }
    else if (enabled) { await play(); }
  }
  document.addEventListener('visibilitychange', foreground);
  window.addEventListener('pagehide', () => { ++request; if (context) void context.suspend().catch(() => {}); });
  window.addEventListener('pageshow', () => { if (opened && enabled && !document.hidden) void play(); });
  // Direct chapter links remain silent until the guest presses Play music.
  if (!document.getElementById('site').inert) revealControl();
})();
