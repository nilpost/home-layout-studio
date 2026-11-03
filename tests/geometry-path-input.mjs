import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import '../src/geometry.js';
import '../src/geometry-coverage.js';
import '../src/consistency-review.js';
const G=globalThis.LayoutGeometry;
// Captured from the pre-fix extractor using only invented valid source data.
const frozen=[{"d":"M10 20L30 40H50V60Z M100 200L110 220","expected":[{"id":"synthetic:path:0","kind":"wall","a":[10,20],"b":[30,40]},{"id":"synthetic:path:1","kind":"wall","a":[30,40],"b":[50,40]},{"id":"synthetic:path:2","kind":"wall","a":[50,40],"b":[50,60]},{"id":"synthetic:path:3","kind":"wall","a":[50,60],"b":[10,20]},{"id":"synthetic:path:4","kind":"wall","a":[100,200],"b":[110,220]}]},{"d":"m10 20 20 0 0 30h10v-10z m100 0l5 5","expected":[{"id":"synthetic:path:0","kind":"wall","a":[10,20],"b":[30,20]},{"id":"synthetic:path:1","kind":"wall","a":[30,20],"b":[30,50]},{"id":"synthetic:path:2","kind":"wall","a":[30,50],"b":[40,50]},{"id":"synthetic:path:3","kind":"wall","a":[40,50],"b":[40,40]},{"id":"synthetic:path:4","kind":"wall","a":[40,40],"b":[10,20]},{"id":"synthetic:path:5","kind":"wall","a":[110,20],"b":[115,25]}]},{"d":"M+.5,-.25L1e2,2E1H-3.5V.75Z","expected":[{"id":"synthetic:path:0","kind":"wall","a":[0.5,-0.25],"b":[100,20]},{"id":"synthetic:path:1","kind":"wall","a":[100,20],"b":[-3.5,20]},{"id":"synthetic:path:2","kind":"wall","a":[-3.5,20],"b":[-3.5,0.75]},{"id":"synthetic:path:3","kind":"wall","a":[-3.5,0.75],"b":[0.5,-0.25]}]},{"d":"M0 0L1.2.3","expected":[{"id":"synthetic:path:0","kind":"wall","a":[0,0],"b":[1.2,0.3]}]},{"d":"M0 0L1e2.3","expected":[{"id":"synthetic:path:0","kind":"wall","a":[0,0],"b":[100,0.3]}]},{"d":"","expected":[]},{"d":"\t \r\n","expected":[]}];
for(const {d,expected}of frozen)assert.deepEqual(G.linearPath(d,'synthetic:path','wall'),expected,'Existing valid token/coordinate/identity output: '+JSON.stringify(d));
const invalid=[
 'L40 0','l40 0','H40','h40','V40','v40','Z','z','0 0L40 0',
 '?M0 0L40 0','_M0 0L40 0','M0 0L40?0','M0 0L10_20','M0 0L40 0!','M0 0L40 0#','M0 0L40 0\u0000','M0 0L40\u00a00','M0 0L40\u000c0',
 ',M0 0L40 0','M,0 0L40 0','M0,,0L40 0','M0 0L40,,0','M0 0L40 0,','M0 0L40 0,L50 0','M0 0L40;0','M0 0L40:0',
 'M0 0L+-1 2','M0 0L++1 2','M0 0L--1 2','M0 0L1e 2','M0 0L1e+ 2','M0 0L1e- 2','M0 0L. 2','M0 0L1e309 0','M0 0L40 0garbage',
 'M0 0Q20 10 40 0','M0 0C1 2 3 4 5 6','M0 0A5 5 0 0 0 40 0','m1e308 0l1e308 0','m0 1e308v1e308','m1e308 0m1e308 0'
];
for(const d of invalid)assert.throws(()=>G.linearPath(d,'synthetic-invalid','wall'),undefined,'Malformed input cannot be repaired by stripping text: '+JSON.stringify(d));
// Equivalent absolute/relative/implicit forms keep the same independently computed edges.
for(let i=1;i<=40;i++){
 const x=i-25,y=i*2-30,dx=i+3,dy=i+5,vertices=[[x,y],[x+dx,y],[x+dx,y+dy],[x,y+dy],[x,y]],expected=vertices.slice(1).map((b,k)=>({id:'generated:'+k,kind:'wall',a:vertices[k],b}));
 const paths=[`M${x} ${y}H${x+dx}V${y+dy}H${x}Z`,`m${x} ${y}h${dx}v${dy}h${-dx}z`,`M${x},${y}L${x+dx},${y} ${x+dx},${y+dy} ${x},${y+dy}Z`,`M${x}\t${y}\nL${x+dx} ${y}\rL${x+dx} ${y+dy}L${x} ${y+dy}Z`];
 for(const d of paths)assert.deepEqual(G.linearPath(d,'generated','wall'),expected);
}
// Actual app extraction routes malformed semantic wall and dimension paths to explicit
// unsupported evidence; it cannot keep fabricated repaired segments or verified dimensions.
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8'),start=app.indexOf('function geometryContextReason('),end=app.indexOf('\nfunction renderArchitecture',start);assert.ok(start>=0&&end>start);
function extract(d){
 const node=(localName,attrs={})=>({localName,id:attrs.id||'',attributes:Object.entries(attrs).map(([name,value])=>({name,value})),getAttribute:k=>attrs[k]??null});
 const root=node('svg'),wall=node('path',{id:'synthetic-wall',class:'wall',d}),group=node('g',{id:'synthetic-dimension','data-dimension-value':'40','data-unit':'mm','data-unit-status':'verified'}),span=node('path',{d});wall.parentNode=root;group.parentNode=root;span.parentNode=group;group.querySelectorAll=()=>[span];group.querySelector=()=>({textContent:'40'});
 const doc={documentElement:root,querySelectorAll(s){if(s==='style')return [];if(s==='path,line,polyline,polygon,rect')return [wall,span];if(s==='[data-dimension-value]')return [group];throw Error('Unexpected fabricated DOM selector '+s);}};root.parentNode=doc;
 const c=vm.createContext({DOMParser:class{parseFromString(){return doc;}},GeometryCoverage,LayoutGeometry:G,state:{calibration:{drawingUnits:1,realMillimetres:1,status:'verified'}}});vm.runInContext(app.slice(start,end),c);return JSON.parse(JSON.stringify(c.geometryOf('synthetic source')));
}
for(const d of invalid){const model=extract(d);assert.equal(model.segments.length,0);assert.equal(model.dimensions.length,0);assert.ok(model.unsupported.some(v=>v.startsWith('synthetic-wall:')));assert.ok(model.unsupported.some(v=>v.startsWith('synthetic-dimension:')));const r=ConsistencyReview.createReport({revision:'v1',sourceHash:'synthetic-source',runAt:'2026-01-01T00:00:00.000Z',geometryReport:G.validate(model)});assert.equal(r.coverage[0].status,'unknown');assert.notEqual(r.coverage[1].status,'pass');assert.equal(r.findings.some(f=>f.code.startsWith('dimension-line:')&&f.status==='pass'),false);}
const valid=extract('M0 0L40 0');assert.equal(valid.segments.length,1);assert.equal(valid.dimensions.length,1);assert.equal(valid.unsupported.length,0);
console.log('PASS: frozen valid path outputs and absolute/relative generated parity, strict lexical rejection without silent repair, actual geometry extraction and review unknown routing.');
