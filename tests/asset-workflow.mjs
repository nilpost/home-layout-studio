import '../src/overlay-footprint.js';
import '../src/item-adjustments.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import '../src/asset-records.js';
import '../src/measurement-anchors.js';
import '../src/measurement-chains.js';
import '../src/opening-bindings.js';
import '../src/layer-items.js';
import '../src/review-history.js';
import '../src/consistency-review.js';

// Execute site workflow functions with fabricated records and inert browser boundaries.
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const clone=v=>JSON.parse(JSON.stringify(v));
function code(name){const start=app.search(new RegExp('^(?:async )?function '+name+'\\(','m'));assert.ok(start>=0,'Missing '+name);const end=app.indexOf('\n',start),line=app.slice(start,end);return line.endsWith('{')?app.slice(start,app.indexOf('\n}',start)+2):line;}
class Element{
 constructor(){this.value='';this.textContent='';this.hidden=false;this.disabled=false;this.children=[];this.dataset={};}
 replaceChildren(...children){this.children=children;}append(...children){this.children.push(...children);}showModal(){}close(){}addEventListener(){}click(){this.onclick?.();}
}
const fixture=()=>({schemaVersion:1,projectId:'project-a',stateToken:'state-a',name:'Fabricated project',revision:'v0',baseSvg:'<svg/>',viewBox:[0,0,100,100],items:[{id:'box-a',kind:'rect',x:0,y:0,w:10,h:10}],comments:[],photos:[],original:null,objectSettings:{},assets:[],consistencyReports:[],changeLog:[],note:'',nextId:1,layers:{base:true,photos:true}});
function context(){
 const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};let saves=0;
 const c=vm.createContext({state:fixture(),clone,crypto:webcrypto,URL,Blob,Date,Set,Map,history:[],future:[],selectedRefs:new Set(['item:box-a']),editingAssetId:null,assetExpected:null,assetDraftLinks:[],pendingAssetImport:null,assetDraftMaintenance:[],assetDraftIssues:[],assetActivityDirty:false,assetInitialFields:{},selected:null,zoom:1,$:get,document:{createElement:()=>new Element()},AssetRecords,MeasurementAnchors,MeasurementChains,OpeningBindings,OverlayFootprint,ItemAdjustments,LayerItems,ReviewHistory,ConsistencyReview,OriginalOverlay:{validate(){}},validatePhotos(){},assertSourceLocks(){},render(){},saveLocal:()=>saves++,notify:text=>get('message').textContent=text,cancelLandmarkMatch(){},fileText(){},download(){},DOMParser:class{parseFromString(){return {}; }},editableNodes:()=>[{id:'stable'}],safeSVG:s=>s,sourceWithIds:s=>s,XMLSerializer:class{serializeToString=s=>s;},parseVB:()=>[0,0,100,100],normalizedLayers:l=>l});
 c.inventory=()=>c.state.items.map(i=>({ref:'item:'+i.id,id:i.id,name:'Fabricated box'}));
 c.recordChange=(...args)=>ReviewHistory.recordChange(c.state,...args);
 c.saves=()=>saves;
 for(const name of ['remember','restoreSnapshot','validProject','mutate','assetContext','assertAssetContext','assetNotice','showAssetLinks','assetProvenanceText','renderAssetActivity','setAssetActivityDraft','addAssetMaintenance','removeAssetMaintenance','addAssetIssue','changeAssetIssue','showAssetForm','refreshAssets','saveAssetDraft','stageAssetImport','wireAssets','jsonExport','importJSON'])vm.runInContext(code(name),c);
 for(const name of ['undo','redo']){const body=app.match(new RegExp("\\$\\('"+name+"'\\)\\.onclick=\\(\\)=>\\{(.*?)\\};",'s'))?.[1];assert.ok(body);vm.runInContext('function '+name+'(){'+body+'}',c);}
 c.wireAssets();return c;
}
const importedRecord=()=>AssetRecords.validate([{id:'asset-a',projectId:'project-a',name:'Fabricated appliance',model:'Source model',linkedRefs:['item:box-a','photo:missing'],sources:[{id:'source-a',kind:'manual',label:'Fabricated manual',uri:'https://example.invalid/manual',status:'available-at-import',importedAt:'2026-01-01T00:00:00Z'}],provenance:{model:{authority:'imported-source',sourceId:'source-a'}},maintenance:[{id:'maintenance-a',kind:'history',text:'Fabricated maintenance'}],issues:[{id:'issue-a',status:'open',text:'Fabricated issue'}]}],{projectId:'project-a'})[0];
const payload=record=>JSON.stringify({assetSchemaVersion:1,projectId:'project-a',assets:[record]});

