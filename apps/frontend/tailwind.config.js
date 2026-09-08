export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      animation: {
        marquee: "marquee 6s ease-in-out infinite alternate",
      },
      keyframes: {
        marquee: {
          "0%, 15%": { transform: "translateX(0)" },
          "85%, 100%": { transform: "translateX(calc(-1 * var(--marquee-distance)))" },
        },
      },
      colors: {
        ui: {
          canvas: "rgb(var(--ui-canvas) / <alpha-value>)",
          sidebar: "rgb(var(--ui-sidebar) / <alpha-value>)",
          surface: "rgb(var(--ui-surface) / <alpha-value>)",
          raised: "rgb(var(--ui-raised) / <alpha-value>)",
          row: "rgb(var(--ui-row) / <alpha-value>)",
          selected: "rgb(var(--ui-selected) / <alpha-value>)",
          border: "rgb(var(--ui-border) / <alpha-value>)",
          separator: "rgb(var(--ui-separator) / <alpha-value>)",
          "border-strong": "rgb(var(--ui-border-strong) / <alpha-value>)",
          accent: "rgb(var(--ui-accent) / <alpha-value>)",
          "accent-contrast": "rgb(var(--ui-accent-contrast) / <alpha-value>)",
          text: "rgb(var(--ui-text) / <alpha-value>)",
          "text-soft": "rgb(var(--ui-text-soft) / <alpha-value>)",
          "text-mute": "rgb(var(--ui-text-mute) / <alpha-value>)",
        },
        state: {
          idle: "rgb(var(--state-idle) / <alpha-value>)",
          running: "rgb(var(--state-running) / <alpha-value>)",
          live: "rgb(var(--state-live) / <alpha-value>)",
          pending: "rgb(var(--state-pending) / <alpha-value>)",
          done: "rgb(var(--state-done) / <alpha-value>)",
          failed: "rgb(var(--state-failed) / <alpha-value>)",
        },
        medal: {
          gold: "rgb(var(--medal-gold) / <alpha-value>)",
          silver: "rgb(var(--medal-silver) / <alpha-value>)",
          bronze: "rgb(var(--medal-bronze) / <alpha-value>)",
        },
        difficulty: {
          1: "#22C55E",
          2: "#EAB308",
          3: "#F97316",
          4: "#DC2626",
          5: "#7E22CE",
        },
        chart: {
          novice: "#21CCE8",
          easy: "#E29C18",
          medium: "#FF3030",
          hard: "#66C955",
          expert: "#B45CFF",
          edit: "#8B8B8B",
        },
        score: {
          base: "rgb(var(--score-base) / <alpha-value>)",
          1: "rgb(var(--score-1) / <alpha-value>)",
          2: "rgb(var(--score-2) / <alpha-value>)",
          3: "rgb(var(--score-3) / <alpha-value>)",
          4: "rgb(var(--score-4) / <alpha-value>)",
          failed: "rgb(var(--score-failed) / <alpha-value>)",
        },
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgb(var(--ui-shadow) / var(--ui-shadow-alpha))",
        DEFAULT:
          "0 1px 3px 0 rgb(var(--ui-shadow) / var(--ui-shadow-alpha)), 0 1px 2px -1px rgb(var(--ui-shadow) / var(--ui-shadow-alpha))",
        md: "0 4px 6px -1px rgb(var(--ui-shadow) / var(--ui-shadow-alpha)), 0 2px 4px -2px rgb(var(--ui-shadow) / var(--ui-shadow-alpha))",
        lg: "0 10px 15px -3px rgb(var(--ui-shadow) / var(--ui-shadow-alpha)), 0 4px 6px -4px rgb(var(--ui-shadow) / var(--ui-shadow-alpha))",
        xl: "0 20px 25px -5px rgb(var(--ui-shadow) / var(--ui-shadow-alpha)), 0 8px 10px -6px rgb(var(--ui-shadow) / var(--ui-shadow-alpha))",
        card: "0 2px 6px rgb(var(--ui-shadow) / var(--ui-shadow-alpha))",
        live: "0 6px 16px -6px rgb(var(--ui-shadow) / calc(var(--ui-shadow-alpha) * 2.5)), 0 2px 6px rgb(var(--ui-accent) / 0.14)",
      },
      borderRadius: {
        DEFAULT: "0.625rem",
        md: "0.625rem",
        lg: "0.625rem",
        xl: "0.75rem",
      },
      zIndex: {
        dropdown: "20",
        sidebar: "50",
        modal: "9999",
        toast: "99999",
      },
    },
  },
  plugins: [],
};
