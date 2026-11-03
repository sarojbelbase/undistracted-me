import tailwindcss from '@tailwindcss/postcss';

// Tailwind v4 (via @tailwindcss/postcss) auto-prefixes through Lightning CSS,
// so a separate autoprefixer pass is unnecessary.
export default {
  plugins: [
    tailwindcss,
  ],
};
