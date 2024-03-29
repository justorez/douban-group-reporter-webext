import { dirname, relative } from 'node:path'
import { URL, fileURLToPath } from 'node:url'
import { crx } from '@crxjs/vite-plugin'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/vite'
import { defineConfig } from 'vite'
import Pages from 'vite-plugin-pages'
// import VueDevTools from 'vite-plugin-vue-devtools'
import manifest from './manifest.config'

const resolve = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve('./src'),
      '~': resolve('./src'),
      src: resolve('./src')
    }
  },
  plugins: [
    crx({ manifest }),

    vue(),

    // VueDevTools(),

    Pages({
      dirs: [
        {
          dir: 'src/pages',
          baseRoute: ''
        },
        {
          dir: 'src/popup/pages',
          baseRoute: 'popup'
        },
        {
          dir: 'src/main/pages',
          baseRoute: 'main'
        }
      ]
    }),

    AutoImport({
      imports: ['vue', 'vue-router', 'vue/macros', '@vueuse/core'],
      dts: 'src/auto-imports.d.ts'
    }),

    Components({
      dirs: ['src/components'],
      dts: 'src/components.d.ts',
      resolvers: [
        // auto import icons
        IconsResolver({
          prefix: 'i',
          enabledCollections: ['mdi']
        })
      ]
    }),

    // https://github.com/antfu/unplugin-icons
    Icons({
      autoInstall: true,
      compiler: 'vue3',
      scale: 1.5
    }),

    // rewrite assets to use relative path
    {
      name: 'assets-rewrite',
      enforce: 'post',
      apply: 'build',
      transformIndexHtml(html, { path }) {
        return html.replace(
          /"\/assets\//g,
          `"${relative(dirname(path), '/assets')}/`
        )
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        main: 'src/main/index.html'
      }
    }
  },
  server: {
    port: 8888,
    strictPort: true,
    hmr: {
      port: 8889,
      overlay: false
    }
  },
  optimizeDeps: {
    include: ['vue', '@vueuse/core'],
    exclude: ['vue-demi']
  }
})
