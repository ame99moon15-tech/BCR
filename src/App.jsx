import { useState, useEffect, useCallback, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCyjy76kTF-A7ShW-W7DKV1H2Cj0O0Sh-E",
  authDomain: "bcr-manage.firebaseapp.com",
  projectId: "bcr-manage",
  storageBucket: "bcr-manage.firebasestorage.app",
  messagingSenderId: "787207948550",
  appId: "1:787207948550:web:a0f4d276ad3b23106f3687",
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const DOC_REF = doc(db, "lab", "data");

async function loadData() {
  try {
    const snap = await getDoc(DOC_REF);
    if (snap.exists()) return snap.data();
    return null;
  } catch(e) { console.error(e); return null; }
}
async function saveData(data) {
  try { await setDoc(DOC_REF, data); } catch(e) { console.error(e); }
}

function todayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
}
function pad(n) { return String(n).padStart(2,"0"); }
function tLabel(h,m) { return `${pad(h)}:${pad(m)}`; }
function getThisMonday(dateStr) {
  const d = new Date(dateStr+"T00:00:00");
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
}
function weeksAvailable() {
  const now = new Date();
  const todayISO = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  const thisMonday = getThisMonday(todayISO);
  const dates = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(thisMonday);
    d.setDate(d.getDate() + i);
    dates.push(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`);
  }
  return dates;
}
function pastDates() {
  const now = new Date();
  const todayISO = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  const dates = [];
  for (let i = 30; i >= 1; i--) {
    const d = new Date(todayISO+"T00:00:00");
    d.setDate(d.getDate()-i);
    dates.push(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`);
  }
  return dates;
}

const ROOM_CONFIGS = {
  bcr: {
    key: "bcr",
    label: "無菌室",
    floor: "1F",
    emoji: "🪟",
    color: "#059669",
    bgColor: "#ecfdf5",
    borderColor: "#a7f3d0",
    benches: ["クリーンベンチ（右）","クリーンベンチ（左）"],
    reservationKey: "reservations",
  },
  lab: {
    key: "lab",
    label: "実験室",
    floor: "4F",
    emoji: "🔬",
    color: "#1d4ed8",
    bgColor: "#eff6ff",
    borderColor: "#bfdbfe",
    benches: ["クリーンベンチ（右）","クリーンベンチ（左）"],
    reservationKey: "labReservations",
  },
};

function makeDefault() {
  return { reservations:{}, labReservations:{}, members:[] };
}

// ── App ────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]           = useState("home");
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [userName, setUserName] = useState("");
  const [nameSet, setNameSet]   = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const lastFetch = useRef(0);

  const persist = useCallback((nd) => {
    setData(nd); saveData(nd);
    try { localStorage.setItem("lab_data_backup", JSON.stringify(nd)); } catch{}
  }, []);

  const fetchData = useCallback(async (force=false) => {
    const now = Date.now();
    if (!force && now - lastFetch.current < 28000) return;
    lastFetch.current = now;
    const d = await loadData();
    if (d) setData(d);
  }, []);

  useEffect(() => {
    loadData().then(d => {
      if (d && Object.keys(d).length > 0) {
        setData(d);
      } else {
        const existing = localStorage.getItem("lab_data_backup");
        if (existing) {
          try { setData(JSON.parse(existing)); } catch { setData(makeDefault()); }
        } else {
          setData(makeDefault());
        }
      }
      setLoading(false);
    });
  }, []);
  useEffect(() => {
    const id = setInterval(() => fetchData(), 30000);
    return () => clearInterval(id);
  }, [fetchData]);
  useEffect(() => {
    const h = () => { if (document.visibilityState==="visible") fetchData(true); };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, [fetchData]);

  if (loading) return (
    <div style={S.center}>
      <div style={S.spinner}/>
      <span style={{color:"#1d4ed8",fontFamily:"monospace",marginTop:12}}>読み込み中...</span>
    </div>
  );

  if (!nameSet) return (
    <NameEntry members={data.members||[]} onSet={name=>{ setUserName(name); setNameSet(true); }}/>
  );

  const TABS = [
    {key:"home",  label:"🏠 ホーム"},
    {key:"lab",   label:"🔬 実験室（4F）"},
    {key:"bcr",   label:"🪟 無菌室（1F）"},
    {key:"history",label:"📅 履歴"},
  ];

  return (
    <div style={S.root}>
      <header style={S.header}>
        <span style={S.headerTitle}>🧪 クリーンベンチ予約</span>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={S.headerUser}>👤 {userName}</span>
          <button style={S.editBtn} onClick={()=>setShowMemberModal(true)}>編集</button>
        </div>
      </header>
      <nav style={S.nav}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            style={{...S.navBtn,...(tab===t.key?S.navActive:{})}}>
            {t.label}
          </button>
        ))}
      </nav>
      <main style={S.main}>
        {tab==="home"    && <HomeTab    data={data} setTab={setTab} userName={userName}/>}
        {tab==="bcr"     && <BenchTab   data={data} persist={persist} userName={userName} roomKey="bcr" past={false}/>}
        {tab==="lab"     && <BenchTab   data={data} persist={persist} userName={userName} roomKey="lab" past={false}/>}
        {tab==="history" && <HistoryTab data={data} persist={persist} userName={userName}/>}
      </main>
      {showMemberModal && <MemberModal data={data} persist={persist} onClose={()=>setShowMemberModal(false)}/>}
    </div>
  );
}

