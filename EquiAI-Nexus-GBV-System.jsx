import { useState, useRef, useEffect } from "react";

const TABS = ["Dashboard","HerData Commons","AI Analysis","Business Mentor","Admin Portal"];
const LGAS = ["Gboko","Makurdi","Otukpo","Katsina-Ala","Ushongo","Tarka"];
const COLORS = { Critical:"#dc2626", High:"#ea580c", Medium:"#d97706", Low:"#16a34a" };
const SOURCE_COLORS = { Web:"#6366f1", SMS:"#0891b2", USSD:"#7c3aed" };

// Offline-safe business tips shown over USSD (no AI / no internet required)
const OFFLINE_TIPS = [
  "Register your group with the Cooperative Office in your LGA to access BOI and NIRSAL loans.",
  "Keep a simple notebook: money in, money out, every market day. This helps you qualify for loans.",
  "Buy in bulk with 3-4 other women to get better prices from suppliers at Wurukum or Wadata market.",
  "OPay and Kuda agents can help you save small amounts weekly without a bank visit.",
  "Tie-dye and shea butter products sell well outside Benue - ask GECN about market linkage days.",
];

function genBeneficiaryId(type, reports) {
  const prefix = type === "GBV" ? "GBV" : type === "Economic Barrier" ? "ECO" : "OTH";
  const count = reports.filter(r => r.id.startsWith(prefix + "-")).length + 1;
  return `${prefix}-${String(count).padStart(3,"0")}`;
}

const SAMPLE_REPORTS = [
  { id:"GBV-001", date:"2024-06-01", lga:"Gboko", type:"GBV", severity:"High", summary:"Domestic violence reported near market area. Victim needs shelter.", source:"Web", reviewStatus:"Not Reviewed", aiPriority:null, aiReasoning:"", culturalFlag:false, culturalNote:"", advocacyNote:"", advocacyStakeholder:"", advocacyReleased:false, advocacyRequested:false },
  { id:"ECO-001", date:"2024-06-03", lga:"Makurdi", type:"Economic Barrier", severity:"Medium", summary:"Women traders denied loans by cooperative. Financial exclusion persists.", source:"Web", reviewStatus:"Not Reviewed", aiPriority:null, aiReasoning:"", culturalFlag:false, culturalNote:"", advocacyNote:"", advocacyStakeholder:"", advocacyReleased:false, advocacyRequested:false },
  { id:"GBV-002", date:"2024-06-05", lga:"Otukpo", type:"GBV", severity:"Critical", summary:"Sexual assault case. Perpetrator is community leader. Fear of reporting.", source:"SMS", reviewStatus:"Not Reviewed", aiPriority:null, aiReasoning:"", culturalFlag:false, culturalNote:"", advocacyNote:"", advocacyStakeholder:"", advocacyReleased:false, advocacyRequested:false },
  { id:"ECO-002", date:"2024-06-07", lga:"Gboko", type:"Economic Barrier", severity:"Low", summary:"No market access for rural women due to poor road infrastructure.", source:"USSD", reviewStatus:"Not Reviewed", aiPriority:null, aiReasoning:"", culturalFlag:false, culturalNote:"", advocacyNote:"", advocacyStakeholder:"", advocacyReleased:false, advocacyRequested:false },
  { id:"GBV-003", date:"2024-06-09", lga:"Katsina-Ala", type:"GBV", severity:"High", summary:"Early marriage case. Girl aged 14. Family pressure involved.", source:"USSD", reviewStatus:"Not Reviewed", aiPriority:null, aiReasoning:"", culturalFlag:false, culturalNote:"", advocacyNote:"", advocacyStakeholder:"", advocacyReleased:false, advocacyRequested:false },
];

function Badge({ label, color }) {
  return <span style={{ background: color||"#6366f1", color:"#fff", borderRadius:4, padding:"2px 8px", fontSize:12, fontWeight:600 }}>{label}</span>;
}

function Card({ title, value, sub, color }) {
  return (
    <div style={{ background:"#fff", borderRadius:12, padding:"18px 22px", boxShadow:"0 2px 8px #0001", borderLeft:`4px solid ${color||"#6366f1"}`, minWidth:160 }}>
      <div style={{ color:"#888", fontSize:13 }}>{title}</div>
      <div style={{ fontSize:28, fontWeight:800, color: color||"#1e1b4b" }}>{value}</div>
      {sub && <div style={{ color:"#aaa", fontSize:12 }}>{sub}</div>}
    </div>
  );
}

function HITLBanner({ text }) {
  return (
    <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:8, padding:"10px 14px", marginBottom:16, display:"flex", gap:10, alignItems:"flex-start" }}>
      <span style={{ fontSize:16 }}>⚠️</span>
      <div style={{ fontSize:13, color:"#92400e", lineHeight:1.6 }}>{text}</div>
    </div>
  );
}

function extractReportEntries(text) {
  return text.split(/\n+/).map(line => line.trim()).filter(Boolean).map((line, index) => {
    const match = line.match(/^\[(.*?)\]\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*:\s*(.*)$/i);
    if (!match) {
      return null;
    }
    const [, id, lga, type, severity, summary] = match;
    return {
      id: id || `AUTO-${String(index + 1).padStart(3, "0")}`,
      date: new Date().toISOString().split("T")[0],
      lga: lga?.trim() || "Unknown",
      type: type?.trim() || "GBV",
      severity: severity?.trim() || "Medium",
      summary: summary?.trim() || "",
      source: "Web",
      reviewStatus: "Not Reviewed",
      aiPriority: null,
      aiReasoning: "",
      culturalFlag: false,
      culturalNote: "",
      advocacyNote: "",
      advocacyStakeholder: "",
      advocacyReleased: false,
      advocacyRequested: false
    };
  }).filter(Boolean);
}

function fallbackAnalysis(text) {
  const entries = extractReportEntries(text);
  if (!entries.length) {
    return "No structured community reports were supplied. Paste one report per line in the format [ID] LGA | Type | Severity: Summary.";
  }

  const lgaSummary = entries.reduce((acc, entry) => {
    acc[entry.lga] = (acc[entry.lga] || 0) + 1;
    return acc;
  }, {});
  const topLgas = Object.entries(lgaSummary).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([lga, count]) => `${lga} (${count})`).join(", ");
  const severe = entries.filter(r => ["Critical", "High"].includes(r.severity)).length;
  const keywords = (text.toLowerCase().match(/(violence|assault|marriage|loan|market|denied|shelter|cooperative|trader|child|early)/g) || []).slice(0, 10);
  const uniqueKeywords = [...new Set(keywords)].join(", ");
  const typeSummary = entries.reduce((acc, entry) => {
    acc[entry.type] = (acc[entry.type] || 0) + 1;
    return acc;
  }, {});

  return [
    "PATTERNS",
    `- Most frequent reports are centered in ${topLgas}.`,
    `- Case mix is ${Object.entries(typeSummary).map(([key, value]) => `${key} (${value})`).join(", ")}.`,
    `- High-priority signals are concentrated around: ${uniqueKeywords || "none detected"}.`,
    `- ${severe} report(s) are marked Critical/High and should be escalated to ICO review first.`,
    "",
    "PRIORITY AREAS",
    `- Prioritize interventions in LGAs where multiple GBV and economic-barrier reports overlap.` ,
    `- Use the queue in Admin Portal to approve the highest severity cases before any outreach action is taken.`,
    "",
    "INTERVENTIONS",
    `- Activate safe shelter, referral, and livelihood support coordination for repeated high-severity reports in the same LGA.`,
    `- Expand cooperative support, women-market linkage, and small-business finance awareness in economic barrier clusters.`,
    "",
    "ADVOCACY POINTS",
    `- Advocate for faster community referral pathways, legal awareness, and protection for women reporting GBV.` ,
    `- Push policymakers to address market access, loan denial challenges, and rural infrastructure bottlenecks affecting women entrepreneurs.`,
    "",
    "CULTURAL/CONFIDENCE NOTES",
    `- The local dialect and cultural context may require human verification where report wording is ambiguous or sensitive. Keep case handling evidence-based and community-approved.`
  ].join("\n");
}

