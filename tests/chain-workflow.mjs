import '../src/overlay-footprint.js';
import '../src/item-adjustments.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import '../src/measurement-anchors.js';
import '../src/measurement-chains.js';
import '../src/geometry.js';
import '../src/asset-records.js';
import '../src/layer-items.js';
import '../src/review-history.js';
import '../src/consistency-review.js';
import '../src/correction-contract.js';

// Execute production site workflow and report persistence on fabricated source bindings.
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8'),clone=v=>JSON.parse(JSON.stringify(v));
function code(name){const start=app.search(new RegExp('^(?:async )?function '+name+'\\(','m'));assert.ok(start>=0,'Missing '+name);const end=app.indexOf('\n',start),line=app.slice(start,end);return line.endsWith('{')?app.slice(start,app.indexOf('\n}',start)+2):line;}
class Element{constructor(){this.value='';this.textContent='';this.hidden=false;this.disabled=false;this.children=[];this.events={};}replaceChildren(...v){this.children=v;}append(...v){this.children.push(...v);}addEventListener(name,fn){this.events[name]=fn;}showModal(){}close(){}setAttribute(){}click(){this.onclick?.();}}
const fixture=()=>({schemaVersion:1,projectId:'project-a',stateToken:'token-a',revision:'v0',name:'Fabricated project',note:'',baseSvg:'<svg/>',viewBox:[0,0,100,100],items:[],comments:[],photos:[],assets:[],measurementAnchors:[],measurementChains:[],measurementTolerancePercent:1,calibration:{drawingUnits:1,realMillimetres:1,status:'verified'},consistencyReports:[],objectSettings:{},original:null,nextId:1,layers:{base:true}});
function geometry(){return {segments:[{id:'wall-a',kind:'wall',a:[0,0],b:[40,0]},{id:'wall-b',kind:'wall',a:[40,0],b:[100,0]},{id:'wall-total',kind:'wall',a:[0,0],b:[100,0]}],dimensions:[{id:'dimension-a',value:40},{id:'dimension-b',value:60},{id:'dimension-total',value:100}].map(d=>({...d,unit:'mm',unitStatus:'verified',a:[0,-10],b:[d.value,-10]}))};}
function context(){const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};const c=vm.createContext({state:fixture(),clone,JSON,crypto:webcrypto,Blob,Date,Set,Map,history:[],future:[],pendingChain:null,chainExpected:null,model:geometry(),MeasurementAnchors,MeasurementChains,OverlayFootprint,ItemAdjustments,AssetRecords,LayerItems,ReviewHistory,ConsistencyReview,CorrectionContract,$:get,document:{createElement:()=>new Element()},window:{},OriginalOverlay:{validate(){}},validatePhotos(){},assertSourceLocks(){},render(){},storageFail:false,saveLocal:()=>!c.storageFail,notify:text=>get('message').textContent=text,recordChange:(...args)=>ReviewHistory.recordChange(c.state,...args),geometryOf:()=>c.model,reviewOptions(){},selected:null,selectedRefs:new Set(),zoom:1,cancelLandmarkMatch(){},fileText(){},download(){},DOMParser:class{parseFromString(){return {}; }},editableNodes:()=>[{id:'stable'}],safeSVG:s=>s,sourceWithIds:s=>s,XMLSerializer:class{serializeToString=s=>s;},parseVB:()=>[0,0,100,100],normalizedLayers:l=>l});
 for(const name of ['sourceHash','restoreSnapshot','remember','validProject','mutate','reviewContext','assertAssetContext','invalidateChainPreview','chainReviewInput','chainPreviewText','populateChainEditor','previewMeasurementChain','saveMeasurementChain','wireMeasurementChains','jsonExport','importJSON','handoff','runConsistencyReview'])vm.runInContext(code(name),c);
 for(const name of ['undo','redo']){const body=app.match(new RegExp("\\$\\('"+name+"'\\)\\.onclick=\\(\\)=>\\{(.*?)\\};",'s'))?.[1];assert.ok(body);vm.runInContext('function '+name+'(){'+body+'}',c);}
 c.state.measurementAnchors=['a','b','total'].map(suffix=>MeasurementAnchors.createBinding({id:'anchor-'+suffix,projectId:c.state.projectId,dimensionId:'dimension-'+suffix,start:{segmentId:'wall-'+suffix,endpoint:'a'},end:{segmentId:'wall-'+suffix,endpoint:'b'},sourceHash:c.sourceHash(c.state.baseSvg)}));
 c.report=()=>{const r=LayoutGeometry.validate({...c.model,calibration:c.state.calibration});r.anchoredReview=MeasurementAnchors.review({...c.chainReviewInput([])});r.chainReview=MeasurementChains.review(c.chainReviewInput(c.state.measurementChains));return r;};c.reviewRuns=0;const run=c.runConsistencyReview;c.runConsistencyReview=()=>{c.reviewRuns++;return run();};c.wireMeasurementChains();return c;
}
function choose(c){c.populateChainEditor();c.$('chain-count').value='2';c.$('chain-span-0').value='anchor-a';c.$('chain-span-1').value='anchor-b';c.$('chain-total').value='anchor-total';}
function preview(c){choose(c);c.previewMeasurementChain();assert.ok(c.pendingChain,c.$('chain-message').textContent);const result=MeasurementChains.review(c.chainReviewInput([c.pendingChain.chain]));assert.match(c.$('chain-preview').textContent,new RegExp(result.status,'i'));return result;}
function snap(c){return JSON.stringify({state:c.state,history:c.history,future:c.future});}

