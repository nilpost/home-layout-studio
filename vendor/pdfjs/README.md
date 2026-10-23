# PDF.js

Unmodified `build/pdf.min.mjs` and `build/pdf.worker.min.mjs` from Mozilla's
`pdfjs-dist@6.4.299` npm package (Apache-2.0; see LICENSE).
Source: https://github.com/mozilla/pdf.js
Package: https://registry.npmjs.org/pdfjs-dist/-/pdfjs-dist-6.4.299.tgz

Vendored so private original plans can render locally without a CDN. The renderer
supplies PDF bytes directly, disables document scripting/eval, external font fetches,
WASM, and external resource URLs. Optional CMap/font/image-codec asset packs are not
bundled. PDFs requiring those packs may render incompletely; retain and inspect originals.