// ── NameEntry ──────────────────────────────────────────────
function NameEntry({members, onSet}) {
  const [val, setVal] = useState("");
  const [error, setError] = useState("");

  function handleEnter() {
    const trimmed = val.trim();
    if (!trimmed) { setError("苗字を入力してください"); return; }
    if (members.length > 0 && !members.includes(trimmed)) {
      setError("登録されていない苗字です。");
      return;
    }
    onSet(trimmed);
  }

  return (
    <div style={S.center}>
      <div style={S.nameCard}>
        <div style={{fontSize:44,marginBottom:8}}>🧪</div>
        <h2 style={{color:"#1d4ed8",margin:"0 0 6px",fontFamily:"monospace"}}>クリーンベンチ予約</h2>
        <p style={{color:"#64748b",fontSize:13,margin:"0 0 20px"}}>苗字を入力してください</p>
        <input style={S.nameInput} placeholder="例：飴野" value={val}
          onChange={e=>{setVal(e.target.value);setError("");}}
          onKeyDown={e=>e.key==="Enter"&&handleEnter()} autoFocus/>
        {error && <div style={{color:"#dc2626",fontSize:12,marginBottom:8,textAlign:"center"}}>{error}</div>}
        <button style={{...S.btn,opacity:val.trim()?1:0.4}} onClick={handleEnter}>入る</button>
        <p style={{color:"#9ca3af",fontSize:11,marginTop:12,textAlign:"center"}}>
          ※メンバー登録は右上「編集」から
        </p>
      </div>
    </div>
  );
}

