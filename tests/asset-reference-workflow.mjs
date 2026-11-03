import '../src/overlay-footprint.js';
import '../src/item-adjustments.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import '../src/asset-records.js';
import '../src/layer-items.js';
import '../src/review-history.js';
import '../src/consistency-review.js';
import '../src/measurement-anchors.js';
import '../src/measurement-chains.js';
import '../src/opening-bindings.js';
import '../src/correction-contract.js';

// Actual site handlers; inert DOM/storage and invented household-independent records.
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8'),clone=v=>JSON.parse(JSON.stringify(v));
function code(name){const start=app.search(new RegExp('^(?:async )?function '+name+'\\(','m'));assert.ok(start>=0,'Missing '+name);const end=app.indexOf('\n',start),line=app.slice(start,end);return line.endsWith('{')?app.slice(start,app.indexOf('\n}',start)+2):line;}
class Element{
 constructor(tag='div'){this.tag=tag;this._value='';this.textContent='';this.children=[];this.dataset={};this.hidden=false;this.disabled=false;}
 // Native text inputs strip CR/LF; textarea values normalize CRLF and CR to LF.
 set value(v){const text=String(v);this._value=this.tag==='input'?text.replace(/[\r\n]/g,''):this.tag==='textarea'?text.replace(/\r\n?/g,'\n'):text;}get value(){return this._value;}
 replaceChildren(...v){this.children=v;}append(...v){this.children.push(...v);}showModal(){}close(){}click(){this.onclick?.();}
}
function record(){return AssetRecords.validate([{id:'asset-a',projectId:'project-a',name:'Fabricated appliance',manufacturer:'Source maker',model:'Source model',notes:'Source note',linkedRefs:['item:missing'],sources:[{id:'source-a',label:'Fabricated manual',kind:'manual',uri:'https://example.invalid/manual',status:'unverified'}],provenance:{manufacturer:{authority:'imported-source',sourceId:'source-a'},model:{authority:'imported-source',sourceId:'source-a'},notes:{authority:'imported-source',sourceId:'source-a'}},maintenance:[{id:'maintenance-existing',kind:'history',text:'Imported maintenance annotation',date:'2026-01-01'}],issues:[{id:'issue-existing',text:'Imported issue annotation',status:'open',recordedAt:'2026-01-01T00:00:00Z'}]}],{projectId:'project-a'})[0];}
function fixture(){return {schemaVersion:1,projectId:'project-a',stateToken:'token-a',name:'Fabricated project',revision:'v0',note:'',baseSvg:'<svg/>',viewBox:[0,0,100,100],items:[],comments:[],photos:[],original:null,assets:[record()],measurementAnchors:[],measurementChains:[],measurementTolerancePercent:null,consistencyReports:[],changeLog:[],objectSettings:{},layers:{base:true},nextId:1};}
function context(){const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element(/^asset-(name|room|manufacturer|model)$/.test(id)?'input':id==='asset-notes'?'textarea':'div'));return elements.get(id);};const storage={fail:false,writes:0,text:''};const c=vm.createContext({KEY:'fabricated-storage',state:fixture(),clone,JSON,crypto:webcrypto,URL,Blob,Date,Set,Map,history:[],future:[],editingAssetId:null,assetExpected:null,assetDraftLinks:[],assetDraftMaintenance:[],assetDraftIssues:[],assetDraftSources:[],assetActivityDirty:false,assetInitialFields:{},pendingAssetImport:null,storageWriteFailed:false,AssetRecords,LayerItems,ReviewHistory,ConsistencyReview,MeasurementAnchors,MeasurementChains,OpeningBindings,OverlayFootprint,ItemAdjustments,CorrectionContract,$:get,document:{createElement:tag=>new Element(tag)},window:{},localStorage:{setItem(_key,text){if(storage.fail){const e=new Error('Fabricated quota failure');e.name='QuotaExceededError';throw e;}storage.text=text;storage.writes++;}},OriginalOverlay:{validate(){}},validatePhotos(){},assertSourceLocks(){},render(){},inventory:()=>[],selected:null,selectedRefs:new Set(),zoom:1,cancelLandmarkMatch(){},fileText(){},download(){},DOMParser:class{parseFromString(){return {}; }},editableNodes:()=>[{id:'stable'}],safeSVG:s=>s,sourceWithIds:s=>s,XMLSerializer:class{serializeToString=s=>s;},parseVB:()=>[0,0,100,100],normalizedLayers:l=>l,report:()=>({issues:[]})});
 c.storage=storage;c.recordChange=(...args)=>ReviewHistory.recordChange(c.state,...args);
 for(const name of ['notify','saveLocal','restoreSnapshot','remember','validProject','mutate','assetContext','assertAssetContext','assetNotice','showAssetLinks','renderAssetActivity','addAssetSource','setAssetActivityDraft','addAssetMaintenance','removeAssetMaintenance','addAssetIssue','changeAssetIssue','assetProvenanceText','showAssetForm','refreshAssets','saveAssetDraft','stageAssetImport','wireAssets','jsonExport','importJSON','sourceHash','reviewContext','handoff'])vm.runInContext(code(name),c);
 for(const name of ['undo','redo']){const body=app.match(new RegExp("\\$\\('"+name+"'\\)\\.onclick=\\(\\)=>\\{(.*?)\\};",'s'))?.[1];assert.ok(body);vm.runInContext('function '+name+'(){'+body+'}',c);}c.wireAssets();c.showAssetForm('asset-a');return c;
}
const snap=c=>JSON.stringify({state:c.state,history:c.history,future:c.future});
function add(c,{label='Owner supplied manual',kind='manual',uri='https://example.invalid/owner-manual'}={}){c.$('asset-source-label').value=label;c.$('asset-source-kind').value=kind;c.$('asset-source-uri').value=uri;c.$('asset-source-add').click();}
let cases=0;
function test(name,fn){fn();cases++;}
const manual={id:'source-new',label:'Owner manual',kind:'manual',uri:'https://example.invalid/new'};
test('append is detached, append-only, unverified, and preserves all existing metadata',()=>{
 const current=record(),before=clone(current),input=clone(manual),next=AssetRecords.appendSource(current,input);
 assert.deepEqual(current,before);assert.deepEqual(input,manual);for(const key of Object.keys(before))if(key!=='sources')assert.deepEqual(next[key],before[key]);assert.deepEqual(next.sources.slice(0,-1),before.sources);assert.deepEqual(next.sources.at(-1),{...manual,status:'unverified'});
 next.sources[0].label='Detached';next.provenance.model.authority='user';next.issues[0].text='Detached';assert.deepEqual(current,before);
});
test('reject unsupported metadata, IDs, unsafe URI/kind and count overflow without mutation',()=>{
 const current=record(),before=clone(current);
 for(const patch of [{status:'available-at-import'},{status:'changed'},{revision:'new'},{contentHash:'invented'},{importedAt:'2026-01-01T00:00:00Z'},{unknown:'x'},{id:'source-a'},{id:'bad id'},{label:''},{label:'x'.repeat(241)},{kind:'attachment'},{kind:'manual',uri:'obsidian://open?file=Example'},{uri:'javascript:alert(1)'},{uri:'file:///synthetic/file'},{uri:'http://example.invalid/'},{uri:'https://user:secret@example.invalid/'},{uri:'https://example.invalid/%0A'},{uri:'bare-file.pdf'}]){const input={...manual,...patch},snapshot=clone(input);assert.throws(()=>AssetRecords.appendSource(current,input));assert.deepEqual(current,before);assert.deepEqual(input,snapshot);}
 const full={...current,sources:Array.from({length:100},(_,i)=>({...manual,id:'source-'+i,status:'unverified'})),provenance:{}};assert.throws(()=>AssetRecords.appendSource(full,manual));
});
test('append retains historical evidence and accepts vault metadata without checking it',()=>{
 const current=record();current.sources[0].status='available-at-import';current.sources[0].importedAt='2026-01-01T00:00:00Z';current.sources[0].revision='revision-a';current.sources[0].contentHash='fabricated-hash';const next=AssetRecords.appendSource(current,{...manual,kind:'vault-note',uri:'obsidian://open?vault=Example&file=Synthetic%20Note'});assert.deepEqual(next.sources[0],current.sources[0]);assert.equal(next.sources[1].status,'unverified');
});
test('existing draft previews inert hostile-looking labels, retains text/activity and cancels',()=>{
 const c=context(),before=snap(c);c.$('asset-name').value='Unsaved name';c.$('asset-maintenance-text').value='Draft maintenance';c.$('asset-maintenance-add').click();add(c,{label:'<img src=x onerror=alert(1)>'});assert.equal(c.assetDraftSources.length,1);assert.equal(c.$('asset-name').value,'Unsaved name');assert.equal(c.assetDraftMaintenance.length,2);assert.equal(snap(c),before);assert.equal(c.storage.writes,0);assert.match(c.$('asset-source-preview').textContent,/<img src=x onerror=alert\(1\)>/);assert.match(c.$('asset-source-preview').textContent,/Unverified/);assert.equal(c.$('asset-source-preview').children.length,0);assert.match(c.$('asset-source-status').textContent,/unsaved/);c.$('asset-cancel').click();assert.equal(c.assetDraftSources.length,0);assert.equal(snap(c),before);assert.equal(c.$('asset-name').value,'Fabricated appliance');
});
test('save references plus owner text/activity once, preserve evidence, undo and redo exactly',()=>{
 const c=context(),original=clone(c.state.assets[0]);c.$('asset-notes').value='Owner note';add(c);const source=clone(c.assetDraftSources[0]);c.$('asset-issue-text').value='Owner issue';c.$('asset-issue-add').click();c.saveAssetDraft();const saved=clone(c.state.assets[0]);assert.deepEqual(saved.sources,[...original.sources,source]);assert.deepEqual(saved.provenance.model,original.provenance.model);assert.equal(saved.notes,'Owner note');assert.equal(saved.issues.length,2);assert.equal(c.history.length,1);assert.equal(c.storage.writes,1);assert.equal(c.state.changeLog.length,1);assert.equal(c.assetDraftSources.length,0);c.undo();assert.deepEqual(clone(c.state.assets[0]),original);c.redo();assert.deepEqual(clone(c.state.assets[0]),saved);
});
test('new asset keeps reference added before the required name is entered',()=>{
 const c=context();c.showAssetForm();add(c,{kind:'vault-note',uri:'obsidian://open?file=Synthetic%20Note'});c.$('asset-name').value='New source-linked asset';c.saveAssetDraft();const created=c.state.assets.find(a=>a.name==='New source-linked asset');assert.ok(created);assert.equal(created.sources.length,1);assert.equal(created.sources[0].status,'unverified');assert.equal(c.history.length,1);
});
test('stale state and foreign project reject add and save without losing pending draft',()=>{
 for(const field of ['stateToken','projectId']){const c=context();add(c);const pending=clone(c.assetDraftSources);c.state[field]='changed';const before=snap(c);add(c,{label:'Stale reference'});assert.deepEqual(clone(c.assetDraftSources),pending);c.saveAssetDraft();assert.equal(snap(c),before);assert.equal(c.storage.writes,0);assert.match(c.$('asset-message').textContent,/changed/);}
});
test('storage rejection keeps draft and prior state for one successful retry',()=>{
 const c=context();add(c);const pending=clone(c.assetDraftSources),before=snap(c);c.storage.fail=true;c.saveAssetDraft();assert.equal(snap(c),before);assert.deepEqual(clone(c.assetDraftSources),pending);assert.match(c.$('asset-message').textContent,/cancelled|storage/i);c.storage.fail=false;c.saveAssetDraft();assert.equal(c.history.length,1);assert.equal(c.storage.writes,1);assert.deepEqual(clone(c.state.assets[0].sources.at(-1)),pending[0]);
});
test('transaction policy rejection leaves references unsaved and reports error',()=>{
 const c=context();add(c);const before=snap(c);c.assertSourceLocks=()=>{throw Error('Fabricated source policy rejection');};c.saveAssetDraft();assert.equal(snap(c),before);assert.equal(c.storage.writes,0);assert.equal(c.assetDraftSources.length,1);assert.match(c.$('asset-message').textContent,/policy rejection/);
});
test('invalid typed reference and duplicate ID do not persist or alter draft',()=>{
 const c=context(),before=snap(c);add(c,{uri:'javascript:alert(1)'});assert.equal(c.assetDraftSources.length,0);assert.equal(snap(c),before);c.saveAssetDraft();assert.equal(c.storage.writes,0);assert.match(c.$('asset-message').textContent,/typed reference/);c.showAssetForm('asset-a');c.crypto={randomUUID:()=> 'collision'};add(c);const pending=clone(c.assetDraftSources);add(c);assert.deepEqual(clone(c.assetDraftSources),pending);assert.match(c.$('asset-message').textContent,/Duplicate/);assert.equal(snap(c),before);
});
test('count bound disables add, rejects programmatic overflow, and can still save 100',()=>{
 const c=context();c.state.assets[0].sources=Array.from({length:99},(_,i)=>({...manual,id:i===0?'source-a':'existing-'+i,status:'unverified'}));c.showAssetForm('asset-a');add(c);assert.equal(c.$('asset-source-add').disabled,true);const pending=clone(c.assetDraftSources),before=snap(c);add(c);assert.deepEqual(clone(c.assetDraftSources),pending);assert.equal(snap(c),before);c.$('asset-source-label').value='';c.$('asset-source-uri').value='';c.saveAssetDraft();assert.equal(c.state.assets[0].sources.length,100);assert.equal(c.history.length,1);
});
test('closing and switching assets discard additions without writing',()=>{
 const c=context(),before=snap(c);add(c);c.$('assets-close').click();assert.equal(c.assetDraftSources.length,0);add(c);c.$('assets-dialog').oncancel();assert.equal(c.assetDraftSources.length,0);add(c);c.$('asset-new').click();assert.equal(c.assetDraftSources.length,0);assert.equal(snap(c),before);assert.equal(c.storage.writes,0);
});
{
 const c=context();add(c);c.saveAssetDraft();let blob;c.download=(_name,value)=>blob=value;await c.jsonExport();const text=await blob.text(),saved=clone(c.state.assets),restored=context();await restored.importJSON(text);assert.deepEqual(clone(restored.state.assets),saved);c.handoff();const envelope=JSON.parse(c.$('handoff-text').value.split('\n\n').slice(1).join('\n\n'));assert.deepEqual(envelope.assets,saved);cases++;
}
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');for(const id of ['asset-source-label','asset-source-kind','asset-source-uri','asset-source-add','asset-source-status','asset-source-preview'])assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'Unique rendered source control '+id);
console.log('PASS: '+cases+' asset-reference domain/production workflow cases; unverified append-only metadata, inert preview, cancellation, stale/policy/storage guards, exact Undo/Redo and backup/handoff preservation.');
