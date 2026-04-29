"use client";

import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { createBrowserSupabaseClient } from "@/lib/platform/supabase-browser";

interface SignInFormProps {
  enabled: boolean;
}

export function SignInForm({ enabled }: SignInFormProps) {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const nextParam = searchParams.get("next");

  const nextPath = nextParam && nextParam.startsWith("/") ? nextParam : "/";

  const handleSubmit = async (formData: FormData) => {
    const submittedEmail = String(formData.get("email") ?? "").trim();

    setMessage(null);
    setError(null);

    startTransition(async () => {
      const supabase = createBrowserSupabaseClient();

      if (!supabase) {
        setError("Faltan las variables publicas de Supabase en apps/web/.env.local.");
        return;
      }

      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", nextPath);

      const { error: authError } = await supabase.auth.signInWithOtp({
        email: submittedEmail,
        options: {
          emailRedirectTo: callbackUrl.toString(),
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      setEmail("");
      setMessage("Te envie un magic link por email. Abri ese enlace para completar la sesion.");
    });
  };

  return (
    <form action={handleSubmit} className="grid gap-4">
      <label className="grid gap-2 text-sm text-[var(--muted)]">
        Email
        <input
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tu@email.com"
          className="rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3 text-base text-[var(--ink)] outline-none transition focus:border-slate-900"
          disabled={!enabled || isPending}
          required
        />
      </label>

      <button
        type="submit"
        disabled={!enabled || isPending}
        className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isPending ? "Enviando magic link..." : "Entrar con magic link"}
      </button>

      {!enabled ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Antes de autenticar, carga las variables publicas de Supabase y configura el callback URL.
        </p>
      ) : null}

      {message ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}
    </form>
  );
}