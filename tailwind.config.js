export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#006662", dark: "#00403e", deep: "#00302f", soft: "#d6f1ee" },
        amber: { DEFAULT: "#f9a53a", soft: "#fdebcc" },
        cream: "#fbf9f4",
        ink: "#0c2a2a",
      },
      fontFamily: { sans: ["'Noto Sans Devanagari'", "Inter", "system-ui", "sans-serif"] },
      borderRadius: { xl2: "1.5rem" },
      boxShadow: { card: "0 6px 24px rgba(0,60,58,.08)" },
    },
  },
  plugins: [],
};
