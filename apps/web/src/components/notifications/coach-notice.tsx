"use client";

type CoachNoticeAccent = "mint" | "cyan";

export function CoachNotice({
  open,
  emoji,
  title,
  body,
  cta,
  accent = "mint",
  offsetClassName,
  onCta,
  onDismiss,
}: {
  open: boolean;
  emoji: string;
  title: string;
  body: string;
  cta: string;
  accent?: CoachNoticeAccent;
  offsetClassName?: string;
  onCta: () => void;
  onDismiss: () => void;
}) {
  if (!open) {
    return null;
  }

  const ctaClassName =
    accent === "cyan"
      ? "bg-cyan-300 hover:bg-cyan-200"
      : "bg-[#4cb894] hover:bg-[#63c7a5]";
  const glowClassName = accent === "cyan" ? "bg-cyan-300/25" : "bg-[#4cb894]/25";

  return (
    <section
      className={`fixed inset-x-3 z-[55] overflow-hidden rounded-[1.45rem] border border-white/12 bg-[#0b1420]/96 px-3 py-3 text-white shadow-[0_16px_40px_rgba(2,6,23,0.42)] backdrop-blur xl:inset-x-auto xl:right-4 xl:w-[380px] ${
        offsetClassName ?? "bottom-[calc(1.1rem+env(safe-area-inset-bottom))]"
      }`}
    >
      <div className={`pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full blur-2xl ${glowClassName}`} />
      <div className="relative flex items-start gap-3">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-2xl">
          {emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold tracking-wide">{title}</p>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Cerrar aviso"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/6 text-sm text-white/75 transition hover:bg-white/12"
            >
              ×
            </button>
          </div>
          <p className="mt-1 text-xs leading-5 text-white/62">{body}</p>
          <button
            type="button"
            onClick={onCta}
            className={`mt-3 inline-flex h-10 w-full items-center justify-center rounded-full px-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-950 transition ${ctaClassName}`}
          >
            {cta}
          </button>
        </div>
      </div>
    </section>
  );
}
