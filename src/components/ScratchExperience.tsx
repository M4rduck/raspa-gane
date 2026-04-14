"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { PreRegistrationForm } from "./PreRegistrationForm";
import { ScratchCanvas } from "./ScratchCanvas";
import { WinParticles } from "./WinParticles";
import { playWinSound, playLoseSound } from "../utils/audio";

type Step = "loading" | "register" | "scratch" | "result";

type TokenState = {
  campaignName: string;
  registered: boolean;
  scratched: boolean;
};

type PrizeAssetsMap = Record<string, { label: string; imageUrl: string | null }>;

type ScratchResult = {
  isWinner: boolean;
  board: string[][] | null;
  winningLine: number | null;
  prizeLabel: string | null;
  winnerImageUrl?: string | null;
};

type SymbolKey = "MOTO" | "TV" | "CARRO" | "PS5" | "BONO";

const SYMBOL_META: Record<SymbolKey, { icon: string; label: string; hint: string; imgUrl?: string }> = {
  MOTO: { icon: "🏍️", label: "Moto", hint: "Premio", imgUrl: "/prizes/moto.png" },
  TV: { icon: "📺", label: "TV", hint: "Premio", imgUrl: "/prizes/tv.png" },
  CARRO: { icon: "🚗", label: "Carro", hint: "Premio", imgUrl: "/prizes/car.png" },
  PS5: { icon: "🎮", label: "PS5", hint: "Premio", imgUrl: "/prizes/ps5.png" },
  BONO: { icon: "🎁", label: "Bono", hint: "Premio", imgUrl: "/prizes/bono.png" },
};

const SCRATCH_PREVIEW_BOARD = [
  ["MOTO", "MOTO", "BONO"],
  ["MOTO", "TV", "CARRO"],
  ["BONO", "MOTO", "PS5"],
];

function parsePrizeAssets(raw: unknown): PrizeAssetsMap | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: PrizeAssetsMap = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!v || typeof v !== "object") continue;
    const vo = v as { label?: unknown; imageUrl?: unknown };
    const label = typeof vo.label === "string" ? vo.label : k;
    const imageUrl =
      vo.imageUrl === null || vo.imageUrl === undefined
        ? null
        : typeof vo.imageUrl === "string"
          ? vo.imageUrl || null
          : null;
    out[k] = { label, imageUrl };
  }
  return Object.keys(out).length ? out : null;
}

function resolveSymbolDisplay(cell: string, prizeAssets: PrizeAssetsMap | null) {
  const base = SYMBOL_META[cell as SymbolKey] ?? { icon: "🎟️", label: cell, hint: "Premio", imgUrl: undefined };
  const o = prizeAssets?.[cell];
  return {
    icon: base.icon,
    hint: base.hint,
    label: o?.label ?? base.label,
    imgUrl: o?.imageUrl ?? base.imgUrl,
  };
}

