/* ====================================================================
 * FLOODGUARD - SMART DRAINAGE FLOOD MONITORING SYSTEM (ESP32)
 *
 * Hardware Wiring:
 *   - HC-SR04 / JSN-SR04T Ultrasonic Sensor:
 *       TRIG Pin -> ESP32 GPIO 5
 *       ECHO Pin -> ESP32 GPIO 18
 *       VCC Pin  -> 5V / VIN (or 3.3V depending on sensor module)
 *       GND Pin  -> GND
 *
 * Features:
 *   1. Real-time Ultrasonic Water Level Measurement
 *   2. Automatic HTTP POST sync to FastAPI Backend
 * (http://<BACKEND_IP>:8000/api/readings)
 *   3. Embedded Web Server Dashboard (http://<ESP32_IP>/)
 *   4. Formatted USB Serial Telemetry (115200 baud)
 * ==================================================================== */

#include <HTTPClient.h>
#include <WebServer.h>
#include <WiFi.h>

// ==================================================
// SENSOR PIN DEFINITIONS
// ==================================================
#define TRIG 5
#define ECHO 18

// ==================================================
// CALIBRATION PARAMETERS (Centimetres)
// ==================================================
const float SENSOR_HEIGHT =
    50.0; // Distance from sensor face to drainage bottom
const float MIN_SENSOR_DISTANCE = 25.0; // Sensor blind-zone threshold

const float WARNING_LEVEL = 15.0;  // Threshold (cm) for WARNING state
const float DANGER_LEVEL = 22.0;   // Threshold (cm) for DANGER state
const float CRITICAL_LEVEL = 25.0; // Threshold (cm) for CRITICAL state

// ==================================================
// WI-FI CREDENTIALS
// ==================================================
const char *ssid = "Galaxy M35 5G 002A";
const char *password = "1234567809";

// ==================================================
// BACKEND CONFIGURATION
// ==================================================
// Backend Laptop IP: hotspot DHCP changes it; re-check with: ipconfig getifaddr en0
const char *backendUrl = "http://10.73.61.16:8000/api/readings";
const char *deviceId = "esp32-01";
const char *zoneId = "Z001"; // Demo zone cell (in-city on the map, beside documented hotspots)

// Timing intervals
const unsigned long SENSOR_READ_INTERVAL_MS = 1000; // Read sensor every 1 sec
const unsigned long BACKEND_POST_INTERVAL_MS =
    3000; // Send reading to backend every 3 sec
const unsigned long SERIAL_STATUS_INTERVAL_MS =
    5000; // Print serial summary every 5 sec
const unsigned long WIFI_RETRY_INTERVAL_MS =
    10000; // Wi-Fi reconnect retry interval

// ==================================================
// WEB SERVER (Port 80)
// ==================================================
WebServer server(80);

// ==================================================
// RUNTIME STATE
// ==================================================
float currentDistance = 0.0;
float currentWaterLevel = 0.0;
String currentStatus = "SAFE";
bool sensorValid = false;

// Backend sync state
int lastBackendStatus = 0;
String lastRiskLevel = "SAFE";
float lastProbability = 0.0;
unsigned long lastPostTime = 0;
unsigned long lastSensorTime = 0;
unsigned long lastStatusTime = 0;
unsigned long lastWifiRetry = 0;

// ==================================================
// EMBEDDED DASHBOARD (HTML + CSS + JS in PROGMEM)
// ==================================================
const char MAIN_PAGE[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>FloodGuard &mdash; Drainage Monitoring</title>
<meta name="description" content="Real-time drainage flood monitoring powered by ESP32">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
--bg:#0a1628;--card:#111d2e;--card-h:#162538;
--brd:rgba(255,255,255,0.06);
--tx:#e2e8f0;--tx2:#7a8ba0;--tx3:#4a5568;
--safe:#00d68f;--warn:#ffaa00;--dang:#ff6b35;--crit:#ff3d5a;
--acc:#3b82f6;--rad:14px;
--f:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;
--m:'SF Mono','Cascadia Code','Fira Code',Consolas,monospace;
}
html{font-size:16px}
body{background:var(--bg);color:var(--tx);font-family:var(--f);line-height:1.5;min-height:100vh;-webkit-font-smoothing:antialiased}

