/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // 自定义动画
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      // 自定义颜色
      colors: {
        'apple-blue': '#007AFF',
        'apple-gray': '#F2F2F7',
        'apple-dark': '#1C1C1E',
      },
      // 自定义字体
      fontFamily: {
        'apple': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      // 自定义间距
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      // 自定义缩放
      scale: {
        '102': '1.02',
      },
      // 自定义圆角
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      // 自定义阴影
      boxShadow: {
        'apple': '0 4px 20px rgba(0, 0, 0, 0.1)',
        'apple-lg': '0 10px 40px rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [],
}
