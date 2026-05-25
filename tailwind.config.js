/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
      },
      colors: {
        sky: '#87CEEB',
        ground: '#8B4513',
        grass: '#228B22',
        bird: '#FFD700',
        beak: '#FF8C00',
        pipe: '#2E8B57',
        neon: '#00ff88',
        dark: '#1a1a2e',
      },
    },
  },
  plugins: [],
}
