"use client";

import { useCallback, useEffect, useState } from "react";
import { CoachNotice } from "@/components/notifications/coach-notice";
import { notifyWaterReminder, waterReminderCopy } from "@/lib/notifications/local";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const DEBUG_INTERVAL_MS = 20_000;
const LAST_DRANK_KEY = "musculator.water.lastDrankAt";
const LAST_SHOWN_KEY = "musculator.water.lastShownAt";

function readTimestamp(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(key);
  const value = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(value) ? value : null;
}

function writeTimestamp(key: string, value: number) {
  window.localStorage.setItem(key, String(value));
}

function reminderIntervalMs() {
  if (typeof window === "undefined") {
    return TWO_HOURS_MS;
  }

  return new URLSearchParams(window.location.search).get("water-debug") === "1"
    ? DEBUG_INTERVAL_MS
    : TWO_HOURS_MS;
}

function isQuietHour(now = new Date()) {
  const hour = now.getHours();
  return hour >= 23 || hour < 7;
}

export function WaterReminder() {
  const [open, setOpen] = useState(false);

  const markDrank = useCallback(() => {
    const now = Date.now();
    writeTimestamp(LAST_DRANK_KEY, now);
    writeTimestamp(LAST_SHOWN_KEY, now);
    setOpen(false);
  }, []);

  const maybeShowReminder = useCallback(() => {
    if (isQuietHour()) {
      return;
    }

    const now = Date.now();
    const interval = reminderIntervalMs();
    const lastDrankAt = readTimestamp(LAST_DRANK_KEY);
    const lastShownAt = readTimestamp(LAST_SHOWN_KEY);
    const anchor = Math.max(lastDrankAt ?? 0, lastShownAt ?? 0);

    if (anchor === 0) {
      writeTimestamp(LAST_SHOWN_KEY, now);
      return;
    }

    if (now - anchor < interval) {
      return;
    }

    writeTimestamp(LAST_SHOWN_KEY, now);
    void notifyWaterReminder("/nutrition");

    if (document.visibilityState === "visible") {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    maybeShowReminder();

    const intervalId = window.setInterval(maybeShowReminder, 30_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        maybeShowReminder();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [maybeShowReminder]);

  return (
    <CoachNotice
      open={open}
      emoji={waterReminderCopy.emoji}
      title={waterReminderCopy.title}
      body={waterReminderCopy.body}
      cta={waterReminderCopy.cta}
      accent="cyan"
      offsetClassName="top-[calc(0.85rem+env(safe-area-inset-top))] bottom-auto xl:top-4"
      onCta={markDrank}
      onDismiss={() => setOpen(false)}
    />
  );
}
