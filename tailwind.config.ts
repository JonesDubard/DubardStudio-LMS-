import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        brand: {
          primary: "var(--brand-primary)",
          secondary: "var(--brand-secondary)",
          bg: "var(--brand-bg)",
          text: "var(--brand-text)",
          hover: "var(--brand-hover)",
          active: "var(--brand-active)",
          subtle: "var(--brand-subtle)",
          border: "var(--brand-border)",
          ring: "var(--brand-ring)",
        },
        canvas: "var(--surface-page)",
        surface: {
          DEFAULT: "var(--surface-primary)",
          muted: "var(--surface-secondary)",
          disabled: "var(--surface-disabled)",
        },
        ink: {
          DEFAULT: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          disabled: "var(--text-disabled)",
        },
        line: {
          DEFAULT: "var(--border-primary)",
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
        },
        success: {
          DEFAULT: "var(--success)",
          subtle: "var(--success-subtle)",
          border: "var(--success-border)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          subtle: "var(--warning-subtle)",
          border: "var(--warning-border)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          subtle: "var(--danger-subtle)",
          border: "var(--danger-border)",
          ring: "var(--danger-ring)",
        },
        info: {
          DEFAULT: "var(--info)",
          subtle: "var(--info-subtle)",
          border: "var(--info-border)",
        },
        overlay: "var(--overlay)",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