{
 const c=context();c.showAssetForm();c.$('asset-name').value='Created appliance';c.assetDraftLinks=['item:box-a'];c.saveAssetDraft();
 assert.equal(c.state.assets.length,1);assert.equal(c.state.assets[0].name,'Created appliance');assert.equal(c.state.assets[0].provenance.name.authority,'user');assert.equal(c.state.changeLog.length,1);
 const created=clone(c.state.assets);c.undo();assert.equal(c.state.assets.length,0);c.redo();assert.deepEqual(clone(c.state.assets),created,'Redo restores exact asset identity and links');
 c.showAssetForm(created[0].id);c.$('asset-delete').click();assert.equal(c.state.assets.length,0);c.undo();assert.deepEqual(clone(c.state.assets),created,'Undo restores deleted asset metadata');
}
{
 const c=context(),record=importedRecord();c.state.assets=[record];c.showAssetForm(record.id);c.$('asset-notes').value='Owner annotation';c.saveAssetDraft();
 assert.equal(c.state.assets[0].provenance.model.authority,'imported-source');assert.deepEqual(clone(c.state.assets[0].sources),record.sources);assert.deepEqual(clone(c.state.assets[0].maintenance),record.maintenance);assert.deepEqual(clone(c.state.assets[0].issues),record.issues);assert.ok(c.state.assets[0].linkedRefs.includes('photo:missing'),'Orphan references are retained');
 c.$('asset-model').value='Owner model';c.saveAssetDraft();assert.deepEqual(clone(c.state.assets[0].provenance.model),{authority:'user'});
 c.showAssetForm(record.id);c.$('asset-model').value='Uncommitted';c.$('asset-cancel').click();assert.equal(c.$('asset-model').value,'Owner model');assert.equal(c.state.assets[0].model,'Owner model');
 c.state.stateToken='changed-state';const before=JSON.stringify(c.state),history=JSON.stringify(c.history);c.$('asset-name').value='Stale';c.saveAssetDraft();assert.equal(JSON.stringify(c.state),before);assert.equal(JSON.stringify(c.history),history);assert.match(c.$('asset-message').textContent,/changed/i);
}
{
 const c=context();c.showAssetForm();c.$('asset-name').value='Capacity test';c.state.changeLog=Array.from({length:2000},()=>({summary:'Fabricated event',revision:'v0',commentIds:[],changes:[]}));
 const before=JSON.stringify(c.state),saved=c.saves();c.saveAssetDraft();assert.equal(JSON.stringify(c.state),before);assert.equal(c.history.length,0);assert.equal(c.saves(),saved);assert.match(c.$('asset-message').textContent,/history|cancelled|full/i);
}
{
 const c=context(),record=importedRecord(),before=JSON.stringify(c.state);c.showAssetForm();c.stageAssetImport(payload(record));
 assert.equal(JSON.stringify(c.state),before,'Import preview has no committed effects');assert.ok(c.pendingAssetImport.findings.some(f=>f.code==='missing-item-reference'));assert.equal(c.$('asset-import-preview').hidden,false);
 c.$('asset-import-cancel').click();assert.equal(c.pendingAssetImport,null);assert.equal(JSON.stringify(c.state),before);
 c.stageAssetImport(payload(record));c.$('asset-import-apply').click();assert.deepEqual(clone(c.state.assets),[record]);assert.equal(c.history.length,1);assert.equal(c.state.changeLog.at(-1).type,'asset-import');
 c.undo();assert.equal(c.state.assets.length,0);c.redo();assert.deepEqual(clone(c.state.assets),[record]);
 const imported=JSON.stringify(c.state);c.stageAssetImport(payload(record));assert.equal(c.pendingAssetImport,null);assert.match(c.$('asset-message').textContent,/replace/i);assert.equal(JSON.stringify(c.state),imported);
}
{
 const c=context();c.stageAssetImport(payload(importedRecord()));c.state.stateToken='new-state';const before=JSON.stringify(c.state);c.$('asset-import-apply').click();assert.equal(JSON.stringify(c.state),before);assert.equal(c.history.length,0);assert.match(c.$('asset-message').textContent,/changed/i);
 c.stageAssetImport(JSON.stringify({assetSchemaVersion:1,projectId:'project-foreign',assets:[]}));assert.equal(c.pendingAssetImport,null);assert.match(c.$('asset-message').textContent,/Foreign/);
}
{
 const c=context(),record=importedRecord();c.state.assets=[record];let backup;c.download=(_name,blob)=>backup=blob;
 await c.jsonExport();const text=await backup.text(),json=JSON.parse(text);assert.deepEqual(json.assets,[record]);
 const restored=context();await restored.importJSON(text);assert.deepEqual(clone(restored.state.assets),[record]);assert.equal(restored.state.projectId,'project-a');
 const bad={...json};delete bad.projectId;const before=JSON.stringify(restored.state),history=JSON.stringify(restored.history),saved=restored.saves();
 await assert.rejects(restored.importJSON(JSON.stringify(bad)),/project|identity/i);assert.equal(JSON.stringify(restored.state),before);assert.equal(JSON.stringify(restored.history),history);assert.equal(restored.saves(),saved,'Identity-invalid import does not persist');
}

