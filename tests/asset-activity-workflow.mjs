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
function context(){const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element(/^asset-(name|room|manufacturer|model)$/.test(id)?'input':id==='asset-notes'?'textarea':'div'));return elements.get(id);};const storage={fail:false,writes:0,text:''};const c=vm.createContext({KEY:'fabricated-storage',state:fixture(),clone,JSON,crypto:webcrypto,URL,Blob,Date,Set,Map,history:[],future:[],editingAssetId:null,assetExpected:null,assetDraftLinks:[],assetDraftMaintenance:[],assetDraftIssues:[],assetActivityDirty:false,assetInitialFields:{},pendingAssetImport:null,storageWriteFailed:false,AssetRecords,LayerItems,ReviewHistory,ConsistencyReview,MeasurementAnchors,MeasurementChains,CorrectionContract,$:get,document:{createElement:tag=>new Element(tag)},window:{},localStorage:{setItem(_key,text){if(storage.fail){const e=new Error('Fabricated quota failure');e.name='QuotaExceededError';throw e;}storage.text=text;storage.writes++;}},OriginalOverlay:{validate(){}},validatePhotos(){},assertSourceLocks(){},render(){},inventory:()=>[],selected:null,selectedRefs:new Set(),zoom:1,cancelLandmarkMatch(){},fileText(){},download(){},DOMParser:class{parseFromString(){return {}; }},editableNodes:()=>[{id:'stable'}],safeSVG:s=>s,sourceWithIds:s=>s,XMLSerializer:class{serializeToString=s=>s;},parseVB:()=>[0,0,100,100],normalizedLayers:l=>l,report:()=>({issues:[]})});
 c.storage=storage;c.recordChange=(...args)=>ReviewHistory.recordChange(c.state,...args);
 for(const name of ['notify','saveLocal','restoreSnapshot','remember','validProject','mutate','assetContext','assertAssetContext','assetNotice','showAssetLinks','renderAssetActivity','setAssetActivityDraft','addAssetMaintenance','removeAssetMaintenance','addAssetIssue','changeAssetIssue','assetProvenanceText','showAssetForm','refreshAssets','saveAssetDraft','stageAssetImport','wireAssets','jsonExport','importJSON','sourceHash','reviewContext','handoff'])vm.runInContext(code(name),c);
 for(const name of ['undo','redo']){const body=app.match(new RegExp("\\$\\('"+name+"'\\)\\.onclick=\\(\\)=>\\{(.*?)\\};",'s'))?.[1];assert.ok(body);vm.runInContext('function '+name+'(){'+body+'}',c);}c.wireAssets();c.showAssetForm('asset-a');return c;
}
const snap=c=>JSON.stringify({state:c.state,history:c.history,future:c.future});
function descendants(node){return node.children.flatMap(child=>[child,...descendants(child)]);}
function action(c,list,entryId,key,value){const button=descendants(c.$(list)).find(node=>node.dataset.entryId===entryId&&node.dataset[key]===value);assert.ok(button,'Missing rendered '+key+' action');button.click();}
function addMaintenance(c,{kind='schedule',text='Owner maintenance annotation',date='2027-01-01'}={}){c.$('asset-maintenance-kind').value=kind;c.$('asset-maintenance-text').value=text;c.$('asset-maintenance-date').value=date;c.$('asset-maintenance-add').click();}
function addIssue(c,text='Owner issue annotation'){c.$('asset-issue-text').value=text;c.$('asset-issue-add').click();}