/* --- Header --- */
header{background:rgba(13,26,45,0.85);border-bottom:1px solid var(--brd);position:sticky;top:0;z-index:100;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
.h-in{max-width:960px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;padding:12px 20px}
.brand{display:flex;align-items:center;gap:10px}
.brand svg{width:20px;height:20px;fill:var(--acc);flex-shrink:0}
.brand span{font-weight:800;font-size:14px;letter-spacing:2.5px;color:var(--tx)}
.h-r{display:flex;align-items:center;gap:16px}
.conn{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--tx2);letter-spacing:0.5px}
.cd{width:7px;height:7px;border-radius:50%;background:var(--safe);animation:pls 2s ease-in-out infinite;flex-shrink:0}
.cd.off{background:var(--crit);animation:none}
.sb{background:none;border:none;cursor:pointer;color:var(--tx2);padding:4px;display:flex;align-items:center;transition:color .2s;border-radius:6px}
.sb:hover{color:var(--tx);background:rgba(255,255,255,0.05)}
.sb.mt{color:var(--crit)}
.sb svg{width:18px;height:18px}

/* --- Layout --- */
.ct{max-width:960px;margin:0 auto;padding:16px 20px}

/* --- Card --- */
.c{background:var(--card);border:1px solid var(--brd);border-radius:var(--rad);padding:20px;transition:background .25s}
.c:hover{background:var(--card-h)}
.ct-t{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--tx3);margin-bottom:14px}

/* --- Hero --- */
.hero{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:14px;padding:28px 32px;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;inset:0;opacity:0;transition:opacity .6s;border-radius:var(--rad);pointer-events:none}
.hero.st-safe::before{background:linear-gradient(135deg,rgba(0,214,143,0.06),transparent 50%);opacity:1}
.hero.st-warning::before{background:linear-gradient(135deg,rgba(255,170,0,0.06),transparent 50%);opacity:1}
.hero.st-danger::before{background:linear-gradient(135deg,rgba(255,107,53,0.07),transparent 50%);opacity:1}
.hero.st-critical::before{background:linear-gradient(135deg,rgba(255,61,90,0.09),transparent 50%);opacity:1}
.h-st{display:flex;flex-direction:column;gap:8px;flex:1;position:relative;z-index:1}
.h-lb{font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:var(--tx3)}
.h-val{font-size:52px;font-weight:800;letter-spacing:-1.5px;line-height:1;transition:color .4s}
.h-sub{font-size:12px;color:var(--tx2);margin-top:4px;font-weight:500}
.h-g{width:200px;height:160px;flex-shrink:0;position:relative;z-index:1}
.h-g canvas{width:100%;height:100%;display:block}

/* Status colors */
.safe{color:var(--safe)}.warning{color:var(--warn)}.danger{color:var(--dang)}.critical{color:var(--crit)}
.cp{animation:gc 1.5s ease-in-out infinite}

@keyframes pls{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes gc{0%,100%{text-shadow:0 0 20px rgba(255,61,90,.3)}50%{text-shadow:0 0 50px rgba(255,61,90,.7),0 0 100px rgba(255,61,90,.3)}}

/* --- Metrics --- */
.mets{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px}
.met{text-align:center;padding:20px 14px}
.met-lb{display:block;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--tx3);margin-bottom:10px}
.met-v{display:block;font-size:34px;font-weight:700;font-family:var(--m);font-variant-numeric:tabular-nums;letter-spacing:-.5px;color:var(--tx)}
.met-u{font-size:14px;color:var(--tx2);margin-left:2px;font-weight:500;font-family:var(--f)}
.met-tr{display:block;font-size:11px;margin-top:8px;color:var(--tx3);font-weight:600;letter-spacing:0.5px}
.tu{color:var(--warn)}.td{color:var(--safe)}.tf{color:var(--tx3)}

/* --- Backend Sync Status Card --- */
.bk-card{margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 20px}
.bk-badge{padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;font-family:var(--m);background:rgba(59,130,246,0.15);color:var(--acc)}

/* --- Graph --- */
.gc{margin-bottom:14px;padding:20px}
.gc canvas{width:100%;height:270px;display:block;border-radius:8px}

/* --- Stats --- */
.sts{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px}
.st{text-align:center;padding:16px 12px}
.st-lb{display:block;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--tx3);margin-bottom:6px}
.st-v{display:block;font-size:22px;font-weight:700;font-family:var(--m);color:var(--tx);font-variant-numeric:tabular-nums}

