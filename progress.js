/* Versioned, local-only progress. No server or account required. */
(() => {
  const key='nanko_progress_v1';
  const fresh=()=>({version:1,stage:0,meat:false,power:1,score:0,rpgUnlocked:false,chapter:'shooting',stealth:{unlocked:false,coupon:false,escaped:false,day:false,clear:false,flower:false,x:195,y:580},side:{area:0,power:1,score:0,transfer:false,clear:false},rpg:{x:195,y:550,pass:false,lunch:false,helped:false,arrived:false}});
  let available=true;
  const clean=raw=>{
    const d=fresh();if(!raw||raw.version!==1)return d;
    d.stage=Number.isInteger(raw.stage)?Math.max(0,Math.min(2,raw.stage)):0;
    d.meat=raw.meat===true;d.power=Number.isInteger(raw.power)?Math.max(1,Math.min(3,raw.power)):1;
    d.score=Number.isFinite(raw.score)?Math.max(0,Math.floor(raw.score)):0;
    d.rpgUnlocked=raw.rpgUnlocked===true;d.chapter=d.rpgUnlocked&&raw.chapter==='rpg'?'rpg':'shooting';
    const r=raw.rpg||{};
    for(const k of ['pass','lunch','helped','arrived'])d.rpg[k]=r[k]===true;
    for(const k of ['x','y'])if(Number.isFinite(r[k]))d.rpg[k]=Math.max(k==='x'?22:95,Math.min(k==='x'?368:625,r[k]));
    const side=raw.side||{};
    d.side.area=Number.isInteger(side.area)?Math.max(0,Math.min(2,side.area)):0;
    d.side.power=Number.isInteger(side.power)?Math.max(1,Math.min(3,side.power)):Math.max(1,d.power);
    d.side.score=Number.isFinite(side.score)?Math.max(0,Math.floor(side.score)):0;
    d.side.transfer=side.transfer===true;d.side.clear=side.clear===true;
    if(d.rpgUnlocked&&d.rpg.arrived&&raw.chapter==='side')d.chapter='side';
    const t=raw.stealth||{};
    d.stealth.unlocked=d.side.clear;
    for(const k of ['coupon','escaped','day','clear','flower'])d.stealth[k]=t[k]===true;
    // Normalize new fields only; existing chapters are left intact.
    if(d.stealth.day)d.stealth.escaped=true;
    if(d.stealth.escaped)d.stealth.coupon=true;
    for(const k of ['x','y'])if(Number.isFinite(t[k]))d.stealth[k]=Math.max(k==='x'?20:110,Math.min(k==='x'?370:610,t[k]));
    if(d.side.clear&&raw.chapter==='stealth')d.chapter='stealth';
    return d;
  };
  let data=fresh();try{data=clean(JSON.parse(localStorage.getItem(key)));}catch(_){available=false;}
  const save=()=>{try{localStorage.setItem(key,JSON.stringify(data));available=true;}catch(_){available=false;}return available;};
  window.NankoProgress={get:()=>JSON.parse(JSON.stringify(data)),write:patch=>{data=clean({...data,...patch});return save();},reset:()=>{data=fresh();return save();},get available(){return available;}};
})();
