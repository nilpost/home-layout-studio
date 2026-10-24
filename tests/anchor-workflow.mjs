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

// Production site workflow, fabricated geometry and inert browser/storage boundaries.
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8'),clone=v=>JSON.parse(JSON.stringify(v));
function code(name){const start=app.search(new RegExp('^(?:async )?function '+name+'\\(','m'));assert.ok(start>=0,'Missing '+name);const end=app.indexOf('\n',start),line=app.slice(start,end);return line.endsWith('{')?app.slice(start,app.indexOf('\n}',start)+2):line;}
class Element{constructor(){this.value='';this.textContent='';this.hidden=false;this.disabled=false;this.children=[];this.events={};}replaceChildren(...v){this.children=v;}append(...v){this.children.push(...v);}addEventListener(name,fn){this.events[name]=fn;}showModal(){}close(){}setAttribute(){}click(){this.onclick?.();}}
const fixture=()=>({schemaVersion:1,projectId:'project-a',stateToken:'token-a',revision:'v0',name:'Fabricated project',note:'',baseSvg:'<svg/>',viewBox:[0,0,100,100],items:[],comments:[],photos:[],assets:[],measurementAnchors:[],measurementTolerancePercent:null,consistencyReports:[],objectSettings:{},original:null,nextId:1,layers:{base:true}});
const geometry=()=>({segments:[{id:'wall-a',kind:'wall',a:[0,0],b:[100,0]}],dimensions:[{id:'dimension-a',value:100,unit:'mm',unitStatus:'verified',a:[0,-10],b:[100,-10]}]});
function context(){const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};const c=vm.createContext({state:fixture(),clone,JSON,crypto:webcrypto,Blob,Date,Set,Map,history:[],future:[],pendingMeasurement:null,measurementExpected:null,model:geometry(),MeasurementAnchors,MeasurementChains,OverlayFootprint,ItemAdjustments,AssetRecords,LayerItems,ReviewHistory,ConsistencyReview,CorrectionContract,$:get,document:{createElement:()=>new Element()},window:{},OriginalOverlay:{validate(){}},validatePhotos(){},assertSourceLocks(){},render(){},storageFail:false,saveLocal:()=>!c.storageFail,notify:text=>get('message').textContent=text,recordChange:(...args)=>ReviewHistory.recordChange(c.state,...args),geometryOf:()=>c.model,make:()=>new Element(),reviewRuns:0,runConsistencyReview:()=>{c.reviewRuns++;return true;},selected:null,selectedRefs:new Set(),zoom:1,cancelLandmarkMatch(){},fileText(){},download(){},DOMParser:class{parseFromString(){return {}; }},editableNodes:()=>[{id:'stable'}],safeSVG:s=>s,sourceWithIds:s=>s,XMLSerializer:class{serializeToString=s=>s;},parseVB:()=>[0,0,100,100],normalizedLayers:l=>l,report:()=>({issues:[]})});
 for(const name of ['sourceHash','restoreSnapshot','remember','validProject','mutate','reviewContext','assertAssetContext','invalidateMeasurementPreview','populateMeasurementEditor','previewMeasurement','saveMeasurementBinding','wireMeasurements','jsonExport','importJSON','handoff','runConsistencyReview'])vm.runInContext(code(name),c);
 for(const name of ['undo','redo']){const body=app.match(new RegExp("\\$\\('"+name+"'\\)\\.onclick=\\(\\)=>\\{(.*?)\\};",'s'))?.[1];assert.ok(body);vm.runInContext('function '+name+'(){'+body+'}',c);}
 if(/^function measurementPreviewText\(/m.test(app))vm.runInContext(code('measurementPreviewText'),c);
 c.report=()=>{const model={...c.model,calibration:c.state.calibration},r=LayoutGeometry.validate(model);r.anchoredReview=MeasurementAnchors.review({anchors:c.state.measurementAnchors,projectId:c.state.projectId,segments:model.segments,dimensions:model.dimensions,calibration:c.state.calibration,tolerancePercent:c.state.measurementTolerancePercent,sourceHash:c.sourceHash(c.state.baseSvg)});return r;};c.reviewOptions=()=>{};const runReview=c.runConsistencyReview;c.runConsistencyReview=()=>{c.reviewRuns++;return runReview();};
 c.wireMeasurements();return c;
}
function choose(c){c.populateMeasurementEditor();c.$('measurement-dimension').value='dimension-a';c.$('measurement-start').value=JSON.stringify({segmentId:'wall-a',endpoint:'a'});c.$('measurement-end').value=JSON.stringify({segmentId:'wall-a',endpoint:'b'});c.$('measurement-tolerance').value='1';}
function snap(c){return JSON.stringify({state:c.state,history:c.history,future:c.future});}
function preview(c){choose(c);c.previewMeasurement();assert.ok(c.pendingMeasurement,c.$('measurement-message').textContent);const result=MeasurementAnchors.review({anchors:[c.pendingMeasurement.binding],projectId:c.state.projectId,segments:c.model.segments,dimensions:c.model.dimensions,calibration:c.state.calibration,tolerancePercent:c.pendingMeasurement.tolerance,sourceHash:c.sourceHash(c.state.baseSvg)});assert.match(c.$('measurement-preview').textContent,new RegExp(result.status,'i'),'Visible preview must disclose the domain outcome');return result;}