{
 const c=context(),asset=importedRecord();asset.linkedRefs=['item:item-1'];c.state.assets=[asset];c.state.items=[{id:'item-1',kind:'rect',x:0,y:0,w:10,h:10}];c.state.nextId=2;
 const start=app.indexOf("$('svg-file').onchange="),end=app.indexOf(";$('handoff').onclick",start);assert.ok(start>=0&&end>start,'SVG replacement handler');
 c.fileText=(_input,handler)=>handler('<svg id="replacement"/>');vm.runInContext(app.slice(start,end),c);c.$('svg-file').onchange();
 assert.equal(c.state.items.length,0);assert.ok(c.state.assets[0].linkedRefs.includes('item:item-1'));
 c.active={type:'draw',start:{x:0,y:0},p:{x:20,y:20},color:'#000000'};c.tool='rect';c.photoPointerUp=()=>false;c.round=n=>n;
 vm.runInContext(code('pointerUp'),c);c.pointerUp({});
 assert.notEqual(c.state.items[0].id,'item-1','Replacement SVG must not recycle IDs and silently relink orphaned assets to unrelated new items');
 assert.ok(AssetRecords.findings(c.state.assets,{knownRefs:c.inventory().map(e=>e.ref)}).some(f=>f.code==='missing-item-reference'));
}


{
 const c=context(),asset=importedRecord();asset.linkedRefs=['base:source-wall'];c.state.assets=[asset];
 const start=app.indexOf("$('svg-file').onchange="),end=app.indexOf(";$('handoff').onclick",start);
 c.fileText=(_input,handler)=>handler('<svg id="replacement"/>');vm.runInContext(app.slice(start,end),c);
 const before=JSON.stringify(c.state),saved=c.saves();c.$('svg-file').onchange();
 assert.equal(JSON.stringify(c.state),before,'Full SVG replacement with base-linked assets must preserve source and asset identities');assert.equal(c.history.length,0);assert.equal(c.saves(),saved);assert.match(c.$('message').textContent,/asset|link|source/i);
}

