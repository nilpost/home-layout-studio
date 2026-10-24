/* Pure rectangle rotation corners and bounds shared by overlay operations. */
(function(root){
'use strict';
const MAX_COORDINATE=1_000_000_000;
function number(value,label,{positive=false}={}){if(typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>MAX_COORDINATE||positive&&value<=0)throw Error('Invalid '+label+': use a finite '+(positive?'positive ':'')+'number within '+MAX_COORDINATE+'.');return value;}
function footprint(rect){
 if(!rect||typeof rect!=='object'||Array.isArray(rect))throw Error('Invalid rectangle footprint');
 if(rect.kind!==undefined&&!['furniture','rect'].includes(rect.kind))throw Error('Only furniture and box rectangle footprints are supported.');
 const x=number(rect.x,'X'),y=number(rect.y,'Y'),w=number(rect.w,'width',{positive:true}),h=number(rect.h,'height',{positive:true}),rotation=rect.rotation===undefined?0:rect.rotation;
 if(typeof rotation!=='number'||!Number.isFinite(rotation)||Math.abs(rotation)>360)throw Error('Rotation must be a finite number from -360 to 360 degrees.');
 const angle=rotation%360,cx=x+w/2,cy=y+h/2;
 const quarters={0:[1,0],90:[0,1],180:[-1,0],270:[0,-1],'-90':[0,-1],'-180':[-1,0],'-270':[0,1]};
 const [cos,sin]=Object.hasOwn(quarters,angle)?quarters[angle]:[Math.cos(angle*Math.PI/180),Math.sin(angle*Math.PI/180)];
 // Preserve exact original edge coordinates for zero rotation and full turns.
 const points=angle===0?[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]:[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(([a,b])=>[cx+a*cos-b*sin,cy+a*sin+b*cos]);
 for(const point of points){number(point[0],'corner X');number(point[1],'corner Y');}
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),left=Math.min(...xs),top=Math.min(...ys);
 const box={x:left,y:top,w:Math.max(...xs)-left,h:Math.max(...ys)-top};
 number(box.w,'bounding width',{positive:true});number(box.h,'bounding height',{positive:true});
 const a=[points[1][0]-points[0][0],points[1][1]-points[0][1]],b=[points[3][0]-points[0][0],points[3][1]-points[0][1]];
 const area=a[0]*b[1]-a[1]*b[0];
 if(!Number.isFinite(area)||area<=0||new Set(points.map(p=>p.join(','))).size!==4)throw Error('Rectangle is too small or distorted to represent a nondegenerate rotated footprint.');
 return {points,box};
}
function rectCorners(rect){return footprint(rect).points;}
function bounds(rect){return footprint(rect).box;}
root.OverlayFootprint=Object.freeze({MAX_COORDINATE,rectCorners,bounds});
})(typeof window==='undefined'?globalThis:window);
