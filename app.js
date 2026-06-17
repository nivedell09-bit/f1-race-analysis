// ══════════════════════════════════════════════════════
//  EXACTLY 10 GRID CANDIDATES / DRIVERS
// ══════════════════════════════════════════════════════
const DRIVERS = [
  {abbr:"VER",name:"M. VERSTAPPEN", team:"Red Bull",   color:"#3671C6", number:1,  avgLap:87.89, bestLap:87.294},
  {abbr:"SAI",name:"C. SAINZ",      team:"Ferrari",    color:"#E8002D", number:55, avgLap:88.12, bestLap:87.651},
  {abbr:"LEC",name:"C. LECLERC",    team:"Ferrari",    color:"#E8002D", number:16, avgLap:88.34, bestLap:87.820},
  {abbr:"PER",name:"S. PEREZ",      team:"Red Bull",   color:"#3671C6", number:11, avgLap:88.56, bestLap:88.103},
  {abbr:"NOR",name:"L. NORRIS",     team:"McLaren",    color:"#FF8000", number:4,  avgLap:89.02, bestLap:88.510},
  {abbr:"HAM",name:"L. HAMILTON",   team:"Mercedes",   color:"#27F4D2", number:44, avgLap:89.24, bestLap:88.730},
  {abbr:"RUS",name:"G. RUSSELL",    team:"Mercedes",   color:"#63C3D1", number:63, avgLap:89.45, bestLap:88.940},
  {abbr:"ALO",name:"F. ALONSO",     team:"Aston Martin",color:"#358C75",number:14, avgLap:89.67, bestLap:89.120},
  {abbr:"STR",name:"L. STROLL",     team:"Aston Martin",color:"#358C75",number:18, avgLap:89.89, bestLap:89.340},
  {abbr:"PIA",name:"O. PIASTRI",    team:"McLaren",    color:"#FF8000", number:81, avgLap:90.12, bestLap:89.560}
];

const TOTAL_LAPS = 57;
const COMPOUNDS = {
  SOFT:  {color:"#E8002D", label:"S"},
  MEDIUM:{color:"#FFD700", label:"M"},
  HARD:  {color:"#E0E0E0", label:"H"},
};

// Global Arrays tracking compound performance telemetry streams across ticks
let historicalSoftLaps = [87.8];
let historicalMediumLaps = [88.9];
let historicalHardLaps = [89.8];

// ══════════════════════════════════════════════════════
//  CIRCUIT PATH GENERATION (Catmull-Rom)
// ══════════════════════════════════════════════════════
const W = 680, H = 360;
const RAW_PTS = [
  [0.50,0.09],[0.58,0.08],[0.66,0.09],[0.73,0.12],[0.80,0.17],
  [0.85,0.23],[0.87,0.30],[0.86,0.37],[0.82,0.43],[0.76,0.47],
  [0.72,0.50],[0.74,0.55],[0.77,0.61],[0.77,0.67],[0.74,0.73],
  [0.68,0.78],[0.61,0.81],[0.53,0.82],[0.45,0.80],[0.38,0.76],
  [0.32,0.70],[0.27,0.63],[0.22,0.56],[0.18,0.49],[0.15,0.41],
  [0.13,0.33],[0.14,0.25],[0.17,0.19],[0.22,0.14],[0.29,0.11],
  [0.37,0.09],[0.44,0.08],[0.50,0.09],
].map(([x,y])=>({x:x*W,y:y*H}));

function catmullRom(pts, steps=400){
  const res=[], n=pts.length;
  for(let i=0;i<n-1;i++){
    const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(n-1,i+2)];
    const seg=Math.floor(steps/(n-1));
    for(let t=0;t<seg;t++){
      const u=t/seg,u2=u*u,u3=u2*u;
      const x=.5*((2*p1.x)+(-p0.x+p2.x)*u+(2*p0.x-5*p1.x+4*p2.x-p3.x)*u2+(-p0.x+3*p1.x-3*p2.x+p3.x)*u3);
      const y=.5*((2*p1.y)+(-p0.y+p2.y)*u+(2*p0.y-5*p1.y+4*p2.y-p3.y)*u2+(-p0.y+3*p1.y-3*p2.y+p3.y)*u3);
      res.push({x,y});
    }
  }
  return res;
}
const TRACK = catmullRom(RAW_PTS, 500);

