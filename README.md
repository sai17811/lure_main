# Grooso Create (React + React Three Fiber)

Custom printing & personalised merchandise. Same flow, routes, copy and theme as the original vanilla build, rebuilt on:

- **React 19** components, **zustand** store, hash routes (`#create`, `#create/mug`, `#cart`, `#orders`, `#profile`, `#categories`)
- **React Three Fiber 9 + drei 10 + three.js** 3D studio: mug and tee (GLB, live print textures), tote and cap (procedural 3D)
- **Vite 7** with lazy-loaded 3D chunk, **PWA** (offline shell, cached models), WebP images with blur-up placeholders
- **Vitest** tests + verified in real Chromium (WebGL) on desktop and phone sizes

## Run it (Windows / macOS / Linux, Node 20.19+ or 22+)

```
cd grooso-create
npm install
npm start          # dev server at http://127.0.0.1:5173
npm run build      # production build into dist/
npm run preview    # serve dist/ at http://127.0.0.1:4173
npm test           # unit + flow tests
```

If you are replacing an older folder, delete its `node_modules` and `package-lock.json` first. This project pins a matching set: `react 19`, `@react-three/fiber 9`, `@react-three/drei 10`, `three 0.183`.

## What changed for customers
- Pages cross-fade (View Transitions API), dialogs scale in over a blurred backdrop, prices count smoothly, cart badge pops.
- 3D uses procedural softbox lighting (no network HDRs), contact shadows, damped orbit, an intro camera reveal, on-demand rendering (idle = no GPU work), adaptive resolution, WebGL-lost recovery and a 2D fallback.
- Model and 3D chunk preload when a shopper hovers a product; the home page ships ~100 KB gzip of JS.
- Undo/redo groups drags and slider moves into single steps (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z).
- Saved designs keep working: same IndexedDB name and schema. Artwork is written once and orphans are cleaned up.
- Account, cart and order pages now use the same purple brand (the old stylesheet tinted them green by mistake).

## Layout
`src/data` catalogue · `src/lib` pricing/CSV/storage · `src/store` zustand + router · `src/pages` screens · `src/modals` dialogs · `src/studio` 2D layout editor + R3F scene · `src/styles` original CSS + `luxe.css` premium layer · `tests`.

Model credits: `public/credits.html`. Print geometry is illustrative until supplier templates are approved (`productConfig.*.verified`).
