import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

// @ts-expect-error -- polyfill ResizeObserver in jsdom for component tests
globalThis.ResizeObserver = ResizeObserverMock;
