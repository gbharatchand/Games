'use strict';
/* ================= Constants & geometry (tested) ================= */
const HEX_SIZE = 60;
const RES = ['wood','brick','sheep','wheat','ore'];
const RES_ICON = { wood:'🪵', brick:'🧱', sheep:'🐑', wheat:'🌾', ore:'⛰️' };
const RES_NAME = { wood:'Wood', brick:'Brick', sheep:'Sheep', wheat:'Wheat', ore:'Ore' };
const TERRAIN = {
  wood:  { color:'#3a8a4a', res:'wood',  icon:'🌲' },
  wheat: { color:'#d9a83c', res:'wheat', icon:'🌾' },
  sheep: { color:'#8fd18a', res:'sheep', icon:'🐑' },
  brick: { color:'#b5542d', res:'brick', icon:'🧱' },
  ore:   { color:'#7d8590', res:'ore',   icon:'⛰️' },
  desert:{ color:'#e0cf9e', res:null,    icon:'🏜️' },
  sea:   { color:'#a3d2f2', res:null,    icon:'' },
  gold:  { color:'#e8b93c', res:'gold',  icon:'🪙' },
};
const FOG_T = { color:'#93a5b1', icon:'🌫️' }; // hidden tile (Seafarers fog islands)
const COSTS = {
  road:      { brick:1, wood:1 },
  ship:      { wood:1, sheep:1 },
  settlement:{ brick:1, wood:1, sheep:1, wheat:1 },
  city:      { wheat:2, ore:3 },
};
const DEV_COST = { wheat:1, sheep:1, ore:1 };
const DEV_INFO = {
  knight:  { icon:'🕵️', name:'Knight' },
  vp:      { icon:'🏆', name:'Victory Point' },
  road:    { icon:'🛣️', name:'Road Building' },
  plenty:  { icon:'🌾', name:'Year of Plenty' },
  monopoly:{ icon:'👑', name:'Monopoly' },
};
function buildDevDeck(){
  const d=[];
  for(let i=0;i<14;i++) d.push('knight');
  for(let i=0;i<5;i++) d.push('vp');
  for(let i=0;i<2;i++){ d.push('road'); d.push('plenty'); d.push('monopoly'); }
  return shuffle(d);
}
const PLAYER_COLORS = [
  { name:'Red',    color:'#e74c3c' },
  { name:'Blue',   color:'#3498db' },
  { name:'Orange', color:'#f39c12' },
  { name:'White',  color:'#f5f5f5' },
];
const WIN_VP = 10;
const PEER_PREFIX = 'familycatan-v1-';

function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function vKey(x,y){ return Math.round(x)+','+Math.round(y); }
function edgeKey(a,b){ return a<b ? a+'|'+b : b+'|'+a; }
function hexCenter(q,r){ return { x: HEX_SIZE*Math.sqrt(3)*(q+r/2), y: HEX_SIZE*1.5*r }; }
function hexCorners(cx,cy){
  const p=[];
  for(let i=0;i<6;i++){ const a=Math.PI/180*(60*i-30); p.push({x:cx+HEX_SIZE*Math.cos(a), y:cy+HEX_SIZE*Math.sin(a)}); }
  return p;
}
function makeCode(){ const c='ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s=''; for(let i=0;i<4;i++) s+=c[Math.floor(Math.random()*c.length)]; return s; }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ================= Board data (tested) ================= */
function buildBoardData(variant){
  const seaMode = variant==='sea';
  let cells; // [{q,r,land}]
  let terrains, numbers;
  if(seaMode){
    // Seafarers "Heading for New Shores": a big main island + 4 outer islands in a sea frame
    const LAND=[
      [0,0],[1,0],[2,0],[-1,1],[0,1],[1,1],[2,1],[-2,2],[-1,2],[0,2],[1,2],[2,2],[-2,3],[-1,3],[0,3],[1,3],[-2,4],[-1,4],[0,4], // main island (19)
      [4,0],[5,0],[4,1],[5,1],   // island B (4)
      [4,4],[5,4],[4,5],[5,5],   // island C (4)
      [1,6],[2,6],[2,7],         // island D (3)
      [5,-2],[6,-2],             // island E (2)
    ];
    const landSet=new Set(LAND.map(c=>c[0]+','+c[1]));
    const seaSet=new Set();
    const DIRS=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
    LAND.forEach(([q,r])=>DIRS.forEach(([dq,dr])=>{ const k=(q+dq)+','+(r+dr); if(!landSet.has(k)) seaSet.add(k); }));
    cells=LAND.map(([q,r])=>({q,r,land:true}));
    [...seaSet].forEach(k=>{ const [q,r]=k.split(',').map(Number); cells.push({q,r,land:false}); });
    terrains=shuffle(['wood','wood','wood','wood','wood','wood','wood','wheat','wheat','wheat','wheat','wheat','wheat','wheat','sheep','sheep','sheep','sheep','sheep','sheep','brick','brick','brick','brick','brick','ore','ore','ore','ore','ore','ore','desert']);
    numbers=shuffle([2,3,3,3,4,4,5,5,5,6,6,8,8,9,9,9,10,10,11,11,12,2,3,4,5,6,8,9,10,11,12]);
  }else{
    // Classic, large board: full radius-3 island (37 hexes)
    const rows=[{r:0,qs:[0,1,2,3]},{r:1,qs:[-1,0,1,2,3]},{r:2,qs:[-2,-1,0,1,2,3]},{r:3,qs:[-3,-2,-1,0,1,2,3]},{r:4,qs:[-3,-2,-1,0,1,2]},{r:5,qs:[-3,-2,-1,0,1]},{r:6,qs:[-3,-2,-1,0]}];
    cells=[];
    rows.forEach(row=>row.qs.forEach(q=>cells.push({q:q, r:row.r, land:true})));
    terrains=shuffle(['wood','wood','wood','wood','wood','wood','wood','wood','wheat','wheat','wheat','wheat','wheat','wheat','wheat','wheat','sheep','sheep','sheep','sheep','sheep','sheep','sheep','sheep','brick','brick','brick','brick','brick','ore','ore','ore','ore','ore','ore','desert','desert']);
    numbers=shuffle([2,2,3,3,3,3,4,4,4,4,5,5,5,5,6,6,6,6,8,8,8,9,9,9,9,10,10,10,10,11,11,11,11,12,12]);
  }
  // ---- Spread placement --------------------------------------------------
  // A plain shuffle clumps: three wheat in a row, the same number side by side,
  // 6 next to 8. Instead: shuffle, then hill-climb swaps against an adjacency
  // cost until resources and numbers come out well spread (best effort, capped).
  const DIRS6=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
  const landCells=[]; cells.forEach((c,i)=>{ if(c.land) landCells.push(i); });
  const landPosOf=new Map(landCells.map((ci,k)=>[ci,k]));
  const cellByKey=new Map(cells.map((c,i)=>[c.q+','+c.r, i]));
  const landPairs=[];
  landCells.forEach(ci=>{
    const c=cells[ci];
    DIRS6.forEach(([dq,dr])=>{
      const cj=cellByKey.get((c.q+dq)+','+(c.r+dr));
      if(cj!==undefined&&cj>ci&&landPosOf.has(cj)) landPairs.push([landPosOf.get(ci), landPosOf.get(cj)]);
    });
  });
  const pipsOf=n=>n==null?0:(n<=7?n-1:13-n);
  function spread(items, pairs, pairCost){
    const costOf=a=>pairs.reduce((s,pr)=>s+pairCost(a[pr[0]],a[pr[1]]),0);
    let best=null, bestCost=Infinity;
    for(let attempt=0; attempt<6&&bestCost>0; attempt++){
      const cur=shuffle(items.slice());
      let curCost=costOf(cur), b=cur.slice(), bc=curCost;
      for(let iter=0; iter<10000&&bc>0; iter++){
        const i=Math.floor(Math.random()*cur.length), j=Math.floor(Math.random()*cur.length);
        if(i===j||cur[i]===cur[j]) continue;
        const t=cur[i]; cur[i]=cur[j]; cur[j]=t;
        const c=costOf(cur);
        if(c<=curCost){ curCost=c; if(c<bc){ b=cur.slice(); bc=c; } }
        else { const t2=cur[i]; cur[i]=cur[j]; cur[j]=t2; }
      }
      if(bc<bestCost){ best=b; bestCost=bc; }
    }
    return best;
  }
  const tAssign=spread(terrains, landPairs, (a,b)=>a===b?3:0);
  const numKs=landCells.map((ci,k)=>k).filter(k=>tAssign[k]!=='desert');
  const nPosOf=new Map(numKs.map((k,n)=>[k,n]));
  const nPairs=landPairs.filter(pr=>nPosOf.has(pr[0])&&nPosOf.has(pr[1])).map(pr=>[nPosOf.get(pr[0]), nPosOf.get(pr[1])]);
  const nAssign=spread(numbers, nPairs, (a,b)=>{
    let c=0;
    if(a===b) c+=20;                                  // same number side by side
    if((a===6||a===8)&&(b===6||b===8)) c+=50;        // red numbers never touch
    if(pipsOf(a)>=4&&pipsOf(b)>=4) c+=1;              // hot numbers not clustered
    return c;
  });
  const tByCell=new Map(), nByCell=new Map();
  landCells.forEach((ci,k)=>tByCell.set(ci, tAssign[k]));
  numKs.forEach((k,n)=>nByCell.set(landCells[k], nAssign[n]));
  const hexes=[]; let id=0;
  cells.forEach((c,ci)=>{
    if(!c.land){ hexes.push({ id:id, q:c.q, r:c.r, terrain:'sea', number:null, island:-1, fog:false }); id++; return; }
    const t=tByCell.get(ci);
    hexes.push({ id:id, q:c.q, r:c.r, terrain:t, number: t==='desert'?null:nByCell.get(ci), island:0, fog:false });
    id++;
  });
  // ---- Islands: flood-fill land hexes by axial edge-adjacency; biggest = main island ----
  let mainIsland=0;
  if(seaMode){
    const landByKey={};
    hexes.forEach(h=>{ if(h.terrain!=='sea') landByKey[h.q+','+h.r]=h; });
    const DIRS=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
    let isl=0; const sizes={};
    const seen=new Set();
    hexes.forEach(h=>{
      if(h.terrain==='sea'||seen.has(h.id)) return;
      const queue=[h]; seen.add(h.id); let size=0;
      while(queue.length){
        const c=queue.pop(); c.island=isl; size++;
        DIRS.forEach(([dq,dr])=>{ const n=landByKey[(c.q+dq)+','+(c.r+dr)]; if(n&&!seen.has(n.id)){ seen.add(n.id); queue.push(n); } });
      }
      sizes[isl]=size; isl++;
    });
    mainIsland=+Object.keys(sizes).sort((a,b)=>sizes[b]-sizes[a])[0];
    // the desert (and the robber) belong on the main island — swap if it landed elsewhere.
    // Pick the host so the moved number/terrain creates no new clumps (the spread
    // optimizer ran before this swap, so a blind swap could park a red next to a red).
    const des=hexes.find(h=>h.terrain==='desert');
    if(des&&des.island!==mainIsland){
      const byK={}; hexes.forEach(h=>byK[h.q+','+h.r]=h);
      const dnbrs=DIRS.map(([dq,dr])=>byK[(des.q+dq)+','+(des.r+dr)]).filter(n=>n&&n.terrain!=='sea');
      const badness=host=>{ let bad=0; const n=host.number;
        dnbrs.forEach(x=>{ if(x.terrain==='sheep') bad+=2; if(n!==null&&x.number===n) bad+=3; if((n===6||n===8)&&(x.number===6||x.number===8)) bad+=6; });
        return bad; };
      const cands=hexes.filter(h=>h.island===mainIsland&&h.terrain!=='desert');
      const host=cands.find(h=>h.terrain==='sheep'&&badness(h)===0)||cands.find(h=>badness(h)===0)
        ||cands.filter(h=>h.terrain==='sheep').sort((a,b)=>badness(a)-badness(b))[0]||cands[0];
      if(host){ host.terrain='desert'; const n=host.number; host.number=null; des.terrain='sheep'; des.number=n; }
    }
    // Gold fields: one hex on each of two foreign islands becomes gold (pays any resource)
    const byIsl={};
    hexes.forEach(h=>{ if(h.terrain!=='sea'&&h.terrain!=='desert'&&h.island!==mainIsland){ (byIsl[h.island]=byIsl[h.island]||[]).push(h); } });
    shuffle(Object.keys(byIsl)).slice(0,2).forEach(id=>{
      const cands=byIsl[id]; const h=cands[Math.floor(Math.random()*cands.length)];
      if(h) h.terrain='gold';
    });
    // Fog of discovery: every foreign-island land hex starts hidden. Building a
    // road, ship or settlement next to one flips it face-up (see revealFog).
    hexes.forEach(h=>{ if(h.terrain!=='sea'&&h.island!==mainIsland) h.fog=true; });
  }
  const vertices={}, edges={};
  hexes.forEach(h=>{
    const c=hexCenter(h.q,h.r), corners=hexCorners(c.x,c.y);
    const vks=corners.map(p=>vKey(p.x,p.y));
    vks.forEach((k,i)=>{
      if(!vertices[k]) vertices[k]={ key:k, x:corners[i].x, y:corners[i].y, hexes:[], owner:-1, kind:null, neighbors:[] };
      vertices[k].hexes.push(h.id);
    });
    for(let i=0;i<6;i++){
      const a=vks[i], b=vks[(i+1)%6], ek=edgeKey(a,b);
      if(!edges[ek]) edges[ek]={ key:ek, a:a, b:b, owner:-1 };
      if(!vertices[a].neighbors.includes(b)) vertices[a].neighbors.push(b);
      if(!vertices[b].neighbors.includes(a)) vertices[b].neighbors.push(a);
    }
  });
  const robberHex = hexes.find(h=>h.terrain==='desert').id;
  // ---- Ports: coastal vertices, evenly spaced by angle, 2:1 rates ----
  const boardCx = hexes.reduce((s,h)=>{ const c=hexCenter(h.q,h.r); return { x:s.x+c.x/hexes.length, y:s.y+c.y/hexes.length }; },{x:0,y:0});
  let ports;
  if(seaMode){
    // Seafarers: 5 ports (one per resource) on vertices touching both land and sea
    const coastalV = Object.values(vertices).filter(v=>{
      const ts=v.hexes.map(hid=>hexes[hid].terrain);
      return ts.some(t=>t!=='sea') && ts.some(t=>t==='sea');
    }).sort((a,b)=>Math.atan2(a.y-boardCx.y,a.x-boardCx.x)-Math.atan2(b.y-boardCx.y,b.x-boardCx.x));
    const portRes = shuffle(['brick','wood','wheat','ore','sheep']);
    ports = [];
    for(let i=0;i<5 && coastalV.length;i++){
      const v = coastalV[Math.floor(i*coastalV.length/5)%coastalV.length];
      if(!ports.some(p=>p.vertex===v.key)) ports.push({ vertex:v.key, res:portRes[i%portRes.length] });
    }
  }else{
    const coastal = Object.values(vertices).filter(v=>v.hexes.length<=2)
      .sort((a,b)=>Math.atan2(a.y-boardCx.y,a.x-boardCx.x)-Math.atan2(b.y-boardCx.y,b.x-boardCx.x));
    const portRes = shuffle(['brick','wood','wheat','ore','sheep']);
    ports = [];
    for(let i=0;i<5 && coastal.length;i++){
      const v = coastal[Math.floor(i*coastal.length/5)%coastal.length];
      if(!ports.some(p=>p.vertex===v.key)) ports.push({ vertex:v.key, res:portRes[i%portRes.length] });
    }
  }
  return { hexes, vertices, edges, robberHex, ports, boardCx, mainIsland };
}
function portRate(pi,res){
  // 2:1 if the player owns a settlement/city on a matching port, else 4:1
  if(!S||!S.ports) return 4;
  for(const pt of S.ports){
    const v=S.vertices[pt.vertex];
    if(v&&v.owner===pi&&pt.res===res) return 2;
  }
  return 4;
}

/* ================= Game state ================= */
let S=null;
function newGame(playerNames,botFlags,variant){
  clearSave();
  lastDeckSize=-1;
  const b=buildBoardData(variant);
  S={
    gid: Date.now()+'-'+Math.floor(Math.random()*1e9),
    hexes:b.hexes, vertices:b.vertices, edges:b.edges, robberHex:b.robberHex,
    ports:b.ports, boardCx:b.boardCx, devDeck:buildDevDeck(),
    variant: variant==='sea'?'sea':'classic',
    mainIsland: b.mainIsland||0,
    winVP: variant==='sea'?13:10,
    chitAt:{},
    pirateHex:-1, movingPirate:false, shipMoved:false, goldQueue:[],
    players: playerNames.map((n,i)=>({
      name:n||('Player '+(i+1)), color:PLAYER_COLORS[i].color,
      res:{wood:0,brick:0,sheep:0,wheat:0,ore:0}, dev:[],
      longest:0, hasLongest:false, knights:0, hasLargestArmy:false, dc:false,
      chitVP:0, islandsWon:[],
    })),
    turn:0, phase:'setup', dice:[1,1], rolled:false,
    setupQueue:[], setupIdx:0, setupSub:'settlement', setupVertex:null,
    mode:null, freeRoads:0, discardQueue:[], pending:null, offer:null,
    log:[], winner:-1,
    bots:playerNames.map((_,i)=>!!(botFlags&&botFlags[i])),
  };
  const n=S.players.length;
  for(let i=0;i<n;i++) S.setupQueue.push(i);
  for(let i=n-1;i>=0;i--) S.setupQueue.push(i);
  S.turn=S.setupQueue[0]; S.mode='setupSettlement';
  addLog('Game started! '+n+' players. Place your first settlement + road.');
}
function cur(){ return S.players[S.turn]; }
function totalCards(p){ return RES.reduce((s,r)=>s+p.res[r],0); }
function vp(p){
  const i=S.players.indexOf(p);
  let v=0;
  for(const k in S.vertices){ const vtx=S.vertices[k]; if(vtx.owner===i) v+= vtx.kind==='city'?2:1; }
  if(p.hasLongest) v+=2;
  if(p.hasLargestArmy) v+=2;
  if(p.chitVP) v+=p.chitVP;
  if(p.dev) v+=p.dev.filter(c=>c.t==='vp').length;
  return v;
}
function canAfford(p,cost){ return Object.keys(cost).every(r=>p.res[r]>=cost[r]); }
function payCost(p,cost){ Object.keys(cost).forEach(r=>{ p.res[r]-=cost[r]; }); }
function giveRes(p,res,n){ p.res[res]+=n; }
function addLog(msg){
  S.log.unshift(msg);
  if(S.log.length>40) S.log.pop();
  if(typeof document!=='undefined') renderLog();
}

/* ================= Save / resume (survives app switching) ================= */
const SAVE_KEY='familycatan-save-v1';
function saveGame(){
  if(typeof localStorage==='undefined'||!S) return;
  if(S.phase==='gameover'){ clearSave(); return; }
  if(NET.mode==='online'&&NET.isHost) return; // host room dies with the page
  try{
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      v:1, savedAt:Date.now(), S:serializeState(),
      net:{mode:NET.mode, isHost:!!NET.isHost, myIdx:NET.myIdx, myName:NET.myName, code:NET.code}
    }));
  }catch(e){}
}
function loadSave(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);
    if(!raw) return null;
    const d=JSON.parse(raw);
    if(!d||d.v!==1||!d.S||!d.S.players||!d.S.players.length) return null;
    if(Date.now()-d.savedAt>24*3600*1000) return null;
    return d;
  }catch(e){ return null; }
}
function clearSave(){ try{ localStorage.removeItem(SAVE_KEY); }catch(e){} }
function resumeLocal(save){
  closeOverlay();
  S=save.S;
  NET.mode='local'; NET.myIdx=0; NET.isHost=false;
  NET.myName=(save.net&&save.net.myName)||'Player';
  NET.code=null; NET.started=true; NET.lobbyPlayers=[];
  BOT.busy=false; BOT.turn=-1; BOT.n=0;
  shownPrompt=null;
  setNetStatus('resumed','on');
  if(S.discardQueue&&S.discardQueue.length){ processDiscard(); }
  processGold();
  setHint('Welcome back — continue your game.');
  refresh(); renderPrompts(); maybeBot();
}

