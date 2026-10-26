export type CaptureScrollPolicy = { maxScreens: number; maxSeconds: number };
export const DEFAULT_CAPTURE_SCROLL_POLICY: Readonly<CaptureScrollPolicy> = Object.freeze({ maxScreens: 8, maxSeconds: 15 });

export function normalizeCaptureScrollPolicy(value?: Partial<CaptureScrollPolicy>): CaptureScrollPolicy {
  const bounded = (value: unknown, fallback: number, maximum: number) =>
    typeof value === 'number' && Number.isFinite(value)
      ? Math.max(1, Math.min(maximum, Math.round(value))) : fallback;
  return { maxScreens: bounded(value?.maxScreens, 8, 100), maxSeconds: bounded(value?.maxSeconds, 15, 120) };
}
