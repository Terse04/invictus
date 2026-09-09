import { loadSettings } from '../../utils/storage';

export class SoundManager {
  private static instance: SoundManager;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;

  private isBgmPlaying = false;
  private bgmInterval: number | null = null;
  private bgmMode: 'ambient' | 'combat' | 'boss' = 'ambient';
  private stepCount = 0;

  private masterVol = 0.8;
  private sfxVol = 0.85;
  private bgmVol = 0.7;

  private constructor() {
    const settings = loadSettings();
    this.masterVol = settings.masterVolume;
    this.sfxVol = settings.sfxVolume;
    this.bgmVol = settings.bgmVolume;
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVol, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVol, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(this.bgmVol, this.ctx.currentTime);
      this.bgmGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolumes(master: number, sfx: number, bgm: number) {
    this.masterVol = master;
    this.sfxVol = sfx;
    this.bgmVol = bgm;

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(master, this.ctx.currentTime);
    }
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(sfx, this.ctx.currentTime);
    }
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(bgm, this.ctx.currentTime);
    }
  }

  // --- SOUND EFFECTS ---

  public playFootstep() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(160, now);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playSlash(comboIndex: number = 0) {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Filtered noise swoosh + resonant pitch
    const bufferSize = this.ctx.sampleRate * 0.18;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    const baseFreq = 800 + comboIndex * 250;
    filter.frequency.setValueAtTime(baseFreq, now);
    filter.frequency.exponentialRampToValueAtTime(baseFreq * 2.2, now + 0.15);
    filter.Q.setValueAtTime(4, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + 0.18);

    // Subtle energy tone
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 0.7, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.4, now + 0.12);

    oscGain.gain.setValueAtTime(0.2, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playHit(isCrit = false) {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Metallic impact
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = isCrit ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(isCrit ? 440 : 280, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.14);

    gain.gain.setValueAtTime(isCrit ? 0.45 : 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);

    // Noise crack
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.08, this.ctx.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const nFilter = this.ctx.createBiquadFilter();
    nFilter.type = 'highpass';
    nFilter.frequency.setValueAtTime(isCrit ? 1800 : 1200, now);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(isCrit ? 0.4 : 0.25, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.08);
  }

  public playDodge() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playCharge() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.6);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.6);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.6);
  }

  public playHeavyRelease() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Sub thump
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(140, now);
    sub.frequency.exponentialRampToValueAtTime(25, now + 0.35);
    subGain.gain.setValueAtTime(0.5, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(now);
    sub.stop(now + 0.35);

    // Energy wave release
    const saw = this.ctx.createOscillator();
    const sawGain = this.ctx.createGain();
    saw.type = 'sawtooth';
    saw.frequency.setValueAtTime(700, now);
    saw.frequency.exponentialRampToValueAtTime(120, now + 0.25);
    sawGain.gain.setValueAtTime(0.3, now);
    sawGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    saw.connect(sawGain);
    sawGain.connect(this.sfxGain);
    saw.start(now);
    saw.stop(now + 0.25);
  }

  public playAbilityWave() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(960, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.4);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.2);
    filter.Q.setValueAtTime(5, now);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  public playUltimateFinisher() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Time freeze chime sequence
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C, E, G, High C
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.6);
    });

    // Massive celestial slash explosion
    const boomNow = now + 0.4;
    const boom = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boom.type = 'triangle';
    boom.frequency.setValueAtTime(200, boomNow);
    boom.frequency.exponentialRampToValueAtTime(30, boomNow + 0.8);

    boomGain.gain.setValueAtTime(0.6, boomNow);
    boomGain.gain.exponentialRampToValueAtTime(0.001, boomNow + 0.8);

    boom.connect(boomGain);
    boomGain.connect(this.sfxGain);
    boom.start(boomNow);
    boom.stop(boomNow + 0.8);
  }

  public playEnemyRoar() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.35);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playBossRoar() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'square';

    osc1.frequency.setValueAtTime(90, now);
    osc1.frequency.linearRampToValueAtTime(45, now + 0.8);

    osc2.frequency.setValueAtTime(94, now);
    osc2.frequency.linearRampToValueAtTime(47, now + 0.8);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.9);
    osc2.stop(now + 0.9);
  }

  public playBossBeamCharge() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 1.2);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 1.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 1.2);
  }

  public playBossBeamFire() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 1.5);
  }

  public playUIClick() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.04);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playDialogueBeep() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520 + Math.random() * 80, now);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  public playVictoryFanfare() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const chords = [
      [293.66, 369.99, 440.0],  // D, F#, A
      [329.63, 415.30, 493.88], // E, G#, B
      [440.0, 554.37, 659.25],  // A, C#, E
      [587.33, 739.99, 880.0]   // High D, F#, A
    ];

    chords.forEach((chord, step) => {
      chord.forEach(freq => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + step * 0.28);

        gain.gain.setValueAtTime(0, now + step * 0.28);
        gain.gain.linearRampToValueAtTime(0.18, now + step * 0.28 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + step * 0.28 + 0.8);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + step * 0.28);
        osc.stop(now + step * 0.28 + 0.85);
      });
    });
  }

  // --- PROCEDURAL DYNAMIC MUSIC ---

  public startBGM(mode: 'ambient' | 'combat' | 'boss' = 'ambient') {
    this.bgmMode = mode;
    if (this.isBgmPlaying) return;
    this.initCtx();
    this.isBgmPlaying = true;

    // Pentatonic scale frequencies in Chinese D Yu mode: D, F, G, A, C
    const scale = [146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 349.23, 392.0, 440.0, 523.25];

    const stepInterval = 280; // ~107 BPM base step
    this.bgmInterval = window.setInterval(() => {
      if (!this.ctx || !this.bgmGain || !this.isBgmPlaying) return;
      const now = this.ctx.currentTime;
      this.stepCount++;

      // Drone / Sub Pulse (every 4 steps)
      if (this.stepCount % 4 === 0) {
        const drone = this.ctx.createOscillator();
        const dGain = this.ctx.createGain();
        drone.type = 'sawtooth';
        const rootFreq = this.bgmMode === 'boss' ? 55 : (this.bgmMode === 'combat' ? 65.41 : 73.42); // A1 / C2 / D2
        drone.frequency.setValueAtTime(rootFreq, now);

        const dFilter = this.ctx.createBiquadFilter();
        dFilter.type = 'lowpass';
        dFilter.frequency.setValueAtTime(this.bgmMode === 'ambient' ? 120 : 260, now);

        dGain.gain.setValueAtTime(0.12, now);
        dGain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

        drone.connect(dFilter);
        dFilter.connect(dGain);
        dGain.connect(this.bgmGain);
        drone.start(now);
        drone.stop(now + 1.1);
      }

      // Melodic Plucks (Guzheng/Pipa style pentatonic notes)
      const shouldPlayMelody = this.bgmMode === 'ambient' ? (Math.random() > 0.4) : (this.stepCount % 2 === 0);
      if (shouldPlayMelody) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const randomNote = scale[Math.floor(Math.random() * scale.length)];

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(randomNote, now);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (this.bgmMode === 'ambient' ? 0.8 : 0.35));

        osc.connect(gain);
        gain.connect(this.bgmGain);
        osc.start(now);
        osc.stop(now + 0.85);
      }

      // Percussive Synth Ticks (active in combat & boss)
      if (this.bgmMode !== 'ambient') {
        const tickOsc = this.ctx.createOscillator();
        const tickGain = this.ctx.createGain();
        tickOsc.type = 'square';
        tickOsc.frequency.setValueAtTime(this.stepCount % 4 === 0 ? 120 : 40, now);
        tickGain.gain.setValueAtTime(0.06, now);
        tickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        tickOsc.connect(tickGain);
        tickGain.connect(this.bgmGain);
        tickOsc.start(now);
        tickOsc.stop(now + 0.05);
      }
    }, stepInterval);
  }

  public setBgmMode(mode: 'ambient' | 'combat' | 'boss') {
    this.bgmMode = mode;
  }

  public stopBGM() {
    this.isBgmPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}