/* ================= Network layer ================= */
const NET = {
  mode:null,        // 'local' | 'online'
  isHost:false,
  myIdx:0,          // my player index (online)
  myName:'',
  code:null,
  peer:null,
  conns:{},         // host: idx -> connection
  hostConn:null,    // guest: connection to host
  lobbyPlayers:[],  // [{name,color}]
  started:false,
};
function isLocalPlayer(i){ return NET.mode==='local' || (NET.isHost && i===NET.myIdx); }
function canActAs(i){ return NET.mode==='local' || i===NET.myIdx; }
function myTurn(){ return S && S.turn===NET.myIdx; }
function setNetStatus(txt, cls){ const d=$('netDot'), t=$('netText'); if(d){d.className=cls||'';} if(t){t.textContent=txt;} }

function netSync(){
  if(NET.mode!=='online'||!NET.isHost) return;
  const msg={t:'state', s:S};
  for(const idx in NET.conns){
    try{ NET.conns[idx].send(msg); }catch(e){}
  }
}
function netSend(msg){
  if(NET.hostConn && NET.hostConn.open){ NET.hostConn.send(msg); }
}
function serializeState(){ return JSON.parse(JSON.stringify(S)); }

/* ---- Host: create room ---- */
function hostRoom(name){
  return new Promise((resolve,reject)=>{
    if(typeof Peer==='undefined'){ reject(new Error('network lib failed to load')); return; }
    const code=makeCode();
    const peer=new Peer(PEER_PREFIX+code, {debug:0});
    NET.peer=peer; NET.code=code; NET.isHost=true; NET.myIdx=0; NET.myName=name;
    NET.lobbyPlayers=[{name:name, color:PLAYER_COLORS[0].color}];
    peer.on('open',()=>{ setNetStatus('room '+code,'on'); resolve(code); });
    peer.on('error',e=>{ reject(e); });
    peer.on('connection',conn=>{
      conn.on('data',data=>hostOnData(conn,data));
      conn.on('close',()=>hostOnClose(conn));
      conn.on('open',()=>{ conn._name=null; });
    });
  });
}
function hostOnData(conn,data){
  if(data.t==='join'||data.t==='rejoin'){
    let name=String(data.name||'Player').slice(0,12)||'Player';
    let idx=NET.lobbyPlayers.findIndex(p=>p.name===name);
    if(data.t==='rejoin' && idx>=0){
      // rejoining existing player
      NET.conns[idx]=conn; conn._idx=idx;
      S.players[idx].dc=false;
      conn.send({t:'welcome', idx:idx, code:NET.code, rejoin:true});
      conn.send({t:'state', s:serializeState()});
      addLog('🔌 '+name+' reconnected.');
      netSync(); broadcastLobby();
      return;
    }
    if(NET.started){ conn.send({t:'denied', reason:'game already started'}); setTimeout(()=>conn.close(),500); return; }
    if(idx>=0){ name=name+' '+(Object.keys(NET.conns).length+1); }
    idx=NET.lobbyPlayers.length;
    if(idx>=4){ conn.send({t:'denied', reason:'room full'}); setTimeout(()=>conn.close(),500); return; }
    NET.lobbyPlayers.push({name:name, color:PLAYER_COLORS[idx].color});
    NET.conns[idx]=conn; conn._idx=idx; conn._name=name;
    conn.send({t:'welcome', idx:idx, code:NET.code});
    broadcastLobby();
  }
  else if(data.t==='act'){
    const idx=conn._idx;
    if(idx===undefined) return;
    hostApplyAct(idx, data.a);
  }
}
function hostOnClose(conn){
  const idx=conn._idx;
  if(idx===undefined||idx===0) return;
  delete NET.conns[idx];
  if(S && NET.started){
    S.players[idx].dc=true;
    addLog('⚠️ '+S.players[idx].name+' disconnected. They can rejoin with the room code.');
    netSync();
  }
  broadcastLobby();
}
function broadcastLobby(){
  const msg={t:'lobby', players:NET.lobbyPlayers, code:NET.code};
  for(const idx in NET.conns){ try{ NET.conns[idx].send(msg); }catch(e){} }
  renderLobby();
}

/* ---- Guest: join room ---- */
function joinRoom(code,name,isRejoin){
  return new Promise((resolve,reject)=>{
    if(typeof Peer==='undefined'){ reject(new Error('network lib failed to load')); return; }
    code=code.trim().toUpperCase();
    const peer=new Peer({debug:0});
    NET.peer=peer; NET.isHost=false; NET.myName=name;
    peer.on('open',()=>{
      const conn=peer.connect(PEER_PREFIX+code, {reliable:true});
      NET.hostConn=conn;
      conn.on('open',()=>{ conn.send({t:isRejoin?'rejoin':'join', name:name}); });
      conn.on('data',data=>guestOnData(data,resolve,reject,code));
      conn.on('close',()=>guestOnHostClose());
      conn.on('error',()=>{});
    });
    peer.on('error',e=>{
      if(e.type==='peer-unavailable') reject(new Error('room not found — check the code'));
      else reject(e);
    });
  });
}
function guestOnData(data,resolve,reject,code){
  if(data.t==='welcome'){
    NET.myIdx=data.idx; NET.code=data.code||code;
    NET.mode='online';
    setNetStatus('room '+NET.code,'on');
    resolve(data);
  }
  else if(data.t==='denied'){ reject(new Error(data.reason)); }
  else if(data.t==='lobby'){ NET.lobbyPlayers=data.players; renderLobby(); }
  else if(data.t==='state'){ onRemoteState(data.s); }
  else if(data.t==='end'){ showEnded(data.reason); }
}
function guestOnHostClose(){
  if(NET.mode==='online'&&!NET.isHost){
    setNetStatus('disconnected','off');
    showEnded('The host left the game.');
  }
}
function onRemoteState(s){
  const wasPhase=S&&S.phase;
  S=s;
  NET.started=true;
  closeLobbyIfOpen();
  refresh();
  renderPrompts();
  saveGame();
}
function showEnded(reason){
  overlay(`<h2>🔌 Game Over</h2><p>${escapeHtml(reason)}</p>
    <div class="btnrow"><button class="btn primary" id="endOk">OK</button></div>`)
    .querySelector('#endOk').onclick=()=>{ closeOverlay(); location.reload(); };
}

/* ================= Host action dispatcher ================= */
function hostApplyAct(idx,a){
  if(!S||S.phase==='gameover') return;
  const changed=applyAct(idx,a);
  if(changed){ afterChange(); }
}
function applyAct(idx,a){
  // returns true if state changed
  const p=S.players[idx];
  switch(a.kind){
    case 'roll':
      if(S.phase!=='play'||S.rolled||S.turn!==idx) return false;
      doRoll(); return true;
    case 'endTurn':
      if(S.phase!=='play'||!S.rolled||S.turn!==idx) return false;
      doEndTurn(); return true;
    case 'setupSettlement':{
      if(S.phase!=='setup'||S.turn!==idx||S.setupSub!=='settlement') return false;
      const v=S.vertices[a.key];
      if(!v||!setupVertexValid(v,idx)) return false;
      v.owner=idx; v.kind='settlement'; S.setupVertex=a.key; S.setupSub='road'; S.mode='setupRoad';
      addLog(`🏠 ${p.name} placed a settlement.`);
      return true;
    }
    case 'setupRoad':{
      if(S.phase!=='setup'||S.turn!==idx||S.setupSub!=='road') return false;
      const e=S.edges[a.key];
      if(!e||e.owner!==-1) return false;
      if(!(e.a===S.setupVertex||e.b===S.setupVertex)) return false;
      if(S.variant==='sea'&&!edgeBordersLand(e)) return false;
      e.owner=idx; e.kind='road';
      addLog(`🛣️ ${p.name} placed a road.`);
      const round2=S.setupIdx>=S.players.length;
      if(round2){
        const v=S.vertices[S.setupVertex];
        v.hexes.forEach(hid=>{ const h=S.hexes[hid], res=TERRAIN[h.terrain].res; if(res&&res!=='gold') giveRes(p,res,1); });
        addLog(`🎁 ${p.name} collects starting resources.`);
      }
      S.setupIdx++; S.setupVertex=null;
      if(S.setupIdx>=S.setupQueue.length){
        S.phase='play'; S.turn=S.setupQueue[0]; S.rolled=false; S.mode=null;
        addLog('Setup done! Game begins.');
      }else{
        S.turn=S.setupQueue[S.setupIdx]; S.setupSub='settlement'; S.mode='setupSettlement';
      }
      return true;
    }
    case 'place':{
      if(S.phase!=='play'||S.turn!==idx) return false;
      if(a.what==='road'){
        const e=S.edges[a.key];
        const free=S.freeRoads>0;
        if(!e||e.owner!==-1) return false;
        if(!free&&!canAfford(p,COSTS.road)) return false;
        if(!roadValid(e,idx)) return false;
        if(free) S.freeRoads--; else payCost(p,COSTS.road);
        e.owner=idx; e.kind='road';
        addLog(`🛣️ ${p.name} built a road${free?' (Road Building)':''}.`);
      }else if(a.what==='ship'){
        const e=S.edges[a.key];
        if(!e||e.owner!==-1) return false;
        if(!canAfford(p,COSTS.ship)) return false;
        if(!shipValid(e,idx)) return false;
        payCost(p,COSTS.ship);
        e.owner=idx; e.kind='ship';
        addLog(`⛵ ${p.name} built a ship.`);
      }else if(a.what==='settlement'){
        const v=S.vertices[a.key];
        if(!v||!canAfford(p,COSTS.settlement)||!settleValid(v,idx)) return false;
        payCost(p,COSTS.settlement); v.owner=idx; v.kind='settlement';
        addLog(`🏠 ${p.name} built a settlement.`);
        if(S.variant==='sea'){
          // Seafarers island bonus: +2 VP for your first settlement on each new island
          for(const isl of vertexIslands(v)){
            if(isl!==S.mainIsland&&!(p.islandsWon||[]).includes(isl)){
              p.islandsWon.push(isl); p.chitVP=(p.chitVP||0)+2; S.chitAt[a.key]=idx;
              addLog(`⭐ ${p.name} discovered a new island! +2 VP`);
            }
          }
        }
      }else if(a.what==='city'){
        const v=S.vertices[a.key];
        if(!v||v.owner!==idx||v.kind!=='settlement'||!canAfford(p,COSTS.city)) return false;
        payCost(p,COSTS.city); v.kind='city';
        addLog(`🏘️ ${p.name} built a city.`);
      }else return false;
      // building a road/ship/settlement reveals any fogged hex it touches
      if(a.what==='road'||a.what==='ship') revealFog(idx, edgeHexes(S.edges[a.key]).map(h=>h.id));
      else if(a.what==='settlement') revealFog(idx, S.vertices[a.key].hexes);
      S.mode=S.freeRoads>0?'buildRoad':null;
      updateLongest(); checkWin();
      return true;
    }
    case 'bankTrade':{
      if(S.phase!=='play'||S.turn!==idx||a.give===a.get) return false;
      const rate=portRate(idx,a.give);
      if(p.res[a.give]<rate||!RES.includes(a.give)||!RES.includes(a.get)) return false;
      p.res[a.give]-=rate; p.res[a.get]++;
      addLog(`🔄 ${p.name} traded ${rate}${RES_ICON[a.give]} for 1${RES_ICON[a.get]} with the bank.`);
      return true;
    }
    case 'offer':{
      if(S.phase!=='play'||S.turn!==idx||S.offer) return false;
      if(a.giveR===a.wantR||p.res[a.giveR]<a.giveN) return false;
      S.offer={from:idx, giveN:a.giveN, giveR:a.giveR, wantN:a.wantN, wantR:a.wantR};
      addLog(`🤝 ${p.name} offers ${a.giveN}${RES_ICON[a.giveR]} for ${a.wantN}${RES_ICON[a.wantR]}.`);
      return true;
    }
    case 'acceptOffer':{
      if(!S.offer||S.offer.from===idx) return false;
      const o=S.offer, from=S.players[o.from];
      if(p.res[o.wantR]<o.wantN||from.res[o.giveR]<o.giveN) return false;
      from.res[o.giveR]-=o.giveN; p.res[o.giveR]+=o.giveN;
      p.res[o.wantR]-=o.wantN; from.res[o.wantR]+=o.wantN;
      addLog(`🤝 ${from.name} traded ${o.giveN}${RES_ICON[o.giveR]} for ${o.wantN}${RES_ICON[o.wantR]} with ${p.name}.`);
      S.offer=null;
      return true;
    }
    case 'declineOffer':{
      if(!S.offer) return false;
      addLog(`🤝 ${S.players[S.offer.from].name}'s offer was declined.`);
      S.offer=null; return true;
    }
    case 'buyDev':{
      if(S.phase!=='play'||S.turn!==idx) return false;
      if(!S.devDeck.length||!canAfford(p,DEV_COST)) return false;
      payCost(p,DEV_COST);
      const t=S.devDeck.pop();
      p.dev.push({t:t, fresh:true});
      addLog(`🧙 ${p.name} bought a development card.`);
      return true;
    }
    case 'playDev':{
      if(S.phase!=='play'||S.turn!==idx) return false;
      const di=p.dev.findIndex(c=>c.t===a.what&&!c.fresh);
      if(di<0) return false;
      if(a.what==='knight'){
        p.dev.splice(di,1);
        p.knights=(p.knights||0)+1;
        updateLargestArmy();
        S.mode='moveRobber'; S.movingPirate=false;
        addLog(`🕵️ ${p.name} played a Knight!`);
      }else if(a.what==='road'){
        p.dev.splice(di,1);
        S.freeRoads=(S.freeRoads||0)+2; S.mode='buildRoad';
        addLog(`🛣️ ${p.name} played Road Building!`);
      }else if(a.what==='plenty'){
        p.dev.splice(di,1);
        addLog(`🌾 ${p.name} played Year of Plenty!`);
        if(isLocalPlayer(idx)){ showPlentyModal(idx); }
        else{ S.pending={kind:'plenty', player:idx}; }
      }else if(a.what==='monopoly'){
        p.dev.splice(di,1);
        addLog(`👑 ${p.name} played Monopoly!`);
        if(isLocalPlayer(idx)){ showMonopolyModal(idx); }
        else{ S.pending={kind:'monopoly', player:idx}; }
      }else return false;
      return true;
    }
    case 'resolvePlenty':{
      if(!S.pending||S.pending.kind!=='plenty'||S.pending.player!==idx) return false;
      if(!RES.includes(a.r1)||!RES.includes(a.r2)) return false;
      giveRes(p,a.r1,1); giveRes(p,a.r2,1);
      addLog(`🌾 ${p.name} took 1${RES_ICON[a.r1]} 1${RES_ICON[a.r2]} (Year of Plenty).`);
      S.pending=null;
      return true;
    }
    case 'resolveMonopoly':{
      if(!S.pending||S.pending.kind!=='monopoly'||S.pending.player!==idx) return false;
      if(!RES.includes(a.res)) return false;
      let took=0;
      S.players.forEach((q,qi)=>{ if(qi!==idx){ took+=q.res[a.res]; q.res[a.res]=0; } });
      p.res[a.res]+=took;
      addLog(`👑 ${p.name} monopolized ${RES_ICON[a.res]} — took ${took} from everyone.`);
      S.pending=null;
      return true;
    }
    case 'resolveGold':{
      if(!S.goldQueue||!S.goldQueue.length) return false;
      const head=S.goldQueue[0];
      if(head.player!==idx) return false;
      if(!Array.isArray(a.picks)||a.picks.length!==head.count) return false;
      if(!a.picks.every(r=>RES.includes(r))) return false;
      a.picks.forEach(r=>giveRes(p,r,1));
      addLog(`🪙 ${p.name} took ${a.picks.map(r=>RES_ICON[r]).join(' ')} from a gold field.`);
      S.goldQueue.shift();
      if(S.pending&&S.pending.kind==='gold') S.pending=null;
      processGold();
      return true;
    }
    case 'chooseRaider':{
      if(!S.pending||S.pending.kind!=='raider'||S.pending.player!==idx) return false;
      if(a.which!=='robber'&&a.which!=='pirate') return false;
      chooseRaider(a.which);
      return true;
    }
    case 'moveShip':{
      if(S.phase!=='play'||S.turn!==idx||S.variant!=='sea'||S.shipMoved) return false;
      const from=S.edges[a.from], to=S.edges[a.to];
      if(!from||!to||a.from===a.to||to.owner!==-1) return false;
      if(!shipMovable(from,idx)) return false;
      from.owner=-1; const fk=from.kind; from.kind=null;
      const okShip=shipValid(to,idx);
      if(!okShip){ from.owner=idx; from.kind=fk; return false; }
      to.owner=idx; to.kind='ship';
      S.shipMoved=true; S.mode=null;
      addLog(`⛵ ${p.name} moved a ship to a new route.`);
      updateLongest(); checkWin();
      return true;
    }
    case 'moveRobber':{
      if(S.mode!=='moveRobber'||!S.hexes[a.hex]) return false;
      if(S.movingPirate){
        if(S.hexes[a.hex].terrain!=='sea'||a.hex===S.pirateHex) return false;
        doMovePirate(a.hex);
        return true;
      }
      if(a.hex===S.robberHex||S.hexes[a.hex].terrain==='sea'||S.hexes[a.hex].fog) return false; // robber stays on revealed land
      // only current player moves robber
      doMoveRobber(a.hex);
      return true;
    }
    case 'steal':{
      if(!S.pending||S.pending.kind!=='steal'||S.pending.chooser!==idx) return false;
      if(!S.pending.victims.includes(a.victim)) return false;
      doSteal(a.victim);
      return true;
    }
    case 'discard':{
      if(!S.pending||S.pending.kind!=='discard'||S.pending.player!==idx) return false;
      const cards=a.cards; let sum=0;
      for(const r of RES){ const n=cards[r]||0; if(n<0||n>p.res[r]) return false; sum+=n; }
      if(sum!==S.pending.must) return false;
      for(const r of RES) p.res[r]-=(cards[r]||0);
      addLog(`🕵️ ${p.name} discarded ${S.pending.must} cards.`);
      S.discardQueue.shift(); S.pending=null;
      processDiscard();
      return true;
    }
  }
  return false;
}
function afterChange(){
  updateLongest(); checkWin();
  if(NET.mode==='online'&&NET.isHost){ netSync(); }
  refresh(); renderPrompts();
  saveGame();
  maybeBot();
}

