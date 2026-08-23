export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        school: resolve(__dirname, 'school.html'),
        gbv: resolve(__dirname, 'gbv.html'),
      },
    },
  },
});
  plugins: [react()],
  base: '/codespaces-blank/',
})
