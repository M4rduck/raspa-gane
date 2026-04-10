"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

export function WinParticles() {
  const items = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 1.8 + Math.random(),
        rotate: Math.random() * 360,
      })),
    [],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {items.map((p) => (
        <motion.span
          key={p.id}
          className="absolute h-2 w-2 rounded-sm bg-gold shadow-[0_0_12px_rgba(244,196,48,0.9)]"
          style={{ left: `${p.x}%`, top: "-5%" }}
          initial={{ opacity: 0, y: 0, rotate: p.rotate }}
          animate={{
            opacity: [0, 1, 1, 0],
            y: ["0vh", "110vh"],
            rotate: p.rotate + 180,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeIn",
          }}
        />
      ))}
    </div>
  );
}
