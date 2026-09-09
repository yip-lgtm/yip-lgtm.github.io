var muted=false,audioCtx=null;
function unlockAudio(){try{var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;if(!audioCtx)audioCtx=new AC();if(audioCtx.state==="suspended")audioCtx.resume();}catch(e){}}
function bell(){unlockAudio();try{if(audioCtx){var o=audioCtx.createOscillator(),g=audioCtx.createGain();o.frequency.value=880;g.gain.setValueAtTime(0.0001,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(0.12,audioCtx.currentTime+0.01);g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+0.35);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+0.4);}}catch(e){}try{navigator.vibrate&&navigator.vibrate(120);}catch(e){}}
var SK={
stance:{name:"架勢",cue:"前腳對人、後腳外開約 45 度，膝微曲，重量兩邊都卸得走。手護下巴，髓唔鎖。腳先郁、手後出。<br><span class=en>Lead foot at them, rear foot ~45°. Soft knees, weight ready to step. Hands high. Feet move before the punch.</span>"},
shuffle:{name:"滑步",cue:"碎步貼地換位，步幅細，頭與肩唔晃。停穩先至可以刺。步子只為角度。<br><span class=en>Small steps, feet kiss the floor. Head still. Stop, then jab. Footwork buys an angle.</span>"},
pivot:{name:"Pivot",cue:"前腳做軸，後腳向外划弧約 45 度。慢轉，轉完兩腳停實先刺。離開對手直線發力。<br><span class=en>Pivot on the lead foot ~45°. Slow. Plant both feet before the jab. Leave their power line.</span>"},
ring:{name:"環繞",cue:"走弧、唔直線後退。移去對手弱手外側，刺一下當入場券，3–5 秒轉節奏。<br><span class=en>Circle, do not retreat straight. Move to the weak-hand side. Jab pays the entry.</span>"},
jab:{name:"刺拳",cue:"肩帶拳尖出去，打完即收，唔劈。中身就呼氣收腹，側步離開中線。<br><span class=en>Shoulder first, fist last, snap back. Brace the belly and step off centre.</span>"}
};
var PARTS=[
{k:"A",name:"背",gear:"單機／下拉／划船",cue:"肩胪先夾再屈肘。引體胸貼機，或下拉／划船肘貼身拉到腰側。5–12 下，背肌先疲。<br><span class=en>Start the pull with the shoulder blades. 5–12 reps. The back should fail first.</span>"},
{k:"B",name:"胸",gear:"伏地／推胸／啞鈴",cue:"肩胪微收，肘約 45 度。推到將直但唔鎖死，下放胸有伸展。8–15 下，唔借腰彈。<br><span class=en>Scapula set, elbows ~45°. Stop short of lockout. 8–15 smooth reps.</span>"},
{k:"C",name:"二頭",gear:"啞鈴／拉力器",cue:"上臂貼肋，只係前臂彎。8–12 下，頂端停一拍再慢放。身唔晃。<br><span class=en>Pin the upper arm. 8–12 curls, pause at the top, lower slowly. No swing.</span>"},
{k:"D",name:"腹",gear:"墊／單機",cue:"呼氣「嗤」同時腰圍收緊。死蟲左右各 8、側平板每邊 20 秒或提膝。腰唔拱。唔好真打肚。<br><span class=en>Hiss out and brace 360°. Dead bug 8/side or side plank 20s. Nobody punches the belly.</span>"},
{k:"E",name:"大腿",gear:"啞鈴／空地",cue:"超哥深蹲：腳與肩同寬，膝跟腳尖，蹲到大腿近水平。再保加利亞或分腿蹲 8–12 下。<br><span class=en>Squat near parallel, knees track toes. Then Bulgarian or split squat 8–12.</span>"}
];
var NEED=3,doneCount={A:0,B:0,C:0,D:0,E:0};
function finishedCount(){return doneCount.A+doneCount.B+doneCount.C+doneCount.D+doneCount.E;}
function rest(s,cue){return {label:"休息",seconds:s,kind:"rest",cue:cue||"行兩步，鼻吸口呼，唔好坐低。鐘響自動接。<br><span class=en>Walk two steps. Stay standing. The bell starts the next block.</span>",gear:"原地"};}
function lomaFirst(id,theme){
  var s=SK[id];
  return [
    {label:"進入 · 彈跳架勢",seconds:90,kind:"warmup",cue:"腳掌輕彈，肩放鬆。重心中間，隨時可側移。洛馬：企穩先至出拳。<br><span class=en>Soft bounce. Shoulders down. Weight centred. Stance first, punches second.</span>",gear:"空地"},
    {label:"技術 · "+s.name,seconds:150,kind:"skill",cue:s.cue,gear:"空地／鏡前"},
    rest(20),
    {label:"應用 1 · "+s.name,seconds:100,kind:"work",cue:theme.a1,gear:"空地"},
    rest(20),
    {label:"應用 2 · "+s.name,seconds:100,kind:"work",cue:theme.a2,gear:"空地"},
    rest(20),
    {label:"應用 3 · "+s.name,seconds:100,kind:"work",cue:theme.a3,gear:"空地"},
    rest(20),
    {label:"角度",seconds:90,kind:"work",cue:theme.angle,gear:"空地"},
    rest(20),
    {label:"刺拳付費",seconds:90,kind:"work",cue:theme.jab,gear:"空地"},
    rest(20),
    {label:"Flow 收工",seconds:60,kind:"work",cue:theme.flow,gear:"空地"}
  ];
}
function sculpt(){
  var out=[];
  for(var n=1;n<=15;n++){
    out.push({label:"塑形 "+n+"/15",seconds:45,kind:"mc",set:n,pick:null,cue:"擦 A–E。各 3 組。<br><span class=en>Pick A–E. Three sets each.</span>",gear:"撿空位"});
    out.push(rest(15));
  }
  return out;
}
function dayOf(){
  var w=new Date().toLocaleString("en-US",{timeZone:"Asia/Hong_Kong",weekday:"short"}).slice(0,3);
  return {Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}[w]||0;
}
function program(wd){
  var sc=sculpt();
  var days={
    1:{name:"洛馬 · 滑步",blocks:lomaFirst("shuffle",{a1:"向前碎滑兩小步就停，頭唔點。停半拍先刺。<br><span class=en>Two tiny shuffles forward. Head still. Pause, then jab.</span>",a2:"向後碎滑兩步，前腳尖仍對人。<br><span class=en>Two shuffles back. Lead toe still at them.</span>",a3:"快兩步慢兩步。場地擠就細步。<br><span class=en>Quick-quick, slow-slow. Smaller if the floor is busy.</span>",angle:"向外側半步，唔直線退。<br><span class=en>Half-step outside. Never straight back.</span>",jab:"滑完先刺，刺完側步。<br><span class=en>Move, jab, then step off centre.</span>",flow:"輕滑，保持可出手。<br><span class=en>Easy shuffle. Stay ready.</span>"}).concat(sc)},
    2:{name:"洛馬 · Pivot",blocks:lomaFirst("pivot",{a1:"前腳為軸轉 45 度。轉完踏實先出手。<br><span class=en>Pivot 45°. Plant before you punch.</span>",a2:"同軸轉另一邊。眼跟對手。<br><span class=en>Same pivot the other way. Eyes up.</span>",a3:"轉完還原再轉。幅度細都算。<br><span class=en>Reset, then the other side. A small arc counts.</span>",angle:"轉去外側，令對直線打空。<br><span class=en>Pivot off their straight so the shot misses.</span>",jab:"腳停穩先刺，回收要快。<br><span class=en>Feet land, then jab. Snap back faster than you punch.</span>",flow:"慢轉兩次。平衡優先。<br><span class=en>Two slow pivots. Balance first.</span>"}).concat(sc)},
    3:{name:"洛馬 · 架勢",blocks:lomaFirst("stance",{a1:"前腳外側，膝微曲，可蹭地離開。<br><span class=en>Lead foot outside. Soft knees. You can push off.</span>",a2:"重量前後搬，後膝唔鎖。<br><span class=en>Shift weight front to back. Rear knee unlocked.</span>",a3:"頭離中線，腳先細步。<br><span class=en>Slip the head off centre. Feet move first.</span>",angle:"前腳外側半步，腰唔埆。<br><span class=en>Half-step outside. Spine long.</span>",jab:"架勢穩先刺，打完可走。<br><span class=en>Settle, jab, return to a mobile base.</span>",flow:"企鬆，腳保持彈簧。<br><span class=en>Stay loose. Keep spring in the feet.</span>"}).concat(sc)},
    4:{name:"洛馬 · 環繞",blocks:lomaFirst("ring",{a1:"沿弧走，約 3 秒改快慢。唔直線退。<br><span class=en>Walk an arc. Change pace every 3s. No straight retreat.</span>",a2:"行去弱手外側。刺一下買入場。<br><span class=en>Move to the weak-hand side. Jab only pays entry.</span>",a3:"快兩步慢兩步。頭平、落地靜。<br><span class=en>Quick-quick, slow-slow. Quiet feet.</span>",angle:"走半圈就停，再轉或出手。<br><span class=en>Half a circle, then stop.</span>",jab:"行緊可以刺，腳唔釘死。<br><span class=en>Jab while moving. Do not nail the feet.</span>",flow:"輕走弧收工。<br><span class=en>Easy circle to close.</span>"}).concat(sc)},
    5:{name:"洛馬 · 刺拳",blocks:lomaFirst("jab",{a1:"肩帶拳出去，打完即收。<br><span class=en>Shoulder, fist, home.</span>",a2:"1–2 之後即側步，唔企原位。<br><span class=en>One-two, then sidestep.</span>",a3:"先半刺騙重心，再真刺。<br><span class=en>Feint half-jab, then a real one.</span>",angle:"刺完向外側一步。<br><span class=en>After the jab, step outside.</span>",jab:"連刺三下，每下回收。<br><span class=en>Three jabs, each snapped back.</span>",flow:"輕刺保持節奏。<br><span class=en>Easy jab rhythm.</span>"}).concat(sc)},
    6:{name:"洛馬 · 移動",blocks:lomaFirst("jab",{a1:"先滑後刺，打完再滑。<br><span class=en>Shuffle, jab, move again.</span>",a2:"微 Pivot 停穩先刺。<br><span class=en>Tiny pivot, plant, then jab.</span>",a3:"環繞兩步，刺一下離開。<br><span class=en>Two circle steps, one jab, off.</span>",angle:"外側腳 → 轉角 → 停。<br><span class=en>Outside foot, turn, freeze.</span>",jab:"行住刺，回收同時側步。<br><span class=en>Jab on the move and sidestep home.</span>",flow:"三種步各一次，輕。<br><span class=en>Shuffle, pivot, circle. All light.</span>"}).concat(sc)},
    0:{name:"洛馬 · 恢復",blocks:lomaFirst("stance",{a1:"慢鏡對位，今日唔求快。<br><span class=en>Slow mirror check. Accuracy only.</span>",a2:"慢滑兩步，呼吸拉長。<br><span class=en>Two slow shuffles. Long breath.</span>",a3:"慢 Pivot 45 度。唔催。<br><span class=en>Unrushed 45° pivot.</span>",angle:"輕走弧，講話速度。<br><span class=en>Easy circle at talking pace.</span>",jab:"極輕刺，活動肩肘。<br><span class=en>Feather jab to free the shoulder.</span>",flow:"鼻吸 4 口呼 6。<br><span class=en>Nose 4, mouth 6.</span>"}).concat(sc)}
  };
  return days[wd]||days[4];
}
function fmt(sec){var m=Math.floor(sec/60),s=sec%60;return (m<10?"0":"")+m+":"+(s<10?"0":"")+s;}
function dotsHtml(){var h="";for(var i=0;i<PARTS.length;i++){var p=PARTS[i],n=doneCount[p.k]||0;h+="<span class='"+(n>=NEED?"full":"")+"'>"+p.k+p.name+" "+n+"/"+NEED+"</span>";}return "<div class='dots'>"+h+"</div>";}
var day=program(dayOf()),i=0,left=day.blocks[0].seconds,run=false,done=false,timer=null;
function waitingPick(b){return b&&b.kind==="mc"&&!b.pick;}
function total(){return day.blocks.reduce(function(a,b){return a+b.seconds;},0);}
function elapsed(){var e=0;for(var x=0;x<i;x++)e+=day.blocks[x].seconds;return e+(day.blocks[i]?day.blocks[i].seconds-left:0);}
function enterBlock(){var b=day.blocks[i];left=b.seconds;if(waitingPick(b)){run=false;if(timer){clearInterval(timer);timer=null;}return;}bell();run=true;if(!timer)timer=setInterval(tick,1000);}
function finishBlock(){bell();if(i+1>=day.blocks.length){done=true;run=false;if(timer){clearInterval(timer);timer=null;}render();return;}i+=1;enterBlock();render();}
function tick(){if(!run||done)return;if(waitingPick(day.blocks[i]))return;left-=1;if(left<=0){finishBlock();return;}render();}
function startClock(){var b=day.blocks[i];if(waitingPick(b))return;run=true;if(!timer)timer=setInterval(tick,1000);}
function bind(){
  var go=document.getElementById("go");
  if(go) go.onclick=function(){unlockAudio();if(waitingPick(day.blocks[i]))return;if(run){run=false;if(timer){clearInterval(timer);timer=null;}}else startClock();render();};
  var sk=document.getElementById("skip"); if(sk) sk.onclick=function(){unlockAudio();finishBlock();};
  var st=document.getElementById("stop"); if(st) st.onclick=function(){location.href="/yipmma/?v=mc41";};
}
function render(){
  var el=document.getElementById("app");
  if(done){el.innerHTML="<h1>完成</h1>"+dotsHtml()+"<p class='cue'>跟住食南瓜小米粥。</p><p class='tally'><a href='/yipmma/?v=mc41'>返回今日</a></p>";return;}
  var b=day.blocks[i],pct=Math.min(100,Math.round(elapsed()/total()*100));
  var nxt=day.blocks[i+1];
  var head="<div class='top'><a href='/yipmma/?v=mc41'>離開</a><span>"+pct+"%</span></div><div class='bar'><i style='width:"+pct+"%'></i></div>";
  var controls="<div class='btns'><button class='icon pri' id='go'>"+(run?"暫停":"Keep")+"</button><button class='icon' id='skip'>▶▶</button><button class='icon' id='stop'>■</button></div>"+(nxt?"<p class='next'>下一段："+nxt.label+"</p>":"");
  if(waitingPick(b)){
    var opts="";
    for(var o=0;o<PARTS.length;o++){
      var op=PARTS[o],n=doneCount[op.k]||0,full=n>=NEED;
      opts+="<button type='button' data-k='"+op.k+"'"+(full?" disabled":"")+"><b>"+op.k+"</b> "+op.name+" · "+n+"/"+NEED+"<small>"+op.cue+"</small></button>";
    }
    el.innerHTML=head+dotsHtml()+"<p class='kicker'>SCULPT</p><h1>第 "+b.set+" 組</h1><p class='cue'>擦未滿 3 組嘅項目。撲完鐘響，做 45 秒。<br><span class=en>Tap a lift still under 3 sets. Bell, then 45 seconds.</span></p><div class='mc' id='mc'>"+opts+"</div>"+controls;
    document.getElementById("mc").onclick=function(ev){
      var btn=ev.target.closest("button"); if(!btn||btn.disabled)return;
      var k=btn.getAttribute("data-k"),part=null;
      for(var z=0;z<PARTS.length;z++) if(PARTS[z].k===k) part=PARTS[z];
      if(!part||doneCount[k]>=NEED)return;
      doneCount[k]+=1;b.pick=part;left=b.seconds;bell();startClock();render();
    };
    bind();return;
  }
  var title=b.label,gear=b.gear,cue=b.cue;
  if(b.kind==="mc"&&b.pick){title=b.pick.k+" · "+b.pick.name+" "+doneCount[b.pick.k]+"/"+NEED;gear=b.pick.gear;cue=b.pick.cue;}
  el.innerHTML=head+(b.kind==="mc"?dotsHtml():"")+"<p class='kicker'>"+gear+"</p><h1>"+title+"</h1><p class='clock'>"+fmt(left)+"</p><p class='cue'>"+cue+"</p>"+controls;
  bind();
}
render();
if(!waitingPick(day.blocks[0])) startClock();
document.addEventListener("pointerdown",unlockAudio,true);
