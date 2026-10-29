/* ---------- musique de fond WebAudio (pop-house entraînante) ----------
 * Une seule fonction, partagée par les 4 capsules, déterministe (graine fixe), libre de droits.
 * La mineur, 120 BPM (1 mesure = 2 s), un accord par mesure : Am – F – C – G (boucle de 8 s).
 * Couches : grosse caisse 4 temps, clap sur 2 et 4, charleston sur les contretemps,
 * basse en contretemps, nappe « supersaw » avec effet de pompage (sidechain),
 * refrain pluck syncopé avec écho en croche pointée.
 * Structure : intro filtrée 4 s avec montée, groove complet, pause courte vers le milieu
 * (sans grosse caisse, avec montée), retour du groove, fondu de sortie 2,5 s.
 * Fonctionne aussi avec un OfflineAudioContext (dest = ac.destination). */
function makeAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ac = new AC({ sampleRate: 48000 });
  const dest = ac.createMediaStreamDestination();
  return { ac, dest };
}
function scheduleAudio(ac, dest, dur, lead) {
  const T0 = ac.currentTime + lead, END = T0 + dur;
  const BEAT = 0.5, BAR = 2, S8 = BEAT / 2;                     // 120 BPM
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  let seed = 20261029;
  const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };

  // repères de structure (en secondes depuis T0), alignés sur les mesures
  const INTRO = 4;                                              // 2 mesures filtrées
  const BRK0 = Math.round((dur * 0.5) / BAR) * BAR, BRK1 = BRK0 + 4;  // pause de 2 mesures au milieu
  const OUT = dur - 2.5;
  const inBreak = t => t >= BRK0 && t < BRK1;
  const drums = t => t >= INTRO && !inBreak(t) && t < dur - 1;

  // ---- sortie : bus -> passe-haut 30 Hz -> compresseur -> volume général -> dest
  const master = ac.createGain();
  const LVL = 0.75;
  master.gain.setValueAtTime(0, T0);
  master.gain.linearRampToValueAtTime(LVL, T0 + 0.6);
  master.gain.setValueAtTime(LVL, T0 + OUT);
  master.gain.linearRampToValueAtTime(0, END);
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 6; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.15;
  const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 30;
  const bus = ac.createGain();
  bus.connect(hp); hp.connect(comp); comp.connect(master); master.connect(dest);

  // ---- bruit blanc partagé (charleston, clap, montées)
  const nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  { const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; }
  const noise = (t, len) => { const s = ac.createBufferSource(); s.buffer = nb; s.start(t, rnd() * 0.5); s.stop(t + len); return s; };

  // ---- filtre d'ensemble de la musique (intro fermée puis ouverture, pause légèrement fermée)
  const musLp = ac.createBiquadFilter(); musLp.type = 'lowpass'; musLp.Q.value = 0.9;
  musLp.frequency.setValueAtTime(500, T0);
  musLp.frequency.exponentialRampToValueAtTime(16000, T0 + INTRO);
  musLp.frequency.setValueAtTime(16000, T0 + BRK0);
  musLp.frequency.exponentialRampToValueAtTime(1400, T0 + BRK0 + 0.5);
  musLp.frequency.setValueAtTime(1400, T0 + BRK1 - 2);
  musLp.frequency.exponentialRampToValueAtTime(16000, T0 + BRK1);
  musLp.connect(bus);

  // ---- pompage (sidechain) : la nappe et la basse s'effacent à chaque grosse caisse
  const duck = ac.createGain(); duck.gain.setValueAtTime(1, T0); duck.connect(musLp);
  // ---- écho en croche pointée pour le refrain
  const dly = ac.createDelay(1); dly.delayTime.value = 0.375;
  const fb = ac.createGain(); fb.gain.value = 0.32;
  const dTone = ac.createBiquadFilter(); dTone.type = 'lowpass'; dTone.frequency.value = 3500;
  const dWet = ac.createGain(); dWet.gain.value = 0.3;
  dly.connect(dTone); dTone.connect(fb); fb.connect(dly); dTone.connect(dWet); dWet.connect(musLp);
  const leadBus = ac.createGain(); leadBus.gain.value = 1; leadBus.connect(musLp); leadBus.connect(dly);

  const CH = [                                                  // basse, accord, notes du refrain
    { b: 33, pad: [57, 60, 64, 69], hook: [76, 81, 79, 76, 72] },   // Am
    { b: 29, pad: [57, 60, 65, 69], hook: [77, 81, 79, 77, 72] },   // F
    { b: 36, pad: [55, 60, 64, 67], hook: [76, 79, 84, 79, 76] },   // C
    { b: 31, pad: [55, 59, 62, 67], hook: [74, 79, 83, 81, 79] }    // G
  ];
  const HOOK_STEPS = [0, 2, 3, 5, 6];                           // croches syncopées (sur 8 par mesure)
  const nBars = Math.ceil(dur / BAR);

  for (let k = 0; k < nBars; k++) {
    const P = CH[k % 4], b0 = k * BAR, t0 = T0 + b0;
    // nappe supersaw : 3 dents de scie désaccordées par note
    { const g = ac.createGain();
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.022, t0 + 0.04);
      g.gain.setValueAtTime(0.022, t0 + BAR - 0.08); g.gain.linearRampToValueAtTime(0, t0 + BAR + 0.02);
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 0.5;
      g.connect(lp); lp.connect(duck);
      P.pad.forEach(m => [-12, 0, 12].forEach(det => {
        const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = det + (rnd() - 0.5) * 3;
        o.connect(g); o.start(t0); o.stop(t0 + BAR + 0.05);
      })); }
    for (let s = 0; s < 8; s++) {
      const rel = b0 + s * S8, t = T0 + rel;
      if (t > END) break;
      // basse en contretemps (sur les « et »), plus une note sur le 1 en pause
      if (s % 2 === 1 || (inBreak(rel) && s === 0)) {
        const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(P.b + 12);
        const o2 = ac.createOscillator(); o2.type = 'sine'; o2.frequency.value = hz(P.b);
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 6;
        lp.frequency.setValueAtTime(1400, t); lp.frequency.exponentialRampToValueAtTime(220, t + 0.18);
        const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.008);
        g.gain.setTargetAtTime(0, t + 0.12, 0.05);
        o.connect(lp); lp.connect(g); o2.connect(g); g.connect(duck);
        [o, o2].forEach(x => { x.start(t); x.stop(t + 0.4); });
      }
      if (drums(rel)) {
        // grosse caisse sur chaque temps + pompage
        if (s % 2 === 0) {
          const o = ac.createOscillator(); o.type = 'sine';
          o.frequency.setValueAtTime(155, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.11);
          const g = ac.createGain(); g.gain.setValueAtTime(1.0, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
          o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.4);
          duck.gain.setValueAtTime(0.22, t); duck.gain.linearRampToValueAtTime(1, t + 0.36);
        }
        // clap sur 2 et 4 (trois éclats rapprochés)
        if (s === 2 || s === 6) {
          const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 1.2;
          const g = ac.createGain(); g.gain.setValueAtTime(0, t);
          [0, 0.011, 0.022].forEach(d => { g.gain.setValueAtTime(0.45, t + d); g.gain.setTargetAtTime(0.05, t + d + 0.002, 0.004); });
          g.gain.setValueAtTime(0.3, t + 0.03); g.gain.setTargetAtTime(0, t + 0.03, 0.06);
          noise(t, 0.35).connect(bp); bp.connect(g); g.connect(bus);
        }
      }
      // charleston : contretemps dès l'intro (doux), aussi pendant la pause
      if (s % 2 === 1 && rel >= 2 && rel < dur - 1) {
        const hpf = ac.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 8000;
        const g = ac.createGain(); const pk = rel < INTRO ? 0.07 : 0.13;
        g.gain.setValueAtTime(pk, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        noise(t, 0.08).connect(hpf); hpf.connect(g); g.connect(bus);
      }
    }
    // refrain pluck syncopé : chaque mesure, motif identique qui suit l'accord
    HOOK_STEPS.forEach((st, i) => {
      const t = t0 + st * S8;
      if (t > T0 + OUT) return;
      const m = P.hook[i];
      const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.085, t + 0.004);
      g.gain.setTargetAtTime(0, t + 0.004, 0.09);
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3;
      lp.frequency.setValueAtTime(5200, t); lp.frequency.exponentialRampToValueAtTime(900, t + 0.2);
      [['square', 0, 0.5], ['sawtooth', 7, 0.5], ['sine', 1200, 0.25]].forEach(([type, det, lv]) => {
        const o = ac.createOscillator(); o.type = type; o.frequency.value = hz(m); o.detune.value = det;
        const og = ac.createGain(); og.gain.value = lv; o.connect(og); og.connect(lp);
        o.start(t); o.stop(t + 0.7);
      });
      lp.connect(g); g.connect(leadBus);
    });
  }

  // ---- montées de bruit avant l'arrivée du groove et avant le retour après la pause
  [[INTRO - 2, INTRO], [BRK1 - 2, BRK1]].forEach(([a, b]) => {
    const t = T0 + a, len = b - a;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2;
    bp.frequency.setValueAtTime(600, t); bp.frequency.exponentialRampToValueAtTime(9000, t + len);
    const g = ac.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(0.18, t + len - 0.02);
    g.gain.linearRampToValueAtTime(0, t + len);
    const s = ac.createBufferSource(); s.buffer = nb; s.loop = true; s.start(t); s.stop(t + len);
    s.connect(bp); bp.connect(g); g.connect(bus);
  });
}