/* --- Alert Log --- */
.ac{margin-bottom:14px}
.al{max-height:200px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.1) transparent}
.al::-webkit-scrollbar{width:4px}
.al::-webkit-scrollbar-track{background:transparent}
.al::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}
.ai{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--brd);font-size:13px}
.ai:last-child{border-bottom:none}
.at{color:var(--tx3);font-family:var(--m);font-size:10px;white-space:nowrap;min-width:72px}
.ad{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.am{color:var(--tx2)}.am b{font-weight:600}
.al-lvl{margin-left:auto;font-family:var(--m);font-size:11px;font-weight:700;color:var(--tx);background:rgba(255,255,255,0.07);padding:2px 8px;border-radius:4px;letter-spacing:0.3px;white-space:nowrap}
.ae{color:var(--tx3);font-size:13px;text-align:center;padding:24px 0}

/* --- Update / Footer --- */
.uc{text-align:center;font-size:12px;color:var(--tx2);padding:14px;margin-bottom:14px}
.ft{text-align:center;padding:20px;font-size:11px;color:var(--tx3);letter-spacing:1.5px}

@media(max-width:640px){
.hero{flex-direction:column;text-align:center;padding:24px 20px}
.h-g{width:170px;height:136px}
.h-val{font-size:40px}
.h-st{align-items:center}
.mets,.sts{grid-template-columns:1fr}
.met-v{font-size:28px}
.h-in{padding:10px 16px}
.ct{padding:12px 14px}
.gc canvas{height:220px}
}
</style>
</head>
<body>

<header>
<div class="h-in">
<div class="brand">
<svg viewBox="0 0 24 24"><path d="M12 2C6.67 10 4 14 4 18a8 8 0 0016 0c0-4-2.67-8-8-16zm0 18a6 6 0 01-6-6c0-3 1.8-6.4 6-12.5C16.2 7.6 18 11 18 14a6 6 0 01-6 6z"/></svg>
<span>FLOODGUARD</span>
</div>
<div class="h-r">
<div class="conn">
<span class="cd" id="cdot"></span>
<span id="ctxt">Connecting</span>
</div>
<button class="sb" id="sbtn" title="Toggle alarm">
<svg id="sicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>
</button>
</div>
</div>
</header>

<main class="ct">

<!-- Hero: Status + Gauge -->
<section class="c hero st-safe" id="heroCard">
<div class="h-st">
<span class="h-lb">Current Status</span>
<div class="h-val safe" id="status">CONNECTING</div>
<div class="h-sub" id="statusSub">Initializing sensor&hellip;</div>
</div>
<div class="h-g">
<canvas id="gauge"></canvas>
</div>
</section>

<!-- Backend Sync Card -->
<section class="c bk-card">
<div>
  <div style="font-size:11px;font-weight:700;letter-spacing:1px;color:var(--tx3);text-transform:uppercase;">FastAPI Backend Status</div>
  <div style="font-size:13px;color:var(--tx);margin-top:2px;" id="bkInfo">Connecting to backend server...</div>
</div>
<div class="bk-badge" id="bkBadge">HTTP --</div>
</section>

<!-- Metrics -->
<section class="mets">
<div class="c met">
<span class="met-lb">Water Level</span>
<span class="met-v"><span id="wl">--</span><span class="met-u">cm</span></span>
<span class="met-tr tf" id="wlT">&mdash;</span>
</div>
<div class="c met">
<span class="met-lb">Sensor Distance</span>
<span class="met-v"><span id="dist">--</span><span class="met-u">cm</span></span>
<span class="met-tr tf" id="distT">Capacity: 50 cm</span>
</div>
<div class="c met">
<span class="met-lb">Rate of Change</span>
<span class="met-v"><span id="roc">--</span><span class="met-u">cm/min</span></span>
<span class="met-tr tf" id="rocT">&mdash;</span>
</div>
</section>

<!-- Graph -->
<section class="c gc">
<div class="ct-t">Water Level History</div>
<canvas id="graph"></canvas>
</section>

<!-- Session Stats -->
<section class="sts">
<div class="c st">
<span class="st-lb">Session Min</span>
<span class="st-v" id="smin">&mdash;</span>
</div>
<div class="c st">
<span class="st-lb">Session Max</span>
<span class="st-v" id="smax">&mdash;</span>
</div>
<div class="c st">
<span class="st-lb">Session Avg</span>
<span class="st-v" id="savg">&mdash;</span>
</div>
</section>

<!-- Alert Log -->
<section class="c ac">
<div class="ct-t">Alert Log</div>
<div class="al" id="alog">
<div class="ae">No alerts recorded</div>
</div>
</section>

<!-- Last Updated -->
<section class="c uc">
Last updated: <strong id="time">&mdash;</strong>
</section>

</main>

<footer class="ft">FloodGuard &bull; Real-Time Drainage Monitoring</footer>

<script>
var MP=40,ML=30,WN=15,DN=22,CR=25,SH=50;
var wH=[],tH=[],aLog=[];
var sMin=1e9,sMax=-1,sSum=0,sCnt=0;
var lSt=null,lWL=null,lTm=null,roc=0;
var fails=0,aCtx=null,alOn=true;
var curSt='SAFE',alLoop=null;

function $(id){return document.getElementById(id)}
var stEl=$('status'),wlEl=$('wl'),dEl=$('dist');
var rocEl=$('roc'),tmEl=$('time'),heroEl=$('heroCard');
var sMinEl=$('smin'),sMaxEl=$('smax'),sAvgEl=$('savg');
var wlT=$('wlT'),rocT=$('rocT'),stSub=$('statusSub');
var cDot=$('cdot'),cTxt=$('ctxt');
var aLogEl=$('alog');
var gCv=$('gauge'),grCv=$('graph');
var grCtx=grCv.getContext('2d');
var sBtn=$('sbtn'),sIcon=$('sicon');
var bkInfo=$('bkInfo'),bkBadge=$('bkBadge');

sBtn.onclick=function(){
  if(!aCtx){try{aCtx=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}
  alOn=!alOn;
  sBtn.classList.toggle('mt',!alOn);
  sBtn.title=alOn?'Alarm enabled (Click to mute)':'Alarm muted (Click to enable)';
  if(alOn){
    sIcon.innerHTML='<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/>';
    if(curSt==='CRITICAL')checkAlarmLoop('CRITICAL');
  }else{
    sIcon.innerHTML='<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>';
    stopAlarmLoop();
  }
};

function playBuzzerBurst(){
  if(!alOn)return;
  if(!aCtx){try{aCtx=new(window.AudioContext||window.webkitAudioContext)()}catch(e){return}}
  try{
    if(aCtx.state==='suspended')aCtx.resume();
    var now=aCtx.currentTime;
    for(var b=0;b<4;b++){
      var t=now+b*0.20;
      var osc=aCtx.createOscillator();
      var gain=aCtx.createGain();
      osc.type='square';
      osc.frequency.setValueAtTime(2600,t);
      osc.frequency.exponentialRampToValueAtTime(1800,t+0.12);
      gain.gain.setValueAtTime(0.28,t);
      gain.gain.setValueAtTime(0.28,t+0.10);
      gain.gain.linearRampToValueAtTime(0.001,t+0.12);
      osc.connect(gain);
      gain.connect(aCtx.destination);
      osc.start(t);
      osc.stop(t+0.13);
    }
  }catch(e){}
}

function checkAlarmLoop(status){
  curSt=status;
  if(status==='CRITICAL'&&alOn){
    if(!alLoop){
      playBuzzerBurst();
      alLoop=setInterval(function(){
        if(curSt==='CRITICAL'&&alOn)playBuzzerBurst();
        else stopAlarmLoop();
      },1500);
    }
  }else{
    stopAlarmLoop();
  }
}

function stopAlarmLoop(){
  if(alLoop){clearInterval(alLoop);alLoop=null;}
}

function stCol(s){
  if(s==='SAFE')return'var(--safe)';
  if(s==='WARNING')return'var(--warn)';
  if(s==='DANGER')return'var(--dang)';
  return'var(--crit)';
}
function stClass(s){return(s||'').toLowerCase()}

function stSubText(s){
  if(s==='SAFE')return'Water levels normal';
  if(s==='WARNING')return'Water rising \u2014 monitor closely';
  if(s==='DANGER')return'High water level \u2014 take precautions';
  if(s==='CRITICAL')return'\u26A0 Immediate action required';
  return'Sensor unavailable';
}

function addAlert(from,to,lvl){
  var now=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  aLog.unshift({time:now,from:from,to:to,level:lvl});
  if(aLog.length>30)aLog.pop();
  renderAlerts();
}
function renderAlerts(){
  if(!aLog.length){aLogEl.innerHTML='<div class="ae">No alerts recorded</div>';return}
  var h='';
  for(var i=0;i<aLog.length;i++){
    var a=aLog[i];
    var lv=(typeof a.level==='number')?a.level.toFixed(1):a.level;
    h+='<div class="ai">';
    h+='<span class="at">'+a.time+'</span>';
    h+='<span class="ad" style="background:'+stCol(a.to)+'"></span>';
    h+='<span class="am"><b style="color:'+stCol(a.from)+'">'+a.from+'</b> &rarr; <b style="color:'+stCol(a.to)+'">'+a.to+'</b></span>';
    h+='<span class="al-lvl">'+lv+' cm</span>';
    h+='</div>';
  }
  aLogEl.innerHTML=h;
}

function drawGauge(val){
  var dp=window.devicePixelRatio||1;
  var w=gCv.clientWidth,h=gCv.clientHeight;
  if(!w||!h)return;
  gCv.width=w*dp;gCv.height=h*dp;
  var c=gCv.getContext('2d');
  c.scale(dp,dp);

  var cx=w/2,cy=h*0.6;
  var r=Math.min(w,h)*0.36;
  var lw=r*0.15;
  var sa=Math.PI*0.75,ea=Math.PI*2.25,sw=ea-sa;

  c.strokeStyle='rgba(255,255,255,0.05)';
  c.lineWidth=lw;c.lineCap='round';
  c.beginPath();c.arc(cx,cy,r,sa,ea);c.stroke();

  var segs=[[0,15,'#00d68f'],[15,22,'#ffaa00'],[22,25,'#ff6b35'],[25,ML,'#ff3d5a']];
  for(var i=0;i<segs.length;i++){
    var sg=segs[i];
    c.strokeStyle=sg[2];c.lineWidth=lw;c.lineCap='round';
    c.beginPath();
    c.arc(cx,cy,r,sa+(sg[0]/ML)*sw,sa+(sg[1]/ML)*sw);
    c.stroke();
  }

  var nv=Math.min(Math.max(val,0),ML);
  var na=sa+(nv/ML)*sw;
  var nl=r*0.62;
  var nx=cx+Math.cos(na)*nl,ny=cy+Math.sin(na)*nl;

  c.strokeStyle='rgba(0,0,0,0.3)';c.lineWidth=4;c.lineCap='round';
  c.beginPath();c.moveTo(cx,cy);c.lineTo(nx,ny);c.stroke();

  c.strokeStyle='#e2e8f0';c.lineWidth=2.5;c.lineCap='round';
  c.beginPath();c.moveTo(cx,cy);c.lineTo(nx,ny);c.stroke();

  c.fillStyle='#1a2744';
  c.beginPath();c.arc(cx,cy,r*0.11,0,Math.PI*2);c.fill();
  c.fillStyle='#e2e8f0';
  c.beginPath();c.arc(cx,cy,r*0.05,0,Math.PI*2);c.fill();

  c.fillStyle='#e2e8f0';
  c.font='bold '+Math.round(r*0.34)+'px -apple-system,BlinkMacSystemFont,sans-serif';
  c.textAlign='center';c.textBaseline='middle';
  c.fillText(val.toFixed(1),cx,cy+r*0.42);

  c.fillStyle='#4a5568';
  c.font=Math.round(r*0.14)+'px -apple-system,BlinkMacSystemFont,sans-serif';
  c.fillText('of '+SH+' cm',cx,cy+r*0.64);
}

function drawGraph(){
  var dp=window.devicePixelRatio||1;
  var rect=grCv.getBoundingClientRect();
  var w=rect.width,h=rect.height;
  if(!w||!h)return;
  grCv.width=w*dp;grCv.height=h*dp;
  grCtx.scale(dp,dp);

  var pl=44,pr=14,pt=14,pb=26;
  var gw=w-pl-pr,gh=h-pt-pb;

  grCtx.clearRect(0,0,w,h);

  var yVals=[0,5,10,15,20,25,30];
  grCtx.strokeStyle='rgba(255,255,255,0.04)';
  grCtx.lineWidth=1;
  for(var i=0;i<yVals.length;i++){
    var yy=pt+gh-(yVals[i]/ML)*gh;
    grCtx.beginPath();grCtx.moveTo(pl,yy);grCtx.lineTo(pl+gw,yy);grCtx.stroke();
    grCtx.fillStyle='#3a4f65';
    grCtx.font='10px -apple-system,sans-serif';
    grCtx.textAlign='right';
    grCtx.fillText(yVals[i],pl-7,yy+3);
  }

  var ths=[[WN,'#ffaa00','Warning'],[DN,'#ff6b35','Danger'],[CR,'#ff3d5a','Critical']];
  for(var i=0;i<ths.length;i++){
    var tv=ths[i][0],tc=ths[i][1],tl=ths[i][2];
    var ty=pt+gh-(tv/ML)*gh;
    grCtx.strokeStyle=tc;grCtx.setLineDash([5,4]);grCtx.lineWidth=1;
    grCtx.beginPath();grCtx.moveTo(pl,ty);grCtx.lineTo(pl+gw,ty);grCtx.stroke();
    grCtx.setLineDash([]);
    grCtx.fillStyle=tc;grCtx.font='500 9px -apple-system,sans-serif';
    grCtx.textAlign='right';
    grCtx.fillText(tl,pl+gw-2,ty-5);
  }

  if(wH.length<2){
    grCtx.fillStyle='#3a4f65';
    grCtx.font='13px -apple-system,sans-serif';
    grCtx.textAlign='center';
    grCtx.fillText('Waiting for sensor data\u2026',w/2,h/2);
    return;
  }

  var pts=[];
  for(var i=0;i<wH.length;i++){
    pts.push({x:pl+(i/(MP-1))*gw,y:pt+gh-(wH[i]/ML)*gh});
  }

  var grd=grCtx.createLinearGradient(0,pt,0,pt+gh);
  grd.addColorStop(0,'rgba(59,130,246,0.22)');
  grd.addColorStop(1,'rgba(59,130,246,0.01)');
  grCtx.fillStyle=grd;
  grCtx.beginPath();
  grCtx.moveTo(pts[0].x,pt+gh);
  for(var i=0;i<pts.length;i++)grCtx.lineTo(pts[i].x,pts[i].y);
  grCtx.lineTo(pts[pts.length-1].x,pt+gh);
  grCtx.closePath();grCtx.fill();

  grCtx.strokeStyle='#3b82f6';grCtx.lineWidth=2.5;
  grCtx.lineJoin='round';grCtx.lineCap='round';
  grCtx.beginPath();
  for(var i=0;i<pts.length;i++){
    if(i===0)grCtx.moveTo(pts[i].x,pts[i].y);
    else grCtx.lineTo(pts[i].x,pts[i].y);
  }
  grCtx.stroke();

  grCtx.fillStyle='#3b82f6';
  for(var i=0;i<pts.length;i++){
    grCtx.beginPath();grCtx.arc(pts[i].x,pts[i].y,2.5,0,Math.PI*2);grCtx.fill();
  }

  var lp=pts[pts.length-1];
  grCtx.fillStyle='rgba(59,130,246,0.2)';
  grCtx.beginPath();grCtx.arc(lp.x,lp.y,8,0,Math.PI*2);grCtx.fill();
  grCtx.fillStyle='#3b82f6';
  grCtx.beginPath();grCtx.arc(lp.x,lp.y,4,0,Math.PI*2);grCtx.fill();

  grCtx.fillStyle='#3a4f65';grCtx.font='9px -apple-system,sans-serif';grCtx.textAlign='center';
  var step=Math.max(1,Math.floor(wH.length/5));
  for(var i=0;i<tH.length;i++){
    if(i%step===0||i===tH.length-1){
      grCtx.fillText(tH[i],pl+(i/(MP-1))*gw,h-5);
    }
  }
}

function updateData(){
  fetch('/data')
  .then(function(r){return r.json()})
  .then(function(d){
    fails=0;
    cDot.classList.remove('off');
    cTxt.textContent='Connected';

    var wl=parseFloat(d.waterLevel);
    var dist=parseFloat(d.distance);
    var st=d.status;

    wlEl.textContent=d.waterLevel;
    dEl.textContent=d.distance;

    if(d.backend_status === 201){
      bkInfo.innerHTML='Synced to FastAPI &bull; Risk: <b>'+(d.backend_risk || 'OK')+'</b> (Prob: '+((d.backend_prob||0)*100).toFixed(0)+'%)';
      bkBadge.textContent='HTTP 201 OK';
      bkBadge.style.background='rgba(0,214,143,0.15)';
      bkBadge.style.color='var(--safe)';
    }else if(d.backend_status > 0){
      bkInfo.textContent='Backend responded with HTTP '+d.backend_status;
      bkBadge.textContent='HTTP '+d.backend_status;
      bkBadge.style.background='rgba(255,170,0,0.15)';
      bkBadge.style.color='var(--warn)';
    }else{
      bkInfo.textContent='Backend sync pending (Ensure start_backend.bat is running)';
      bkBadge.textContent='NO SYNC';
      bkBadge.style.background='rgba(255,61,90,0.15)';
      bkBadge.style.color='var(--crit)';
    }

    var sc=stClass(st);
    stEl.textContent=st;
    stEl.className='h-val';
    if(sc==='safe'||sc==='warning'||sc==='danger'||sc==='critical')stEl.classList.add(sc);
    if(sc==='critical')stEl.classList.add('cp');

    heroEl.className='c hero';
    if(sc==='safe'||sc==='warning'||sc==='danger'||sc==='critical')heroEl.classList.add('st-'+sc);

    stSub.textContent=stSubText(st);
    checkAlarmLoop(st);

    if(lSt!==null&&st!==lSt&&st!=='SENSOR ERROR'){
      addAlert(lSt,st,wl);
    }
    if(st!=='SENSOR ERROR')lSt=st;

    if(lWL!==null&&lTm!==null&&st!=='SENSOR ERROR'){
      var dt=(Date.now()-lTm)/60000;
      if(dt>0){
        var nr=(wl-lWL)/dt;
        roc=roc*0.6+nr*0.4;
        var rv=roc>=0?'+'+roc.toFixed(1):roc.toFixed(1);
        rocEl.textContent=rv;
        if(roc>0.5){rocT.textContent='\u25B2 Rising fast';rocT.className='met-tr tu'}
        else if(roc>0.1){rocT.textContent='\u25B2 Rising';rocT.className='met-tr tu'}
        else if(roc<-0.5){rocT.textContent='\u25BC Falling fast';rocT.className='met-tr td'}
        else if(roc<-0.1){rocT.textContent='\u25BC Falling';rocT.className='met-tr td'}
        else{rocT.textContent='Steady';rocT.className='met-tr tf'}
      }
    }

    if(st!=='SENSOR ERROR'){
      if(lWL!==null){
        var diff=wl-lWL;
        if(diff>0.05){wlT.textContent='\u25B2 Rising';wlT.className='met-tr tu'}
        else if(diff<-0.05){wlT.textContent='\u25BC Falling';wlT.className='met-tr td'}
        else{wlT.textContent='Stable';wlT.className='met-tr tf'}
      }

      wH.push(wl);
      tH.push(new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}));
      if(wH.length>MP){wH.shift();tH.shift()}

      if(wl<sMin)sMin=wl;
      if(wl>sMax)sMax=wl;
      sSum+=wl;sCnt++;
      sMinEl.textContent=sMin.toFixed(1)+' cm';
      sMaxEl.textContent=sMax.toFixed(1)+' cm';
      sAvgEl.textContent=(sSum/sCnt).toFixed(1)+' cm';

      lWL=wl;lTm=Date.now();
    }

    drawGauge(st!=='SENSOR ERROR'?wl:0);
    drawGraph();
    tmEl.textContent=new Date().toLocaleTimeString();
  })
  .catch(function(){
    fails++;
    if(fails>=3){
      cDot.classList.add('off');
      cTxt.textContent='Offline';
      stEl.textContent='CONNECTION LOST';
      stEl.className='h-val critical cp';
      heroEl.className='c hero st-critical';
      stSub.textContent='Unable to reach sensor';
    }
  });
}

