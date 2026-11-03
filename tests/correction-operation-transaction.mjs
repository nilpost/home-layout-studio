import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

// OFFLINE composition, not an app import handler or browser acceptance. Every
// domain module and fixture/request lives in ONE VM realm. Only storage/rendering
// and DOM text notices are environment adapters. No geometry/parser stub is used:
// the source is unchanged, so the real source-lock guard takes its early return.
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const moduleNames=['overlay-footprint','item-adjustments','layer-items','review-history','original-overlay','asset-records','measurement-anchors','measurement-chains','opening-bindings','consistency-review','correction-contract','correction-operations'];
const sources=moduleNames.map(name=>[name,fs.readFileSync(new URL('../src/'+name+'.js',import.meta.url),'utf8')]);
const plain=value=>JSON.parse(JSON.stringify(value));
function code(name){const start=app.search(new RegExp('^(?:async )?function '+name+'\\(','m'));assert(start>=0,'Missing production function '+name);const end=app.indexOf('\n',start),line=app.slice(start,end);return line.endsWith('{')?app.slice(start,app.indexOf('\n}',start)+2):line;}
const cloneLine=app.split('\n').find(line=>line.startsWith('const clone='));assert(cloneLine,'Missing production clone');
const functions=['notify','saveLocal','restoreSnapshot','remember','validProject','mutate','sourceHash','reviewContext','recordChange','validatePhotos','assertSourceLocks','cancelLandmarkMatch'];
const handlers=['undo','redo'].map(name=>{const body=app.match(new RegExp("\\$\\('"+name+"'\\)\\.onclick=\\(\\)=>\\{(.*?)\\};",'s'))?.[1];assert(body?.includes('restoreSnapshot')&&body.includes('saveLocal'),'Missing production '+name+' handler');return 'function '+name+'(){'+body+'}';});
const bootstrap=`
let state,history=[],future=[],storageWriteFailed=false,landmarkMatch=null;
const KEY='fabricated-transaction-key';
${cloneLine}
function fixture(){
 const p={schemaVersion:1,projectId:'synthetic-project',stateToken:'synthetic-state',name:'Fabricated transaction',revision:'v3',baseSvg:'<svg xmlns="http://www.w3.org/2000/svg"><line id="wall-a" x1="0" y1="0" x2="50" y2="0"/><text id="dimension-a">Synthetic source annotation</text></svg>',viewBox:[0,0,100,100],items:[{id:'target',kind:'furniture',x:10,y:20,w:30,h:40,label:'Synthetic chair',assetId:'asset-a',metadata:{retained:[1,2]}},{id:'sibling',kind:'rect',x:1,y:2,w:3,h:4,color:'#123456'}],comments:[{id:'comment-a',n:1,x:5,y:5,text:'Fabricated annotation',status:'open',history:[]}],photos:[{id:'photo-a',name:'Synthetic raster metadata',assetKey:'photo-asset',dataUrl:'data:image/png;base64,AAAA',x:3,y:4,angle:0,fov:60,range:100,note:'Synthetic camera note'}],original:{name:'Synthetic source metadata',kind:'pdf',assetKey:'source-asset',rasterKey:'source-preview',page:1,pageCount:1,x:0,y:0,w:100,h:100,rotation:0,opacity:.5,dataUrl:'data:application/pdf;base64,AAAA',rasterDataUrl:'data:image/png;base64,AAAA'},objectSettings:{'item:sibling':{locked:true},'base:wall-a':{locked:true}},assets:[],measurementAnchors:[],measurementChains:[],openingBindings:[],measurementTolerancePercent:2,consistencyReports:[],changeLog:[{id:'seed-audit',type:'fixture',revision:'v3',recordedAt:'2026-01-01T00:00:00.000Z',summary:'Synthetic starting record',commentIds:[],changes:[]}],note:'Synthetic note',nextId:8,calibration:{drawingUnits:10,realMillimetres:20,status:'manual'},drawingStyle:{color:'#123456',width:3},layers:{base:true,furniture:true,markup:true,comments:true,photos:true},baseLayerVisibility:{Walls:true},hiddenBaseLayers:[]};
 p.assets=[AssetRecords.createRecord({id:'asset-a',projectId:p.projectId,name:'Synthetic asset',linkedRefs:['item:target','photo:photo-a'],sources:[{id:'manual-a',label:'Synthetic manual',kind:'manual',uri:'https://example.invalid/fabricated-manual'}]})];
 for(const name of ['a','b','total'])p.measurementAnchors.push(MeasurementAnchors.createBinding({id:'anchor-'+name,projectId:p.projectId,dimensionId:'dimension-'+name,start:{segmentId:'wall-a',endpoint:'a'},end:{segmentId:'wall-b',endpoint:'b'},sourceHash:sourceHash(p.baseSvg)}));
 p.measurementChains=[MeasurementChains.createChain({id:'chain-a',projectId:p.projectId,spanAnchorIds:['anchor-a','anchor-b'],totalAnchorId:'anchor-total',sourceHash:sourceHash(p.baseSvg)})];
 p.openingBindings=[OpeningBindings.createBinding({id:'opening-binding',projectId:p.projectId,openingSegmentId:'opening-a',startJamb:{segmentId:'wall-a',endpoint:'b'},endJamb:{segmentId:'wall-b',endpoint:'a'},sourceHash:sourceHash(p.baseSvg)})];
 p.consistencyReports=[ConsistencyReview.createReport({projectId:p.projectId,stateToken:p.stateToken,revision:p.revision,sourceHash:sourceHash(p.baseSvg),runAt:'2026-01-01T00:00:00.000Z'})];
 return p;
}
function operationContext(){return {...reviewContext(),items:state.items,objectSettings:state.objectSettings,layers:state.layers,calibration:state.calibration};}
function makeRequest(provider='Codex'){return {operationContractVersion:1,operation:'adjust-single-overlay',projectId:state.projectId,stateToken:state.stateToken,baseRevision:state.revision,baseSourceHash:sourceHash(state.baseSvg),targetRef:'item:target',patch:{x:12.125,y:-3.5,w:25},provider};}
// Test-only composition of the production numeric operation and production site
// transaction/audit pattern. This creates NO runtime adapter or import authority.
function commitReviewed(request,review){
 const after=CorrectionOperations.applyProposal(request,review,operationContext()),item=state.items.find(item=>'item:'+item.id===request.targetRef),before=clone(item);
 return mutate(()=>{Object.assign(state.items.find(item=>'item:'+item.id===request.targetRef),after);recordChange('item-adjustment','Adjusted '+item.kind+' with reviewed numeric controls.',[],[{id:item.id,before:JSON.stringify(before),after:JSON.stringify(after)}]);});
}
function preview(provider='Codex'){const request=makeRequest(provider);return {request,review:CorrectionOperations.propose(request,operationContext())};}
`;
function harness(){
 const ui=new Map(),storage={fail:false,attempts:0,writes:0,text:''},display={fail:false,calls:0};
 const c=vm.createContext({crypto:webcrypto,URL,$:id=>{if(!ui.has(id))ui.set(id,{textContent:''});return ui.get(id);},localStorage:{setItem(_key,text){storage.attempts++;if(storage.fail)throw Error('Synthetic storage failure');storage.text=text;storage.writes++;}},render(){display.calls++;if(display.fail)throw Error('Synthetic render failure');}});
 for(const [name,source]of sources)vm.runInContext(source,c,{filename:name+'.js'});
 for(const name of functions)vm.runInContext(code(name),c,{filename:'app.js#'+name});
 vm.runInContext(bootstrap+'\n'+handlers.join('\n')+'\nstate=fixture();validProject(state);history=[{...clone(state),note:"Existing undo snapshot"}];future=[{...clone(state),note:"Existing redo snapshot"}];',c);
 storage.text=vm.runInContext('JSON.stringify(state)',c);
 return {c,storage,display,ui,run:source=>vm.runInContext(source,c)};
}
const snapshot=h=>h.run('JSON.stringify({state,history,future})');
const state=h=>plain(h.run('state'));
const disk=h=>JSON.parse(h.storage.text);
const testCases=[];const test=(name,run)=>testCases.push({name,run});