{
 const c=context(),untrusted='Synthetic <img src=https://example.invalid/never-fetch onerror=alert(1)>\nSecond label line';
 const sources=[
  {id:'source-unverified',label:untrusted,kind:'vault-note',uri:'obsidian://open?vault=Example&file=Synthetic%20Reference',status:'unverified',revision:'revision-unverified',contentHash:'hash-unverified'},
  {id:'source-import',label:'Synthetic historical manual',kind:'manual',uri:'https://example.invalid/manual-at-import',status:'available-at-import',revision:'revision-import',contentHash:'hash-import',importedAt:'2025-03-04T05:06:07.123Z'},
  {id:'source-unavailable',label:'Synthetic unavailable reference',kind:'other',uri:'https://example.invalid/unavailable',status:'unavailable',revision:'revision-unavailable',contentHash:'hash-unavailable',importedAt:'2024-01-02T03:04:05Z'},
  {id:'source-changed',label:'Synthetic changed manual',kind:'manual',uri:'https://example.invalid/changed',status:'changed',revision:'revision-changed',contentHash:'hash-changed'}
 ];
 const record=AssetRecords.validate([{...importedRecord(),name:'Synthetic readable provenance',room:'Synthetic room',manufacturer:'Owner-entered maker',notes:'Synthetic source note\nMultiline owner-visible content',sources,linkedRefs:['item:box-a','photo:missing','original:reference'],provenance:{name:{authority:'user'},room:{authority:'unverified',sourceId:'source-unavailable'},manufacturer:{authority:'user',sourceId:'source-changed'},model:{authority:'imported-source',sourceId:'source-import'},notes:{authority:'imported-source',sourceId:'source-unverified'}}}],{projectId:'project-a'})[0];
 c.state.assets=[record];c.assetDraftMaintenance=[{id:'draft-only',kind:'history',text:'Unsaved synthetic activity'}];c.$('asset-model').value='Unsaved field value';
 const before=JSON.stringify(c.state),history=JSON.stringify(c.history),future=JSON.stringify(c.future),draft=JSON.stringify(c.assetDraftMaintenance),saved=c.saves();
 let externalActions=0;const forbid=()=>{externalActions++;throw Error('Formatting must not perform external actions');};c.fetch=forbid;c.open=forbid;c.window={fetch:forbid,open:forbid};c.XMLHttpRequest=class{constructor(){forbid();}};c.Image=class{constructor(){forbid();}};
 const text=c.assetProvenanceText(record);
 assert.equal(typeof text,'string');
 for(const phrase of ['Asset name: User annotation','Room / zone: Unverified','Manufacturer: User annotation','Model: Imported source','Notes: Imported source'])assert.ok(text.includes(phrase),phrase);
 assert.ok(text.includes('Model: Imported source · Reference: Synthetic historical manual [source-import]'),'Source-derived model retains exact source identity association');
 assert.ok(text.includes('Manufacturer: User annotation · Reference: Synthetic changed manual [source-changed]'),'User annotations with source references retain that association');
 assert.ok(text.includes('Room / zone: Unverified · Reference: Synthetic unavailable reference [source-unavailable]'),'Unverified fields retain their source association');
 assert.ok(text.includes('Notes: Imported source · Reference: '+untrusted+' [source-unverified]'),'Multiline labels remain literal reference text');
 for(const source of sources){for(const value of [source.id,source.label,source.uri,source.revision,source.contentHash,source.importedAt].filter(Boolean))assert.ok(text.includes(value),'Readable source details retain '+value);}
 for(const phrase of ['Unverified — source has not been checked','Available at import only — current availability is unverified','Reported unavailable — linked facts need review','Reported changed — review dependent fields','Vault note','Manual','Other reference'])assert.ok(text.includes(phrase),phrase);
 for(const ref of ['photo:missing','original:reference'])assert.ok(text.includes('Missing layout item: '+ref+' — stable reference retained.'));
 assert.equal(text.includes('Missing layout item: item:box-a'),false,'Available local item is not reported missing');
 assert.match(text,/not independent verification/);assert.match(text,/No source is opened, fetched or updated/);
 assert.equal(JSON.stringify(c.state),before);assert.equal(JSON.stringify(c.history),history);assert.equal(JSON.stringify(c.future),future);assert.equal(JSON.stringify(c.assetDraftMaintenance),draft);assert.equal(c.$('asset-model').value,'Unsaved field value');assert.equal(c.saves(),saved);assert.equal(externalActions,0,'Read-only formatting never fetches or opens references');
 const target=c.$('asset-provenance');Object.defineProperty(target,'innerHTML',{set(){throw Error('Untrusted reference text cannot be interpreted as HTML');}});target.insertAdjacentHTML=()=>{throw Error('Untrusted reference text cannot be interpreted as HTML');};
 c.showAssetForm(record.id);assert.equal(target.textContent,text,'The actual form renders the formatter through a plain text sink');assert.ok(target.textContent.includes('<img src=https://example.invalid/never-fetch onerror=alert(1)>'));assert.equal(target.children.length,0,'Reference values do not create active DOM children');assert.equal(externalActions,0);assert.equal(JSON.stringify(c.state),before);assert.equal(c.saves(),saved);
 const noSources=AssetRecords.createRecord({id:'synthetic-no-sources',projectId:'project-a',name:'Synthetic local annotation'}),localText=c.assetProvenanceText(noSources);assert.match(localText,/No knowledge references linked/);assert.match(localText,/not a live source check/);
 assert.match(c.assetProvenanceText(null),/No source facts are inferred/);
}

console.log('PASS: transactional assets, plain-text provenance/source evidence, historical availability, inert references, draft isolation and private backup round trip.');
