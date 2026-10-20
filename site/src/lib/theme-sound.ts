// Soft page-turn sound for the theme toggle.
// Tuned values: volume 0.06, softness 100% (lowpass 1800 Hz), room 60%.
let ctx: AudioContext | null = null;
let reverb: ConvolverNode | null = null;

function getCtx(): AudioContext | null {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    // Small-room reverb: 0.6 s decaying stereo noise impulse
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * 0.6);
    const ir = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    reverb = ctx.createConvolver();
    reverb.buffer = ir;
    reverb.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function playThemeSound(toDark: boolean): void {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  try {
    const c = getCtx();
    if (!c || !reverb) return;

    const DUR = 0.4, PEAK = 0.5, GRAIN = 0.03;
    const f1 = toDark ? 1000 : 1400;
    const f2 = toDark ? 2200 : 3000;
    const f3 = toDark ? 1100 : 1600;
    const flapCutoff = toDark ? 320 : 460;

    const t = c.currentTime;
    const sr = c.sampleRate;

    // Rustle: smoothed noise with cosine rise/fall and slow amplitude grain
    const len = Math.floor(sr * DUR);
    const buf = c.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const gs = Math.floor(sr * GRAIN);
    let r = 0.7, rt = 0.7, lp = 0;
    for (let i = 0; i < len; i++) {
      const x = i / len;
      if (i % gs === 0) rt = 0.6 + Math.random() * 0.4;
      r += (rt - r) * 0.0015;
      const rise = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(x / PEAK, 1));
      const fall = x > PEAK ? 0.5 + 0.5 * Math.cos(Math.PI * Math.min((x - PEAK) / (1 - PEAK), 1)) : 1;
      lp += ((Math.random() * 2 - 1) - lp) * 0.5;
      d[i] = lp * rise * fall * r;
    }

    const src = c.createBufferSource();
    src.buffer = buf;

    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 450;

    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.55;
    bp.frequency.setValueAtTime(f1, t);
    bp.frequency.exponentialRampToValueAtTime(f2, t + DUR * PEAK);
    bp.frequency.exponentialRampToValueAtTime(f3, t + DUR);

    const lowpass = c.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.Q.value = 0.5;
    lowpass.frequency.value = 1800;

    const gain = c.createGain();
    gain.gain.value = 0.1344;

    const dry = c.createGain();
    dry.gain.value = 0.7;
    const wet = c.createGain();
    wet.gain.value = 0.6;

    src.connect(hp).connect(bp).connect(lowpass).connect(gain);
    gain.connect(dry).connect(c.destination);
    gain.connect(wet).connect(reverb);
    src.start(t);

    // Soft "flap" when the page lands
    const fl = Math.floor(sr * 0.12);
    const fb = c.createBuffer(1, fl, sr);
    const fd = fb.getChannelData(0);
    for (let i = 0; i < fl; i++) {
      const x = i / fl;
      fd[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * Math.min(x * 4, 1) / 2) * Math.exp(-x * 5);
    }
    const fs = c.createBufferSource();
    fs.buffer = fb;
    const flp = c.createBiquadFilter();
    flp.type = 'lowpass';
    flp.frequency.value = flapCutoff;
    const fg = c.createGain();
    fg.gain.value = 0.0588;
    fs.connect(flp).connect(fg);
    fg.connect(dry);
    fg.connect(wet);
    fs.start(t + DUR * PEAK);
  } catch {
    // Sound is decorative — fail silently
  }
}