/* ================= Placement validity (host-side) ================= */
function vertexTouchesLand(v){ return v.hexes.some(hid=>S.hexes[hid].terrain!=='sea'); }
function vertexIslands(v){
  const s=new Set();
  v.hexes.forEach(hid=>{ const h=S.hexes[hid]; if(h.terrain!=='sea') s.add(h.island); });
  return [...s];
}
function setupVertexValid(v,idx){
  if(v.owner!==-1) return false;
  if(S.variant==='sea'){
    if(!vertexTouchesLand(v)) return false;
    // Seafarers setup: starting settlements go on the main island only
    if(!vertexIslands(v).includes(S.mainIsland)) return false;
  }
  for(const nb of v.neighbors){ if(S.vertices[nb].owner!==-1) return false; }
  return true;
}
function edgeHexes(e){
  const A=S.vertices[e.a].hexes, B=S.vertices[e.b].hexes;
  return A.filter(hid=>B.includes(hid)).map(hid=>S.hexes[hid]);
}
function edgeBordersSea(e){ return edgeHexes(e).some(h=>h.terrain==='sea'); }
function edgeBordersLand(e){ return edgeHexes(e).some(h=>h.terrain!=='sea'); }
function roadValid(e,idx){
  if(e.owner!==-1) return false;
  if(S.variant==='sea'&&!edgeBordersLand(e)) return false; // no roads on open water
  const a=S.vertices[e.a], b=S.vertices[e.b];
  if(a.owner===idx||b.owner===idx) return true;
  for(const ek in S.edges){
    const o=S.edges[ek];
    if(o.owner===idx&&(o.a===e.a||o.b===e.a||o.a===e.b||o.b===e.b)) return true;
  }
  return false;
}
function shipValid(e,idx){
  if(S.variant!=='sea'||e.owner!==-1) return false;
  if(!edgeBordersSea(e)) return false; // ships need water
  if(S.pirateHex!=null&&S.pirateHex>=0&&edgeHexes(e).some(h=>h.id===S.pirateHex)) return false; // pirate blocks this hex
  const a=S.vertices[e.a], b=S.vertices[e.b];
  if(a.owner===idx||b.owner===idx) return true;
  for(const ek in S.edges){
    const o=S.edges[ek];
    if(o.owner===idx&&(o.a===e.a||o.b===e.a||o.a===e.b||o.b===e.b)) return true;
  }
  return false;
}
function shipMovable(e,idx){
  // a ship can move if it sits at a free end of your route (not anchored at both ends)
  // and the pirate isn't sitting on one of its hexes
  if(!e||e.kind!=='ship'||e.owner!==idx) return false;
  if(S.pirateHex!=null&&S.pirateHex>=0&&edgeHexes(e).some(h=>h.id===S.pirateHex)) return false;
  for(const vk of [e.a,e.b]){
    const v=S.vertices[vk];
    if(v.owner===idx) continue; // anchored by your own settlement/city
    let onward=false;
    for(const ek2 in S.edges){
      const o=S.edges[ek2];
      if(o!==e&&o.owner===idx&&(o.a===vk||o.b===vk)){ onward=true; break; }
    }
    if(!onward) return true;
  }
  return false;
}
function settleValid(v,idx){
  if(v.owner!==-1) return false;
  if(S.variant==='sea'&&!vertexTouchesLand(v)) return false;
  for(const nb of v.neighbors){ if(S.vertices[nb].owner!==-1) return false; }
  for(const nb of v.neighbors){ if(S.edges[edgeKey(v.key,nb)].owner===idx) return true; }
  return false;
}
// UI-side validity (uses current S.turn / S.mode for highlight)
function vertexValidUI(v){
  const i=S.turn, em=effMode();
  if(S.mode==='setupSettlement') return setupVertexValid(v,i);
  if(em==='buildCity') return v.owner===i&&v.kind==='settlement';
  if(v.owner!==-1) return false;
  for(const nb of v.neighbors){ if(S.vertices[nb].owner!==-1) return false; }
  if(em==='buildSettlement') return settleValid(v,i);
  return false;
}
function edgeValidUI(e){
  const i=S.turn;
  if(e.owner!==-1) return false;
  if(S.mode==='setupRoad') return e.a===S.setupVertex||e.b===S.setupVertex;
  if(effMode()!=='buildRoad') return false;
  return roadValid(e,i);
}

/* ================= Dice & production (host-side) ================= */
function doRoll(){
  S.rolled=true;
  const d1=1+Math.floor(Math.random()*6), d2=1+Math.floor(Math.random()*6);
  S.dice=[d1,d2];
  const sum=d1+d2;
  animateDice(d1,d2);
  if(sum===7){ addLog(`🎲 ${cur().name} rolled 7 — robber!`); startRobber(); }
  else{ addLog(`🎲 ${cur().name} rolled ${sum}`); distribute(sum); processGold(); }
}
function distribute(sum){
  if(!S.goldQueue) S.goldQueue=[];
  const goldDue={};
  S.hexes.forEach(h=>{
    if(h.number!==sum||h.id===S.robberHex||h.fog) return;
    if(h.terrain==='gold'){
      // gold field: adjacent owners choose that many resources of any kind
      for(const k in S.vertices){
        const v=S.vertices[k];
        if(v.owner>=0&&v.hexes.includes(h.id)) goldDue[v.owner]=(goldDue[v.owner]||0)+(v.kind==='city'?2:1);
      }
      return;
    }
    const res=TERRAIN[h.terrain].res;
    if(!res) return;
    for(const k in S.vertices){
      const v=S.vertices[k];
      if(v.owner>=0&&v.hexes.includes(h.id)) giveRes(S.players[v.owner],res,v.kind==='city'?2:1);
    }
  });
  Object.keys(goldDue).forEach(pi=>{ S.goldQueue.push({player:+pi, count:goldDue[pi]}); });
}
function goldAutoPicks(p,count){
  // bots take what they're shortest on
  const have={...p.res}; const picks=[];
  for(let i=0;i<count;i++){ let best=RES[0]; for(const r of RES) if(have[r]<have[best]) best=r; picks.push(best); have[best]++; }
  return picks;
}
// Fog of discovery: building next to a fogged hex flips it face-up for everyone.
// The discoverer pockets 1 of the revealed resource (a gold field = a free choice).
function revealFog(idx, hexIds){
  if(!S||S.variant!=='sea'||!hexIds) return;
  if(!S.goldQueue) S.goldQueue=[];
  let found=false;
  hexIds.forEach(hid=>{
    const h=S.hexes[hid];
    if(!h||!h.fog) return;
    h.fog=false; found=true;
    if(h.terrain==='gold'){
      addLog(`🌫️ ${S.players[idx].name} discovered a gold field! 🪙`);
      S.goldQueue.push({player:idx, count:1});
    }else if(TERRAIN[h.terrain].res){
      addLog(`🌫️ ${S.players[idx].name} discovered ${TERRAIN[h.terrain].icon} ${h.terrain}! +1 ${RES_ICON[TERRAIN[h.terrain].res]}`);
      giveRes(S.players[idx], TERRAIN[h.terrain].res, 1);
    }else{
      addLog(`🌫️ ${S.players[idx].name} discovered a desert 🏜️`);
    }
  });
  if(found) processGold();
}
function processGold(){
  if(!S||!S.goldQueue||!S.goldQueue.length){
    if(S&&S.pending&&S.pending.kind==='gold') S.pending=null;
    return;
  }
  const e=S.goldQueue[0], p=S.players[e.player];
  if(isBot(e.player)){
    const picks=goldAutoPicks(p,e.count);
    picks.forEach(r=>giveRes(p,r,1));
    addLog(`🪙 ${p.name} took ${picks.map(r=>RES_ICON[r]).join(' ')} from a gold field.`);
    S.goldQueue.shift();
    processGold();
  }else if(isLocalPlayer(e.player)){
    showGoldModal(e);
  }else{
    S.pending={kind:'gold', player:e.player, count:e.count};
    setHint(`🪙 Waiting for ${p.name} to choose gold-field resources…`);
  }
}

/* ================= Robber (host-side) ================= */
function startRobber(){
  S.discardQueue=[];
  S.players.forEach((p,i)=>{ const n=totalCards(p); if(n>7) S.discardQueue.push({player:i, must:Math.floor(n/2)}); });
  processDiscard();
}
function processDiscard(){
  if(!S.discardQueue.length){
    startRaiderMove();
    return;
  }
  const dq=S.discardQueue[0];
  if(isBot(dq.player)){ botAutoDiscard(dq); }
  else if(isLocalPlayer(dq.player)){ showDiscardModal(dq); }
  else{
    S.pending={kind:'discard', player:dq.player, must:dq.must};
    setHint(`🕵️ Waiting for ${S.players[dq.player].name} to discard ${dq.must} cards…`);
  }
}
function startRaiderMove(){
  S.pending=null;
  const canPirate=S.variant==='sea'&&Object.values(S.edges).some(e=>e.kind==='ship');
  if(!canPirate){
    S.movingPirate=false; S.mode='moveRobber';
    setHint('🕵️ Tap a hex to move the robber.');
    return;
  }
  const i=S.turn;
  if(isBot(i)){ chooseRaider(botRaiderChoice(i)); }
  else if(isLocalPlayer(i)){ showRaiderModal(); }
  else{
    S.pending={kind:'raider', player:i};
    setHint(`🏴‍☠️ Waiting for ${S.players[i].name} to choose robber or pirate…`);
  }
}
function chooseRaider(which){
  S.pending=null;
  S.movingPirate=(which==='pirate');
  S.mode='moveRobber';
  setHint(S.movingPirate?'🏴‍☠️ Tap a sea hex to move the pirate.':'🕵️ Tap a hex to move the robber.');
}
function pirateVictimsAt(hexId,idx){
  const victims=new Set();
  for(const ek in S.edges){
    const e=S.edges[ek];
    if(e.kind==='ship'&&e.owner>=0&&e.owner!==idx&&totalCards(S.players[e.owner])>0&&edgeHexes(e).some(h=>h.id===hexId)) victims.add(e.owner);
  }
  return [...victims];
}
function botRaiderChoice(i){
  // pirate only if it can actually raid someone's ships
  for(const h of S.hexes){
    if(h.terrain==='sea'&&h.id!==S.pirateHex&&pirateVictimsAt(h.id,i).length) return 'pirate';
  }
  return 'robber';
}
function botChoosePirateHex(i){
  let best=null,bs=-1;
  S.hexes.forEach(h=>{
    if(h.terrain!=='sea'||h.id===S.pirateHex) return;
    const s=pirateVictimsAt(h.id,i).length+Math.random();
    if(s>bs){ bs=s; best=h.id; }
  });
  return best;
}
function doMovePirate(hexId){
  S.pirateHex=hexId; S.mode=null; S.movingPirate=false;
  addLog(`🏴‍☠️ ${cur().name} moved the pirate!`);
  const victims=pirateVictimsAt(hexId,S.turn);
  if(victims.length===0){ S.pending=null; setHint('Pirate moved. No ships nearby to raid.'); }
  else if(victims.length===1){ doSteal(victims[0]); }
  else{
    const chooser=S.turn;
    if(isBot(chooser)){ doSteal(botChooseStealVictim(victims)); }
    else if(isLocalPlayer(chooser)){ showStealModal(victims); }
    else{
      S.pending={kind:'steal', chooser:chooser, victims:victims};
      setHint(`🏴‍☠️ Waiting for ${cur().name} to choose who to steal from…`);
    }
  }
}
function doMoveRobber(hexId){
  S.robberHex=hexId; S.mode=null; S.movingPirate=false;
  const victims=new Set();
  for(const k in S.vertices){
    const v=S.vertices[k];
    if(v.owner>=0&&v.owner!==S.turn&&v.hexes.includes(hexId)&&totalCards(S.players[v.owner])>0) victims.add(v.owner);
  }
  addLog(`🕵️ ${cur().name} moved the robber.`);
  if(victims.size===0){ S.pending=null; setHint('Robber moved. No one to steal from.'); }
  else if(victims.size===1){ doSteal([...victims][0]); }
  else{
    const chooser=S.turn, vl=[...victims];
    if(isBot(chooser)){ doSteal(botChooseStealVictim(vl)); }
    else if(isLocalPlayer(chooser)){ showStealModal(vl); }
    else{
      S.pending={kind:'steal', chooser:chooser, victims:vl};
      setHint(`🕵️ Waiting for ${cur().name} to choose who to steal from…`);
    }
  }
}
function doSteal(vi){
  const victim=S.players[vi], hand=[];
  RES.forEach(r=>{ for(let i=0;i<victim.res[r];i++) hand.push(r); });
  S.pending=null;
  if(!hand.length){ setHint('No cards to steal.'); return; }
  const r=hand[Math.floor(Math.random()*hand.length)];
  victim.res[r]--; cur().res[r]++;
  addLog(`🕵️ ${cur().name} stole 1 ${RES_ICON[r]} from ${victim.name}.`);
  setHint('Robber done. Build, trade, or end your turn.');
}