export function ScratchExperience({ publicToken }: { publicToken: string }) {
  const [step, setStep] = useState<Step>("loading");
  const [prizeAssets, setPrizeAssets] = useState<PrizeAssetsMap | null>(null);
  const [state, setState] = useState<TokenState | null>(null);
  const [isWinner, setIsWinner] = useState<boolean | null>(null);
  const [result, setResult] = useState<ScratchResult | null>(null);
  const [scratchDone, setScratchDone] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const revealOnceRef = useRef(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/tokens/${publicToken}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Enlace inválido");
        setStep("loading");
        return;
      }
      setPrizeAssets(parsePrizeAssets(data.prizeAssets));
      setState({
        campaignName: data.campaignName,
        registered: data.registered,
        scratched: data.scratched,
      });
      if (data.scratched) {
        const sr = await fetch(`/api/tokens/${publicToken}/scratch`, { method: "POST" });
        const sd = await sr.json().catch(() => ({}));
        if (typeof sd.isWinner === "boolean") {
          const pa = parsePrizeAssets(sd.prizeAssets);
          if (pa) setPrizeAssets(pa);
          setIsWinner(sd.isWinner);
          setResult({
            isWinner: sd.isWinner,
            board: Array.isArray(sd.board) ? sd.board : null,
            winningLine: typeof sd.winningLine === "number" ? sd.winningLine : null,
            prizeLabel: typeof sd.prizeLabel === "string" ? sd.prizeLabel : null,
            winnerImageUrl:
              typeof sd.winnerImageUrl === "string" && sd.winnerImageUrl ? sd.winnerImageUrl : null,
          });
          setStep("result");
        } else {
          setError("No se pudo recuperar tu resultado.");
        }
        return;
      }
      if (data.registered) setStep("scratch");
      else setStep("register");
    } catch {
      setError("No se pudo cargar. Revisa tu conexión.");
    }
  }, [publicToken]);

  useEffect(() => {
    load();
  }, [load]);

  const onRegistered = () => {
    setState((s) => (s ? { ...s, registered: true } : s));
    setStep("scratch");
  };

  const onRevealThreshold = useCallback(async () => {
    if (revealOnceRef.current || scratchDone) return;
    revealOnceRef.current = true;
    setScratchDone(true);
    setVerifying(true);
    try {
      const res = await fetch(`/api/tokens/${publicToken}/scratch`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Error al confirmar");
        setVerifying(false);
        setScratchDone(false);
        return;
      }
      const pa = parsePrizeAssets(data.prizeAssets);
      if (pa) setPrizeAssets(pa);
      setIsWinner(Boolean(data.isWinner));
      setResult({
        isWinner: Boolean(data.isWinner),
        board: Array.isArray(data.board) ? data.board : null,
        winningLine: typeof data.winningLine === "number" ? data.winningLine : null,
        prizeLabel: typeof data.prizeLabel === "string" ? data.prizeLabel : null,
        winnerImageUrl:
          typeof data.winnerImageUrl === "string" && data.winnerImageUrl ? data.winnerImageUrl : null,
      });
      setVerifying(false);
      setStep("result");
      if (data.isWinner) {
        playWinSound();
      } else {
        playLoseSound();
      }
    } catch {
      setError("Error de red al confirmar el resultado.");
      setVerifying(false);
      setScratchDone(false);
    }
  }, [publicToken, scratchDone]);

  if (error && step === "loading" && !state) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
        <p className="text-lg text-red-200">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-lg px-4 pb-16 pt-6">
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 text-center"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-[0_0_15px_rgba(244,196,48,0.2)]">
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-gold-light">
            Supergiros Experiencia Premium
          </p>
        </div>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-white drop-shadow-lg md:text-5xl">
          Raspe <span className="text-gradient-gold drop-shadow-[0_0_15px_rgba(244,196,48,0.4)]">Mundialista</span>
        </h1>
        {state?.campaignName && !state.campaignName.toLowerCase().includes("raspe mundialista") ? (
          <div className="mt-4 flex justify-center">
            <span className="inline-block rounded-lg bg-sg-blue-light/50 px-3 py-1 text-xs font-medium text-sg-cyan border border-sg-cyan/30">
              Campaña: {state.campaignName}
            </span>
          </div>
        ) : null}
      </motion.header>

      <AnimatePresence mode="wait">
        {step === "register" ? (
          <motion.div
            key="reg"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.35 }}
            className="glass-panel p-6 shadow-neon-blue relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-stadium-noise mix-blend-overlay opacity-20 pointer-events-none"></div>
            <h2 className="mb-1 font-display text-xl font-semibold text-white">Antes de jugar</h2>
            <p className="mb-6 text-sm text-white/60">
              Completa tus datos para validar tu participación y poder contactarte si resultas ganador.
            </p>
            <PreRegistrationForm publicToken={publicToken} onSuccess={onRegistered} />
          </motion.div>
        ) : null}

        {step === "scratch" && state ? (
          <motion.div
            key="scratch"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -20 }}
            transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
            className="flex flex-col items-center gap-8 w-full"
          >
            {/* Contenedor tipo "Máquina Arcade / Pedestal" */}
            <div className="w-full max-w-sm rounded-[2.5rem] p-6 glass-panel border-t border-t-white/20 shadow-[0_20px_50px_rgba(0,43,96,0.5)] relative overflow-hidden flex flex-col items-center">
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>

              {/* Título de la máquina */}
              <div className="mb-6 flex flex-col items-center">
                 <div className="h-1 w-12 rounded-full bg-sg-cyan/50 mb-4"></div>
                 <p className="text-center text-sm font-medium text-white/80 max-w-[200px]">
                   Apunta tu moneda y barre la zona plateada
                 </p>
              </div>

              <div className="relative mt-2">
                {/* Anillo exterior neon animado que respira para llamar a la acción */}
                <div className="absolute -inset-3 bg-gradient-to-r from-sg-cyan via-gold to-neon-blue rounded-[2rem] blur-xl opacity-50 animate-pulse-glow" aria-hidden="true" />

              
              <div
                className="absolute inset-0 -z-10 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-[#2d6a4f] to-[#081c15] ring-1 ring-gold/40 shadow-neon-gold"
                style={{ width: 320, height: 420 }}
              >
                <div className="absolute inset-0 bg-stadium-noise mix-blend-overlay opacity-30"></div>
              </div>
              <div className="relative overflow-hidden rounded-2xl ring-2 ring-white/10" style={{ width: 320, height: 420 }}>
                <div className="absolute inset-0 bg-gradient-to-b from-[#1b4332] to-[#081c15] p-3 flex flex-col justify-center">
                  
                  {/* Marca de agua / Etiqueta central imitando la referencia */}
                  <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 z-0 flex flex-col items-center justify-center pointer-events-none mix-blend-plus-lighter">
                    <p className="font-display font-black text-2xl text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style={{ WebkitTextStroke: '1px black' }}>TU OPORTUNIDAD</p>
                    <p className="font-display font-black text-5xl text-gold drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]" style={{ WebkitTextStroke: '2px black' }}>MOTO</p>
                  </div>

                  <div className="space-y-2 relative z-10">
                    {SCRATCH_PREVIEW_BOARD.map((row, rowIdx) => (
                      <div key={`preview-row-${rowIdx}`} className="grid grid-cols-3 gap-2">
                        {row.map((cell, cellIdx) => {
                          const symbol = resolveSymbolDisplay(cell, prizeAssets);
                          return (
                            <div
                              key={`preview-cell-${rowIdx}-${cellIdx}`}
                              className="flex aspect-square items-center justify-center rounded-full bg-black/40 ring-4 ring-white/10 shadow-inner backdrop-blur-sm"
                            >
                              <div className="flex w-3/4 h-3/4 items-center justify-center">
                                {symbol.imgUrl ? (
                                  <img src={symbol.imgUrl} alt={symbol.label} className="w-full h-full object-contain filter drop-shadow-lg scale-125" />
                                ) : (
                                  <span className="text-4xl" aria-hidden>{symbol.icon}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
                <ScratchCanvas
                  width={320}
                  height={420}
                  onRevealThreshold={onRevealThreshold}
                  disabled={scratchDone}
                />
                {verifying ? (
                  <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-sg-blue-dark/85 backdrop-blur-sm">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="font-display text-sm tracking-wide text-gold"
                    >
                      Validando resultado…
                    </motion.p>
                  </div>
                ) : null}
              </div>
            </div>
            </div>
            {error ? <div className="mt-4 px-4 py-2 bg-red-500/20 text-red-200 border border-red-500/50 rounded-xl text-center text-sm">{error}</div> : null}
          </motion.div>
        ) : null}

        {step === "result" && isWinner !== null ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-8 text-center relative overflow-hidden"
          >
            {/* Efectos de fondo del resultado */}
            <div className="absolute inset-0 bg-gradient-to-t from-gold/10 to-transparent pointer-events-none"></div>
            <div className="absolute inset-0 bg-stadium-noise mix-blend-overlay opacity-20 pointer-events-none"></div>

            {isWinner ? <WinParticles /> : null}
            <motion.div
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="relative z-[1]"
            >
              {isWinner && result?.winnerImageUrl ? (
                <div className="mx-auto mb-4 flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl bg-black/30 ring-2 ring-gold/50 shadow-[0_0_30px_rgba(244,196,48,0.35)]">
                  <img
                    src={result.winnerImageUrl}
                    alt={result.prizeLabel ?? "Premio"}
                    className="h-full w-full object-contain p-2"
                  />
                </div>
              ) : (
                <div
                  className={`mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full text-5xl shadow-[0_0_30px_rgba(244,196,48,0.5)] ${isWinner ? "bg-gradient-to-br from-gold-light to-gold-dark" : "bg-white/10 border border-white/20"}`}
                >
                  {isWinner ? "🏆" : "🎯"}
                </div>
              )}
              <h2 className="font-display text-2xl font-bold text-white">
                {isWinner ? "¡Ganaste!" : "Sigue intentando"}
              </h2>
              <p className="mt-3 text-sm text-white/70">
                {isWinner
                  ? "Pronto nos pondremos en contacto contigo con los pasos para reclamar tu premio."
                  : "Gracias por participar. ¡La próxima puede ser la tuya!"}
              </p>
              {result?.prizeLabel ? (
                <p className="mt-3 rounded-lg bg-gold/20 px-3 py-2 font-display text-base text-gold">
                  Premio: {result.prizeLabel}
                </p>
              ) : null}
              {result?.board ? (
                <div className="mx-auto mt-5 w-full max-w-xs space-y-2">
                  {result.board.map((row, rowIdx) => (
                    <div
                      key={`row-${rowIdx}`}
                      className={`grid grid-cols-3 gap-2 rounded-lg p-2 ${
                        result.winningLine === rowIdx ? "bg-gold/20 ring-1 ring-gold/70" : "bg-white/5"
                      }`}
                    >
                      {row.map((cell, cellIdx) => {
                        const symbol = resolveSymbolDisplay(cell, prizeAssets);
                        return (
                          <div
                            key={`cell-${rowIdx}-${cellIdx}`}
                            className="flex min-h-14 items-center gap-2 rounded-md bg-black/35 px-2 py-2 text-white"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/10 text-base ring-1 ring-gold/40 overflow-hidden shadow-[0_0_10px_rgba(244,196,48,0.3)]">
                                {symbol.imgUrl ? (
                                  <img src={symbol.imgUrl} alt={symbol.label} className="w-full h-full object-cover mix-blend-screen scale-125" />
                                ) : (
                                  <span aria-hidden>{symbol.icon}</span>
                                )}
                            </div>
                            <div className="min-w-0 text-left">
                              <p className="truncate text-[11px] font-semibold tracking-wide">{symbol.label}</p>
                              <p className="text-[10px] text-white/60">{symbol.hint}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ) : null}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {step === "loading" && !error ? (
        <div className="flex justify-center py-20">
          <motion.div
            className="h-12 w-12 rounded-full border-2 border-gold/30 border-t-gold"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
          />
        </div>
      ) : null}
    </div>
  );
}