setInterval(updateData,1000);
updateData();
drawGauge(0);
window.addEventListener('resize',function(){
  drawGauge(lWL||0);
  drawGraph();
});
</script>
</body>
</html>
)rawliteral";

// ==================================================
// SENSOR MEASUREMENT ROUTINE
// ==================================================
void readSensor() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);

  unsigned long duration =
      pulseIn(ECHO, HIGH, 30000); // 30ms timeout (~5.1 meters max)

  if (duration == 0) {
    sensorValid = false;
    Serial.println(F("[SENSOR] No echo received / Sensor timeout"));
    return;
  }

  float distance = duration / 58.0;

  // Reject out-of-range readings
  if (distance > (SENSOR_HEIGHT + 20.0) || distance < 1.0) {
    sensorValid = false;
    Serial.print(F("[SENSOR] Out of range distance: "));
    Serial.print(distance, 1);
    Serial.println(F(" cm"));
    return;
  }

  sensorValid = true;
  currentDistance = distance;

  // Calculate water level from surface distance
  currentWaterLevel = SENSOR_HEIGHT - distance;
  if (currentWaterLevel < 0.0) {
    currentWaterLevel = 0.0;
  }

  // Determine local status threshold
  if (distance <= MIN_SENSOR_DISTANCE || currentWaterLevel >= CRITICAL_LEVEL) {
    currentStatus = "CRITICAL";
  } else if (currentWaterLevel >= DANGER_LEVEL) {
    currentStatus = "DANGER";
  } else if (currentWaterLevel >= WARNING_LEVEL) {
    currentStatus = "WARNING";
  } else {
    currentStatus = "SAFE";
  }

  // USB Serial Telemetry Line (Easily parsed by serial_bridge.py)
  Serial.print(F("[SENSOR] Dist: "));
  Serial.print(currentDistance, 1);
  Serial.print(F(" cm | Level: "));
  Serial.print(currentWaterLevel, 1);
  Serial.print(F(" cm | Status: "));
  Serial.println(currentStatus);
}

