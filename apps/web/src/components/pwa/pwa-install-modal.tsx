"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { BrowserFamily } from "@/lib/pwa/runtime";

type InstallGuideVariant = "chrome-ios" | "safari-ios" | "browser-menu";

const STEP_MS = 2100;

function resolveVariant(family: BrowserFamily): InstallGuideVariant {
  if (family === "safari-ios") {
    return "safari-ios";
  }
  if (family === "chrome-ios" || family === "firefox-ios" || family === "edge-ios") {
    return "chrome-ios";
  }
  return "browser-menu";
}

function IosShareGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M12 4v11"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M8.2 7.4 12 3.8l3.8 3.6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 10.5v7.2A2.3 2.3 0 0 0 9.3 20h5.4A2.3 2.3 0 0 0 17 17.7v-7.2"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlusSquareGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8.5v7M8.5 12h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function GlowShareButton({ active }: { active: boolean }) {
  return (
    <span
      className={`relative inline-flex h-8 w-8 items-center justify-center rounded-full transition ${
        active ? "bg-[#4cb894] text-slate-950" : "bg-white/8 text-white/55"
      }`}
    >
      {active ? (
        <span className="absolute inset-0 animate-ping rounded-full bg-[#4cb894]/45" />
      ) : null}
      <IosShareGlyph className="relative h-4 w-4" />
    </span>
  );
}

