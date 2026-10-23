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
 if(o.dataUrl!==undefined&&(typeof o.dataUrl!=='string'||o.dataUrl.length>28_000_000||!source.test(o.dataUrl)))throw Error('Invalid original file data');
 if(o.rasterDataUrl!==undefined&&(typeof o.rasterDataUrl!=='string'||o.rasterDataUrl.length>18_000_000||!raster.test(o.rasterDataUrl)))throw Error('Invalid original preview data');
}
function fit(viewBox,width,height){const [x,y,w,h]=viewBox,s=Math.min(w/width,h/height);return {x:x+(w-width*s)/2,y:y+(h-height*s)/2,w:width*s,h:height*s,rotation:0};}
globalThis.OriginalOverlay=Object.freeze({validate,fit});
})();