/* ================= Solo vs CPU bots (local practice mode) ================= */
const BOT={busy:false,turn:-1,n:0};
function isBot(i){ return !!(S&&S.bots&&S.bots[i]); }
function pips(n){ return n<=7?n-1:13-n; }
function vertexScore(v){
  let s=0; const seen=new Set();
  v.hexes.forEach(hid=>{ const h=S.hexes[hid];
    if(h.number!=null&&!h.fog){ s+=pips(h.number); const r=TERRAIN[h.terrain].res; if(r&&!seen.has(r)){ s+=1.5; seen.add(r); } } });
  if(S.ports&&S.ports.some(pt=>pt.vertex===v.key)) s+=4; // port bonus
  return s;
}
function bestSetupVertex(i){
  let best=null,bs=-1;
  for(const k in S.vertices){ const v=S.vertices[k];
    if(!setupVertexValid(v,i)) continue;
    const s=vertexScore(v);
    if(s>bs){ bs=s; best=k; } }
  return best;
}
function bestSettleVertex(i){
  let best=null,bs=-1;
  for(const k in S.vertices){ const v=S.vertices[k];
    if(!settleValid(v,i)) continue;
    let s=vertexScore(v);
    if(S.variant==='sea'){
      // exploring a new island is worth a lot (+2 VP chit)
      const p=S.players[i];
      if(vertexIslands(v).some(isl=>isl!==S.mainIsland&&!(p.islandsWon||[]).includes(isl))) s+=8;
    }
    if(s>bs){ bs=s; best=k; } }
  return best;
}
function bestShipEdge(i){
  let best=null,bs=-1;
  for(const ek in S.edges){ const e=S.edges[ek];
    if(!shipValid(e,i)) continue;
    let s=Math.random()*2;
    [e.a,e.b].forEach(vk=>{ const v=S.vertices[vk];
      if(v.owner===-1&&vertexTouchesLand(v)) s=Math.max(s,vertexScore(v)+ (vertexIslands(v).some(isl=>isl!==S.mainIsland)?4:0));
    });
    if(s>bs){ bs=s; best=ek; } }
  return best;
}
function bestRoadEdge(i){
  let best=null,bs=-1;
  for(const ek in S.edges){ const e=S.edges[ek];
    if(!roadValid(e,i)) continue;
    let s=0;
    [e.a,e.b].forEach(vk=>{ const v=S.vertices[vk]; if(v.owner===-1) s=Math.max(s,vertexScore(v)); });
    if(s>bs){ bs=s; best=ek; } }
  return best;
}
function bestSetupRoad(i){
  let best=null,bs=-1;
  for(const ek in S.edges){ const e=S.edges[ek];
    if(e.owner!==-1) continue;
    if(!(e.a===S.setupVertex||e.b===S.setupVertex)) continue;
    const other=e.a===S.setupVertex?e.b:e.a;
    const s=vertexScore(S.vertices[other]);
    if(s>bs){ bs=s; best=ek; } }
  return best;
}
function botBankTrade(i){
  // trade with the bank when exactly one resource is missing for a build
  const p=S.players[i];
  for(const cost of [COSTS.settlement,COSTS.city,COSTS.road]){
    const missing=Object.keys(cost).filter(r=>p.res[r]<cost[r]);
    if(missing.length===1){
      const need=missing[0];
      for(const r of RES){
        if(r===need) continue;
        if(p.res[r]>=portRate(i,r)) return {give:r,get:need};
      }
    }
  }
  return null;
}
function botTryBuild(i){
  const p=S.players[i];
  if(canAfford(p,COSTS.city)){
    for(const k in S.vertices){ const v=S.vertices[k];
      if(v.owner===i&&v.kind==='settlement'){ hostApplyAct(i,{kind:'place',what:'city',key:k}); return true; } }
  }
  if(canAfford(p,COSTS.settlement)){
    const vk=bestSettleVertex(i);
    if(vk){ hostApplyAct(i,{kind:'place',what:'settlement',key:vk}); return true; }
  }
  if(canAfford(p,COSTS.road)){
    const ek=bestRoadEdge(i);
    if(ek){ hostApplyAct(i,{kind:'place',what:'road',key:ek}); return true; }
  }
  if(S.variant==='sea'&&canAfford(p,COSTS.ship)){
    const ek=bestShipEdge(i);
    if(ek){ hostApplyAct(i,{kind:'place',what:'ship',key:ek}); return true; }
  }
  const bt=botBankTrade(i);
  if(bt){ hostApplyAct(i,{kind:'bankTrade',give:bt.give,get:bt.get}); return true; }
  return false;
}
function botAutoDiscard(dq){
  const p=S.players[dq.player];
  const hand=[]; RES.forEach(r=>{ for(let i=0;i<p.res[r];i++) hand.push(r); });
  shuffle(hand);
  const chosen={wood:0,brick:0,sheep:0,wheat:0,ore:0};
  for(let i=0;i<dq.must&&i<hand.length;i++) chosen[hand[i]]++;
  RES.forEach(r=>{ p.res[r]-=chosen[r]; });
  addLog(`🕵️ ${p.name} discarded ${dq.must} cards.`);
  S.discardQueue.shift(); S.pending=null;
  processDiscard();
}
function botChooseRobberHex(i){
  let best=null,bs=-1;
  S.hexes.forEach(h=>{
    if(h.id===S.robberHex||h.number==null) return;
    let mine=false, s=pips(h.number);
    for(const k in S.vertices){ const v=S.vertices[k];
      if(v.hexes.includes(h.id)&&v.owner>=0){
        if(v.owner===i) mine=true; else s+=vp(S.players[v.owner])*0.5;
      } }
    if(mine) s*=0.2;
    if(s>bs){ bs=s; best=h.id; } });
  return best;
}
function botChooseStealVictim(victims){
  let bi=victims[0],bc=-1;
  victims.forEach(vi=>{ const c=totalCards(S.players[vi]); if(c>bc){ bc=c; bi=vi; } });
  return bi;
}
function botStep(i){
  if(!S||S.turn!==i||!isBot(i)||S.phase==='gameover') return;
  if(BOT.n>24){ // safety cap: never stall the game
    if(S.phase==='play'&&S.rolled&&!S.pending&&S.mode!=='moveRobber') hostApplyAct(i,{kind:'endTurn'});
    return;
  }
  if(S.phase==='setup'){
    if(S.mode==='setupSettlement'){ const vk=bestSetupVertex(i); if(vk) hostApplyAct(i,{kind:'setupSettlement',key:vk}); }
    else if(S.mode==='setupRoad'){ const ek=bestSetupRoad(i); if(ek) hostApplyAct(i,{kind:'setupRoad',key:ek}); }
    return;
  }
  if(S.phase!=='play') return;
  if(S.mode==='moveRobber'){ const h=S.movingPirate?botChoosePirateHex(i):botChooseRobberHex(i); if(h!=null) hostApplyAct(i,{kind:'moveRobber',hex:h}); return; }
  if(!S.rolled){ hostApplyAct(i,{kind:'roll'}); return; }
  if(botTryBuild(i)) return;
  hostApplyAct(i,{kind:'endTurn'});
}
function maybeBot(){
  if(!S||NET.mode!=='local'||S.phase==='gameover'||BOT.busy) return;
  const i=S.turn;
  if(!isBot(i)) return;
  if(S.pending) return; // a human prompt is open (e.g. human discard)
  if(BOT.turn!==i){ BOT.turn=i; BOT.n=0; }
  BOT.busy=true;
  setHint(`🤖 ${S.players[i].name} is thinking…`);
  if(typeof document!=='undefined') refresh();
  setTimeout(()=>{ BOT.busy=false; BOT.n++; botStep(i); },700);
}

/* ================= Longest road & win (host-side) ================= */
function longestRoadFor(pi){
  const adj={};
  for(const ek in S.edges){
    const e=S.edges[ek];
    if(e.owner===pi){ (adj[e.a]=adj[e.a]||[]).push(e.b); (adj[e.b]=adj[e.b]||[]).push(e.a); }
  }
  let best=0; const used=new Set();
  function dfs(v,len){
    if(len>best) best=len;
    for(const nb of (adj[v]||[])){
      const ek=edgeKey(v,nb);
      if(!used.has(ek)){ used.add(ek); dfs(nb,len+1); used.delete(ek); }
    }
  }
  for(const v in adj) dfs(v,0);
  return best;
}
function updateLongest(){
  let bestLen=0, holder=-1, tie=false;
  S.players.forEach((p,i)=>{
    p.longest=longestRoadFor(i);
    if(p.longest>=5){
      if(p.longest>bestLen){ bestLen=p.longest; holder=i; tie=false; }
      else if(p.longest===bestLen){ tie=true; }
    }
  });
  S.players.forEach((p,i)=>{
    const had=p.hasLongest;
    p.hasLongest=(!tie&&i===holder);
    if(p.hasLongest&&!had) addLog(S.variant==='sea'?`⛵ ${p.name} takes Longest Trade Route (+2 VP)!`:`🛣️ ${p.name} takes Longest Road (+2 VP)!`);
  });
}
function updateLargestArmy(){
  let best=-1,bc=0;
  S.players.forEach((p,i)=>{ const k=p.knights||0; if(k>bc){ bc=k; best=i; } });
  const cur=S.players.findIndex(p=>p.hasLargestArmy);
  if(best>=0&&bc>=3&&(cur<0||bc>(S.players[cur].knights||0))){
    if(cur>=0) S.players[cur].hasLargestArmy=false;
    S.players[best].hasLargestArmy=true;
    addLog(`⚔️ ${S.players[best].name} claims Largest Army (+2 VP)!`);
  }
}
function checkWin(){
  for(let i=0;i<S.players.length;i++){
    if(vp(S.players[i])>=(S.winVP||WIN_VP)){
      S.phase='gameover'; S.winner=i; S.mode=null; S.pending=null; S.offer=null;
      addLog(`🏆 ${S.players[i].name} wins with ${vp(S.players[i])} VP!`);
      return true;
    }
  }
  return false;
}
function doEndTurn(){
  S.players[S.turn].dev.forEach(c=>{ c.fresh=false; });
  S.turn=(S.turn+1)%S.players.length; S.rolled=false; S.mode=null; S.shipMoved=false;
  addLog(`➡️ ${cur().name}'s turn.`);
}

/* ================= Turn timer (60s, auto-pass) ================= */
const TURN_SECONDS=60;
let timerDeadline=0, timerTurnKey='', timerWasActive=false;
// true while any modal overlay is open (discard/steal/dev-card prompts, trades, …)
// the turn timer must not auto-pass underneath an open prompt.
let modalOpenFlag=false;
function timerActive(){
  return S&&S.phase==='play'&&!isBot(S.turn)&&!S.pending&&S.mode!=='moveRobber'&&!modalOpenFlag;
}
function resetTimer(){
  timerTurnKey=S.turn+':'+S.phase;
  timerDeadline=Date.now()+TURN_SECONDS*1000;
}
function onTurnTimeout(){
  // only the authority auto-passes: local page, or online host
  const authority=NET.mode==='local'||(NET.mode==='online'&&NET.isHost);
  if(!authority) return;
  if(S.phase!=='play'||isBot(S.turn)||S.pending||S.mode==='moveRobber'||modalOpenFlag) return;
  const idx=S.turn;
  if(!S.rolled) hostApplyAct(idx,{kind:'roll'});
  if(S.pending||S.mode==='moveRobber'){ resetTimer(); return; } // roll opened a 7-flow; give fresh time
  addLog(`⏱️ ${S.players[idx].name} ran out of time — turn passed.`);
  hostApplyAct(idx,{kind:'endTurn'});
}
function tickTimer(){
  if(typeof document==='undefined') return;
  const wrap=$('endTurnWrap'), btn=$('endTurnBtn');
  if(!wrap||!btn||!S) return;
  const key=S.turn+':'+S.phase;
  if(key!==timerTurnKey) resetTimer();
  const active=timerActive();
  if(active&&!timerWasActive) resetTimer(); // fresh 60s when the timer re-arms (e.g. a prompt just closed)
  timerWasActive=active;
  wrap.classList.toggle('on', active);
  if(!active){ btn.innerHTML='✅ End Turn'; return; }
  const msLeft=timerDeadline-Date.now();
  if(msLeft<=0){ wrap.classList.remove('on'); onTurnTimeout(); return; }
  wrap.style.setProperty('--tp',(msLeft/(TURN_SECONDS*1000)*100)+'%');
  btn.innerHTML='✅ End Turn · '+Math.ceil(msLeft/1000)+'s';
}

/* ================= Dev-card deck on the board ================= */
let lastDeckSize=-1;
function syncDeck(){
  const deck=$('dcDeck');
  if(!deck||!S){ return; }
  const n=S.devDeck.length;
  $('dcDeckCount').textContent=n;
  deck.style.display=(S.phase==='gameover')?'none':'block';
  deck.style.opacity=n===0?'.45':'1';
  if(lastDeckSize>=0&&n<lastDeckSize) animateCardPickup();
  lastDeckSize=n;
}
function animateCardPickup(){
  const deck=$('dcDeck'), wrapEl=$('boardWrap');
  if(!deck||!wrapEl) return;
  const r=deck.getBoundingClientRect(), w=wrapEl.getBoundingClientRect();
  const c=document.createElement('div');
  c.className='dc-fly'; c.textContent='?';
  c.style.left=(r.left-w.left)+'px';
  c.style.top=(r.top-w.top)+'px';
  wrapEl.appendChild(c);
  const dx=w.width-(r.left-w.left)-70;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    c.style.transform=`translate(${dx}px,-34px) rotate(18deg)`;
    c.style.opacity='0';
  }));
  setTimeout(()=>c.remove(), 850);
}

/* ================= UI event handlers ================= */
function sendOrDo(a){
  if(NET.mode==='online'&&!NET.isHost){ netSend({t:'act', a:a}); return; }
  hostApplyAct(NET.mode==='local'?S.turn:NET.myIdx, a);
}
function uiRoll(){
  if(!S||S.phase!=='play'||S.rolled) return;
  if(!canActAs(S.turn)||isBot(S.turn)) return;
  sendOrDo({kind:'roll'});
}
function uiEndTurn(){
  if(!S||S.phase!=='play'||!S.rolled) return;
  if(!canActAs(S.turn)||isBot(S.turn)) return;
  sendOrDo({kind:'endTurn'});
  if(NET.mode==='local'&&!isBot(S.turn)) showPassDevice();
}
function uiVertexClick(k){
  if(!S||!canActAs(S.turn)||isBot(S.turn)) return;
  if(S.mode==='setupSettlement'){ sendOrDo({kind:'setupSettlement', key:k}); }
  else if(S.mode==='buildSettlement'){ sendOrDo({kind:'place', what:'settlement', key:k}); }
  else if(S.mode==='buildCity'){ sendOrDo({kind:'place', what:'city', key:k}); }
}
function uiEdgeClick(k){
  if(!S||!canActAs(S.turn)||isBot(S.turn)) return;
  if(S.mode==='setupRoad'){ sendOrDo({kind:'setupRoad', key:k}); }
  else if(S.mode==='buildRoad'){ sendOrDo({kind:'place', what:'road', key:k}); }
}
function uiHexClick(id){
  if(!S||S.mode!=='moveRobber') return;
  const h=S.hexes[id]; if(!h) return;
  if(S.movingPirate){ if(h.terrain!=='sea'||id===S.pirateHex) return; }
  else if(h.terrain==='sea'||id===S.robberHex) return;
  if(!canActAs(S.turn)||isBot(S.turn)) return;
  sendOrDo({kind:'moveRobber', hex:id});
}
function effMode(){
  // guests keep a local-only build mode for highlights; host state is authoritative
  if(NET.mode==='online'&&!NET.isHost) return NET.localMode||S.mode;
  return S.mode;
}
function uiSetBuildMode(m){
  if(!S||S.phase!=='play') return;
  if(!canActAs(S.turn)||isBot(S.turn)) return;
  if(NET.mode==='online'&&!NET.isHost){
    NET.localMode=(NET.localMode===m)?null:m;
  }else{
    S.mode=(S.mode===m)?null:m; // local UI state only; host re-validates on action
  }
  const hints={
    buildRoad:'Tap a highlighted edge to build a road (1🧱 1🪵).',
    buildShip:'Tap a highlighted water edge to build a ship (1🪵 1🐑). Ships sail your trade route to new islands!',
    moveShip:'Tap one of your glowing ships to pick it up, then tap a glowing water edge to move it there. Free, once per turn!',
    buildSettlement:'Tap a highlighted spot to build a settlement (1🧱 1🪵 1🐑 1🌾).',
    buildCity:'Tap one of your settlements to upgrade it to a city (2🌾 3⛰️).',
  };
  const em=effMode();
  setHint(em&&hints[em]?hints[em]:'Build, trade, or end your turn.');
  refresh();
}
// NOTE: in online mode S.mode is synced from host; placement intents carry the explicit 'what'.
function onVertexTap(k){
  if(!S||isBot(S.turn)) return;
  const em=effMode();
  if(NET.mode==='online'&&!NET.isHost){
    if(S.mode==='setupSettlement') uiVertexClick(k);
    else if(em==='buildSettlement'){ NET.localMode=null; sendOrDo({kind:'place', what:'settlement', key:k}); }
    else if(em==='buildCity'){ NET.localMode=null; sendOrDo({kind:'place', what:'city', key:k}); }
    return;
  }
  uiVertexClick(k);
}
function onEdgeTap(k){
  if(!S||isBot(S.turn)) return;
  if(NET.mode==='online'&&!NET.isHost){
    if(S.mode==='setupRoad') uiEdgeClick(k);
    else if(effMode()==='buildRoad'){ NET.localMode=null; sendOrDo({kind:'place', what:'road', key:k}); }
    return;
  }
  uiEdgeClick(k);
}
// Tap-to-build: tapping an auto-highlighted spot builds directly, no Build button needed (host validates).
let toastTimer=null;
function toast(msg){
  if(typeof document==='undefined') return;
  const t=$('toast'); if(!t) return;
  t.textContent=msg; t.classList.add('show');
  if(toastTimer) clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{ t.classList.remove('show'); },2600);
}
function affordHint(what){
  const costs={road:COSTS.road, ship:COSTS.ship, settlement:COSTS.settlement, city:COSTS.city};
  const cost=costs[what]; if(!cost||!S) return;
  const idx=NET.mode==='local'?S.turn:NET.myIdx;
  const p=S.players[idx]; if(!p) return;
  const label={road:'🛣️ Road', ship:'⛵ Ship', settlement:'🏠 Settlement', city:'🏘️ City upgrade'}[what];
  const missing=Object.keys(cost).filter(r=>p.res[r]<cost[r])
    .map(r=>`${RES_ICON[r]} ${RES_NAME[r]} (have ${p.res[r]}, need ${cost[r]})`).join(', ');
  toast(`${label}: you're missing ${missing}.`);
}
function onPlaceTap(what,key){
  if(!S||S.phase!=='play'||S.pending) return;
  if(!canActAs(S.turn)||isBot(S.turn)) return;
  const costsMap={road:COSTS.road, ship:COSTS.ship, settlement:COSTS.settlement, city:COSTS.city};
  if(costsMap[what]&&!(what==='road'&&S.freeRoads>0)){
    const idx=NET.mode==='local'?S.turn:NET.myIdx;
    if(!canAfford(S.players[idx],costsMap[what])){ affordHint(what); return; }
  }
  if(NET.mode==='online'&&!NET.isHost) NET.localMode=null;
  sendOrDo({kind:'place', what:what, key:key});
}
// Tapping your own house (or its upgrade ring) upgrades it to a city.
function cityTap(k){
  if(!S||S.phase!=='play'||S.pending) return;
  if(!canActAs(S.turn)||isBot(S.turn)) return;
  if(!canAfford(S.players[S.turn],COSTS.city)){ affordHint('city'); return; }
  if(effMode()==='buildCity') onVertexTap(k); else onPlaceTap('city',k);
}
// A coastal edge can hold a road OR a ship — ask which one.
let pickedShip=null;
function showBuildChooser(ek){
  const free=S.freeRoads>0;
  const ov=overlay(`<h2>Build here?</h2>
    <p>This coastal spot can take a road or a ship:</p>
    <div class="btnrow">
      <button class="btn" id="chRoad">🛣️ Road<br><small>${free?'FREE (Road Building)':'1🧱 1🪵'}</small></button>
      <button class="btn primary" id="chShip">⛵ Ship<br><small>1🪵 1🐑</small></button>
    </div>
    <div class="btnrow"><button class="btn" id="chCancel">Cancel</button></div>`);
  ov.querySelector('#chRoad').onclick=()=>{ closeOverlay(); onPlaceTap('road',ek); };
  ov.querySelector('#chShip').onclick=()=>{ closeOverlay(); onPlaceTap('ship',ek); };
  ov.querySelector('#chCancel').onclick=closeOverlay;
}

