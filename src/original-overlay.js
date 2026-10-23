/* Provider-neutral original reference metadata; file bytes remain private assets. */
(() => {
'use strict';
const raster=/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const source=/^data:(application\/pdf|image\/(svg\+xml|png|jpeg|webp));base64,[A-Za-z0-9+/=]+$/;
function validate(o){
 if(o==null)return;
 if(typeof o.name!=='string'||!o.name.length||o.name.length>240||!['pdf','image','svg'].includes(o.kind)||typeof o.assetKey!=='string'||typeof o.rasterKey!=='string')throw Error('Invalid original plan reference');
 if(![o.x,o.y,o.w,o.h,o.rotation,o.opacity].every(Number.isFinite)||o.w<=0||o.h<=0||o.w>1e7||o.h>1e7||o.opacity<0||o.opacity>1||Math.abs(o.rotation)>360)throw Error('Invalid original plan alignment');
 if(!Number.isInteger(o.page)||!Number.isInteger(o.pageCount)||o.page<1||o.page>o.pageCount||o.pageCount>1000)throw Error('Invalid original PDF page');
 if(o.registration){const r=o.registration;if(r.method!=='similarity-landmarks'||!Array.isArray(r.source)||!Array.isArray(r.target)||r.source.length!==r.target.length||r.source.length<2||r.source.length>20||[...r.source,...r.target].some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite))||![r.rms,r.maxResidual].every(v=>Number.isFinite(v)&&v>=0)||typeof r.baseSourceHash!=='string')throw Error('Invalid landmark registration');}
 if(o.dataUrl!==undefined&&(typeof o.dataUrl!=='string'||o.dataUrl.length>28_000_000||!source.test(o.dataUrl)))throw Error('Invalid original file data');
 if(o.rasterDataUrl!==undefined&&(typeof o.rasterDataUrl!=='string'||o.rasterDataUrl.length>18_000_000||!raster.test(o.rasterDataUrl)))throw Error('Invalid original preview data');
}
function fit(viewBox,width,height){const [x,y,w,h]=viewBox,s=Math.min(w/width,h/height);return {x:x+(w-width*s)/2,y:y+(h-height*s)/2,w:width*s,h:height*s,rotation:0};}
function match(reference,source,target){
 validate(reference);
 if(!Array.isArray(source)||!Array.isArray(target)||source.length!==target.length||source.length<2||source.length>20||[...source,...target].some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)))throw Error('Choose at least two matching landmark pairs.');
 const mean=points=>points.reduce((a,p)=>[a[0]+p[0]/points.length,a[1]+p[1]/points.length],[0,0]),a=mean(source),b=mean(target);
 let denominator=0,dot=0,cross=0;source.forEach((p,i)=>{const x=p[0]-a[0],y=p[1]-a[1],u=target[i][0]-b[0],v=target[i][1]-b[1];denominator+=x*x+y*y;dot+=x*u+y*v;cross+=x*v-y*u;});
 if(denominator<1)throw Error('Source landmarks are too close together.');
 const c=dot/denominator,s=cross/denominator,scale=Math.hypot(c,s);if(scale<.001||scale>1000)throw Error('Target landmarks are too close together or the scale is excessive.');
 const transform=p=>[b[0]+c*(p[0]-a[0])-s*(p[1]-a[1]),b[1]+s*(p[0]-a[0])+c*(p[1]-a[1])];
 const center=transform([reference.x+reference.w/2,reference.y+reference.h/2]),w=reference.w*scale,h=reference.h*scale,rotation=((reference.rotation+Math.atan2(s,c)*180/Math.PI+540)%360)-180;
 const residuals=source.map((p,i)=>Math.hypot(...transform(p).map((v,k)=>v-target[i][k]))),rms=Math.sqrt(residuals.reduce((n,v)=>n+v*v,0)/residuals.length);
 const result={...reference,x:center[0]-w/2,y:center[1]-h/2,w,h,rotation};validate(result);return {reference:result,rms,maxResidual:Math.max(...residuals)};
}
globalThis.OriginalOverlay=Object.freeze({validate,fit,match});
})();
