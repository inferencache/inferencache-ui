import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        page:    "var(--body-bg)",
        panel:   "var(--bg-surface)",
        surface: "var(--bg-surface-secondary)",
        raised:  "var(--border-color-light)",
        border: {
          DEFAULT: "var(--border-color)",
          bright:  "var(--border-translucent)",
          faint:   "var(--border-color-light)",
        },
        t: {
          1: "var(--text)",
          2: "var(--text-secondary)",
          3: "var(--text-muted)",
          4: "var(--text-disabled)",
        },
        teal: {
          DEFAULT: "var(--primary)",
          bright:  "var(--primary)",
          dim:     "var(--primary-dk)",
          muted:   "var(--primary-lt)",
        },
        cyan:    "#17a2b8",
        purple: {
          DEFAULT: "var(--purple)",
          bright:  "var(--purple)",
          dim:     "#8a2da0",
        },
        red: {
          DEFAULT: "var(--red)",
          dim:     "#a82b2b",
          dark:    "#8b2020",
        },
        orange:  "var(--orange)",
        amber:   "var(--yellow)",
        green: {
          DEFAULT: "var(--green)",
          dim:     "#1a8a32",
        },
        blue: {
          DEFAULT: "var(--blue)",
          dim:     "#0550a0",
        },
        accent:   { DEFAULT: "var(--primary)", bright: "var(--primary)" },
        "hit-exact":    "var(--green)",
        "hit-semantic": "var(--orange)",
        miss:     "var(--red)",
        token:    "var(--purple)",
        cost:     "var(--orange)",
        "bg-primary":   "var(--body-bg)",
        "bg-secondary": "var(--bg-surface)",
        "bg-tertiary":  "var(--bg-surface-secondary)",
        "bg-surface":   "var(--bg-surface)",
        "text-primary":   "var(--text)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary":  "var(--text-muted)",
      },
      borderRadius: {
        card:  "14px",
        panel: "12px",
        btn:   "10px",
        input: "12px",
        chip:  "9999px",
      },
      fontFamily: {
        sans: ["var(--font)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["10px", "14px"],
        xs:    ["11px", "16px"],
        sm:    ["12px", "18px"],
        base:  ["14px", "20px"],
      },
      boxShadow: {
        card:  "var(--shadow-card)",
        panel: "0 4px 12px rgba(30, 38, 51, 0.08)",
        glow:  "0 0 12px rgba(255, 140, 66, 0.2)",
      },
    },
  },
  plugins: [],
};

export default config;
