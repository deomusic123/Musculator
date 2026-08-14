"use client";

import type { TrainingSessionDraft } from "@musculator/contracts";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface LiveCompletedSet {
  entryIndex: number;
  setIndex: number;
  reps: number;
  weightKg: number;
  rpe: number;
  completedAtMs: number;
}

interface LiveSessionState {
  sessionId: string | null;
  templateId: string | null;
  clientId: string | null;
  draft: TrainingSessionDraft | null;
  startedAtMs: number | null;
  pausedAtMs: number | null;
  pausedAccumulatedMs: number;
  entryIndex: number;
  setIndex: number;
  isPaused: boolean;
  completedSets: LiveCompletedSet[];
  restEndsAtMs: number | null;
  startLiveSession: (payload: {
    sessionId: string;
    templateId: string | null;
    clientId: string | null;
    draft: TrainingSessionDraft;
  }) => void;
  initializeSession: (sessionId: string) => void;
  togglePause: () => void;
  selectSet: (entryIndex: number, setIndex: number) => void;
  completeCurrentSet: (payload: { reps: number; weightKg: number; rpe: number; restSeconds?: number }) => void;
  clearRest: () => void;
  resetSession: () => void;
}

const emptyState = {
  sessionId: null,
  templateId: null,
  clientId: null,
  draft: null,
  startedAtMs: null,
  pausedAtMs: null,
  pausedAccumulatedMs: 0,
  entryIndex: 0,
  setIndex: 0,
  isPaused: false,
  completedSets: [] as LiveCompletedSet[],
  restEndsAtMs: null,
};

export const useLiveSessionStore = create<LiveSessionState>()(
  persist(
    (set, get) => ({
      ...emptyState,
      startLiveSession: ({ sessionId, templateId, clientId, draft }) => {
        set({
          sessionId,
          templateId,
          clientId,
          draft,
          startedAtMs: Date.now(),
          pausedAtMs: null,
          pausedAccumulatedMs: 0,
          entryIndex: 0,
          setIndex: 0,
          isPaused: false,
          completedSets: [],
          restEndsAtMs: null,
        });
      },
      initializeSession: (sessionId: string) => {
        const current = get();

        if (current.sessionId === sessionId && current.startedAtMs && current.draft) {
          return;
        }

        if (current.sessionId === sessionId && current.draft) {
          set({
            startedAtMs: current.startedAtMs ?? Date.now(),
            isPaused: false,
            pausedAtMs: null,
          });
          return;
        }

        // Route opened without a prepared draft — keep id for diagnostics only.
        set({
          ...emptyState,
          sessionId,
          startedAtMs: Date.now(),
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
      selectSet: (entryIndex, setIndex) => {
        set({
          entryIndex,
          setIndex,
        });
      },
      completeCurrentSet: ({ reps, weightKg, rpe, restSeconds = 90 }) => {
        const current = get();
        const draft = current.draft;

        if (!draft) {
          return;
        }

        const entry = draft.entries[current.entryIndex];

        if (!entry) {
          return;
        }

        const completedSets = [
          ...current.completedSets,
          {
            entryIndex: current.entryIndex,
            setIndex: current.setIndex,
            reps,
            weightKg,
            rpe,
            completedAtMs: Date.now(),
          },
        ];

        let nextEntryIndex = current.entryIndex;
        let nextSetIndex = current.setIndex + 1;

        if (nextSetIndex >= entry.sets.length) {
          nextEntryIndex += 1;
          nextSetIndex = 0;
        }

        if (nextEntryIndex >= draft.entries.length) {
          nextEntryIndex = draft.entries.length - 1;
          nextSetIndex = Math.max(entry.sets.length - 1, 0);
        }

        set({
          completedSets,
          entryIndex: nextEntryIndex,
          setIndex: nextSetIndex,
          restEndsAtMs: Date.now() + restSeconds * 1000,
        });
      },
      clearRest: () => {
        set({ restEndsAtMs: null });
      },
      resetSession: () => {
        set({ ...emptyState });
      },
    }),
    {
      name: "musculator-live-session-v2",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        sessionId: state.sessionId,
        templateId: state.templateId,
        clientId: state.clientId,
        draft: state.draft,
        startedAtMs: state.startedAtMs,
        pausedAtMs: state.pausedAtMs,
        pausedAccumulatedMs: state.pausedAccumulatedMs,
        entryIndex: state.entryIndex,
        setIndex: state.setIndex,
        isPaused: state.isPaused,
        completedSets: state.completedSets,
        restEndsAtMs: state.restEndsAtMs,
      }),
    },
  ),
);
