// Shim browser globals for SSR (Next.js 16 references them in internal code)
const BASE = "http://localhost:3000";
const url = new URL(BASE);

if (typeof globalThis.location === "undefined") {
  Object.defineProperty(globalThis, "location", {
    get() {
      return url;
    },
    configurable: true,
    enumerable: true,
  });
}

if (typeof globalThis.window === "undefined") {
  // Create a minimal window-like object to satisfy SSR
  const win = Object.create(null);
  win.location = url;
  win.window = win;
  win.self = win;
  win.document = {};
  win.addEventListener = () => {};
  win.removeEventListener = () => {};
  win.dispatchEvent = () => {};
  win.setTimeout = setTimeout;
  win.clearTimeout = clearTimeout;
  win.setInterval = setInterval;
  win.clearInterval = clearInterval;
  globalThis.window = win;
}

if (typeof globalThis.document === "undefined") {
  globalThis.document = {
    createElement: () => ({}),
    documentElement: { style: {} },
    head: { appendChild: () => {}, removeChild: () => {} },
    body: { appendChild: () => {}, removeChild: () => {} },
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}
