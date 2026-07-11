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

        /* ── Serenity Palette ──────────────────────────────── */
        wellness: {
          /* Violet – primary brand (mindline-inspired) */
          sage: {
            50:  '#F0EEFF',
            100: '#DDD8FC',
            200: '#C4B4FF',
            300: '#A89EFB',
            400: '#9485FA',
            500: '#7B6CF6',
            600: '#5A48E8',
            700: '#4234C8',
            800: '#2E22A0',
            900: '#1C1470',
          },
          /* Lavender – serenity & calm mind */
          lavender: {
            50:  '#EDE9F8',
            100: '#D4CEEF',
            200: '#B8AEDE',
            300: '#9B8ECE',
            400: '#8B7DB8',
            500: '#7B6FAD',
            600: '#5F5490',
            700: '#463E72',
            800: '#2E2852',
            900: '#1A1830',
          },
          /* Peach – warmth & hope */
          peach: {
            50:  '#FEF3EB',
            100: '#FAD5BC',
            200: '#F6B893',
            300: '#F09B6A',
            400: '#E8854F',
            500: '#D97038',
            600: '#B55B2A',
            700: '#8C461E',
            800: '#643213',
            900: '#3C1D09',
          },
          /* Sky – openness & clarity */
          sky: {
            50:  '#E5F1F8',
            100: '#C2DEEE',
            200: '#9ACAE4',
            300: '#72B4D9',
            400: '#5AA0CA',
            500: '#6BA3C4',
            600: '#4A82A6',
            700: '#366180',
            800: '#25435A',
            900: '#132536',
          },
          /* Neutral – soft warm greys */
          neutral: {
            50:  '#F5FAF8',
            100: '#E8F0EE',
            200: '#D4E4DF',
            300: '#B4CEC7',
            400: '#8EB5AC',
            500: '#6D9D93',
            600: '#527E75',
            700: '#3A5E57',
            800: '#264039',
            900: '#14221E',
          },
        },

        /* ── Legacy aliases (keep existing pages from breaking) ── */
        'ti-primary': {
          100: '#C8E0D8',
          500: '#3D8B7A',
          600: '#2A6357',
          700: '#1E4A3F',
        },
        'ti-mint':  '#6DB4A5',
        'ti-sky':   '#9ACAE4',
        'ti-peach': '#FAD5BC',

        /* Simplified beige→sage mapping */
        beige1: 'var(--primary)',
        beige2: 'var(--sage-light)',
        beige3: 'var(--sage-pale)',
        brown1: 'var(--primary-dark)',
      },

      backgroundImage: {
        'hero-wellness':
          'radial-gradient(ellipse at 20% 20%, rgba(123,108,246,0.12), transparent 55%), radial-gradient(ellipse at 80% 10%, rgba(176,111,173,0.08), transparent 50%)',
        'gradient-sage':
          'linear-gradient(135deg, rgba(123,108,246,0.15) 0%, rgba(168,157,251,0.25) 100%)',
        'gradient-lavender':
          'linear-gradient(135deg, rgba(176,111,173,0.12) 0%, rgba(212,157,212,0.20) 100%)',
        'gradient-peach':
          'linear-gradient(135deg, rgba(240,155,106,0.2) 0%, rgba(250,213,188,0.3) 100%)',
        'chat-pattern':
          'radial-gradient(circle at 10% 20%, rgba(123,108,246,0.05), transparent 40%), radial-gradient(circle at 90% 80%, rgba(176,111,173,0.04), transparent 40%)',
        'card-gradient':
          'linear-gradient(135deg, #FFFFFF 0%, #F0EEFF 100%)',
      },

      boxShadow: {
        card:        '0 2px 12px rgba(0,0,0,0.05)',
        'card-hover':'0 8px 28px rgba(0,0,0,0.10)',
        soft:        'var(--shadow-soft)',
        glow:        '0 0 24px rgba(123,108,246,0.28)',
        'glow-lav':  '0 0 24px rgba(176,111,173,0.25)',
      },

      fontFamily: {
        sans:     ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        display:  ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        friendly: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },

      animation: {
        'fade-in':       'fadeIn 0.25s ease-out',
        'slide-up':      'slideUp 0.3s ease-out',
        'slide-in':      'slideIn 0.3s ease-out',
        'pulse-slow':    'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow':          'glow 2.5s ease-in-out infinite alternate',
        'float':         'float 4s ease-in-out infinite',
        'breathe':       'breathe 4s ease-in-out infinite',
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
          '0%':   { boxShadow: '0 0 20px rgba(61,139,122,0.25)' },
          '100%': { boxShadow: '0 0 32px rgba(61,139,122,0.45)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-8px)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)',    opacity: '0.8' },
          '50%':       { transform: 'scale(1.06)', opacity: '1' },
        },
      },

      transitionTimingFunction: {
        pleasant: 'cubic-bezier(.22,.61,.36,1)',
      },
    },
  },
  plugins: [],
};
