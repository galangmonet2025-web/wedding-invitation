/* Reproduksi: apakah alpha bos bisa nyangkut < 1 (praktis hilang) saat
   ditembak? Mock meniru renderer CANVAS: setTint/clearTint = no-op (tidak
   mengubah apa pun yang terlihat), yang menentukan visibilitas hanya alpha. */
const fs = require('fs');
const js = fs.readFileSync('index.js', 'utf8');
function bodyOf(n){const s=js.indexOf('GameScene.prototype.'+n+' = function');const e=js.indexOf('\n};',s);return js.slice(s,e+3);}
const src = ['updateBoss','hitBoss','defeatBoss','activateBoss','shotHitsBoss'].map(bodyOf).join('\n');

function mk(){
  const o={active:true,visible:true,alpha:1,tintCalls:0,x:100,y:400,scaleX:1,scaleY:1,
    destroyed:false,invulnMs:0,flashMs:0,baseY:400,displayHeight:117,
    body:{velocity:{x:0,y:0},blocked:{down:true},touching:{down:false},enable:true,
      setAllowGravity(){},setSize(){},setOffset(){},setVelocity(){},reset(){},stop(){}},
    setActive(v){o.active=v;return o},setVisible(v){o.visible=v;return o},
    setAlpha(v){o.alpha=v;return o},
    setTint(){o.tintCalls++;return o},   /* CANVAS: no-op visual */
    clearTint(){return o},
    setOrigin(){return o},setDepth(){return o},setScale(v){o.scaleX=v;return o},
    setFlipX(){return o},setTexture(){return o},setImmovable(){return o},
    setPosition(x,y){o.x=x;o.y=y;return o},setText(){return o},setColor(){return o},
    add(){return o},stop(){return o},
    disableBody(h,d){o.body.enable=false;if(d)o.active=false;if(h)o.visible=false;return o},
    destroy(){o.destroyed=true}};
  return o;
}
function scene(){
  const s={bossActive:true,bossHp:12,bossPhase:1,GY:400,L:{len:5600},stageIdx:5,
    bossHeadH:133,bossGateX:99999,boss:mk(),
    player:{x:100,y:800,dying:false,body:{velocity:{x:0,y:0},blocked:{down:true},touching:{down:false}}},
    add:{text:()=>mk(),rectangle:()=>mk(),container:()=>mk(),particles:()=>({explode(){},destroy(){},setDepth(){return this}})},
    tweens:{add:c=>{if(c.onComplete)c.onComplete();return{stop(){}}}},
    cameras:{main:{shake(){},flash(){},setBounds(){}}},
    physics:{world:{gravity:{y:0}},add:{overlap(){}}},
    time:{now:1000,delayedCall(){}},textures:{exists:()=>false},
    addScore(){},hurtPlayer(){}};
  s.bossHpBg=mk();s.bossHpFill=mk();
  const proto=new Function('sfx','toast','fireworks','announceCompleted','saveStore','STORE','STAGES','PHYS','BOSS_ARENA_W','BW','BH','BOSS_INVULN_MS','BOSS_FLASH_MS',
    'var GameScene=function(){};'+src+'return GameScene.prototype;')
    (()=>{},()=>{},()=>{},()=>{},()=>{},{maxStage:0},[1,2,3,4,5,6],{JUMP_VELOCITY:540,GRAVITY_Y:1000},300,540,960,
    /BOSS_INVULN_MS = (\d+)/.test(js)?+RegExp.$1:650,/BOSS_FLASH_MS = (\d+)/.test(js)?+RegExp.$1:200);
  Object.keys(proto).forEach(k=>{s[k]=proto[k];});
  return s;
}
const s=scene();
let t=1000;
console.log('frame  alpha  invulnMs  flashMs  hp  event');
/* jalankan 5 frame normal */
for(let i=0;i<3;i++){s.updateBoss(t,16);t+=16;console.log(String(i).padStart(5),String(s.boss.alpha).padStart(6),String(Math.round(s.boss.invulnMs)).padStart(9),String(Math.round(s.boss.flashMs)).padStart(8),String(s.bossHp).padStart(4));}
/* TEMBAK */
s.hitBoss();console.log('  --- hitBoss() dipanggil (flashMs='+s.boss.flashMs+') ---');
/* lanjut 60 frame, catat alpha */
let minAlpha=1,stuckFrames=0;
for(let i=0;i<60;i++){
  s.updateBoss(t,16);t+=16;
  if(s.boss.alpha<minAlpha)minAlpha=s.boss.alpha;
  if(s.boss.invulnMs<=0&&s.boss.flashMs<=0&&s.boss.alpha<1)stuckFrames++;
  if(i<8||s.boss.alpha<1)console.log(String(i).padStart(5),String(s.boss.alpha).padStart(6),String(Math.round(s.boss.invulnMs)).padStart(9),String(Math.round(s.boss.flashMs)).padStart(8),String(s.bossHp).padStart(4));
}
console.log('\nalpha minimum:',minAlpha);
console.log('frame alpha<1 saat TIDAK kebal/flash:',stuckFrames);
console.log('alpha akhir:',s.boss.alpha,'visible?',s.boss.alpha>0);
process.exit(0);
