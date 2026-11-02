import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

// Production handlers and validators in one realm; synthetic state only. DOM,
// SVG primitives, storage and review rendering are explicit browser substitutes.
// Native file selection, event dispatch and persistence require browser acceptance.
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const names=['overlay-footprint','item-adjustments','layer-items','review-history','original-overlay','asset-records','measurement-anchors','measurement-chains','opening-bindings','consistency-review','correction-contract','correction-operations'];
function code(name){const start=app.search(new RegExp('^(?:async )?function '+name+'\\(','m'));assert(start>=0,'Missing production '+name);const end=app.indexOf('\n',start),line=app.slice(start,end);return line.endsWith('{')?app.slice(start,app.indexOf('\n}',start)+2):line;}
class Element{
 constructor(tag='div'){this.tag=tag;this.localName=tag;this.children=[];this.attrs={};this.events={};this.value='';this.textContent='';this.open=false;this.disabled=false;this.checked=false;}
 set innerHTML(_value){throw Error('Unsafe imported HTML rendering');}
 append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}setAttribute(key,value){this.attrs[key]=String(value);}getAttribute(key){return this.attrs[key]??null;}
 cloneNode(deep){const node=new Element(this.tag);node.attrs={...this.attrs};node.textContent=this.textContent;if(deep)node.children=this.children.map(child=>child.cloneNode(true));return node;}
 addEventListener(name,fn){this.events[name]=fn;}showModal(){this.open=true;}close(){this.open=false;this.events.close?.();}querySelectorAll(){return this.inputs||[];}
 click(){if(!this.disabled)this.onclick?.();}
}
function harness(){
 const ui=new Map(),get=id=>{if(!ui.has(id))ui.set(id,new Element());return ui.get(id);},storage={fail:false,attempts:0,writes:0,text:''},metrics={reviewRuns:0,sourceOpens:0,sourceChecks:0};
 let c;
 c=vm.createContext({crypto:webcrypto,URL,NS:'http://www.w3.org/2000/svg',$:get,document:{createElement:tag=>new Element(tag),createElementNS:(_ns,tag)=>new Element(tag)},
  localStorage:{setItem(_key,value){storage.attempts++;if(storage.fail)throw Error('Synthetic storage failure');storage.writes++;storage.text=value;}},
  render(){vm.runInContext('cancelItemPreview()',c);},
  runConsistencyReview(){metrics.reviewRuns++;get('message').textContent='Synthetic review unavailable';return false;},
  inventory(){return vm.runInContext('state.items.map(item=>({ref:"item:"+item.id}))',c);},
  openSource(){metrics.sourceOpens++;get('source-dialog').showModal();},checkSource(){metrics.sourceChecks++;},
 });
 for(const name of names)vm.runInContext(fs.readFileSync(new URL('../src/'+name+'.js',import.meta.url),'utf8'),c);
 const functions=['make','notify','saveLocal','restoreSnapshot','validProject','mutate','sourceHash','reviewContext','recordChange','validatePhotos','assertSourceLocks','cancelLandmarkMatch','cancelItemPreview','overlayRotationTransform','paintNode','drawItemPreview','overlayOperationContext','clearOverlayOperationReview','drawOverlayOperationDiagram','renderOverlayOperationFields','reviewOverlayOperation','applyOverlayOperation','reviewImportedCorrection','wireOverlayOperations'];
 for(const name of functions)vm.runInContext(code(name),c);
 vm.runInContext(`
 const KEY='synthetic-operation-key'; const clone=o=>JSON.parse(JSON.stringify(o));
 let pendingOverlayOperation=null,selectionProposal=null,groupTranslationProposal=null,groupScaleProposal=null,groupRotationProposal=null,canvasScaleGesture=null,landmarkMatch=null,history=[],future=[],storageWriteFailed=false;
 let state={schemaVersion:1,projectId:'synthetic-project',stateToken:'synthetic-state',revision:'v3',name:'Synthetic operation workflow',baseSvg:'<svg xmlns="http://www.w3.org/2000/svg"><line id="wall" x1="0" y1="0" x2="80" y2="0"/></svg>',viewBox:[0,0,100,100],items:[{id:'target',kind:'furniture',x:10,y:20,w:30,h:40,label:'<img onerror=synthetic>',metadata:{retained:[1,2]}},{id:'sibling',kind:'rect',x:2,y:3,w:4,h:5}],comments:[{id:'comment-a',n:1,x:1,y:2,text:'Synthetic comment',status:'open',history:[]}],photos:[{id:'photo-a',name:'Synthetic media metadata',assetKey:'photo-key',x:null,y:null,angle:0,fov:60,range:100,note:'Preserve synthetic metadata'}],original:null,assets:[],objectSettings:{'item:sibling':{locked:true}},consistencyReports:[],changeLog:[],measurementAnchors:[],measurementChains:[],openingBindings:[],measurementTolerancePercent:null,note:'Synthetic project note',nextId:9,calibration:null,drawingStyle:{color:'#123456',width:4},layers:{base:true,furniture:true,markup:true,comments:true,photos:true}};
 function request(patch={x:12.125,y:-3.5}){return {operationContractVersion:1,operation:'adjust-single-overlay',projectId:state.projectId,stateToken:state.stateToken,baseRevision:state.revision,baseSourceHash:sourceHash(state.baseSvg),targetRef:'item:target',patch,provider:'Codex <synthetic>'};}
 function importRequest(){reviewImportedCorrection(JSON.stringify(request()));}
 validProject(state);history=[clone(state)];future=[clone(state)];wireOverlayOperations();
 `,c);
 for(const name of ['undo','redo']){const body=app.match(new RegExp("\\$\\('"+name+"'\\)\\.onclick=\\(\\)=>\\{(.*?)\\};",'s'))?.[1];assert(body);vm.runInContext('function '+name+'(){'+body+'}',c);}
 storage.text=vm.runInContext('JSON.stringify(state)',c);
 return {run:source=>vm.runInContext(source,c),ui,storage,metrics,get};
}
const plain=value=>JSON.parse(JSON.stringify(value));
const snap=h=>h.run('JSON.stringify({state,history,future})');
const cases=[];const test=(name,run)=>cases.push({name,run});

