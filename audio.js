// Schiffy Runner audio (job C, 2026-11-07): every sound and the music are made in code (WebAudio), no files.
// SFX = soft cartoon, ported from LPS synthSfx.ts (sine/triangle partials, struck-bar marimba/bell, FM wood, filtered
// noise puffs, soft envelopes) on a SPARSE mix: max 2 voices at once (priority sounds steal), one name never faster
// than 80 ms, no hover sounds. Music = a looping 16-bar tune (A 8 bars + B 8 bars) at 120 BPM on a lookahead scheduler
// that books notes on the AudioContext clock. Graph: voices -> sfx bus ┐
//                                 music session -> music bus -> night low-pass ┴-> master (mute) -> speakers.
// The context is only created by createLive() from a real user gesture (no autoplay warning at load).
// render*() build the same graph in an OfflineAudioContext for the wav proofs (tools/audio_check.py).

// ---------- building blocks (one voice = { ctx, out, t, rnd }) ----------
const noiseBufs = new WeakMap();
function noiseBuf(ctx) {
  let b = noiseBufs.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = b.getChannelData(0);
    let s = 12345;
    for (let k = 0; k < d.length; k++) { s = (s * 1103515245 + 12345) >>> 0; d[k] = (s / 4294967296) * 2 - 1; }
    noiseBufs.set(ctx, b);
  }
  return b;
}
function done(src, ...chain) { src.onended = () => { src.disconnect(); for (const c of chain) c.disconnect(); }; }
function env(ctx, t0, a, d, peak) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(Math.max(0.0002, peak), t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  return g;
}
const det = (v, c = 8) => Math.pow(2, ((v.rnd() * 2 - 1) * c) / 1200);
function tone(v, f, dt, d, peak, o = {}) {
  const t0 = v.t + dt, a = o.a ?? 0.004, end = t0 + a + d + 0.02;
  const osc = v.ctx.createOscillator(), g = env(v.ctx, t0, a, d, peak);
  osc.type = o.type ?? 'sine';
  const k = det(v);
  osc.frequency.setValueAtTime(f * k, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to * k), t0 + (o.glide ?? d));
  if (o.vib) {
    const lfo = v.ctx.createOscillator(), lg = v.ctx.createGain();
    lfo.frequency.value = o.vibHz ?? 6; lg.gain.value = f * k * o.vib;
    lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t0); lfo.stop(end); done(lfo, lg);
  }
  osc.connect(g); g.connect(v.out); osc.start(t0); osc.stop(end); done(osc, g);
}
function bar(v, f, dt, d, peak, [ratios, amps]) {
  for (let k = 0; k < ratios.length; k++) {
    if (f * ratios[k] > 15000) continue;
    tone(v, f * ratios[k], dt, d / (1 + k * 1.6), peak * amps[k], { a: 0.003 });
  }
}
const MARIMBA = [[1, 3.93, 9.2], [1, 0.22, 0.05]];
const XYLO = [[1, 3.0, 6.1], [1, 0.3, 0.08]];
const BELL = [[1, 2.76, 5.4, 8.93], [1, 0.45, 0.22, 0.1]];
const TOY = [[1, 2.0, 4.1, 6.3], [1, 0.3, 0.18, 0.06]];
const mar = (v, f, dt, d, p) => bar(v, f, dt, d, p, MARIMBA);
const xyl = (v, f, dt, d, p) => bar(v, f, dt, d, p, XYLO);
const bel = (v, f, dt, d, p) => bar(v, f, dt, d, p, BELL);
const toy = (v, f, dt, d, p) => bar(v, f, dt, d, p, TOY);
function fm(v, f, dt, a, d, peak, ratio, index, idec, to) {
  const t0 = v.t + dt, end = t0 + a + d + 0.02, k = det(v);
  const car = v.ctx.createOscillator(), mod = v.ctx.createOscillator(), mg = v.ctx.createGain(), g = env(v.ctx, t0, a, d, peak);
  car.frequency.setValueAtTime(f * k, t0); mod.frequency.setValueAtTime(f * k * ratio, t0);
  if (to) { car.frequency.exponentialRampToValueAtTime(to * k, t0 + a + d); mod.frequency.exponentialRampToValueAtTime(to * k * ratio, t0 + a + d); }
  mg.gain.setValueAtTime(f * k * index, t0);
  mg.gain.exponentialRampToValueAtTime(Math.max(0.01, f * k * index * 0.05), t0 + a + idec);
  mod.connect(mg); mg.connect(car.frequency); car.connect(g); g.connect(v.out);
  car.start(t0); mod.start(t0); car.stop(end); mod.stop(end); done(car, g); done(mod, mg);
}
function puff(v, dt, a, d, peak, f0, f1, q = 0.8, type = 'lowpass') {
  const t0 = v.t + dt, end = t0 + a + d + 0.02;
  const src = v.ctx.createBufferSource(), flt = v.ctx.createBiquadFilter(), g = env(v.ctx, t0, a, d, peak);
  src.buffer = noiseBuf(v.ctx); flt.type = type; flt.Q.value = q;
  flt.frequency.setValueAtTime(f0, t0); flt.frequency.exponentialRampToValueAtTime(f1, t0 + a + d);
  src.connect(flt); flt.connect(g); g.connect(v.out);
  src.start(t0, v.rnd() * 0.5); src.stop(end); done(src, flt, g);
}
const thud = (v, f0, f1, dt, d, p) => tone(v, f0, dt, d, p, { a: 0.003, to: f1, glide: d * 0.6 });
const run = (v, notes, step, d, p, fn, lastD = d) => notes.forEach((f, k) => fn(v, f, k * step, k === notes.length - 1 ? lastD : d, p));