{
 const c=context(),before=snap(c),model=JSON.stringify(c.model);const result=preview(c);assert.equal(result.status,'pass');assert.equal(result.findings[0].measured,100);assert.equal(result.findings[0].expected,100);assert.equal(snap(c),before);assert.equal(c.reviewRuns,0);
 c.$('chain-cancel').click();assert.equal(c.pendingChain,null);assert.equal(c.$('chain-save').disabled,true);assert.equal(snap(c),before);
 preview(c);c.$('chain-close').click();assert.equal(c.pendingChain,null);assert.equal(snap(c),before);
 preview(c);c.$('chain-dialog').events.cancel();assert.equal(c.pendingChain,null);assert.equal(snap(c),before);
 preview(c);c.$('chain-span-0').oninput();assert.equal(c.pendingChain,null);assert.equal(c.$('chain-save').disabled,true);
 preview(c);c.$('chain-count').value='3';c.$('chain-count').onchange();assert.equal(c.pendingChain,null);assert.equal(c.$('chain-row-2').hidden,false);assert.equal(c.$('chain-row-3').hidden,true);assert.equal(JSON.stringify(c.model),model);
}
{
 const c=context(),source=c.state.baseSvg,model=JSON.stringify(c.model),anchors=JSON.stringify(c.state.measurementAnchors),calibration=JSON.stringify(c.state.calibration);preview(c);const proposed=clone(c.pendingChain.chain);c.saveMeasurementChain();
 assert.deepEqual(clone(c.state.measurementChains),[proposed]);assert.equal(c.history.length,1);assert.equal(c.state.changeLog.at(-1).type,'measurement-chain');assert.equal(c.reviewRuns,1);assert.equal(c.state.consistencyReports.at(-1).chains.status,'pass');assert.equal(c.state.consistencyReports.at(-1).coverage.find(row=>row.id==='dimension-chain-totals').status,'pass');assert.equal(c.state.consistencyReports.at(-1).findings.find(f=>f.code==='chain:'+proposed.id).measured,100);
 c.undo();assert.equal(c.state.measurementChains.length,0);c.redo();assert.deepEqual(clone(c.state.measurementChains),[proposed]);c.populateChainEditor(proposed.id);c.$('chain-remove').click();assert.equal(c.state.measurementChains.length,0);c.undo();assert.deepEqual(clone(c.state.measurementChains),[proposed]);
 assert.equal(c.state.baseSvg,source);assert.equal(JSON.stringify(c.model),model);assert.equal(JSON.stringify(c.state.measurementAnchors),anchors);assert.equal(JSON.stringify(c.state.calibration),calibration);assert.equal(c.state.measurementTolerancePercent,1);
}
{
 const c=context();preview(c);c.state.stateToken='changed';const before=snap(c);c.saveMeasurementChain();assert.equal(snap(c),before);assert.match(c.$('chain-message').textContent,/changed/i);assert.equal(c.reviewRuns,0);
 choose(c);c.state.stateToken='changed-before-preview';c.previewMeasurementChain();assert.equal(c.pendingChain,null);assert.match(c.$('chain-message').textContent,/changed/i);
}
{
 const c=context();preview(c);const before=snap(c);c.storageFail=true;c.saveMeasurementChain();assert.equal(snap(c),before);assert.equal(c.reviewRuns,0);
 c.storageFail=false;c.state.changeLog=Array.from({length:2000},()=>({summary:'Fabricated event',revision:'v0',commentIds:[],changes:[]}));const full=snap(c);c.saveMeasurementChain();assert.equal(snap(c),full);assert.equal(c.reviewRuns,0);
}
{
 const c=context();c.state.measurementTolerancePercent=null;choose(c);c.previewMeasurementChain();assert.equal(c.pendingChain,null);assert.match(c.$('chain-message').textContent,/tolerance/i);
 c.state.measurementTolerancePercent=1;c.state.calibration.status='manual';assert.equal(preview(c).status,'unknown');c.state.calibration.status='verified';c.model.dimensions[0].unitStatus='unverified';assert.equal(preview(c).status,'unknown');c.model.dimensions[0].unitStatus='verified';c.model.segments[1].a=[41,0];assert.equal(preview(c).status,'unknown','Gap cannot be certified as a contiguous chain');
}
{
 const c=context();c.model.dimensions[2].value=110;const result=preview(c);assert.equal(result.status,'fail','Declared-source sum mismatch remains a supported failure even if an anchor separately mismatches geometry');c.saveMeasurementChain();assert.equal(c.state.consistencyReports.at(-1).chains.status,'fail');assert.equal(c.state.consistencyReports.at(-1).status,'fail');
}
{
 const c=context();preview(c);c.saveMeasurementChain();const chainId=c.state.measurementChains[0].id;c.state.measurementAnchors=c.state.measurementAnchors.filter(a=>a.id!=='anchor-b');c.populateChainEditor(chainId);assert.match(c.$('chain-preview').textContent,/unknown/i);assert.ok(c.$('chain-span-1').children.some(option=>option.value==='anchor-b'),'Orphan binding identity remains visible in the form');
 const before=snap(c),start=app.indexOf("$('svg-file').onchange="),end=app.indexOf(";$('handoff').onclick",start);c.fileText=(_input,handler)=>handler('<svg id="replacement"/>');vm.runInContext(app.slice(start,end),c);c.$('svg-file').onchange();assert.equal(snap(c),before);assert.match(c.$('message').textContent,/binding|source/i);
}
{
 const c=context();preview(c);c.saveMeasurementChain();let backup;c.download=(_name,blob)=>backup=blob;await c.jsonExport();const text=await backup.text(),out=JSON.parse(text);assert.deepEqual(out.measurementChains,clone(c.state.measurementChains));
 const restored=context();await restored.importJSON(text);assert.deepEqual(clone(restored.state.measurementChains),out.measurementChains);assert.deepEqual(clone(restored.state.measurementAnchors),out.measurementAnchors);c.handoff();const envelope=JSON.parse(c.$('handoff-text').value.split('\n\n').slice(1).join('\n\n'));assert.deepEqual(envelope.measurementChains,out.measurementChains);
 const bad={...out};delete bad.projectId;const before=snap(restored);await assert.rejects(restored.importJSON(JSON.stringify(bad)),/project|identity/i);assert.equal(snap(restored),before);
 const duplicate={...out,measurementChains:[out.measurementChains[0],out.measurementChains[0]]};await assert.rejects(restored.importJSON(JSON.stringify(duplicate)),/duplicate/i);assert.equal(snap(restored),before);
}

{
 const c=context();preview(c);c.saveMeasurementChain();const chain=clone(c.state.measurementChains[0]);c.mutate(()=>{c.state.baseSvg='<svg id="changed-source"/>';});c.populateChainEditor(chain.id);assert.match(c.$('chain-preview').textContent,/unknown/i,'Changed source cannot reuse the former verified result');assert.equal(c.state.measurementChains[0].sourceHashAtCreation,chain.sourceHashAtCreation);
 assert.equal(preview(c).status,'unknown','Reconfirming the chain alone cannot verify stale constituent bindings');c.saveMeasurementChain();assert.equal(c.state.consistencyReports.at(-1).chains.status,'unknown');assert.equal(c.state.consistencyReports.at(-1).coverage.find(row=>row.id==='dimension-chain-totals').status,'unknown');
}

console.log('PASS: reviewed chain totals, source isolation, stale/cancel/failure guards, exact undo/removal, unknown and mismatch reports, orphan links and backup/handoff.');