/* ================= Modals & prompts ================= */
const svgNS='http://www.w3.org/2000/svg';
const $=id=>document.getElementById(id);
function el(tag,attrs,parent){ const e=document.createElementNS(svgNS,tag); for(const k in attrs) e.setAttribute(k,attrs[k]); if(parent) parent.appendChild(e); return e; }
function overlay(html){
  modalOpenFlag=true;
  const root=$('overlayRoot');
  const ov=document.createElement('div'); ov.className='overlay';
  ov.innerHTML=`<div class="card">${html}</div>`;
  root.appendChild(ov); return ov;
}
function closeOverlay(){ modalOpenFlag=false; $('overlayRoot').innerHTML=''; }
let diceUid=0;
function diceSVG(v){
  // 2.5D die: white face, black pips, soft drop shadow for depth
  diceUid++;
  const s=52, gid='dg'+diceUid, c=s/2, o=s*0.28, pr=Math.max(2.5,s*0.075);
  const LAYOUTS={
    1:[[0,0]],
    2:[[-1,-1],[1,1]],
    3:[[-1,-1],[0,0],[1,1]],
    4:[[-1,-1],[1,-1],[-1,1],[1,1]],
    5:[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],
    6:[[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]],
  };
  const pips=(LAYOUTS[v]||[]).map(([dx,dy])=>
    `<circle cx="${(c+dx*o).toFixed(1)}" cy="${(c+dy*o).toFixed(1)}" r="${pr.toFixed(1)}" fill="#1a1a1a"/>`
  ).join('');
  return `<svg width="${s}" height="${s+4}" viewBox="0 0 ${s} ${s+4}">`+
    `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">`+
    `<stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cfcfcf"/></linearGradient></defs>`+
    `<rect x="3" y="6" width="${s-6}" height="${s-6}" rx="9" fill="rgba(0,0,0,.30)"/>`+
    `<rect x="3" y="3" width="${s-6}" height="${s-6}" rx="9" fill="url(#${gid})" stroke="#8a8a8a" stroke-width="1.5"/>`+
    pips+`</svg>`;
}
function animateDice(d1,d2){
  // rolling animation on the top badge, then settles on the final dice
  if(typeof document==='undefined') return;
  const badge=$('rollBadge');
  if(!badge) return;
  badge.style.display='flex';
  badge.classList.add('rolling');
  let ticks=0;
  const iv=setInterval(()=>{
    badge.innerHTML=diceSVG(1+Math.floor(Math.random()*6))+diceSVG(1+Math.floor(Math.random()*6));
    if(++ticks>=8){
      clearInterval(iv);
      badge.innerHTML=diceSVG(d1)+diceSVG(d2);
      badge.classList.remove('rolling');
    }
  },150);
}
let shownPrompt=null;
function renderPrompts(){
  if(!S) return;
  const key=S.pending?('p'+S.pending.kind+S.pending.player+S.pending.chooser):(S.offer?('o'+S.offer.from):null);
  // offer banner (non-modal)
  renderOfferBox();
  if(key===shownPrompt) return;
  shownPrompt=key;
  if(S.pending&&S.pending.kind==='discard'&&S.pending.player===NET.myIdx){
    showDiscardModal(S.pending);
  }else if(S.pending&&S.pending.kind==='steal'&&S.pending.chooser===NET.myIdx){
    showStealModal(S.pending.victims);
  }else if(S.pending&&S.pending.kind==='plenty'&&S.pending.player===NET.myIdx){
    showPlentyModal(S.pending.player);
  }else if(S.pending&&S.pending.kind==='monopoly'&&S.pending.player===NET.myIdx){
    showMonopolyModal(S.pending.player);
  }else if(S.pending&&S.pending.kind==='raider'&&S.pending.player===NET.myIdx){
    showRaiderModal();
  }else if(S.pending&&S.pending.kind==='gold'&&S.pending.player===NET.myIdx){
    showGoldModal({player:S.pending.player, count:S.pending.count});
  }
}
function showRaiderModal(){
  const ov=overlay(`<h2>🎲 A 7 was rolled!</h2>
    <p>Move the <b>robber</b> on land, or the <b>pirate</b> on the sea (blocks ships there and steals from a ship owner nearby)?</p>
    <div class="btnrow">
      <button class="btn" id="raidRobber">🕵️ Robber</button>
      <button class="btn primary" id="raidPirate">🏴‍☠️ Pirate</button>
    </div>`);
  const pick=(which)=>{
    closeOverlay(); shownPrompt=null;
    if(NET.mode==='online'&&!NET.isHost){ netSend({t:'act', a:{kind:'chooseRaider', which:which}}); }
    else{ chooseRaider(which); afterChange(); }
  };
  ov.querySelector('#raidRobber').onclick=()=>pick('robber');
  ov.querySelector('#raidPirate').onclick=()=>pick('pirate');
}
function showGoldModal(entry){
  const p=S.players[entry.player];
  const sels=Array.from({length:entry.count},(_,i)=>`<span>${i+1}:</span><select id="gold${i}">${resOptions()}</select>`).join(' ');
  const ov=overlay(`<h2>🪙 Gold field!</h2>
    <p>${escapeHtml(p.name)} — choose ${entry.count} resource${entry.count>1?'s':''} to take:</p>
    <div class="tradeRow">${sels}</div>
    <div class="btnrow"><button class="btn primary" id="goldOk">Take</button></div>`);
  ov.querySelector('#goldOk').onclick=()=>{
    const picks=[];
    for(let i=0;i<entry.count;i++) picks.push(ov.querySelector('#gold'+i).value);
    closeOverlay(); shownPrompt=null;
    if(NET.mode==='online'&&!NET.isHost){
      netSend({t:'act', a:{kind:'resolveGold', picks:picks}});
    }else{
      picks.forEach(r=>giveRes(p,r,1));
      addLog(`🪙 ${p.name} took ${picks.map(r=>RES_ICON[r]).join(' ')} from a gold field.`);
      S.goldQueue.shift();
      if(S.pending&&S.pending.kind==='gold') S.pending=null;
      processGold();
      afterChange();
    }
  };
}
function showDiscardModal(dq){
  const p=S.players[dq.player];
  const chosen={wood:0,brick:0,sheep:0,wheat:0,ore:0};
  const ov=overlay(`<h2>🕵️ Robber! ${escapeHtml(p.name)} discards ${dq.must}</h2>
    <p>You have ${totalCards(p)} cards — tap cards to discard ${dq.must}.</p>
    <div id="discRes" class="btnrow"></div>
    <p id="discCount"></p>
    <div class="btnrow"><button class="btn primary" id="discOk" disabled>Done</button></div>`);
  const render=()=>{
    const box=ov.querySelector('#discRes'); box.innerHTML='';
    let sum=0; for(const r in chosen) sum+=chosen[r];
    ov.querySelector('#discCount').textContent=`Selected ${sum} / ${dq.must}`;
    ov.querySelector('#discOk').disabled=sum!==dq.must;
    RES.forEach(r=>{
      const b=document.createElement('button'); b.className='btn';
      b.innerHTML=`${RES_ICON[r]} ${p.res[r]} <b>(-${chosen[r]})</b>`;
      box.appendChild(b);
    });
  };
  render();
  ov.querySelector('#discRes').addEventListener('click',e=>{
    const btn=e.target.closest('button'); if(!btn) return;
    const idx=[...ov.querySelector('#discRes').children].indexOf(btn);
    const r=RES[idx]; let sum=0; for(const k in chosen) sum+=chosen[k];
    if(sum<dq.must&&chosen[r]<p.res[r]) chosen[r]++;
    else if(chosen[r]>0) chosen[r]--;
    render();
  });
  ov.querySelector('#discOk').onclick=()=>{
    closeOverlay(); shownPrompt=null;
    if(NET.mode==='online'&&!NET.isHost){
      netSend({t:'act', a:{kind:'discard', cards:chosen}});
    }else{
      // local or host's own discard
      RES.forEach(r=>{ p.res[r]-=chosen[r]; });
      addLog(`🕵️ ${p.name} discarded ${dq.must} cards.`);
      S.discardQueue.shift(); S.pending=null;
      processDiscard(); afterChange();
    }
  };
}
function showStealModal(victims){
  const ov=overlay(`<h2>🕵️ Steal from whom?</h2>`+
    victims.map(vi=>`<button class="btn victimBtn" data-vi="${vi}">Steal from ${escapeHtml(S.players[vi].name)}</button>`).join(''));
  ov.addEventListener('click',e=>{
    const b=e.target.closest('button[data-vi]'); if(!b) return;
    closeOverlay(); shownPrompt=null;
    const vi=parseInt(b.dataset.vi);
    if(NET.mode==='online'&&!NET.isHost){ netSend({t:'act', a:{kind:'steal', victim:vi}}); }
    else{ doSteal(vi); afterChange(); }
  });
}
function resOptions(){ return RES.map(r=>`<option value="${r}">${RES_ICON[r]} ${RES_NAME[r]}</option>`).join(''); }
function showPlentyModal(pi){
  const ov=overlay(`<h2>🌾 Year of Plenty</h2><p>Take any 2 resources:</p>
    <div class="tradeRow"><span>1st:</span><select id="pl1">${resOptions()}</select>
    <span>2nd:</span><select id="pl2">${resOptions()}</select></div>
    <div class="btnrow"><button class="btn primary" id="plOk">Take</button></div>`);
  ov.querySelector('#plOk').onclick=()=>{
    const r1=ov.querySelector('#pl1').value, r2=ov.querySelector('#pl2').value;
    closeOverlay(); shownPrompt=null;
    if(NET.mode==='online'&&!NET.isHost){ netSend({t:'act', a:{kind:'resolvePlenty', r1:r1, r2:r2}}); }
    else{
      giveRes(S.players[pi],r1,1); giveRes(S.players[pi],r2,1);
      addLog(`🌾 ${S.players[pi].name} took 1${RES_ICON[r1]} 1${RES_ICON[r2]} (Year of Plenty).`);
      afterChange();
    }
  };
}
function showMonopolyModal(pi){
  const ov=overlay(`<h2>👑 Monopoly</h2><p>Take ALL of one resource from everyone:</p>
    <div class="btnrow" id="monBtns">${RES.map(r=>`<button class="btn" data-r="${r}">${RES_ICON[r]} ${RES_NAME[r]}</button>`).join('')}</div>`);
  ov.querySelector('#monBtns').addEventListener('click',e=>{
    const b=e.target.closest('button[data-r]'); if(!b) return;
    const r=b.dataset.r;
    closeOverlay(); shownPrompt=null;
    if(NET.mode==='online'&&!NET.isHost){ netSend({t:'act', a:{kind:'resolveMonopoly', res:r}}); }
    else{
      let took=0;
      S.players.forEach((q,qi)=>{ if(qi!==pi){ took+=q.res[r]; q.res[r]=0; } });
      S.players[pi].res[r]+=took;
      addLog(`👑 ${S.players[pi].name} monopolized ${RES_ICON[r]} — took ${took} from everyone.`);
      afterChange();
    }
  });
}
function renderOfferBox(){
  const box=$('offerBox'); if(!box) return; box.innerHTML='';
  if(!S||!S.offer) return;
  const o=S.offer, from=S.players[o.from];
  const d=document.createElement('div'); d.className='offerBanner';
  d.innerHTML=`🤝 <b>${escapeHtml(from.name)}</b> offers ${o.giveN}${RES_ICON[o.giveR]} for ${o.wantN}${RES_ICON[o.wantR]}`;
  const me=NET.mode==='local'?null:S.players[NET.myIdx];
  if(NET.mode==='local'){
    // local: any other player taps to accept
    S.players.forEach((p,i)=>{
      if(i!==o.from&&p.res[o.wantR]>=o.wantN){
        const b=document.createElement('button'); b.className='btn'; b.style.margin='4px';
        b.textContent=`${p.name} accepts`;
        b.onclick=()=>{ hostApplyAct(i,{kind:'acceptOffer'}); };
        d.appendChild(b);
      }
    });
    const dec=document.createElement('button'); dec.className='btn'; dec.style.margin='4px';
    dec.textContent='No deal';
    dec.onclick=()=>{ hostApplyAct(o.from,{kind:'declineOffer'}); };
    d.appendChild(dec);
  }else if(me&&NET.myIdx!==o.from&&me.res[o.wantR]>=o.wantN){
    const b=document.createElement('button'); b.className='btn green'; b.style.margin='4px';
    b.textContent='Accept';
    b.onclick=()=>netSend({t:'act', a:{kind:'acceptOffer'}});
    d.appendChild(b);
  }else if(me&&NET.myIdx===o.from){
    const b=document.createElement('button'); b.className='btn'; b.style.margin='4px';
    b.textContent='Cancel offer';
    b.onclick=()=>netSend({t:'act', a:{kind:'declineOffer'}});
    d.appendChild(b);
  }
  box.appendChild(d);
}
function bankTradeUI(){
  if(!S) return;
  const me=NET.mode==='local'?cur():S.players[NET.myIdx];
  const myIdx=NET.mode==='local'?S.turn:NET.myIdx;
  const rates=RES.map(r=>({r:r, rate:portRate(myIdx,r)})).filter(o=>me.res[o.r]>=o.rate);
  if(!rates.length){ setHint('You need enough of one resource to trade with the bank.'); return; }
  const ov=overlay(`<h2>🔄 Bank Trade</h2>
    <div class="tradeRow"><span>Give:</span><select id="tGive">${rates.map(o=>`<option value="${o.r}">${o.rate}${RES_ICON[o.r]} ${RES_NAME[o.r]} (${me.res[o.r]})${o.rate===2?' ⚓2:1 port':''}</option>`).join('')}</select></div>
    <div class="tradeRow"><span>Get 1:</span><select id="tGet">${RES.map(r=>`<option value="${r}">${RES_ICON[r]} ${RES_NAME[r]}</option>`).join('')}</select></div>
    <div class="btnrow"><button class="btn primary" id="tGo">Trade</button><button class="btn" id="tCancel">Cancel</button></div>`);
  ov.querySelector('#tCancel').onclick=closeOverlay;
  ov.querySelector('#tGo').onclick=()=>{
    const g=ov.querySelector('#tGive').value, w=ov.querySelector('#tGet').value;
    closeOverlay();
    if(NET.mode==='online'&&!NET.isHost){ netSend({t:'act', a:{kind:'bankTrade', give:g, get:w}}); }
    else{ hostApplyAct(S.turn,{kind:'bankTrade', give:g, get:w}); }
  };
}
function offerTradeUI(){
  if(!S) return;
  const ov=overlay(`<h2>🤝 Trade Offer</h2>
    <div class="tradeRow"><span>I give:</span><select id="oGiveN">${[1,2,3,4].map(n=>`<option>${n}</option>`).join('')}</select>
    <select id="oGive">${RES.map(r=>`<option value="${r}">${RES_ICON[r]} ${RES_NAME[r]}</option>`).join('')}</select></div>
    <div class="tradeRow"><span>I want:</span><select id="oWantN">${[1,2,3,4].map(n=>`<option>${n}</option>`).join('')}</select>
    <select id="oWant">${RES.map(r=>`<option value="${r}">${RES_ICON[r]} ${RES_NAME[r]}</option>`).join('')}</select></div>
    <div class="btnrow"><button class="btn primary" id="oPost">Post Offer</button><button class="btn" id="oCancel">Cancel</button></div>`);
  ov.querySelector('#oCancel').onclick=closeOverlay;
  ov.querySelector('#oPost').onclick=()=>{
    const a={kind:'offer',
      giveN:+ov.querySelector('#oGiveN').value, giveR:ov.querySelector('#oGive').value,
      wantN:+ov.querySelector('#oWantN').value, wantR:ov.querySelector('#oWant').value};
    closeOverlay();
    if(NET.mode==='online'&&!NET.isHost){ netSend({t:'act', a:a}); }
    else{ hostApplyAct(S.turn,a); }
  };
}
function showPassDevice(){
  if(NET.mode!=='local'||!S||S.phase==='gameover') return;
  const p=cur();
  const ov=overlay(`<h2>📱 Pass to ${escapeHtml(p.name)}</h2>
    <p>Hand the device over, then tap below.</p>
    <div class="btnrow"><button class="btn primary" id="passOk" style="font-size:1.1rem;padding:14px;">I'm ${escapeHtml(p.name)} — start my turn</button></div>`);
  ov.querySelector('#passOk').onclick=()=>{ closeOverlay(); refresh(); };
}
function showWin(){
  const p=S.players[S.winner];
  overlay(`<div id="winConfetti">🎉🏆🎉</div>
    <h2 style="text-align:center">${escapeHtml(p.name)} wins!</h2>
    <p style="text-align:center">${vp(p)} victory points</p>
    <div class="btnrow" style="justify-content:center"><button class="btn primary" id="againBtn">🔄 Play Again</button></div>`)
    .querySelector('#againBtn').onclick=()=>{ closeOverlay(); location.reload(); };
}
function showRules(){
  overlay(`<h2>❓ How to Play (Family Rules)</h2>
  <ul class="rulesList">
    <li>🎲 <b>Roll the dice</b> each turn. Hexes showing that number produce resources for adjacent settlements (1 card) and cities (2 cards). The robber blocks its hex.</li>
    <li>🏠 <b>Build:</b> Road = 1🧱 1🪵 · Settlement = 1🧱 1🪵 1🐑 1🌾 · City (upgrade) = 2🌾 3⛰️.</li>
    <li>🔄 <b>Trade</b> with the bank (4:1 — or 2:1 at ports you own), or make offers to other players.</li>
    <li>⚓ <b>Ports:</b> coastal spots marked ⚓. Build a settlement there to unlock 2:1 trades for that resource.</li>
    <li>🕵️ Rolling <b>7</b>: anyone with 8+ cards discards half, then you move the robber and steal 1 card.</li>
    <li>🧙 <b>Dev cards</b> (1🌾 1🐑 1⛰️): Knights move the robber, Victory Points count toward 10, plus Road Building, Year of Plenty, and Monopoly.</li>
    <li>🛣️ <b>Longest road</b> (5+ roads) is worth 2 VP.</li>
    <li>🛣️ <b>Longest Road</b> (5+ roads) and ⚔️ <b>Largest Army</b> (3+ Knights) each give <b>+2 VP</b> — they can change hands during the game.</li>
    <li>⛵ <b>Seafarers mode</b> (pick it on the main menu): a bigger map of islands! Build <b>ships</b> (1🪵 1🐑) on the water to reach new islands — roads and ships together count for the <b>Longest Trade Route</b>. Starting settlements go on the main island.</li>
    <li>⭐ <b>Discovery bonus:</b> in Seafarers, your first settlement on each new island earns <b>+2 VP</b> (marked ⭐ on the board). First to <b>13 VP</b> wins!</li>
    <li>🪙 <b>Gold fields</b> (Seafarers): when a gold hex's number is rolled, settlements next to it take that many resources of <i>any</i> kind — you choose!</li>
    <li>🏴‍☠️ <b>The Pirate</b> (Seafarers): on a roll of 7, choose the robber <i>or</i> the pirate. The pirate sits on a sea hex: no new ships can be built around it, ships there can't move, and you steal 1 card from a ship owner next to it.</li>
    <li>↔️ <b>Move a ship</b> (Seafarers): once per turn, free — pick up a ship at the open end of your route and place it on another water edge (Build tab → Move Ship).</li>
    <li>⏱️ <b>Turn timer:</b> 60 seconds per turn — the ring around <b>End Turn</b> counts down. Run out and the game rolls (if you haven't) and passes your turn.</li>
    <li>🏆 First to <b>10 VP</b> wins! Settlement = 1 VP, City = 2 VP.</li>
    <li>🤖 <b>Solo mode:</b> practice against computer opponents from the main menu.</li>
    <li>🌐 <b>Online:</b> create a room, share the 4-letter code, friends join from their own phones. No accounts needed!</li>
    <li>📱 <b>App:</b> use your browser's "Add to Home Screen" to launch Family Catan like an app — it even works offline.</li>
    <li>👆 <b>Quick build:</b> on your turn, every road, settlement spot and city you can afford glows — just tap a glowing spot to build it. No buttons needed.</li>
    <li>🔍 <b>Zoom:</b> scroll or pinch to zoom in and out, drag to pan, double-tap or tap the ⤢ button to fit the whole board. Everything stays tappable.</li>
    <li>💾 <b>Auto-save:</b> your game is saved automatically — switch apps and come back, then resume from the menu.</li>
  </ul>
  <div class="btnrow"><button class="btn primary" id="rulesOk">Got it!</button></div>`)
  .querySelector('#rulesOk').onclick=closeOverlay;
}