const C5 = 523.25, E5 = 659.25, G5 = 783.99, A5 = 880, C6 = 1046.5, E6 = 1318.51, G6 = 1567.98;

// ---------- SFX recipes: dur = how long the voice is booked (s), trim = level (dB) so the set sits evenly ----------
export const SFX = {
  // soft boing: rising sine, then a wobbly tail (a short tap cuts the tail = the smaller hop)
  jump: { dur: 0.24, trim: 0, play: (v) => { tone(v, 260, 0, 0.08, 0.55, { to: 540, glide: 0.07 }); tone(v, 540, 0.06, 0.16, 0.3, { a: 0.01, to: 600, vib: 0.05, vibHz: 16 }); } },
  hop: { dur: 0.1, trim: -1, play: (v) => tone(v, 340, 0, 0.06, 0.45, { to: 640, glide: 0.05 }) },
  land: { dur: 0.07, trim: -8, play: (v) => thud(v, 170, 95, 0, 0.06, 0.6) },
  duck: { dur: 0.17, trim: 2, play: (v) => puff(v, 0, 0.035, 0.12, 0.85, 1300, 420, 1.2, 'bandpass') },
  point: { dur: 0.5, trim: -3, play: (v) => { bel(v, C6, 0, 0.25, 0.45); bel(v, G6 * 0.8409, 0.1, 0.4, 0.45); } }, // C6 -> E6
  tier: { dur: 0.6, trim: -2, play: (v) => run(v, [G5, C6, E6], 0.09, 0.25, 0.5, toy, 0.45) },
  best: { dur: 1.1, trim: -3, play: (v) => {
    run(v, [C5, E5, G5], 0.1, 0.22, 0.5, xyl);
    bel(v, C6, 0.32, 0.7, 0.4); bel(v, E6, 0.32, 0.65, 0.28); bel(v, G6, 0.34, 0.6, 0.2);
  } },
  // soft cartoon bonk (wood FM + low thud), then a sliding-whistle fall
  over: { dur: 1.0, trim: -2, play: (v) => {
    fm(v, 420, 0, 0.002, 0.12, 0.6, 1.41, 2.0, 0.03, 300); thud(v, 210, 90, 0, 0.14, 0.55);
    tone(v, 900, 0.16, 0.7, 0.32, { a: 0.03, to: 210, glide: 0.7, vib: 0.02, vibHz: 6.5 });
  } },
  ui: { dur: 0.15, trim: -2, play: (v) => { mar(v, A5, 0, 0.07, 0.6); mar(v, E6, 0.05, 0.09, 0.6); } },
};
const PRIORITY = new Set(['over', 'best', 'tier', 'ui']);
const MAX_VOICES = 2, MIN_GAP = 0.08;
const SFX_BUS = 0.85, MUSIC_BUS = 0.25, NIGHT_HZ = 2200, DAY_HZ = 14000, NIGHT_GAIN = 0.72;

