import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const domains={LayoutGeometry:'geometry',ReviewHistory:'review-history',OriginalOverlay:'original-overlay',LayerItems:'layer-items',ConsistencyReview:'consistency-review',CorrectionContract:'correction-contract',OverlayFootprint:'overlay-footprint',ItemAdjustments:'item-adjustments',GeometryCoverage:'geometry-coverage',AssetRecords:'asset-records',MeasurementAnchors:'measurement-anchors',MeasurementChains:'measurement-chains'};
// Execute the complete app IIFE and actual domain validators. Substitute only the four
// post-load browser boundaries so rejection must occur in the real startup control flow.
let startup=app;
for(const [name,body]of Object.entries({migrateObjectIds:'metrics.migrations++;',wire:"metrics.wires++;document.getElementById('save-project').onclick=()=>metrics.exports++;",chooseTool:'metrics.tools++;',render:'metrics.renders++;metrics.loadedName=state.name;metrics.loadedAssets=JSON.stringify(state.assets||[]);'})){
 const start=startup.search(new RegExp('^function '+name+'\\(','m'));assert(start>=0,'Missing startup boundary '+name);
 const newline=startup.indexOf('\n',start),line=startup.slice(start,newline),end=line.endsWith('{')?startup.indexOf('\n}',start)+2:newline;
 assert(end>start,'Malformed startup boundary '+name);
 startup=startup.slice(0,start)+'function '+name+'(){'+body+'}'+startup.slice(end);
}
function fixture(patch={}){return {schemaVersion:1,projectId:'synthetic-project',stateToken:'synthetic-token',name:'Synthetic saved project',revision:'v2',baseSvg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"/>',viewBox:[0,0,100,100],items:[],comments:[],changeLog:[],nextId:1,note:'',calibration:null,photos:[],original:null,objectSettings:{},assets:[],measurementAnchors:[],measurementChains:[],consistencyReports:[],layers:{base:true,furniture:true,markup:true,comments:true,photos:true},...patch};}
class SvgNode{
 constructor(localName='svg'){this.localName=localName;this.namespaceURI='http://www.w3.org/2000/svg';this.attributes=[];}
 querySelectorAll(){return [];}getAttribute(key){return key==='viewBox'?'0 0 100 100':null;}removeAttribute(){}remove(){}
}
function boot({missing,saved=null,readFailure=false}={}){
 const elements=new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],{disabled:false,textContent:'',onclick:null,onchange:null,oninput:null}]));
 const controlIds=[...html.matchAll(/<(?:button|input|select|textarea)\b[^>]*\bid="([^"]+)"/g)].map(m=>m[1]);
 const metrics={reads:0,writes:0,removals:0,mediaOperations:0,migrations:0,wires:0,tools:0,renders:0,exports:0,loadedName:null};
 const media=new Map([['synthetic-preserved-media','opaque fixture bytes']]),initialMedia=[...media];
 let stored=saved;
 const context=vm.createContext({metrics,crypto:webcrypto,URL,Blob,Date,Set,Map,
  document:{getElementById:id=>elements.get(id)||null,querySelectorAll:()=>controlIds.map(id=>elements.get(id))},
  localStorage:{getItem(){metrics.reads++;if(readFailure)throw Error('Synthetic storage read unavailable');return stored;},setItem(_key,value){metrics.writes++;stored=value;},removeItem(){metrics.removals++;stored=null;},clear(){metrics.removals++;stored=null;}},
  indexedDB:{open(){metrics.mediaOperations++;throw Error('Startup must not touch fixture media');}},
  DOMParser:class{parseFromString(value){const node=new SvgNode(/^\s*<svg\b/.test(value)?'svg':'html');return {documentElement:node,querySelectorAll:()=>[],getElementsByTagName:()=>[],getElementById:()=>null};}},
  XMLSerializer:class{serializeToString(){return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"/>';}}
 });
 context.window=context;
 for(const [name,file]of Object.entries(domains))if(name!==missing)vm.runInContext(fs.readFileSync(new URL('../src/'+file+'.js',import.meta.url),'utf8'),context,{filename:file+'.js'});
 vm.runInContext(startup,context,{filename:'app-startup.js'});
 return {elements,controlIds,metrics,stored,media,initialMedia};
}
function assertBlocked(result,saved,explanation){
 assert.equal(result.stored,saved,'Recovery must preserve the exact saved bytes');
 assert.equal(result.metrics.writes,0);assert.equal(result.metrics.removals,0);assert.equal(result.metrics.mediaOperations,0);
 assert.deepEqual([...result.media],result.initialMedia,'Private media must remain untouched');
 for(const metric of ['migrations','wires','tools','renders','exports'])assert.equal(result.metrics[metric],0,'Blocked startup must not run '+metric);
 for(const id of result.controlIds){const control=result.elements.get(id);assert.equal(control.disabled,true,'Blocked control '+id);assert.equal(control.onclick,null,'No action wired for '+id);assert.equal(control.onchange,null);assert.equal(control.oninput,null);}
 assert.match(result.elements.get('save-status').textContent,/blocked|not ready/i);
 assert.match(result.elements.get('message').textContent,explanation);
 assert.match(result.elements.get('message').textContent,/reload|retry/i,'Recovery must explain the next action');
 assert.match(result.elements.get('message').textContent,/untouched|preserv|no stored project or media has been cleared/i);
}
const validSaved=JSON.stringify(fixture());
for(const name of Object.keys(domains)){
 const result=boot({missing:name,saved:validSaved});assertBlocked(result,validSaved,new RegExp(name));
 assert.equal(result.metrics.reads,0,'Missing components must block before reading project storage');
}
const invalidSaved=[
 '',
 '{malformed synthetic JSON',
 JSON.stringify(fixture({schemaVersion:99})),
 JSON.stringify(fixture({assets:[{id:'foreign-asset',projectId:'foreign-project',name:'Synthetic foreign record'}]})),
 JSON.stringify(fixture({assets:[{id:'synthetic-asset',projectId:'synthetic-project',name:'Synthetic record',manufacturer:123}]})),
 JSON.stringify(fixture({baseSvg:'<html/>'})),
 JSON.stringify(fixture({measurementAnchors:[{id:'orphan',projectId:'foreign-project',dimensionId:'synthetic-dimension',start:{segmentId:'synthetic-wall:0',endpoint:'a'},end:{segmentId:'synthetic-wall:0',endpoint:'b'},sourceHashAtCreation:'synthetic-hash'}]}))
];
for(const saved of invalidSaved){const result=boot({saved});assertBlocked(result,saved,/saved project|could not be opened|unavailable/i);assert.equal(result.metrics.reads,1);}
assertBlocked(boot({saved:validSaved,readFailure:true}),validSaved,/storage read unavailable/i);
for(const saved of [null,validSaved]){
 const result=boot({saved});
 for(const metric of ['migrations','wires','tools','renders'])assert.equal(result.metrics[metric],1,'Healthy startup reaches '+metric);
 assert.equal(result.metrics.loadedName,saved?'Synthetic saved project':'Untitled home');
 assert.equal(result.stored,saved);assert.equal(result.metrics.writes,0);assert.equal(result.metrics.removals,0);assert.equal(result.metrics.mediaOperations,0);
 assert.equal(result.elements.get('save-project').disabled,false);
 result.elements.get('save-project').onclick();assert.equal(result.metrics.exports,1,'Healthy startup wires actions');
}
console.log('PASS: full startup control flow blocks every missing domain and invalid saved project before wiring/migration/writes, preserves storage/media, and permits valid saved or empty-demo startup.');
