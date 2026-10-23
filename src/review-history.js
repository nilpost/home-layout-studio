/* Provider-neutral comment/change records. This file contains no project data. */
(function(root){
'use strict';
function nextRevision(current){return 'v'+(Number(current.replace(/[^0-9]/g,''))+1||1);}
function recordChange(state,type,summary,commentIds=[],changes=[]){
 if(typeof summary!=='string'||!summary.trim())throw Error('A change summary is required.');
 if(commentIds.some(id=>!state.comments.some(c=>c.id===id)))throw Error('Unknown comment in change record.');
 const entry={id:'change-'+crypto.randomUUID(),type,revision:nextRevision(state.revision),recordedAt:new Date().toISOString(),summary:summary.trim(),commentIds:[...new Set(commentIds)],changes:JSON.parse(JSON.stringify(changes))};
 state.changeLog=state.changeLog||[];state.changeLog.push(entry);return entry;
}
function resolveComments(state,ids,entry){
 if(!entry.summary?.trim()||!entry.revision||ids.some(id=>!entry.commentIds.includes(id)||!state.comments.some(c=>c.id===id)))throw Error('Resolution must reference a recorded change and existing comments.');
 for(const id of ids){const c=state.comments.find(c=>c.id===id);c.status='done';c.resolution={summary:entry.summary,revision:entry.revision,recordedAt:entry.recordedAt,changeId:entry.id};c.history=c.history||[];c.history.push({status:'done',...c.resolution});}
}
root.ReviewHistory={nextRevision,recordChange,resolveComments};
})(typeof window==='undefined'?globalThis:window);
