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
          /* === Core Surfaces (CSS Variables) === */
          'bg':          'var(--surface-bg)',
          'bg-alt':      '#0f1424',
          'surface':     'var(--surface-1)',
          'surface-alt': 'var(--surface-2)',
          'elevated':    '#1e293b',
          'panel':       '#151c2e',
          
          /* === Brand Colors === */
          'brand':       'var(--brand-primary)',
          'brand-dark':  'var(--brand-primary-dark)',
          'brand-light': 'var(--brand-primary-light)',
          'brand-glow':  'rgba(59, 130, 246, 0.15)',
          'brand-50':    'rgba(59, 130, 246, 0.05)',
          'brand-100':   'rgba(59, 130, 246, 0.10)',
          'brand-200':   'rgba(59, 130, 246, 0.20)',
          
          /* === Accent (Purple) === */
          'accent':      'var(--brand-accent)',
          'accent-dark': 'var(--brand-accent-dark)',
          'accent-light':'#a78bfa',
          
          /* === Semantic === */
          'success':     '#10b981',
          'success-dark':'#059669',
          'warning':     '#f59e0b',
          'warning-dark':'#d97706',
          'error':       '#ef4444',
          'error-dark':  '#dc2626',
          'info':        '#06b6d4',
          'info-dark':   '#0891b2',
          
          /* === Text (CSS Variables) === */
          'text':        'var(--text-primary)',
          'text-secondary': 'var(--text-secondary)',
          'text-muted':  'var(--text-muted)',
          'text-dim':    '#475569',
          
          /* === Borders (CSS Variables) === */
          'border':      'var(--border-subtle)',
          'border-light':'var(--border-medium)',
          'border-focus':'var(--brand-primary)',
          
          /* === Named Panels === */
          'sidebar':     '#0d1220',
          'editor':      'var(--surface-bg)',
          'terminal':    '#0a0e1a',
          'chat':        'var(--surface-1)',
          'titlebar':    '#0d1220',
          'statusbar':   '#0d1220',
        }
      },
      
      /* === Brand Gradients === */
      backgroundImage: {
        'brand-gradient':   'var(--brand-gradient)',
        'brand-subtle':     'var(--brand-gradient-subtle)',
        'brand-glow':       'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(124, 58, 237, 0.15) 100%)',
        'surface-gradient': 'linear-gradient(180deg, #111827 0%, #0d1220 100%)',
        'titlebar-gradient':'linear-gradient(90deg, #0d1220 0%, #111827 50%, #0d1220 100%)',
        'sidebar-gradient': 'linear-gradient(180deg, #0d1220 0%, #0a0e1a 100%)',
        'accent-line':      'linear-gradient(90deg, #2563eb 0%, #7c3aed 50%, #a855f7 100%)',
        'hover-glow':       'linear-gradient(135deg, rgba(59, 130, 246, 0.06) 0%, rgba(139, 92, 246, 0.06) 100%)',
      },
      
      boxShadow: {
        'brand':        '0 0 20px rgba(59, 130, 246, 0.15)',
        'brand-lg':     '0 0 40px rgba(59, 130, 246, 0.20)',
        'brand-sm':     '0 0 10px rgba(59, 130, 246, 0.10)',
        'glow':         '0 0 15px rgba(139, 92, 246, 0.15)',
        'glow-lg':      '0 0 30px rgba(139, 92, 246, 0.20)',
        'surface':      '0 1px 3px rgba(0, 0, 0, 0.3)',
        'elevated':     '0 4px 12px rgba(0, 0, 0, 0.4)',
        'panel':        '0 2px 8px rgba(0, 0, 0, 0.3)',
        'inner-glow':   'inset 0 1px 0 rgba(255, 255, 255, 0.03)',
      },
      
      fontFamily: {
        'mono':  ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
        'sans':  ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        'brand': ['Inter', 'system-ui', 'sans-serif'],
      },
      
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      
      animation: {
        'brand-pulse':  'brandPulse 3s ease-in-out infinite',
        'glow':         'glow 2s ease-in-out infinite alternate',
        'slide-in-up':  'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-down':'slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left':'slideLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in':      'fadeIn 0.2s ease-out',
        'scale-in':     'scaleIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer':      'shimmer 2s linear infinite',
        'float':        'float 6s ease-in-out infinite',
        'typewriter':   'typewriter 0.8s steps(20) forwards',
      },
      
      keyframes: {
        brandPulse: {
          '0%, 100%': { opacity: '0.4' },
          '50%':      { opacity: '1' },
        },
        glow: {
          '0%':   { boxShadow: '0 0 5px rgba(59, 130, 246, 0.1)' },
          '100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%':   { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideLeft: {
          '0%':   { transform: 'translateX(10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%':   { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-4px)' },
        },
      },
      
      backdropBlur: {
        'xs': '2px',
      },
      
      transitionDuration: {
        '250': '250ms',
      },
    },
  },
  plugins: [],
}