function trackPos(progress){
  const idx=Math.floor(((progress%1+1)%1)*(TRACK.length-1));
  return TRACK[idx]||TRACK[0];
}

// ══════════════════════════════════════════════════════
//  CAR STATE MANAGEMENT
// ══════════════════════════════════════════════════════
function makeCars(){
  return DRIVERS.map((d,i)=>({
    ...d,
    lap: 0,
    progress: i * (-0.012), 
    speed: 290 + Math.random()*60,
    tire: i<4 ? "SOFT" : i<7 ? "MEDIUM" : "HARD", 
    tireWear: 2,
    inPit: false,
    pitDone: false,
    pitLap: 14 + Math.floor(Math.random()*8),
    pos: i+1,
    gap: 0,
    lapTimes: [],
  }));
}

let cars = makeCars();
let animRunning = false;
let animSpeed = 4;
let animTimer = null;
let currentLap = 0;

// ══════════════════════════════════════════════════════
//  CANVAS CORE GRAPHICS RENDERER
// ══════════════════════════════════════════════════════
const canvas = document.getElementById("trackCanvas");
const ctx = canvas.getContext("2d");

function drawTrack(){
  ctx.clearRect(0,0,W,H);
  const bg=ctx.createRadialGradient(W/2,H/2,60,W/2,H/2,420);
  bg.addColorStop(0,"#0d0d1a"); bg.addColorStop(1,"#05050a");
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

  ctx.strokeStyle="rgba(255,255,255,0.025)"; ctx.lineWidth=1;
  for(let x=0;x<W;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
  for(let y=0;y<H;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}

  const drawPath=(lw,color,dash=[])=>{
    ctx.beginPath();
    TRACK.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
    ctx.closePath(); ctx.strokeStyle=color; ctx.lineWidth=lw;
    ctx.setLineDash(dash); ctx.stroke(); ctx.setLineDash([]);
  };

  drawPath(26,"rgba(30,30,55,0.9)");   
  drawPath(22,"#1a1a30");               
  drawPath(22,"rgba(255,255,255,0.04)",[14,22]); 
  drawPath(1,"rgba(255,255,255,0.10)",[6,14]);   

  const sf=TRACK[0];
  ctx.font="bold 9px Courier New"; ctx.fillStyle="rgba(232,0,45,0.8)";
  ctx.fillText("S/F START",sf.x+10,sf.y-5);
}

function drawCars(){
  cars.forEach(car=>{
    if(car.inPit) return;
    const p=trackPos(car.progress);
    
    const grd=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,12);
    grd.addColorStop(0,car.color+"66"); grd.addColorStop(1,"transparent");
    ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(p.x,p.y,12,0,Math.PI*2); ctx.fill();

    ctx.beginPath(); ctx.arc(p.x,p.y,6,0,Math.PI*2);
    ctx.fillStyle=car.color; ctx.fill();
    ctx.strokeStyle="#fff"; ctx.lineWidth=1; ctx.stroke();

    ctx.font="bold 9px Courier New"; ctx.fillStyle=car.color;
    ctx.fillText(car.abbr,p.x+9,p.y+4);
  });
}

function render() { drawTrack(); drawCars(); }

