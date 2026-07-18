/** Tiny WebAudio beeps — original SFX, no ripped samples. */
export class Sfx {
  private ctx: AudioContext | null = null

  private ensure() {
    if (!this.ctx) this.ctx = new AudioContext()
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain = 0.04) {
    const ctx = this.ensure()
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    g.gain.value = gain
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    osc.connect(g)
    g.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + dur)
  }

  shoot() {
    this.tone(880, 0.07, 'square', 0.03)
    this.tone(1320, 0.05, 'triangle', 0.02)
  }

  hit() {
    this.tone(220, 0.12, 'sawtooth', 0.05)
  }

  boom() {
    this.tone(90, 0.28, 'sawtooth', 0.06)
    this.tone(60, 0.35, 'square', 0.04)
  }

  ring() {
    this.tone(660, 0.1, 'sine', 0.04)
    this.tone(990, 0.12, 'sine', 0.03)
  }

  roll() {
    this.tone(400, 0.15, 'triangle', 0.035)
  }

  hurt() {
    this.tone(140, 0.2, 'sawtooth', 0.05)
  }

  win() {
    ;[523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.18, 'triangle', 0.04), i * 90)
    })
  }
}