// ── MemberModal ────────────────────────────────────────────
function MemberModal({data, persist, onClose}) {
  const [mode, setMode] = useState("list");
  const [newName, setNewName] = useState("");
  const [editMode, setEditMode] = useState(false);

  function addMember() {
    if (!newName.trim()) return;
    if ((data.members||[]).includes(newName.trim())) { alert("すでに登録されている苗字です"); return; }
    const nd = JSON.parse(JSON.stringify(data));
    nd.members = [...(nd.members||[]), newName.trim()];
    persist(nd); setNewName(""); setMode("list");
  }
  function removeMember(name) {
    if (!window.confirm(`「${name}」を削除しますか？`)) return;
    const nd = JSON.parse(JSON.stringify(data));
    nd.members = nd.members.filter(m=>m!==name);
    persist(nd);
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modalCard} onClick={e=>e.stopPropagation()}>
        {mode==="list" && (<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={S.modalTitle}>メンバー一覧</div>
            <div style={{display:"flex",gap:6}}>
              <button style={S.smallBtn} onClick={()=>setMode("add")}>＋ 登録</button>
              <button style={{...S.smallBtn,background:editMode?"#dc2626":"#6b7280"}}
                onClick={()=>setEditMode(!editMode)}>{editMode?"完了":"編集"}</button>
            </div>
          </div>
          {(data.members||[]).length===0
            ? <div style={S.empty}>メンバーが登録されていません</div>
            : <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {(data.members||[]).map(m=>(
                  <div key={m} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                    background:"#f9fafb",borderRadius:8,padding:"10px 14px",border:"1px solid #e5e7eb"}}>
                    <span style={{fontSize:15,fontWeight:600,color:"#111827"}}>👤 {m}</span>
                    {editMode&&<button style={{...S.iconBtn,color:"#dc2626",padding:"4px 10px"}}
                      onClick={()=>removeMember(m)}>－</button>}
                  </div>
                ))}
              </div>
          }
          <button style={{...S.btnOutline,marginTop:16}} onClick={onClose}>閉じる</button>
        </>)}
        {mode==="add" && (<>
          <div style={S.modalTitle}>メンバー登録</div>
          <label style={{...S.label,marginTop:16}}>苗字</label>
          <input style={S.input} placeholder="例：飴野" value={newName}
            onChange={e=>setNewName(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&addMember()} autoFocus/>
          <button style={{...S.btn,marginTop:12}} onClick={addMember}>登録する</button>
          <button style={{...S.btnOutline,marginTop:8}} onClick={()=>setMode("list")}>キャンセル</button>
        </>)}
      </div>
    </div>
  );
}