{
 const c=context(),before=snap(c),source=c.state.baseSvg,model=JSON.stringify(c.model);const result=preview(c);
 assert.equal(result.status,'unknown','Choosing a binding cannot verify absent calibration');assert.equal(snap(c),before);assert.equal(c.reviewRuns,0);
 c.$('measurement-cancel').click();assert.equal(c.pendingMeasurement,null);assert.equal(c.$('measurement-save').disabled,true);assert.equal(snap(c),before);assert.equal(c.$('preview-layer').children.length,0);
 preview(c);c.$('measurement-close').click();assert.equal(c.pendingMeasurement,null);assert.equal(snap(c),before);
 preview(c);c.$('measurement-dialog').events.cancel();assert.equal(c.pendingMeasurement,null);assert.equal(snap(c),before);
 preview(c);c.$('measurement-tolerance').value='2';c.$('measurement-tolerance').oninput();assert.equal(c.pendingMeasurement,null);assert.equal(c.$('measurement-save').disabled,true);
 assert.equal(c.state.baseSvg,source);assert.equal(JSON.stringify(c.model),model);
}
{
 const c=context();c.state.calibration={drawingUnits:1,realMillimetres:1,status:'verified'};const source=c.state.baseSvg,model=JSON.stringify(c.model);const result=preview(c);assert.equal(result.status,'pass');const proposed=clone(c.pendingMeasurement.binding);
 c.saveMeasurementBinding();assert.deepEqual(clone(c.state.measurementAnchors),[proposed]);assert.equal(c.state.measurementTolerancePercent,1);assert.equal(c.history.length,1);assert.equal(c.state.changeLog.at(-1).type,'measurement-binding');assert.equal(c.reviewRuns,1);assert.equal(c.state.consistencyReports.at(-1).anchoredReview.status,'pass');assert.equal(c.state.consistencyReports.at(-1).findings.find(f=>f.code==='anchor:'+proposed.id).measured,100);assert.equal(c.state.baseSvg,source);assert.equal(JSON.stringify(c.model),model);
 c.undo();assert.equal(c.state.measurementAnchors.length,0);assert.equal(c.state.measurementTolerancePercent,null);c.redo();assert.deepEqual(clone(c.state.measurementAnchors),[proposed]);
 c.populateMeasurementEditor(proposed.id);c.$('measurement-remove').click();assert.equal(c.state.measurementAnchors.length,0);c.undo();assert.deepEqual(clone(c.state.measurementAnchors),[proposed]);assert.equal(c.state.baseSvg,source);
}
{
 const c=context();preview(c);c.state.stateToken='different-state';const before=snap(c);c.saveMeasurementBinding();assert.equal(snap(c),before);assert.match(c.$('measurement-message').textContent,/changed/i);assert.equal(c.reviewRuns,0);
 choose(c);c.state.stateToken='changed-before-preview';c.previewMeasurement();assert.equal(c.pendingMeasurement,null);assert.match(c.$('measurement-message').textContent,/changed/i);
}
{
 const c=context();preview(c);const before=snap(c);c.storageFail=true;c.saveMeasurementBinding();assert.equal(snap(c),before);assert.equal(c.reviewRuns,0);
 c.storageFail=false;c.state.changeLog=Array.from({length:2000},()=>({summary:'Fabricated event',revision:'v0',commentIds:[],changes:[]}));const full=snap(c);c.saveMeasurementBinding();assert.equal(snap(c),full);assert.equal(c.reviewRuns,0);
}
{
 const c=context();choose(c);c.$('measurement-tolerance').value='';c.previewMeasurement();assert.equal(c.pendingMeasurement,null);assert.match(c.$('measurement-message').textContent,/tolerance/i);
 c.state.calibration={drawingUnits:1,realMillimetres:1,status:'manual'};assert.equal(preview(c).status,'unknown','Manual calibration cannot yield an anchored pass');c.state.calibration.status='verified';c.model.dimensions[0].unitStatus='unverified';assert.equal(preview(c).status,'unknown','Unverified source units cannot yield an anchored pass');
 c.model.dimensions[0].unitStatus='verified';c.model.segments.push(clone(c.model.segments[0]));assert.equal(preview(c).status,'unknown','Duplicate segment identity cannot choose an arbitrary geometry');
}
{
 const c=context();preview(c);c.saveMeasurementBinding();let backup;c.download=(_name,blob)=>backup=blob;await c.jsonExport();const text=await backup.text(),out=JSON.parse(text);assert.deepEqual(out.measurementAnchors,clone(c.state.measurementAnchors));assert.equal(out.measurementTolerancePercent,1);
 const restored=context();await restored.importJSON(text);assert.deepEqual(clone(restored.state.measurementAnchors),out.measurementAnchors);assert.equal(restored.state.measurementTolerancePercent,1);
 c.handoff();const envelope=JSON.parse(c.$('handoff-text').value.split('\n\n').slice(1).join('\n\n'));assert.deepEqual(envelope.measurementAnchors,out.measurementAnchors);assert.equal(envelope.measurementTolerancePercent,1);
 const noProject={...out};delete noProject.projectId;const before=snap(restored);await assert.rejects(restored.importJSON(JSON.stringify(noProject)),/identity|project/i);assert.equal(snap(restored),before);
 const duplicates={...out,measurementAnchors:[out.measurementAnchors[0],out.measurementAnchors[0]]};await assert.rejects(restored.importJSON(JSON.stringify(duplicates)),/duplicate/i);assert.equal(snap(restored),before);
}
{
 const c=context();preview(c);c.saveMeasurementBinding();const before=snap(c),start=app.indexOf("$('svg-file').onchange="),end=app.indexOf(";$('handoff').onclick",start);assert.ok(start>=0&&end>start);c.fileText=(_input,handler)=>handler('<svg id="replacement"/>');vm.runInContext(app.slice(start,end),c);c.$('svg-file').onchange();assert.equal(snap(c),before);assert.match(c.$('message').textContent,/binding|source/i);
}

