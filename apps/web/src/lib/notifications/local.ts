export type LocalNotificationKind = "rest-finished" | "water-reminder";

type NotificationAction = {
  action: string;
  title: string;
  icon?: string;
};

type ShowLocalNotificationInput = {
  kind: LocalNotificationKind;
  title: string;
  body: string;
  tag: string;
  url?: string;
  actions?: NotificationAction[];
};

type ExtendedNotificationOptions = NotificationOptions & {
  actions?: NotificationAction[];
  vibrate?: number[];
  renotify?: boolean;
  data?: {
    kind: LocalNotificationKind;
    url: string;
  };
};

export async function ensureNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported" as const;
  }

  if (Notification.permission === "granted") {
    return "granted" as const;
  }

  if (Notification.permission === "denied") {
    return "denied" as const;
  }

  const permission = await Notification.requestPermission();
  return permission;
}

export async function showLocalNotification(input: ShowLocalNotificationInput) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  if (Notification.permission !== "granted") {
    return;
  }

  const options: ExtendedNotificationOptions = {
    body: input.body,
    icon: "/icons/logo-any-192.png",
    badge: "/icons/logo-any-192.png",
    tag: input.tag,
    renotify: true,
    vibrate: [80, 40, 120],
    data: {
      kind: input.kind,
      url: input.url ?? "/",
    },
    ...(input.actions ? { actions: input.actions } : {}),
  };

  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");

      if (registration) {
        await registration.showNotification(input.title, options);
        return;
      }
    } catch {
      // Fall back to the page Notification constructor.
    }
  }

  new Notification(input.title, options);
}

export const restFinishedCopy = {
  emoji: "🔥",
  title: "¡Descanso listo!",
  body: "Tu cuerpo ya recargó. Ahora sí: la siguiente serie es tuya.",
  cta: "¡Vamos! 💪",
  notificationTitle: "🔥 ¡Descanso listo!",
  notificationBody: "La siguiente serie te espera. Tocá y seguí con todo.",
};

export const waterReminderCopy = {
  emoji: "💧",
  title: "Hora de hidratarte",
  body: "Un vaso ahora rinde más que un litro después.",
  cta: "¡Tomé agua! ✨",
  notificationTitle: "💧 Hora de hidratarte",
  notificationBody: "Pausa 10 segundos, tomá agua y volvé más fino al bloque.",
};

export async function notifyRestFinished(url = "/") {
  await showLocalNotification({
    kind: "rest-finished",
    title: restFinishedCopy.notificationTitle,
    body: restFinishedCopy.notificationBody,
    tag: "musculator-rest-finished",
    url,
    actions: [{ action: "go-train", title: restFinishedCopy.cta }],
  });
}

export async function notifyWaterReminder(url = "/nutrition") {
  await showLocalNotification({
    kind: "water-reminder",
    title: waterReminderCopy.notificationTitle,
    body: waterReminderCopy.notificationBody,
    tag: "musculator-water-reminder",
    url,
    actions: [{ action: "drank-water", title: waterReminderCopy.cta }],
  });
}
