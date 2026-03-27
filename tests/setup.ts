import '@testing-library/jest-dom/vitest';

// Mock Next.js modules
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<any>) => {
    const Component = (props: any) => null;
    Component.displayName = 'DynamicComponent';
    return Component;
  },
}));

// Mock EventSource for SSE tests
class MockEventSource {
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;
  readyState = 0;
  close = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn();
  CONNECTING = 0;
  OPEN = 1;
  CLOSED = 2;
  withCredentials = false;

  constructor(url: string) {
    this.url = url;
    this.readyState = 1;
  }
}

(globalThis as any).EventSource = MockEventSource;

// Mock fetch — save original for live integration tests
(globalThis as any).__REAL_FETCH__ = globalThis.fetch;
globalThis.fetch = vi.fn();