{
 const c=context();c.state.calibration={drawingUnits:1,realMillimetres:1,status:'verified'};c.model.dimensions[0].unit='Unsupported synthetic printed unit';assert.equal(preview(c).status,'unknown');c.saveMeasurementBinding();const saved=c.state.consistencyReports.at(-1);assert.ok(saved,'Unsupported source units must still produce a saved unknown report');assert.equal(saved.anchoredReview.status,'unknown');assert.equal(saved.coverage[2].status,'unknown');
 c.model.segments=[];c.populateMeasurementEditor(c.state.measurementAnchors[0].id);assert.match(c.$('measurement-preview').textContent,/unknown/i,'Missing source references remain visible');
}
{
 const c=context(),legacy=ConsistencyReview.createReport({projectId:'project-a',stateToken:'old-token',revision:'v0',sourceHash:'fabricated-source',runAt:'2026-01-01T00:00:00.000Z'});legacy.checkerVersion='schematic-1.1.0';legacy.coverage=legacy.coverage.filter(c=>c.id!=='dimension-chain-totals');legacy.coverage[2].detail='Anchored wall/opening dimensions, chains, totals, axes and levels are not modeled.';
 const incoming={...fixture(),consistencyReports:[legacy]};await c.importJSON(JSON.stringify(incoming));assert.deepEqual(clone(c.state.consistencyReports),[legacy],'Legacy review coverage remains inspectable without claiming newly implemented checks');
}

console.log('PASS: anchored span preview/cancel/save/stale and failure rollback, explicit tolerance/verification, undo/removal, backup/handoff and source identity preservation.');
