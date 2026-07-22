/* BUKTI FUNGSIONAL: jalankan tema di jsdom, klik ★, cek panel benar-benar
   terbuka, slider ter-generate, dan menggeser slider mengubah fisika. */
const fs=require('fs'),path=require('path');
const {JSDOM}=require('jsdom');
const DIR='c:/Users/msiso/wedding-invitation/src/sample-theme/pixel-wedding-run';
let html=fs.readFileSync(path.join(DIR,'index.html'),'utf8');
const js=fs.readFileSync(path.join(DIR,'index.js'),'utf8');
html=html.replace(/\{\{#if[\s\S]*?\}\}/g,'').replace(/\{\{\/if\}\}/g,'')
         .replace(/\{\{#each[\s\S]*?\{\{\/each\}\}/g,'').replace(/\{\{(\w+)\}\}/g,'');
const dom=new JSDOM(`<!doctype html><html><body>${html}</body></html>`,
  {url:'https://example.test/',pretendToBeVisual:true,runScripts:'outside-only'});
const {window}=dom;
global.window=window;global.document=window.document;
global.navigator=window.navigator;global.localStorage=window.localStorage;
let sceneInstance=null;
window.Phaser={VERSION:'3.80.1',AUTO:0,Scene:function(c){this._cfg=c;},
 Scale:{NONE:0,NO_CENTER:0,FIT:1,CENTER_BOTH:2,RESIZE:3},
 Input:{Keyboard:{KeyCodes:{LEFT:37,RIGHT:39,UP:38,A:65,D:68,W:87,SPACE:32}}},
 Math:{Between:(a)=>a},
 Game:function(){this.canvas=window.document.createElement('canvas');
  const s=window.document.getElementById('pwr-stage');if(s)s.appendChild(this.canvas);
  this.scene={getScene:()=>sceneInstance};this.destroy=function(){};}};
window.Phaser.Scene.prototype={};
window.AudioContext=function(){return{state:'running',currentTime:0,resume(){},close(){},
 createOscillator:()=>({type:'',frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},start(){},stop(){}}),
 createGain:()=>({gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}),destination:{}};};
window.eval(js);
try{window.document.dispatchEvent(new window.Event('DOMContentLoaded',{bubbles:true}));}catch(e){}

let pass=0,fail=0;
function t(name,cond,extra){ if(cond){pass++;console.log('  OK   '+name+(extra?'   ['+extra+']':''));}
  else{fail++;console.log('  FAIL '+name+(extra?'   ['+extra+']':''));} }

const $=id=>window.document.getElementById(id);
const panel=$('pwr-tune'), star=$('pwr-tune-star');

console.log('--- keadaan awal ---');
t('panel ada di DOM', !!panel);
t('bintang ★ ada di DOM', !!star);
t('panel TERTUTUP sebelum diklik', panel && !panel.classList.contains('show'));
t('daftar slider masih kosong', $('pwr-tune-list') && $('pwr-tune-list').children.length===0);

console.log('--- klik ★ (event asli, lewat listener terdelegasi) ---');
star.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
t('panel TERBUKA setelah klik ★', panel.classList.contains('show'));
const rows=$('pwr-tune-list').querySelectorAll('.pwr-tune-row');
t('slider ter-generate', rows.length>0, rows.length+' slider');
const sliders=$('pwr-tune-list').querySelectorAll('input[type=range]');
t('semua slider punya input range', sliders.length===rows.length, sliders.length+'');
const labels=[...$('pwr-tune-list').querySelectorAll('.pwr-tune-row-name')].map(e=>e.textContent);
console.log('       slider: '+labels.join(' | '));
t('ada readout turunan', !!$('pwr-tune-readout'), $('pwr-tune-readout')?$('pwr-tune-readout').textContent:'');

console.log('--- geser slider "Tinggi loncatan" ---');
const jumpIdx=labels.findIndex(l=>/loncatan/i.test(l));
t('slider tinggi loncatan ditemukan', jumpIdx>=0);
const before=window.eval('Math.round(JUMP_H_PX)');
const inp=sliders[jumpIdx];
inp.value='1000';
inp.dispatchEvent(new window.Event('input',{bubbles:true}));
const after=window.eval('Math.round(JUMP_H_PX)');
t('JUMP_H_PX berubah setelah slider digeser', after>before, before+'px -> '+after+'px');
t('PHYS.JUMP_VELOCITY ikut ter-set', window.eval('PHYS.JUMP_VELOCITY')===1000, window.eval('PHYS.JUMP_VELOCITY'));
t('H_PIECE ikut dihitung ulang (kepingan tetap terjangkau)',
  window.eval('H_PIECE <= H_REACH && H_REACH <= JUMP_H_PX'),
  'piece='+window.eval('Math.round(H_PIECE)')+' reach='+window.eval('Math.round(H_REACH)'));
t('nilai tersimpan ke localStorage',
  JSON.parse(window.localStorage.getItem('pwr_tune_v2')||'{}').jumpVel===1000);

console.log('--- geser slider Tinggi tanah ---');
const ceilIdx=labels.findIndex(l=>/tinggi tanah/i.test(l));
const gBefore=window.eval('CONFIG_GROUND_Y()');
sliders[ceilIdx].value='400';
sliders[ceilIdx].dispatchEvent(new window.Event('input',{bubbles:true}));
const gAfter=window.eval('CONFIG_GROUND_Y()');
t('tinggi tanah berubah', gAfter!==gBefore, gBefore+' -> '+gAfter);

console.log('--- geser slider PIJAKAN MELAYANG ---');
const plIdx=labels.findIndex(l=>/pijakan melayang/i.test(l));
t('slider pijakan melayang ada', plIdx>=0);
const plBefore=window.eval('H_PLAT');
const gBefore2=window.eval('CONFIG_GROUND_Y()');
sliders[plIdx].value='100';
sliders[plIdx].dispatchEvent(new window.Event('input',{bubbles:true}));
const plAfter=window.eval('H_PLAT');
t('H_PLAT berubah (pijakan melayang naik)', plAfter>plBefore, plBefore+'px -> '+plAfter+'px');
t('tanah TIDAK ikut bergeser', window.eval('CONFIG_GROUND_Y()')===gBefore2, 'y='+gBefore2);
t('pijakan tetap <= jangkauan', window.eval('H_PLAT <= H_REACH'), 'plat='+window.eval('H_PLAT')+' reach='+window.eval('Math.round(H_REACH)'));

console.log('--- tombol Reset ---');
$('pwr-tune-reset').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
t('reset mengembalikan jumpVel ke bawaan', window.eval('TUNE.jumpVel')===680, window.eval('TUNE.jumpVel'));
t('JUMP_H_PX kembali ke bawaan', window.eval('Math.round(JUMP_H_PX)')===136, window.eval('Math.round(JUMP_H_PX)'));

console.log('--- tombol Tutup ---');
$('pwr-tune-close').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
t('panel tertutup', !panel.classList.contains('show'));

console.log('\n  '+pass+'/'+(pass+fail)+' lulus');
if(fail)process.exitCode=1;
