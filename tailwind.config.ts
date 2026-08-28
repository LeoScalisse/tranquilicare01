import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "'Segoe UI'", "sans-serif"],
        display: ["'Albert Sans'", "Inter", "sans-serif"],
        narrative: ["'Albert Sans'", "Inter", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        brand: {
          blue: "#38b6ff",
          yellow: "#ffde59",
          ink: "hsl(var(--brand-blue-deep))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        sm: "inset 0 1px 0 rgb(255 255 255 / 0.78), 0 5px 14px -10px rgb(5 54 83 / 0.26)",
        DEFAULT: "inset 0 1px 0 rgb(255 255 255 / 0.8), 0 10px 24px -16px rgb(5 54 83 / 0.3)",
        md: "inset 0 1px 0 rgb(255 255 255 / 0.82), 0 14px 32px -22px rgb(5 54 83 / 0.34)",
        lg: "inset 0 1px 0 rgb(255 255 255 / 0.84), 0 18px 42px -28px rgb(5 54 83 / 0.36)",
        xl: "inset 0 1px 0 rgb(255 255 255 / 0.86), 0 24px 56px -34px rgb(5 54 83 / 0.4)",
        "2xl": "inset 0 1px 0 rgb(255 255 255 / 0.88), 0 30px 72px -42px rgb(5 54 83 / 0.42)",
        inner: "inset 5px 5px 12px rgb(5 54 83 / 0.1), inset -5px -5px 12px rgb(255 255 255 / 0.72)",
        none: "none",
      },
      dropShadow: {
        sm: "0 3px 7px rgb(5 54 83 / 0.16)",
        DEFAULT: "0 6px 14px rgb(5 54 83 / 0.18)",
        md: "0 9px 20px rgb(5 54 83 / 0.2)",
        lg: "0 13px 28px rgb(5 54 83 / 0.22)",
        xl: "0 18px 38px rgb(5 54 83 / 0.24)",
        "2xl": "0 24px 50px rgb(5 54 83 / 0.26)",
        none: "0 0 #0000",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-up": {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "fade-in-up": "fade-in-up 0.4s ease-out forwards",
        "scale-up": "scale-up 0.2s ease-out forwards",
        "float-soft": "float-soft 6s ease-in-out infinite",
        "sparkle": "sparkle-twinkle 3.2s ease-in-out infinite",
        "heart-beat": "heart-beat 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
