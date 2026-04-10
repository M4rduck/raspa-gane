"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { startScratchSound, modulateScratchSound, stopScratchSound } from "../utils/audio";

type Props = {
  width: number;
  height: number;
  onRevealThreshold: () => void;
  disabled?: boolean;
};

const BRUSH = 42; // Pincel más grande para compensar el área mayor y sea fácil en móvil

export function ScratchCanvas({ width, height, onRevealThreshold, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const drawing = useRef(false);
  const glow = useMotionValue(0);
  const glowSpring = useSpring(glow, { stiffness: 120, damping: 18 });

  const lastSampleRef = useRef(0);
  const lastPosRef = useRef({ x: 0, y: 0, time: 0 });

  useEffect(() => {
    if (disabled) stopScratchSound();
  }, [disabled]);


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
      if (ratio > 0.80) onRevealThreshold(); // Obliga a raspar el 70% del área antes de validar
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
    // Gradient metálico más realista y con alto contraste
    grd.addColorStop(0, "#e8e8e8");
    grd.addColorStop(0.2, "#a8a8a8");
    grd.addColorStop(0.4, "#f4f4f4");
    grd.addColorStop(0.6, "#8c8c8c");
    grd.addColorStop(0.8, "#ffffff");
    grd.addColorStop(1, "#c0c0c0");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, width, height);

    // Ruido para simular la textura rasposa del cromo plateado
    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.05)";
      ctx.fillRect(Math.random() * width, Math.random() * height, 1.5, 1.5);
    }

    // Texto con mejor jerarquía y sombras
    ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = "#333333";
    ctx.font = `900 ${Math.floor(height * 0.14)}px var(--font-outfit), sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("¡RASPA AQUÍ!", width / 2, height / 2 - 12);

    ctx.font = `600 ${Math.floor(height * 0.055)}px var(--font-dm-sans), sans-serif`;
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#555555";
    ctx.fillText("Desliza la moneda para descubrir", width / 2, height / 2 + height * 0.12);

    ctx.globalCompositeOperation = "source-over";
    setReady(true);
  }, [height, width]);

  const pointer = (e: React.PointerEvent) => {
    if (disabled || !ready) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Modulación dinámica del sonido según la velocidad
    const now = performance.now();
    const dt = now - lastPosRef.current.time;
    if (dt > 0) {
      const dx = x - lastPosRef.current.x;
      const dy = y - lastPosRef.current.y;
      const velocity = Math.sqrt(dx * dx + dy * dy) / dt;
      modulateScratchSound(velocity);
    }
    lastPosRef.current = { x, y, time: now };

    paint(x, y);
    glow.set(1);
  };

  // Cursor personalizado en forma de Moneda de Casino Dorado 3D
  const coinCursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23f4c430" stroke="%23c9a227" stroke-width="5"/><circle cx="50" cy="50" r="35" fill="none" stroke="%23ffe066" stroke-width="2" stroke-dasharray="5,5"/><text x="50" y="66" font-family="sans-serif" font-size="42" font-weight="900" fill="%23c9a227" text-anchor="middle">$</text><circle cx="28" cy="28" r="8" fill="%23ffffff" opacity="0.4" /></svg>') 19 19, crosshair`;

  return (
    <motion.div
      className="relative touch-none select-none rounded-2xl shadow-[0_0_20px_rgba(0,178,227,0.3)] ring-2 ring-gold/40 hover:ring-gold/70 hover:shadow-[0_0_30px_rgba(0,178,227,0.5)] transition-all duration-300 group"
      style={{ width, height }}
    >
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 z-10 rounded-2xl transition-opacity duration-1000 ease-out ${disabled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ cursor: disabled ? 'default' : coinCursor }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          startScratchSound();
          pointer(e);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          pointer(e);
        }}
        onPointerUp={(e) => {
          drawing.current = false;
          glow.set(0);
          stopScratchSound();
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
        }}
        onPointerLeave={() => {
          drawing.current = false;
          glow.set(0);
          stopScratchSound();
        }}
      />
      <motion.div
        className="pointer-events-none absolute -inset-3 rounded-3xl bg-gold/20 blur-xl"
        style={{ opacity: glowSpring }}
      />
    </motion.div>
  );
}