test('valid operation makes one target/audit/revision/snapshot and preserves unrelated data',()=>{
 const h=harness(),before=state(h),oldHistory=plain(h.run('history'));h.run('var reviewed=preview();');assert.equal(snapshot(h),JSON.stringify({state:before,history:oldHistory,future:plain(h.run('future'))}),'Preview is pure');assert.equal(h.storage.attempts,0);
 assert.equal(h.run('commitReviewed(reviewed.request,reviewed.review)'),true);const after=state(h),expected={...before,items:before.items.map(item=>item.id==='target'?{...item,...plain(h.run('reviewed.request.patch'))}:item),revision:'v4',stateToken:after.stateToken,changeLog:after.changeLog};assert.deepEqual(after,expected);
 assert.notEqual(after.stateToken,before.stateToken);assert.equal(after.changeLog.length,before.changeLog.length+1);const entry=after.changeLog.at(-1);assert.equal(entry.type,'item-adjustment');assert.equal(entry.revision,'v4');assert.equal(entry.changes.length,1);assert.equal(entry.changes[0].id,'target');assert.deepEqual(JSON.parse(entry.changes[0].before),before.items[0]);assert.deepEqual(JSON.parse(entry.changes[0].after),after.items[0]);assert.deepEqual(entry.commentIds,[]);
 assert.deepEqual(plain(h.run('history')),oldHistory.concat([before]));assert.equal(h.run('future.length'),0);assert.equal(h.storage.writes,1);assert.deepEqual(disk(h),after);assert(h.run('ConsistencyReview.isStale(state.consistencyReports[0],reviewContext())'),'Saved report remains preserved and now stale');
 const committed=snapshot(h);assert.throws(()=>h.run('commitReviewed(reviewed.request,reviewed.review)'));assert.equal(snapshot(h),committed);assert.equal(h.storage.attempts,1);
});

