// @ts-check
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

// Dynamic issue URLs are served by a few static pages. Firebase Hosting does this with the
// `rewrites` in firebase.json; this mirrors them for `astro dev`.
const rewrites = [
  [/^\/p\/[^/]+\/edit$/, '/problem-edit'],
  [/^\/p\/[^/]+\/submit$/, '/problem-submit'],
  [/^\/p\/[^/]+$/, '/problem'],
]

/** @returns {import('vite').Plugin} */
function devRewrites() {
  return {
    name: 'buildthis:dev-rewrites',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const [path, qs] = (req.url ?? '').split('?')
        const hit = rewrites.find(([re]) => /** @type {RegExp} */ (re).test(path))
        if (hit) req.url = hit[1] + (qs ? `?${qs}` : '')
        next()
      })
    },
  }
}

export default defineConfig({
  site: 'https://buildthis.stanimeros.com',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [react()],
  vite: { plugins: [tailwindcss(), devRewrites()] },
})
