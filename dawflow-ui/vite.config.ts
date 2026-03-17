import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // When deployed as an Ardour web surface, files are served from
  // /builtin/dawflow/ on port 3818. Use relative base so assets
  // resolve correctly regardless of the mount path.
  base: './',
})