function PhoneChrome({ step, variant }: { step: number; variant: InstallGuideVariant }) {
  const highlightShare = step === 0;
  const highlightAddRow = step === 1;
  const highlightConfirm = step === 2;

  return (
    <div className="relative mx-auto w-[214px]">
      <div className="overflow-hidden rounded-[1.85rem] border border-cyan-200/15 bg-[#071018] shadow-[0_0_48px_rgba(76,184,148,0.16)]">
        <div className="flex items-center justify-between px-4 pb-1 pt-3">
          <span className="text-[9px] tracking-[0.18em] text-white/35">9:41</span>
          <span className="h-1.5 w-14 rounded-full bg-white/12" />
        </div>

        {variant === "safari-ios" ? (
          <div className="px-3 pb-2">
            <div className="rounded-full bg-white/8 px-3 py-1.5 text-center text-[10px] text-white/45">
              musculator.app
            </div>
          </div>
        ) : variant === "chrome-ios" ? (
          <div className="flex items-center gap-2 px-3 pb-2">
            <div className="h-8 flex-1 rounded-full bg-white/8 px-3 text-[10px] leading-8 text-white/40">
              musculator.app
            </div>
            <GlowShareButton active={highlightShare} />
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 pb-2">
            <div className="h-8 flex-1 rounded-full bg-white/8 px-3 text-[10px] leading-8 text-white/40">
              musculator.app
            </div>
            <span
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-lg font-semibold ${
                highlightShare ? "bg-[#4cb894] text-slate-950" : "bg-white/8 text-white/55"
              }`}
            >
              ⋮
            </span>
          </div>
        )}

        <div className="relative h-[168px] bg-[radial-gradient(circle_at_50%_0%,rgba(76,184,148,0.16),transparent_58%)]">
          <div className="absolute inset-x-5 top-5 h-16 rounded-2xl border border-white/6 bg-white/4" />
          <div className="absolute inset-x-8 top-24 h-3 rounded-full bg-white/6" />
          <div className="absolute inset-x-12 top-[7.5rem] h-3 rounded-full bg-white/4" />

          <AnimatePresence>
            {step > 0 ? (
              <motion.div
                key="sheet"
                initial={{ y: 36, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 24, opacity: 0 }}
                transition={{ type: "spring", stiffness: 240, damping: 26 }}
                className="absolute inset-x-2 bottom-2 overflow-hidden rounded-2xl border border-white/12 bg-[#101a26]/96 p-2 backdrop-blur"
              >
                {variant === "browser-menu" ? (
                  <div
                    className={`flex items-center gap-2 rounded-xl px-2 py-2 ${
                      highlightAddRow || highlightConfirm ? "bg-[#4cb894]/18" : "bg-white/4"
                    }`}
                  >
                    <PlusSquareGlyph className="h-4 w-4 text-[#4cb894]" />
                    <span className="text-[11px] font-medium text-white">Instalar app</span>
                  </div>
                ) : (
                  <>
                    <div
                      className={`flex items-center gap-2 rounded-xl px-2 py-2 ${
                        highlightAddRow ? "bg-[#4cb894]/18 ring-1 ring-[#4cb894]/50" : "bg-white/4"
                      }`}
                    >
                      <PlusSquareGlyph className="h-4 w-4 text-[#4cb894]" />
                      <span className="text-[11px] font-medium text-white">Agregar a pantalla de inicio</span>
                    </div>
                    {highlightConfirm ? (
                      <div className="mt-2 flex justify-end">
                        <span className="inline-flex h-7 items-center rounded-full bg-[#4cb894] px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-950">
                          Agregar
                        </span>
                      </div>
                    ) : null}
                  </>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {variant === "safari-ios" ? (
          <div className="flex items-center justify-around px-5 pb-3 pt-2">
            <span className="h-1.5 w-4 rounded-full bg-white/18" />
            <span className="h-1.5 w-4 rounded-full bg-white/18" />
            <GlowShareButton active={highlightShare} />
            <span className="h-1.5 w-4 rounded-full bg-white/18" />
            <span className="h-1.5 w-4 rounded-full bg-white/18" />
          </div>
        ) : (
          <div className="h-4" />
        )}
      </div>
    </div>
  );
}

function stepCopy(variant: InstallGuideVariant): [string, string, string] {
  if (variant === "safari-ios") {
    return ["Tocá Compartir", "Agregar a pantalla de inicio", "Tocá Agregar"];
  }
  if (variant === "chrome-ios") {
    return ["Tocá Compartir de Chrome", "Agregar a pantalla de inicio", "Tocá Agregar"];
  }
  return ["Abrí el menú del navegador", "Elegí Instalar app", "Confirmá Instalar"];
}

export function PwaInstallModal({
  open,
  browserFamily,
  onClose,
}: {
  open: boolean;
  browserFamily: BrowserFamily;
  onClose: () => void;
}) {
  const variant = resolveVariant(browserFamily);
  const steps = stepCopy(variant);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) {
      return;
    }

    setStep(0);
    const intervalId = window.setInterval(() => {
      setStep((current) => (current + 1) % 3);
    }, STEP_MS);

    return () => window.clearInterval(intervalId);
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center">
      <button
        type="button"
        aria-label="Cerrar guía de instalación"
        className="absolute inset-0 bg-[#020617]/72 backdrop-blur-md"
        onClick={onClose}
      />
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-title"
        initial={{ y: 28, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        className="relative w-full max-w-[22.5rem] overflow-hidden rounded-[1.75rem] border border-cyan-200/15 bg-[#08131c] p-4 text-white shadow-[0_24px_80px_rgba(2,8,18,0.55)]"
      >
        <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-[#4cb894]/18 blur-3xl" />
        <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />

        <h2 id="pwa-install-title" className="text-center text-lg font-semibold tracking-wide">
          Instalar MUSCULATOR
        </h2>

        <div className="mt-4">
          <PhoneChrome step={step} variant={variant} />
        </div>

        <ol className="mt-4 space-y-2">
          {steps.map((label, index) => (
            <li
              key={label}
              className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition ${
                step === index
                  ? "border-[#4cb894]/45 bg-[#4cb894]/12 text-white"
                  : "border-white/6 bg-white/3 text-white/45"
              }`}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                  step === index ? "bg-[#4cb894] text-slate-950" : "bg-white/8 text-white/55"
                }`}
              >
                {index + 1}
              </span>
              <span className="text-sm font-medium">{label}</span>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-[#4cb894] text-sm font-semibold uppercase tracking-[0.16em] text-slate-950 transition hover:bg-[#63c7a5]"
        >
          Entendido
        </button>
      </motion.section>
    </div>
  );
}
