class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainVal = 0.14,
    delay = 0,
    endFreq?: number,
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(40, endFreq),
        now + duration,
      );
    }
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playJump(): void {
    this.playTone(280, 0.16, 'triangle', 0.14, 0, 560);
  }

  public playLand(): void {
    this.playTone(150, 0.08, 'sine', 0.09, 0, 95);
  }

  public playCorrect(): void {
    this.playTone(523.25, 0.13, 'triangle', 0.15, 0);
    this.playTone(659.25, 0.14, 'triangle', 0.15, 0.08);
    this.playTone(783.99, 0.22, 'triangle', 0.16, 0.16);
  }

  public playWrong(): void {
    this.playTone(240, 0.16, 'sawtooth', 0.1, 0, 170);
    this.playTone(175, 0.22, 'sawtooth', 0.1, 0.12, 110);
  }

  public playFall(): void {
    this.playTone(420, 0.32, 'sine', 0.12, 0, 140);
  }

  public playCheckpoint(): void {
    this.playTone(523.25, 0.12, 'triangle', 0.14, 0);
    this.playTone(659.25, 0.12, 'triangle', 0.14, 0.09);
    this.playTone(783.99, 0.12, 'triangle', 0.14, 0.18);
    this.playTone(1046.5, 0.3, 'triangle', 0.16, 0.27);
  }

  public playFinishFanfare(): void {
    const notes = [
      { f: 523.25, t: 0, d: 0.14 },
      { f: 659.25, t: 0.11, d: 0.14 },
      { f: 783.99, t: 0.22, d: 0.14 },
      { f: 1046.5, t: 0.34, d: 0.22 },
      { f: 783.99, t: 0.52, d: 0.12 },
      { f: 1046.5, t: 0.65, d: 0.45 },
    ];
    for (const n of notes) {
      this.playTone(n.f, n.d, 'triangle', 0.16, n.t);
    }
  }
}

export const soundEngine = new SoundEngine();
