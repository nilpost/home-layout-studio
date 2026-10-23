/* Conservative coordinate-coverage guards. They do not evaluate or apply CSS. */
(function(root){
'use strict';
const MAX_STYLE=2_000_000;
// CSS geometry properties can override presentation attributes. Escapes, at-rules and
// malformed comments are deliberately unsupported rather than partially interpreted.
function styleAffectsGeometry(value){
 if(typeof value!=='string'||value.length>MAX_STYLE)return true;
 if(/\\|@/.test(value))return true;
 const clean=value.replace(/\/\*[\s\S]*?\*\//g,'');
 if(clean.includes('/*')||clean.includes('*/'))return true;
 return /(?:^|[;{])\s*(?:-(?:webkit|moz|ms|o)-)?(?:transform(?:-origin|-box)?|translate|rotate|scale|matrix|d|x|y|cx|cy|r|rx|ry|width|height|offset(?:-[a-z]+)?|zoom|perspective(?:-origin)?|all)\s*:/i.test(clean);
}
function styleListReason(styleTexts){
 if(!Array.isArray(styleTexts)||styleTexts.length>10000)return 'Unsupported stylesheet input or limit';
 return styleTexts.some(styleAffectsGeometry)?'Stylesheet may change geometry or coordinate context':null;
}
// Frames are ordered leaf first, followed by ancestors INCLUDING the root SVG:
// {tagName:'path'|'g'|'svg'|..., isRoot:boolean, attributes:{name:stringValue,...}}.
// Own leaf geometry attributes are parsed by the geometry extractor; ancestor viewport
// changes and transforms cannot be interpreted safely by the current raw-coordinate model.
function unsupportedReason(attributesArray=[],styleTexts=[]){
 const stylesheet=styleListReason(styleTexts);if(stylesheet)return stylesheet;
 if(!Array.isArray(attributesArray)||attributesArray.length>1000)return 'Unsupported coordinate ancestry input or limit';
 for(let i=0;i<attributesArray.length;i++){
  const frame=attributesArray[i];
  if(!frame||typeof frame.tagName!=='string'||!frame.attributes||typeof frame.attributes!=='object'||Array.isArray(frame.attributes))return 'Unsupported coordinate ancestry';
  const tag=frame.tagName.toLowerCase(),attrs=frame.attributes;
  if(Object.keys(attrs).some(k=>k.toLowerCase()==='transform'))return 'Transform attribute changes coordinate context';
  if(Object.keys(attrs).some(k=>k.toLowerCase()==='style'&&styleAffectsGeometry(attrs[k])))return 'Inline style may change geometry or coordinate context';
  if(tag==='svg'&&frame.isRoot!==true)return 'Nested SVG viewport changes coordinate context';
  if(tag==='svg'&&Object.keys(attrs).some(k=>['x','y','dx','dy','rotate','scale','translate'].includes(k.toLowerCase())))return 'SVG viewport placement requires coordinate mapping';
  if(i>0&&Object.keys(attrs).some(k=>['x','y','dx','dy','rotate','scale','translate','width','height'].includes(k.toLowerCase()))&&tag!=='svg')return 'Ancestor geometry attributes require coordinate mapping';
 }
 return null;
}
root.GeometryCoverage={styleAffectsGeometry,unsupportedReason};
})(typeof window==='undefined'?globalThis:window);