async function callClaude(systemPrompt, userPrompt, apiKey = "") {
  try {
    if (!apiKey) {
      return fallbackAnalysis(userPrompt);
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "x-api-key": apiKey,
        "anthropic-version":"2023-06-01"
      },
      body: JSON.stringify({
        model:"claude-sonnet-4-6",
        max_tokens:1000,
        system: systemPrompt,
        messages:[{ role:"user", content: userPrompt }]
      })
    });

    if (!res.ok) {
      return fallbackAnalysis(userPrompt);
    }

    const data = await res.json();
    return data.content?.map(b => b.text||"").join("") || "No response.";
  } catch (e) {
    return fallbackAnalysis(userPrompt);
  }
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function Dashboard({ reports, setTab }) {
  const gbv = reports.filter(r=>r.type==="GBV").length;
  const econ = reports.filter(r=>r.type==="Economic Barrier").length;
  const critical = reports.filter(r=>r.severity==="Critical").length;
  const pendingReview = reports.filter(r=>r.reviewStatus==="Pending ICO Review").length;
  const ussdCount = reports.filter(r=>r.source==="USSD").length;
  return (
    <div>
      <h2 style={{ color:"#1e1b4b", marginBottom:4 }}>EquiAI Nexus — Benue State Dashboard</h2>
      <p style={{ color:"#666", marginBottom:20 }}>AI-powered gender equity & economic empowerment platform</p>
      <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginBottom:24 }}>
        <Card title="Total Reports" value={reports.length} sub="All LGAs" color="#6366f1"/>
        <Card title="GBV Cases" value={gbv} sub="Active cases" color="#dc2626"/>
        <Card title="Econ Barriers" value={econ} sub="Documented" color="#d97706"/>
        <Card title="Critical Alerts" value={critical} sub="Needs action" color="#ef4444"/>
        <Card title="Pending ICO Review" value={pendingReview} sub="AI classifications awaiting human sign-off" color="#7c3aed"/>
        <Card title="USSD Reports" value={ussdCount} sub="No-internet submissions" color="#0891b2"/>
      </div>
      <div style={{ background:"#fff", borderRadius:12, padding:18, boxShadow:"0 2px 8px #0001", marginBottom:20 }}>
        <h3 style={{ margin:"0 0 12px", color:"#1e1b4b", fontSize:15 }}>Quick Actions</h3>
        {[["Submit New Report","HerData Commons"],["Run AI Analysis","AI Analysis"],["Ask Business Mentor","Business Mentor"],["Admin Portal","Admin Portal"]].map(([label,tab])=>(
          <button key={tab} onClick={()=>setTab(tab)} style={{ display:"block", width:"100%", margin:"6px 0", padding:"10px 14px", background:"#f5f3ff", border:"1px solid #e0e7ff", borderRadius:8, cursor:"pointer", textAlign:"left", color:"#1e1b4b", fontWeight:500 }}>{label}</button>
        ))}
      </div>
      <div style={{ background:"linear-gradient(135deg,#6366f1,#0891b2)", borderRadius:12, padding:20, color:"#fff" }}>
        <h3 style={{ margin:"0 0 10px" }}>About EquiAI Nexus</h3>
        <p style={{ margin:"0 0 10px", fontSize:14, lineHeight:1.7 }}>
          A hybrid platform for Benue State, Nigeria: a web app plus an SMS/USSD text-entry system so that women and girls without internet access can still report incidents, check on their case, and get offline business tips. AI never makes final decisions — every AI priority classification is reviewed by GECN's Information & Communication Officer before any referral or advocacy action is taken.
        </p>
        <div style={{ background:"rgba(255,255,255,0.15)", borderRadius:8, padding:"10px 14px" }}>
          <div style={{ fontWeight:700, fontSize:13 }}>An Initiative of Gender Equality Club Nigeria (GECN)</div>
          <div style={{ fontSize:12, opacity:0.9 }}>Championing justice, equity, and empowerment for women and girls across Nigeria.</div>
        </div>
      </div>
    </div>
  );
}

