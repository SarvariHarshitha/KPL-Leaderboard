import '@testing-library/jest-dom/vitest'

// JSDOM doesn't include structuredClone in some environments.
if (!globalThis.structuredClone) {
  globalThis.structuredClone = (obj) => JSON.parse(JSON.stringify(obj))
}
