export type KeyState = Record<string, boolean>

export class Input {
  keys: KeyState = {}
  private boundDown: (e: KeyboardEvent) => void
  private boundUp: (e: KeyboardEvent) => void

  constructor() {
    this.boundDown = (e) => {
      this.keys[e.code] = true
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault()
      }
    }
    this.boundUp = (e) => {
      this.keys[e.code] = false
    }
    window.addEventListener('keydown', this.boundDown)
    window.addEventListener('keyup', this.boundUp)
  }

  down(code: string) {
    return !!this.keys[code]
  }

  dispose() {
    window.removeEventListener('keydown', this.boundDown)
    window.removeEventListener('keyup', this.boundUp)
  }
}
