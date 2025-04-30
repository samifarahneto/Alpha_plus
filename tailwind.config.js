/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/pages/**/*.{js,jsx,ts,tsx}",
  ],
  important: true,
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        primary: "#2563eb",
        secondary: "#4b5563",
        success: "#10b981",
        danger: "#ef4444",
        warning: "#f59e0b",
      },
    },
  },
  corePlugins: {
    preflight: true,
  },
  plugins: [require("@tailwindcss/forms")],
  safelist: [
    "bg-white",
    "shadow-lg",
    "rounded-2xl",
    "border",
    "border-gray-100",
    "hover:shadow-xl",
    "transition-all",
    "duration-300",
    "text-lg",
    "font-semibold",
    "text-gray-700",
    "mb-4",
    "cursor-pointer",
    "hover:text-blue-600",
  ],
};
