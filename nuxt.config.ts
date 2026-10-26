// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-01-16",
  css: ["~/assets/css/main.css"],
  devtools: { enabled: true },

  modules: ["@nuxt/ui", "nuxt-auth-utils", "dayjs-nuxt", "@nuxt/eslint"],
  runtimeConfig: {
    public: {
      // pull zone url for the bunny.net storage zone, e.g. https://my-gallery.b-cdn.net
      bunnyCdnUrl: process.env.BUNNY_CDN_URL || "",
    },
  },
  eslint: {},
  // The app is dark only (see app.vue), so the color mode module isn't needed
  ui: { colorMode: false },
  vite: {
    optimizeDeps: {
      include: [
        "@vue/devtools-core",
        "@vue/devtools-kit",
        "dayjs", // CJS
        "dayjs/plugin/updateLocale", // CJS
        "dayjs/plugin/relativeTime", // CJS
        "dayjs/plugin/utc", // CJS
      ],
    },
  },
});
