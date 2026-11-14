/* TRIVEO: encrypted, device-local Garmin key storage. Never included in account state. */
(function(root){
"use strict";
const prefix="triveo.garmin.vault.v1:";
const enc=new TextEncoder(),dec=new TextDecoder();
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
const un64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
function storageKey(uid){if(!uid||typeof uid!=="string")throw Error("Connecte-toi à TRIVEO avant d'utiliser le coffre.");return prefix+uid}
async function derive(password,salt){const material=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",hash:"SHA-256",salt,iterations:600000},material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])}
const api={
has(uid){try{return !!localStorage.getItem(storageKey(uid))}catch{return false}},
async save(uid,key,password){const name=storageKey(uid);if(!crypto.subtle)throw Error("Le coffre nécessite HTTPS et un navigateur récent.");if(typeof key!=="string"||!key.trim()||key.trim().length>8192)throw Error("Colle une clé Garmin valide (8 Ko maximum).");if(typeof password!=="string"||password.length<12)throw Error("Choisis un mot de passe de coffre d'au moins 12 caractères.");const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),derived=await derive(password,salt);const data=await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:enc.encode(name)},derived,enc.encode(key.trim()));localStorage.setItem(name,JSON.stringify({v:1,salt:b64(salt),iv:b64(iv),data:b64(data)}));},
async verify(uid,password){const name=storageKey(uid),raw=localStorage.getItem(name);if(!raw)throw Error("Aucune clé enregistrée sur cet appareil.");let bytes;try{const v=JSON.parse(raw);if(v.v!==1)throw Error();const key=await derive(password,un64(v.salt));bytes=new Uint8Array(await crypto.subtle.decrypt({name:"AES-GCM",iv:un64(v.iv),additionalData:enc.encode(name)},key,un64(v.data)));if(!dec.decode(bytes).length)throw Error();return true}catch{throw Error("Mot de passe incorrect ou coffre illisible.")}finally{if(bytes)bytes.fill(0)}},
remove(uid){localStorage.removeItem(storageKey(uid))}
};root.TriveoGarminVault=Object.freeze(api);
})(globalThis);
