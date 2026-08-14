/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // DESIGN.md §4.1 palette
        brand: {
          darkest:  "#0F3D2E",
          dark:     "#14532D",
          mid:      "#16A34A",
          light:    "#DCFCE7",
          lighter:  "#F0FDF4",
        },
        success:  "#22C55E",
        warning:  "#F59E0B",
        danger:   "#EF4444",
        info:     "#3B82F6",
        purple:   "#8B5CF6",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.05)",
        "card-hover": "0 4px 12px 0 rgba(0,0,0,0.12)",
      },
    },
  },
  plugins: [],
}
