import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-outfit)", "system-ui", "sans-serif"],
        body: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        sg: {
          blue: "#002b60", // Azul oscuro corporativo Supergiros
          "blue-light": "#0047a0",
          "blue-dark": "#001a3b",
          cyan: "#00b2e3", // Cyan vibrante de la onda
          "cyan-light": "#33c1e8",
        },
        gold: {
          DEFAULT: "#f4c430",
          light: "#ffe066",
          dark: "#c9a227",
        },
        neon: {
          blue: "#00f3ff",
          purple: "#9d4edd",
          pink: "#ff007f",
        },
        cup: "#e8e8e8",
      },
      backgroundImage: {
        "stadium-noise": "url('/noise.png')",
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "glass-gradient": "linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0))",
      },
      boxShadow: {
        "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "neon-gold": "0 0 20px rgba(244, 196, 48, 0.5), 0 0 40px rgba(244, 196, 48, 0.3)",
        "neon-blue": "0 0 15px rgba(0, 243, 255, 0.5), 0 0 30px rgba(0, 243, 255, 0.3)",
      },
      animation: {
        "shimmer": "shimmer 2.5s ease-in-out infinite",
        "float": "float 4s ease-in-out infinite",
        "pulse-glow": "pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 8s linear infinite",
      },
      keyframes: {
        shimmer: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 20px rgba(244, 196, 48, 0.5)" },
          "50%": { opacity: ".7", boxShadow: "0 0 10px rgba(244, 196, 48, 0.2)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
