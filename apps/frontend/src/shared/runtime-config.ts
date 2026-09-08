export interface RuntimeConfig {
  apiUrl?: string;
  realtimeUrl?: string;
}

declare global {
  interface Window {
    __TOURNAMENT_HUB_CONFIG__?: RuntimeConfig;
  }
}

function runtimeConfig(): RuntimeConfig {
  return window.__TOURNAMENT_HUB_CONFIG__ ?? {};
}

function publicUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return new URL(value, window.location.origin).toString();
}

export function apiUrl(): string {
  return publicUrl(runtimeConfig().apiUrl ?? import.meta.env.VITE_PUBLIC_API_URL ?? "/api/");
}

export function realtimeUrl(): string {
  return publicUrl(runtimeConfig().realtimeUrl ?? import.meta.env.VITE_PUBLIC_REALTIME_URL ?? "/realtime/");
}