// ══════════════════════════════════════════════════════
//  LIVE TICK SIMULATION LOOP ENGINE
// ══════════════════════════════════════════════════════
function animStep(){
  if(!animRunning) return;

  cars = cars.map(car=>{
    if(car.inPit) return car;

    const baseFrac = 0.0020;
    const varFrac = baseFrac + (Math.random()*0.0004 - 0.0002);
    let newProg = car.progress + varFrac * (1 - (car.pos-1)*0.001);

    let newLap = car.lap;
    if(Math.floor(newProg) > Math.floor(car.progress)){
      newLap = car.lap + 1;
      const lapT = car.avgLap + (Math.random()*1.0-0.5) + (car.tireWear * 0.012);
      car.lapTimes = [...car.lapTimes, +lapT.toFixed(3)];

      // Segment historical telemetry by compound
      if(car.tire === "SOFT") historicalSoftLaps.push(lapT);
      else if(car.tire === "MEDIUM") historicalMediumLaps.push(lapT);
      else if(car.tire === "HARD") historicalHardLaps.push(lapT);

      // CRITICAL REAL-TIME INTERSECTION HOOK: Refresh downstream charts on cross-over
      if (document.getElementById("tab-telemetry").classList.contains("active")) {
         const targetTraceIdx = DRIVERS.findIndex(d => d.abbr === car.abbr);
         if (targetTraceIdx >= 0 && targetTraceIdx < 10) {
             Plotly.extendTraces('chartLap', { x: [[newLap]], y: [[+lapT.toFixed(3)]] }, [targetTraceIdx]);
         }
         
         // Direct multi-array mapping reduces recalculation overhead
         const softMean = historicalSoftLaps.reduce((a,b)=>a+b, 0) / historicalSoftLaps.length;
         const medMean = historicalMediumLaps.reduce((a,b)=>a+b, 0) / historicalMediumLaps.length;
         const hardMean = historicalHardLaps.reduce((a,b)=>a+b, 0) / historicalHardLaps.length;
         
         // Synchronously adjust height indices on the active layout engine
         Plotly.restyle('chartComp', 'y', [[softMean], [medMean], [hardMean]]);
      }
    }

    let newWear = car.tireWear + 0.3;
    let inPit = false;
    if(newLap === car.pitLap && !car.pitDone && newLap > 0){
      inPit = true;
      const overlay = document.getElementById("pitOverlay");
      overlay.textContent = `🔧 PIT LANE — ${car.abbr}`;
      overlay.style.display = "block";
      setTimeout(()=>{ overlay.style.display="none"; }, 1800);
    }

    return {...car, progress:newProg, lap:newLap, tireWear:newWear, inPit};
  });

  cars = cars.map(car=>{
    if(!car.inPit) return car;
    if(!car._pitStart){ car._pitStart = Date.now(); return car; }
    if(Date.now() - car._pitStart > 1800){
      const nextTire = car.tire === "SOFT" ? "MEDIUM" : "HARD";
      return {...car, inPit:false, pitDone:true, tireWear:1.0, tire:nextTire, _pitStart:null, progress:car.progress+0.02};
    }
    return car;
  });

  const sorted = [...cars].sort((a,b)=> b.progress - a.progress);
  cars = cars.map(car=>{
    const pos = sorted.findIndex(c=>c.abbr===car.abbr)+1;
    const gap = pos===1?0: +((sorted[0].progress - car.progress)*90).toFixed(1);
    return {...car, pos, gap};
  });

  currentLap = Math.min(Math.max(...cars.map(c=>c.lap)), TOTAL_LAPS);
  document.getElementById("animLap").textContent = currentLap;

  updateLeaderboard();
  render();

  if(currentLap >= TOTAL_LAPS){
    animRunning = false;
    document.getElementById("pitOverlay").textContent = `🏁 CHECKERED FLAG — RACE COMPLETE`;
    document.getElementById("pitOverlay").style.display = "block";
    return;
  }

  animTimer = setTimeout(animStep, Math.max(16, 120/animSpeed));
}

