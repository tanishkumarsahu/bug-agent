import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        "primary-container": "#4338ca",
        "primary": "#2a14b4",
        "background": "#f9f9ff",
        "surface": "#f9f9ff",
        "on-surface": "#141b2b",
        "on-surface-variant": "#464554",
        "surface-container": "#e9edff",
        "surface-container-high": "#e1e8fd",
        "surface-container-highest": "#dce2f7",
        "surface-container-low": "#f1f3ff",
        "surface-container-lowest": "#ffffff",
        "outline-variant": "#c7c4d7",
        "outline": "#777586",
        "error": "#ba1a1a",
      },
      fontFamily: {
        mono: ["IBM Plex Mono", "monospace"],
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
}
export default config
