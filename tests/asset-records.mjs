import assert from 'node:assert/strict';
import '../src/asset-records.js';
const A=globalThis.AssetRecords;
const base={id:'synthetic-appliance',projectId:'synthetic-project',name:'Synthetic appliance',linkedRefs:['item:synthetic-footprint','photo:synthetic-photo'],manufacturer:'Example maker',model:'Example model'};
const context={projectId:base.projectId,existingAssets:[],knownRefs:['item:synthetic-footprint'],now:'2026-01-01T00:00:00Z'};
assert.deepEqual(A.validate(undefined),[]);
const user=A.createRecord(base);assert.equal(user.provenance.model.authority,'user');assert.equal(user.id,base.id);
const record={...base,sources:[{id:'source-1',label:'Synthetic manual',kind:'manual',uri:'https://example.invalid/manual',status:'changed',revision:'old-reference',contentHash:'fabricated-hash'}],provenance:{model:{authority:'imported-source',sourceId:'source-1'}},maintenance:[{id:'event-1',kind:'schedule',text:'Synthetic service',date:'2027-01-01'}],issues:[{id:'issue-1',text:'Synthetic issue',status:'open'}]};
const payload={assetSchemaVersion:1,projectId:base.projectId,assets:[record]},before=structuredClone({payload,context});
const preview=A.stageImport(payload,context);
assert.deepEqual({payload,context},before);
assert.equal(preview.assets[0].provenance.manufacturer.authority,'unverified');
assert.equal(preview.assets[0].provenance.model.authority,'imported-source');
assert(preview.findings.some(f=>f.code==='missing-item-reference'&&f.ref==='photo:synthetic-photo'));
assert(preview.findings.some(f=>f.code==='source-changed'));
assert.equal(preview.assets[0].sources[0].contentHash,'fabricated-hash');
const edited=A.updateRecord(preview.assets[0],{name:'Renamed synthetic appliance',model:'Owner-selected model',notes:'Owner note'});
assert.equal(edited.provenance.model.authority,'user');assert.equal(edited.provenance.model.sourceId,undefined);
assert.deepEqual(edited.sources,record.sources);assert.deepEqual(edited.maintenance,record.maintenance);assert.deepEqual(edited.issues,record.issues);
assert.equal(preview.assets[0].model,base.model);
assert.equal(A.updateRecord(preview.assets[0],{model:base.model}).provenance.model.authority,'imported-source');
assert.throws(()=>A.updateRecord(preview.assets[0],{id:'replacement'}));assert.throws(()=>A.updateRecord(preview.assets[0],{projectId:'foreign'}));
assert.deepEqual(A.inspectReferences(preview.assets,context),A.findings(preview.assets,context));
assert.deepEqual(A.validate(JSON.parse(JSON.stringify(preview.assets)),context),preview.assets);
preview.assets[0].name='Detached';assert.equal(record.name,base.name);
for(const change of [{projectId:'foreign'},{linkedRefs:['item:one','item:one']},{linkedRefs:['javascript:bad']},{linkedRefs:['item:']},{name:'x'.repeat(161)},{unexpected:'discard?'},{provenance:{model:{authority:'imported-source'}}},{provenance:{model:{authority:'user',sourceId:'missing'}}},{sources:[{id:'one',label:'Manual',kind:'manual',uri:'javascript:alert(1)',status:'unverified'}]}]){
 const candidate={...record,...change},snapshot=structuredClone(candidate);assert.throws(()=>A.validate([candidate],context));assert.deepEqual(candidate,snapshot);
}
assert.throws(()=>A.validate([record,record],context),/Duplicate/);
assert.throws(()=>A.stageImport({...payload,projectId:'foreign'},context),/Foreign/);
assert.throws(()=>A.stageImport(payload,{...context,existingAssets:[record]}),/replace/);
assert.throws(()=>A.stageImport({...payload,assetSchemaVersion:2},context));
for(const uri of ['file:///synthetic/manual.pdf','data:text/plain,synthetic','http://example.invalid/manual','https://user:pass@example.invalid/manual','obsidian://open?file=Bad%0ANote','obsidian://open?file=Example&command=execute'])assert.throws(()=>A.validate([{...base,sources:[{id:'one',label:'Ref',kind:'vault-note',uri,status:'unverified'}]}],context));
const vault={id:'note-1',label:'Synthetic note',kind:'vault-note',uri:'obsidian://open?vault=Example&file=Synthetic%20Note',status:'unverified'};
assert.equal(A.validate([{...base,sources:[vault]}],context)[0].sources[0].uri,vault.uri);
assert.throws(()=>A.validate([{...base,sources:[{...vault,status:'available-at-import'}]}],context),/importedAt/);
const historical=A.validate([{...base,sources:[{...vault,status:'available-at-import',importedAt:'2025-01-01T00:00:00Z'}]}],context);
assert.match(A.findings(historical)[0].message,/current availability is unverified/);
assert.equal(historical[0].sources[0].status,'available-at-import');
assert.throws(()=>A.validate([{...base,maintenance:[{id:'bad-date',kind:'schedule',text:'Synthetic service',date:'2026-02-30'}]}],context));
assert.throws(()=>A.stageImport(payload,{...context,now:'2026-02-30T00:00:00Z'}));
const currentActivity=A.validate([record],context)[0];
const activityPatch={maintenance:[{id:'schedule-2',kind:'schedule',text:'Synthetic scheduled check',date:'2028-02-29'},{id:'history-2',kind:'history',text:'Synthetic completed service',date:'2026-04-01'}],issues:[{id:'issue-2',text:'Synthetic inspection issue',status:'resolved',recordedAt:'2026-04-02T03:04:05.123Z'}]};
const activityBefore=structuredClone({currentActivity,activityPatch});
const activity=A.updateActivity(currentActivity,activityPatch);
assert.deepEqual({currentActivity,activityPatch},activityBefore,'Activity authoring cannot mutate current state or draft collections');
for(const key of ['id','projectId','name','room','manufacturer','model','notes','linkedRefs','sources','provenance'])assert.deepEqual(activity[key],currentActivity[key],key+' retained exactly');
assert.equal(activity.provenance.model.authority,'imported-source');assert.equal(activity.provenance.model.sourceId,'source-1');assert.equal(activity.sources[0].status,'changed');assert.equal(activity.sources[0].contentHash,'fabricated-hash');
assert.deepEqual(activity.maintenance,activityPatch.maintenance);assert.deepEqual(activity.issues,activityPatch.issues);
assert.deepEqual(A.validate(JSON.parse(JSON.stringify([activity])),context),[activity],'Activity edits preserve schema 1 import/export compatibility');
const maintenanceOnly=A.updateActivity(currentActivity,{maintenance:activityPatch.maintenance});assert.deepEqual(maintenanceOnly.issues,currentActivity.issues);
const issuesOnly=A.updateActivity(currentActivity,{issues:activityPatch.issues});assert.deepEqual(issuesOnly.maintenance,currentActivity.maintenance);
const cleared=A.updateActivity(currentActivity,{maintenance:[],issues:[]});assert.deepEqual(cleared.maintenance,[]);assert.deepEqual(cleared.issues,[]);assert.equal(currentActivity.maintenance.length,1);
activity.maintenance[0].text='Edited detached schedule';activity.issues[0].status='open';activity.sources[0].label='Detached source';activity.provenance.model.sourceId='detached-source';activity.linkedRefs.push('item:detached');
assert.deepEqual({currentActivity,activityPatch},activityBefore,'Nested result metadata and collections are fully detached');
function freeze(value){if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;}
assert.doesNotThrow(()=>A.updateActivity(freeze(structuredClone(currentActivity)),freeze(structuredClone(activityPatch))));
const boundaryMaintenance=Array.from({length:200},(_,i)=>({id:'synthetic-maintenance-'+i,kind:'history',text:'Synthetic activity'}));
const boundaryIssues=Array.from({length:200},(_,i)=>({id:'synthetic-issue-'+i,status:'open',text:'Synthetic issue'}));
const boundaryActivity=A.updateActivity(currentActivity,{maintenance:boundaryMaintenance,issues:boundaryIssues});assert.equal(boundaryActivity.maintenance.length,200);assert.equal(boundaryActivity.issues.length,200);
for(const patch of [
 {},{unknown:[]},{id:'replacement'},{projectId:'foreign'},{sources:[]},{provenance:{}},{name:'Unexpected metadata edit'},
 {maintenance:undefined},{maintenance:null},{maintenance:{}},{issues:undefined},{issues:null},
 {maintenance:[...boundaryMaintenance,{id:'overflow',kind:'history',text:'Synthetic overflow'}]},
 {issues:[...boundaryIssues,{id:'overflow',status:'open',text:'Synthetic overflow'}]},
 {maintenance:[activityPatch.maintenance[0],activityPatch.maintenance[0]]},
 {issues:[activityPatch.issues[0],activityPatch.issues[0]]},
 {maintenance:[{id:'bad-date',kind:'schedule',text:'Synthetic schedule',date:'2026-02-30'}]},
 {maintenance:[{id:'bad-date',kind:'history',text:'Synthetic history',date:'2027-02-29'}]},
 {maintenance:[{id:'bad-date',kind:'history',text:'Synthetic history',date:'2026-4-1'}]},
 {maintenance:[{id:'bad-kind',kind:'done',text:'Synthetic activity'}]},
 {issues:[{id:'bad-time',status:'open',text:'Synthetic issue',recordedAt:'2026-02-30T00:00:00Z'}]},
 {issues:[{id:'bad-time',status:'open',text:'Synthetic issue',recordedAt:'2026-04-02T03:04:05+09:00'}]},
 {issues:[{id:'bad-status',status:'closed',text:'Synthetic issue'}]},
 {issues:[{id:'bad-text',status:'open',text:'x'.repeat(2001)}]},
 {issues:[{id:'bad-field',status:'open',text:'Synthetic issue',sourceId:'source-1'}]},
 {maintenance:activityPatch.maintenance,issues:[{id:'bad-status',status:'closed',text:'Synthetic issue'}]}
]){
 const beforePatch=structuredClone(patch),beforeCurrent=structuredClone(currentActivity);assert.throws(()=>A.updateActivity(currentActivity,patch));assert.deepEqual(patch,beforePatch);assert.deepEqual(currentActivity,beforeCurrent,'Failed validation cannot partially apply activity edits');
}
const invalidCurrent={...currentActivity,provenance:{...currentActivity.provenance,model:{authority:'imported-source',sourceId:'missing-source'}}};const invalidSnapshot=structuredClone(invalidCurrent);assert.throws(()=>A.updateActivity(invalidCurrent,{issues:[]}));assert.deepEqual(invalidCurrent,invalidSnapshot);
console.log('PASS: local asset identity/provenance, read-only source evidence, detached import preview, orphan findings, strict bounds and foreign/duplicate/unsafe-reference rejection.');
