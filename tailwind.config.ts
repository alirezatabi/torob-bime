import type { Config } from "tailwindcss";
const rgb = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["var(--font-vazir-arabic)", "var(--font-vazir-latin)", "sans-serif"] },
      fontSize: { xs: ["0.8125rem", "1.45"], sm: ["0.9375rem", "1.65"] },
      colors: {
        surface: {
          DEFAULT: rgb("surface"),
          muted: rgb("surface-muted"),
          raised: rgb("surface-raised"),
        },
        border: rgb("border"),
        text: { DEFAULT: rgb("text"), muted: rgb("text-muted") },
        ink: rgb("text"),
        muted: rgb("text-muted"),
        line: rgb("border"),
        paper: rgb("surface-muted"),
        brand: {
          DEFAULT: rgb("brand"),
          strong: rgb("brand-strong"),
          soft: rgb("brand-soft"),
          dark: rgb("brand-strong"),
          light: rgb("brand-soft"),
        },
        "on-brand": rgb("on-brand"),
        success: { DEFAULT: rgb("success"), soft: rgb("success-soft"), strong: rgb("success") },
        warning: { DEFAULT: rgb("warning"), soft: rgb("warning-soft"), strong: rgb("warning") },
        danger: { DEFAULT: rgb("danger"), soft: rgb("danger-soft"), strong: rgb("danger") },
        info: { DEFAULT: rgb("info"), soft: rgb("info-soft"), strong: rgb("info") },
      },
      boxShadow: { card: "var(--shadow-card)", float: "var(--shadow-float)" },
    },
  },
  plugins: [],
};
export default config;
