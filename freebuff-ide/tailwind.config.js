/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ide': {
          'bg': '#0d1117',
          'surface': '#161b22',
          'border': '#30363d',
          'text': '#c9d1d9',
          'text-muted': '#8b949e',
          'accent': '#58a6ff',
          'accent-hover': '#79c0ff',
          'success': '#3fb950',
          'warning': '#d29922',
          'error': '#f85149',
          'info': '#58a6ff',
          'sidebar': '#0d1117',
          'editor': '#0d1117',
          'terminal': '#0d1117',
          'chat': '#161b22',
        }
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