// ---------- music: 120 BPM, 4/4, 16 bars (A 8 + B 8) = 32 s loop ----------
export const BPM = 120, BEAT = 60 / BPM, BAR = BEAT * 4, BARS = 16;
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
// chord per bar: [bass root (MIDI), chord tones for the soft offbeat stabs]
const CH = { C: [48, [64, 67, 72]], Am: [45, [64, 69, 72]], F: [41, [65, 69, 72]], G: [43, [62, 67, 71]], Em: [40, [64, 67, 71]] };
const CHORDS = ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'C', 'F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'G'];
// lead in 8ths (0 = rest); A = bouncy marimba, B = calmer toy-piano answer
const LEAD = [
  [76, 0, 79, 0, 76, 74, 72, 0], [72, 0, 76, 0, 81, 0, 79, 0], [77, 0, 76, 0, 74, 0, 72, 74], [74, 0, 71, 0, 67, 0, 71, 74],
  [76, 0, 79, 0, 84, 0, 83, 81], [79, 0, 76, 0, 72, 0, 76, 0], [77, 76, 74, 0, 72, 74, 76, 0], [72, 0, 0, 0, 67, 0, 71, 0],
  [69, 0, 72, 0, 77, 0, 0, 0], [71, 0, 74, 0, 79, 0, 0, 0], [71, 0, 76, 0, 79, 0, 76, 0], [72, 0, 0, 76, 0, 0, 74, 72],
  [69, 0, 72, 0, 77, 0, 76, 0], [74, 0, 79, 0, 77, 0, 74, 0], [76, 0, 72, 0, 79, 0, 0, 0], [74, 0, 71, 0, 74, 0, 67, 0],
];
function scheduleBar(ctx, out, i, t0, rnd) {
  const v = { ctx, out, t: t0, rnd }, b = i % BARS, B = b >= 8, [root, tones] = CH[CHORDS[b]], e = BEAT / 2;
  // lead
  LEAD[b].forEach((m, k) => { if (m) (B ? toy : mar)(v, hz(m), k * e, B ? 0.42 : 0.32, B ? 0.34 : 0.42); });
  // bass: root on 1, fifth on 3, a little octave pickup on the "and" of 4 (every 2nd bar)
  const bass = (m, at, p) => { tone(v, hz(m), at, 0.32, p, { a: 0.008, type: 'triangle' }); tone(v, hz(m) * 2, at, 0.16, p * 0.3, { a: 0.006 }); };
  bass(root, 0, 0.55); bass(root + 7, 2 * BEAT, 0.45); if (b % 2) bass(root + 12, 3.5 * BEAT, 0.3);
  // soft offbeat chord stabs (beats 2 and 4, slightly rolled)
  for (const at of [BEAT, 3 * BEAT]) tones.forEach((m, k) => mar(v, hz(m), at + k * 0.012, 0.16, 0.09));
  // soft kick on 1 (+3 in A), shaker on 8ths (16ths in B, quieter), offbeats louder
  thud(v, 120, 50, 0, 0.12, 0.3); if (!B) thud(v, 120, 50, 2 * BEAT, 0.12, 0.22);
  const n = B ? 16 : 8, s = BAR / n;
  for (let k = 0; k < n; k++) puff(v, k * s, 0.004, 0.035, (k % 2 ? 0.16 : 0.08) * (B ? 0.75 : 1), 9000, 6000, 0.7, 'highpass');
  // B: a wood tock on the "and" of 4 for a bit of lift
  if (B) fm(v, 900, 3.5 * BEAT, 0.002, 0.05, 0.12, 1.41, 1.4, 0.02);
}