// ==================================================
// POST READING TO FASTAPI BACKEND
// ==================================================
void postReadingToBackend() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  if (!sensorValid) {
    return;
  }

  HTTPClient http;
  http.begin(backendUrl);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(2500);

  // Build clean JSON string
  String payload = "{";
  payload += "\"device_id\":\"" + String(deviceId) + "\",";
  payload += "\"zone_id\":\"" + String(zoneId) + "\",";
  payload += "\"water_level_cm\":" + String(currentWaterLevel, 1) + ",";
  payload += "\"local_status\":\"" + currentStatus + "\",";
  payload += "\"rainfall_24h_mm\":0.0";
  payload += "}";

  int httpCode = http.POST(payload);
  lastBackendStatus = httpCode;

  if (httpCode > 0) {
    String response = http.getString();
    Serial.print(F("[BACKEND] POST OK (HTTP "));
    Serial.print(httpCode);
    Serial.print(F(") => "));
    Serial.println(response);

    // Extract risk_level
    int riskIdx = response.indexOf("\"risk_level\":\"");
    if (riskIdx != -1) {
      int endIdx = response.indexOf("\"", riskIdx + 14);
      if (endIdx != -1) {
        lastRiskLevel = response.substring(riskIdx + 14, endIdx);
      }
    }
    // Extract flood_probability
    int probIdx = response.indexOf("\"flood_probability\":");
    if (probIdx != -1) {
      int endIdx = response.indexOf(",", probIdx + 20);
      if (endIdx == -1)
        endIdx = response.indexOf("}", probIdx + 20);
      if (endIdx != -1) {
        lastProbability = response.substring(probIdx + 20, endIdx).toFloat();
      }
    }
  } else {
    Serial.print(F("[BACKEND] POST Failed! ("));
    Serial.print(http.errorToString(httpCode));
    Serial.println(F(")"));
  }

  http.end();
}

