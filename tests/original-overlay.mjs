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

const box={...reference,x:0,y:0,w:100,h:50};
const source=[[0,0],[100,0],[0,50]],target=source.map(([x,y])=>[10-2*y,20+2*x]);
const result=O.match(box,source,target);
for(const [k,v]of Object.entries({x:-140,y:70,w:200,h:100,rotation:90}))assert.ok(Math.abs(result.reference[k]-v)<1e-9,k);
assert.ok(result.rms<1e-9);
assert.equal(result.reference.w/result.reference.h,box.w/box.h);
const noisy=target.map(p=>[...p]);noisy[2][0]+=1;
assert.ok(O.match(box,source,noisy).rms>0);
assert.throws(()=>O.match(box,[[1,1],[1,1]],[[0,0],[10,10]]));
assert.throws(()=>O.match(box,[[0,0],[10,10]],[[1,1],[1,1]]));
assert.throws(()=>O.match(box,[[0,0],[10,10]],[[1,1],[Infinity,1]]));
console.log('PASS: proportional landmark fit, translation/rotation, noisy residuals and degenerate-pair rejection.');
