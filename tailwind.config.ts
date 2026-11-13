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
        product: {
          navy: "var(--product-navy)",
          blue: "var(--product-blue)",
          soft: "var(--product-blue-soft)",
        },
        overlay: "var(--overlay)",
      },
      boxShadow: {
        card: "0 1px 2px rgb(23 32 51 / 0.04), 0 10px 28px -18px rgb(23 43 77 / 0.28)",
        lift: "0 8px 24px -12px rgb(23 43 77 / 0.22)",
      },
    },
  },
  plugins: [],
};

export default config;