// ==================================================
// HTTP REQUEST HANDLERS
// ==================================================
void handleRoot() { server.send_P(200, "text/html", MAIN_PAGE); }

void handleData() {
  String json = "{";
  if (sensorValid) {
    json += "\"distance\":" + String(currentDistance, 1) + ",";
    json += "\"waterLevel\":" + String(currentWaterLevel, 1) + ",";
    json += "\"status\":\"" + currentStatus + "\",";
  } else {
    json += "\"distance\":0,";
    json += "\"waterLevel\":0,";
    json += "\"status\":\"SENSOR ERROR\",";
  }
  json += "\"backend_status\":" + String(lastBackendStatus) + ",";
  json += "\"backend_risk\":\"" + lastRiskLevel + "\",";
  json += "\"backend_prob\":" + String(lastProbability, 2);
  json += "}";

  server.send(200, "application/json", json);
}

// ==================================================
// SETUP
// ==================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  digitalWrite(TRIG, LOW);

  Serial.println();
  Serial.println(F("=================================================="));
  Serial.println(F("       FLOODGUARD ESP32 SENSOR NODE INITIALIZED   "));
  Serial.println(F("=================================================="));
  Serial.print(F("Device ID   : "));
  Serial.println(deviceId);
  Serial.print(F("Zone ID     : "));
  Serial.println(zoneId);
  Serial.print(F("Backend URL : "));
  Serial.println(backendUrl);
  Serial.print(F("Connecting to Wi-Fi: "));
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  unsigned long wifiStart = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - wifiStart < 12000)) {
    delay(400);
    Serial.print(F("."));
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F("[WIFI] Connected Successfully!"));
    Serial.print(F("[WIFI] ESP32 Web Dashboard: http://"));
    Serial.println(WiFi.localIP());
  } else {
    Serial.println(F("[WIFI] Timed out. Starting in offline/USB mode."));
  }

  // Setup Web Server Routes
  server.on("/", handleRoot);
  server.on("/data", handleData);
  server.begin();
  Serial.println(F("[HTTP] Local Web Server Started on Port 80."));
  Serial.println(F("=================================================="));

  // First sensor measurement
  readSensor();
}

