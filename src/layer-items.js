/* Generic item selection and lock policy. Project content stays in private state. */
(() => {
'use strict';
function select(current,ref,order,anchor,{range=false,toggle=false}={}){
 const next=new Set(toggle?current:[]);
 if(range&&anchor&&order.includes(anchor)&&order.includes(ref)){
  const a=order.indexOf(anchor),b=order.indexOf(ref);for(const key of order.slice(Math.min(a,b),Math.max(a,b)+1))next.add(key);
 }else if(toggle&&next.has(ref))next.delete(ref);else next.add(ref);
 return {refs:[...next],anchor:range&&anchor?anchor:ref};
}
function flags(settings,ref){return Object.hasOwn(settings||{},ref)?settings[ref]:{};}
function validate(settings){if(settings===undefined)return;if(!settings||Array.isArray(settings)||typeof settings!=='object'||Object.keys(settings).length>20000)throw Error('Invalid item settings');for(const [ref,v]of Object.entries(settings))if(ref.length>300||!v||typeof v!=='object'||Array.isArray(v)||Object.entries(v).some(([k,value])=>!['hidden','locked'].includes(k)||typeof value!=='boolean'))throw Error('Invalid item setting');}
function assertLocks(before,after){for(const ref of Object.keys(before.objectSettings||{})){if(!flags(before.objectSettings,ref).locked)continue;const [kind,...parts]=ref.split(':');const id=parts.join(':');let a,b;if(kind==='item'){a=before.items.find(o=>o.id===id);b=after.items.find(o=>o.id===id);}else if(kind==='comment'){a=before.comments.find(o=>o.id===id);b=after.comments.find(o=>o.id===id);}else if(kind==='photo'){a=before.photos.find(o=>o.id===id);b=after.photos.find(o=>o.id===id);}else if(kind==='original'){a=before.original?{...before.original,opacity:0}:null;b=after.original?{...after.original,opacity:0}:null;}else continue;if(a&&JSON.stringify(a)!==JSON.stringify(b))throw Error('Locked item: unlock it before editing or deleting.');}}
globalThis.LayerItems=Object.freeze({select,flags,validate,assertLocks});
})();