/* ================= Rendering ================= */
function shade(hex,f){
  // darken/lighten a #rrggbb color by factor f (clamped)
  const n=parseInt(hex.slice(1),16);
  const c=v=>Math.max(0,Math.min(255,Math.round(v*f)));
  return `rgb(${c((n>>16)&255)},${c((n>>8)&255)},${c(n&255)})`;
}
function drawHouse(g,x,y,w,color,cls,isCity){
  // 2.5D markers: ground shadow + shaded edges. Settlements are houses; cities are castle towers.
  const grp=el('g',{class:cls},g);
  const h=w*0.72, y0=y-h*0.08;
  el('ellipse',{cx:x.toFixed(1), cy:(y+h*0.52).toFixed(1), rx:(w*0.62).toFixed(1), ry:(w*0.18).toFixed(1), fill:'rgba(0,0,0,.28)'},grp);
  if(isCity){
    // Castle tower with battlements — a clearly different shape from a house
    const cw=w*1.12, ch=h*1.18, x0=x-cw/2;
    el('rect',{x:x0.toFixed(1), y:y0.toFixed(1), width:cw.toFixed(1), height:ch.toFixed(1),
      fill:color, stroke:'#222','stroke-width':2.5},grp);
    el('rect',{x:(x0+cw*0.72).toFixed(1), y:y0.toFixed(1), width:(cw*0.28).toFixed(1), height:ch.toFixed(1),
      fill:'rgba(0,0,0,.18)'},grp);
    const merlonW=cw/5, merlonH=ch*0.24;
    for(let mi=0;mi<3;mi++){
      el('rect',{x:(x0+mi*2*merlonW).toFixed(1), y:(y0-merlonH).toFixed(1), width:merlonW.toFixed(1), height:merlonH.toFixed(1),
        fill:shade(color,1.15), stroke:'#222','stroke-width':2},grp);
    }
    el('rect',{x:(x-cw*0.12).toFixed(1), y:(y0+ch*0.55).toFixed(1), width:(cw*0.24).toFixed(1), height:(ch*0.45).toFixed(1),
      fill:'#4a2c15', stroke:'#222','stroke-width':1.5},grp);
    el('rect',{x:(x-cw*0.08).toFixed(1), y:(y0+ch*0.16).toFixed(1), width:(cw*0.16).toFixed(1), height:(ch*0.2).toFixed(1),
      fill:'#ffe9a8', stroke:'#222','stroke-width':1.5},grp);
    return grp;
  }
  el('rect',{x:(x-w/2).toFixed(1), y:y0.toFixed(1), width:w.toFixed(1), height:(h*0.58).toFixed(1),
    fill:color, stroke:'#222','stroke-width':2.5},grp);
  el('rect',{x:(x+w/2-w*0.22).toFixed(1), y:y0.toFixed(1), width:(w*0.22).toFixed(1), height:(h*0.58).toFixed(1),
    fill:'rgba(0,0,0,.18)'},grp);
  const apex=`${x.toFixed(1)},${(y0-w*0.5).toFixed(1)}`;
  el('polygon',{points:`${(x-w/2-2).toFixed(1)},${y0.toFixed(1)} ${x.toFixed(1)},${y0.toFixed(1)} ${apex}`,
    fill:shade(color,1.18), stroke:'#222','stroke-width':2.5,'stroke-linejoin':'round'},grp);
  el('polygon',{points:`${x.toFixed(1)},${y0.toFixed(1)} ${(x+w/2+2).toFixed(1)},${y0.toFixed(1)} ${apex}`,
    fill:shade(color,0.78), stroke:'#222','stroke-width':2.5,'stroke-linejoin':'round'},grp);
  el('rect',{x:(x-w*0.11).toFixed(1), y:(y0+h*0.58-h*0.3).toFixed(1), width:(w*0.22).toFixed(1), height:(h*0.3).toFixed(1),
    fill:'#5a3a20'},grp);
  return grp;
}
function renderPorts(g){
  if(!S.ports) return;
  const c=S.boardCx||{x:0,y:0};
  S.ports.forEach(pt=>{
    const v=S.vertices[pt.vertex]; if(!v) return;
    const dx=v.x-c.x, dy=v.y-c.y, len=Math.hypot(dx,dy)||1;
    const bx=v.x+dx/len*42, by=v.y+dy/len*42;
    el('line',{x1:v.x.toFixed(1),y1:v.y.toFixed(1),x2:bx.toFixed(1),y2:by.toFixed(1),
      stroke:'rgba(255,255,255,.65)','stroke-width':3,'stroke-dasharray':'5 4'},g);
    const pg=el('g',{class:'port'},g);
    const owned=v.owner>=0;
    el('circle',{cx:bx.toFixed(1),cy:(by+3).toFixed(1),r:20,fill:'rgba(0,0,0,.25)'},pg);
    el('circle',{cx:bx.toFixed(1),cy:by.toFixed(1),r:20,fill:'#fffdf6',
      stroke:owned?S.players[v.owner].color:'#d4a017','stroke-width':3},pg);
    const at=el('text',{x:bx.toFixed(1),y:(by-2).toFixed(1),'text-anchor':'middle','font-size':'15'},pg);
    at.textContent='⚓';
    const rt=el('text',{x:bx.toFixed(1),y:(by+14).toFixed(1),'text-anchor':'middle','font-size':'11','font-weight':'bold'},pg);
    rt.textContent=RES_ICON[pt.res]+' 2:1';
  });
}
/* ---- Board pinch-zoom / pan (stays fully interactive) ---- */
const ZOOM={s:1,tx:0,ty:0};
function zoomCenter(){
  const svg=$('board'); if(!svg) return {x:0,y:0};
  const vb=svg.viewBox.baseVal;
  return {x:vb.x+vb.width/2, y:vb.y+vb.height/2};
}
function applyZoom(){
  const zr=document.querySelector('#zoomRoot'); if(!zr) return;
  const c=zoomCenter();
  zr.setAttribute('transform',
    `translate(${(c.x+ZOOM.tx).toFixed(1)} ${(c.y+ZOOM.ty).toFixed(1)}) scale(${ZOOM.s.toFixed(3)}) translate(${(-c.x).toFixed(1)} ${(-c.y).toFixed(1)})`);
}
function resetZoom(){ ZOOM.s=1; ZOOM.tx=0; ZOOM.ty=0; applyZoom(); }
function initBoardGestures(){
  const wrap=$('boardWrap'); if(!wrap||wrap.__gestures) return; wrap.__gestures=true;
  // Drag-to-pan is driven through TWO independent paths (classic touch events, and
  // pointer events for mouse/pen tracked on window) — whichever a browser honors,
  // one of them moves the board. #boardWrap/#board carry touch-action:none in CSS.
  let dragging=false, moved=false, suppressClick=false, lastTap=0, lastTapX=-999, lastTapY=-999, sx=0, sy=0;
  let pinch0=0, s0=1, tx0=0, ty0=0, cx0=0, cy0=0;
  const px2units=()=>{ const svg=$('board'); const r=svg.getBoundingClientRect(); const vb=svg.viewBox.baseVal; return vb.width/Math.max(1,r.width); };
  const clampPan=()=>{ const vb=$('board').viewBox.baseVal; const mx=vb.width*0.75, my=vb.height*0.75;
    ZOOM.tx=Math.max(-mx,Math.min(mx,ZOOM.tx)); ZOOM.ty=Math.max(-my,Math.min(my,ZOOM.ty)); };
  function dragStart(x,y){ sx=x; sy=y; moved=false; dragging=true; }
  function dragMove(x,y){
    if(!dragging||ZOOM.s<=1.02) return;
    const dx=x-sx, dy=y-sy;
    if(Math.hypot(dx,dy)>8) moved=true;
    if(moved){ const k=px2units(); ZOOM.tx+=dx*k; ZOOM.ty+=dy*k; sx=x; sy=y; clampPan(); applyZoom(); }
  }
  function dragEnd(x,y){
    if(!dragging) return;
    dragging=false;
    if(moved){ suppressClick=true; } // eat the click that follows a pan
    else{
      const now=Date.now();
      // zoom reset only on a true double-tap (same spot) — quick taps on different build spots must not eat the second tap
      const nearLast=Math.hypot(x-lastTapX,y-lastTapY)<48;
      if(nearLast&&now-lastTap<300&&Math.abs(ZOOM.s-1)>0.05){ resetZoom(); suppressClick=true; }
      lastTap=now; lastTapX=x; lastTapY=y;
    }
    moved=false;
  }
  // --- touch path ---
  wrap.addEventListener('touchstart',e=>{
    if(e.touches.length===2){
      const a=e.touches[0], b=e.touches[1];
      pinch0=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
      s0=ZOOM.s; tx0=ZOOM.tx; ty0=ZOOM.ty;
      cx0=(a.clientX+b.clientX)/2; cy0=(a.clientY+b.clientY)/2;
      dragging=false;
    }else if(e.touches.length===1){
      dragStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  },{passive:true});
  wrap.addEventListener('touchmove',e=>{
    if(e.touches.length===2){
      const a=e.touches[0], b=e.touches[1];
      const d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
      if(pinch0>0){
        e.preventDefault();
        const k=px2units();
        ZOOM.s=Math.min(4,Math.max(0.55,s0*d/pinch0));
        ZOOM.tx=tx0+((a.clientX+b.clientX)/2-cx0)*k; ZOOM.ty=ty0+((a.clientY+b.clientY)/2-cy0)*k;
        clampPan(); applyZoom(); moved=true;
      }
    }else if(e.touches.length===1&&dragging){
      dragMove(e.touches[0].clientX, e.touches[0].clientY);
      if(moved) e.preventDefault(); // once it's a pan, the page must not scroll
    }
  },{passive:false});
  wrap.addEventListener('touchend',e=>{
    if(e.touches.length===0){
      const t=e.changedTouches&&e.changedTouches[0];
      if(t) dragEnd(t.clientX,t.clientY);
      pinch0=0;
    }
  });
  wrap.addEventListener('touchcancel',()=>{ dragging=false; moved=false; pinch0=0; });
  // --- mouse/pen path (pointer events; touch pointers are handled above) ---
  wrap.addEventListener('pointerdown',e=>{
    if(e.pointerType==='touch') return;
    if(e.button!==undefined&&e.button!==0) return;
    dragStart(e.clientX,e.clientY);
  });
  if(window.addEventListener){
    window.addEventListener('pointermove',e=>{
      if(e.pointerType==='touch') return;
      dragMove(e.clientX,e.clientY);
    });
    window.addEventListener('pointerup',e=>{
      if(e.pointerType==='touch') return;
      dragEnd(e.clientX,e.clientY);
    });
  }
  wrap.addEventListener('click',e=>{
    if(suppressClick){ e.stopPropagation(); e.preventDefault(); suppressClick=false; }
  },true);
  wrap.addEventListener('wheel',e=>{
    const f=e.deltaY<0?1.12:1/1.12;
    const ns=Math.min(4,Math.max(0.55,ZOOM.s*f));
    if(ns===ZOOM.s) return; // already at the limit — let the page scroll instead of trapping the wheel
    e.preventDefault();
    ZOOM.s=ns;
    applyZoom();
  },{passive:false});
}
function renderBoard(){
  const svg=$('board'); if(!svg||!S) return;
  let zr=svg.querySelector('#zoomRoot');
  if(!zr){ zr=el('g',{id:'zoomRoot'},svg); }
  zr.innerHTML='';
  const g=el('g',{id:'boardContent'},zr);
  let minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
  S.hexes.forEach(h=>{
    const c=hexCenter(h.q,h.r), corners=hexCorners(c.x,c.y);
    corners.forEach(p=>{ minX=Math.min(minX,p.x); minY=Math.min(minY,p.y); maxX=Math.max(maxX,p.x); maxY=Math.max(maxY,p.y); });
  });
  const pad=S.variant==='sea'?64:105;
  let vx=minX-pad, vy=minY-pad, vw=maxX-minX+pad*2, vh=maxY-minY+pad*2;
  // a new board (new game / online start) always opens fully fitted — zoom never leaks across games
  if(renderBoard._gid!==S.gid){ renderBoard._gid=S.gid; ZOOM.s=1; ZOOM.tx=0; ZOOM.ty=0; applyZoom(); }
  // expand the viewBox to the frame's aspect ratio so the board fills it exactly — no empty band on either side
  const bwEl=$('boardWrap');
  const fw=bwEl?bwEl.clientWidth:0, fh=bwEl?bwEl.clientHeight:0;
  if(fw>40&&fh>40){
    const ta=fw/fh, ca=vw/vh;
    if(ta>ca){ const nw=vh*ta; vx-=(nw-vw)/2; vw=nw; }
    else if(ca>ta){ const nh=vw/ta; vy-=(nh-vh)/2; vh=nh; }
  }
  svg.setAttribute('viewBox',`${vx} ${vy} ${vw} ${vh}`);
  if(S.variant==='sea'){
    el('rect',{x:vx, y:vy, width:vw, height:vh, fill:'#2f6db3'},g);
    // ocean fills the whole frame too, so the board never looks "cut off" in a taller frame
    if(bwEl) bwEl.style.background='#2f6db3';
  }else{
    if(bwEl) bwEl.style.background='';
  }
  S.hexes.forEach(h=>{
    const c=hexCenter(h.q,h.r), corners=hexCorners(c.x,c.y);
    const raiderOk=S.mode==='moveRobber'&&(S.movingPirate?(h.terrain==='sea'&&h.id!==S.pirateHex):(h.terrain!=='sea'&&!h.fog&&h.id!==S.robberHex));
    const hg=el('g',{class:'hex'+(raiderOk?' robber-ok':'')},g);
    hg.addEventListener('click',()=>uiHexClick(h.id));
    // 2.5D: extruded tile base beneath the top face
    const pts=corners.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ');
    const ptsD=corners.map(p=>p.x.toFixed(1)+','+(p.y+9).toFixed(1)).join(' ');
    el('polygon',{points:ptsD, fill:shade((h.fog?FOG_T:TERRAIN[h.terrain]).color,0.55), stroke:'#0a2a18','stroke-width':2},hg);
    el('polygon',{points:pts, fill:(h.fog?FOG_T:TERRAIN[h.terrain]).color, stroke:'#0f3d22','stroke-width':2},hg);
    const t=el('text',{x:c.x, y:c.y-14, 'text-anchor':'middle','font-size':'30'},hg);
    t.textContent=(h.fog?FOG_T:TERRAIN[h.terrain]).icon;
    if(h.number!==null&&!h.fog){
      const hot=(h.number===6||h.number===8);
      el('circle',{cx:c.x, cy:c.y+25, r:17, fill:'rgba(0,0,0,.25)'},hg);
      el('circle',{cx:c.x, cy:c.y+22, r:17, fill:'#f7f3e8', stroke:'#555','stroke-width':1.5},hg);
      const nt=el('text',{x:c.x, y:c.y+29, 'text-anchor':'middle','font-size':'20','font-weight':'bold', fill:hot?'#c0392b':'#222'},hg);
      nt.textContent=h.number;
      const dt=el('text',{x:c.x, y:c.y+42, 'text-anchor':'middle','font-size':'10', fill:hot?'#c0392b':'#222'},hg);
      dt.textContent='•'.repeat(h.number<=7?h.number-1:13-h.number);
    }
    if(h.id===S.robberHex){
      const rt=el('text',{x:c.x, y:c.y+4, 'text-anchor':'middle','font-size':'34'},hg);
      rt.textContent='🕵️';
    }
    if(h.id===S.pirateHex){
      const pt=el('text',{x:c.x, y:c.y+16, 'text-anchor':'middle','font-size':'36'},hg);
      pt.textContent='🏴‍☠️';
    }
  });
  for(const ek in S.edges){
    const e=S.edges[ek];
    if(e.owner>=0){
      const a=S.vertices[e.a], b=S.vertices[e.b];
      if(e.kind==='ship'){
        el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'road',stroke:S.players[e.owner].color,'stroke-width':6},g);
        const st=el('text',{x:(a.x+b.x)/2, y:(a.y+b.y)/2+7, 'text-anchor':'middle','font-size':'19'},g);
        st.textContent='⛵';
      }else{
        el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'road',stroke:S.players[e.owner].color,'stroke-width':8},g);
        el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'road',stroke:'rgba(0,0,0,.25)','stroke-width':8,'stroke-dasharray':'2 10'},g);
      }
    }
  }
  const canPlace=canActAs(S.turn);
  const em0=effMode();
  // During play, spots you can afford glow automatically — tap one to build (no Build button needed).
  const playOK=canPlace&&S.phase==='play'&&!S.pending&&S.mode!=='moveRobber';
  const showRoads=canPlace&&(S.mode==='setupRoad'||(playOK&&(em0==='buildRoad'||S.freeRoads>0||canAfford(S.players[S.turn],COSTS.road))));
  if(showRoads){
    for(const ek in S.edges){
      const e=S.edges[ek];
      const ok=S.mode==='setupRoad'?(e.owner===-1&&edgeValidUI(e)):(e.owner===-1&&roadValid(e,S.turn));
      // coastal edges that can also take a ship are rendered by the ship-spot pass (tap asks road or ship)
      const shipToo=playOK&&S.variant==='sea'&&e.owner===-1&&shipValid(e,S.turn)&&canAfford(S.players[S.turn],COSTS.ship);
      if(ok&&!shipToo){
        const a=S.vertices[e.a], b=S.vertices[e.b];
        const l=el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'espot'},g);
        l.addEventListener('click',ev=>{ev.stopPropagation();
          if(S.mode==='setupRoad'||effMode()==='buildRoad') onEdgeTap(ek); else onPlaceTap('road',ek);});
      }
    }
  }
  const showShips=playOK&&S.variant==='sea'&&canAfford(S.players[S.turn],COSTS.ship);
  if(showShips){
    for(const ek in S.edges){
      const e=S.edges[ek];
      if(e.owner!==-1||!shipValid(e,S.turn)) continue;
      const a=S.vertices[e.a], b=S.vertices[e.b];
      const roadToo=roadValid(e,S.turn)&&(S.freeRoads>0||canAfford(S.players[S.turn],COSTS.road));
      const l=el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:roadToo?'espot both':'sspot'},g);
      l.addEventListener('click',ev=>{ev.stopPropagation();
        if(roadToo) showBuildChooser(ek); else onPlaceTap('ship',ek);});
    }
  }
  // Move-a-ship: tap one of your movable ships (free end of a route), then a glowing target edge.
  if(effMode()!=='moveShip') pickedShip=null;
  const moveOK=canPlace&&S.phase==='play'&&!S.pending&&S.variant==='sea'&&effMode()==='moveShip'&&!S.shipMoved;
  if(moveOK){
    if(pickedShip&&!shipMovable(S.edges[pickedShip],S.turn)) pickedShip=null;
    if(!pickedShip){
      for(const ek in S.edges){
        const e=S.edges[ek];
        if(!shipMovable(e,S.turn)) continue;
        const a=S.vertices[e.a], b=S.vertices[e.b];
        const l=el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'sspot'},g);
        l.addEventListener('click',ev=>{ ev.stopPropagation(); pickedShip=ek; refresh(); });
      }
    }else{
      const from=S.edges[pickedShip];
      const fa=S.vertices[from.a], fb=S.vertices[from.b];
      el('line',{x1:fa.x,y1:fa.y,x2:fb.x,y2:fb.y,class:'espot both'},g);
      from.owner=-1; const fromKind=from.kind; from.kind=null;
      for(const ek in S.edges){
        const e=S.edges[ek];
        if(ek===pickedShip||e.owner!==-1||!shipValid(e,S.turn)) continue;
        const a=S.vertices[e.a], b=S.vertices[e.b];
        const l=el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'sspot'},g);
        l.addEventListener('click',ev=>{ ev.stopPropagation();
          const fromKey=pickedShip; pickedShip=null;
          sendOrDo({kind:'moveShip', from:fromKey, to:ek}); });
      }
      from.owner=S.turn; from.kind=fromKind;
    }
  }
  for(const k in S.vertices){
    const v=S.vertices[k];
    if(v.owner>=0){
      const col=S.players[v.owner].color;
      const grp=v.kind==='city'?drawHouse(g,v.x,v.y,30,col,'city',true):drawHouse(g,v.x,v.y,24,col,'settlement',false);
      // the house itself is the upgrade button — no need to hit the small ring precisely
      // (houses are pointer-events:none by CSS so they don't block hex taps; re-enable for this one)
      if(grp&&v.kind==='settlement'&&v.owner===S.turn&&canPlace&&S.phase==='play'&&!S.pending&&S.mode!=='moveRobber'){
        grp.style.pointerEvents='all';
        grp.setAttribute('cursor','pointer');
        grp.addEventListener('click',ev=>{ ev.stopPropagation(); cityTap(k); });
      }
    }
  }
  if(S.chitAt){
    for(const k in S.chitAt){
      const v=S.vertices[k]; if(!v) continue;
      const t=el('text',{x:v.x+17, y:v.y+19, 'text-anchor':'middle','font-size':'15'},g);
      t.textContent='⭐';
    }
  }
  renderPorts(g);
  applyZoom();
  const showSettle=canPlace&&(S.mode==='setupSettlement'||(playOK&&(em0==='buildSettlement'||canAfford(S.players[S.turn],COSTS.settlement))));
  const showCity=playOK; // upgrade spots always show on your settlements during your turn (dimmed if unaffordable)
  if(showSettle||showCity){
    for(const k in S.vertices){
      const v=S.vertices[k];
      if(S.mode==='setupSettlement'){
        if(vertexValidUI(v)){
          const hitS=el('circle',{cx:v.x,cy:v.y,r:26,class:'hitspot'},g);
          hitS.addEventListener('click',ev=>{ev.stopPropagation(); onVertexTap(k);});
          const c=el('circle',{cx:v.x,cy:v.y,r:13,class:'vspot'},g);
          c.addEventListener('click',ev=>{ev.stopPropagation(); onVertexTap(k);});
        }
      }else if(showCity&&v.owner===S.turn&&v.kind==='settlement'){
        const affordCity=canAfford(S.players[S.turn],COSTS.city);
        const hit=el('circle',{cx:v.x,cy:v.y,r:31,class:'hitspot'},g);
        hit.addEventListener('click',ev=>{ev.stopPropagation(); cityTap(k);});
        const c=el('circle',{cx:v.x,cy:v.y,r:21,class:'vspot city'+(affordCity?'':' cant')},g);
        c.addEventListener('click',ev=>{ev.stopPropagation(); cityTap(k);});
      }else if(showSettle&&v.owner===-1&&settleValid(v,S.turn)){
        const hitT=el('circle',{cx:v.x,cy:v.y,r:26,class:'hitspot'},g);
        hitT.addEventListener('click',ev=>{ev.stopPropagation();
          if(effMode()==='buildSettlement') onVertexTap(k); else onPlaceTap('settlement',k);});
        const c=el('circle',{cx:v.x,cy:v.y,r:13,class:'vspot'},g);
        c.addEventListener('click',ev=>{ev.stopPropagation();
          if(effMode()==='buildSettlement') onVertexTap(k); else onPlaceTap('settlement',k);});
      }
    }
  }
}
function roadCount(i){ let n=0; for(const k in S.edges) if(S.edges[k].owner===i) n++; return n; }
function escHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function renderPlayerStats(){
  const elc=$('playerStats'); if(!elc||!S) return;
  elc.innerHTML='';
  const tn=$('turnNow');
  if(tn) tn.textContent=S.players[S.turn] ? "— "+S.players[S.turn].name+"'s turn" : '';
  S.players.forEach((p,i)=>{
    const d=document.createElement('div'); d.className='pstat'+(i===S.turn?' turn':'');
    const badges=(p.hasLongest?'🛣️':'')+(p.hasLargestArmy?'⚔️':'');
    d.innerHTML=`<span class="dot" style="background:${p.color}"></span>`+
      `<span class="nm">${escHtml(p.name)}</span>`+
      (i===S.turn?`<span class="turnChip">▶ TURN</span>`:'')+
      (badges?`<span class="badge">${badges}</span>`:'')+
      `<span class="nums">🂠${totalCards(p)} 🧙${p.dev?p.dev.length:0} ⚔️${p.knights||0} 🛣️${roadCount(i)}</span>`+
      `<span class="vp">${vp(p)} VP</span>`;
    elc.appendChild(d);
  });
}
let shownRes=null, gainFxTimer=null, gainFxHtml='';
// Whose hand the side panel shows: online = always mine. Local/solo = the current
// player when they're human (hotseat), otherwise the device owner's (first human's) —
// so a bot's or another player's hand details never leak; others show as card counts only.
function resViewIdx(){
  if(!S||!S.players.length) return 0;
  if(NET.mode==='online') return NET.myIdx;
  const cp=S.players[S.turn];
  if(cp&&!cp.isBot) return S.turn;
  const h=S.players.findIndex(p=>!p.isBot);
  return h>=0?h:S.turn;
}
function renderRes(){
  const bar=$('resBar'); if(!bar||!S) return; bar.innerHTML='';
  const me=S.players[resViewIdx()];
  if(!me) return;
  const idx=S.players.indexOf(me);
  if(!shownRes||shownRes.idx!==idx) shownRes={idx:idx, res:{...me.res}};
  // spending shows instantly; gains wait for the card fanfare (see scheduleGainFx)
  RES.forEach(r=>{ if(me.res[r]<shownRes.res[r]) shownRes.res[r]=me.res[r]; });
  const shownTotal=RES.reduce((s,r)=>s+shownRes.res[r],0);
  $('resTitle').textContent='Resources — '+me.name+' ('+shownTotal+' cards)';
  const gained={}; let anyGain=false;
  RES.forEach(r=>{ const d=me.res[r]-shownRes.res[r]; if(d>0){ gained[r]=d; anyGain=true; } });
  RES.forEach(r=>{
    const d=document.createElement('div'); d.className='res'; d.id='res-'+r;
    d.innerHTML=`${RES_ICON[r]} ${shownRes.res[r]}<small>${RES_NAME[r]}</small>`;
    bar.appendChild(d);
  });
  if(anyGain) scheduleGainFx(gained, idx);
}
function scheduleGainFx(gained, idx){
  const fx=$('gainFx'); if(!fx) return;
  const html=Object.keys(gained).map(r=>`<span class="gainChip">+${gained[r]} ${RES_ICON[r]}</span>`).join('');
  if(html!==gainFxHtml){ gainFxHtml=html; fx.innerHTML=html; }
  fx.classList.remove('fade'); fx.classList.add('show');
  if(gainFxTimer) return; // already counting down — the chips above just refreshed
  gainFxTimer=setTimeout(()=>{
    gainFxTimer=null;
    const me=S&&S.players[idx];
    if(!me||!shownRes||shownRes.idx!==idx){ fx.classList.remove('show'); gainFxHtml=''; return; }
    let steps=0;
    const iv=setInterval(()=>{
      steps++; let done=true;
      RES.forEach(r=>{
        const target=me.res[r], curV=shownRes.res[r];
        if(curV<target){ shownRes.res[r]=Math.min(target, curV+Math.max(1,Math.ceil((target-curV)/2))); }
        if(shownRes.res[r]<target) done=false;
        const tile=$('res-'+r);
        if(tile){ tile.innerHTML=`${RES_ICON[r]} ${shownRes.res[r]}<small>${RES_NAME[r]}</small>`; if(gained[r]) tile.classList.add('bump'); }
      });
      const shownTotal=RES.reduce((s,r)=>s+shownRes.res[r],0);
      const rt=$('resTitle'); if(rt) rt.textContent='Resources — '+me.name+' ('+shownTotal+' cards)';
      if(done||steps>10){
        clearInterval(iv);
        RES.forEach(r=>{ shownRes.res[r]=me.res[r]; const tile=$('res-'+r); if(tile) tile.innerHTML=`${RES_ICON[r]} ${me.res[r]}<small>${RES_NAME[r]}</small>`; });
        fx.classList.add('fade');
        setTimeout(()=>{ fx.classList.remove('show','fade'); fx.innerHTML=''; gainFxHtml=''; },420);
      }
    },95);
  },3000);
}
function renderDev(){
  const hand=$('devHand'); if(!hand||!S) return; hand.innerHTML='';
  const me=S.players[resViewIdx()]||null;
  if(!me||!me.dev) return;
  const showPlay=S.phase==='play'&&!isBot(S.turn)&&(NET.mode==='local'||S.turn===NET.myIdx);
  me.dev.forEach(c=>{
    const info=DEV_INFO[c.t];
    const d=document.createElement('div'); d.className='res';
    d.innerHTML=`${info.icon}<small>${info.name}${c.fresh?' · NEW':''}${c.t==='vp'?' · +1 VP':''}</small>`;
    if(showPlay&&!c.fresh&&c.t!=='vp'){
      const b=document.createElement('button'); b.className='btn'; b.style.marginTop='4px'; b.textContent='Play';
      b.onclick=()=>playDevCard(c.t);
      d.appendChild(b);
    }
    hand.appendChild(d);
  });
  const left=S.devDeck?S.devDeck.length:0;
  const buy=$('buyDevBtn');
  if(buy){ buy.innerHTML=`🧙 Dev Card<br><small>1🌾 1🐑 1⛰️</small>`; buy.title=left+' cards left in deck'; }
}
function playDevCard(t){
  if(!S||S.phase!=='play') return;
  if(!canActAs(S.turn)||isBot(S.turn)) return;
  sendOrDo({kind:'playDev', what:t});
}
function renderLog(){
  const d=$('log'); if(!d||!S) return; d.innerHTML='';
  S.log.forEach(m=>{ const x=document.createElement('div'); x.textContent=m; d.appendChild(x); });
}
function setHint(t){ if(typeof document==='undefined') return; const h=$('hint'); if(h) h.innerHTML=t; }
function refresh(){
  if(!S) return;
  renderBoard(); renderRes(); renderDev(); renderLog(); renderOfferBox(); syncDeck(); renderPlayerStats();
  const mine=canActAs(S.turn)&&!isBot(S.turn);
  const interactive=S.phase==='play'&&mine;
  $('rollBtn').disabled=!(interactive&&!S.rolled);
  $('rollBtn').classList.toggle('turn-glow', interactive&&!S.rolled);
  const playTab=document.querySelector('.tabbtn[data-tab="play"]');
  if(playTab) playTab.classList.toggle('notify', interactive&&!S.rolled&&uiTab!=='play');
  $('endTurnBtn').disabled=!(interactive&&S.rolled);
  const canBuild=interactive&&S.mode!=='moveRobber';
  $('buildRoad').disabled=!canBuild; $('buildSettle').disabled=!canBuild;
  $('buildCity').disabled=!canBuild; $('bankTradeBtn').disabled=!canBuild;
  $('offerTradeBtn').disabled=!canBuild;
  $('buyDevBtn').disabled=!(canBuild&&S.devDeck&&S.devDeck.length>0);
  // dim buttons the player can't afford (still tappable; applyAct validates)
  const meRes=(NET.mode==='local'?cur():(S.players[NET.myIdx]||{res:{}})).res||{};
  const afford=c=>Object.keys(c).every(r=>(meRes[r]||0)>=c[r]);
  $('buildRoad').classList.toggle('cant',canBuild&&!afford(COSTS.road));
  const shipBtn=$('buildShip');
  if(shipBtn){
    const sea=S.variant==='sea';
    shipBtn.style.display=sea?'':'none';
    if(sea){ shipBtn.disabled=!canBuild; shipBtn.classList.toggle('cant',canBuild&&!afford(COSTS.ship)); }
  }
  const moveBtn=$('moveShipBtn');
  if(moveBtn){
    const sea=S.variant==='sea';
    moveBtn.style.display=sea?'':'none';
    if(sea){ moveBtn.disabled=!(canBuild&&!S.shipMoved); moveBtn.classList.toggle('cant',canBuild&&!!S.shipMoved); }
  }
  $('buildSettle').classList.toggle('cant',canBuild&&!afford(COSTS.settlement));
  $('buildCity').classList.toggle('cant',canBuild&&!afford(COSTS.city));
  $('buyDevBtn').classList.toggle('cant',canBuild&&!(S.devDeck&&S.devDeck.length&&afford(DEV_COST)));
  // rolled dice badge next to the board
  const badge=$('rollBadge');
  if(badge){
    if(S.rolled&&S.dice&&S.phase==='play'){
      badge.style.display='flex';
      if(!badge.classList.contains('rolling')) badge.innerHTML=diceSVG(S.dice[0])+diceSVG(S.dice[1]);
    }else{
      badge.style.display='none';
    }
  }
}

