/* TRIVEO — questionnaire de course et planification progressive. */
(function(){
'use strict';
const escRun=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=(v,lo,hi,fallback)=>{let x=Number(v);return Number.isFinite(x)?Math.max(lo,Math.min(hi,x)):fallback};
const fmt=x=>{if(!Number.isFinite(x))return '—';const m=Math.floor(x);return m+':'+String(Math.round((x-m)*60)).padStart(2,'0')+'/km'};
const dateAt=(day)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+day);return d.toLocaleDateString('fr-CA',{weekday:'short',day:'numeric',month:'short'})};
const numberField=(key,label,min,max,step,value,unit='')=>'<label class="run-field">'+label+'<span><input name="'+key+'" type="number" min="'+min+'" max="'+max+'" step="'+step+'" value="'+escRun(value)+'" required> '+unit+'</span></label>';
const selectField=(key,label,choices,value)=>'<label class="run-field">'+label+'<select name="'+key+'">'+choices.map(([v,t])=>'<option value="'+v+'" '+(v===String(value)?'selected':'')+'>'+t+'</option>').join('')+'</select></label>';
const data=()=>D.runningAssessment||{goal:'10',weeks:12,days:3,km:15,long:7,months:12,minutes:40,goalTime:'',race5k:'',easyPace:'',comfort:'ok',pain:0,site:'none',nextPain:'no',rest:7,other:2,red:'no',preferences:'mix'};
let draft={...data()},step=0;
const steps=['Objectif','Historique','Capacité','Santé et récupération','Disponibilité'];
function fields(){
switch(step){
case 0:return selectField('goal','Objectif de course',[['return','Reprendre la course sans douleur'],['5','Courir 5 km'],['10','Courir 10 km'],['21.1','Préparer un demi-marathon'],['42.2','Préparer un marathon'],['fitness','Améliorer mon endurance et ma forme']],draft.goal)+numberField('weeks','Durée du programme',4,24,1,draft.weeks,'semaines')+numberField('days','Séances de course par semaine',2,6,1,draft.days,'séances');
case 1:return numberField('months','Depuis combien de mois cours-tu régulièrement ?',0,360,1,draft.months,'mois')+numberField('km','Distance courue sur une semaine récente représentative',0,180,0.5,draft.km,'km')+numberField('long','Ta plus longue sortie des 30 derniers jours',0,60,0.5,draft.long,'km')+selectField('comfort','Comment tolères-tu actuellement la course ?',[['ok','Je cours confortablement'],['hard','Je fatigue rapidement'],['walk','Je dois alterner course et marche'],['break','Je reviens après une pause']],draft.comfort);
case 2:return numberField('minutes','Durée d’une sortie facile habituelle',10,180,5,draft.minutes,'minutes')+'<label class="run-field">Allure d’endurance facile (facultative, min/km)<input name="easyPace" inputmode="decimal" placeholder="ex. 6:30" value="'+escRun(draft.easyPace)+'"></label><label class="run-field">Chrono récent sur 5 km (facultatif, mm:ss)<input name="race5k" inputmode="decimal" placeholder="ex. 28:30" value="'+escRun(draft.race5k)+'"></label><p class="mu">Ces temps servent seulement à estimer les allures; le souffle et l’effort ressenti restent prioritaires.</p>';
case 3:return selectField('red','As-tu actuellement une douleur thoracique à l’effort, un malaise, un évanouissement ou un essoufflement inhabituel ?',[['no','Non'],['yes','Oui / à faire évaluer']],draft.red)+numberField('pain','Douleur pendant la course (0 à 10)',0,10,1,draft.pain,'/10')+selectField('site','Où est située la douleur principale ?',[['none','Aucune'],['achilles','Tendon d’Achille / talon'],['knee','Genou'],['foot','Pied'],['hip','Hanche'],['other','Autre']],draft.site)+selectField('nextPain','Douleur ou raideur accrue le lendemain ?',[['no','Non'],['yes','Oui'],['unknown','Je ne sais pas']],draft.nextPain)+numberField('rest','Sommeil moyen par nuit',3,12,0.5,draft.rest,'heures');
default:return numberField('other','Autres entraînements (vélo, natation, force) par semaine',0,12,1,draft.other,'séances')+selectField('preferences','Type de plan préféré',[['mix','Équilibré'],['time','Priorité au temps (minutes)'],['distance','Priorité aux distances (km)']],draft.preferences)+'<p class="mu">Prévois idéalement une journée plus légère après une séance exigeante. Les entraînements de vélo et de natation comptent dans ta récupération.</p>';
}}
function parsePace(v){let m=String(v||'').trim().match(/^(\d{1,2}):([0-5]\d)$/);if(!m)return null;let x=+m[1]+(+m[2])/60;return x>=3&&x<=15?x:null}
function parseRace(v){const m=String(v||'').trim().match(/^(\d{2}):([0-5]\d)$/);if(!m)return null;const x=+m[1]+(+m[2])/60;return x>=12&&x<=89?x:null}
function validateDraft(f){if(f.weeks<4||f.weeks>24||f.days<2||f.days>6||f.km<0||f.long<0||f.long>f.km*1.8+1)throw Error('Vérifie les semaines, la fréquence et les distances récentes.');if(f.easyPace&&!parsePace(f.easyPace))throw Error('Allure facile : utilise le format 6:30.');if(f.race5k&&!parseRace(f.race5k))throw Error('Chrono 5 km : utilise le format mm:ss, par exemple 28:30.');}
function paceBands(f){let p=parsePace(f.easyPace);const race=parseRace(f.race5k);if(!p&&race)p=race/5+0.9;if(!p)return null;return {easy:fmt(p),range:fmt(p-.15)+' à '+fmt(p+.5),steady:fmt(p-.25)+' à '+fmt(p+.10),tempo:race?fmt(race/5+.12)+' à '+fmt(race/5+.35):null};}
function make(f){
const hold=f.red==='yes',caution=hold||f.pain>=4||f.nextPain==='yes',returning=f.goal==='return'||f.comfort==='walk'||f.comfort==='break'||f.months<3||f.km<8||caution;
const start=Math.max(0,Number(f.km)),base=Math.min(start||4,returning?12:65),safeLong=Math.max(1,Math.min(f.long||base*.45,base*.65));
const goal=Number(f.goal),cap=goal===42.2?Math.max(base,65):goal===21.1?Math.max(base,40):goal===10?Math.max(base,28):goal===5?Math.max(base,20):Math.max(base,24);
const weeks=[],pace=paceBands(f),total=f.weeks;
for(let w=0;w<total;w++){
let phase=w/(total-1),recovery=(w+1)%4===0,relative=(returning?.045:.065);
let target=Math.min(cap,base*Math.pow(1+relative,w));if(recovery)target*=.78;
if(w>=total-2&&['5','10','21.1','42.2'].includes(f.goal))target*=w===total-1?.58:.85;
if(caution)target=Math.min(target,base);
let volume=Math.round(target*10)/10, long=Math.round(Math.min(safeLong*Math.pow(1+(returning?.035:.055),w),volume*.48)*10)/10;
if(recovery)long=Math.min(long,Math.round(volume*.43*10)/10);
const count=f.days,mins=Math.max(15,Math.round(f.minutes*(volume/Math.max(start,4))**.35));
const sessions=[];
for(let j=0;j<count;j++){
const isLong=j===count-1,quality=j===1&&count>=3&&!returning&&!caution&&!recovery&&w>1,part=isLong?long:(volume-long)/Math.max(1,count-1);
const km=Math.max(0.5,Math.round(part*10)/10);
const kind=isLong?'Sortie longue facile':quality?'Tempo contrôlé':'Endurance facile';
const duration=Math.round(km*(parsePace(f.easyPace)||6.7));
sessions.push({kind,km,duration:Math.max(10,duration),effort:quality?'RPE 6–7/10':'RPE 3–4/10',description:quality?'10 min faciles, 2 × 6 à 12 min soutenues avec récupération, retour au calme':returning?'Course-marche autorisée, aisance respiratoire prioritaire':'Conversation possible, respiration confortable'});
}
weeks.push({index:w+1,volume,sessions,recovery});
}
return {created:new Date().toISOString(),assessment:f,caution,hold,returning,pace,weeks};
}
function content(){
if(!D.runningPlan)return '<div class="card st"><h3>Ton plan commence par une évaluation</h3><p class="mu">Entretien structuré : historique, capacité actuelle, allures, symptômes, récupération et objectif. Tu gardes le contrôle des recommandations.</p><button class="btn pri" onclick="runOpen()">Commencer mon évaluation</button></div>';
const p=D.runningPlan,f=p.assessment;
let html='<div class="card st"><div class="wr"><div><h3>'+escRun(f.weeks)+' semaines · '+escRun(f.days)+' séances/semaine</h3><p class="mu">Objectif : '+escRun(({return:'Reprise',fitness:'Forme générale',5:'5 km',10:'10 km','21.1':'Demi-marathon','42.2':'Marathon'})[f.goal]||f.goal)+'</p></div><button class="btn sec" onclick="runOpen()">Réévaluer</button></div></div>';
if(p.hold)return html+'<div class="card st" role="alert"><h3>Évaluation médicale recommandée</h3><p>En raison des symptômes déclarés, TRIVEO ne génère pas de séances de course. Consulte un professionnel de santé avant la reprise.</p></div>';
if(p.caution)html+='<div class="card st" role="status"><h3>Plan de maintien prudent</h3><p>Une douleur importante ou des symptômes plus marqués le lendemain ont été signalés. Aucun accroissement de volume ni travail rapide n’est proposé. Une évaluation par un professionnel de santé ou du sport est recommandée.</p></div>';
html+='<div class="card st"><h3>Repères d’entraînement</h3><p>Endurance : RPE 3–4/10, respiration permettant de parler. Tempo : RPE 6–7/10 seulement si tolérance suffisante.</p><p class="mu">'+(p.pace?'Allure facile indicative : '+escRun(p.pace.range)+' · à ajuster aux sensations.':'Aucune allure imposée : ajoute une allure facile ou un résultat de référence lors d’une prochaine évaluation.')+'</p><p class="mu">Les distances et durées sont des estimations, non des prescriptions cliniques. Évite toute augmentation brutale, surtout de la sortie longue.</p></div>';
html+=p.weeks.map(w=>'<details class="card st" style="margin-bottom:12px" '+(w.index===1?'open':'')+'><summary><strong>Semaine '+w.index+'</strong> · '+w.volume.toLocaleString('fr-CA')+' km'+(w.recovery?' · allégée':'')+'</summary><div style="display:grid;gap:10px;margin-top:12px">'+w.sessions.map((s,j)=>'<div style="border-top:1px solid var(--ln);padding-top:10px"><strong>Sortie '+(j+1)+' · '+s.kind+'</strong><p>'+s.km.toLocaleString('fr-CA')+' km · ~'+s.duration+' min · '+s.effort+'</p><p class="mu">'+s.description+'</p></div>').join('')+'</div></details>').join('');
return html;
}
window.runPlanPage=function(){return hd('Plan de course','Évaluation et programmation personnalisée')+content()};
window.runOpen=()=>{draft={...data()};step=0;runModal()};
function runModal(){
const html='<div class="run-overlay" role="dialog" aria-modal="true" aria-label="Évaluation course"><div class="run-dialog"><div class="wr" style="justify-content:space-between"><strong>Évaluation course · '+(step+1)+'/5</strong><button class="btn sec" onclick="runClose()">Fermer</button></div><div class="run-progress"><i style="width:'+((step+1)*20)+'%"></i></div><h2>'+steps[step]+'</h2><form id="runForm"><div class="run-fields">'+fields()+'</div><div class="wr" style="justify-content:space-between;margin-top:18px"><button type="button" class="btn sec" onclick="runBack()" '+(step===0?'disabled':'')+'>Retour</button><button class="btn pri" type="submit">'+(step===4?'Créer mon plan':'Continuer')+'</button></div><p id="runErr" role="alert" class="mu"></p></form></div></div>';
let el=document.getElementById('runOverlay');if(!el){el=document.createElement('div');el.id='runOverlay';document.body.appendChild(el)}el.innerHTML=html;el.hidden=false;document.body.style.overflow='hidden';
document.getElementById('runForm').onsubmit=e=>{e.preventDefault();const form=e.currentTarget;if(!form.reportValidity())return;try{read(form);if(step<4){step++;runModal()}else{validateDraft(draft);D.runningAssessment={...draft};D.runningPlan=make(draft);sv();runClose();R()}}catch(err){document.getElementById('runErr').textContent=err.message}};
}
function read(form){for(const [k,v] of new FormData(form)){draft[k]=['weeks','days','months','km','long','minutes','pain','rest','other'].includes(k)?Number(v):v}}
window.runBack=()=>{const f=document.getElementById('runForm');if(f)read(f);step=Math.max(0,step-1);runModal()};
window.runClose=()=>{const el=document.getElementById('runOverlay');if(el)el.hidden=true;document.body.style.overflow=''};
})();
