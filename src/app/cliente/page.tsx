"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export default function ClienteReportesPage() {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function downloadCsv() {
    setMessage(null);
    const key = apiKey.trim();
    if (!key) {
      setMessage("Pega la API key de tu campaña.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/v1/reports/participation?format=csv", {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(typeof data.error === "string" ? data.error : "No se pudo generar el reporte.");
        return;
      }
      const blob = await res.blob();
      const dispo = res.headers.get("Content-Disposition");
      const match = dispo?.match(/filename="([^"]+)"/);
      const name = match?.[1] ?? "reporte-raspa.csv";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Descarga iniciada.");
    } catch {
      setMessage("Error de red. Revisa la conexión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="font-display text-xs font-semibold uppercase tracking-[0.35em] text-gold/90">
          Supergiros
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold text-white">Reportes de campaña</h1>
        <p className="mt-4 text-sm text-white/65">
          Usa la misma <strong className="text-white/85">API key</strong> que empleas para generar enlaces (
          <code className="rounded bg-black/30 px-1 text-gold/90">Authorization: Bearer …</code>). El CSV
          incluye enlaces, ganadores, premios y datos de registro. En integraciones serias, descarga el
          reporte desde tu backend sin exponer la key en el navegador.
        </p>

        <div className="mt-8 space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <label className="block text-xs font-medium uppercase tracking-wider text-white/50">
            API key
          </label>
          <input
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sg_…"
            className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/40"
          />
          <button
            type="button"
            disabled={loading}
            onClick={downloadCsv}
            className="w-full rounded-xl bg-gradient-to-r from-gold to-amber-600 py-3 font-display text-sm font-semibold text-sg-blue-dark shadow-lg transition hover:opacity-95 disabled:opacity-50"
          >
            {loading ? "Generando…" : "Descargar CSV"}
          </button>
          {message ? <p className="text-center text-sm text-white/70">{message}</p> : null}
        </div>

        <p className="mt-8 text-center text-sm text-white/45">
          <a href="/" className="text-gold/90 underline-offset-2 hover:underline">
            Volver al inicio
          </a>
        </p>
      </motion.div>
    </main>
  );
}
