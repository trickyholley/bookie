import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement ResizeObserver; the shadcn Command component (used
// by the user combobox) relies on it, so any test rendering it needs a stub.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// jsdom also doesn't implement scrollIntoView, which cmdk calls when
// highlighting items.
Element.prototype.scrollIntoView ??= () => {};