// ─── USSD SIMULATOR ──────────────────────────────────────────────────────────
// Simulates the *555# session a woman on a basic feature phone would dial.
// No internet or AI call happens in this flow - pure menu navigation, matching
// how a real USSD session works over a telecom aggregator (e.g. Africa's Talking,
// Termii). In production this component's logic runs on the aggregator's webhook,
// not in the browser - this view is a demo of that exact screen-by-screen flow.
function UssdSimulator({ reports, setReports }) {
  const [screen, setScreen] = useState("home");
  const [draft, setDraft] = useState({ type:"", lga:"", severity:"", summary:"", phone:"" });
  const [textInput, setTextInput] = useState("");
  const [statusQuery, setStatusQuery] = useState("");
  const [statusResult, setStatusResult] = useState(null);
  const [dialed, setDialed] = useState(false);
  const [confirmedId, setConfirmedId] = useState("");

  const reset = () => { setScreen("home"); setDraft({ type:"", lga:"", severity:"", summary:"", phone:"" }); setTextInput(""); setStatusQuery(""); setStatusResult(null); };

  const finalizeReport = () => {
    const id = genBeneficiaryId(draft.type, reports);
    const r = { id, date: new Date().toISOString().split("T")[0], lga: draft.lga, type: draft.type, severity: draft.severity, summary: draft.summary, source:"USSD", reviewStatus:"Not Reviewed", aiPriority:null, aiReasoning:"", culturalFlag:false, culturalNote:"" };
    setReports(prev=>[...prev, r]);
    setConfirmedId(id);
    setScreen("confirmed");
  };

  const screenText = () => {
    switch(screen) {
      case "home": return "Welcome to EquiAI Nexus\n1. Report an incident (GBV)\n2. Report economic barrier\n3. Business tips (offline)\n4. Check my report status\n0. Exit";
      case "lga": return `Select your LGA:\n${LGAS.map((l,i)=>`${i+1}. ${l}`).join("\n")}\n0. Back`;
      case "severity": return "How urgent is this?\n1. Low\n2. Medium\n3. High\n4. Critical - I am in danger now\n0. Back";
      case "summary": return "Reply with a short message describing what happened. Your name is not required.\n\n(Type your message below and press Send)";
      case "phone": return "Optional: enter a phone number if you want a counselor to call you. Or press 0 to skip.";
      case "confirmed": return `Thank you. Your report has been recorded.\n\nYour reference number is:\n${confirmedId}\n\nKeep this number safe. A GECN officer will review it. If you are in immediate danger, please go to the nearest safe location or police station.\n\n0. Return to menu`;
      case "tips": return `Offline Business Tip:\n\n${OFFLINE_TIPS[Math.floor(Math.random()*OFFLINE_TIPS.length)]}\n\n1. Another tip\n0. Back to menu`;
      case "statusEntry": return "Enter your reference number (e.g. GBV-001):";
      case "statusResult": return statusResult
        ? `Report ${statusResult.id}\nStatus: ${statusResult.reviewStatus}\nLGA: ${statusResult.lga}\n\n0. Back to menu`
        : `No report found with that reference number.\n\n0. Back to menu`;
      default: return "";
    }
  };

  const press = (key) => {
    if (!dialed) return;
    if (screen === "home") {
      if (key==="1") { setDraft(d=>({...d,type:"GBV"})); setScreen("lga"); }
      else if (key==="2") { setDraft(d=>({...d,type:"Economic Barrier"})); setScreen("lga"); }
      else if (key==="3") setScreen("tips");
      else if (key==="4") setScreen("statusEntry");
      else if (key==="0") { setDialed(false); reset(); }
    } else if (screen === "lga") {
      const idx = parseInt(key,10)-1;
      if (key==="0") setScreen("home");
      else if (LGAS[idx]) { setDraft(d=>({...d, lga:LGAS[idx]})); setScreen("severity"); }
    } else if (screen === "severity") {
      const map = {"1":"Low","2":"Medium","3":"High","4":"Critical"};
      if (key==="0") setScreen("lga");
      else if (map[key]) { setDraft(d=>({...d, severity:map[key]})); setScreen("summary"); }
    } else if (screen === "phone") {
      if (key==="0") { setDraft(d=>({...d, phone:""})); finalizeReport(); }
    } else if (screen === "tips") {
      if (key==="1") setScreen("tips");
      else if (key==="0") setScreen("home");
    } else if (screen === "confirmed") {
      if (key==="0") { setDialed(false); reset(); }
    } else if (screen === "statusResult") {
      if (key==="0") setScreen("home");
    }
  };

  const sendText = () => {
    if (screen === "summary") {
      if (!textInput.trim()) return;
      setDraft(d=>({...d, summary:textInput.trim()}));
      setTextInput("");
      setScreen("phone");
    } else if (screen === "statusEntry") {
      const found = reports.find(r=>r.id.toLowerCase() === statusQuery.trim().toLowerCase());
      setStatusResult(found || null);
      setScreen("statusResult");
    } else if (screen === "phone") {
      setDraft(d=>({...d, phone:textInput.trim()}));
      setTextInput("");
      finalizeReport();
    }
  };

  const keypadKeys = ["1","2","3","4","5","6","7","8","9","*","0","#"];

  return (
    <div style={{ display:"flex", gap:24, flexWrap:"wrap", alignItems:"flex-start" }}>
      <div style={{ background:"#1e1b4b", borderRadius:28, padding:16, width:280, boxShadow:"0 8px 24px #0003" }}>
        <div style={{ background:"#c7d2fe", borderRadius:10, padding:14, minHeight:170, marginBottom:14, fontFamily:"monospace", fontSize:12.5, whiteSpace:"pre-wrap", color:"#1e1b4b", lineHeight:1.6 }}>
          {!dialed ? "No SIM session active.\n\nDial *555# to begin." : screenText()}
        </div>

        {(screen==="summary" || screen==="phone" || screen==="statusEntry") && dialed && (
          <div style={{ display:"flex", gap:6, marginBottom:10 }}>
            <input
              value={ screen==="statusEntry" ? statusQuery : textInput }
              onChange={e=> screen==="statusEntry" ? setStatusQuery(e.target.value) : setTextInput(e.target.value) }
              placeholder="Type message…"
              style={{ flex:1, padding:"8px 10px", borderRadius:6, border:"none", fontSize:13 }}
            />
            <button onClick={sendText} style={{ background:"#16a34a", color:"#fff", border:"none", borderRadius:6, padding:"8px 12px", fontWeight:700, cursor:"pointer", fontSize:12 }}>Send</button>
          </div>
        )}

        {!dialed ? (
          <button onClick={()=>{ setDialed(true); setScreen("home"); }} style={{ width:"100%", background:"#16a34a", color:"#fff", border:"none", borderRadius:8, padding:"10px", fontWeight:700, cursor:"pointer" }}>Dial *555#</button>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
            {keypadKeys.map(k=>(
              <button key={k} onClick={()=>press(k)} style={{ background:"#312e81", color:"#fff", border:"none", borderRadius:8, padding:"10px 0", fontWeight:700, cursor:"pointer" }}>{k}</button>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex:1, minWidth:260 }}>
        <h3 style={{ color:"#1e1b4b", marginTop:0 }}>How USSD access works</h3>
        <p style={{ color:"#555", fontSize:14, lineHeight:1.7 }}>
          This panel simulates the exact screen flow a woman on a basic feature phone sees when she dials <strong>*555#</strong> — no internet, no app install, no data cost, works on any GSM network. She navigates with number keys only, and every report she submits gets the same anonymized Beneficiary ID (e.g. <strong>GBV-004</strong>) and lands in the same secure database as web and SMS reports.
        </p>
        <p style={{ color:"#555", fontSize:14, lineHeight:1.7 }}>
          In production, this session logic runs on a telecom aggregator such as <strong>Africa's Talking</strong> or <strong>Termii</strong>, which relays USSD input from the network to GECN's backend over their API — the browser here is standing in for that webhook exchange so the flow can be tested and shown to the Tiv Traditional Council and staff during design workshops.
        </p>
        <div style={{ background:"#fff", borderRadius:10, padding:14, boxShadow:"0 2px 8px #0001", marginTop:14 }}>
          <div style={{ fontWeight:700, color:"#1e1b4b", fontSize:13, marginBottom:6 }}>Why offline tips, not AI chat, over USSD</div>
          <div style={{ color:"#666", fontSize:13, lineHeight:1.6 }}>
            USSD sessions are plain text with no internet leg to the AI model, so option 3 serves pre-approved, static business tips instead of a live Claude response. Women who want the full AI Business Mentor conversation can use the web app when data or wifi is available, or visit a GECN field officer with a shared tablet.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HERDATA COMMONS ─────────────────────────────────────────────────────────
function HerDataCommons({ reports, setReports }) {
  const [mode, setMode] = useState("web");
  const [form, setForm] = useState({ lga:"Gboko", type:"GBV", severity:"Medium", summary:"", name:"", phone:"" });
  const [sms, setSms] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [lastId, setLastId] = useState("");

  const submit = () => {
    if (!form.summary.trim()) return;
    const id = genBeneficiaryId(form.type, reports);
    const r = { id, date: new Date().toISOString().split("T")[0], lga:form.lga, type:form.type, severity:form.severity, summary:form.summary, source:"Web", reviewStatus:"Not Reviewed", aiPriority:null, aiReasoning:"", culturalFlag:false, culturalNote:"" };
    setReports(prev=>[...prev, r]);
    setLastId(id);
    setSubmitted(true);
    setTimeout(()=>setSubmitted(false), 4000);
    setForm(f=>({...f, summary:"", name:"", phone:""}));
  };

  const submitSms = () => {
    if (!sms.trim()) return;
    const id = genBeneficiaryId("GBV", reports);
    const r = { id, date: new Date().toISOString().split("T")[0], lga:"Unknown", type:"GBV", severity:"Medium", summary: sms, source:"SMS", reviewStatus:"Not Reviewed", aiPriority:null, aiReasoning:"", culturalFlag:false, culturalNote:"" };
    setReports(prev=>[...prev, r]);
    setSms("");
    setLastId(id);
    setSubmitted(true);
    setTimeout(()=>setSubmitted(false), 4000);
  };

  return (
    <div>
      <h2 style={{ color:"#1e1b4b" }}>HerData Commons — Data Intake</h2>
      <p style={{ color:"#666" }}>Secure, multi-channel reporting for women and community actors across Benue LGAs — web, SMS, or USSD for areas with no internet.</p>
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {["web","sms","ussd"].map(m=>(
          <button key={m} onClick={()=>setMode(m)} style={{ padding:"8px 20px", borderRadius:20, border:"none", cursor:"pointer", background: mode===m?"#6366f1":"#e0e7ff", color: mode===m?"#fff":"#4338ca", fontWeight:600 }}>
            {m==="web"?"Web Form": m==="sms" ? "SMS Mode" : "USSD (No Internet)"}
          </button>
        ))}
      </div>

      {submitted && <div style={{ background:"#dcfce7", border:"1px solid #16a34a", borderRadius:8, padding:12, marginBottom:16, color:"#16a34a", fontWeight:600 }}>Report submitted. Beneficiary ID: {lastId}. Identity is anonymized — only this ID is used in review and analysis.</div>}

      {mode==="web" && (
        <div style={{ background:"#fff", borderRadius:12, padding:24, boxShadow:"0 2px 8px #0001", maxWidth:600 }}>
          <h3 style={{ margin:"0 0 16px", color:"#1e1b4b" }}>New Incident / Barrier Report</h3>
          {[["LGA",LGAS,"lga"],["Report Type",["GBV","Economic Barrier","Other"],"type"],["Severity",["Low","Medium","High","Critical"],"severity"]].map(([label,opts,key])=>(
            <div key={key} style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontWeight:600, color:"#374151", fontSize:13, marginBottom:4 }}>{label}</label>
              <select value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d1d5db", fontSize:14 }}>
                {opts.map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontWeight:600, color:"#374151", fontSize:13, marginBottom:4 }}>Incident Summary *</label>
            <textarea value={form.summary} onChange={e=>setForm(f=>({...f,summary:e.target.value}))} rows={4} placeholder="Describe the incident or barrier in detail..." style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d1d5db", fontSize:14, resize:"vertical", boxSizing:"border-box" }}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
            <div>
              <label style={{ display:"block", fontWeight:600, color:"#374151", fontSize:13, marginBottom:4 }}>Reporter Name (optional)</label>
              <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Anonymous if blank" style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d1d5db", fontSize:14, boxSizing:"border-box" }}/>
            </div>
            <div>
              <label style={{ display:"block", fontWeight:600, color:"#374151", fontSize:13, marginBottom:4 }}>Phone (optional)</label>
              <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="+234..." style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d1d5db", fontSize:14, boxSizing:"border-box" }}/>
            </div>
          </div>
          <button onClick={submit} style={{ background:"#6366f1", color:"#fff", border:"none", borderRadius:8, padding:"12px 28px", fontWeight:700, cursor:"pointer", fontSize:15 }}>Submit Report</button>
        </div>
      )}

      {mode==="sms" && (
        <div style={{ background:"#fff", borderRadius:12, padding:24, boxShadow:"0 2px 8px #0001", maxWidth:500 }}>
          <h3 style={{ margin:"0 0 8px", color:"#1e1b4b" }}>SMS Report Entry</h3>
          <p style={{ color:"#888", fontSize:13, marginBottom:16 }}>Paste or type an SMS message received from the field. The system logs it as-is for staff triage; a plain SMS costs the sender only the price of a text.</p>
          <textarea value={sms} onChange={e=>setSms(e.target.value)} rows={5} placeholder="e.g. GBV Gboko HIGH woman beaten by husband needs help urgent" style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d1d5db", fontSize:14, resize:"vertical", boxSizing:"border-box", marginBottom:12 }}/>
          <button onClick={submitSms} style={{ background:"#0891b2", color:"#fff", border:"none", borderRadius:8, padding:"12px 24px", fontWeight:700, cursor:"pointer" }}>Process SMS</button>
        </div>
      )}

      {mode==="ussd" && <UssdSimulator reports={reports} setReports={setReports}/>}


    </div>
  );
}

// ─── AI ANALYSIS ─────────────────────────────────────────────────────────────
function AIAnalysis({ reports, setReports }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [text, setText] = useState(reports.map(r=>`[${r.id}] ${r.lga} | ${r.type} | ${r.severity}: ${r.summary}`).join("\n"));
  const [classifying, setClassifying] = useState(null);
  const [analystInput, setAnalystInput] = useState(reports.map(r=>`[${r.id}] ${r.lga} | ${r.type} | ${r.severity}: ${r.summary}`).join("\n"));
  const [toast, setToast] = useState("");
  const [toastTone, setToastTone] = useState("success");
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("equiai-anthropic-key") || "";
  });
  const [saveKey, setSaveKey] = useState(true);
  const [mode, setMode] = useState(apiKey ? "live" : "fallback");
  const [connectionStatus, setConnectionStatus] = useState("Not tested");

  useEffect(()=>{
    if (typeof window !== "undefined" && saveKey) {
      window.localStorage.setItem("equiai-anthropic-key", apiKey);
    } else if (typeof window !== "undefined" && !saveKey) {
      window.localStorage.removeItem("equiai-anthropic-key");
    }
  }, [apiKey, saveKey]);

  useEffect(()=>{
    setMode(apiKey ? "live" : "fallback");
  }, [apiKey]);

  useEffect(()=>{
    const reportLines = reports.map(r=>`[${r.id}] ${r.lga} | ${r.type} | ${r.severity}: ${r.summary}`).join("\n");
    setText(reportLines);
    setAnalystInput(reportLines);
  },[reports]);

  const addAnalystReports = () => {
    const parsed = extractReportEntries(analystInput);
    if (!parsed.length) return;
    const nextReports = [...reports, ...parsed];
    setReports(nextReports);
    setToast(`Added ${parsed.length} report(s) to the queue.`);
    setToastTone("success");
    setResult(`Added ${parsed.length} community report(s) to the analyst queue. Use the review queue in Admin Portal to approve the AI priority suggestions.`);
  };

  const analyze = async () => {
    setLoading(true); setResult("");
    setToast("Running aggregate analysis…");
    setToastTone("success");
    try {
      const res = await callClaude(
        "You are an AI analyst for EquiAI Nexus, a gender equity platform in Benue State, Nigeria. Analyze anonymized community reports about GBV and economic barriers, identified only by Beneficiary ID. Provide: 1) Key patterns and themes, 2) Priority classifications by LGA, 3) Recommended interventions, 4) Advocacy talking points for policymakers. Be specific and evidence-based. If any report seems to depend on Tiv cultural or dialect context you are not confident about, say so explicitly rather than guessing. This output is an aggregate pattern report for advocacy planning only - it does not authorize any individual case action.",
        `Analyze these anonymized community reports:\n\n${text}\n\nProvide a structured intelligence report with sections: PATTERNS, PRIORITY AREAS, INTERVENTIONS, ADVOCACY POINTS, CULTURAL/CONFIDENCE NOTES.`,
        apiKey
      );
      setToast("Aggregate analysis complete.");
      setToastTone("success");
      setResult(res);
    } catch(e) { setToast("Error calling AI. Please try again."); setToastTone("error"); setResult("Error calling AI. Please try again."); }
    setLoading(false);
  };

  const classifyReport = async (report) => {
    setClassifying(report.id);
    try {
      const res = await callClaude(
        "You classify individual GBV and economic-barrier reports for EquiAI Nexus in Benue State, Nigeria, by Beneficiary ID only - never ask for or infer real names. Respond ONLY with JSON, no other text, in this exact shape: {\"priority\":\"Low|Medium|High|Critical\",\"reasoning\":\"one or two sentences\",\"culturalNote\":\"note any Tiv/local dialect or cultural context you are uncertain about, or empty string if none\"}. This classification is a recommendation only - a human officer will review it before any action is taken.",
        `Report ${report.id} (${report.lga}, ${report.type}, self-reported severity: ${report.severity}): ${report.summary}`,
        apiKey
      );
      const clean = res.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);
      setReports(prev => prev.map(r => r.id===report.id ? { ...r, aiPriority: parsed.priority, aiReasoning: parsed.reasoning, culturalNote: parsed.culturalNote || "", reviewStatus: "Pending ICO Review" } : r));
    } catch(e) {
      setReports(prev => prev.map(r => r.id===report.id ? { ...r, aiReasoning:"AI classification failed - needs manual triage.", reviewStatus:"Pending ICO Review" } : r));
    }
    setClassifying(null);
  };

  const classifyAllPending = async () => {
    const pending = reports.filter(r=>r.reviewStatus==="Not Reviewed");
    if (!pending.length) return;
    for (const report of pending) {
      await classifyReport(report);
    }
  };

  const testConnection = async () => {
    if (!apiKey) {
      setConnectionStatus("Fallback mode only — no key provided");
      return;
    }
    setConnectionStatus("Testing Claude connection…");
    try {
      const res = await callClaude(
        "You are an AI analyst running a connectivity test. Reply only with the word READY.",
        "Test connection",
        apiKey
      );
      setConnectionStatus(res.trim().toUpperCase().includes("READY") ? "Claude reachable" : "Claude responded");
    } catch (e) {
      setConnectionStatus("Connection failed");
    }
  };

  const downloadResult = () => {
    if (!result.trim()) return;
    const blob = new Blob([result], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "equiai-nexus-ai-analysis-report.txt";
    anchor.click();
    URL.revokeObjectURL(url);
    setToast("Report downloaded.");
    setToastTone("success");
  };

  const exportQueue = () => {
    const queue = {
      exportedAt: new Date().toISOString(),
      summary: {
        totalReports: reports.length,
        pendingReview: reports.filter(r => r.reviewStatus === "Pending ICO Review").length,
        notReviewed: reports.filter(r => r.reviewStatus === "Not Reviewed").length,
        criticalCases: reports.filter(r => r.severity === "Critical").length
      },
      analysisSummary: result || "",
      records: reports.map(r => ({
        id: r.id,
        date: r.date,
        lga: r.lga,
        type: r.type,
        severity: r.severity,
        source: r.source,
        summary: r.summary,
        reviewStatus: r.reviewStatus,
        aiPriority: r.aiPriority,
        aiReasoning: r.aiReasoning,
        culturalFlag: r.culturalFlag,
        culturalNote: r.culturalNote
      }))
    };

    const blob = new Blob([JSON.stringify(queue, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "equiai-nexus-review-queue.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const copySummary = async () => {
    const summary = JSON.stringify({
      exportedAt: new Date().toISOString(),
      summary: {
        totalReports: reports.length,
        pendingReview: reports.filter(r => r.reviewStatus === "Pending ICO Review").length,
        notReviewed: reports.filter(r => r.reviewStatus === "Not Reviewed").length,
        criticalCases: reports.filter(r => r.severity === "Critical").length
      },
      analysisSummary: result || ""
    }, null, 2);

    try {
      await navigator.clipboard.writeText(summary);
      setToast("Summary snapshot copied to clipboard.");
      setToastTone("success");
      setResult("Summary snapshot copied to clipboard.");
    } catch (e) {
      setToast("Clipboard copy unavailable in this browser.");
      setToastTone("error");
      setResult("Clipboard copy unavailable in this browser.");
    }
  };

  const lgas = [...new Set(reports.map(r=>r.lga))];
  const lgaCounts = lgas.map(l=>({ lga:l, count: reports.filter(r=>r.lga===l).length }));
  const unclassified = reports.filter(r=>r.reviewStatus==="Not Reviewed");
  const statusLine = [
    `Action: ${toast || "Idle"}`,
    `Mode: ${mode === "live" ? "Live Claude" : "Fallback"}`,
    `Result: ${connectionStatus}`
  ].join(" • ");

  return (
    <div>
      <h2 style={{ color:"#1e1b4b" }}>AI Processing & Analysis</h2>
      <p style={{ color:"#666" }}>Paste community reports for NLP pattern detection, priority classification, advocacy insights, and admin review queue routing.</p>
      <HITLBanner text="AI outputs on this page are recommendations only. The system does not automate legal aid referrals, police interventions, or advocacy actions — GECN's Information & Communication Officer reviews and approves every priority classification in the Admin Portal before anything is actioned." />

      {toast && (
        <div style={{ background: toastTone==="error"?"#fef2f2":"#dcfce7", border:`1px solid ${toastTone==="error"?"#dc2626":"#16a34a"}`, borderRadius:10, padding:"10px 14px", marginBottom:16, color: toastTone==="error"?"#991b1b":"#166534", fontWeight:700, fontSize:13, display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
          <span>{toast}</span>
          <button onClick={()=>setToast("")} style={{ background:"transparent", border:"none", color: toastTone==="error"?"#991b1b":"#166534", fontWeight:900, cursor:"pointer", fontSize:16 }}>×</button>
        </div>
      )}

      <div style={{ display:"flex", gap:16, marginBottom:24, flexWrap:"wrap" }}>
        <div style={{ background:"#fff", borderRadius:12, padding:18, boxShadow:"0 2px 8px #0001", flex:1, minWidth:260 }}>
          <h4 style={{ margin:"0 0 12px", color:"#1e1b4b" }}>Reports by LGA</h4>
          {lgaCounts.map(({lga,count})=>(
            <div key={lga} style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:3 }}>
                <span>{lga}</span><span style={{ fontWeight:700 }}>{count}</span>
              </div>
              <div style={{ background:"#e0e7ff", borderRadius:4, height:10 }}>
                <div style={{ background:"#6366f1", borderRadius:4, height:10, width:`${reports.length ? (count/reports.length)*100 : 0}%` }}/>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background:"#fff", borderRadius:12, padding:18, boxShadow:"0 2px 8px #0001", flex:1, minWidth:260 }}>
          <h4 style={{ margin:"0 0 12px", color:"#1e1b4b" }}>Severity Heatmap (self-reported)</h4>
          {["Critical","High","Medium","Low"].map(s=>{
            const cnt = reports.filter(r=>r.severity===s).length;
            return (
              <div key={s} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <Badge label={s} color={COLORS[s]}/>
                <div style={{ flex:1, background:"#f3f4f6", borderRadius:4, height:18 }}>
                  <div style={{ background:COLORS[s], borderRadius:4, height:18, width:`${reports.length ? (cnt/reports.length)*100 : 0}%`, transition:"width 0.4s" }}/>
                </div>
                <span style={{ fontSize:13, fontWeight:700, minWidth:20 }}>{cnt}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background:"#fff", borderRadius:12, padding:20, boxShadow:"0 2px 8px #0001", marginBottom:20 }}>
        <h4 style={{ margin:"0 0 10px", color:"#1e1b4b" }}>Analyst Case Intake</h4>
        <p style={{ color:"#888", fontSize:13, marginBottom:12 }}>Paste community reports in the format <strong>[GBV-004] Gboko | GBV | High: Woman escaped abuse and needs shelter referral.</strong> One per line.</p>
        <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:12, flexWrap:"wrap" }}>
          <input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="Paste Anthropic Claude API key" style={{ flex:1, minWidth:240, padding:"10px 12px", borderRadius:8, border:"1px solid #d1d5db", fontSize:13 }} />
          <label style={{ display:"flex", alignItems:"center", gap:6, color:"#374151", fontSize:12, fontWeight:600 }}>
            <input type="checkbox" checked={saveKey} onChange={e=>setSaveKey(e.target.checked)} />
            Save key in browser
          </label>
          <span style={{ background: mode==="live"?"#dcfce7":"#fef3c7", color: mode==="live"?"#166534":"#92400e", padding:"4px 10px", borderRadius:999, fontSize:12, fontWeight:700 }}>
            {mode === "live" ? "Live Claude mode" : "Fallback mode"}
          </span>
        </div>
        <textarea value={analystInput} onChange={e=>setAnalystInput(e.target.value)} rows={8} style={{ width:"100%", padding:"10px 12px", borderRadius:8, border:"1px solid #d1d5db", fontSize:13, fontFamily:"monospace", resize:"vertical", boxSizing:"border-box" }}/>
        <div style={{ display:"flex", gap:10, marginTop:10, flexWrap:"wrap" }}>
          <button onClick={addAnalystReports} style={{ background:"#0891b2", color:"#fff", border:"none", borderRadius:8, padding:"12px 20px", fontWeight:700, cursor:"pointer" }}>Append to Analyst Queue</button>
          <button onClick={classifyAllPending} style={{ background:"#7c3aed", color:"#fff", border:"none", borderRadius:8, padding:"12px 20px", fontWeight:700, cursor:"pointer" }}>Classify all Pending Cases</button>
          <button onClick={testConnection} style={{ background:"#16a34a", color:"#fff", border:"none", borderRadius:8, padding:"12px 20px", fontWeight:700, cursor:"pointer" }}>Test Claude Connection</button>
          <button onClick={exportQueue} style={{ background:"#0f172a", color:"#fff", border:"none", borderRadius:8, padding:"12px 20px", fontWeight:700, cursor:"pointer" }}>Export Review Queue</button>
        </div>
        <div style={{ marginTop:10, color:"#475569", fontSize:12, fontWeight:700, padding:"8px 10px", borderRadius:8, background:"#f8fafc", border:"1px solid #e2e8f0" }}>{statusLine}</div>
      </div>

      <div style={{ background:"#fff", borderRadius:12, padding:20, boxShadow:"0 2px 8px #0001", marginBottom:20 }}>
        <h4 style={{ margin:"0 0 10px", color:"#1e1b4b" }}>Per-Report AI Priority Classification</h4>
        <p style={{ color:"#888", fontSize:13, marginBottom:12 }}>Classify individual reports so the ICO can review and approve them in the Admin Portal's review queue.</p>
        {unclassified.length===0 ? (
          <div style={{ color:"#16a34a", fontSize:13, fontWeight:600 }}>All reports have been classified or reviewed.</div>
        ) : unclassified.map(r=>(
          <div key={r.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #f0f0f0", padding:"8px 0" }}>
            <div style={{ fontSize:13 }}><strong style={{ color:"#6366f1" }}>{r.id}</strong> — {r.lga} — {r.summary.substring(0,50)}…</div>
            <button onClick={()=>classifyReport(r)} disabled={classifying===r.id} style={{ background: classifying===r.id?"#9ca3af":"#7c3aed", color:"#fff", border:"none", borderRadius:6, padding:"6px 14px", fontSize:12, fontWeight:700, cursor: classifying===r.id?"not-allowed":"pointer" }}>
              {classifying===r.id ? "Classifying…" : "Classify with AI"}
            </button>
          </div>
        ))}
      </div>

      <div style={{ background:"#fff", borderRadius:12, padding:20, boxShadow:"0 2px 8px #0001", marginBottom:20 }}>
        <h4 style={{ margin:"0 0 10px", color:"#1e1b4b" }}>Aggregate Data (editable)</h4>
        <textarea value={text} onChange={e=>setText(e.target.value)} rows={8} style={{ width:"100%", padding:"10px 12px", borderRadius:8, border:"1px solid #d1d5db", fontSize:13, fontFamily:"monospace", resize:"vertical", boxSizing:"border-box" }}/>
        <button onClick={analyze} disabled={loading} style={{ marginTop:10, background: loading?"#9ca3af":"#6366f1", color:"#fff", border:"none", borderRadius:8, padding:"12px 28px", fontWeight:700, cursor: loading?"not-allowed":"pointer", fontSize:15 }}>
          {loading ? "Analyzing with AI…" : "Run Aggregate Pattern Analysis"}
        </button>
      </div>

      {result && (
        <div style={{ background:"#fff", borderRadius:12, padding:24, boxShadow:"0 2px 8px #0001", borderLeft:"4px solid #6366f1" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap", marginBottom:12 }}>
            <h3 style={{ margin:0, color:"#1e1b4b" }}>AI Intelligence Report (advocacy-level, not case-level)</h3>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <button onClick={downloadResult} style={{ background:"#0f172a", color:"#fff", border:"none", borderRadius:8, padding:"10px 16px", fontWeight:700, cursor:"pointer" }}>Download Report</button>
              <button onClick={copySummary} style={{ background:"#4338ca", color:"#fff", border:"none", borderRadius:8, padding:"10px 16px", fontWeight:700, cursor:"pointer" }}>Copy Summary</button>
            </div>
          </div>
          <pre style={{ whiteSpace:"pre-wrap", fontFamily:"inherit", fontSize:14, lineHeight:1.8, color:"#1f2937" }}>{result}</pre>
        </div>
      )}
    </div>
  );
}

// ─── BUSINESS MENTOR ─────────────────────────────────────────────────────────
function BusinessMentor() {
  const [msgs, setMsgs] = useState([
    { role:"assistant", text:"Hello! I'm your AI Business Mentor. I specialize in entrepreneurship, market trends, and financial literacy for women in Benue State. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef();

  useEffect(()=>{ endRef.current?.scrollIntoView({ behavior:"smooth" }); },[msgs]);

  const send = async (text) => {
    const q = text || input.trim();
    if (!q) return;
    setInput("");
    setMsgs(m=>[...m,{ role:"user", text:q }]);
    setLoading(true);
    const history = [...msgs, { role:"user", text:q }];
    try {
      const res = await callClaude(
        "You are an AI Business Mentor for women entrepreneurs in Benue State, Nigeria. You have deep knowledge of: Tiv and Idoma cultural contexts, local markets (Gboko, Makurdi), yam and sorghum farming value chains, microfinance options (BOI, CBN, NIRSAL), women cooperatives, mobile money (OPay, Kuda), trade skills (tie-dye, pottery, food processing). Provide practical, culturally-sensitive, actionable advice. Keep responses concise and encouraging.",
        history.map(m=>`${m.role==="user"?"User":"Assistant"}: ${m.text}`).join("\n") + `\nUser: ${q}`
      );
      setMsgs(m=>[...m,{ role:"assistant", text:res }]);
    } catch(e) { setMsgs(m=>[...m,{ role:"assistant", text:"Sorry, I couldn't connect. Please try again." }]); }
    setLoading(false);
  };

  const suggestions = ["How do I start a food processing business in Gboko?","What microfinance options exist for women in Benue?","How to join a women's cooperative?","Tips for selling at Makurdi main market","How to keep simple business records?"];

  return (
    <div>
      <h2 style={{ color:"#1e1b4b" }}>A4HP Business Mentor — AI Digital Mentor</h2>
      <p style={{ color:"#666" }}>Get personalized entrepreneurship advice, market intelligence, and financial literacy guidance. Requires internet — women without data access can dial *555# for offline tips.</p>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
        {suggestions.map(s=>(
          <button key={s} onClick={()=>send(s)} style={{ background:"#ede9fe", color:"#4338ca", border:"1px solid #c4b5fd", borderRadius:20, padding:"6px 14px", fontSize:12, cursor:"pointer", fontWeight:500 }}>{s}</button>
        ))}
      </div>
      <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 2px 8px #0001", overflow:"hidden" }}>
        <div style={{ background:"linear-gradient(135deg,#6366f1,#0891b2)", padding:"14px 18px", color:"#fff", fontWeight:700 }}>Business Mentor Chat</div>
        <div style={{ height:380, overflowY:"auto", padding:16 }}>
          {msgs.map((m,i)=>(
            <div key={i} style={{ display:"flex", justifyContent: m.role==="user"?"flex-end":"flex-start", marginBottom:12 }}>
              <div style={{ maxWidth:"75%", background: m.role==="user"?"#6366f1":"#f3f4f6", color: m.role==="user"?"#fff":"#1f2937", borderRadius: m.role==="user"?"12px 12px 0 12px":"12px 12px 12px 0", padding:"10px 14px", fontSize:14, lineHeight:1.6 }}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display:"flex", justifyContent:"flex-start", marginBottom:12 }}>
              <div style={{ background:"#f3f4f6", borderRadius:"12px 12px 12px 0", padding:"10px 14px", color:"#6366f1", fontStyle:"italic" }}>Thinking…</div>
            </div>
          )}
          <div ref={endRef}/>
        </div>
        <div style={{ padding:12, borderTop:"1px solid #f0f0f0", display:"flex", gap:8 }}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask about business, finance, or market tips…" style={{ flex:1, padding:"10px 14px", borderRadius:8, border:"1px solid #d1d5db", fontSize:14 }}/>
          <button onClick={()=>send()} disabled={loading} style={{ background:"#6366f1", color:"#fff", border:"none", borderRadius:8, padding:"10px 18px", fontWeight:700, cursor:"pointer" }}>Send</button>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN PORTAL ─────────────────────────────────────────────────────────────
function AdminPortal({ reports, setReports }) {
  const [auth, setAuth] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [section, setSection] = useState("Review Queue");
  const [noteDraft, setNoteDraft] = useState({});
  const [advocacyDraft, setAdvocacyDraft] = useState({});
  const [stakeholderDraft, setStakeholderDraft] = useState({});
  const [releaseFilter, setReleaseFilter] = useState("all");

  const login = () => { if (pw==="admin123"){ setAuth(true); setErr(""); } else setErr("Invalid password."); };

  const decide = (id, decision) => {
    setReports(prev => prev.map(r => r.id===id ? { ...r, reviewStatus: decision } : r));
  };

  const toggleCulturalFlag = (id) => {
    setReports(prev => prev.map(r => r.id===id ? { ...r, culturalFlag: !r.culturalFlag } : r));
  };

  const saveNote = (id) => {
    setReports(prev => prev.map(r => r.id===id ? { ...r, culturalNote: noteDraft[id] ?? r.culturalNote } : r));
  };

  const saveAdvocacyNote = (id) => {
    setReports(prev => prev.map(r => r.id===id ? {
      ...r,
      advocacyNote: advocacyDraft[id] ?? r.advocacyNote,
      advocacyStakeholder: stakeholderDraft[id] ?? r.advocacyStakeholder,
      advocacyReleased: false,
      advocacyRequested: false
    } : r));
  };

  const requestAdvocacyRelease = (id) => {
    setReports(prev => prev.map(r => r.id===id ? { ...r, advocacyRequested: true } : r));
  };

  const releaseAdvocacyNote = (id) => {
    setReports(prev => prev.map(r => r.id===id ? { ...r, advocacyReleased: true, advocacyRequested: false } : r));
  };

  if (!auth) return (
    <div style={{ maxWidth:380, margin:"60px auto" }}>
      <div style={{ background:"#fff", borderRadius:16, padding:36, boxShadow:"0 4px 24px #0002", textAlign:"center" }}>
        <h2 style={{ color:"#1e1b4b", marginBottom:4 }}>Admin Portal</h2>
        <p style={{ color:"#888", fontSize:14, marginBottom:20 }}>Restricted to authorized staff (Information & Communication Officer)</p>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} placeholder="Enter password" style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid #d1d5db", fontSize:15, boxSizing:"border-box", marginBottom:10 }}/>
        {err && <div style={{ color:"#dc2626", fontSize:13, marginBottom:8 }}>{err}</div>}
        <button onClick={login} style={{ width:"100%", background:"#6366f1", color:"#fff", border:"none", borderRadius:8, padding:"12px", fontWeight:700, cursor:"pointer", fontSize:15 }}>Login</button>
        <p style={{ color:"#bbb", fontSize:12, marginTop:12 }}>Demo password: admin123</p>
      </div>
    </div>
  );

  const sections = ["Review Queue","GBV Case Log","Release Requests","Staff","Analytics","Settings"];
  const staff = [
    { name:"Amaka Tersoo", role:"Field Officer", lga:"Gboko", status:"Active" },
    { name:"Grace Ikyaator", role:"Data Analyst", lga:"Makurdi", status:"Active" },
    { name:"Ngozi Aondona", role:"Program Manager / ICO", lga:"HQ", status:"Active" },
    { name:"Sarah Mtswen", role:"Field Officer", lga:"Otukpo", status:"On Leave" },
  ];
  const pending = reports.filter(r=>r.reviewStatus==="Pending ICO Review");
  const flaggedCultural = reports.filter(r=>r.culturalFlag);
  const releaseRequests = reports.filter(r => (r.advocacyNote || r.advocacyStakeholder) && r.reviewStatus !== "Reviewed - No Action");
  const requestedReleaseCount = releaseRequests.filter(r => r.advocacyRequested).length;
  const protectedDraftCount = releaseRequests.filter(r => !r.advocacyRequested && !r.advocacyReleased).length;
  const releasedCount = releaseRequests.filter(r => r.advocacyReleased).length;
  const getAdvocacyStatus = (r) => {
    if (r.advocacyReleased) return { label:"Released", tone:"#16a34a", text:"Released to authorized request" };
    if (r.advocacyRequested) return { label:"Requested", tone:"#2563eb", text:"Release requested — waiting for admin approval" };
    return { label:"Protected Draft", tone:"#d97706", text:"Draft only — not visible to users" };
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h2 style={{ color:"#1e1b4b", margin:0 }}>Admin Portal</h2>
        <button onClick={()=>setAuth(false)} style={{ background:"#fee2e2", color:"#dc2626", border:"none", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontWeight:600 }}>Logout</button>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {sections.map(s=>(
          <button key={s} onClick={()=>setSection(s)} style={{ padding:"8px 18px", borderRadius:8, border:"none", cursor:"pointer", background: section===s?"#6366f1":"#e0e7ff", color: section===s?"#fff":"#4338ca", fontWeight:600, position:"relative" }}>
            {s}{s==="Review Queue" && pending.length>0 && <span style={{ marginLeft:6, background:"#dc2626", color:"#fff", borderRadius:10, padding:"1px 7px", fontSize:11 }}>{pending.length}</span>}{s==="Release Requests" && requestedReleaseCount>0 && <span style={{ marginLeft:6, background:"#0f766e", color:"#fff", borderRadius:10, padding:"1px 7px", fontSize:11 }}>{requestedReleaseCount}</span>}
          </button>
        ))}
      </div>

      {section==="Review Queue" && (
        <div>
          <HITLBanner text="Every AI-generated priority classification must be manually approved, escalated, or overridden here before any legal aid referral, police contact, or advocacy action is taken. This queue is the Human-in-the-Loop control point." />
          {pending.length===0 ? (
            <div style={{ background:"#fff", borderRadius:12, padding:24, boxShadow:"0 2px 8px #0001", color:"#888" }}>No AI classifications awaiting review. Run classifications from the AI Analysis tab.</div>
          ) : pending.map(r=>(
            <div key={r.id} style={{ background:"#fff", borderRadius:12, padding:18, boxShadow:"0 2px 8px #0001", marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8, flexWrap:"wrap", gap:8 }}>
                <div>
                  <span style={{ fontWeight:700, color:"#6366f1" }}>{r.id}</span>
                  <Badge label={r.source} color={SOURCE_COLORS[r.source]}/>
                  <span style={{ color:"#888", fontSize:12, marginLeft:8 }}>{r.lga} • {r.date}</span>
                </div>
                <Badge label={`AI: ${r.aiPriority || "n/a"}`} color={COLORS[r.aiPriority] || "#6366f1"}/>
              </div>
              <div style={{ fontSize:13, color:"#374151", marginBottom:8 }}>{r.summary}</div>
              <div style={{ background:"#f5f3ff", borderRadius:8, padding:"8px 12px", fontSize:13, color:"#4338ca", marginBottom:10 }}><strong>AI reasoning:</strong> {r.aiReasoning}</div>
              {r.culturalNote && <div style={{ background:"#fffbeb", borderRadius:8, padding:"8px 12px", fontSize:13, color:"#92400e", marginBottom:10 }}><strong>AI flagged uncertainty:</strong> {r.culturalNote}</div>}

              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
                <button onClick={()=>decide(r.id,"Reviewed - Actioned")} style={{ background:"#16a34a", color:"#fff", border:"none", borderRadius:6, padding:"6px 14px", fontSize:12, fontWeight:700, cursor:"pointer" }}>Approve & Action</button>
                <button onClick={()=>decide(r.id,"Reviewed - Escalated")} style={{ background:"#ea580c", color:"#fff", border:"none", borderRadius:6, padding:"6px 14px", fontSize:12, fontWeight:700, cursor:"pointer" }}>Escalate to Legal Partner</button>
                <button onClick={()=>decide(r.id,"Reviewed - No Action")} style={{ background:"#6b7280", color:"#fff", border:"none", borderRadius:6, padding:"6px 14px", fontSize:12, fontWeight:700, cursor:"pointer" }}>Override — No Action</button>
                <button onClick={()=>toggleCulturalFlag(r.id)} style={{ background: r.culturalFlag?"#dc2626":"#fee2e2", color: r.culturalFlag?"#fff":"#dc2626", border:"none", borderRadius:6, padding:"6px 14px", fontSize:12, fontWeight:700, cursor:"pointer" }}>{r.culturalFlag ? "Cultural Concern Flagged" : "Flag Cultural/Dialect Concern"}</button>
              </div>
              {r.culturalFlag && (
                <div style={{ display:"flex", gap:8 }}>
                  <input
                    value={noteDraft[r.id] ?? r.culturalNote ?? ""}
                    onChange={e=>setNoteDraft(d=>({...d,[r.id]:e.target.value}))}
                    placeholder="Note what the AI misread (dialect, custom, context) so prompts can be refined…"
                    style={{ flex:1, padding:"6px 10px", borderRadius:6, border:"1px solid #fecaca", fontSize:12 }}
                  />
                  <button onClick={()=>saveNote(r.id)} style={{ background:"#dc2626", color:"#fff", border:"none", borderRadius:6, padding:"6px 12px", fontSize:12, cursor:"pointer" }}>Save Note</button>
                </div>
              )}

              <div style={{ background:"#ecfeff", border:"1px solid #a5f3fc", borderRadius:10, padding:12, marginTop:10 }}>
                <div style={{ fontWeight:700, color:"#0f766e", fontSize:13, marginBottom:8 }}>Admin-only Advocacy Action Note</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 240px", gap:8, marginBottom:8 }}>
                  <textarea
                    value={advocacyDraft[r.id] ?? r.advocacyNote ?? ""}
                    onChange={e=>setAdvocacyDraft(d=>({...d,[r.id]:e.target.value}))}
                    rows={3}
                    placeholder="Write a specific advocacy action note for this case. State the exact policy, institution, or stakeholder responsible for implementation."
                    style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:"1px solid #67e8f9", fontSize:12, resize:"vertical", boxSizing:"border-box" }}
                  />
                  <input
                    value={stakeholderDraft[r.id] ?? r.advocacyStakeholder ?? ""}
                    onChange={e=>setStakeholderDraft(d=>({...d,[r.id]:e.target.value}))}
                    placeholder="Stateholder accountable"
                    style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:"1px solid #67e8f9", fontSize:12, boxSizing:"border-box" }}
                  />
                </div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                  <button onClick={()=>saveAdvocacyNote(r.id)} style={{ background:"#0f766e", color:"#fff", border:"none", borderRadius:6, padding:"6px 12px", fontSize:12, cursor:"pointer" }}>Save Draft</button>
                  <button onClick={()=>requestAdvocacyRelease(r.id)} style={{ background:r.advocacyRequested?"#d97706":"#2563eb", color:"#fff", border:"none", borderRadius:6, padding:"6px 12px", fontSize:12, cursor:"pointer" }}>{r.advocacyRequested ? "Requested" : "Request Release"}</button>
                  <button onClick={()=>releaseAdvocacyNote(r.id)} style={{ background:r.advocacyReleased?"#16a34a":"#7c3aed", color:"#fff", border:"none", borderRadius:6, padding:"6px 12px", fontSize:12, cursor:"pointer" }}>{r.advocacyReleased ? "Released" : "Approve Release"}</button>
                </div>
                {r.advocacyNote && r.advocacyStakeholder && (
                  <div style={{ marginTop:8, fontSize:12, color:"#0f172a" }}>
                    <strong>Hidden note status:</strong> {getAdvocacyStatus(r).text}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {section==="GBV Case Log" && (
        <div>
          <h3 style={{ color:"#1e1b4b" }}>GBV Case Log ({reports.length})</h3>
          <p style={{ color:"#888", fontSize:13, marginBottom:12 }}>Admin-only log of GBV and barrier reports. Advocacy notes are restricted to authorized staff and are not shown to users.</p>
          <table style={{ width:"100%", borderCollapse:"collapse", background:"#fff", borderRadius:12, overflow:"hidden", boxShadow:"0 2px 8px #0001" }}>
            <thead>
              <tr style={{ background:"#f5f3ff" }}>
                {["ID","Source","LGA","Type","Severity","Review Status"].map(h=><th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:13, color:"#4338ca", fontWeight:700 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {reports.map((r,i)=>(
                <tr key={r.id} style={{ background:i%2?"#fafafa":"#fff", borderTop:"1px solid #f0f0f0" }}>
                  <td style={{ padding:"8px 14px", fontWeight:700, color:"#6366f1", fontSize:13 }}>{r.id}</td>
                  <td style={{ padding:"8px 14px" }}><Badge label={r.source} color={SOURCE_COLORS[r.source]}/></td>
                  <td style={{ padding:"8px 14px", fontSize:13 }}>{r.lga}</td>
                  <td style={{ padding:"8px 14px", fontSize:13 }}>{r.type}</td>
                  <td style={{ padding:"8px 14px" }}><Badge label={r.severity} color={COLORS[r.severity]}/></td>
                  <td style={{ padding:"8px 14px", fontSize:12, color:"#555" }}>{r.reviewStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {section==="Release Requests" && (
        <div>
          <h3 style={{ color:"#1e1b4b" }}>Release Requests</h3>
          <p style={{ color:"#888", fontSize:13, marginBottom:12 }}>Admin-only queue for advocacy notes pending disclosure. Draft notes remain hidden; released notes are approved for authorized request.</p>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:14 }}>
            {[
              { key:"all", label:"All", color:"#6366f1", count: releaseRequests.length },
              { key:"draft", label:"Protected Drafts", color:"#d97706", count: protectedDraftCount },
              { key:"requested", label:"Requested", color:"#2563eb", count: requestedReleaseCount },
              { key:"released", label:"Released", color:"#16a34a", count: releasedCount }
            ].map(filter => (
              <div key={filter.key} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <button onClick={()=>setReleaseFilter(filter.key)} style={{ background: releaseFilter===filter.key ? filter.color : "#f3f4f6", color: releaseFilter===filter.key ? "#fff" : "#374151", border:"none", borderRadius:999, padding:"6px 12px", fontWeight:700, cursor:"pointer", fontSize:12 }}>
                  {filter.label}
                </button>
                <span style={{ fontSize:11, color:"#475569", fontWeight:700 }}>{filter.count}</span>
              </div>
            ))}
          </div>
          {releaseRequests.length===0 ? (
            <div style={{ background:"#fff", borderRadius:12, padding:24, boxShadow:"0 2px 8px #0001", color:"#888" }}>No advocacy notes have been drafted yet.</div>
          ) : (
            <div style={{ display:"grid", gap:12 }}>
              {releaseRequests
                .filter(r => releaseFilter === "all" ? true : releaseFilter === "draft" ? !r.advocacyRequested && !r.advocacyReleased : releaseFilter === "requested" ? r.advocacyRequested : r.advocacyReleased)
                .map(r => (
                  <div key={r.id} style={{ background:"#fff", borderRadius:12, padding:18, boxShadow:"0 2px 8px #0001" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:8 }}>
                      <div style={{ fontWeight:700, color:"#6366f1" }}>{r.id}</div>
                      <Badge label={getAdvocacyStatus(r).label} color={getAdvocacyStatus(r).tone}/> 
                    </div>
                    <div style={{ fontSize:13, color:"#374151", marginBottom:6 }}><strong>Stakeholder:</strong> {r.advocacyStakeholder || "Not specified"}</div>
                    <div style={{ fontSize:13, color:"#374151", lineHeight:1.6 }}><strong>Note:</strong> {r.advocacyNote || "No advocacy note drafted"}</div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {section=="Staff" && (
        <div>
          <h3 style={{ color:"#1e1b4b" }}>Staff Management</h3>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:14 }}>
            {staff.map(s=>(
              <div key={s.name} style={{ background:"#fff", borderRadius:12, padding:18, boxShadow:"0 2px 8px #0001" }}>
                <div style={{ width:44, height:44, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#0891b2)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:18, marginBottom:10 }}>{s.name[0]}</div>
                <div style={{ fontWeight:700, color:"#1e1b4b" }}>{s.name}</div>
                <div style={{ color:"#6366f1", fontSize:13 }}>{s.role}</div>
                <div style={{ color:"#888", fontSize:12 }}>{s.lga}</div>
                <Badge label={s.status} color={s.status==="Active"?"#16a34a":"#d97706"}/>
              </div>
            ))}
          </div>
        </div>
      )}

      {section==="Analytics" && (
        <div>
          <h3 style={{ color:"#1e1b4b" }}>Platform Analytics & Monthly Testing KPIs</h3>
          <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginBottom:20 }}>
            <Card title="Total Reports" value={reports.length} color="#6366f1"/>
            <Card title="GBV Reports" value={reports.filter(r=>r.type==="GBV").length} color="#dc2626"/>
            <Card title="Econ Barriers" value={reports.filter(r=>r.type==="Economic Barrier").length} color="#d97706"/>
            <Card title="USSD Share" value={`${Math.round((reports.filter(r=>r.source==="USSD").length/Math.max(reports.length,1))*100)}%`} sub="No-internet reach" color="#7c3aed"/>
            <Card title="Pending ICO Review" value={pending.length} color="#ef4444"/>
            <Card title="Cultural Concerns Logged" value={flaggedCultural.length} sub="Feeds prompt refinement" color="#0891b2"/>
          </div>
          <div style={{ background:"#fff", borderRadius:12, padding:18, boxShadow:"0 2px 8px #0001" }}>
            <h4 style={{ margin:"0 0 10px", color:"#1e1b4b" }}>Cultural / Dialect Feedback Log</h4>
            <p style={{ color:"#888", fontSize:13, marginBottom:10 }}>Reviewed monthly with GECN staff and Tiv Traditional Council representatives to refine AI prompts.</p>
            {flaggedCultural.length===0 ? <div style={{ color:"#aaa", fontSize:13 }}>No concerns logged yet.</div> : flaggedCultural.map(r=>(
              <div key={r.id} style={{ borderBottom:"1px solid #f0f0f0", padding:"8px 0", fontSize:13 }}>
                <strong style={{ color:"#6366f1" }}>{r.id}</strong>: {r.culturalNote || "(no note added)"}
              </div>
            ))}
          </div>
        </div>
      )}

      {section==="Settings" && (
        <div style={{ background:"#fff", borderRadius:12, padding:24, boxShadow:"0 2px 8px #0001", maxWidth:500 }}>
          <h3 style={{ margin:"0 0 16px", color:"#1e1b4b" }}>System Settings</h3>
          {[["Platform Name","EquiAI Nexus"],["State","Benue"],["Default Language","English"],["SMS Gateway","Termii API"],["USSD Short Code","*555# (demo)"],["USSD Aggregator","Africa's Talking / Termii (production)"],["AI Model","Claude Sonnet"],["Fallback Model (cost control)","GPT-4o mini (if volume increases)"]].map(([k,v])=>(
            <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid #f0f0f0" }}>
              <span style={{ color:"#555", fontWeight:500 }}>{k}</span>
              <span style={{ color:"#6366f1", fontWeight:700, textAlign:"right" }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("Dashboard");
  const [reports, setReports] = useState(SAMPLE_REPORTS);

  return (
    <div style={{ minHeight:"100vh", background:"#f5f3ff", fontFamily:"'Segoe UI',sans-serif" }}>
      <div style={{ background:"linear-gradient(135deg,#1e1b4b,#312e81)", padding:"14px 24px", display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ position:"relative", width:48, height:48, flexShrink:0 }}>
          <svg viewBox="0 0 48 48" width="48" height="48">
            <circle cx="24" cy="24" r="23" fill="#f5c518" stroke="#4a1a6b" strokeWidth="2.5"/>
            <line x1="24" y1="10" x2="24" y2="38" stroke="#4a1a6b" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="12" y1="16" x2="36" y2="16" stroke="#4a1a6b" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="12" y1="16" x2="10" y2="26" stroke="#4a1a6b" strokeWidth="1.8" strokeLinecap="round"/>
            <line x1="36" y1="16" x2="38" y2="26" stroke="#4a1a6b" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M7 26 Q10 30 13 26" stroke="#4a1a6b" strokeWidth="2" fill="none" strokeLinecap="round"/>
            <path d="M35 26 Q38 30 41 26" stroke="#4a1a6b" strokeWidth="2" fill="none" strokeLinecap="round"/>
            <line x1="19" y1="38" x2="29" y2="38" stroke="#4a1a6b" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="24" cy="22" r="4" fill="none" stroke="#e91e8c" strokeWidth="1.8"/>
            <line x1="24" y1="26" x2="24" y2="30" stroke="#e91e8c" strokeWidth="1.8"/>
            <line x1="21.5" y1="28" x2="26.5" y2="28" stroke="#e91e8c" strokeWidth="1.8"/>
          </svg>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ color:"#fff", fontWeight:800, fontSize:18, letterSpacing:0.5 }}>EquiAI Nexus</div>
          <div style={{ color:"#a5b4fc", fontSize:11 }}>Benue State • Gender Equity & Economic Empowerment Platform</div>
          <div style={{ color:"#f5c518", fontSize:11, fontWeight:600 }}>An Initiative of Gender Equality Club Nigeria (GECN)</div>
        </div>
        <div style={{ background:"#fff", borderRadius:"50%", width:42, height:42, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, border:"3px solid #f5c518" }}>
          <span style={{ fontSize:20 }}>♀</span>
        </div>
      </div>
      <div style={{ background:"#fff", borderBottom:"1px solid #e0e7ff", padding:"0 24px", display:"flex", gap:4, overflowX:"auto" }}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:"14px 18px", border:"none", background:"none", cursor:"pointer", fontWeight:600, fontSize:14, color: tab===t?"#6366f1":"#555", borderBottom: tab===t?"3px solid #6366f1":"3px solid transparent", whiteSpace:"nowrap" }}>{t}</button>
        ))}
      </div>
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"28px 20px" }}>
        {tab==="Dashboard" && <Dashboard reports={reports} setTab={setTab}/>}
        {tab==="HerData Commons" && <HerDataCommons reports={reports} setReports={setReports}/>}
        {tab==="AI Analysis" && <AIAnalysis reports={reports} setReports={setReports}/>}
        {tab==="Business Mentor" && <BusinessMentor/>}
        {tab==="Admin Portal" && <AdminPortal reports={reports} setReports={setReports}/>}
      </div>
    </div>
  );
}