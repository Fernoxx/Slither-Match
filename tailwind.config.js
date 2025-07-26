
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Consolas', 'Liberation Mono', 'Menlo', 'monospace'],
      },
      colors: {
        neon: {
          cyan: '#00ffff',
          pink: '#ff0080',
          purple: '#8000ff',
        },
        
        game: {
          bg: '#06010a',
          canvas: '#0a0c1a',
          border: '#1c1f2e',
          panel: '#1a1a2e',
          'panel-border': '#2d2d5e',
        }
      },
      animation: {
        'pulse-neon': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { 
            textShadow: '0 0 20px rgba(0, 255, 255, 0.8)',
            transform: 'scale(1)'
          },
          '100%': { 
            textShadow: '0 0 30px rgba(0, 255, 255, 1)',
            transform: 'scale(1.02)'
          }
        }
      },
      boxShadow: {
        'neon': '0 0 5px currentColor, 0 0 20px currentColor, 0 0 35px currentColor',
      }
    },
  },
  plugins: [],
}
