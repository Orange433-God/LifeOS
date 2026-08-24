/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 暖灰（温暖生活）
        warm: {
          50: '#FBF9F6',
          100: '#F5F1EC',
          200: '#EAE3DA',
          300: '#D8CCC0',
          400: '#B8A99A',
          500: '#9C8A7A',
          600: '#7D6C5F',
          700: '#615448',
          800: '#423A32',
        },
        // 淡蓝（未来科技）
        mist: {
          50: '#F4F8FC',
          100: '#E7F0F9',
          200: '#D3E4F3',
          300: '#AFCDEA',
          400: '#84B0DC',
          500: '#5E93C9',
          600: '#4277AC',
          700: '#345E8A',
          800: '#2A4A6C',
        },
        // 柔白
        soft: '#FFFFFF',
        // 深夜蓝灰（夜晚书房背景）
        night: {
          950: '#090D18',
          900: '#0D1322',
          800: '#131B30',
          700: '#1A2440',
          600: '#243154',
          500: '#31426E',
        },
        // 蓝紫（科技感强调色）
        iris: {
          300: '#B6C0FF',
          400: '#96A3FF',
          500: '#7A87F5',
          600: '#636EDC',
          700: '#4F58B8',
        },
        // 暖金（完成度/等级等特别数据）
        gold: {
          300: '#FFD489',
          400: '#F8BE62',
          500: '#ECA94A',
          600: '#D98F2F',
        },
      },
      fontFamily: {
        display: ['"Noto Serif SC"', 'STZhongsong', 'serif'],
        sans: ['"Noto Sans SC"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(90, 110, 140, 0.12)',
        'glass-lg': '0 16px 48px rgba(90, 110, 140, 0.18)',
      },
      animation: {
        'float-slow': 'float 8s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
      },
    },
  },
  plugins: [],
}
