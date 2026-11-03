import assert from 'node:assert/strict';
import '../src/overlay-footprint.js';
const F=globalThis.OverlayFootprint;
const rect={kind:'furniture',x:10,y:20,w:8,h:4,label:'Synthetic rectangle',assetId:'synthetic-asset'},before=structuredClone(rect);
const near=(a,b,tolerance=1e-10)=>assert(Math.abs(a-b)<=tolerance,'Expected '+a+' near '+b);
assert.deepEqual(F.rectCorners(rect),[[10,20],[18,20],[18,24],[10,24]]);
assert.deepEqual(F.bounds(rect),{x:10,y:20,w:8,h:4});
assert.deepEqual(F.rectCorners({...rect,rotation:90}),[[16,18],[16,26],[12,26],[12,18]]);
assert.deepEqual(F.rectCorners({...rect,rotation:-90}),[[12,26],[12,18],[16,18],[16,26]]);
assert.deepEqual(F.rectCorners({...rect,rotation:180}),[[18,24],[10,24],[10,20],[18,20]]);
assert.deepEqual(F.bounds({...rect,rotation:90}),{x:12,y:18,w:4,h:8});
for(const rotation of [0,-0,360,-360])assert.deepEqual(F.rectCorners({...rect,rotation}),F.rectCorners(rect));
for(const rotation of [-180,-90,0,22.25,45,90,123.5,180,270,360]){
 const points=F.rectCorners({...rect,rotation}),box=F.bounds({...rect,rotation}),cx=14,cy=22;
 near(points.reduce((sum,p)=>sum+p[0],0)/4,cx);near(points.reduce((sum,p)=>sum+p[1],0)/4,cy);
 for(const point of points){near(Math.hypot(point[0]-cx,point[1]-cy),Math.hypot(4,2));assert(point[0]>=box.x-1e-10&&point[0]<=box.x+box.w+1e-10);assert(point[1]>=box.y-1e-10&&point[1]<=box.y+box.h+1e-10);}
 near(Math.hypot(points[1][0]-points[0][0],points[1][1]-points[0][1]),rect.w);
 near(Math.hypot(points[2][0]-points[1][0],points[2][1]-points[1][1]),rect.h);
 assert.deepEqual(rect,before);
}
const box45=F.bounds({...rect,rotation:45});near(box45.w,12/Math.sqrt(2));near(box45.h,12/Math.sqrt(2));near(box45.x,14-6/Math.sqrt(2));near(box45.y,22-6/Math.sqrt(2));
const negative={kind:'rect',x:-18,y:-24,w:8,h:4,rotation:90};
const reflected=F.rectCorners({...rect,rotation:90}).map(p=>[-p[0],-p[1]]),negativePoints=F.rectCorners(negative);
assert.deepEqual(negativePoints,[...reflected.slice(2),...reflected.slice(0,2)]);
assert.deepEqual(F.bounds(negative),{x:-16,y:-26,w:4,h:8});
assert.deepEqual(F.bounds({x:F.MAX_COORDINATE-8,y:-F.MAX_COORDINATE,w:8,h:4}),{x:F.MAX_COORDINATE-8,y:-F.MAX_COORDINATE,w:8,h:4});
assert.deepEqual(F.bounds({x:0,y:0,w:F.MAX_COORDINATE,h:F.MAX_COORDINATE}),{x:0,y:0,w:F.MAX_COORDINATE,h:F.MAX_COORDINATE});
assert.deepEqual(F.bounds({x:0,y:0,w:F.MAX_COORDINATE,h:4,rotation:180}),{x:0,y:0,w:F.MAX_COORDINATE,h:4});
for(const patch of [{x:NaN},{y:Infinity},{x:'10'},{w:0},{h:-4},{w:Infinity},{rotation:361},{rotation:-361},{rotation:Infinity},{rotation:NaN},{rotation:'90'},{rotation:null},{kind:'wall'},{x:F.MAX_COORDINATE-1},{x:-F.MAX_COORDINATE,rotation:45},{w:Number.MIN_VALUE},{x:0,y:0,w:1e-200,h:1e-200},{x:-5e8,y:-5e8,w:1e9,h:1e9,rotation:45}]){
 const input={...rect,...patch},snapshot=structuredClone(input);assert.throws(()=>F.rectCorners(input));assert.throws(()=>F.bounds(input));assert.deepEqual(input,snapshot);
}
const points=F.rectCorners(rect),box=F.bounds(rect);points[0][0]=999;box.w=999;assert.deepEqual(F.rectCorners(rect),[[10,20],[18,20],[18,24],[10,24]]);assert.deepEqual(rect,before);
console.log('PASS: detached rectangle rotation corners/AABB, exact quarter turns, arbitrary angles, SVG orientation, center/distance invariants and strict geometry bounds.');
