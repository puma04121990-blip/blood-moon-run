/**
 * VK Bridge wrapper for Mini Apps / Games.
 * Safe no-op + localStorage fallback outside VK WebView.
 */
import bridge from '@vkontakte/vk-bridge';

let initialized = false;
let inVk = false;

export interface LaunchParams {
  userId: number | null;
  appId: number | null;
  platform: string | null;
  isDev: boolean;
  raw: Record<string, string>;
}

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

let launchParams: LaunchParams = {
  userId: null,
  appId: null,
  platform: null,
  isDev: true,
  raw: {},
};

let safeArea: SafeAreaInsets = { top: 0, bottom: 0, left: 0, right: 0 };

function parseQuery(): Record<string, string> {
  const out: Record<string, string> = {};
  const q = window.location.search.replace(/^\?/, '');
  if (!q) return out;
  for (const part of q.split('&')) {
    const [k, v] = part.split('=');
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v || '');
  }
  return out;
}

function applySafeAreaCss(insets: SafeAreaInsets): void {
  const root = document.documentElement;
  root.style.setProperty('--safe-top', `${insets.top}px`);
  root.style.setProperty('--safe-bottom', `${insets.bottom}px`);
  root.style.setProperty('--safe-left', `${insets.left}px`);
  root.style.setProperty('--safe-right', `${insets.right}px`);
}

export function getLaunchParams(): LaunchParams {
  return launchParams;
}

export function getSafeArea(): SafeAreaInsets {
  return safeArea;
}

export async function initVk(): Promise<void> {
  const raw = parseQuery();
  launchParams = {
    userId: raw.vk_user_id ? parseInt(raw.vk_user_id, 10) : null,
    appId: raw.vk_app_id ? parseInt(raw.vk_app_id, 10) : Number(import.meta.env.VITE_VK_APP_ID) || null,
    platform: raw.vk_platform || null,
    isDev: !raw.vk_user_id,
    raw,
  };

  try {
    inVk = await bridge.isWebView();
  } catch {
    inVk = false;
  }

  // If launch params from VK present, treat as VK even if isWebView flaky
  if (!inVk && raw.vk_app_id) {
    inVk = true;
  }

  if (!inVk) {
    initialized = true;
    applySafeAreaCss(safeArea);
    console.info('[VK] Dev mode (outside WebView)', launchParams);
    return;
  }

  try {
    await bridge.send('VKWebAppInit');
  } catch (e) {
    console.warn('[VK] Init failed', e);
  }

  // Status bar / theme for dark game
  try {
    await bridge.send('VKWebAppSetViewSettings', {
      status_bar_style: 'light',
      action_bar_color: '#0a0e14',
      navigation_bar_color: '#0a0e14',
    } as never);
  } catch {
    /* optional */
  }

  // Safe area (notches)
  try {
    const insets = (await bridge.send('VKWebAppGetSafeAreaInsets' as never)) as {
      top?: number;
      bottom?: number;
      left?: number;
      right?: number;
    };
    safeArea = {
      top: insets.top ?? 0,
      bottom: insets.bottom ?? 0,
      left: insets.left ?? 0,
      right: insets.right ?? 0,
    };
  } catch {
    /* older clients */
  }
  applySafeAreaCss(safeArea);

  initialized = true;
  console.info('[VK] Ready', { platform: launchParams.platform, userId: launchParams.userId });
}

export function isVkEnvironment(): boolean {
  return inVk;
}

export function isVkReady(): boolean {
  return initialized;
}

export async function getUserName(): Promise<string | null> {
  if (!inVk) return null;
  try {
    const data = await bridge.send('VKWebAppGetUserInfo');
    return [data.first_name, data.last_name].filter(Boolean).join(' ') || null;
  } catch {
    return null;
  }
}

export async function storageGet(keys: string[]): Promise<Record<string, string>> {
  if (!inVk) {
    const out: Record<string, string> = {};
    for (const k of keys) {
      const v = localStorage.getItem(`bmr_${k}`);
      if (v != null) out[k] = v;
    }
    return out;
  }
  try {
    const res = await bridge.send('VKWebAppStorageGet', { keys });
    const out: Record<string, string> = {};
    for (const item of res.keys) {
      out[item.key] = item.value;
    }
    return out;
  } catch {
    return {};
  }
}

export async function storageSet(key: string, value: string): Promise<void> {
  if (!inVk) {
    localStorage.setItem(`bmr_${key}`, value);
    return;
  }
  try {
    await bridge.send('VKWebAppStorageSet', { key, value });
  } catch (e) {
    console.warn('[VK] StorageSet failed', e);
    localStorage.setItem(`bmr_${key}`, value);
  }
}

export async function showRewardedAd(): Promise<boolean> {
  if (!inVk) {
    await new Promise((r) => setTimeout(r, 400));
    return true;
  }
  try {
    const result = await bridge.send('VKWebAppShowNativeAds', {
      ad_format: 'reward',
    } as never);
    return Boolean((result as { result?: boolean })?.result ?? true);
  } catch (e) {
    console.warn('[VK] Rewarded ad failed', e);
    return false;
  }
}

export async function showInterstitialAd(): Promise<boolean> {
  if (!inVk) return true;
  try {
    const result = await bridge.send('VKWebAppShowNativeAds', {
      ad_format: 'interstitial',
    } as never);
    return Boolean((result as { result?: boolean })?.result ?? true);
  } catch {
    return false;
  }
}

export async function shareScore(text: string): Promise<void> {
  if (!inVk) {
    console.log('[share]', text);
    return;
  }
  try {
    await bridge.send('VKWebAppShare', { link: window.location.href });
  } catch {
    try {
      await bridge.send('VKWebAppShowWallPostBox', { message: text });
    } catch (e) {
      console.warn('[VK] Share failed', e);
    }
  }
}

/** Soft haptic for mobile clients */
export async function haptic(type: 'light' | 'medium' | 'heavy' = 'light'): Promise<void> {
  if (!inVk) return;
  try {
    await bridge.send('VKWebAppTapticImpactOccurred', { style: type } as never);
  } catch {
    /* optional */
  }
}
