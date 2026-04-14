// Utilidad para reproducir sonidos sin necesidad de archivos externos usando Web Audio API.

let audioCtx: AudioContext | null = null;

function getContext() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Win = window as Window & { webkitAudioContext?: typeof AudioContext };
    const Ctor = Win.AudioContext ?? Win.webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  return audioCtx;
}

// Reproduce un sonido de "ganador" (Arpegio Triunfal)
export function playWinSound() {
  const ctx = getContext();
  if (!ctx) return;
  
  if (ctx.state === "suspended") ctx.resume();

  const notes = [440.00, 554.37, 659.25, 880.00]; // A4, C#5, E5, A5 (Acorde Mayor Feliz)
  const startTime = ctx.currentTime;

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, startTime + i * 0.1);

    gain.gain.setValueAtTime(0, startTime + i * 0.1);
    gain.gain.linearRampToValueAtTime(0.3, startTime + i * 0.1 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + i * 0.1 + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime + i * 0.1);
    osc.stop(startTime + i * 0.1 + 0.6);
  });
}

// Reproduce un sonido de "perdedor" (Tono descendente)
export function playLoseSound() {
  const ctx = getContext();
  if (!ctx) return;

  if (ctx.state === "suspended") ctx.resume();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5);

  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.5);
}

// Sonido de raspar (Ruido blanco interactivo)
let scratchOsc: OscillatorNode | null = null;
let scratchGain: GainNode | null = null;
let scratchFilter: BiquadFilterNode | null = null;

export function startScratchSound() {
  const ctx = getContext();
  if (!ctx) return;

  if (ctx.state === "suspended") ctx.resume();
  
  if (scratchGain) return; // Ya está sonando

  // Usar múltiples osciladores desfasados para generar un ruido sordo tipo "raspado duro"
  scratchOsc = ctx.createOscillator();
  scratchOsc.type = "square";
  scratchOsc.frequency.setValueAtTime(50, ctx.currentTime);

  scratchFilter = ctx.createBiquadFilter();
  scratchFilter.type = "lowpass";
  scratchFilter.frequency.setValueAtTime(1000, ctx.currentTime);
  scratchFilter.Q.setValueAtTime(1, ctx.currentTime);

  scratchGain = ctx.createGain();
  scratchGain.gain.setValueAtTime(0, ctx.currentTime);
  // Volume bajo para un efecto sutil
  scratchGain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.05); 

  scratchOsc.connect(scratchFilter);
  scratchFilter.connect(scratchGain);
  scratchGain.connect(ctx.destination);

  scratchOsc.start();
}

export function modulateScratchSound(velocity: number) {
  if (!scratchFilter || !scratchGain) return;
  const ctx = getContext();
  if (!ctx || ctx.state === "suspended") return;
  
  // Modula la frecuencia o el ruido según la velocidad del dedo
  const maxFreq = 4000;
  const targetFreq = Math.min(maxFreq, 200 + velocity * 20);
  
  scratchFilter.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.1);
  scratchGain.gain.setTargetAtTime(0.08, ctx.currentTime, 0.1);
}

export function stopScratchSound() {
  if (!scratchOsc || !scratchGain) return;
  const ctx = getContext();
  if (!ctx) return;

  scratchGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
  const oscToStop = scratchOsc;
  setTimeout(() => {
    try {
      oscToStop.stop();
    } catch {
      /* ya detenido */
    }
  }, 100);

  scratchOsc = null;
  scratchGain = null;
}
