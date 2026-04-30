"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface LiveSessionState {
  sessionId: string | null;
  startedAtMs: number | null;
  pausedAtMs: number | null;
  pausedAccumulatedMs: number;
  activeSetId: string | null;
  isPaused: boolean;
  initializeSession: (sessionId: string) => void;
  togglePause: () => void;
  setActiveSetId: (setId: string | null) => void;
  resetSession: () => void;
}

export const useLiveSessionStore = create<LiveSessionState>()(
  persist(
    (set, get) => ({
      sessionId: null,
      startedAtMs: null,
      pausedAtMs: null,
      pausedAccumulatedMs: 0,
      activeSetId: null,
      isPaused: false,
      initializeSession: (sessionId: string) => {
        const current = get();

        if (current.sessionId === sessionId && current.startedAtMs) {
          return;
        }

        set({
          sessionId,
          startedAtMs: Date.now(),
          pausedAtMs: null,
          pausedAccumulatedMs: 0,
          activeSetId: "set-1",
          isPaused: false,
        });
      },
      togglePause: () => {
        const current = get();

        if (!current.startedAtMs) {
          return;
        }

        if (current.isPaused && current.pausedAtMs) {
          const pauseDelta = Math.max(Date.now() - current.pausedAtMs, 0);

          set({
            isPaused: false,
            pausedAtMs: null,
            pausedAccumulatedMs: current.pausedAccumulatedMs + pauseDelta,
          });
          return;
        }

        set({
          isPaused: true,
          pausedAtMs: Date.now(),
        });
      },
      setActiveSetId: (setId: string | null) => {
        set({ activeSetId: setId });
      },
      resetSession: () => {
        set({
          sessionId: null,
          startedAtMs: null,
          pausedAtMs: null,
          pausedAccumulatedMs: 0,
          activeSetId: null,
          isPaused: false,
        });
      },
    }),
    {
      name: "musculator-live-session-v1",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        sessionId: state.sessionId,
        startedAtMs: state.startedAtMs,
        pausedAtMs: state.pausedAtMs,
        pausedAccumulatedMs: state.pausedAccumulatedMs,
        activeSetId: state.activeSetId,
        isPaused: state.isPaused,
      }),
    },
  ),
);
