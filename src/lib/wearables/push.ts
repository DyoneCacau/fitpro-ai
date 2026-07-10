import { Capacitor } from "@capacitor/core";
import { saveDeviceToken } from "./wearables";

type PushPlugin = typeof import("@capacitor/push-notifications").PushNotifications;

async function getPushPlugin(): Promise<PushPlugin | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const mod = await import("@capacitor/push-notifications");
    return mod.PushNotifications;
  } catch {
    return null;
  }
}

export async function initPushNotifications(userId: string): Promise<void> {
  const PushNotifications = await getPushPlugin();
  if (!PushNotifications) return;

  const perm = await PushNotifications.checkPermissions();
  if (perm.receive === "prompt") {
    await PushNotifications.requestPermissions();
  }

  await PushNotifications.addListener("registration", (token) => {
    const platform = Capacitor.getPlatform() as "android" | "ios";
    void saveDeviceToken(userId, platform, token.value);
  });

  await PushNotifications.addListener("registrationError", (err) => {
    if (import.meta.env.DEV) console.warn("[push] registration error", err);
  });

  await PushNotifications.addListener("pushNotificationReceived", (notification) => {
    if (import.meta.env.DEV) console.info("[push] received", notification.title);
  });

  await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    const link = action.notification.data?.link as string | undefined;
    if (link && typeof window !== "undefined") {
      window.location.href = link;
    }
  });

  await PushNotifications.register();
}

export async function isPushAvailable(): Promise<boolean> {
  return (await getPushPlugin()) != null;
}