// ---------- the graph (live or offline) ----------
function graph(ctx) {
  const master = ctx.createGain(), sfx = ctx.createGain(), music = ctx.createGain(), night = ctx.createBiquadFilter(), sfxLp = ctx.createBiquadFilter();
  sfx.gain.value = SFX_BUS; music.gain.value = MUSIC_BUS;
  night.type = 'lowpass'; night.frequency.value = DAY_HZ; night.Q.value = 0.5;
  sfxLp.type = 'lowpass'; sfxLp.frequency.value = 7500; sfxLp.Q.value = 0.5; // LPS: takes the edge off bell / FM tops
  sfxLp.connect(sfx); sfx.connect(master); music.connect(night); night.connect(master); master.connect(ctx.destination);
  return { ctx, live: !(ctx instanceof OfflineAudioContext), master, sfx: sfxLp, music, night, busy: [], last: {}, session: null, nextBar: 0, nextT: 0 };
}
/** play one SFX at time t (default now) through the sparse gates; returns its voice gain (for cut) or null */
function play(G, name, t = G.ctx.currentTime, rnd = Math.random) {
  const R = SFX[name]; if (!R) return null;
  if (G.last[name] !== undefined && t - G.last[name] < MIN_GAP) return null;
  G.busy = G.busy.filter((x) => x.end > t);
  if (G.busy.length >= MAX_VOICES) {
    if (!PRIORITY.has(name)) return null;
    const old = G.busy.shift(); old.g.gain.setTargetAtTime(0, t, 0.01); // steal the oldest
  }
  G.last[name] = t;
  const g = G.ctx.createGain(); g.gain.value = Math.pow(10, R.trim / 20); g.connect(G.sfx);
  R.play({ ctx: G.ctx, out: g, t, rnd });
  G.busy.push({ g, end: t + R.dur });
  if (G.live) setTimeout(() => g.disconnect(), (R.dur + 1.5) * 1000);
  return g;
}
function cut(G, g, t = G.ctx.currentTime) { if (g) { g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0, t, 0.012); } }
function musicStart(G, t) {
  musicStop(G, t);
  const s = G.ctx.createGain(); s.gain.setValueAtTime(0, t); s.gain.linearRampToValueAtTime(1, t + 0.4); s.connect(G.music);
  G.session = s; G.nextBar = 0; G.nextT = t + 0.05;
}
function musicStop(G, t, fade = 0.6) {
  const s = G.session; if (!s) return;
  G.session = null;
  s.gain.cancelScheduledValues(t); s.gain.setValueAtTime(s.gain.value, t); s.gain.linearRampToValueAtTime(0, t + fade);
  if (G.live) setTimeout(() => s.disconnect(), (fade + BAR + 3) * 1000); // bars booked ahead still end inside it
}
/** book every bar that starts before `until` */
function musicPump(G, until, rnd = Math.random) {
  if (!G.session) return;
  if (G.nextT < G.ctx.currentTime) G.nextT = G.ctx.currentTime + 0.05; // fell behind (tab was asleep): no pile-up
  while (G.nextT < until) { scheduleBar(G.ctx, G.session, G.nextBar++, G.nextT, rnd); G.nextT += BAR; }
}
function setNight(G, on, t) {
  G.night.frequency.setTargetAtTime(on ? NIGHT_HZ : DAY_HZ, t, 0.8);
  G.music.gain.setTargetAtTime(MUSIC_BUS * (on ? NIGHT_GAIN : 1), t, 0.8);
}

