declare global {
  interface Window {
    umami?: Umami;
  }

  interface Umami {
    track(
      event:
        | string
        | Record<string, unknown>
        | ((data: Record<string, unknown>) => Record<string, unknown>),
      payload?: Record<string, unknown>
    ): void;

    identify(data: Record<string, unknown>): void;
  }
}

export {};
