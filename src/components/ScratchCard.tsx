"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";

interface ScratchCardProps {
  width?: number;
  height?: number;
  coverImage?: string; // Ruta de la imagen plateada a raspar
  coverColor?: string; // O un color de respaldo
  brushSize?: number;
  finishPercent?: number; // Qué % debe rasparse para ganar (ej 50%)
  onComplete: () => void;
  children: React.ReactNode; // El premio que está DEBAJO
}

export function ScratchCard({
  width = 300,
  height = 300,
  coverImage,
  coverColor = "#silver", // default backup
  brushSize = 40,
  finishPercent = 50,
  onComplete,
  children,
}: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Inicializar canvas
    canvas.width = width;
    canvas.height = height;

    const fillCover = () => {
      ctx.globalCompositeOperation = "source-over";
      if (coverImage) {
        const img = new Image();
        img.src = coverImage;
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height);
        };
      } else {
        // Gradient plateado realista
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "#e8e8e8");
        gradient.addColorStop(0.3, "#a6a6a6");
        gradient.addColorStop(0.5, "#d9d9d9");
        gradient.addColorStop(0.7, "#a6a6a6");
        gradient.addColorStop(1, "#f2f2f2");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Agregar "ruido" o textura al raspe
        ctx.fillStyle = "rgba(0,0,0,0.05)";
        for (let i = 0; i < 1000; i++) {
          ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
        }
        
        // Agregar texto indicativo
        ctx.font = "bold 24px 'system-ui', sans-serif";
        ctx.fillStyle = "#666";
        ctx.textAlign = "center";
        ctx.fillText("RASPA AQUÍ", width / 2, height / 2 + 8);
      }
    };

    fillCover();
  }, [width, height, coverImage]);

  const getPointerPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Scale for responsive sizing
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (isRevealed) return;
    setIsDrawing(true);
    scratch(e);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!isDrawing || isRevealed) return;
    // Prevenir el scroll en dispositivos táctiles mientras raspan
    if (e.cancelable && "touches" in e) e.preventDefault(); 
    scratch(e);
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    checkPercent();
  };

  const scratch = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getPointerPos(e);

    ctx.globalCompositeOperation = "destination-out";
    
    // Crear un pincel con forma circular simulando una moneda
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2, false);
    ctx.fill();
    
    // Suavizar el borde del raspado
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, brushSize / 1.5);
    gradient.addColorStop(0, "rgba(0,0,0,1)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.arc(x, y, brushSize, 0, Math.PI * 2, false);
    ctx.fill();
  };

  const checkPercent = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    const totalPixels = pixels.length / 4;
    let clearPixels = 0;

    // Si alpha es 0, está transparente (raspado)
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) {
        clearPixels++;
      }
    }

    const currentPercent = (clearPixels / totalPixels) * 100;

    if (currentPercent >= finishPercent && !isRevealed) {
      setIsRevealed(true);
      // Fade out de lo que queda de pintura
      canvas.style.transition = "opacity 0.6s ease-out";
      canvas.style.opacity = "0";
      setTimeout(() => {
        onComplete();
      }, 600);
    }
  };

  // Prevenir scroll en tactil global solo cuando estamos dibujando
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const preventScroll = (e: TouchEvent) => {
       if (isDrawing && e.cancelable) e.preventDefault();
    };

    container.addEventListener("touchmove", preventScroll, { passive: false });
    return () => container.removeEventListener("touchmove", preventScroll);
  }, [isDrawing]);


  return (
    <motion.div
      ref={containerRef}
      className="relative select-none touch-none overflow-hidden rounded-2xl shadow-neon-gold"
      style={{ width, height }}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      whileHover={{ scale: isRevealed ? 1 : 1.02 }}
    >
      {/* Contenido (Premio) debajo del raspe */}
      <div className="absolute inset-0 z-0 flex items-center justify-center bg-pitch-dark text-white p-4">
        {children}
      </div>

      {/* Canvas para raspar por encima */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-10 block cursor-pointer touch-none"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onTouchCancel={handlePointerUp}
      />
    </motion.div>
  );
}
