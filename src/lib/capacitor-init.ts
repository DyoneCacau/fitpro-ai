import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { initPushNotifications } from "./wearables/push";
import { supabase } from "@/integrations/supabase/client";

export async function initCapacitor() {
  if (!Capacitor.isNativePlatform()) return;

  await StatusBar.setStyle({ style: Style.Dark });
  await StatusBar.setBackgroundColor({ color: "#1a1f2b" });

  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (userId) {
    void initPushNotifications(userId);
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user?.id) {
      void initPushNotifications(session.user.id);
    }
  });
}