// ==================================================
// MAIN EXECUTION LOOP
// ==================================================
void loop() {
  server.handleClient();

  unsigned long now = millis();

  // 1. Reconnect Wi-Fi in background if lost
  if (WiFi.status() != WL_CONNECTED &&
      (now - lastWifiRetry >= WIFI_RETRY_INTERVAL_MS)) {
    lastWifiRetry = now;
    Serial.println(F("[WIFI] Reconnecting to Wi-Fi..."));
    WiFi.disconnect();
    WiFi.begin(ssid, password);
  }

  // 2. Ultrasonic Sensor measurement every 1 second
  if (now - lastSensorTime >= SENSOR_READ_INTERVAL_MS) {
    lastSensorTime = now;
    readSensor();
  }

  // 3. Post to FastAPI backend every 3 seconds
  if (now - lastPostTime >= BACKEND_POST_INTERVAL_MS) {
    lastPostTime = now;
    postReadingToBackend();
  }

  // 4. Print structured telemetry summary to Serial every 5 seconds
  if (now - lastStatusTime >= SERIAL_STATUS_INTERVAL_MS) {
    lastStatusTime = now;
    Serial.println();
    Serial.println(F("--- [FLOODGUARD SUMMARY] ---"));
    Serial.print(F("Wi-Fi Status : "));
    Serial.println(WiFi.status() == WL_CONNECTED ? "ONLINE" : "OFFLINE");
    if (WiFi.status() == WL_CONNECTED) {
      Serial.print(F("ESP32 IP     : "));
      Serial.println(WiFi.localIP());
    }
    Serial.print(F("Water Level  : "));
    Serial.print(currentWaterLevel, 1);
    Serial.println(F(" cm"));
    Serial.print(F("Sensor Dist  : "));
    Serial.print(currentDistance, 1);
    Serial.println(F(" cm"));
    Serial.print(F("Local Status : "));
    Serial.println(currentStatus);
    Serial.print(F("Backend Sync : "));
    if (lastBackendStatus == 201) {
      Serial.print(F("HTTP 201 OK | Risk: "));
      Serial.print(lastRiskLevel);
      Serial.print(F(" | Prob: "));
      Serial.println(lastProbability, 3);
    } else {
      Serial.print(F("Code "));
      Serial.println(lastBackendStatus);
    }
    Serial.println(F("----------------------------"));
  }
}
