(function(root){
"use strict";
const relayOrigin="https://triveo-garmin-relay.abz-tek.chatgpt.site";
function begin(){
let popup=null,secret="",ready=false,sent=false,resolveResult,rejectResult,ended=false;
const channel=Array.from(crypto.getRandomValues(new Uint8Array(24)),b=>b.toString(16).padStart(2,"0")).join("");
let date,days;
const result=new Promise((resolve,reject)=>{resolveResult=resolve;rejectResult=reject});result.catch(()=>{});
function clean(){window.removeEventListener("message",receive);clearTimeout(timer);clearInterval(watch);secret="";ended=true}
function fail(message){if(ended)return;clean();rejectResult(Error(message))}
function send(){if(ready&&secret&&!sent){sent=true;popup.postMessage({type:"triveo-garmin-sync",channel,key:secret,date,days},relayOrigin);secret="";}}
function receive(e){if(e.origin!==relayOrigin||e.source!==popup||!e.data||e.data.channel!==channel)return;const d=e.data;if(d.type==="triveo-garmin-ready"){ready=true;send()}else if(d.type==="triveo-garmin-result"){clean();resolveResult(d.result)}else if(d.type==="triveo-garmin-error"){fail(typeof d.message==="string"?d.message:"Synchronisation refusée.")}}
window.addEventListener("message",receive);
const timer=setTimeout(()=>fail("Délai dépassé. Autorise les fenêtres et connecte-toi au relais privé, puis réessaie."),180000);
const watch=setInterval(()=>{if(popup?.closed)fail("La fenêtre de synchronisation a été fermée.")},1000);
popup=window.open(relayOrigin+"/#channel="+channel,"triveo-garmin-"+channel,"popup,width=620,height=720");
if(!popup)fail("Fenêtre bloquée. Autorise les fenêtres pour TRIVEO, puis réessaie.");
return {async run(key,n,d){if(ended)return result;secret=key;days=n;date=d;send();return result},cancel(){fail("Synchronisation annulée.");if(popup&&!popup.closed)popup.close()}};
}
function normalizeActivity(a){
const k=a?.activityType?.typeKey||"",parent=a?.activityType?.parentTypeId;
const type=/running|run$/.test(k)?"Course à pied":/cycling|biking/.test(k)?"Cyclisme":/swimming|swim$/.test(k)?"Natation":null;
const d=String(a?.startTimeLocal||a?.startTimeGMT||"").slice(0,10),seconds=Number(a?.duration),id=String(a?.activityId||"");
if(!type||!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(seconds)||seconds<=0||!/^\d+$/.test(id))return null;
return {d,t:type,m:Math.max(1,Math.round(seconds/60)),source:"Garmin",garminId:id,garminFields:a};
}
function merge(existing,result){if(!result||!Array.isArray(result.activities)||result.activities.length>500||!result.health||typeof result.syncedAt!=="string"||!Number.isFinite(Date.parse(result.syncedAt)))throw Error("Réponse du relais invalide.");
const rows=existing.slice(),index=new Map(rows.flatMap((a,i)=>a.source==="Garmin"&&a.garminId?[[String(a.garminId),i]]:[]));let added=0,updated=0,ignored=0;
for(const a of result.activities){const entry=normalizeActivity(a);if(!entry){ignored++;continue}const old=index.get(entry.garminId);if(old!==undefined){rows[old]={...rows[old],...entry};updated++}else{index.set(entry.garminId,rows.length);rows.push(entry);added++}}
return {rows,added,updated,ignored};
}
root.TriveoGarminSync=Object.freeze({begin,merge,normalizeActivity});
})(globalThis);
