/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        '3xl': '1600px',
        '4xl': '1920px',
        '5xl': '2560px',  // 2K 屏幕
      },
      colors: {
        'primary': '#3b82f6',
        'danger': '#ef4444',
        'success': '#10b981',
        'warning': '#f59e0b',
        'info': '#06b6d4',
        'text-primary': '#1f2937',
        'text-secondary': '#64748b',
        'bg-light': '#f8fafc',
        'border-light': '#e5e7eb',
        'card': 'rgba(0, 0, 0, 0.05)',
        'card-hover': 'rgba(0, 0, 0, 0.1)',
        'modal': 'rgba(0, 0, 0, 0.15)',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.05)',
        'modal': '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
}
