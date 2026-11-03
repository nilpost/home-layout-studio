import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Actual export/media/notification functions; fabricated DOM and IndexedDB event delivery.
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
function code(name){const line=app.split('\n').find(s=>s.startsWith('function '+name+'(')||s.startsWith('async function '+name+'('));assert.ok(line,'Missing '+name);return line;}
const clone=value=>JSON.parse(JSON.stringify(value)),media='data:image/png;base64,AAAA';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
class Node{
 constructor(tag,id,attrs={},children=[]){this.tag=tag;this.id=id;this.attrs={...attrs};this.children=children;for(const c of children)c.parent=this;}
 querySelector(selector){const matches=node=>selector.startsWith('#')?node.id===selector.slice(1):node.tag===selector;for(const child of this.children){if(matches(child))return child;const found=child.querySelector(selector);if(found)return found;}return null;}
 setAttribute(k,v){this.attrs[k]=String(v);}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}
 cloneNode(deep){return new Node(this.tag,this.id,this.attrs,deep?this.children.map(child=>child.cloneNode(true)):[]);}
 plain(){return {tag:this.tag,id:this.id,attrs:{...this.attrs},children:this.children.map(child=>child.plain())};}
}
function harness(options={}){
 const image=new Node('image','original-image'),originalLayer=new Node('g','original-layer',{},options.noImage?[]:[image]);
 const drawing=new Node('svg','drawing',{viewBox:'0 0 1 1'},[originalLayer,new Node('g','geometry-layer',{'data-keep':'exact'},[new Node('path','wall-a',{d:'M0 0L10 0'})]),new Node('g','photo-layer',{'data-keep':'photo-cones'}),new Node('g','preview-layer'),new Node('g','base-hit-layer'),new Node('g','selection-layer')]);
 const ui=new Map([['drawing',drawing],['original-layer',originalLayer]]),get=id=>{if(!ui.has(id))ui.set(id,{textContent:''});return ui.get(id);};
 const calls=[],downloads=[],notices=[],cache=new Map();let cancels=0;
 const state={projectId:'fabricated-project',stateToken:'fabricated-token',revision:'v3',baseSvg:'<svg/>',viewBox:[4,8,200,100],items:[],comments:[],photos:[],layers:{original:options.hidden?false:true},original:options.noOriginal?null:{name:'Fabricated source',rasterKey:'fabricated-raster',assetKey:'fabricated-source'}};
 const db={transaction(store,mode){assert.equal(store,'images');assert.equal(mode,'readonly');if(options.transactionThrow)throw Error('Fabricated transaction setup failure');const request={},tx={objectStore(name){assert.equal(name,'images');if(options.storeThrow)throw Error('Fabricated object store failure');return {get(key){if(options.getThrow)throw Error('Fabricated media read setup failure');calls.push({tx,request,key});return request;}};}};return tx;}};
 const c=vm.createContext({state,photoImages:cache,photoDB:async()=>{if(options.openThrow)throw Error('Fabricated storage open failure');return db;},storageWriteFailed:false,$:get,Blob,JSON,cancelLandmarkMatch(){cancels++;},XMLSerializer:class{serializeToString(node){if(options.serializeThrow)throw Error('Fabricated SVG serialization failure');return JSON.stringify(node.plain());}},download:(name,blob)=>{if(options.downloadThrow)throw Error('Fabricated download setup failure');downloads.push({name,blob});}});
 vm.runInContext(['photoLoad','notify','exportSvg'].map(code).join('\n'),c);const actualNotify=c.notify;c.notify=message=>{notices.push(message);actualNotify(message);};
 return {c,get,image,drawing,calls,downloads,notices,cache,get cancels(){return cancels;}};
}
function tracked(p){const r={status:'pending'};p.then(value=>{r.status='fulfilled';r.value=value;},error=>{r.status='rejected';r.error=error;});return r;}
function complete(h,result=media){const q=h.calls[0];assert.ok(q,'Expected actual media read');q.request.result=result;q.request.onsuccess?.();q.tx.oncomplete?.();}
function assertFailure(h,r,pattern,before){assert.equal(r.status,'fulfilled','Site handler catches and reports failure');assert.match(h.get('message').textContent,pattern);assert.doesNotMatch(h.get('message').textContent,/SVG exported/);assert.equal(h.downloads.length,0);if(before)assert.equal(JSON.stringify(h.c.state),before);}
const cases=[];const test=(name,run)=>cases.push({name,run});
for(const event of ['onabort','onerror','requestError'])test('visible-original export reports '+event+' without download or unhandled rejection',async()=>{
 const h=harness(),before=JSON.stringify(h.c.state),r=tracked(h.c.exportSvg());await tick();const q=h.calls[0];q.request.result=media;q.request.onsuccess?.();if(event==='requestError')q.request.onerror?.();else q.tx[event]?.();await tick();assertFailure(h,r,/Photo could not be read/,before);assert.equal(h.cache.size,0);assert.equal(h.image.attrs.href,undefined);
});
for(const option of ['openThrow','transactionThrow','storeThrow','getThrow'])test('visible-original export reports '+option+' synchronously rejected storage setup',async()=>{
 const h=harness({[option]:true}),before=JSON.stringify(h.c.state),r=tracked(h.c.exportSvg());await tick();assertFailure(h,r,/Fabricated/,before);assert.equal(h.cache.size,0);
});
test('successful export waits for completion, embeds exact original and strips only transient clone layers',async()=>{
 const h=harness(),before=JSON.stringify(h.c.state),r=tracked(h.c.exportSvg());await tick();const q=h.calls[0];q.request.result=media;q.request.onsuccess?.();await tick();assert.equal(r.status,'pending');assert.equal(h.downloads.length,0);q.tx.oncomplete?.();await tick();assert.equal(r.status,'fulfilled');assert.equal(h.downloads.length,1);assert.equal(h.downloads[0].name,'annotated-floor-plan.svg');assert.equal(h.downloads[0].blob.type,'image/svg+xml');const out=JSON.parse(await h.downloads[0].blob.text());assert.equal(out.attrs.viewBox,'4 8 200 100');assert.deepEqual(out.children.map(node=>node.id),['original-layer','geometry-layer','photo-layer']);assert.equal(out.children[0].children[0].attrs.href,media);assert.deepEqual(out.children[1],h.drawing.querySelector('#geometry-layer').plain());assert.deepEqual(out.children[2],h.drawing.querySelector('#photo-layer').plain());for(const id of ['preview-layer','base-hit-layer','selection-layer'])assert.ok(h.drawing.querySelector('#'+id),'Live drawing retains '+id);assert.equal(JSON.stringify(h.c.state),before);assert.equal(h.cache.get('fabricated-raster'),media);assert.equal(h.get('message').textContent,'SVG exported.');assert.equal(h.cancels,1);
});
test('changed project during media read cancels without embedding or downloading',async()=>{
 const h=harness(),r=tracked(h.c.exportSvg());await tick();h.c.state.note='Intervening fabricated edit';const before=JSON.stringify(h.c.state);complete(h);await tick();assertFailure(h,r,/Project changed during export/,before);assert.equal(h.image.attrs.href,undefined);
});
for(const [name,options,result]of [['missing media',{},undefined],['missing rendered image',{noImage:true},media]])test(name+' retains existing visible retry error',async()=>{
 const h=harness(options),before=JSON.stringify(h.c.state),r=tracked(h.c.exportSvg());await tick();const q=h.calls[0];q.request.result=result;q.request.onsuccess?.();q.tx.oncomplete?.();await tick();assertFailure(h,r,/Original preview is not ready/,before);assert.equal(h.image.attrs.href,undefined);
});
for(const options of [{hidden:true},{noOriginal:true}])test((options.hidden?'hidden':'absent')+' original exports without media reads',async()=>{
 const h=harness(options),before=JSON.stringify(h.c.state);await h.c.exportSvg();assert.equal(h.calls.length,0);assert.equal(h.downloads.length,1);assert.equal(h.image.attrs.href,undefined);assert.equal(JSON.stringify(h.c.state),before);assert.equal(h.get('message').textContent,'SVG exported.');
});
for(const options of [{serializeThrow:true},{downloadThrow:true}])test((options.serializeThrow?'serialization':'download setup')+' failure is visible and cannot announce success',async()=>{
 const h=harness({...options,noOriginal:true}),before=JSON.stringify(h.c.state),r=tracked(h.c.exportSvg());await tick();assertFailure(h,r,/Fabricated/,before);
});
let failures=0;for(const {name,run}of cases){try{await run();}catch(error){failures++;console.error('FAIL '+name+'\n'+error.stack);}}assert.equal(failures,0,failures+' SVG export workflow failure(s)');console.log('PASS: '+cases.length+' production SVG export cases; visible abort/error/setup feedback, committed media, stale/missing guards, exact clone filtering and serialization failures. Native SVG/browser acceptance remains separate.');
