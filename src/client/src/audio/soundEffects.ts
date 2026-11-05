class SoundManager {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  private isUnlocked: boolean = false;
  private lastBooingTime: number = 0;

  constructor() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('poker_remi_sound');
      if (saved !== null) {
        this.enabled = saved === 'true';
      }
    }

    // Auto unlock AudioContext on first user interaction
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.initContext();
        if (this.ctx && this.ctx.state === 'running') {
          this.isUnlocked = true;
          window.removeEventListener('click', unlockAudio);
          window.removeEventListener('pointerdown', unlockAudio);
          window.removeEventListener('keydown', unlockAudio);
          window.removeEventListener('touchstart', unlockAudio);
        }
      };
      window.addEventListener('click', unlockAudio, { passive: true });
      window.addEventListener('pointerdown', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
    }
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem('poker_remi_sound', String(this.enabled));
    }
    if (this.enabled) {
      this.initContext();
    }
    return this.enabled;
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Card slide / deal sound
  public playDeal(): void {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  // Tactile card select / deselect sound (flick / tap)
  public playCardSelect(): void {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.04);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  // Regular card play snap (crisp slap on felt table)
  public playCardSnap(): void {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Body of the snap
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.1);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);

    // High transient click
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(1200, now);
    clickOsc.frequency.exponentialRampToValueAtTime(200, now + 0.03);

    clickGain.gain.setValueAtTime(0.25, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    clickOsc.connect(clickGain);
    clickGain.connect(this.ctx.destination);

    clickOsc.start(now);
    clickOsc.stop(now + 0.03);
  }

  // TRIS! Special sound for Kembar Tiga (three of a kind)
  public playTrisSound(): void {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Three rapid punchy taps (tok-tok-tok)
    [0, 0.06, 0.12].forEach((offset, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320 + idx * 80, now + offset);
      osc.frequency.exponentialRampToValueAtTime(120, now + offset + 0.07);

      gain.gain.setValueAtTime(0.28, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.07);
    });

    // Ascending brassy chord accent
    const chordNotes = [392.00, 493.88, 587.33]; // G4, B4, D5 (Major chord)
    chordNotes.forEach((freq) => {
      const chordOsc = this.ctx!.createOscillator();
      const chordGain = this.ctx!.createGain();
      chordOsc.type = 'sawtooth';
      chordOsc.frequency.setValueAtTime(freq, now + 0.16);

      chordGain.gain.setValueAtTime(0.12, now + 0.16);
      chordGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      chordOsc.connect(chordGain);
      chordGain.connect(this.ctx!.destination);

      chordOsc.start(now + 0.16);
      chordOsc.stop(now + 0.45);
    });
  }

  // "BANTING!" Heavy impact slam for Poker (2), Bong, or Full House
  public playBantingSlam(): void {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Deep sub-bass boom
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(260, now);
    subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.4);

    subGain.gain.setValueAtTime(0.5, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);

    subOsc.start(now);
    subOsc.stop(now + 0.4);

    // Sharp impact crack
    const crackOsc = this.ctx.createOscillator();
    const crackGain = this.ctx.createGain();
    crackOsc.type = 'triangle';
    crackOsc.frequency.setValueAtTime(800, now);
    crackOsc.frequency.exponentialRampToValueAtTime(90, now + 0.09);

    crackGain.gain.setValueAtTime(0.4, now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    crackOsc.connect(crackGain);
    crackGain.connect(this.ctx.destination);

    crackOsc.start(now);
    crackOsc.stop(now + 0.09);
  }

  // Authentic "LEWAT" / Pass sound (double felt knock "tok-tok" + subtle skip whoosh)
  public playPass(): void {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 1. Skip whoosh swoosh
    const whooshOsc = this.ctx.createOscillator();
    const whooshGain = this.ctx.createGain();
    whooshOsc.type = 'sine';
    whooshOsc.frequency.setValueAtTime(360, now);
    whooshOsc.frequency.exponentialRampToValueAtTime(160, now + 0.18);

    whooshGain.gain.setValueAtTime(0.18, now);
    whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    whooshOsc.connect(whooshGain);
    whooshGain.connect(this.ctx.destination);

    whooshOsc.start(now);
    whooshOsc.stop(now + 0.18);

    // 2. Realistic double table knock (knocking on felt like real poker pass)
    [0.04, 0.14].forEach((offset) => {
      const knockOsc = this.ctx!.createOscillator();
      const knockGain = this.ctx!.createGain();
      knockOsc.type = 'triangle';
      knockOsc.frequency.setValueAtTime(220, now + offset);
      knockOsc.frequency.exponentialRampToValueAtTime(65, now + offset + 0.06);

      knockGain.gain.setValueAtTime(0.35, now + offset);
      knockGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.06);

      knockOsc.connect(knockGain);
      knockGain.connect(this.ctx!.destination);

      knockOsc.start(now + offset);
      knockOsc.stop(now + offset + 0.06);
    });
  }

  // Control resumed chime (when human takes back control from AFK bot)
  public playResumeControl(): void {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const startTime = now + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.22, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  }

  // Melodic turn notification chime ("ding-dong") when it becomes player's turn
  public playTurnAlert(): void {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [659.25, 880.00]; // E5, A5
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const startTime = now + idx * 0.1;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.28);
    });
  }

  // Timer countdown warning tick (when <= 5s)
  public playTimerWarning(): void {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(750, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  // Clean-table sweep sound (when all opponents pass and trick is won)
  public playTrickWon(): void {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Upward clean sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.25);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);

    // Chime sparkle
    const chime = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();
    chime.type = 'triangle';
    chime.frequency.setValueAtTime(1046.50, now + 0.18); // C6

    chimeGain.gain.setValueAtTime(0.2, now + 0.18);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    chime.connect(chimeGain);
    chimeGain.connect(this.ctx.destination);

    chime.start(now + 0.18);
    chime.stop(now + 0.45);
  }

  // Generic subtle UI button click
  public playButtonClick(): void {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(250, now + 0.03);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  // Error buzzer / invalid move thud
  public playError(): void {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Victory Fanfare
  public playWinFanfare(): void {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C4, E4, G4, C5, E5, G5
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const startTime = this.ctx!.currentTime + idx * 0.1;
      const duration = 0.35;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }

  // Booing sound effect ("Huuuuuu!") when a player holds a poker card (rank 2) at game end
  public playBooingSound(): void {
    if (!this.enabled) return;
    const nowMs = Date.now();
    if (nowMs - this.lastBooingTime < 1000) return; // Prevent concurrent overlapping playback
    this.lastBooingTime = nowMs;

    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const duration = 2.4;

      // Master Gain envelope
      const masterGain = this.ctx.createGain();
      masterGain.gain.setValueAtTime(0.001, now);
      masterGain.gain.linearRampToValueAtTime(0.45, now + 0.35);
      masterGain.gain.setValueAtTime(0.45, now + duration - 0.7);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      masterGain.connect(this.ctx.destination);

      // Primary Formant Filter for vowel "U" ("Huuuu")
      const formant1 = this.ctx.createBiquadFilter();
      formant1.type = 'bandpass';
      formant1.frequency.setValueAtTime(400, now);
      formant1.frequency.exponentialRampToValueAtTime(300, now + duration);
      formant1.Q.setValueAtTime(3.5, now);
      formant1.connect(masterGain);

      // Secondary Formant Filter for mid-range vocal harmonics
      const formant2 = this.ctx.createBiquadFilter();
      formant2.type = 'bandpass';
      formant2.frequency.setValueAtTime(850, now);
      formant2.frequency.exponentialRampToValueAtTime(700, now + duration);
      formant2.Q.setValueAtTime(2.6, now);
      const f2Gain = this.ctx.createGain();
      f2Gain.gain.setValueAtTime(0.3, now);
      f2Gain.connect(masterGain);
      formant2.connect(f2Gain);

      // Detuned chorus of crowd voices with downward pitch inflection
      const voiceFreqs = [165, 178, 195, 142];
      const types: OscillatorType[] = ['sawtooth', 'triangle', 'sawtooth', 'sine'];

      voiceFreqs.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const vGain = this.ctx!.createGain();
        osc.type = types[i];
        osc.frequency.setValueAtTime(freq, now);
        // Downward slide typical of booing
        osc.frequency.exponentialRampToValueAtTime(freq * 0.72, now + duration);

        vGain.gain.setValueAtTime(0.24, now);
        osc.connect(vGain);
        vGain.connect(formant1);
        vGain.connect(formant2);

        osc.start(now);
        osc.stop(now + duration);
      });

      // Filtered crowd breath / noise layer
      const sampleRate = this.ctx.sampleRate;
      const bufferSize = Math.floor(sampleRate * duration);
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(450, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(320, now + duration);
      noiseFilter.Q.setValueAtTime(3.8, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.001, now);
      noiseGain.gain.linearRampToValueAtTime(0.12, now + 0.3);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);

      noiseSource.start(now);
      noiseSource.stop(now + duration);
    } catch (e) {
      // Audio fallback safety
    }

    // Voice vocalization overlay if browser SpeechSynthesis is available
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance('Huuuuuu!');
        utterance.pitch = 0.5;
        utterance.rate = 0.75;
        utterance.volume = 0.9;
        utterance.lang = 'id-ID';
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        // Ignore if blocked or unavailable
      }
    }
  }
}

export const sounds = new SoundManager();