// ── HomeTab ────────────────────────────────────────────────
function HomeTab({data, setTab, userName}) {
  const today = todayStr();
  const dow = ["日","月","火","水","木","金","土"][new Date(today+"T00:00:00").getDay()];

  function getTodayRes(roomKey) {
    const cfg = ROOM_CONFIGS[roomKey];
    const res = [];
    cfg.benches.forEach(b => {
      const slots = data[cfg.reservationKey]?.[today]?.[b] || {};
      Object.entries(slots)
        .sort((a,bb) => {
          const [ah,am]=a[0].split(":").map(Number);
          const [bh,bm]=bb[0].split(":").map(Number);
          return ah*60+am-(bh*60+bm);
        })
        .forEach(([,v]) => res.push({bench:b,time:v.startH!=null?tLabel(v.startH,v.startM):"-",name:v.name,partner:v.partner,memo:v.memo,startH:v.startH,startM:v.startM}));
    });
    // 重複除去（同じ予約の複数スロットは先頭のみ）
    const seen = new Set();
    return res.filter(r => {
      const key = `${r.bench}-${r.startH}-${r.startM}-${r.name}`;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
  }

  const bcrRes = getTodayRes("bcr");
  const labRes = getTodayRes("lab");

  return (
    <div>
      <div style={S.homeTitle}>📅 今日の予約</div>
      <div style={S.homeDate}>{today}（{dow}）</div>

      {/* 実験室カード */}
      <div style={{...S.roomCard,borderColor:"#bfdbfe",background:"#f0f7ff"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div>
            <span style={{...S.roomBadge,background:"#1d4ed8"}}>🔬 実験室</span>
            <span style={{fontSize:12,color:"#6b7280",marginLeft:6}}>4階</span>
          </div>
          <button style={{...S.homeLink,color:"#1d4ed8"}} onClick={()=>setTab("lab")}>予約する →</button>
        </div>
        {labRes.length===0
          ? <div style={S.emptySmall}>今日の予約なし</div>
          : labRes.map((r,i)=>(
            <div key={i} style={S.homeResItem}>
              <span style={{...S.homeResBench,background:"#dbeafe",color:"#1d4ed8",border:"1px solid #bfdbfe"}}>
                {r.bench.includes("右")?"右":"左"}
              </span>
              <span style={S.homeResTime}>{r.time}</span>
              <span style={S.homeResName}>{r.name}{r.partner&&r.partner!=="なし"?`・${r.partner}`:""}</span>
              {r.memo&&<span style={S.homeResMemo}>{r.memo}</span>}
            </div>
          ))
        }
      </div>

      {/* 無菌室カード */}
      <div style={{...S.roomCard,borderColor:"#a7f3d0",background:"#f0fdf8"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div>
            <span style={{...S.roomBadge,background:"#059669"}}>🪟 無菌室</span>
            <span style={{fontSize:12,color:"#6b7280",marginLeft:6}}>1階</span>
          </div>
          <button style={{...S.homeLink,color:"#059669"}} onClick={()=>setTab("bcr")}>予約する →</button>
        </div>
        {bcrRes.length===0
          ? <div style={S.emptySmall}>今日の予約なし</div>
          : bcrRes.map((r,i)=>(
            <div key={i} style={S.homeResItem}>
              <span style={{...S.homeResBench,background:"#d1fae5",color:"#059669",border:"1px solid #a7f3d0"}}>
                {r.bench.includes("右")?"右":"左"}
              </span>
              <span style={S.homeResTime}>{r.time}</span>
              <span style={S.homeResName}>{r.name}{r.partner&&r.partner!=="なし"?`・${r.partner}`:""}</span>
              {r.memo&&<span style={S.homeResMemo}>{r.memo}</span>}
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ── BenchTab ───────────────────────────────────────────────
function BenchTab({data, persist, userName, roomKey, past}) {
  const cfg = ROOM_CONFIGS[roomKey];
  const resKey = cfg.reservationKey;
  const futureDates = weeksAvailable();
  const historyDates = pastDates();
  const [selDate, setSelDate] = useState(past ? historyDates[0] : todayStr());
  const [modal, setModal] = useState(null);

  function groupByWeek(dates) {
    const weeks=[];
    for(let i=0;i<dates.length;i+=7) weeks.push(dates.slice(i,i+7));
    return weeks;
  }
  const weeks = groupByWeek(past ? historyDates : futureDates).slice(0,past?5:2);
  const activeWeek = weeks.find(w=>w.includes(selDate))||weeks[0];
  const weekLabels = past ? weeks.map(w=>`${w[0].slice(5).replace("-","/")}〜`) : ["今週","来週"];

  const allSlots=[];
  for(let h=7;h<23;h++) for(let m=0;m<60;m+=10) allSlots.push({h,m});

  function confirmRes(bench,startH,startM,endH,endM,name,partner,memo){
    if(past)return;
    const nd=JSON.parse(JSON.stringify(data));
    if(!nd[resKey]) nd[resKey]={};
    nd[resKey][selDate]=nd[resKey][selDate]||{};
    nd[resKey][selDate][bench]=nd[resKey][selDate][bench]||{};
    let h=startH, m=startM;
    while(h*60+m < endH*60+endM) {
      if(nd[resKey][selDate][bench][`${h}:${m}`]) {
        alert(`${tLabel(h,m)} はすでに予約が入っています`); return;
      }
      m+=10; if(m>=60){m=0;h++;}
    }
    h=startH; m=startM;
    while(h*60+m < endH*60+endM) {
      nd[resKey][selDate][bench][`${h}:${m}`]={name,partner,memo,startH,startM,endH,endM};
      m+=10; if(m>=60){m=0;h++;}
    }
    persist(nd); setModal(null);
  }

  function cancelRes(bench,startH,startM,endH,endM){
    if(past)return;
    const nd=JSON.parse(JSON.stringify(data));
    let h=startH, m=startM;
    while(h*60+m < endH*60+endM) {
      if(nd[resKey]?.[selDate]?.[bench]) delete nd[resKey][selDate][bench][`${h}:${m}`];
      m+=10; if(m>=60){m=0;h++;}
    }
    persist(nd); setModal(null);
  }

  return (
    <div>
      {/* 部屋ヘッダー */}
      <div style={{display:"flex",gap:12,alignItems:"center",padding:"12px 14px",borderRadius:12,
        border:`2px solid ${cfg.borderColor}`,background:cfg.bgColor,marginBottom:16}}>
        <span style={{fontSize:24}}>{cfg.emoji}</span>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:cfg.color}}>{cfg.label}クリーンベンチ</div>
          <div style={{fontSize:12,color:"#6b7280"}}>{cfg.floor}</div>
        </div>
      </div>

      {weeks.length>1&&(
        <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
          {weeks.map((wk,wi)=>{
            const active=wk.includes(selDate);
            return(
              <button key={wi} onClick={()=>setSelDate(wk[0])}
                style={{...S.weekBtn,...(active?{background:cfg.bgColor,border:`2px solid ${cfg.color}`,color:cfg.color,fontWeight:700}:{})}}>
                {weekLabels[wi]}
              </button>
            );
          })}
        </div>
      )}

      <div style={S.datePicker}>
        {activeWeek.map(d=>{
          const dt=new Date(d+"T00:00:00");
          const dow=["日","月","火","水","木","金","土"][dt.getDay()];
          const isWeekend=dt.getDay()===0||dt.getDay()===6;
          const hasRes=cfg.benches.some(b=>Object.keys(data[resKey]?.[d]?.[b]||{}).length>0);
          const isActive=selDate===d;
          return(
            <button key={d} onClick={()=>setSelDate(d)}
              style={{...S.dateBtn,
                ...(isActive?{background:cfg.bgColor,border:`2px solid ${cfg.color}`,fontWeight:700}:{}),
                color:isActive?cfg.color:(isWeekend?"#ef4444":"#374151")}}>
              {d===todayStr()&&<span style={{fontSize:9,display:"block",color:cfg.color,fontWeight:700}}>今日</span>}
              {d.slice(5).replace("-","/")}({dow})
              {hasRes&&<span style={{display:"block",fontSize:8,color:isActive?cfg.color:"#9ca3af"}}>●</span>}
            </button>
          );
        })}
      </div>

      {cfg.benches.map(bench=>(
        <div key={bench} style={{...S.benchBlock,borderLeft:`3px solid ${cfg.color}`}}>
          <div style={{...S.benchLabel,color:cfg.color}}>{bench}</div>
          <div style={S.slotGrid}>
            {allSlots.map(({h,m})=>{
              const slot=data[resKey]?.[selDate]?.[bench]?.[`${h}:${m}`]||null;
              const isMine=slot?.name===userName||(slot?.partner&&slot?.partner===userName);
              return(
                <div key={`${h}-${m}`}
                  onClick={()=>!past&&setModal({bench,h,m,existing:slot})}
                  style={{...S.slot,
                    ...(slot
                      ? (isMine?{...S.slotMine,background:cfg.bgColor,border:`2px solid ${cfg.color}`}:S.slotOther)
                      : S.slotEmpty),
                    cursor:past?"default":"pointer"}}>
                  <span style={S.slotTime}>{tLabel(h,m)}</span>
                  {slot&&<span style={S.slotName}>{slot.name}{slot.partner&&slot.partner!=="なし"?`・${slot.partner}`:""}</span>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {modal&&<ReserveModal modal={modal} userName={userName} members={data.members||[]}
        selDate={selDate} cfg={cfg} onConfirm={confirmRes} onCancel={cancelRes} onClose={()=>setModal(null)}/>}
    </div>
  );
}

// ── ReserveModal ───────────────────────────────────────────
function ReserveModal({modal,userName,members,selDate,cfg,onConfirm,onCancel,onClose}){
  const {bench,h,m,existing}=modal;
  const otherMembers=["なし",...members.filter(mn=>mn!==userName)];
  const timeOptions=[];
  for(let th=7;th<23;th++) for(let tm=0;tm<60;tm+=10) timeOptions.push({h:th,m:tm,label:tLabel(th,tm)});
  timeOptions.push({h:23,m:0,label:"23:00"});

  const [name,setName]=useState(existing?.name||userName);
  const [partner,setPartner]=useState(existing?.partner||"なし");
  const [memo,setMemo]=useState(existing?.memo||"");
  const [useEndTime,setUseEndTime]=useState(false);
  const defEndM=(m+10)>=60?0:m+10;
  const defEndH=(m+10)>=60?h+1:h;
  const [endH,setEndH]=useState(existing?.endH||defEndH);
  const [endM,setEndM]=useState(existing?.endM||defEndM);
  const isMine=existing?.name===userName||(existing?.partner&&existing?.partner===userName);

  if(existing){
    return(
      <div style={S.overlay} onClick={onClose}>
        <div style={S.modalCard} onClick={e=>e.stopPropagation()}>
          <div style={{display:"inline-block",padding:"4px 10px",borderRadius:8,color:"#fff",
            fontSize:12,fontWeight:700,background:cfg.color,marginBottom:8}}>
            {cfg.emoji} {cfg.label}（{cfg.floor}）
          </div>
          <div style={S.modalTitle}>{bench}</div>
          <div style={{color:"#6b7280",fontSize:13,marginBottom:12}}>{tLabel(h,m)}</div>
          <div style={S.existingSlot}>
            <div style={{color:"#111827",fontWeight:700,fontSize:15}}>
              {existing.name}{existing.partner&&existing.partner!=="なし"?` ・ ${existing.partner}`:""}
            </div>
            {existing.memo&&<div style={{color:"#6b7280",fontSize:12,marginTop:4}}>{existing.memo}</div>}
          </div>
          {isMine&&(
            <button style={{...S.btn,background:"#dc2626",marginTop:12}}
              onClick={()=>onCancel(bench,existing.startH??h,existing.startM??m,existing.endH??h,existing.endM??((m+10>=60?m+10-60:m+10)))}>
              予約をキャンセル
            </button>
          )}
          <button style={{...S.btnOutline,marginTop:8}} onClick={onClose}>閉じる</button>
        </div>
      </div>
    );
  }

  const endTotal=endH*60+endM;
  const startTotal=h*60+m;
  const valid=!useEndTime||(endTotal>startTotal);

  return(
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modalCard} onClick={e=>e.stopPropagation()}>
        <div style={{display:"inline-block",padding:"4px 10px",borderRadius:8,color:"#fff",
          fontSize:12,fontWeight:700,background:cfg.color,marginBottom:8}}>
          {cfg.emoji} {cfg.label}（{cfg.floor}）
        </div>
        <div style={S.modalTitle}>{bench}</div>
        <div style={{color:"#6b7280",fontSize:13,marginBottom:12}}>{tLabel(h,m)}〜（10分）</div>
        <label style={{...S.label,display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:12}}>
          <input type="checkbox" checked={useEndTime} onChange={e=>setUseEndTime(e.target.checked)}/>
          終了時間を指定する（長時間予約）
        </label>
        {useEndTime&&(
          <div style={{marginBottom:12}}>
            <label style={S.label}>終了時間</label>
            <select style={S.input} value={`${endH}:${endM}`}
              onChange={e=>{const[th,tm]=e.target.value.split(":").map(Number);setEndH(th);setEndM(tm);}}>
              {timeOptions.map(t=>(<option key={t.label} value={`${t.h}:${t.m}`}>{t.label}</option>))}
            </select>
            {!valid&&<div style={{color:"#dc2626",fontSize:12,marginTop:4}}>終了時間は開始より後にしてください</div>}
          </div>
        )}
        <label style={S.label}>予約者</label>
        <select style={S.input} value={name} onChange={e=>setName(e.target.value)}>
          {[...new Set([userName,...members])].map(n=><option key={n}>{n}</option>)}
        </select>
        <label style={{...S.label,marginTop:8}}>一緒に使用する人</label>
        <select style={S.input} value={partner} onChange={e=>setPartner(e.target.value)}>
          {otherMembers.map(n=><option key={n}>{n}</option>)}
        </select>
        <label style={{...S.label,marginTop:8}}>メモ（任意）</label>
        <input style={S.input} placeholder="例：細胞名、継代" value={memo} onChange={e=>setMemo(e.target.value)}/>
        <button style={{...S.btn,marginTop:12,opacity:valid?1:0.4,background:cfg.color}}
          onClick={()=>{
            if(!valid)return;
            const aEH=useEndTime?endH:defEndH;
            const aEM=useEndTime?endM:defEndM;
            onConfirm(bench,h,m,aEH,aEM,name,partner,memo);
          }}>
          予約する
        </button>
        <button style={{...S.btnOutline,marginTop:8}} onClick={onClose}>キャンセル</button>
      </div>
    </div>
  );
}

// ── HistoryTab ─────────────────────────────────────────────
function HistoryTab({data, persist, userName}) {
  const [roomKey, setRoomKey] = useState("bcr");
  const cfg = ROOM_CONFIGS[roomKey];

  return (
    <div>
      <div style={S.sectionTitle}>📅 予約履歴</div>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {Object.values(ROOM_CONFIGS).map(r=>(
          <button key={r.key} onClick={()=>setRoomKey(r.key)}
            style={{...S.roomSwitchBtn,
              ...(roomKey===r.key?{background:r.color,color:"#fff",borderColor:r.color}:{})}}>
            {r.emoji} {r.label}（{r.floor}）
          </button>
        ))}
      </div>
      <BenchTab data={data} persist={persist} userName={userName} roomKey={roomKey} past={true}/>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────
const S={
  root:{minHeight:"100vh",background:"#f9fafb",fontFamily:"'Noto Sans JP','Hiragino Sans',sans-serif",color:"#111827",paddingBottom:80},
  center:{height:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#f9fafb"},
  spinner:{width:32,height:32,borderRadius:"50%",border:"3px solid #e5e7eb",borderTopColor:"#1d4ed8",animation:"spin 0.8s linear infinite"},
  header:{background:"#fff",borderBottom:"2px solid #e5e7eb",padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"},
  headerTitle:{fontSize:18,fontWeight:700,color:"#111827",letterSpacing:1},
  headerUser:{fontSize:13,color:"#6b7280"},
  editBtn:{padding:"6px 12px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:8,fontSize:12,cursor:"pointer",fontFamily:"inherit",color:"#374151"},
  nav:{display:"flex",overflowX:"auto",background:"#fff",borderBottom:"2px solid #e5e7eb",position:"sticky",top:53,zIndex:99},
  navBtn:{flexShrink:0,padding:"10px 10px",background:"none",border:"none",color:"#6b7280",fontSize:11,cursor:"pointer",fontFamily:"inherit",borderBottom:"2px solid transparent",whiteSpace:"nowrap"},
  navActive:{color:"#1d4ed8",borderBottom:"2px solid #1d4ed8",fontWeight:700},
  main:{padding:16},
  nameCard:{background:"#fff",borderRadius:16,padding:32,width:"90%",maxWidth:340,display:"flex",flexDirection:"column",alignItems:"center",boxShadow:"0 4px 16px rgba(0,0,0,0.08)",border:"1px solid #e5e7eb"},
  nameInput:{width:"100%",padding:"12px 14px",background:"#f9fafb",border:"1px solid #d1d5db",borderRadius:8,color:"#111827",fontSize:16,marginBottom:12,fontFamily:"inherit",boxSizing:"border-box"},
  homeTitle:{fontSize:17,fontWeight:700,color:"#111827",marginBottom:4},
  homeDate:{fontSize:13,color:"#6b7280",marginBottom:16},
  roomCard:{borderRadius:12,padding:14,marginBottom:12,border:"2px solid",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"},
  roomBadge:{padding:"4px 10px",borderRadius:8,color:"#fff",fontSize:13,fontWeight:700},
  roomSwitchBtn:{flex:1,padding:"10px 8px",background:"#fff",border:"2px solid #d1d5db",borderRadius:10,color:"#374151",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:600},
  homeResItem:{display:"flex",gap:8,alignItems:"center",padding:"5px 0",borderBottom:"1px solid #f3f4f6"},
  homeResBench:{borderRadius:6,padding:"2px 8px",fontSize:11,flexShrink:0,fontWeight:600},
  homeResTime:{color:"#6b7280",fontSize:12,flexShrink:0},
  homeResName:{color:"#111827",fontSize:13,fontWeight:600},
  homeResMemo:{color:"#9ca3af",fontSize:11},
  homeLink:{background:"none",border:"none",fontSize:12,cursor:"pointer",padding:0,fontFamily:"inherit"},
  emptySmall:{color:"#9ca3af",fontSize:13,padding:"8px 0"},
  datePicker:{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:12},
  dateBtn:{flexShrink:0,padding:"6px 10px",background:"#fff",border:"1px solid #d1d5db",borderRadius:20,color:"#374151",fontSize:11,cursor:"pointer",textAlign:"center",lineHeight:1.4},
  weekBtn:{padding:"7px 14px",background:"#fff",border:"1px solid #d1d5db",borderRadius:8,color:"#374151",fontSize:12,cursor:"pointer",fontFamily:"inherit"},
  benchBlock:{marginBottom:20,paddingLeft:10},
  benchLabel:{fontSize:14,fontWeight:700,marginBottom:8,paddingLeft:8},
  slotGrid:{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:3},
  slot:{padding:"6px 2px",borderRadius:6,display:"flex",flexDirection:"column",alignItems:"center",minHeight:44},
  slotEmpty:{background:"#f1f5f9",border:"1px solid #cbd5e1",cursor:"pointer"},
  slotMine:{background:"#dbeafe",border:"2px solid #1d4ed8",cursor:"pointer"},
  slotOther:{background:"#ffedd5",border:"2px solid #f97316",cursor:"pointer"},
  slotTime:{fontSize:9,color:"#6b7280"},
  slotName:{fontSize:9,fontWeight:700,color:"#111827",marginTop:2,textAlign:"center",wordBreak:"break-all",lineHeight:1.2},
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200},
  modalCard:{background:"#fff",borderRadius:"16px 16px 0 0",padding:24,width:"100%",maxWidth:480,paddingBottom:40,boxShadow:"0 -4px 20px rgba(0,0,0,0.1)",maxHeight:"85vh",overflowY:"auto"},
  modalTitle:{fontSize:17,fontWeight:700,color:"#111827",marginBottom:4},
  existingSlot:{background:"#f9fafb",borderRadius:10,padding:14,border:"1px solid #e5e7eb"},
  sectionTitle:{fontSize:16,fontWeight:700,color:"#111827",display:"block",marginBottom:8},
  addCard:{background:"#fff",borderRadius:12,padding:14,marginBottom:12,display:"flex",flexDirection:"column",gap:8,border:"1px solid #d1d5db"},
  input:{width:"100%",padding:"10px 12px",background:"#fff",border:"1px solid #d1d5db",borderRadius:8,color:"#111827",fontSize:14,fontFamily:"inherit",boxSizing:"border-box"},
  btn:{width:"100%",padding:12,background:"#1d4ed8",border:"none",borderRadius:8,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"},
  btnOutline:{width:"100%",padding:11,background:"#fff",border:"1px solid #d1d5db",borderRadius:8,color:"#374151",fontSize:14,cursor:"pointer",fontFamily:"inherit"},
  smallBtn:{padding:"8px 14px",background:"#1d4ed8",border:"none",borderRadius:8,color:"#fff",fontSize:12,cursor:"pointer",fontFamily:"inherit"},
  iconBtn:{padding:"6px 10px",background:"#fff",border:"1px solid #d1d5db",borderRadius:8,fontSize:14,cursor:"pointer"},
  label:{fontSize:12,color:"#374151",marginBottom:2,display:"block"},
  empty:{color:"#9ca3af",textAlign:"center",padding:32,fontSize:14},
};
