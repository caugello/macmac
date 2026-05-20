/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
          container: 'var(--primary-container)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
          container: 'var(--secondary-container)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        surface: {
          DEFAULT: 'var(--surface)',
          'container-lowest': 'var(--surface-container-lowest)',
          'container-low': 'var(--surface-container-low)',
          container: 'var(--surface-container)',
          'container-high': 'var(--surface-container-high)',
          'container-highest': 'var(--surface-container-highest)',
          variant: 'var(--surface-variant)',
        },
        outline: {
          DEFAULT: 'var(--outline)',
          variant: 'var(--outline-variant)',
        },
        tertiary: {
          DEFAULT: 'var(--tertiary)',
          container: 'var(--tertiary-container)',
        },
        'on-primary': 'var(--primary-foreground)',
        'on-surface': 'var(--foreground)',
        'on-surface-variant': 'var(--muted-foreground)',
        'on-primary-container': 'var(--on-primary-container)',
        'on-secondary-container': 'var(--on-secondary-container)',
        'on-tertiary-container': 'var(--on-tertiary-container)',
        'error-container': 'var(--error-container)',
        'on-error-container': 'var(--on-error-container)',
        'inverse-surface': 'var(--inverse-surface)',
        'inverse-on-surface': 'var(--inverse-on-surface)',
        'inverse-primary': 'var(--inverse-primary)',
        'surface-tint': 'var(--surface-tint)',
        'surface-dim': 'var(--surface-dim)',
        'surface-bright': 'var(--surface-bright)',
        'primary-fixed': {
          DEFAULT: 'var(--primary-fixed)',
          dim: 'var(--primary-fixed-dim)',
        },
        'on-primary-fixed': {
          DEFAULT: 'var(--on-primary-fixed)',
          variant: 'var(--on-primary-fixed-variant)',
        },
        'secondary-fixed': {
          DEFAULT: 'var(--secondary-fixed)',
          dim: 'var(--secondary-fixed-dim)',
        },
        'on-secondary-fixed': {
          DEFAULT: 'var(--on-secondary-fixed)',
          variant: 'var(--on-secondary-fixed-variant)',
        },
        'tertiary-fixed': {
          DEFAULT: 'var(--tertiary-fixed)',
          dim: 'var(--tertiary-fixed-dim)',
        },
        'on-tertiary-fixed': {
          DEFAULT: 'var(--on-tertiary-fixed)',
          variant: 'var(--on-tertiary-fixed-variant)',
        },
        nutri: {
          a: 'var(--nutri-a)',
          b: 'var(--nutri-b)',
          c: 'var(--nutri-c)',
          d: 'var(--nutri-d)',
          e: 'var(--nutri-e)',
        },
      },
      spacing: {
        'stack-sm': '12px',
        'stack-md': '24px',
        'stack-lg': '40px',
        'margin-mobile': '16px',
        'margin-desktop': '48px',
        'gutter': '24px',
      },
      fontFamily: {
        heading: ['Literata', 'Georgia', 'serif'],
        body: ['Plus Jakarta Sans', 'sans-serif'],
      },
      fontSize: {
        'headline-xl': ['32px', { lineHeight: '40px', letterSpacing: '-0.02em', fontWeight: '800' }],
        'headline-lg': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'headline-md': ['20px', { lineHeight: '28px', fontWeight: '700' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '600' }],
        'label-sm': ['11px', { lineHeight: '14px', fontWeight: '700' }],
        'headline-xl-mobile': ['26px', { lineHeight: '32px', fontWeight: '800' }],
        'headline-md-mobile': ['20px', { lineHeight: '28px', fontWeight: '700' }],
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
        full: '9999px',
      },
    },
  },
  plugins: [],
}
