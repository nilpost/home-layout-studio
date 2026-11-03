/* Transient exact drawing-unit metrics. No physical units or saved checker changes. */
(function(root){
'use strict';
const VERSION=1,PROFILE='integer-root-drawing-units-v1';
const abs=value=>value<0n?-value:value;
function evaluate(input){
 // Re-evaluate raw evidence; a caller's asserted pass is never a measurement proof.
 const topology=root.RoomBoundaries.evaluate(input);
 const findings=topology.findings.map(finding=>{
  const result={declarationId:finding.declarationId,projectId:finding.declaration.projectId,sourceHash:finding.evidence.currentSourceHash,frameId:finding.evidence.currentFrameId,topologyStatus:finding.status,status:'unknown',reasons:[],areaDrawingUnitsSquared:null,perimeterDrawingUnits:null};
  if(finding.status!=='pass'){result.reasons=['topology-not-passing',...finding.evidence.unknownReasons,...finding.evidence.numericalViolationCodes];return result;}
  const edges=finding.evidence.resolvedEdges;
  if(edges.some(edge=>[...edge.a,...edge.b].some(value=>!Number.isSafeInteger(value)))){result.reasons=['noninteger-coordinate-profile'];return result;}
  let twiceArea=0n,perimeter=0n;
  for(const edge of edges){const [ax,ay]=edge.a.map(BigInt),[bx,by]=edge.b.map(BigInt);twiceArea+=ax*by-bx*ay;perimeter+=abs(bx-ax)+abs(by-ay);}
  twiceArea=abs(twiceArea);
  if(twiceArea===0n||perimeter===0n||twiceArea%2n!==0n){result.reasons=['unsupported-integer-ring-measure'];return result;}
  result.status='computed';result.areaDrawingUnitsSquared=String(twiceArea/2n);result.perimeterDrawingUnits=String(perimeter);return result;
 });
 return {metricVersion:VERSION,numericalProfile:PROFILE,scope:'explicit-declared-ring-drawing-units-only',physicalUnitsVerified:false,topologyStatus:topology.status,status:findings.length&&findings.every(finding=>finding.status==='computed')?'computed':'unknown',reasons:findings.length?[]:['no-room-declarations'],findings};
}
root.RingMetrics=Object.freeze({VERSION,PROFILE,evaluate});
})(typeof window==='undefined'?globalThis:window);