test('actual Undo/Redo restores exact snapshot; divergent same-revision branch rejects older token',()=>{
 const h=harness(),before=state(h);h.run('var reviewed=preview();commitReviewed(reviewed.request,reviewed.review);');const accepted=state(h);h.run('undo()');assert.deepEqual(state(h),before);assert.deepEqual(disk(h),before);assert.equal(h.run('history.length'),1);assert.equal(h.run('future.length'),1);
 // Exact original identity is intentionally restored by Undo: request is not
 // categorically stale there. Redo restores accepted geometry/audit/token.
 assert(h.run('CorrectionOperations.propose(reviewed.request,operationContext())'));h.run('redo()');assert.deepEqual(state(h),accepted);assert.deepEqual(disk(h),accepted);assert.throws(()=>h.run('commitReviewed(reviewed.request,reviewed.review)'));
 h.run('var acceptedBranch=preview(),acceptedTarget=clone(state.items[0]);undo();mutate(()=>{Object.assign(state.items[0],acceptedTarget);state.note="Divergent branch";recordChange("branch","Synthetic same-geometry divergent branch");});');assert.deepEqual(plain(h.run('state.items[0]')),plain(h.run('acceptedBranch.review.proposal.before')));assert.equal(h.run('state.revision'),accepted.revision);assert.equal(h.run('sourceHash(state.baseSvg)'),h.run('acceptedBranch.request.baseSourceHash'));assert.notEqual(h.run('state.stateToken'),h.run('acceptedBranch.request.stateToken'));const branched=snapshot(h),attempts=h.storage.attempts;assert.throws(()=>h.run('commitReviewed(acceptedBranch.request,acceptedBranch.review)'),/stateToken/);assert.equal(snapshot(h),branched);assert.equal(h.storage.attempts,attempts);
});

for(const [name,change]of [
 ['foreign project','state.projectId="foreign-project"'],['changed state','state.stateToken="changed-token"'],['changed revision','state.revision="v4"'],['changed source','state.baseSvg+="<!-- changed source -->"'],['changed target','state.items[0].metadata.retained[0]=99'],['locked target','state.objectSettings["item:target"]={locked:true}'],['hidden target','state.objectSettings["item:target"]={hidden:true}'],['hidden layer','state.layers.furniture=false']
])test(name+' after preview rejects without storage/history changes',()=>{const h=harness();h.run('var reviewed=preview();'+change+';');const before=snapshot(h);assert.throws(()=>h.run('commitReviewed(reviewed.request,reviewed.review)'));assert.equal(snapshot(h),before);assert.equal(h.storage.attempts,0);assert.equal(h.storage.writes,0);});

