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
        pitch: {
          DEFAULT: "#0d3b2c",
          light: "#1a5c45",
        },
        gold: {
          DEFAULT: "#f4c430",
          dark: "#c9a227",
        },
        cup: "#e8e8e8",
      },
      backgroundImage: {
        "stadium-noise":
          "radial-gradient(ellipse at 50% 0%, rgba(244,196,48,0.15) 0%, transparent 55%)",
      },
      animation: {
        shimmer: "shimmer 2.5s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
      },
      keyframes: {
        shimmer: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
