// @ts-check
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

// Dynamic issue URLs are served by a few static pages per language. Firebase Hosting does this
// with the `rewrites` in firebase.json; this mirrors them for `astro dev`.
const rewrites = [
  [/^(\/el)?\/p\/[^/]+\/edit$/, '$1/problem-edit'],
  [/^(\/el)?\/p\/[^/]+\/submit$/, '$1/problem-submit'],
  [/^(\/el)?\/p\/[^/]+$/, '$1/problem'],
]

/** @returns {import('vite').Plugin} */
function devRewrites() {
  return {
    name: 'buildthis:dev-rewrites',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const [path, qs] = (req.url ?? '').split('?')
        const hit = rewrites.find(([re]) => /** @type {RegExp} */ (re).test(path))
        if (hit) req.url = path.replace(hit[0], /** @type {string} */ (hit[1])) + (qs ? `?${qs}` : '')
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
  vite: {
    plugins: [tailwindcss(), devRewrites()],
    build: {
      rolldownOptions: {
        output: {
          // Firebase and React get their own long-cached chunks, so a deploy only re-downloads our code.
          // Everything else splits by usage, so page-specific libraries stay off the other pages.
          codeSplitting: {
            groups: [
              { name: 'firebase', test: /node_modules[\\/](@firebase|firebase|re2js|idb)[\\/]/ },
              { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            ],
          },
        },
      },
    },
  },
})
