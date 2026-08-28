import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const CHANNEL_ID = "notify-studio-demo";
const CHANNEL_NAME = "Vendas simuladas";

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: CHANNEL_NAME,
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FF231F7C",
  });
}

export async function requestPermissionIfNeeded(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function checkPermissionStatus(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
}

export async function triggerLocalNotification(
  title: string,
  body: string,
): Promise<string> {
  await ensureAndroidChannel();
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
    },
    // No Android o canal e definido no trigger (ChannelAwareTriggerInput,
    // entrega imediata no canal); no iOS o trigger nulo entrega imediatamente.
    trigger:
      Platform.OS === "android" ? { channelId: CHANNEL_ID } : null,
  });
  return id;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
