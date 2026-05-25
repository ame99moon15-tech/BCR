import { useState, useEffect, useCallback, useRef } from "react";

const JSONBIN_API_KEY = "$2a$10$BpdDmKRgRhxFDBtuGquXEuKTwjK..jY/iAlGQB8Y9rDoVU9M.82GG";
const JSONBIN_URL = "https://api.jsonbin.io/v3/b";
let BIN_ID = "6a0eab84ee5a733b12f4d860";

async function loadData() {
  try {
    BIN_ID = "6a0eab84ee5a733b12f4d860";
    localStorage.setItem("lab_bin_id", BIN_ID);
    const res = await fetch(`${JSONBIN_URL}/${BIN_ID}/latest`, {
      headers: { "X-Master-Key": JSONBIN_API_KEY }
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.record;
  } catch { return null; }
}

async function saveData(data) {
  try {
    await fetch(`${JSONBIN_URL}/${BIN_ID}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Master-Key": JSONBIN_API_KEY },
      body: JSON.stringify(data),
    });
  } catch(e) { console.error(e); }
}

function todayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
}
function pad(n) { return String(n).padStart(2,"0"); }
function tLabel(h,m) { return `${pad(h)}:${pad(m)}`; }
function daysDiff(a,b) {
  return Math.floor((new Date(b+"T00:00:00")-new Date(a+"T00:00:00"))/86400000);
}
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

const DEFAULT_INVENTORY = [
  { id:"chip1000", name:"チップ 1000µL", unit:"箱", isBox:true,  perBox:96,  stock:0, inUse:0, alert:2, location:"" },
  { id:"chip200",  name:"チップ 200µL",  unit:"箱", isBox:true,  perBox:96,  stock:0, inUse:0, alert:2 },
  { id:"chip10",   name:"チップ 10µL",   unit:"箱", isBox:true,  perBox:96,  stock:0, inUse:0, alert:2 },
  { id:"plate96",  name:"96-well plate", unit:"枚", isBox:false, perBox:null,stock:0, inUse:0, alert:5 },
  { id:"tube15",   name:"チューブ 15mL", unit:"本", isBox:false, perBox:null,stock:0, inUse:0, alert:20 },
  { id:"tube50",   name:"チューブ 50mL", unit:"本", isBox:false, perBox:null,stock:0, inUse:0, alert:20 },
  { id:"tube15m",  name:"チューブ 1.5mL",unit:"本", isBox:false, perBox:null,stock:0, inUse:0, alert:50 },
  { id:"tube5",    name:"チューブ 5mL",  unit:"本", isBox:false, perBox:null,stock:0, inUse:0, alert:20 },
  { id:"dish6",    name:"6cmディッシュ", unit:"枚", isBox:false, perBox:null,stock:0, inUse:0, alert:10 },
  { id:"dish10",   name:"10cmディッシュ",unit:"枚", isBox:false, perBox:null,stock:0, inUse:0, alert:10 },
  { id:"pasteur",  name:"パスツール",    unit:"本", isBox:false, perBox:null,stock:0, inUse:0, alert:20 },
  { id:"haiter",   name:"ハイター",      unit:"本", isBox:false, perBox:null,stock:0, inUse:0, alert:1 },
];
const DEFAULT_CLEANING = [
  { id:"p_trash",  name:"プラごみAC",             freq:"溜まったら", steps:"", log:[] },
  { id:"k_trash",  name:"紙ごみAC",               freq:"溜まったら", steps:"", log:[] },
  { id:"g_trash",  name:"手袋ごみAC",             freq:"溜まったら", steps:"", log:[] },
  { id:"floor",    name:"床クイックワイパー",     freq:"週1",        steps:"", log:[] },
  { id:"incub_w",  name:"インキュベーター水替え", freq:"月1",        steps:"", log:[] },
  { id:"sink",     name:"流しの掃除",             freq:"月1",        steps:"排水溝ハイター、シンクをスポンジで磨く", log:[] },
  { id:"aspirate", name:"アスピレーター廃液",     freq:"溜まったら", steps:"4FのmiliQの部屋の流しへ。ボトル汚れていればハイター漬け置き", log:[] },
  { id:"cbench",   name:"クリーンベンチ掃除",     freq:"年2",        steps:"", log:[] },
  { id:"incub_t",  name:"恒温槽掃除",             freq:"年2",        steps:"機械部分はカビキラーをかけて1〜2分後に洗い流す", log:[] },
  { id:"sterilize",name:"オートクレーブ滅菌",     freq:"随時",       steps:"", log:[] },
];
const BENCHES = ["クリーンベンチ（右）","クリーンベンチ（左）"];
const FREQ_OPTIONS = ["溜まったら","随時","汚くなったら","週1","月1","年1","年2"];

function makeDefault() {
  return { inventory:DEFAULT_INVENTORY, reagents:[], cleaning:DEFAULT_CLEANING, reservations:{}, members:["飴野"] };
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

  const persist = useCallback((nd) => { setData(nd); saveData(nd); }, []);

  const fetchData = useCallback(async (force=false) => {
    const now = Date.now();
    if (!force && now - lastFetch.current < 28000) return;
    lastFetch.current = now;
    const d = await loadData();
    if (d) setData(d);
  }, []);

  useEffect(() => {
    loadData().then(d => { setData(d || makeDefault()); setLoading(false); });
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
    <div style={S.center}><div style={S.spinner}/>
      <span style={{color:"#1d4ed8",fontFamily:"monospace",marginTop:12}}>読み込み中...</span>
    </div>
  );

  if (!nameSet) return (
    <NameEntry members={data.members||[]} onSet={name=>{
      setUserName(name); setNameSet(true);
    }}/>
  );

  const TABS = [
    {key:"home",      label:"🏠 無菌室"},
    {key:"bench",     label:"🪟 予約"},
    {key:"history",   label:"📅 履歴"},
    {key:"inventory", label:"📦 在庫"},
    {key:"reagent",   label:"🧫 試薬"},
    {key:"cleaning",  label:"🧹 掃除・滅菌"},
  ];

  return (
    <div style={S.root}>
      <header style={S.header}>
        <span style={S.headerTitle}>🧪 無菌室管理</span>
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
        {tab==="home"      && <HomeTab      data={data} persist={persist} userName={userName} setTab={setTab}/>}
        {tab==="bench"     && <BenchTab     data={data} persist={persist} userName={userName} past={false}/>}
        {tab==="history"   && <BenchTab     data={data} persist={persist} userName={userName} past={true}/>}
        {tab==="inventory" && <InventoryTab data={data} persist={persist}/>}
        {tab==="reagent"   && <ReagentTab   data={data} persist={persist} userName={userName}/>}
        {tab==="cleaning"  && <CleaningTab  data={data} persist={persist} userName={userName}/>}
      </main>
      {showMemberModal && <MemberModal data={data} persist={persist} onClose={()=>setShowMemberModal(false)}/>}
    </div>
  );
}

// ── NameEntry（登録メンバーのみ選択可）─────────────────────
function NameEntry({members, onSet}) {
  const [val, setVal] = useState("");
  const [error, setError] = useState("");

  function handleEnter() {
    const trimmed = val.trim();
    if (!trimmed) { setError("苗字を入力してください"); return; }
    if (members.length > 0 && !members.includes(trimmed)) {
      setError("登録されていない苗字です。メンバー登録が必要です。");
      return;
    }
    onSet(trimmed);
  }

  return (
    <div style={S.center}>
      <div style={S.nameCard}>
        <div style={{fontSize:44,marginBottom:8}}>🧪</div>
        <h2 style={{color:"#1d4ed8",margin:"0 0 6px",fontFamily:"monospace"}}>無菌室管理アプリ</h2>
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
  const [mode, setMode] = useState("menu"); // menu | list | add
  const [newName, setNewName] = useState("");
  const [editMode, setEditMode] = useState(false);

  function addMember() {
    if (!newName.trim()) return;
    if ((data.members||[]).includes(newName.trim())) {
      alert("すでに登録されている苗字です");
      return;
    }
    const nd = JSON.parse(JSON.stringify(data));
    nd.members = [...(nd.members||[]), newName.trim()];
    persist(nd);
    setNewName("");
    setMode("list");
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
        {mode==="menu" && (
          <>
            <div style={S.modalTitle}>編集メニュー</div>
            <button style={{...S.btn,marginTop:16}} onClick={()=>setMode("list")}>👥 メンバー管理</button>
            <button style={{...S.btnOutline,marginTop:8}} onClick={onClose}>閉じる</button>
          </>
        )}
        {mode==="list" && (
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={S.modalTitle}>メンバー一覧</div>
              <div style={{display:"flex",gap:6}}>
                <button style={S.smallBtn} onClick={()=>setMode("add")}>＋ 登録</button>
                <button style={{...S.smallBtn,background:editMode?"#dc2626":"#6b7280"}}
                  onClick={()=>setEditMode(!editMode)}>
                  {editMode?"完了":"編集"}
                </button>
              </div>
            </div>
            {(data.members||[]).length===0
              ? <div style={S.empty}>メンバーが登録されていません</div>
              : <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {(data.members||[]).map(m=>(
                    <div key={m} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                      background:"#f9fafb",borderRadius:8,padding:"10px 14px",border:"1px solid #e5e7eb"}}>
                      <span style={{fontSize:15,fontWeight:600,color:"#111827"}}>👤 {m}</span>
                      {editMode && (
                        <button style={{...S.iconBtn,color:"#dc2626",padding:"4px 10px"}}
                          onClick={()=>removeMember(m)}>－</button>
                      )}
                    </div>
                  ))}
                </div>
            }
            <button style={{...S.btnOutline,marginTop:16}} onClick={()=>{setMode("menu");setEditMode(false);}}>戻る</button>
          </>
        )}
        {mode==="add" && (
          <>
            <div style={S.modalTitle}>メンバー登録</div>
            <label style={{...S.label,marginTop:16}}>苗字</label>
            <input style={S.input} placeholder="例：飴野" value={newName}
              onChange={e=>setNewName(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&addMember()} autoFocus/>
            <button style={{...S.btn,marginTop:12}} onClick={addMember}>登録する</button>
            <button style={{...S.btnOutline,marginTop:8}} onClick={()=>setMode("list")}>キャンセル</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── HomeTab ────────────────────────────────────────────────
function HomeTab({data,setTab}) {
  const today = todayStr();
  const todayRes = [];
  BENCHES.forEach(b=>{
    const slots = data.reservations?.[today]?.[b]||{};
    Object.entries(slots)
      .sort((a,bb)=>{
        const [ah,am]=a[0].split(":").map(Number);
        const [bh,bm]=bb[0].split(":").map(Number);
        return ah*60+am-(bh*60+bm);
      })
      .forEach(([key,v])=>todayRes.push({bench:b,time:key,name:v.name,partner:v.partner,memo:v.memo}));
  });
  const lowAll = [...(data.inventory||[]),...(data.reagents||[])].filter(i=>{
    if(i.alert==null||i.alert===-1) return false;
    return i.stock<=i.alert;
  });
  const freqDays={"週1":7,"月1":30,"年1":365,"年2":730};
  const overdueClean = (data.cleaning||[]).filter(c=>{
    if(!freqDays[c.freq])return false;
    const last=c.log?.[0]?.date;
    return !last||daysDiff(last,today)>=freqDays[c.freq];
  });
  return (
    <div>
      <div style={S.homeTitle}>🏠 無菌室ダッシュボード</div>
      <div style={S.homeDate}>{today}（{["日","月","火","水","木","金","土"][new Date(today+"T00:00:00").getDay()]}）</div>
      {(lowAll.length>0||overdueClean.length>0)&&(
        <div style={S.alertBox}>
          {lowAll.length>0&&<div>
            <div style={S.alertTitle}>⚠️ 在庫が少ない</div>
            {lowAll.map(i=><div key={i.id} style={S.alertItem} onClick={()=>setTab("inventory")}>{i.name}：残{i.stock}{i.unit}</div>)}
          </div>}
          {overdueClean.length>0&&<div style={{marginTop:lowAll.length?10:0}}>
            <div style={S.alertTitle}>🧹 掃除が必要</div>
            {overdueClean.map(c=><div key={c.id} style={S.alertItem} onClick={()=>setTab("cleaning")}>{c.name}（{c.freq}）</div>)}
          </div>}
        </div>
      )}
      <div style={S.homeSection}>
        <div style={S.homeSectionTitle}>🪟 今日のクリーンベンチ予約</div>
        {todayRes.length===0
          ? <div style={S.empty}>今日の予約なし</div>
          : todayRes.map((r,i)=>(
            <div key={i} style={S.homeResItem}>
              <span style={S.homeResBench}>{r.bench.includes("右")?"右":"左"}</span>
              <span style={S.homeResTime}>{r.time}</span>
              <span style={S.homeResName}>{r.name}{r.partner&&r.partner!=="なし"?`・${r.partner}`:""}</span>
              {r.memo&&<span style={S.homeResMemo}>{r.memo}</span>}
            </div>
          ))
        }
        <button style={S.homeLink} onClick={()=>setTab("bench")}>予約画面へ →</button>
      </div>
    </div>
  );
}

// ── BenchTab ───────────────────────────────────────────────
function BenchTab({data,persist,userName,past}) {
  const futureDates = weeksAvailable();
  const historyDates = pastDates();
  const [selDate,setSelDate] = useState(past ? historyDates[0] : todayStr());
  const [modal,setModal]     = useState(null);

  function groupByWeek(dates) {
    const weeks=[];
    for(let i=0;i<dates.length;i+=7) weeks.push(dates.slice(i,i+7));
    return weeks;
  }
  const weeks = groupByWeek(past ? historyDates : futureDates).slice(0,past?5:2);
  const activeWeek = weeks.find(w=>w.includes(selDate))||weeks[0];
  const weekLabels = past
    ? weeks.map(w=>`${w[0].slice(5).replace("-","/")}〜`)
    : ["今週","来週"];

  const allSlots=[];
  for(let h=7;h<23;h++) for(let m=0;m<60;m+=10) allSlots.push({h,m});

  function confirmRes(bench,startH,startM,endH,endM,name,partner,memo){
    if(past)return;
    const nd=JSON.parse(JSON.stringify(data));
    nd.reservations[selDate]=nd.reservations[selDate]||{};
    nd.reservations[selDate][bench]=nd.reservations[selDate][bench]||{};
    let h=startH, m=startM;
    while(h*60+m < endH*60+endM) {
      if(nd.reservations[selDate][bench][`${h}:${m}`]) {
        alert(`${tLabel(h,m)} はすでに予約が入っています`);
        return;
      }
      m+=10; if(m>=60){m=0;h++;}
    }
    h=startH; m=startM;
    while(h*60+m < endH*60+endM) {
      nd.reservations[selDate][bench][`${h}:${m}`]={name,partner,memo,startH,startM,endH,endM};
      m+=10; if(m>=60){m=0;h++;}
    }
    persist(nd);setModal(null);
  }

  function cancelRes(bench,startH,startM,endH,endM){
    if(past)return;
    const nd=JSON.parse(JSON.stringify(data));
    let h=startH, m=startM;
    while(h*60+m < endH*60+endM) {
      if(nd.reservations?.[selDate]?.[bench]) delete nd.reservations[selDate][bench][`${h}:${m}`];
      m+=10; if(m>=60){m=0;h++;}
    }
    persist(nd);setModal(null);
  }

  return (
    <div>
      <div style={S.sectionTitle}>{past?"📅 過去の予約履歴":"🪟 クリーンベンチ予約"}</div>
      {weeks.length>1&&(
        <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
          {weeks.map((wk,wi)=>{
            const active=wk.includes(selDate);
            return(
              <button key={wi} onClick={()=>setSelDate(wk[0])}
                style={{...S.weekBtn,...(active?S.weekBtnActive:{})}}>
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
          const hasRes=BENCHES.some(b=>Object.keys(data.reservations?.[d]?.[b]||{}).length>0);
          return(
            <button key={d} onClick={()=>setSelDate(d)}
              style={{...S.dateBtn,...(selDate===d?S.dateBtnActive:{}),
                color:selDate===d?"#1d4ed8":(isWeekend?"#ef4444":"#374151")}}>
              {d===todayStr()&&<span style={{fontSize:9,display:"block",color:"#1d4ed8",fontWeight:700}}>今日</span>}
              {d.slice(5).replace("-","/")}({dow})
              {hasRes&&<span style={{display:"block",fontSize:8,color:selDate===d?"#1d4ed8":"#9ca3af"}}>●</span>}
            </button>
          );
        })}
      </div>
      {BENCHES.map(bench=>(
        <div key={bench} style={S.benchBlock}>
          <div style={S.benchLabel}>{bench}</div>
          <div style={S.slotGrid}>
            {allSlots.map(({h,m})=>{
              const slot=data.reservations?.[selDate]?.[bench]?.[`${h}:${m}`]||null;
              const isMine=slot?.name===userName||(slot?.partner&&slot?.partner===userName);
              return(
                <div key={`${h}-${m}`}
                  onClick={()=>!past&&setModal({bench,h,m,existing:slot})}
                  style={{...S.slot,...(slot?(isMine?S.slotMine:S.slotOther):S.slotEmpty),
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
        selDate={selDate} onConfirm={confirmRes} onCancel={cancelRes} onClose={()=>setModal(null)}/>}
    </div>
  );
}

// ── ReserveModal ───────────────────────────────────────────
function ReserveModal({modal,userName,members,selDate,onConfirm,onCancel,onClose}){
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
          <div style={S.modalTitle}>{bench}</div>
          <div style={{color:"#6b7280",fontSize:13,marginBottom:12}}>{tLabel(h,m)}</div>
          <div style={S.existingSlot}>
            <div>
              <div style={{color:"#111827",fontWeight:700,fontSize:15}}>
                {existing.name}{existing.partner&&existing.partner!=="なし"?` ・ ${existing.partner}`:""}
              </div>
              {existing.memo&&<div style={{color:"#6b7280",fontSize:12,marginTop:4}}>{existing.memo}</div>}
            </div>
          </div>
          {isMine&&(
            <button style={{...S.btn,background:"#dc2626",marginTop:12}}
              onClick={()=>onCancel(bench,existing.startH??h,existing.startM??m,existing.endH??(h),existing.endM??((m+10>=60?m+10-60:m+10)))}>
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
              {timeOptions.map(t=>(
                <option key={t.label} value={`${t.h}:${t.m}`}>{t.label}</option>
              ))}
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
        <button style={{...S.btn,marginTop:12,opacity:valid?1:0.4}}
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

// ── InventoryTab ───────────────────────────────────────────
function InventoryTab({data,persist}){
  const list=data.inventory||[];
  const [editId,setEditId]=useState(null);
  const [delta,setDelta]=useState("");
  const [mode,setMode]=useState("use");
  const [showAdd,setShowAdd]=useState(false);
  const [editingItem,setEditingItem]=useState(null);
  const [newItem,setNewItem]=useState({name:"",unit:"個",isBox:false,perBox:96,stock:0,inUse:0,alert:5,location:""});

  function isLow(item){ if(item.alert==null||item.alert===-1)return false; return item.stock<=item.alert; }

  function applyDelta(id){
    const n=parseFloat(delta); if(isNaN(n)){setEditId(null);return;}
    const nd=JSON.parse(JSON.stringify(data));
    const item=nd.inventory.find(i=>i.id===id); if(!item)return;
    if(mode==="use")      item.stock=Math.max(0,item.stock-n);
    else if(mode==="add") item.stock=item.stock+n;
    else                  item.inUse=Math.max(0,parseInt(n)||0);
    persist(nd); setEditId(null); setDelta("");
  }
  function addItem(){
    if(!newItem.name.trim())return;
    const nd=JSON.parse(JSON.stringify(data));
    nd.inventory=[...nd.inventory,{
      id:"inv_"+Date.now(), name:newItem.name.trim(),
      unit:newItem.isBox?"箱":newItem.unit, isBox:newItem.isBox,
      perBox:newItem.isBox?parseInt(newItem.perBox)||96:null,
      stock:parseFloat(newItem.stock)||0, inUse:parseInt(newItem.inUse)||0,
      alert:newItem.alert===-1?-1:parseFloat(newItem.alert)||0,
      location:newItem.location||"",
    }];
    persist(nd); setShowAdd(false);
    setNewItem({name:"",unit:"個",isBox:false,perBox:96,stock:0,inUse:0,alert:5,location:""});
  }
  function saveEdit(id,changes){
    const nd=JSON.parse(JSON.stringify(data));
    const item=nd.inventory.find(i=>i.id===id); if(!item)return;
    Object.assign(item,changes); if(changes.isBox) item.unit="箱";
    persist(nd); setEditingItem(null);
  }
  function removeItem(id){
    if(!window.confirm("本当に削除しますか？"))return;
    const nd=JSON.parse(JSON.stringify(data));
    nd.inventory=nd.inventory.filter(i=>i.id!==id); persist(nd); setEditingItem(null);
  }

  return(
    <div>
      <div style={S.sectionHeader}>
        <span style={S.sectionTitle}>消耗品在庫</span>
        <button style={S.smallBtn} onClick={()=>setShowAdd(!showAdd)}>＋ 追加</button>
      </div>
      {showAdd&&(
        <div style={S.addCard}>
          <input style={S.input} placeholder="品名 *" value={newItem.name} onChange={e=>setNewItem({...newItem,name:e.target.value})}/>
          <label style={{...S.label,display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
            <input type="checkbox" checked={newItem.isBox} onChange={e=>setNewItem({...newItem,isBox:e.target.checked})}/>箱単位でカウント
          </label>
          {newItem.isBox
            ?<input style={S.input} type="number" placeholder="1箱あたりの本数" value={newItem.perBox} onChange={e=>setNewItem({...newItem,perBox:e.target.value})}/>
            :<input style={S.input} placeholder="単位（枚、本など）" value={newItem.unit} onChange={e=>setNewItem({...newItem,unit:e.target.value})}/>
          }
          <div style={{display:"flex",gap:8}}>
            <div style={{flex:1}}><label style={S.label}>在庫数</label>
              <input style={S.input} type="number" value={newItem.stock} onChange={e=>setNewItem({...newItem,stock:e.target.value})}/></div>
            <div style={{flex:1}}><label style={S.label}>使用中</label>
              <input style={S.input} type="number" value={newItem.inUse} onChange={e=>setNewItem({...newItem,inUse:e.target.value})}/></div>
            <div style={{flex:1}}><label style={S.label}>警告数</label>
              <select style={S.input} value={newItem.alert===-1?"none":newItem.alert}
                onChange={e=>setNewItem({...newItem,alert:e.target.value==="none"?-1:parseFloat(e.target.value)||0})}>
                <option value="none">なし(-)</option>
                {[0,1,2,3,4,5,10,20,50].map(n=><option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <input style={S.input} placeholder="保管場所（例：クリーンベンチ棚、冷蔵庫）" value={newItem.location} onChange={e=>setNewItem({...newItem,location:e.target.value})}/>
          <button style={S.btn} onClick={addItem}>追加する</button>
        </div>
      )}
      <div style={S.itemList}>
        {list.map(item=>{
          const low=isLow(item);
          const isES=editingItem?.id===item.id;
          const isEdit=editId===item.id;
          return(
            <div key={item.id} style={{...S.itemCard,...(low?S.itemCardLow:{})}}>
              <div style={S.itemTop}>
                <div style={{flex:1}}>
                  <span style={S.itemName}>{low&&"⚠️ "}{item.name}</span>
                  {item.isBox&&item.perBox&&<span style={S.subLabel}>　1箱={item.perBox}本</span>}
                  {item.location&&<div style={{fontSize:11,color:"#6b7280",marginTop:2}}>📍 {item.location}</div>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{textAlign:"right"}}>
                    <div style={S.itemStock}>{item.stock}<span style={{fontSize:11,color:"#6b7280",marginLeft:2}}>{item.unit}</span></div>
                    {(item.inUse||0)>0&&<div style={{fontSize:11,color:"#ea580c",fontWeight:600}}>使用中 {item.inUse}{item.unit}</div>}
                  </div>
                  <button style={S.iconBtn} onClick={()=>setEditingItem(isES?null:{...item})}>⚙️</button>
                </div>
              </div>
              {isES&&<InvSettingsEditor item={editingItem} onChange={setEditingItem}
                onSave={()=>saveEdit(item.id,editingItem)} onRemove={()=>removeItem(item.id)} onCancel={()=>setEditingItem(null)}/>}
              {!isES&&(isEdit?(
                <div style={{marginTop:8}}>
                  <div style={{display:"flex",gap:4,marginBottom:6}}>
                    {[["use","消費"],["add","補充"],["inuse","使用中"]].map(([k,l])=>(
                      <button key={k} style={{...S.modeBtn,...(mode===k?S.modeBtnActive:{})}} onClick={()=>setMode(k)}>{l}</button>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <input type="number" style={{...S.input,flex:1}} placeholder={`数量(${item.unit})`}
                      value={delta} onChange={e=>setDelta(e.target.value)}
                      onKeyDown={e=>e.key==="Enter"&&applyDelta(item.id)} autoFocus/>
                    <button style={{...S.btn,width:48,padding:0}} onClick={()=>applyDelta(item.id)}>✓</button>
                    <button style={{...S.btnOutline,width:48,padding:0}} onClick={()=>setEditId(null)}>✕</button>
                  </div>
                </div>
              ):(
                <div style={{display:"flex",gap:6,marginTop:8}}>
                  <button style={{...S.smallBtn,flex:1}} onClick={()=>{setEditId(item.id);setMode("use");setDelta("");}}>消費</button>
                  <button style={{...S.smallBtn,flex:1,background:"#fff",color:"#1d4ed8",border:"1px solid #1d4ed8"}} onClick={()=>{setEditId(item.id);setMode("add");setDelta("");}}>補充</button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InvSettingsEditor({item,onChange,onSave,onRemove,onCancel}){
  return(
    <div style={S.settingsEditor}>
      <div style={{display:"flex",gap:8}}>
        <div style={{flex:2}}><label style={S.label}>品名</label>
          <input style={S.input} value={item.name} onChange={e=>onChange({...item,name:e.target.value})}/></div>
        {!item.isBox&&<div style={{flex:1}}><label style={S.label}>単位</label>
          <input style={S.input} value={item.unit} onChange={e=>onChange({...item,unit:e.target.value})}/></div>}
      </div>
      <label style={{...S.label,display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
        <input type="checkbox" checked={!!item.isBox} onChange={e=>onChange({...item,isBox:e.target.checked})}/>箱単位
      </label>
      {item.isBox&&<div><label style={S.label}>1箱あたりの本数</label>
        <input style={S.input} type="number" value={item.perBox||96} onChange={e=>onChange({...item,perBox:parseInt(e.target.value)||96})}/></div>}
      <div style={{display:"flex",gap:8}}>
        <div style={{flex:1}}><label style={S.label}>在庫数</label>
          <input style={S.input} type="number" value={item.stock} onChange={e=>onChange({...item,stock:parseFloat(e.target.value)||0})}/></div>
        <div style={{flex:1}}><label style={S.label}>使用中</label>
          <input style={S.input} type="number" value={item.inUse||0} onChange={e=>onChange({...item,inUse:parseInt(e.target.value)||0})}/></div>
        <div style={{flex:1}}><label style={S.label}>警告数</label>
          <select style={S.input} value={item.alert===-1||item.alert==null?"none":item.alert}
            onChange={e=>onChange({...item,alert:e.target.value==="none"?-1:parseFloat(e.target.value)||0})}>
            <option value="none">なし(-)</option>
            {[0,1,2,3,4,5,10,20,50].map(n=><option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
      <div><label style={S.label}>保管場所</label>
        <input style={S.input} placeholder="例：クリーンベンチ棚、冷蔵庫" value={item.location||""} onChange={e=>onChange({...item,location:e.target.value})}/></div>
      <div style={{display:"flex",gap:6}}>
        <button style={{...S.btn,flex:2}} onClick={onSave}>保存</button>
        <button style={{...S.btnOutline,flex:1}} onClick={onCancel}>キャンセル</button>
        <button style={S.btnDanger} onClick={onRemove}>🗑</button>
      </div>
    </div>
  );
}

// ── ReagentTab ─────────────────────────────────────────────
function ReagentTab({data,persist,userName}){
  const list=data.reagents||[];
  const [showAdd,setShowAdd]=useState(false);
  const [editingItem,setEditingItem]=useState(null);
  const [nv,setNv]=useState({cell:"",name:"",stock:0,inUse:0,openedBy:"",note:"",alert:1,unit:"本"});

  function isLow(item){ if(item.alert==null||item.alert===-1)return false; return item.stock<=item.alert; }

  function addReagent(){
    if(!nv.name.trim())return;
    const nd=JSON.parse(JSON.stringify(data));
    nd.reagents=[...(nd.reagents||[]),{
      id:"rg_"+Date.now(), cell:nv.cell.trim(), name:nv.name.trim(),
      stock:parseInt(nv.stock)||0, inUse:parseInt(nv.inUse)||0,
      openedBy:nv.openedBy.trim(), note:nv.note.trim(),
      alert:nv.alert===-1?-1:parseInt(nv.alert)||0, unit:nv.unit||"本",
      location:nv.location||"",
      addedBy:userName, addedAt:todayStr(),
    }];
    persist(nd); setShowAdd(false);
    setNv({cell:"",name:"",stock:0,inUse:0,openedBy:"",note:"",alert:1,unit:"本"});
  }
  function saveEdit(id,changes){
    const nd=JSON.parse(JSON.stringify(data));
    const item=nd.reagents.find(i=>i.id===id); if(!item)return;
    Object.assign(item,changes); persist(nd); setEditingItem(null);
  }
  function removeItem(id){
    if(!window.confirm("本当に削除しますか？"))return;
    const nd=JSON.parse(JSON.stringify(data));
    nd.reagents=(nd.reagents||[]).filter(i=>i.id!==id); persist(nd); setEditingItem(null);
  }
  function adjustStock(id,delta,mode){
    const nd=JSON.parse(JSON.stringify(data));
    const item=nd.reagents.find(i=>i.id===id); if(!item)return;
    const n=parseFloat(delta); if(isNaN(n))return;
    if(mode==="use")      item.stock=Math.max(0,item.stock-n);
    else if(mode==="add") item.stock=item.stock+n;
    else                  item.inUse=Math.max(0,parseInt(n)||0);
    persist(nd);
  }

  return(
    <div>
      <div style={S.sectionHeader}>
        <span style={S.sectionTitle}>試薬</span>
        <button style={S.smallBtn} onClick={()=>setShowAdd(!showAdd)}>＋ 追加</button>
      </div>
      {showAdd&&(
        <div style={S.addCard}>
          <input style={S.input} placeholder="細胞名" value={nv.cell} onChange={e=>setNv({...nv,cell:e.target.value})}/>
          <input style={S.input} placeholder="試薬名 *" value={nv.name} onChange={e=>setNv({...nv,name:e.target.value})}/>
          <input style={S.input} placeholder="単位（本、mL、個など）" value={nv.unit} onChange={e=>setNv({...nv,unit:e.target.value})}/>
          <div style={{display:"flex",gap:8}}>
            <div style={{flex:1}}><label style={S.label}>在庫数</label>
              <input style={S.input} type="number" value={nv.stock} onChange={e=>setNv({...nv,stock:e.target.value})}/></div>
            <div style={{flex:1}}><label style={S.label}>使用中</label>
              <input style={S.input} type="number" value={nv.inUse} onChange={e=>setNv({...nv,inUse:e.target.value})}/></div>
            <div style={{flex:1}}><label style={S.label}>警告数</label>
              <select style={S.input} value={nv.alert===-1?"none":nv.alert}
                onChange={e=>setNv({...nv,alert:e.target.value==="none"?-1:parseInt(e.target.value)||0})}>
                <option value="none">なし(-)</option>
                {[0,1,2,3,4,5,10,20,50].map(n=><option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <input style={S.input} placeholder="使用者（開封中の場合）" value={nv.openedBy} onChange={e=>setNv({...nv,openedBy:e.target.value})}/>
          <input style={S.input} placeholder="保管場所（例：-20℃冷凍庫、冷蔵庫）" value={nv.location||""} onChange={e=>setNv({...nv,location:e.target.value})}/>
          <input style={S.input} placeholder="メモ（例：DMEM+10%FBS）" value={nv.note} onChange={e=>setNv({...nv,note:e.target.value})}/>
          <button style={S.btn} onClick={addReagent}>追加する</button>
        </div>
      )}
      {list.length===0&&<div style={S.empty}>試薬が登録されていません</div>}
      <div style={S.itemList}>
        {list.map(item=>(
          <ReagentCard key={item.id} item={item} isLow={isLow(item)} isES={editingItem?.id===item.id}
            editingItem={editingItem} setEditingItem={setEditingItem}
            onSave={()=>saveEdit(item.id,editingItem)} onRemove={()=>removeItem(item.id)}
            onAdjust={adjustStock}/>
        ))}
      </div>
    </div>
  );
}

function ReagentCard({item,isLow,isES,editingItem,setEditingItem,onSave,onRemove,onAdjust}){
  const [editStock,setEditStock]=useState(false);
  const [delta,setDelta]=useState("");
  const [mode,setMode]=useState("use");
  return(
    <div style={{...S.itemCard,...(isLow?S.itemCardLow:{})}}>
      <div style={S.itemTop}>
        <div style={{flex:1}}>
          {item.cell&&<div style={{color:"#6b7280",fontSize:11,marginBottom:2}}>🔬 {item.cell}</div>}
          <span style={S.itemName}>{isLow&&"⚠️ "}{item.name}</span>
          {item.location&&<div style={{fontSize:11,color:"#6b7280",marginTop:2}}>📍 {item.location}</div>}
          {item.note&&<div style={{color:"#6b7280",fontSize:12,marginTop:2}}>{item.note}</div>}
          <div style={{marginTop:4,display:"flex",gap:12,flexWrap:"wrap"}}>
            <span style={{fontSize:13,color:"#1d4ed8",fontWeight:700}}>在庫 {item.stock}<span style={{fontSize:11,color:"#6b7280",marginLeft:2}}>{item.unit||"本"}</span></span>
            <span style={{fontSize:13,color:"#ea580c",fontWeight:600}}>使用中 {item.inUse||0}<span style={{fontSize:11,color:"#6b7280",marginLeft:2}}>{item.unit||"本"}</span></span>
          </div>
          {item.openedBy&&<div style={{fontSize:12,color:"#ea580c",marginTop:2}}>使用者：{item.openedBy}</div>}
          <div style={{color:"#9ca3af",fontSize:11,marginTop:2}}>登録：{item.addedBy}（{item.addedAt}）</div>
        </div>
        <button style={S.iconBtn} onClick={()=>setEditingItem(isES?null:{...item})}>⚙️</button>
      </div>
      {isES&&<ReagentSettingsEditor item={editingItem} onChange={setEditingItem}
        onSave={onSave} onRemove={onRemove} onCancel={()=>setEditingItem(null)}/>}
      {!isES&&(editStock?(
        <div style={{marginTop:8}}>
          <div style={{display:"flex",gap:4,marginBottom:6}}>
            {[["use","消費"],["add","補充"],["inuse","使用中"]].map(([k,l])=>(
              <button key={k} style={{...S.modeBtn,...(mode===k?S.modeBtnActive:{})}} onClick={()=>setMode(k)}>{l}</button>
            ))}
          </div>
          <div style={{display:"flex",gap:6}}>
            <input type="number" style={{...S.input,flex:1}} placeholder="数量" value={delta}
              onChange={e=>setDelta(e.target.value)} autoFocus/>
            <button style={{...S.btn,width:48,padding:0}} onClick={()=>{onAdjust(item.id,delta,mode);setEditStock(false);setDelta("");}}>✓</button>
            <button style={{...S.btnOutline,width:48,padding:0}} onClick={()=>setEditStock(false)}>✕</button>
          </div>
        </div>
      ):(
        <div style={{display:"flex",gap:6,marginTop:8}}>
          <button style={{...S.smallBtn,flex:1}} onClick={()=>{setEditStock(true);setMode("use");setDelta("");}}>消費</button>
          <button style={{...S.smallBtn,flex:1,background:"#fff",color:"#1d4ed8",border:"1px solid #1d4ed8"}} onClick={()=>{setEditStock(true);setMode("add");setDelta("");}}>補充</button>
        </div>
      ))}
    </div>
  );
}

function ReagentSettingsEditor({item,onChange,onSave,onRemove,onCancel}){
  return(
    <div style={S.settingsEditor}>
      <div><label style={S.label}>細胞名</label>
        <input style={S.input} value={item.cell||""} onChange={e=>onChange({...item,cell:e.target.value})}/></div>
      <div><label style={S.label}>試薬名</label>
        <input style={S.input} value={item.name} onChange={e=>onChange({...item,name:e.target.value})}/></div>
      <div><label style={S.label}>単位</label>
        <input style={S.input} value={item.unit||"本"} onChange={e=>onChange({...item,unit:e.target.value})}/></div>
      <div style={{display:"flex",gap:8}}>
        <div style={{flex:1}}><label style={S.label}>在庫数</label>
          <input style={S.input} type="number" value={item.stock} onChange={e=>onChange({...item,stock:parseInt(e.target.value)||0})}/></div>
        <div style={{flex:1}}><label style={S.label}>使用中</label>
          <input style={S.input} type="number" value={item.inUse||0} onChange={e=>onChange({...item,inUse:parseInt(e.target.value)||0})}/></div>
        <div style={{flex:1}}><label style={S.label}>警告数</label>
          <select style={S.input} value={item.alert===-1||item.alert==null?"none":item.alert}
            onChange={e=>onChange({...item,alert:e.target.value==="none"?-1:parseInt(e.target.value)||0})}>
            <option value="none">なし(-)</option>
            {[0,1,2,3,4,5,10,20,50].map(n=><option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
      <div><label style={S.label}>使用者（開封中）</label>
        <input style={S.input} value={item.openedBy||""} onChange={e=>onChange({...item,openedBy:e.target.value})}/></div>
      <div><label style={S.label}>保管場所</label>
        <input style={S.input} placeholder="例：-20℃冷凍庫、冷蔵庫" value={item.location||""} onChange={e=>onChange({...item,location:e.target.value})}/></div>
      <div><label style={S.label}>メモ</label>
        <input style={S.input} value={item.note||""} onChange={e=>onChange({...item,note:e.target.value})}/></div>
      <div style={{display:"flex",gap:6}}>
        <button style={{...S.btn,flex:2}} onClick={onSave}>保存</button>
        <button style={{...S.btnOutline,flex:1}} onClick={onCancel}>キャンセル</button>
        <button style={S.btnDanger} onClick={onRemove}>🗑</button>
      </div>
    </div>
  );
}

// ── CleaningTab ────────────────────────────────────────────
function CleaningTab({data,persist,userName}){
  const [activeId,setActiveId]   = useState(null);
  const [note,setNote]           = useState("");
  const [coWorkers,setCoWorkers] = useState([]); // 複数人対応
  const [coWorkerInput,setCoWorkerInput] = useState("");
  const [logDate,setLogDate]     = useState(todayStr());
  const [editLog,setEditLog]     = useState(null);
  const [editLogNote,setEditLogNote] = useState("");
  const [showAddItem,setShowAddItem] = useState(false);
  const [newClean,setNewClean]   = useState({name:"",freq:"溜まったら",steps:""});
  const [editSteps,setEditSteps] = useState(null); // steps編集中のid
  const [stepsInput,setStepsInput] = useState("");
  const today = todayStr();
  const freqOrder={"溜まったら":0,"汚くなったら":1,"随時":2,"週1":3,"月1":4,"年1":5,"年2":6};
  const freqDays={"週1":7,"月1":30,"年1":365,"年2":730};
  const sorted=[...(data.cleaning||[])].sort((a,b)=>(freqOrder[a.freq]??9)-(freqOrder[b.freq]??9));

  function addCoWorker(){
    const name = coWorkerInput.trim();
    if(!name || coWorkers.includes(name)) return;
    setCoWorkers([...coWorkers, name]);
    setCoWorkerInput("");
  }
  function removeCoWorker(name){
    setCoWorkers(coWorkers.filter(c=>c!==name));
  }

  function logItem(id){
    const nd=JSON.parse(JSON.stringify(data));
    const item=nd.cleaning.find(c=>c.id===id); if(!item)return;
    const allWho = coWorkers.length>0 ? `${userName}・${coWorkers.join("・")}` : userName;
    item.log=[{id:"l"+Date.now(),date:logDate,who:allWho,note},...(item.log||[])];
    persist(nd); setActiveId(null); setNote(""); setCoWorkers([]); setCoWorkerInput(""); setLogDate(todayStr());
  }
  function deleteLog(cleanId,logId){
    if(!window.confirm("この記録を削除しますか？"))return;
    const nd=JSON.parse(JSON.stringify(data));
    const item=nd.cleaning.find(c=>c.id===cleanId); if(!item)return;
    item.log=item.log.filter(l=>l.id!==logId); persist(nd);
  }
  function saveEditLog(){
    if(!editLog)return;
    const nd=JSON.parse(JSON.stringify(data));
    const item=nd.cleaning.find(c=>c.id===editLog.cleanId); if(!item)return;
    item.log[editLog.logIdx]={...item.log[editLog.logIdx],note:editLogNote};
    persist(nd); setEditLog(null);
  }
  function addCleanItem(){
    if(!newClean.name.trim())return;
    const nd=JSON.parse(JSON.stringify(data));
    nd.cleaning=[...(nd.cleaning||[]),{id:"cl_"+Date.now(),name:newClean.name.trim(),freq:newClean.freq,steps:newClean.steps,log:[]}];
    persist(nd); setShowAddItem(false); setNewClean({name:"",freq:"溜まったら",steps:""});
  }
  function removeCleanItem(id){
    if(!window.confirm("本当に削除しますか？"))return;
    const nd=JSON.parse(JSON.stringify(data));
    nd.cleaning=nd.cleaning.filter(c=>c.id!==id); persist(nd);
  }
  function saveSteps(id){
    const nd=JSON.parse(JSON.stringify(data));
    const item=nd.cleaning.find(c=>c.id===id); if(!item)return;
    item.steps=stepsInput;
    persist(nd); setEditSteps(null);
  }

  return(
    <div>
      <div style={S.sectionHeader}>
        <span style={S.sectionTitle}>掃除・滅菌記録</span>
        <button style={S.smallBtn} onClick={()=>setShowAddItem(!showAddItem)}>＋ 項目追加</button>
      </div>
      {showAddItem&&(
        <div style={S.addCard}>
          <input style={S.input} placeholder="項目名 *" value={newClean.name} onChange={e=>setNewClean({...newClean,name:e.target.value})}/>
          <label style={S.label}>頻度</label>
          <select style={S.input} value={newClean.freq} onChange={e=>setNewClean({...newClean,freq:e.target.value})}>
            {FREQ_OPTIONS.map(f=><option key={f}>{f}</option>)}
          </select>
          <label style={S.label}>手順（任意）</label>
          <textarea style={{...S.input,minHeight:60,resize:"vertical"}} placeholder="手順を入力..."
            value={newClean.steps} onChange={e=>setNewClean({...newClean,steps:e.target.value})}/>
          <button style={S.btn} onClick={addCleanItem}>追加する</button>
        </div>
      )}
      <div style={S.itemList}>
        {sorted.map(item=>{
          const last=item.log?.[0];
          const days=last?daysDiff(last.date,today):null;
          const overdue=freqDays[item.freq]&&(days===null||days>=freqDays[item.freq]);
          const isActive=activeId===item.id;
          const isEditingSteps=editSteps===item.id;
          return(
            <div key={item.id} style={{...S.itemCard,...(overdue?S.itemCardLow:{})}}>
              <div style={S.itemTop}>
                <div>
                  <span style={S.itemName}>{overdue&&"⚠️ "}{item.name}</span>
                  <span style={S.freqBadge}>{item.freq}</span>
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <button style={S.doneBtn} onClick={()=>{
                    setActiveId(isActive?null:item.id);
                    setNote(""); setCoWorkers([]); setCoWorkerInput(""); setLogDate(todayStr());
                  }}>
                    {isActive?"✕":"✓ やった"}
                  </button>
                  <button style={{...S.iconBtn,fontSize:12,padding:"4px 8px",color:"#dc2626"}}
                    onClick={()=>removeCleanItem(item.id)}>🗑</button>
                </div>
              </div>

              {/* 手順 */}
              {isEditingSteps?(
                <div style={{marginTop:8}}>
                  <textarea style={{...S.input,minHeight:80,resize:"vertical"}} value={stepsInput}
                    onChange={e=>setStepsInput(e.target.value)} placeholder="手順を入力..."/>
                  <div style={{display:"flex",gap:6,marginTop:6}}>
                    <button style={{...S.btn,flex:2}} onClick={()=>saveSteps(item.id)}>保存</button>
                    <button style={{...S.btnOutline,flex:1}} onClick={()=>setEditSteps(null)}>キャンセル</button>
                  </div>
                </div>
              ):(
                <div style={{marginTop:6}}>
                  {item.steps?(
                    <div style={{background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:8,padding:"8px 10px",fontSize:12,color:"#0369a1",whiteSpace:"pre-wrap"}}>
                      📋 {item.steps}
                    </div>
                  ):null}
                  <button style={{...S.iconBtn,fontSize:11,padding:"3px 8px",marginTop:4,color:"#6b7280"}}
                    onClick={()=>{setEditSteps(item.id);setStepsInput(item.steps||"");}}>
                    {item.steps?"手順を編集":"＋ 手順を追加"}
                  </button>
                </div>
              )}

              <div style={S.lastLog}>
                {last?`最終：${last.date}（${days===0?"今日":`${days}日前`}）　${last.who}${last.note?`「${last.note}」`:""}` :"まだ記録なし"}
              </div>

              {isActive&&(
                <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:8}}>
                  <div>
                    <label style={S.label}>日付</label>
                    <input style={{...S.input,boxSizing:"border-box",width:"100%"}} type="date"
                      value={logDate} onChange={e=>setLogDate(e.target.value)}/>
                  </div>
                  <div>
                    <label style={S.label}>一緒にした人（何人でも追加可）</label>
                    <div style={{display:"flex",gap:6}}>
                      <input style={{...S.input,flex:1}} placeholder="名前を入力してEnter"
                        value={coWorkerInput} onChange={e=>setCoWorkerInput(e.target.value)}
                        onKeyDown={e=>e.key==="Enter"&&addCoWorker()}/>
                      <button style={{...S.smallBtn}} onClick={addCoWorker}>追加</button>
                    </div>
                    {coWorkers.length>0&&(
                      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6}}>
                        {coWorkers.map(c=>(
                          <span key={c} style={{background:"#dbeafe",border:"1px solid #93c5fd",borderRadius:16,
                            padding:"3px 10px",fontSize:12,color:"#1d4ed8",display:"flex",alignItems:"center",gap:4}}>
                            {c}
                            <button onClick={()=>removeCoWorker(c)}
                              style={{background:"none",border:"none",cursor:"pointer",color:"#6b7280",fontSize:14,padding:0,lineHeight:1}}>×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <input style={S.input} placeholder="メモ（任意）" value={note} onChange={e=>setNote(e.target.value)}/>
                  <button style={S.btn} onClick={()=>logItem(item.id)}>記録する</button>
                </div>
              )}

              {item.log?.length>0&&(
                <details style={{marginTop:6}}>
                  <summary style={{color:"#6b7280",fontSize:12,cursor:"pointer"}}>履歴（{item.log.length}件）</summary>
                  <div style={S.logList}>
                    {item.log.map((l,i)=>(
                      <div key={l.id||i} style={{...S.logEntry,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:6}}>
                        {editLog?.cleanId===item.id&&editLog?.logIdx===i?(
                          <div style={{flex:1,display:"flex",gap:4}}>
                            <input style={{...S.input,flex:1,padding:"4px 8px",fontSize:12}} value={editLogNote}
                              onChange={e=>setEditLogNote(e.target.value)}/>
                            <button style={{...S.btn,width:36,padding:0,fontSize:12}} onClick={saveEditLog}>✓</button>
                            <button style={{...S.btnOutline,width:36,padding:0,fontSize:12}} onClick={()=>setEditLog(null)}>✕</button>
                          </div>
                        ):(
                          <>
                            <span style={{flex:1}}>{l.date}　{l.who}{l.note?`：${l.note}`:""}</span>
                            <div style={{display:"flex",gap:4,flexShrink:0}}>
                              <button style={{...S.iconBtn,padding:"2px 6px",fontSize:11}}
                                onClick={()=>{setEditLog({cleanId:item.id,logIdx:i});setEditLogNote(l.note||"");}}>編集</button>
                              <button style={{...S.iconBtn,padding:"2px 6px",fontSize:11,color:"#dc2626"}}
                                onClick={()=>deleteLog(item.id,l.id||`${item.id}_${i}`)}>🗑</button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </div>
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
  memberSelectBtn:{width:"100%",padding:"12px 16px",background:"#f9fafb",border:"1px solid #d1d5db",borderRadius:8,color:"#374151",fontSize:15,cursor:"pointer",fontFamily:"inherit",textAlign:"left"},
  memberSelectBtnActive:{background:"#dbeafe",border:"2px solid #1d4ed8",color:"#1d4ed8",fontWeight:700},
  homeTitle:{fontSize:17,fontWeight:700,color:"#111827",marginBottom:4},
  homeDate:{fontSize:13,color:"#6b7280",marginBottom:16},
  alertBox:{background:"#fff7ed",border:"2px solid #f97316",borderRadius:12,padding:14,marginBottom:16},
  alertTitle:{color:"#c2410c",fontSize:13,fontWeight:700,marginBottom:6},
  alertItem:{color:"#ea580c",fontSize:13,padding:"3px 0",cursor:"pointer"},
  homeSection:{background:"#fff",borderRadius:12,padding:14,marginBottom:12,border:"1px solid #e5e7eb",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"},
  homeSectionTitle:{fontSize:14,fontWeight:700,color:"#374151",marginBottom:8},
  homeResItem:{display:"flex",gap:8,alignItems:"center",padding:"6px 0",borderBottom:"1px solid #f3f4f6"},
  homeResBench:{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:6,padding:"2px 8px",fontSize:11,color:"#1d4ed8",flexShrink:0,fontWeight:600},
  homeResTime:{color:"#6b7280",fontSize:12,flexShrink:0},
  homeResName:{color:"#111827",fontSize:13,fontWeight:600},
  homeResMemo:{color:"#9ca3af",fontSize:11},
  homeLink:{marginTop:10,background:"none",border:"none",color:"#1d4ed8",fontSize:13,cursor:"pointer",padding:0,fontFamily:"inherit",display:"block"},
  datePicker:{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:12},
  dateBtn:{flexShrink:0,padding:"6px 10px",background:"#fff",border:"1px solid #d1d5db",borderRadius:20,color:"#374151",fontSize:11,cursor:"pointer",textAlign:"center",lineHeight:1.4},
  dateBtnActive:{background:"#eff6ff",border:"2px solid #1d4ed8",color:"#1d4ed8",fontWeight:700},
  weekBtn:{padding:"7px 14px",background:"#fff",border:"1px solid #d1d5db",borderRadius:8,color:"#374151",fontSize:12,cursor:"pointer",fontFamily:"inherit"},
  weekBtnActive:{background:"#eff6ff",border:"2px solid #1d4ed8",color:"#1d4ed8",fontWeight:700},
  benchBlock:{marginBottom:20},
  benchLabel:{color:"#111827",fontSize:14,fontWeight:700,marginBottom:8,borderLeft:"3px solid #1d4ed8",paddingLeft:8},
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
  existingSlot:{background:"#f9fafb",borderRadius:10,padding:14,display:"flex",gap:12,alignItems:"flex-start",border:"1px solid #e5e7eb"},
  sectionHeader:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12},
  sectionTitle:{fontSize:16,fontWeight:700,color:"#111827",display:"block",marginBottom:8},
  itemList:{display:"flex",flexDirection:"column",gap:8},
  itemCard:{background:"#fff",borderRadius:12,padding:14,border:"1px solid #e5e7eb",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"},
  itemCardLow:{border:"2px solid #f97316",background:"#fff7ed"},
  itemTop:{display:"flex",justifyContent:"space-between",alignItems:"flex-start"},
  itemName:{fontSize:14,fontWeight:600,color:"#111827"},
  itemStock:{fontSize:22,fontWeight:700,color:"#1d4ed8"},
  subLabel:{fontSize:11,color:"#9ca3af"},
  addCard:{background:"#fff",borderRadius:12,padding:14,marginBottom:12,display:"flex",flexDirection:"column",gap:8,border:"1px solid #d1d5db",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"},
  settingsEditor:{marginTop:10,background:"#f9fafb",borderRadius:10,padding:12,display:"flex",flexDirection:"column",gap:8,border:"1px solid #e5e7eb"},
  input:{width:"100%",padding:"10px 12px",background:"#fff",border:"1px solid #d1d5db",borderRadius:8,color:"#111827",fontSize:14,fontFamily:"inherit",boxSizing:"border-box"},
  btn:{width:"100%",padding:12,background:"#1d4ed8",border:"none",borderRadius:8,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"},
  btnOutline:{width:"100%",padding:11,background:"#fff",border:"1px solid #d1d5db",borderRadius:8,color:"#374151",fontSize:14,cursor:"pointer",fontFamily:"inherit"},
  btnDanger:{padding:"11px 14px",background:"#dc2626",border:"none",borderRadius:8,color:"#fff",fontSize:14,cursor:"pointer",fontFamily:"inherit"},
  smallBtn:{padding:"8px 14px",background:"#1d4ed8",border:"none",borderRadius:8,color:"#fff",fontSize:12,cursor:"pointer",fontFamily:"inherit"},
  iconBtn:{padding:"6px 10px",background:"#fff",border:"1px solid #d1d5db",borderRadius:8,fontSize:14,cursor:"pointer"},
  modeBtn:{flex:1,padding:"6px 0",background:"#f9fafb",border:"1px solid #d1d5db",borderRadius:6,color:"#6b7280",fontSize:11,cursor:"pointer",fontFamily:"inherit"},
  modeBtnActive:{background:"#eff6ff",border:"1px solid #1d4ed8",color:"#1d4ed8",fontWeight:700},
  label:{fontSize:12,color:"#374151",marginBottom:2,display:"block"},
  freqBadge:{marginLeft:8,padding:"2px 8px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:10,fontSize:11,color:"#6b7280"},
  doneBtn:{padding:"6px 12px",background:"#1d4ed8",border:"none",borderRadius:8,color:"#fff",fontSize:12,cursor:"pointer",fontFamily:"inherit",flexShrink:0},
  lastLog:{fontSize:12,color:"#6b7280",marginTop:4},
  logList:{marginTop:4,display:"flex",flexDirection:"column",gap:4},
  logEntry:{fontSize:11,color:"#6b7280",padding:"3px 8px"},
  empty:{color:"#9ca3af",textAlign:"center",padding:32,fontSize:14},
};