// ---------- live API (main.js) ----------
/** call from a real user gesture only; returns null if WebAudio is missing */
export function createLive(muted) {
  let ctx;
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
  const G = graph(ctx);
  G.master.gain.value = muted ? 0 : 1;
  let night = false;
  const timer = setInterval(() => musicPump(G, ctx.currentTime + 0.3), 50); // wake-up only; notes go on the ctx clock
  let paused = false; // game pause (main.js): stays silent even when the tab comes back
  document.addEventListener('visibilitychange', () => { if (document.hidden) ctx.suspend(); else if (!paused) ctx.resume(); });
  return {
    ctx,
    play: (name) => play(G, name),
    cut: (g) => cut(G, g),
    musicStart: () => { if (ctx.state === 'suspended') ctx.resume(); musicStart(G, ctx.currentTime); musicPump(G, ctx.currentTime + 0.3); },
    musicStop: () => musicStop(G, ctx.currentTime),
    get musicOn() { return !!G.session; },
    setNight: (on) => { if (on !== night) { night = on; setNight(G, on, ctx.currentTime); } },
    setMuted: (m) => G.master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.03),
    setPaused: (p) => { paused = p; if (p) ctx.suspend(); else if (!document.hidden) ctx.resume(); },
    stopTimer: () => clearInterval(timer),
  };
}

// ---------- offline renders (proof wavs) ----------
const SR = 44100;
function seeded(s = 7) { return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
async function render(secs, fill) {
  const ctx = new OfflineAudioContext(1, Math.ceil(secs * SR), SR), G = graph(ctx);
  fill(G, seeded());
  return (await ctx.startRendering()).getChannelData(0);
}
export const TOUR = ['ui', 'jump', 'hop', 'land', 'duck', 'point', 'tier', 'over', 'best'];
/** each SFX once, 0.5 s gaps; returns { data, events: [[name, t, dur]] } */
export async function renderTour() {
  const events = []; let t = 0.3;
  for (const n of TOUR) { events.push([n, t, n === 'hop' ? 0.1 : SFX[n].dur]); t += (n === 'hop' ? 0.1 : SFX[n].dur) + 0.5; }
  const data = await render(t + 0.3, (G, rnd) => {
    for (const [n, at] of events) {
      if (n === 'hop') { const g = play(G, 'jump', at, rnd); cut(G, g, at + 0.06); } // live hop = a jump cut short by the release
      else play(G, n, at, rnd);
    }
  });
  return { data, events };
}
/** one full loop (16 bars, 32 s) of the music bus alone */
export async function renderLoop() {
  return render(BAR * BARS, (G, rnd) => { musicStart(G, 0); G.session.gain.cancelScheduledValues(0); G.session.gain.value = 1; G.nextT = 0; musicPump(G, BAR * BARS - 0.01, rnd); });
}
/** ~20 s of a typical run: music + sfx, night from 12 s, game over at 18 s (new best) */
export async function renderMix() {
  const ev = [[0, 'ui']];
  for (let t = 1.2; t < 17.5; t += 1.15) { const hopT = Math.round(t * 10) % 3 === 0; ev.push([t, hopT ? 'hop' : 'jump'], [t + (hopT ? 0.25 : 0.68), 'land']); }
  ev.push([4.4, 'duck'], [9.7, 'duck'], [14.5, 'duck'], [6.0, 'point'], [11.8, 'point'], [8.0, 'tier'], [17.9, 'over'], [18.9, 'best']);
  ev.sort((a, b) => a[0] - b[0]);
  const data = await render(20.5, (G, rnd) => {
    musicStart(G, 0); musicPump(G, 18, rnd);
    for (const [t, n] of ev) {
      if (n === 'hop') cut(G, play(G, 'jump', t, rnd), t + 0.06); else play(G, n, t, rnd);
      if (n === 'over') musicStop(G, t);
    }
    setNight(G, true, 12);
  });
  return { data, events: ev };
}
