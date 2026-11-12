import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Vazirmatn", "sans-serif"] },
      colors: {
        ink: "#242b36",
        muted: "#626d79",
        line: "#e8ebef",
        paper: "#f8f9fa",
        brand: { DEFAULT: "#cd2f3d", dark: "#ad202e", light: "#fdf0f1" },
      },
      boxShadow: {
        card: "0 8px 30px rgba(31, 41, 55, .05)",
        float: "0 18px 50px rgba(31, 41, 55, .10)",
      },
    },
  },
  plugins: [],
};
export default config;
