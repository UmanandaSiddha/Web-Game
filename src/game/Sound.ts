// Procedural sound effects via the Web Audio API — no asset files, tiny, reliable.
// Each effect is synthesised from oscillators + noise with short envelopes.

type Sound =
  | "whoosh"
  | "hit"
  | "kick"
  | "block"
  | "fireball"
  | "jump"
  | "ko"
  | "fight"
  | "win"
  | "ui";

class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  enabled = true;

  private ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    // 1s of white noise, reused for all percussive effects
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
  }

  /** Must be called from a user gesture (e.g. the FIGHT button) to unlock audio. */
  resume() {
    this.ensure();
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
  }

  private burst(dur: number, freq: number, type: OscillatorType, gain: number, slideTo?: number) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noiseHit(dur: number, gain: number, hp = 300, lp = 6000) {
    if (!this.ctx || !this.master || !this.noise) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const hpf = this.ctx.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.value = hp;
    const lpf = this.ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = lp;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(hpf).connect(lpf).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  play(name: Sound) {
    if (!this.enabled) return;
    this.ensure();
    if (!this.ctx) return;
    switch (name) {
      case "whoosh":
        this.noiseHit(0.16, 0.18, 700, 2200);
        break;
      case "hit":
        this.noiseHit(0.12, 0.5, 250, 5000);
        this.burst(0.14, 160, "sine", 0.5, 60);
        break;
      case "kick":
        this.noiseHit(0.14, 0.45, 120, 3500);
        this.burst(0.2, 110, "sine", 0.6, 45);
        break;
      case "block":
        this.noiseHit(0.07, 0.3, 1200, 8000);
        this.burst(0.08, 320, "square", 0.12, 220);
        break;
      case "fireball":
        this.burst(0.45, 420, "sawtooth", 0.32, 90);
        this.noiseHit(0.4, 0.18, 200, 1800);
        break;
      case "jump":
        this.burst(0.18, 240, "triangle", 0.22, 520);
        break;
      case "ko":
        this.burst(0.7, 140, "sine", 0.7, 40);
        this.noiseHit(0.5, 0.35, 80, 1200);
        break;
      case "fight":
        this.burst(0.18, 880, "square", 0.28);
        this.burst(0.35, 1320, "square", 0.24);
        break;
      case "win":
        [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.burst(0.22, f, "triangle", 0.26), i * 110));
        break;
      case "ui":
        this.burst(0.06, 660, "triangle", 0.18, 880);
        break;
    }
  }
}

export const sfx = new Sfx();
