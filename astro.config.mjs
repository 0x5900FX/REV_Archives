import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

import vercel from "@astrojs/vercel";

export default defineConfig({
  site: "https://www.cubeyond.net/",

  vite: {
    plugins: [tailwindcss()]
  },

  adapter: vercel()
});