test('import previews detached exact item without mutation; explicit apply and actual Undo/Redo preserve state',()=>{
 const h=harness(),before=snap(h),prior=plain(h.run('state'));h.run('importRequest()');assert.equal(snap(h),before);assert.equal(h.storage.attempts,0);assert.equal(h.get('overlay-operation-dialog').open,true);assert.equal(h.get('overlay-operation-apply').disabled,false);
 assert.equal(h.get('overlay-operation-before').textContent,JSON.stringify(prior.items[0],null,2));assert(h.get('overlay-operation-before').textContent.includes('<img onerror=synthetic>'));assert(h.get('overlay-operation-target').textContent.includes('Provider label (unverified)'));assert(h.get('preview-layer').children.length>0);assert(h.run('pendingOverlayOperation.request!==pendingOverlayOperation.review.request'));
 assert.equal(h.run('applyOverlayOperation()'),true);const after=plain(h.run('state'));assert.equal(after.revision,'v4');assert.notEqual(after.stateToken,prior.stateToken);assert.deepEqual(after.items[0],{...prior.items[0],x:12.125,y:-3.5});assert.deepEqual({...after,items:prior.items,revision:prior.revision,stateToken:prior.stateToken,changeLog:prior.changeLog},prior);assert.equal(after.changeLog.length,1);assert.equal(after.changeLog[0].changes.length,1);assert.equal(after.changeLog[0].type,'item-adjustment');assert.deepEqual(after.changeLog[0].commentIds,[]);assert.equal(h.run('history.length'),2);assert.equal(h.run('future.length'),0);assert.equal(h.storage.writes,1);assert.deepEqual(JSON.parse(h.storage.text),after);assert.equal(h.metrics.reviewRuns,1);assert.equal(h.get('overlay-operation-dialog').open,false);assert.equal(h.get('preview-layer').children.length,0);assert.equal(h.run('pendingOverlayOperation'),null);
 h.run('undo()');assert.deepEqual(plain(h.run('state')),prior);h.run('redo()');assert.deepEqual(plain(h.run('state')),after);const committed=snap(h);assert.equal(h.run('applyOverlayOperation()'),false);assert.equal(snap(h),committed);
});
for(const [name,change]of [['project','state.projectId="other"'],['state','state.stateToken="other"'],['revision','state.revision="v4"'],['source','state.baseSvg+="<!-- synthetic changed -->"'],['target','state.items[0].metadata.retained[0]=99'],['removed target','state.items.shift()'],['locked','state.objectSettings["item:target"]={locked:true}'],['hidden','state.objectSettings["item:target"]={hidden:true}'],['hidden layer','state.layers.furniture=false'],['calibration','state.calibration={drawingUnits:1,realMillimetres:2,status:"manual"}'],['tampered review','pendingOverlayOperation.review.proposal.after.x=90']])test(name+' changes after preview reject before writes',()=>{
 const h=harness();h.run('importRequest();'+change);const before=snap(h);assert.equal(h.run('applyOverlayOperation()'),false);assert.equal(snap(h),before);assert.equal(h.storage.attempts,0);assert.equal(h.metrics.reviewRuns,0);assert.equal(h.get('overlay-operation-apply').disabled,true);assert.equal(h.run('pendingOverlayOperation'),null);assert.equal(h.get('preview-layer').children.length,0);
});
for(const [name,action]of [['Cancel','$("overlay-operation-cancel").click()'],['Escape cancel event','$("overlay-operation-dialog").events.cancel()'],['close event','$("overlay-operation-dialog").close()'],['render invalidation','cancelItemPreview()']])test(name+' removes approval and preview without writes',()=>{
 const h=harness();h.run('importRequest()');const before=snap(h);h.run(action);assert.equal(snap(h),before);assert.equal(h.run('pendingOverlayOperation'),null);assert.equal(h.get('overlay-operation-apply').disabled,true);assert.equal(h.get('preview-layer').children.length,0);assert.equal(h.storage.attempts,0);assert.equal(h.run('applyOverlayOperation()'),false);assert.equal(snap(h),before);
});
for(const [name,payload]of [['invalid JSON','"{"'],['invalid discriminator','JSON.stringify({...request(),operationContractVersion:null,contractVersion:1,newBaseSvg:state.baseSvg})'],['unsupported version','JSON.stringify({...request(),operationContractVersion:2})'],['mixed namespace','JSON.stringify({...request(),contractVersion:1,newBaseSvg:state.baseSvg})'],['label patch','JSON.stringify(request({label:"not allowed"}))'],['unknown field','JSON.stringify({...request(),extra:true})']])test(name+' clears earlier approval without v1 fallback',()=>{
 const h=harness();h.run('importRequest()');const before=snap(h);h.run('reviewImportedCorrection('+payload+')');assert.equal(snap(h),before);assert.equal(h.run('pendingOverlayOperation'),null);assert.equal(h.get('overlay-operation-apply').disabled,true);assert.equal(h.metrics.sourceOpens,0);assert.equal(h.storage.attempts,0);assert.equal(h.get('preview-layer').children.length,0);
});
test('failed storage keeps exact state/stacks, offers rechecked explicit retry and commits once',()=>{
 const h=harness();h.run('importRequest()');const before=snap(h),saved=h.storage.text;h.storage.fail=true;assert.equal(h.run('applyOverlayOperation()'),false);assert.equal(snap(h),before);assert.equal(h.storage.text,saved);assert.equal(h.storage.attempts,1);assert.equal(h.storage.writes,0);assert.equal(h.get('overlay-operation-apply').disabled,false);assert(h.run('!!pendingOverlayOperation'));assert.match(h.get('overlay-operation-status').textContent,/No operation was saved.*Retry Apply/);assert.equal(h.metrics.reviewRuns,0);
 h.storage.fail=false;assert.equal(h.run('applyOverlayOperation()'),true);assert.equal(h.storage.writes,1);assert.equal(h.storage.attempts,2);assert.equal(h.run('state.changeLog.length'),1);assert.equal(h.run('history.length'),2);assert.equal(h.metrics.reviewRuns,1);assert.equal(h.run('applyOverlayOperation()'),false);assert.equal(h.storage.attempts,2);
});
test('actual audit limit rolls back without writing or consuming history',()=>{
 const h=harness();h.run('state.changeLog=Array.from({length:2000},(_,i)=>({id:"seed-"+i,type:"synthetic",revision:"v3",recordedAt:"2026-01-01T00:00:00Z",summary:"Synthetic record",commentIds:[],changes:[]}));importRequest()');const before=snap(h);assert.equal(h.run('applyOverlayOperation()'),false);assert.equal(snap(h),before);assert.equal(h.storage.attempts,0);assert.match(h.get('overlay-operation-status').textContent,/2,000/);
});
test('source correction v1 still opens existing source review with comment choices and summary',()=>{
 const h=harness();h.get('source-comments').inputs=[{value:'comment-a',checked:false},{value:'synthetic-other',checked:true}];h.run('importRequest()');const before=snap(h);h.run('reviewImportedCorrection(JSON.stringify({contractVersion:1,projectId:state.projectId,stateToken:state.stateToken,baseRevision:state.revision,baseSourceHash:sourceHash(state.baseSvg),newBaseSvg:"<svg/>",resolvedCommentIds:["comment-a"],changeSummary:"Synthetic source proposal"}))');assert.equal(snap(h),before);assert.equal(h.metrics.sourceOpens,1);assert.equal(h.metrics.sourceChecks,1);assert.equal(h.get('source-text').value,'<svg/>');assert.equal(h.get('source-summary').value,'Synthetic source proposal');assert.deepEqual(h.get('source-comments').inputs.map(input=>input.checked),[true,false]);assert.equal(h.run('pendingOverlayOperation'),null);assert.equal(h.storage.attempts,0);
});
test('runtime loading, file input and handoff guidance expose separate manual operation namespace',()=>{
 assert(html.indexOf('src/correction-operations.js')>html.indexOf('src/item-adjustments.js'));assert(html.indexOf('src/correction-operations.js')<html.indexOf('src/app.js'));
 assert(app.includes("$('correction-file').onchange=()=>fileText($('correction-file'),reviewImportedCorrection)"));assert(code('wire').includes('wireOverlayOperations();'));assert(code('handoff').includes('separate operationContractVersion 1 namespace'));assert(code('handoff').includes('furniture/rect x,y,w,h; arrow x,y,x2,y2; paint x,y'));
 const h=harness();assert.deepEqual(plain(h.run('CorrectionContract.CAPABILITIES.operations')),['replace-base-svg','resolve-existing-comments']);assert.equal(h.run('CorrectionContract.VERSION'),1);
});
for(const [name,item,patch]of [
 ['rotated furniture',{id:'target',kind:'furniture',x:-10,y:-20,w:30,h:40,label:'Synthetic rotated item',rotationVersion:1,rotation:45},{x:20,h:25}],
 ['box',{id:'target',kind:'rect',x:-50,y:40,w:20,h:30},{w:40}],
 ['reversed vertical arrow',{id:'target',kind:'arrow',x:10,y:20,x2:10,y2:-40},{y2:-80}],
 ['paint',{id:'target',kind:'paint',x:-20,y:10,points:[[0,0],[30,40],[-5,5]],width:20,color:'#123456'},{x:25}]
])test(name+' has finite before/after diagram and named numeric changes',()=>{
 const h=harness();h.run('state.items[0]='+JSON.stringify(item)+';reviewImportedCorrection(JSON.stringify(request('+JSON.stringify(patch)+')))');assert(h.run('!!pendingOverlayOperation'));const nodes=h.get('overlay-operation-diagram').children;assert(nodes.some(node=>node.getAttribute('data-operation-phase')==='before'));assert(nodes.some(node=>node.getAttribute('data-operation-phase')==='after'));const bounds=h.get('overlay-operation-diagram').getAttribute('viewBox').split(' ').map(Number);assert(bounds.every(Number.isFinite));assert(bounds[2]>0&&bounds[3]>0);assert.equal(h.get('overlay-operation-fields').children.length,Object.keys(patch).length);assert.equal(h.storage.attempts,0);assert.equal(h.run('applyOverlayOperation()'),true);assert.deepEqual(plain(h.run('state.items[0]')),{...item,...patch});
});
test('replacement import and delayed close from an older review cannot clear the new review',()=>{
 const h=harness();h.run('importRequest();reviewImportedCorrection(JSON.stringify(request({x:55})))');assert.equal(h.run('pendingOverlayOperation.review.proposal.after.x'),55);assert.equal(h.get('overlay-operation-dialog').open,true);
 h.get('overlay-operation-dialog').events.close();assert.equal(h.run('pendingOverlayOperation.review.proposal.after.x'),55);assert.equal(h.get('overlay-operation-apply').disabled,false);
 const rows=h.get('overlay-operation-fields').children;assert.equal(rows.length,1);assert.deepEqual(rows[0].children.map(cell=>cell.textContent),['Position X','10','55']);const nodes=h.get('overlay-operation-diagram').children;assert(nodes.some(node=>node.getAttribute('data-operation-phase')==='before'));assert(nodes.some(node=>node.getAttribute('data-operation-phase')==='after'));const bounds=h.get('overlay-operation-diagram').getAttribute('viewBox').split(' ').map(Number);assert(bounds.every(Number.isFinite));assert(bounds[2]>0&&bounds[3]>0);
 h.get('overlay-operation-dialog').close();assert.equal(h.run('pendingOverlayOperation'),null);
});
const failures=[];for(const {name,run}of cases){try{run();}catch(error){failures.push(name);console.error('FAIL: '+name+'\n'+error.stack);}}assert.equal(failures.length,0,failures.join('; '));
console.log('PASS: '+cases.length+' production manual-operation workflow cases: preview/apply/cancel, guarded state and policy, rollback/retry, UndoRedo, safe text and unchanged v1 source routing. Browser events/rendering/media remain separate acceptance.');
