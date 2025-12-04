/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#3B82F6', // Example primary color
                secondary: '#10B981', // Example secondary color
                dark: '#1F2937',
                light: '#F3F4F6'
            }
        },
    },
    plugins: [],
}
