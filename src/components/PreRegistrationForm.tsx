"use client";

import { motion } from "framer-motion";
import { FormEvent, useState } from "react";

type Props = {
  publicToken: string;
  onSuccess: () => void;
};

export function PreRegistrationForm({ publicToken, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const fullName = String(fd.get("fullName") ?? "");
    const email = String(fd.get("email") ?? "");
    const phone = String(fd.get("phone") ?? "");
    const documentId = String(fd.get("documentId") ?? "");

    try {
      const res = await fetch(`/api/tokens/${publicToken}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, phone, documentId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "No se pudo registrar");
        return;
      }
      onSuccess();
    } catch {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const field =
    "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 outline-none transition focus:border-gold/60 focus:ring-2 focus:ring-gold/25";

  return (
    <motion.form
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-md space-y-4"
    >
      <div className="space-y-1">
        <label className="text-sm text-white/70" htmlFor="fullName">
          Nombre completo
        </label>
        <input id="fullName" name="fullName" required className={field} placeholder="Tu nombre" />
      </div>
      <div className="space-y-1">
        <label className="text-sm text-white/70" htmlFor="email">
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className={field}
          placeholder="correo@ejemplo.com"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm text-white/70" htmlFor="phone">
          Teléfono
        </label>
        <input id="phone" name="phone" type="tel" required className={field} placeholder="300 0000000" />
      </div>
      <div className="space-y-1">
        <label className="text-sm text-white/70" htmlFor="documentId">
          Documento <span className="text-white/40">(opcional)</span>
        </label>
        <input id="documentId" name="documentId" className={field} placeholder="Cédula o ID" />
      </div>

      {error ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200"
        >
          {error}
        </motion.p>
      ) : null}

      <motion.button
        type="submit"
        disabled={loading}
        whileHover={{ scale: loading ? 1 : 1.02 }}
        whileTap={{ scale: loading ? 1 : 0.98 }}
        className="w-full rounded-xl bg-gradient-to-r from-gold to-gold-dark py-3.5 font-display text-lg font-semibold text-pitch shadow-lg shadow-gold/20 disabled:opacity-60"
      >
        {loading ? "Enviando…" : "Continuar al raspe"}
      </motion.button>
    </motion.form>
  );
}
