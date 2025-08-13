
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				brand: {
					primary:   "rgb(var(--brand-primary) / <alpha-value>)",
					primaryFg: "rgb(var(--brand-primaryforeground) / <alpha-value>)",
					secondary: "rgb(var(--brand-secondary) / <alpha-value>)",
					secondaryFg:"rgb(var(--brand-secondaryforeground) / <alpha-value>)",
					accent:    "rgb(var(--brand-accent) / <alpha-value>)",
					accentFg:  "rgb(var(--brand-accentforeground) / <alpha-value>)",
					muted:     "rgb(var(--brand-muted) / <alpha-value>)",
					mutedFg:   "rgb(var(--brand-mutedforeground) / <alpha-value>)",
					neutral:   "rgb(var(--brand-neutral) / <alpha-value>)",
					warning:   "rgb(var(--brand-warning) / <alpha-value>)",
					danger:    "rgb(var(--brand-danger) / <alpha-value>)",
					success:   "rgb(var(--brand-success) / <alpha-value>)",
					// Legacy colors for backward compatibility
					blue: '#2B70B2',
					'light-blue': '#6BAEDB',
					'dark-blue': '#1A4670',
					gold: '#E8B74B',
					'light-gold': '#F7E3B0',
					sage: '#8FBF9F',
					'light-sage': '#D5EAD8',
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				xl: "1rem",
				"2xl": "1.25rem"
			},
			transitionDuration: {
				250: "250ms"
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'bounce-slow': {
					'0%, 100%': { transform: 'translateY(-5%)' },
					'50%': { transform: 'translateY(0)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'bounce-slow': 'bounce-slow 3s ease-in-out infinite',
			},
			ringColor: ({ theme }) => ({
				DEFAULT: theme("colors.brand.primary"),
			}),
			fontFamily: {
				heading: ["Pogonia", "Pagonia", "ui-sans-serif", "system-ui", "sans-serif"],
				body: ["Nunito", "ui-sans-serif", "system-ui", "sans-serif"],
				nunito: ['Nunito', 'system-ui', 'sans-serif'],
				quicksand: ['Quicksand', 'system-ui', 'sans-serif'],
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
