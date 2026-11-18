import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig({
  base:'./',
  plugins:[
    react(),
    VitePWA({
      registerType:'autoUpdate',
      includeAssets:['favicon.svg','icons/apple-touch-icon.png'],
      manifest:{
        name:'Grooso Create',short_name:'Grooso',description:'Custom printing & personalised merchandise',
        theme_color:'#552ccd',background_color:'#f9f8fc',display:'standalone',start_url:'./',scope:'./',
        icons:[
          {src:'icons/icon-192.png',sizes:'192x192',type:'image/png'},
          {src:'icons/icon-512.png',sizes:'512x512',type:'image/png'},
          {src:'icons/icon-maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}
        ]
      },
      workbox:{
        globPatterns:['**/*.{js,css,html,svg,webp,png,ico}'],
        // 3D models are large; cache them on first use instead of precaching.
        runtimeCaching:[
          {urlPattern:/\.glb$/,handler:'CacheFirst',options:{cacheName:'models',expiration:{maxEntries:6},cacheableResponse:{statuses:[0,200]}}},
          {urlPattern:/\/assets\/.*\.jpg$/,handler:'StaleWhileRevalidate',options:{cacheName:'photos'}}
        ],
        navigateFallbackDenylist:[/credits\.html$/]
      }
    })
  ],
  resolve:{dedupe:['react','react-dom','three']},
  build:{
    target:'es2022',
    chunkSizeWarningLimit:900,
    rollupOptions:{output:{manualChunks(id) {
      if (id.includes('vite/preload-helper') || id.includes('vite/modulepreload-polyfill')) return 'react';
      if (!id.includes('node_modules')) return;
      if (/node_modules\/(three|three-stdlib|three-mesh-bvh|camera-controls|maath|meshline|troika|@monogrid|@react-three|suspend-react|its-fine|react-reconciler)/.test(id)) return "three";
      if (/node_modules\/(react|react-dom|scheduler|zustand)\//.test(id)) return 'react';
    }}}
  },
  test:{environment:'jsdom',globals:true,setupFiles:['./tests/setup.js'],css:false,testTimeout:20000}
});
