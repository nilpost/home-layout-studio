import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import '../src/geometry.js';
import '../src/geometry-coverage.js';
import '../src/consistency-review.js';

// Run the actual extractor, with fabricated DOM nodes supplied at its parsing boundary.
// Browser parsing/rendering receives separate browser acceptance checks.
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const start=app.indexOf('function geometryContextReason('),end=app.indexOf('\nfunction renderArchitecture',start);
assert.ok(start>=0&&end>start,'Production geometry extraction functions must exist');
const production=app.slice(start,end);
function extract(mode='plain',wallCount=1){
 const node=(tag,attrs={})=>({localName:tag,id:attrs.id||'',attributes:Object.entries(attrs).map(([name,value])=>({name,value})),getAttribute(k){return attrs[k]??null;}});
 const root=node('svg',{viewBox:'0 0 100 100',...(mode==='root-transform'?{transform:'scale(2)'}:{}),...(mode==='root-inline-transform'?{style:'transform:scale(2)'}:{})});
 const walls=Array.from({length:wallCount},(_,i)=>{const wall=node('path',{id:'synthetic-wall-'+i,class:'wall',d:'M0 0H100V100H0Z'});wall.parentNode=root;return wall;});
 const group=node('g',{id:'synthetic-dimension','data-dimension-value':'100','data-unit':'mm','data-unit-status':'verified',...(mode==='dimension-inline-transform'?{style:'transform:scale(2)'}:{})});group.parentNode=root;
 const path=node('path',{d:'M0 0L100 0',...(mode==='dimension-path-transform'?{transform:'scale(2)'}:{}),...(mode==='dimension-path-inline-geometry'?{style:'d:path("M0 0L200 0")'}:{})});path.parentNode=group;
 if(mode==='nested-dimension-viewport'){const nested=node('svg',{viewBox:'0 0 200 100'});nested.parentNode=group;path.parentNode=nested;}
 if(mode==='ancestor-wall-transform'){const ancestor=node('g',{transform:'rotate(10)'});ancestor.parentNode=root;walls.forEach(w=>w.parentNode=ancestor);}
 group.querySelectorAll=()=>[path];group.querySelector=()=>({textContent:'100'});
 let styleReads=0,stylesheetChecks=0;
 const style=mode==='stylesheet-transform'?'.wall{transform:scale(2)}':mode==='stylesheet-geometry'?'.unrelated{x:20px}':'.wall{stroke:black;fill:none}';
 const doc={documentElement:root,querySelectorAll(selector){if(selector==='style'){styleReads++;return [{textContent:style}];}if(selector==='[data-dimension-value]')return [group];if(selector==='path,line,polyline,polygon,rect')return [...walls,path];throw Error('Unexpected query: '+selector);}};root.parentNode=doc;
 const context=vm.createContext({DOMParser:class{parseFromString(){return doc;}},GeometryCoverage:{...globalThis.GeometryCoverage,unsupportedReason(frames,styles){if(styles.length)stylesheetChecks++;return globalThis.GeometryCoverage.unsupportedReason(frames,styles);}},LayoutGeometry:globalThis.LayoutGeometry,state:{baseSvg:'fabricated-only',calibration:{drawingUnits:1,realMillimetres:1,status:'verified'}}});
 vm.runInContext(production,context);
 return {model:context.geometryOf(),get styleReads(){return styleReads;},get stylesheetChecks(){return stylesheetChecks;}};
}
function review(model){return globalThis.ConsistencyReview.createReport({revision:'v1',sourceHash:'fabricated-source',geometryReport:globalThis.LayoutGeometry.validate(model),runAt:'2026-01-01T00:00:00.000Z'});}
const plain=extract();assert.equal(plain.model.segments.length,4);assert.equal(plain.model.dimensions.length,1);assert.equal(plain.model.unsupported.length,0);
const plainReview=review(plain.model);assert.equal(plainReview.coverage[0].status,'pass');assert.equal(plainReview.coverage[1].status,'pass');
for(const mode of ['stylesheet-transform','stylesheet-geometry','root-transform','root-inline-transform']){
 const result=extract(mode);assert.equal(result.model.segments.length,0,mode);assert.equal(result.model.dimensions.length,0,mode);assert.ok(result.model.unsupported.length>=2,mode);
 const report=review(result.model);assert.equal(report.coverage[0].status,'unknown',mode);assert.notEqual(report.coverage[1].status,'pass',mode);assert.equal(report.status,'unknown',mode);
 assert.ok(report.findings.some(f=>f.evidence.some(e=>e.includes('synthetic-dimension'))),mode+' retains skipped dimension evidence');
}
for(const mode of ['dimension-inline-transform','dimension-path-transform','dimension-path-inline-geometry','nested-dimension-viewport']){
 const result=extract(mode);assert.equal(result.model.segments.length,4,mode);assert.equal(result.model.dimensions.length,0,mode);
 const report=review(result.model);assert.equal(report.coverage[0].status,'unknown',mode);assert.notEqual(report.coverage[1].status,'pass',mode);assert.equal(report.findings.some(f=>f.code.startsWith('dimension-line:')&&f.status==='pass'),false,mode+' cannot compare raw dimension coordinates');
}
const ancestor=extract('ancestor-wall-transform');assert.equal(ancestor.model.segments.length,0);assert.equal(ancestor.model.dimensions.length,1);assert.equal(review(ancestor.model).coverage[0].status,'unknown');
for(const mode of ['plain','stylesheet-transform','dimension-path-transform']){
 const result=extract(mode,40);assert.equal(result.styleReads,1,mode+' enumerates style nodes once for all semantic shapes/dimensions');assert.equal(result.stylesheetChecks,1,mode+' interprets document styles once');
}
console.log('PASS: production geometry extractor skips transformed/CSS/viewport contexts, preserves unknown evidence and scans document styles once.');