test('storage failure preserves complete state and both stacks; retry commits exactly once',()=>{
 const h=harness();h.run('var reviewed=preview();');const before=snapshot(h),saved=h.storage.text;h.storage.fail=true;assert.equal(h.run('commitReviewed(reviewed.request,reviewed.review)'),false);assert.equal(snapshot(h),before);assert.equal(h.storage.text,saved);assert.equal(h.storage.writes,0);assert.match(h.ui.get('save-status').textContent,/not saved/i);
 h.storage.fail=false;assert.equal(h.run('commitReviewed(reviewed.request,reviewed.review)'),true);assert.equal(h.storage.attempts,2);assert.equal(h.storage.writes,1);assert.equal(h.run('state.changeLog.length'),2);assert.equal(h.run('history.length'),2);assert.equal(h.run('future.length'),0);assert.deepEqual(disk(h),state(h));assert.throws(()=>h.run('commitReviewed(reviewed.request,reviewed.review)'));assert.equal(h.storage.attempts,2);
});

test('real 2000-record audit boundary rolls back before storage and preserves stacks',()=>{
 const h=harness();h.run('state.changeLog=Array.from({length:2000},(_,i)=>({...state.changeLog[0],id:"seed-"+i}));validProject(state);var reviewed=preview();');const before=snapshot(h);assert.equal(h.run('commitReviewed(reviewed.request,reviewed.review)'),false);assert.equal(snapshot(h),before);assert.equal(h.storage.attempts,0);assert.match(h.ui.get('message').textContent,/2,000/);
});

test('render failure after durable commit retains saved state and undo snapshot',()=>{
 const h=harness();h.run('var reviewed=preview();');h.display.fail=true;assert.equal(h.run('commitReviewed(reviewed.request,reviewed.review)'),true);assert.equal(h.storage.writes,1);assert.equal(h.run('state.revision'),'v4');assert.equal(h.run('history.length'),2);assert.equal(h.run('future.length'),0);assert.deepEqual(disk(h),state(h));assert.match(h.ui.get('message').textContent,/saved.*display could not refresh/i);
});

test('Codex and Claude labels produce equivalent project results and unchanged v1 handoffs',()=>{
 const outcomes=[];for(const provider of ['Codex','Claude']){const h=harness();h.run('var reviewed=preview('+JSON.stringify(provider)+');commitReviewed(reviewed.request,reviewed.review);');const outcome=state(h);outcome.stateToken='<generated>';outcome.changeLog.at(-1).id='<generated>';outcome.changeLog.at(-1).recordedAt='<generated>';outcomes.push(outcome);assert.deepEqual(plain(h.run('CorrectionContract.CAPABILITIES.operations')),['replace-base-svg','resolve-existing-comments']);assert.equal(h.run('CorrectionContract.VERSION'),1);assert.equal(h.run('CorrectionContract.createHandoff({...reviewContext(),payload:{items:state.items}}).contractVersion'),1);assert.equal(h.run('Object.hasOwn(CorrectionContract.createHandoff({...reviewContext(),payload:{items:state.items}}),"operationContractVersion")'),false);}
 assert.deepEqual(outcomes[0],outcomes[1]);
});

test('manual operations and room declarations load at runtime',()=>{
 const required=app.match(/requiredDomains=\[([^\]]+)\]/)?.[1];assert(required,'Missing runtime domain declaration');
 assert(html.includes('correction-operations.js'));assert(required.includes('CorrectionOperations'));
 assert(html.includes('room-boundaries.js'));assert(required.includes('RoomBoundaries'));assert(app.includes('RoomBoundaries'));
});

const failures=[];for(const {name,run}of testCases){try{run();}catch(error){failures.push(name);console.error('FAIL: '+name+'\n'+error.stack);}}assert.equal(failures.length,0,failures.length+' transaction acceptance failures: '+failures.join('; '));
console.log('OFFLINE acceptance: real single-overlay operations compose with production mutation/audit/storage/UndoRedo guards; browser rendering/import/review/provider integration remains unverified.');
