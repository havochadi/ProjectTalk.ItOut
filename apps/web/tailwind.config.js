/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        sm: '100%',
        md: '100%',
        lg: '1280px',
        xl: '1536px',
        '2xl': '100%',
      },
    },
    extend: {
      fontSize: {
        'xs':   ['0.8rem',  { lineHeight: '1.5' }],
        'sm':   ['0.925rem',{ lineHeight: '1.55' }],
        'base': ['1.05rem', { lineHeight: '1.65' }],
        'lg':   ['1.2rem',  { lineHeight: '1.6' }],
        'xl':   ['1.35rem', { lineHeight: '1.55' }],
        '2xl':  ['1.6rem',  { lineHeight: '1.45' }],
        '3xl':  ['2rem',    { lineHeight: '1.35' }],
        '4xl':  ['2.5rem',  { lineHeight: '1.25' }],
        '5xl':  ['3rem',    { lineHeight: '1.15' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        xl:   'var(--radius-xl)',
        '2xl':'var(--radius-2xl)',
        '3xl':'2rem',
        '4xl':'2.5rem',
      },
      colors: {
        /* ── CSS-variable tokens ───────────────────────────── */
        bg:          'var(--bg)',
        surface:     'var(--surface)',
        'surface-alt':'var(--surface-alt)',
        text:        'var(--text)',
        muted:       'var(--muted)',
        border:      'var(--border)',
        borderDark:  'var(--border-dark)',
        primary:     'var(--primary)',
        'primary-l': 'var(--primary-light)',
        'primary-d': 'var(--primary-dark)',

        /* ── Vibrant & Playful Palette ─────────────────────── */
        wellness: {
          /* Violet – primary brand, punched up */
          sage: {
            50:  '#F5F0FF',
            100: '#E6D9FE',
            200: '#D0B8FD',
            300: '#B594FC',
            400: '#9B6FF9',
            500: '#7C3AED',
            600: '#6024D2',
            700: '#4A1BA8',
            800: '#371480',
            900: '#250D57',
          },
          /* Lavender – secondary violet accent */
          lavender: {
            50:  '#F5EFFF',
            100: '#E5D8FE',
            200: '#D0B8FD',
            300: '#BB9AFB',
            400: '#A78BFA',
            500: '#8B5CF6',
            600: '#6D3FD9',
            700: '#502DA8',
            800: '#361E77',
            900: '#20114A',
          },
          /* Peach – sunset orange, energy accent */
          peach: {
            50:  '#FFF4EB',
            100: '#FDBA74',
            200: '#FDA855',
            300: '#FB923C',
            400: '#F97A1F',
            500: '#EA640C',
            600: '#C2510A',
            700: '#973E08',
            800: '#6C2C06',
            900: '#3F1903',
          },
          /* Sky – bright cyan-blue accent */
          sky: {
            50:  '#E4F6FF',
            100: '#C2ECFF',
            200: '#93DEFF',
            300: '#5FCCFB',
            400: '#38BDF8',
            500: '#1F9FDB',
            600: '#157EB3',
            700: '#0E5D85',
            800: '#093F5A',
            900: '#052232',
          },
          /* Neutral – warm violet greys */
          neutral: {
            50:  '#FAF8FE',
            100: '#F0EBFA',
            200: '#DFD6F0',
            300: '#C3B4E0',
            400: '#A08FC4',
            500: '#7E6DA3',
            600: '#5F5080',
            700: '#463A5F',
            800: '#2E263F',
            900: '#191423',
          },
        },

        /* ── Legacy aliases (keep existing pages from breaking) ── */
        'ti-primary': {
          100: '#E6D9FE',
          500: '#7C3AED',
          600: '#6024D2',
          700: '#4A1BA8',
        },
        'ti-mint':  '#38BDF8',
        'ti-sky':   '#93DEFF',
        'ti-peach': '#FDBA74',

        /* Simplified beige→sage mapping */
        beige1: 'var(--primary)',
        beige2: 'var(--sage-light)',
        beige3: 'var(--sage-pale)',
        brown1: 'var(--primary-dark)',

        /* Hot accents used in the sunset gradient */
        'accent-pink':   'var(--accent-pink)',
        'accent-orange': 'var(--accent-orange)',

        /* Scheduler module — intentionally-dark panel UI */
        panel: {
          bg:        'var(--panel-dark-bg)',
          surface:   'var(--panel-dark-surface)',
          alt:       'var(--panel-dark-surface-alt)',
          border:    'var(--panel-dark-border)',
        },
      },

      backgroundImage: {
        'hero-wellness':
          'radial-gradient(ellipse at 20% 20%, rgba(124,58,237,0.14), transparent 55%), radial-gradient(ellipse at 80% 10%, rgba(236,72,153,0.10), transparent 50%)',
        'gradient-sage':
          'linear-gradient(135deg, rgba(124,58,237,0.16) 0%, rgba(167,139,250,0.26) 100%)',
        'gradient-lavender':
          'linear-gradient(135deg, rgba(139,92,246,0.14) 0%, rgba(214,200,254,0.22) 100%)',
        'gradient-peach':
          'linear-gradient(135deg, rgba(251,146,60,0.22) 0%, rgba(253,186,116,0.32) 100%)',
        'chat-pattern':
          'radial-gradient(circle at 10% 20%, rgba(124,58,237,0.06), transparent 40%), radial-gradient(circle at 90% 80%, rgba(236,72,153,0.05), transparent 40%)',
        'card-gradient':
          'linear-gradient(135deg, #FFFFFF 0%, #F1EBFF 100%)',
        'gradient-sunset': 'var(--gradient-sunset)',
      },

      boxShadow: {
        card:        '0 2px 12px rgba(124,58,237,0.06)',
        'card-hover':'0 10px 30px rgba(124,58,237,0.14)',
        soft:        'var(--shadow-soft)',
        glow:        '0 0 24px rgba(124,58,237,0.32)',
        'glow-lav':  '0 0 24px rgba(139,92,246,0.28)',
        'glow-pink': '0 0 24px rgba(236,72,153,0.32)',
      },

      fontFamily: {
        sans:     ['"Nunito"', 'Inter', 'system-ui', 'sans-serif'],
        display:  ['"Space Grotesk"', 'Nunito', 'system-ui', 'sans-serif'],
        friendly: ['"Nunito"', 'Inter', 'sans-serif'],
      },

      animation: {
        'fade-in':       'fadeIn 0.25s ease-out',
        'slide-up':      'slideUp 0.3s ease-out',
        'slide-in':      'slideIn 0.3s ease-out',
        'pulse-slow':    'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow':          'glow 2.5s ease-in-out infinite alternate',
        'float':         'float 4s ease-in-out infinite',
        'breathe':       'breathe 4s ease-in-out infinite',
        'bounce-in':     'bounceIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',     opacity: '1' },
        },
        slideIn: {
          '0%':   { transform: 'translateX(-12px)', opacity: '0' },
          '100%': { transform: 'translateX(0)',      opacity: '1' },
        },
        glow: {
          '0%':   { boxShadow: '0 0 20px rgba(124,58,237,0.25)' },
          '100%': { boxShadow: '0 0 32px rgba(236,72,153,0.35)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-8px)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)',    opacity: '0.8' },
          '50%':       { transform: 'scale(1.06)', opacity: '1' },
        },
        bounceIn: {
          '0%':   { transform: 'scale(0.9)',  opacity: '0' },
          '60%':  { transform: 'scale(1.03)', opacity: '1' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
      },

      transitionTimingFunction: {
        pleasant: 'cubic-bezier(.22,.61,.36,1)',
      },
    },
  },
  plugins: [],
};
