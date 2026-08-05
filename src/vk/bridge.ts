/**
 * VK Bridge wrapper. Safe no-op outside VK WebView.
 */
import bridge from '@vkontakte/vk-bridge';

let initialized = false;
let inVk = false;

export async function initVk(): Promise<void> {
  try {
    inVk = await bridge.isWebView();
  } catch {
    inVk = false;
  }

  if (!inVk) {
    initialized = true;
    return;
  }

  try {
    await bridge.send('VKWebAppInit');
    initialized = true;
  } catch (e) {
    console.warn('[VK] Init failed', e);
    initialized = true;
  }
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
  }
}

export async function showRewardedAd(): Promise<boolean> {
  if (!inVk) {
    // Dev: pretend success after short delay
    await new Promise((r) => setTimeout(r, 400));
    return true;
  }
  try {
    // Prefer native ads API available in VK Mini Apps
    const result = await bridge.send('VKWebAppShowNativeAds', {
      ad_format: 'reward',
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
