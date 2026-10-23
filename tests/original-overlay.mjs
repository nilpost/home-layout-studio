import assert from 'node:assert/strict';
import '../src/original-overlay.js';
const O=globalThis.OriginalOverlay;
const reference={name:'Synthetic plan.pdf',kind:'pdf',assetKey:'source',rasterKey:'preview',page:1,pageCount:3,x:10,y:20,w:100,h:200,rotation:0,opacity:.5};
assert.doesNotThrow(()=>O.validate(null));
assert.doesNotThrow(()=>O.validate(reference));
assert.doesNotThrow(()=>O.validate(JSON.parse(JSON.stringify(reference))));
assert.deepEqual(O.fit([10,20,1000,500],100,100),{x:260,y:20,w:500,h:500,rotation:0});
for(const patch of [{opacity:-.1},{opacity:1.1},{w:0},{h:Infinity},{x:NaN},{rotation:361},{page:0},{page:4},{pageCount:1001},{dataUrl:'https://example.invalid/private.pdf'},{dataUrl:'data:text/html;base64,AA=='},{rasterDataUrl:'data:image/svg+xml;base64,AA=='}]){
 assert.throws(()=>O.validate({...reference,...patch}));
}
assert.doesNotThrow(()=>O.validate({...reference,dataUrl:'data:application/pdf;base64,JVBERi0=',rasterDataUrl:'data:image/png;base64,AA=='}));
console.log('PASS: optional legacy reference, fit geometry, alignment bounds, page bounds and private embedded-source restrictions.');
