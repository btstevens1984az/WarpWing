export {}

declare global {
  interface Window {
    warpwing?: {
      prepareCapture: () => void
    }
  }
}
