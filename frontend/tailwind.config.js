/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		"./public/index.html",
		"./src/**/*.{js,jsx,ts,tsx}",
	],
	theme: {
		extend: {
			colors: {
				background: "var(--background)",
				surface: "var(--surface)",
				border: "var(--border)",
				primary: {
					DEFAULT: "var(--color-primary)",
					dark: "var(--color-primary-dark)",
					light: "var(--color-primary-light)",
				},
				text: {
					DEFAULT: "var(--text)",
					secondary: "var(--text-secondary)",
				},
			},
			borderRadius: {
				sm: "var(--radius-sm)",
				DEFAULT: "var(--radius-md)",
				lg: "var(--radius-lg)",
				xl: "var(--radius-xl)",
				full: "var(--radius-full)",
			},
			boxShadow: {
				sm: "var(--shadow-sm)",
				md: "var(--shadow-md)",
				lg: "var(--shadow-lg)",
				xl: "var(--shadow-xl)",
			},
			transitionDuration: {
				fast: "var(--transition-fast)",
				normal: "var(--transition-normal)",
				slow: "var(--transition-slow)",
			},
		},
	},
	plugins: [
		function addCssVarsUtilities({ addBase }) {
			addBase({
				':root': {},
				"[data-theme='dark']": {},
				"[data-theme='light']": {},
			});
		},
	],
};


