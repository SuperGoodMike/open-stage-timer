import React, { useEffect, useRef, useState } from "react";
import { socket } from "./socket";
import "./viewer.css";

function formatAsHMS(s){s=Math.max(0,Math.floor(Number(s)||0));const h=String(Math.floor(s/3600)).padStart(2,"0"),m=String(Math.floor((s%3600)/60)).padStart(2,"0"),sec=String(s%60).padStart(2,"0");return `${h}:${m}:${sec}`}

export default function Viewer(){
  const [timer,setTimer]=useState({time:0,running:false,type:"countdown"});
  const [rd,setRd]=useState({items:[],activeIndex:null,showViewerTitleStripe:false});
  const [beepEnabled,setBeepEnabled]=useState(true);
  const [audioReady,setAudioReady]=useState(false);
  const prev=useRef(0); const audioCtx=useRef(null);

  useEffect(()=>{const unlock=()=>{try{if(!audioCtx.current){const C=window.AudioContext||window.webkitAudioContext;audioCtx.current=new C();}if(audioCtx.current.state==="suspended")audioCtx.current.resume();setAudioReady(true);}catch{}window.removeEventListener("pointerdown",unlock);window.removeEventListener("keydown",unlock);};window.addEventListener("pointerdown",unlock,{once:true});window.addEventListener("keydown",unlock,{once:true});return()=>{window.removeEventListener("pointerdown",unlock);window.removeEventListener("keydown",unlock);};},[]);

  const beep=()=>{try{const ctx=audioCtx.current;if(!ctx)return;const o=ctx.createOscillator();const g=ctx.createGain();o.type="sine";o.frequency.value=880;o.connect(g);g.connect(ctx.destination);const t0=ctx.currentTime;g.gain.setValueAtTime(0.001,t0);g.gain.exponentialRampToValueAtTime(0.2,t0+0.01);o.start(t0);g.gain.exponentialRampToValueAtTime(0.0001,t0+0.2);o.stop(t0+0.22);}catch{}};

  useEffect(()=>{
    const onTimer=(t)=>{if(audioReady&&beepEnabled&&t.type==="countdown"&&prev.current>0&&t.time===0)beep();prev.current=t.time;setTimer(t);};
    const onSettings=(s)=>setBeepEnabled(!!s?.beepEnabled);
    const onRD=(r)=>setRd(r);
    socket.on("timer_update",onTimer); socket.on("settings_update",onSettings); socket.on("rundown_update",onRD);
    return()=>{socket.off("timer_update",onTimer); socket.off("settings_update",onSettings); socket.off("rundown_update",onRD)};
  },[audioReady,beepEnabled]);

  const active = rd.activeIndex!==null ? rd.items[rd.activeIndex] : null;

  return (
    <div className="viewer">
      {rd.showViewerTitleStripe && active && (
        <div className="viewer-header" style={{ background: "#111", color: "#fff", padding: "8px 16px", width: "100%", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, background: active.color||"#2ecc71" }} />
          <div style={{ fontWeight: 700 }}>{active.title}</div>
          <div style={{ marginLeft: "auto", opacity: 0.8, fontSize: 14 }}>{active.notes}</div>
        </div>
      )}
      <div className="time-display">{formatAsHMS(timer.time)}</div>
    </div>
  );
}