{
 const c=context(),before=snap(c);c.$('asset-name').value='Unsaved owner name';addMaintenance(c);addIssue(c);assert.equal(c.assetDraftMaintenance.length,2);assert.equal(c.assetDraftIssues.length,2);assert.equal(c.$('asset-name').value,'Unsaved owner name');assert.equal(snap(c),before);assert.equal(c.storage.writes,0);assert.match(c.$('asset-activity-status').textContent,/unsaved/i);
 const issueId=c.assetDraftIssues[1].id;action(c,'asset-issue-list',issueId,'issueAction','resolve');assert.equal(c.assetDraftIssues[1].status,'resolved');action(c,'asset-issue-list',issueId,'issueAction','reopen');assert.equal(c.assetDraftIssues[1].status,'open');action(c,'asset-issue-list',issueId,'issueAction','remove');assert.equal(c.assetDraftIssues.length,1);
 const maintenanceId=c.assetDraftMaintenance[1].id;action(c,'asset-maintenance-list',maintenanceId,'maintenanceRemove',maintenanceId);assert.equal(c.assetDraftMaintenance.length,1);assert.equal(snap(c),before);assert.equal(c.$('asset-name').value,'Unsaved owner name');
 c.$('asset-cancel').click();assert.equal(c.$('asset-name').value,'Fabricated appliance');assert.deepEqual(clone(c.assetDraftMaintenance),c.state.assets[0].maintenance);assert.deepEqual(clone(c.assetDraftIssues),c.state.assets[0].issues);assert.equal(c.assetActivityDirty,false);assert.equal(snap(c),before);
 addIssue(c);c.$('assets-close').click();assert.deepEqual(clone(c.assetDraftIssues),c.state.assets[0].issues);addIssue(c);c.$('assets-dialog').oncancel();assert.deepEqual(clone(c.assetDraftIssues),c.state.assets[0].issues);assert.equal(snap(c),before);
}
{
 const c=context(),original=clone(c.state.assets[0]);addMaintenance(c);addMaintenance(c,{kind:'history',text:'Owner recorded service',date:''});addIssue(c);action(c,'asset-issue-list','issue-existing','issueAction','resolve');const drafts={maintenance:clone(c.assetDraftMaintenance),issues:clone(c.assetDraftIssues)};c.saveAssetDraft();const saved=clone(c.state.assets[0]);assert.deepEqual(saved.maintenance,drafts.maintenance);assert.deepEqual(saved.issues,drafts.issues);assert.deepEqual(saved.sources,original.sources);assert.deepEqual(saved.provenance,original.provenance);assert.deepEqual(saved.linkedRefs,original.linkedRefs);for(const field of ['name','manufacturer','model','notes'])assert.equal(saved[field],original[field]);assert.equal(c.history.length,1);assert.equal(c.state.changeLog.at(-1).type,'asset-record');assert.equal(c.assetActivityDirty,false);
 c.undo();assert.deepEqual(clone(c.state.assets[0]),original);c.redo();assert.deepEqual(clone(c.state.assets[0]),saved);
 c.showAssetForm('asset-a');c.$('asset-model').value='Owner changed model';addIssue(c);c.saveAssetDraft();assert.deepEqual(clone(c.state.assets[0].provenance.model),{authority:'user'});assert.deepEqual(clone(c.state.assets[0].sources),original.sources);assert.deepEqual(clone(c.state.assets[0].provenance.manufacturer),original.provenance.manufacturer);
}
{
 const c=context();c.state.assets[0]=AssetRecords.updateRecord(c.state.assets[0],{model:'Source\r\nmodel',manufacturer:'Maker\nname',notes:'First\r\nsecond\rthird'});for(const field of ['model','manufacturer','notes'])c.state.assets[0].provenance[field]={authority:'imported-source',sourceId:'source-a'};const original=clone(c.state.assets[0]);c.showAssetForm('asset-a');assert.equal(c.$('asset-model').value,'Sourcemodel');assert.equal(c.$('asset-manufacturer').value,'Makername');assert.equal(c.$('asset-notes').value,'First\nsecond\nthird');addIssue(c);c.saveAssetDraft();for(const field of ['model','manufacturer','notes']){assert.equal(c.state.assets[0][field],original[field],'Unedited normalized display must preserve raw '+field);assert.deepEqual(clone(c.state.assets[0].provenance[field]),original.provenance[field]);}
 c.showAssetForm('asset-a');c.$('asset-model').value='Edited model';addMaintenance(c);c.saveAssetDraft();assert.equal(c.state.assets[0].model,'Edited model');assert.deepEqual(clone(c.state.assets[0].provenance.model),{authority:'user'});
}
{
 const c=context();addIssue(c);c.state.stateToken='changed-state';const before=snap(c),draft=JSON.stringify(c.assetDraftIssues);c.saveAssetDraft();assert.equal(snap(c),before);assert.equal(c.storage.writes,0);assert.match(c.$('asset-message').textContent,/changed/i);addIssue(c,'Stale addition');assert.equal(JSON.stringify(c.assetDraftIssues),draft);
}
{
 const c=context();addMaintenance(c);addIssue(c);const before=snap(c),draft=JSON.stringify({maintenance:c.assetDraftMaintenance,issues:c.assetDraftIssues});c.storage.fail=true;c.saveAssetDraft();assert.equal(snap(c),before);assert.equal(c.storage.writes,0);assert.equal(JSON.stringify({maintenance:c.assetDraftMaintenance,issues:c.assetDraftIssues}),draft,'Failed commit retains owner draft for retry');assert.match(c.$('save-status').textContent,/not saved/i);
 c.storage.fail=false;c.saveAssetDraft();assert.equal(c.history.length,1);assert.equal(c.storage.writes,1);assert.equal(c.state.assets[0].maintenance.length,2);assert.equal(c.state.assets[0].issues.length,2);
 c.showAssetForm('asset-a');addIssue(c);c.state.changeLog=Array.from({length:2000},()=>({summary:'Fabricated event',revision:'v0',commentIds:[],changes:[]}));const full=snap(c),writes=c.storage.writes;c.saveAssetDraft();assert.equal(snap(c),full);assert.equal(c.storage.writes,writes);assert.match(c.$('asset-message').textContent,/history|cancelled|full/i);
}
{
 const c=context(),before=snap(c),maintenance=JSON.stringify(c.assetDraftMaintenance),issues=JSON.stringify(c.assetDraftIssues);addMaintenance(c,{date:'2026-02-30'});assert.equal(JSON.stringify(c.assetDraftMaintenance),maintenance);assert.match(c.$('asset-message').textContent,/date/i);addMaintenance(c,{text:'x'.repeat(2001)});assert.equal(JSON.stringify(c.assetDraftMaintenance),maintenance);addIssue(c,'x'.repeat(2001));assert.equal(JSON.stringify(c.assetDraftIssues),issues);assert.equal(snap(c),before);
 c.showAssetForm('asset-a');c.$('asset-issue-text').value='Typed but not added';c.saveAssetDraft();assert.equal(snap(c),before);assert.match(c.$('asset-message').textContent,/add.*typed|add.*description/i);
}
{
 const c=context();c.state.assets[0].maintenance=Array.from({length:200},(_,i)=>({id:'maintenance-'+i,kind:'schedule',text:'Fabricated entry'}));c.state.assets[0].issues=Array.from({length:200},(_,i)=>({id:'issue-'+i,status:'open',text:'Fabricated issue'}));c.showAssetForm('asset-a');assert.equal(c.$('asset-maintenance-add').disabled,true);assert.equal(c.$('asset-issue-add').disabled,true);const before=snap(c);addMaintenance(c);addIssue(c);assert.equal(c.assetDraftMaintenance.length,200);assert.equal(c.assetDraftIssues.length,200);assert.equal(snap(c),before);
}
{
 const c=context();c.showAssetForm();const before=snap(c);addIssue(c);assert.equal(snap(c),before);assert.equal(c.assetDraftIssues.length,1);c.$('asset-name').value='New owner asset';c.saveAssetDraft();const created=c.state.assets.find(a=>a.name==='New owner asset');assert.ok(created);assert.notEqual(created.id,'asset-draft');assert.equal(created.issues.length,1);assert.equal(created.issues[0].status,'open');assert.equal(created.provenance.name.authority,'user');assert.deepEqual(clone(created.sources),[]);
}
{
 const c=context();addMaintenance(c);addIssue(c);c.saveAssetDraft();let blob;c.download=(_name,value)=>blob=value;await c.jsonExport();const text=await blob.text(),saved=clone(c.state.assets);const restored=context();await restored.importJSON(text);assert.deepEqual(clone(restored.state.assets),saved);c.handoff();const envelope=JSON.parse(c.$('handoff-text').value.split('\n\n').slice(1).join('\n\n'));assert.deepEqual(envelope.assets,saved);
}
console.log('PASS: owner-entered activity drafts, add/remove/resolve/reopen, cancel/stale/storage/history guards, untouched source provenance, limits/dates and undo/backup/handoff.');