// ══════════════════════════════════════════════════════
//  DOM ROW INJECTIONS
// ══════════════════════════════════════════════════════
function updateLeaderboard(){
  const sorted=[...cars].sort((a,b)=>a.pos-b.pos);
  const list=document.getElementById("lbList");
  if(!list) return; list.innerHTML="";
  sorted.forEach((car,i)=>{
    const tire=COMPOUNDS[car.tire]||COMPOUNDS.SOFT;
    const health=Math.max(0,Math.round(100-car.tireWear));
    const row=document.createElement("div");
    row.className=`lb-row ${i===0?"p1":i===1?"p2":i===2?"p3":""}`;
    row.innerHTML=`
      <span class="lb-pos ${i===0?'lead':''}">P${car.pos}</span>
      <span class="lb-dot" style="background:${car.color}"></span>
      <span class="lb-name">${car.abbr}</span>
      <span class="lb-tire" style="background:${tire.color}22;color:${tire.color};border:1px solid ${tire.color}">${tire.label} ${health}%</span>
      <span class="lb-gap">${i===0?"LEAD":"+"+car.gap.toFixed(1)+"s"}</span>
    `;
    list.appendChild(row);
  });
}

// ══════════════════════════════════════════════════════
//  CORE EVENT CONTROLS
// ══════════════════════════════════════════════════════
document.getElementById("btnStart").onclick=()=>{ animRunning=true; animStep(); };
document.getElementById("btnPause").onclick=()=>{ animRunning=false; clearTimeout(animTimer); };
document.getElementById("btnReset").onclick=()=>{
  animRunning=false; clearTimeout(animTimer); cars=makeCars(); currentLap=0;
  historicalSoftLaps=[87.8]; historicalMediumLaps=[88.9]; historicalHardLaps=[89.8];
  document.getElementById("animLap").textContent="0";
  document.getElementById("pitOverlay").style.display="none";
  render(); updateLeaderboard();
};
document.getElementById("raceSpeed").oninput=function(){
  animSpeed=+this.value; document.getElementById("speedVal").textContent=this.value+"×";
};

// ══════════════════════════════════════════════════════
//  PLOTLY PLATFORM HOOKS
// ══════════════════════════════════════════════════════
const PC={displayModeBar:false,responsive:true};
const PL=(extra={})=>({
  paper_bgcolor:"transparent",plot_bgcolor:"transparent",
  font:{family:"Courier New",color:"#aaa",size:10},
  margin:{t:10,b:40,l:50,r:10},
  xaxis:{gridcolor:"#1a1a2e",zerolinecolor:"#222"},
  yaxis:{gridcolor:"#1a1a2e",zerolinecolor:"#222"},
  ...extra
});

function renderTelemetry() {
  const lapTraces = DRIVERS.map(d=>{
    const laps=Array.from({length:currentLap>0?currentLap:1},(_,i)=>i+1);
    const times=laps.map(l=>+(d.avgLap + (Math.random()*0.6-0.3)).toFixed(3));
    return {x:laps,y:times,mode:"lines",name:d.abbr,line:{color:d.color,width:1.5}};
  });
  Plotly.newPlot("chartLap",lapTraces,PL({xaxis:{title:"Lap"},yaxis:{title:"Lap Time (s)"}}),PC);

  // Read internal values synchronously to prevent trace jumping
  const sMean = historicalSoftLaps.reduce((a,b)=>a+b,0)/historicalSoftLaps.length;
  const mMean = historicalMediumLaps.reduce((a,b)=>a+b,0)/historicalMediumLaps.length;
  const hMean = historicalHardLaps.reduce((a,b)=>a+b,0)/historicalHardLaps.length;

  Plotly.newPlot("chartComp",[
    {x:["SOFT"],y:[sMean],type:"bar",name:"SOFT",marker:{color:"#E8002Daa",line:{color:"#E8002D",width:2}}},
    {x:["MEDIUM"],y:[mMean],type:"bar",name:"MEDIUM",marker:{color:"#FFD700aa",line:{color:"#FFD700",width:2}}},
    {x:["HARD"],y:[hMean],type:"bar",name:"HARD",marker:{color:"#E0E0E0aa",line:{color:"#E0E0E0",width:2}}}
  ],PL({yaxis:{title:"Mean Lap Time (s)",range:[85,93]},bargap:0.4,showlegend:false}),PC);

  const s1=DRIVERS.map(d=>+(d.avgLap*0.32).toFixed(3));
  const s2=DRIVERS.map(d=>+(d.avgLap*0.38).toFixed(3));
  const s3=DRIVERS.map(d=>+(d.avgLap*0.30).toFixed(3));
  Plotly.newPlot("chartSector",[
    {x:DRIVERS.map(d=>d.abbr),y:s1,type:"bar",name:"S1",marker:{color:"#E8002D"}},
    {x:DRIVERS.map(d=>d.abbr),y:s2,type:"bar",name:"S2",marker:{color:"#3671C6"}},
    {x:DRIVERS.map(d=>d.abbr),y:s3,type:"bar",name:"S3",marker:{color:"#27F4D2"}},
  ],PL({barmode:"group"}),PC);
}