/* ================= Google profile (optional sign-in) =================
   Client-side only: name & photo come straight from the Google ID token and
   are kept in localStorage, so the profile shows up on every visit and the
   menu name is pre-filled. Sign-in is optional — the game works without it.
   Set GOOGLE_CLIENT_ID from Google Cloud Console (OAuth > Web client) with
   https://gbharatchand.github.io as an authorized JavaScript origin. */
const GOOGLE_CLIENT_ID='287413603234-tbsdr8bek402jnste9hif3ei6vq227du.apps.googleusercontent.com';
let PROFILE=null;
function loadProfile(){
  if(PROFILE) return PROFILE;
  try{ PROFILE=JSON.parse(localStorage.getItem('familycatan-profile-v1')||'null'); }catch(e){ PROFILE=null; }
  return PROFILE;
}
function saveProfile(p){
  PROFILE=p;
  try{
    if(p) localStorage.setItem('familycatan-profile-v1', JSON.stringify(p));
    else localStorage.removeItem('familycatan-profile-v1');
  }catch(e){}
}
function decodeJwt(t){
  let s=t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
  while(s.length%4) s+='=';
  return JSON.parse(decodeURIComponent(atob(s).split('').map(c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join('')));
}
function onGoogleCredential(resp){
  try{
    const d=decodeJwt(resp.credential);
    const full=d.name||d.given_name||'Player';
    saveProfile({ name:full, given:d.given_name||full.split(' ')[0], picture:d.picture||'', email:d.email||'', sub:d.sub||'' });
  }catch(e){ /* ignore a bad token */ }
  showMenu();
}
function googleReady(){
  return !!GOOGLE_CLIENT_ID&&typeof google!=='undefined'&&!!(google.accounts&&google.accounts.id);
}
function renderGoogleInto(elm){
  if(!googleReady()) return false;
  try{
    google.accounts.id.initialize({ client_id:GOOGLE_CLIENT_ID, callback:onGoogleCredential, auto_select:false });
    google.accounts.id.renderButton(elm,{ theme:'outline', size:'large', text:'signin_with', shape:'pill' });
    return true;
  }catch(e){ return false; }
}
function googleSignOut(){
  try{ if(typeof google!=='undefined'&&google.accounts&&google.accounts.id) google.accounts.id.disableAutoSelect(); }catch(e){}
  saveProfile(null);
  showMenu();
}
function profileBarHtml(){
  const p=loadProfile();
  if(p){
    return `<div class="profileBar"><img class="pavatar" src="${escapeHtml(p.picture||'')}" alt="" onerror="this.style.display='none'"><span>Signed in as <b>${escapeHtml(p.given||p.name)}</b></span><button class="btn small" id="gOut">Sign out</button></div>`;
  }
  if(!GOOGLE_CLIENT_ID) return '';
  return `<div class="profileBar"><div id="gBtn"></div><span class="pnote">Sign in to keep your name &amp; photo</span></div>`;
}

/* ================= Menu & lobby ================= */
let menuVariant='classic';
try{ menuVariant=localStorage.getItem('familycatan-variant')==='sea'?'sea':'classic'; }catch(e){}
function showMenu(){
  const save=loadSave();
  let resumeHtml='';
  if(save){
    if(save.net.mode==='local'){
      resumeHtml=`<div class="btnrow"><button class="btn green" id="mResume">▶ Resume last game (${save.S.players.length}P)</button></div>`;
    }else if(save.net.mode==='online'&&!save.net.isHost&&save.net.code){
      resumeHtml=`<div class="btnrow"><button class="btn green" id="mRejoin">🔄 Rejoin room ${escapeHtml(save.net.code)}</button></div>`;
    }
  }
  const ov=overlay(`<div class="menuHero">
      <img class="menuIcon" src="./icon-512.png" alt="Family Catan">
      <div class="menuTitle">Family Catan</div>
      <p id="menuSub">2–4 players. Build, trade, race to 10 points!</p>
    </div>
    <div class="btnrow" id="mVarRow">
      <button class="btn" id="mVarC">🏝️ Classic</button>
      <button class="btn" id="mVarS">⛵ Seafarers</button>
    </div>
    ${profileBarHtml()}
    ${resumeHtml}
    <input type="text" id="menuName" placeholder="Your name" maxlength="12">
    <div class="btnrow">
      <button class="btn" id="mSolo">🤖 Solo vs CPU</button>
      <button class="btn" id="mLocal">🎮 Same device</button>
      <button class="btn primary" id="mHost">🌐 Create online room</button>
    </div>
    <div class="tradeRow" style="margin-top:10px">
      <input type="text" id="mCode" placeholder="Room code" maxlength="4" style="width:130px;text-transform:uppercase">
      <button class="btn green" id="mJoin">Join room</button>
    </div>
    <p id="menuErr" style="color:#b03a2e;font-weight:700"></p>
    <p style="text-align:center;opacity:.45;font-size:.72rem;margin:6px 0 0">Family Catan v24</p>`);
  const name=()=>ov.querySelector('#menuName').value.trim()||'Player';
  const paintVar=()=>{
    ov.querySelector('#mVarC').classList.toggle('primary', menuVariant==='classic');
    ov.querySelector('#mVarS').classList.toggle('primary', menuVariant==='sea');
    const sub=ov.querySelector('#menuSub');
    if(sub) sub.textContent = menuVariant==='sea'
      ? '⛵ Seafarers: sail to new islands, earn +2 VP discovery bonuses — first to 13 VP wins!'
      : '2–4 players. Build, trade, race to 10 points!';
  };
  ov.querySelector('#mVarC').onclick=()=>{ menuVariant='classic'; try{ localStorage.setItem('familycatan-variant','classic'); }catch(e){} paintVar(); };
  ov.querySelector('#mVarS').onclick=()=>{ menuVariant='sea'; try{ localStorage.setItem('familycatan-variant','sea'); }catch(e){} paintVar(); };
  paintVar();
  const prof=loadProfile();
  if(prof){ const mn=ov.querySelector('#menuName'); if(mn) mn.value=(prof.given||prof.name||'').slice(0,12); }
  const gBtn=ov.querySelector('#gBtn');
  if(gBtn&&!renderGoogleInto(gBtn)) setTimeout(()=>{ const b2=document.querySelector('#gBtn'); if(b2) renderGoogleInto(b2); },1500);
  const gOut=ov.querySelector('#gOut');
  if(gOut) gOut.onclick=googleSignOut;
  const mr=ov.querySelector('#mResume');
  if(mr) mr.onclick=()=>resumeLocal(save);
  const rj=ov.querySelector('#mRejoin');
  if(rj) rj.onclick=async()=>{
    const err=ov.querySelector('#menuErr');
    err.textContent='Rejoining…';
    try{
      NET.mode='online';
      await joinRoom(save.net.code, save.net.myName||'Player', true);
      closeOverlay();
    }catch(e){ err.textContent=e.message; NET.mode=null; setNetStatus('offline','off'); }
  };
  ov.querySelector('#mLocal').onclick=()=>{
    closeOverlay();
    NET.mode='local'; NET.myIdx=0;
    showLocalSetup();
  };
  ov.querySelector('#mSolo').onclick=()=>{
    const nm=name();
    closeOverlay();
    const s2=overlay(`<h2>🤖 Solo vs Computer</h2>
      <p>You play as <b>${escapeHtml(nm)}</b>. How many computer opponents?</p>
      <div class="btnrow" id="botPick">
        <button class="btn" data-n="1">1</button>
        <button class="btn primary" data-n="2">2</button>
        <button class="btn" data-n="3">3</button>
      </div>
      <div class="btnrow"><button class="btn" id="soloBack">← Back</button></div>`);
    const startSolo=(bn)=>{
      closeOverlay();
      NET.mode='local'; NET.myIdx=0;
      const names=[nm], bots=[false];
      for(let k=1;k<=bn;k++){ names.push('CPU '+k); bots.push(true); }
      newGame(names,bots,menuVariant);
      setNetStatus('solo vs CPU','on');
      setHint(`${escapeHtml(nm)}: tap a highlighted spot for your settlement.`);
      refresh();
    };
    s2.querySelector('#botPick').addEventListener('click',e=>{
      const b=e.target.closest('button'); if(!b) return;
      startSolo(+b.dataset.n);
    });
    s2.querySelector('#soloBack').onclick=()=>{ closeOverlay(); showMenu(); };
  };
  ov.querySelector('#mHost').onclick=async()=>{
    const err=ov.querySelector('#menuErr');
    err.textContent='Creating room…';
    try{
      NET.mode='online';
      NET.variant=menuVariant;
      const code=await hostRoom(name());
      closeOverlay();
      showLobby(true);
    }catch(e){ err.textContent='Could not create room: '+e.message; NET.mode=null; }
  };
  ov.querySelector('#mJoin').onclick=async()=>{
    const err=ov.querySelector('#menuErr');
    const code=ov.querySelector('#mCode').value.trim().toUpperCase();
    if(code.length!==4){ err.textContent='Enter the 4-letter room code.'; return; }
    err.textContent='Joining…';
    try{
      NET.mode='online';
      await joinRoom(code,name());
      closeOverlay();
      showLobby(false);
    }catch(e){ err.textContent=e.message; NET.mode=null; setNetStatus('offline','off'); }
  };
}
function showLocalSetup(){
  let n=4;
  const ov=overlay(`<h2>🎮 Same Device</h2>
    <p>Pass-and-play on this phone. How many players?</p>
    <div class="btnrow" id="npick">
      <button class="btn" data-n="2">2</button>
      <button class="btn" data-n="3">3</button>
      <button class="btn primary" data-n="4">4</button>
    </div>
    <div id="nameFields"></div>
    <div class="btnrow"><button class="btn primary" id="startGo" style="font-size:1.1rem">▶ Start Game</button></div>`);
  const renderNames=()=>{
    const nf=ov.querySelector('#nameFields'); nf.innerHTML='';
    for(let i=0;i<n;i++){
      nf.innerHTML+=`<div class="pcolor-pick"><span class="dot" style="background:${PLAYER_COLORS[i].color}"></span><input type="text" id="pname${i}" placeholder="Player ${i+1} name" maxlength="12"></div>`;
    }
  };
  renderNames();
  const prof2=loadProfile();
  if(prof2){ const f0=ov.querySelector('#pname0'); if(f0) f0.value=(prof2.given||prof2.name||'').slice(0,12); }
  ov.querySelector('#npick').addEventListener('click',e=>{
    const b=e.target.closest('button'); if(!b) return;
    n=+b.dataset.n;
    [...ov.querySelectorAll('#npick .btn')].forEach(x=>x.classList.remove('primary'));
    b.classList.add('primary'); renderNames();
  });
  ov.querySelector('#startGo').onclick=()=>{
    const names=[];
    for(let i=0;i<n;i++){ const v=ov.querySelector('#pname'+i).value.trim(); names.push(v||('Player '+(i+1))); }
    closeOverlay();
    newGame(names,undefined,menuVariant);
    setNetStatus('same device','on');
    setHint(`${cur().name}: tap a highlighted spot for your settlement.`);
    refresh();
  };
}
function showLobby(isHost){
  // non-modal persistent lobby rendered into overlayRoot
  closeOverlay();
  const ov=overlay(`<h2>🌐 ${isHost?'Room created!':'Joined!'}</h2>
    <p>Share this code with family:</p>
    <div class="roomCode">${NET.code}</div>
    ${isHost?`<p>Mode: <b>${NET.variant==='sea'?'⛵ Seafarers (first to 13 VP)':'🏝️ Classic (first to 10 VP)'}</b></p>`:''}
    <div id="lobbyList"></div>
    ${isHost?'<div class="btnrow"><button class="btn primary" id="startGameBtn">▶ Start Game</button></div>':'<p>Waiting for the host to start…</p>'}
    <p style="font-size:.8rem;color:#666">Everyone opens <b>this same page</b> and joins with the code. No accounts needed.</p>`);
  NET.lobbyOv=ov;
  renderLobby();
  if(isHost){
    ov.querySelector('#startGameBtn').onclick=()=>{
      if(NET.lobbyPlayers.length<2){ alert('Need at least 2 players to start.'); return; }
      const names=NET.lobbyPlayers.map(p=>p.name);
      newGame(names,undefined,NET.variant);
      NET.started=true; NET.myIdx=0;
      for(const idx in NET.conns){ try{ NET.conns[idx].send({t:'state', s:serializeState()}); }catch(e){} }
      closeLobbyIfOpen();
      setHint(`${cur().name}: tap a highlighted spot for your settlement.`);
      refresh();
    };
  }
}
function renderLobby(){
  const list=document.querySelector('#lobbyList');
  if(!list) return;
  list.innerHTML=NET.lobbyPlayers.map((p,i)=>
    `<div class="lobbyPlayer"><span class="dot" style="background:${p.color}"></span>${escapeHtml(p.name)}${i===0?' (host)':''}</div>`
  ).join('');
}
function closeLobbyIfOpen(){
  if(NET.lobbyOv){ NET.lobbyOv.remove(); NET.lobbyOv=null; }
}

/* ================= Boot ================= */
let uiTab='play';
function setTab(t){
  uiTab=t;
  if(typeof document==='undefined') return;
  document.querySelectorAll('.tabbtn').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));
  document.querySelectorAll('.tabpane').forEach(p=>p.classList.toggle('active',p.id==='pane-'+t));
}
function boot(){
  $('rollBtn').onclick=uiRoll;
  $('endTurnBtn').onclick=uiEndTurn;
  $('buildRoad').onclick=()=>uiSetBuildMode('buildRoad');
  $('buildShip').onclick=()=>uiSetBuildMode('buildShip');
  $('moveShipBtn').onclick=()=>uiSetBuildMode('moveShip');
  $('buildSettle').onclick=()=>uiSetBuildMode('buildSettlement');
  $('buildCity').onclick=()=>uiSetBuildMode('buildCity');
  $('bankTradeBtn').onclick=()=>{ if(S&&canActAs(S.turn)&&!isBot(S.turn)&&S.phase==='play') bankTradeUI(); };
  $('offerTradeBtn').onclick=()=>{ if(S&&canActAs(S.turn)&&!isBot(S.turn)&&S.phase==='play') offerTradeUI(); };
  $('buyDevBtn').onclick=()=>{ if(S&&canActAs(S.turn)&&!isBot(S.turn)&&S.phase==='play') sendOrDo({kind:'buyDev'}); };
  $('dcDeck').onclick=()=>{ if(S&&canActAs(S.turn)&&!isBot(S.turn)&&S.phase==='play') sendOrDo({kind:'buyDev'}); };
  $('restartBtn').onclick=()=>{ if(confirm('Restart the game? Current progress will be lost.')){ clearSave(); location.reload(); } };
  const fitB=$('fitBtn'); if(fitB) fitB.onclick=()=>{ resetZoom(); };
  document.querySelectorAll('.tabbtn').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
  initBoardGestures();
  if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }
  window.addEventListener('pagehide', saveGame);
  document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='hidden') saveGame(); });
  if(window.addEventListener) window.addEventListener('resize', ()=>{ clearTimeout(window.__rzT); window.__rzT=setTimeout(()=>{ if(S) refresh(); },200); });
  setInterval(tickTimer, 500);
  setNetStatus('offline','');
  showMenu();
}
if(typeof document!=='undefined'){ boot(); }
