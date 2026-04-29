"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

type OverlayVariant = "dialog" | "sheet";

interface OverlayState {
  open: boolean;
  variant: OverlayVariant;
  title: string;
  description?: string;
  content?: ReactNode;
}

interface OverlayPayload {
  title: string;
  description?: string;
  content?: ReactNode;
}

interface GlobalOverlayContextValue {
  openDialog: (payload: OverlayPayload) => void;
  openSheet: (payload: OverlayPayload) => void;
  closeOverlay: () => void;
}

const GlobalOverlayContext = createContext<GlobalOverlayContextValue | null>(null);

const initialOverlayState: OverlayState = {
  open: false,
  variant: "dialog",
  title: "",
};

export function GlobalOverlayProvider({ children }: { children: ReactNode }) {
  const [overlay, setOverlay] = useState<OverlayState>(initialOverlayState);

  const value = useMemo<GlobalOverlayContextValue>(
    () => ({
      openDialog: (payload) =>
        setOverlay({
          open: true,
          variant: "dialog",
          ...payload,
        }),
      openSheet: (payload) =>
        setOverlay({
          open: true,
          variant: "sheet",
          ...payload,
        }),
      closeOverlay: () => setOverlay(initialOverlayState),
    }),
    [],
  );

  return (
    <GlobalOverlayContext.Provider value={value}>
      {children}

      <Dialog.Root open={overlay.open} onOpenChange={(open) => !open && setOverlay(initialOverlayState)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm" />
          <Dialog.Content
            className={`fixed z-50 border border-white/10 bg-[#0b1320] text-white shadow-[0_30px_80px_rgba(0,0,0,0.35)] focus:outline-none ${
              overlay.variant === "sheet"
                ? "inset-y-0 right-0 w-full max-w-md rounded-l-[2rem] p-6"
                : "left-1/2 top-1/2 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[2rem] p-6"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-2xl font-semibold text-white">{overlay.title}</Dialog.Title>
                {overlay.description ? (
                  <Dialog.Description className="mt-2 text-sm leading-7 text-white/62">
                    {overlay.description}
                  </Dialog.Description>
                ) : null}
              </div>

              <Dialog.Close className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-lg text-white transition hover:bg-white/10">
                ×
              </Dialog.Close>
            </div>

            <div className="mt-6">{overlay.content}</div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </GlobalOverlayContext.Provider>
  );
}

export function useGlobalOverlay() {
  const context = useContext(GlobalOverlayContext);

  if (!context) {
    throw new Error("useGlobalOverlay debe usarse dentro de GlobalOverlayProvider.");
  }

  return context;
}