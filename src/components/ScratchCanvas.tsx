"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  width: number;
  height: number;
  onRevealThreshold: () => void;
  disabled?: boolean;
};

const BRUSH = 28;

export function ScratchCanvas({ width, height, onRevealThreshold, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const drawing = useRef(false);
  const glow = useMotionValue(0);
  const glowSpring = useSpring(glow, { stiffness: 120, damping: 18 });

  const lastSampleRef = useRef(0);

  const paint = useCallback(
    (cx: number, cy: number) => {
      const canvas = canvasRef.current;
      if (!canvas || disabled) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(cx, cy, BRUSH, 0, Math.PI * 2);
      ctx.fill();

      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      if (now - lastSampleRef.current < 120) return;
      lastSampleRef.current = now;

      const w = canvas.width;
      const h = canvas.height;
      const { data } = ctx.getImageData(0, 0, w, h);
      let transparent = 0;
      const step = 16;
      for (let i = 3; i < data.length; i += step * 4) {
        if (data[i] < 32) transparent++;
      }
      const samples = data.length / (step * 4);
      const ratio = transparent / samples;
      if (ratio > 0.45) onRevealThreshold();
    },
    [disabled, height, onRevealThreshold, width],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const grd = ctx.createLinearGradient(0, 0, width, height);
    grd.addColorStop(0, "#c0c0c0");
    grd.addColorStop(0.35, "#e8e8e8");
    grd.addColorStop(0.55, "#a8a8a8");
    grd.addColorStop(1, "#d4d4d4");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.font = `bold ${Math.floor(height * 0.12)}px var(--font-outfit), sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("RASPA AQUÍ", width / 2, height / 2 - 8);
    ctx.font = `${Math.floor(height * 0.055)}px var(--font-dm-sans), sans-serif`;
    ctx.fillText("Mantén pulsado y arrastra", width / 2, height / 2 + height * 0.12);

    ctx.globalCompositeOperation = "source-over";
    setReady(true);
  }, [height, width]);

  const pointer = (e: React.PointerEvent) => {
    if (disabled || !ready) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    paint(x, y);
    glow.set(1);
  };

  return (
    <motion.div
      className="relative touch-none select-none rounded-2xl shadow-2xl ring-2 ring-gold/30"
      style={{ width, height }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-10 cursor-crosshair rounded-2xl"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          pointer(e);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          pointer(e);
        }}
        onPointerUp={(e) => {
          drawing.current = false;
          glow.set(0);
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
        }}
        onPointerLeave={() => {
          drawing.current = false;
          glow.set(0);
        }}
      />
      <motion.div
        className="pointer-events-none absolute -inset-3 rounded-3xl bg-gold/20 blur-xl"
        style={{ opacity: glowSpring }}
      />
    </motion.div>
  );
}