function renderML(){
  const feats=[{n:"Tyre Age",v:0.31},{n:"Compound",v:0.22},{n:"SectorBalance",v:0.17},{n:"SpeedTrap",v:0.14},{n:"Driver",v:0.10},{n:"LapNumber",v:0.06}];
  Plotly.newPlot("chartFeat",[{
    x:feats.map(f=>f.v),y:feats.map(f=>f.n),type:"bar",orientation:"h",
    marker:{color:"#00D4AA"},text:feats.map(f=>(f.v*100).toFixed(0)+"%"),textposition:"outside"
  }],PL({margin:{t:10,b:30,l:110,r:40}}),PC);

  Plotly.newPlot("chartRank",[{
    x:DRIVERS.map(d=>d.avgLap),y:DRIVERS.map(d=>d.abbr),type:"bar",orientation:"h",
    marker:{color:DRIVERS.map(d=>d.color+"cc")}
  }],PL({xaxis:{range:[86,93]},yaxis:{autorange:"reversed"},height:320}),PC);
}

function renderAnomalies(){
  const traces=DRIVERS.slice(0,4).map(d=>({
    x:[12,24,36],y:[d.avgLap+3.2,d.avgLap+4.1,d.avgLap+2.9],mode:"markers",name:d.abbr,
    marker:{color:d.color,size:10,symbol:"circle-open",line:{width:2}}
  }));
  Plotly.newPlot("chartAnom",traces,PL({xaxis:{title:"Lap"},yaxis:{title:"Lap Time (s)"}}),PC);

  const tbody=document.getElementById("anomalyBody");
  if(!tbody) return; tbody.innerHTML="";
  DRIVERS.slice(0,3).forEach((d,i)=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td style="color:${d.color};font-weight:bold">${d.abbr}</td><td>${12*(i+1)}</td><td>${(d.avgLap+3.1).toFixed(3)}</td><td>${(d.avgLap+1.2).toFixed(3)}</td><td style="color:#E8002D">+1.900</td><td><span class="badge bm">MED</span></td>`;
    tbody.appendChild(tr);
  });
}

// ══════════════════════════════════════════════════════
//  LAZY TAB SWITCH ROUTER
// ══════════════════════════════════════════════════════
document.querySelectorAll(".tab-btn").forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p=>p.classList.remove("active"));
    btn.classList.add("active");
    const id="tab-"+btn.dataset.tab;
    document.getElementById(id).classList.add("active");
    
    if(id==="tab-telemetry") { renderTelemetry(); Plotly.Plots.resize('chartLap'); Plotly.Plots.resize('chartComp'); Plotly.Plots.resize('chartSector'); }
    if(id==="tab-ml")        { renderML(); Plotly.Plots.resize('chartFeat'); Plotly.Plots.resize('chartRank'); }
    if(id==="tab-anomaly")   { renderAnomalies(); Plotly.Plots.resize('chartAnom'); }
  };
});

// Run Initial Render Frame
render();
updateLeaderboard();