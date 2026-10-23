import assert from 'node:assert/strict';
import '../src/geometry-coverage.js';
const G=globalThis.GeometryCoverage;
for(const css of ['path {transform:translate(2px, 3px)}','translate: 2px','rotate:30deg','scale:2','.wall{d:path("M0 0L1 1")}','svg{width:50%}', 'g { X:2px; Y:3px }','circle {cx: 20px;cy: 30px;r: 3px}','rect{rx:2;ry:2;height:20px}','@media screen {.wall{stroke:red}}','@import "fabricated.css";','all:initial','-webkit-transform:scale(2)','offset-path:path("M0 0L1 1")','zoom:2','tr\\61nsform:scale(2)','/* unfinished','perspective:400px'])assert.equal(G.styleAffectsGeometry(css),true,css);
for(const css of ['','.wall{stroke:red;fill:none;stroke-width:2}', 'stroke-linejoin:round;opacity:.5', '/* transform:scale(2) */ path{fill:#fff}', '.transform{fill:red}','font-size:12px'])assert.equal(G.styleAffectsGeometry(css),false,css);
const leaf={tagName:'path',attributes:{d:'M0 0L1 1'}},root={tagName:'svg',isRoot:true,attributes:{viewBox:'0 0 100 100',width:'100',height:'100'}};
assert.equal(G.unsupportedReason([leaf,root],['.wall{stroke:red}']),null);
assert.equal(G.unsupportedReason([{tagName:'rect',attributes:{x:'1',y:'2',width:'3',height:'4'}},root]),null,'Leaf geometry is checked by extractor');
for(const frames of [
 [{...leaf,attributes:{transform:'scale(2)'}},root],
 [leaf,{tagName:'g',attributes:{transform:'matrix(1 0 0 1 2 0)'}},root],
 [leaf,{...root,attributes:{...root.attributes,transform:'rotate(2)'}}],
 [leaf,{...root,attributes:{...root.attributes,style:'transform:scale(2)'}}],
 [leaf,{...root,attributes:{...root.attributes,x:'1'}}],
 [leaf,{tagName:'svg',attributes:{}},root],
 [leaf,{tagName:'g',attributes:{x:'2'}},root],
 [{...leaf,attributes:{style:'d:path("M0 0L2 2")'}},root]
])assert.equal(typeof G.unsupportedReason(frames),'string');
assert.equal(typeof G.unsupportedReason([leaf,root],['.unrelated{width:2px}']),'string','Conservative stylesheet scope applies globally');
assert.equal(typeof G.unsupportedReason([leaf,root],[null]),'string');
assert.equal(typeof G.unsupportedReason(null),'string');
assert.equal(typeof G.unsupportedReason([{}]),'string');
assert.equal(G.styleAffectsGeometry('x'.repeat(2_000_001)),true);
console.log('PASS: conservative stylesheet/inline geometry, escaped CSS, root and ancestor transforms, nested viewports and ordinary paint styles.');
