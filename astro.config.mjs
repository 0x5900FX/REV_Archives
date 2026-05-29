import { defineConfig } from "astro/config";

export default defineConfig({
  build: {
    inlineStylesheets: "always"
  },
  site: "https://www.cubeyond.net/"
});
