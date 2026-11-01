import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity, AlertOctagon, AlertTriangle, ArrowDownRight, ArrowUpRight, Bell, Check,
  CheckCircle2, ChevronDown, CircleDot, Clock3, Command, Cpu, ExternalLink, Gauge,
  Github, LayoutDashboard, LifeBuoy, LockKeyhole, Menu, MoreHorizontal, Radio,
  RefreshCw, Search, Send, Settings2, ShieldCheck, SlidersHorizontal, Sparkles,
  TerminalSquare, Wifi, X, Zap
} from "lucide-react";
import "./style.css";

const scenarios = [
  ["validation","400","Bad Request","Payload validation failure","info"],
  ["unauthorized","401","Unauthorized","Invalid or expired access token","warning"],
  ["forbidden","403","Forbidden","Permission boundary violation","warning"],
  ["notfound","404","Not Found","Missing resource lookup","info"],
  ["ratelimit","429","Rate Limited","Burst traffic / quota exceeded","warning"],
  ["server","500","Internal Error","Unhandled application exception","critical"],
  ["gateway","502","Bad Gateway","Upstream returned invalid response","critical"],
  ["unavailable","503","Service Unavailable","Dependency health check failure","critical"],
  ["timeout","504","Gateway Timeout","Upstream request timed out","critical"]
];
const fmt = t => new Date(t).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"});
function App() {
  const [data,setData] = useState(null);
  const [active,setActive] = useState("Overview");
  const [busy,setBusy] = useState("");
  const [toast,setToast] = useState("");
  const [filter,setFilter] = useState("All events");
  const [search,setSearch] = useState("");
  const [menu,setMenu] = useState(false);
  const [testing,setTesting] = useState("");
  const [testResult,setTestResult] = useState({});
  const [selected,setSelected] = useState(null);
  const [mobile,setMobile] = useState(false);
  async function load() {
    try { const r=await fetch("/api/overview"); setData(await r.json()); } catch { setToast("Could not reach local API"); }
  }
  useEffect(()=>{load(); const t=setInterval(load,5000); return ()=>clearInterval(t)},[]);
  useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(""),3200);return()=>clearTimeout(t)}},[toast]);
  async function simulate(key) {
    setBusy(key);
    try {
      const r=await fetch("/api/simulate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({scenario:key})});
      const body=await r.json();
      await load();
      setSelected(body.event);
      setToast(`${body.event?.status || r.status} · ${body.event?.title || "Scenario triggered"}`);
    } catch {setToast("Simulation request failed");}
    finally {setBusy("");}
  }
  async function resolve(id) {
    await fetch(`/api/events/${id}/resolve`,{method:"POST"});
    await load(); setSelected(null); setToast("Event marked as resolved");
  }
  async function test(provider) {
    setTesting(provider); setTestResult(p=>({...p,[provider]:null}));
    try { const r=await fetch("/api/integrations/test",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({provider})}); const d=await r.json(); setTestResult(p=>({...p,[provider]:d})); }
    catch(e){setTestResult(p=>({...p,[provider]:{ok:false,message:e.message}}));}
    setTesting("");
  }
  const events = data?.events || [];
  const visible = useMemo(()=>events.filter(e=>(filter==="All events"||e.severity===filter.toLowerCase()) && `${e.service} ${e.title} ${e.route}`.toLowerCase().includes(search.toLowerCase())),[events,filter,search]);
  const nav = [{name:"Overview",icon:LayoutDashboard},{name:"Error Lab",icon:Zap},{name:"Event Stream",icon:Radio},{name:"Integrations",icon:Settings2}];
  const go = n=>{setActive(n);setMobile(false);};
  return <div className="app-shell">
    <aside className={`sidebar ${mobile?"mobile-open":""}`}>
      <div className="brand"><div className="brand-mark"><Activity size={19}/></div><div><b>signalforge</b><small>OBSERVABILITY LAB</small></div><button className="icon-btn close-mobile" onClick={()=>setMobile(false)}><X size={17}/></button></div>
      <div className="workspace"><div className="workspace-icon">SF</div><div><b>Platform Sandbox</b><small>DEVELOPMENT ENV</small></div><ChevronDown size={14}/></div>
      <div className="nav-label">WORKSPACE</div>
      {nav.map(n=><button key={n.name} onClick={()=>go(n.name)} className={`nav-item ${active===n.name?"active":""}`}><n.icon size={17}/>{n.name}{n.name==="Event Stream"&&<span className="nav-count">{events.length}</span>}</button>)}
      <div className="nav-label section-label">OPERATIONS</div>
      <button className="nav-item" onClick={()=>go("Integrations")}><Gauge size={17}/>Service health</button>
      <button className="nav-item" onClick={()=>go("Event Stream")}><Bell size={17}/>Alert policies<span className="tiny-dot"/></button>
      <div className="sidebar-bottom">
        <div className="help-card"><div className="help-icon"><LifeBuoy size={16}/></div><b>Need a hand?</b><p>Explore the chaos lab to test your alert pipeline.</p><button onClick={()=>go("Error Lab")}>Open error lab <ArrowUpRight size={13}/></button></div>
        <div className="user-row"><div className="avatar">EM</div><div><b>Platform Engineer</b><small>Local workspace</small></div><MoreHorizontal size={17}/></div>
      </div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="crumb"><button className="icon-btn mobile-menu" onClick={()=>setMobile(true)}><Menu size={18}/></button><span>Workspace</span><span className="slash">/</span><b>{active}</b></div><div className="top-actions"><div className="live-pill"><span/> ALL SYSTEMS NOMINAL</div><button className="icon-btn" onClick={load} title="Refresh"><RefreshCw size={16}/></button><button className="icon-btn notification"><Bell size={16}/><i/></button><div className="top-avatar">EM</div></div></header>
      <div className="page">
        <div className="page-heading"><div><div className="eyebrow"><span className="pulse"/> LIVE ENVIRONMENT <span className="dotsep">·</span> UPDATED JUST NOW</div><h1>{active==="Overview"?"System overview":active==="Error Lab"?"Chaos engineering lab":active==="Event Stream"?"Event stream":"Integration center"}</h1><p>{active==="Overview"?"A real-time pulse check across your services and observability stack.":active==="Error Lab"?"Trigger controlled failures and validate your monitoring pipeline.":active==="Event Stream"?"Inspect incoming exceptions, alerts, and webhook events.":"Connect your observability providers and verify credentials securely."}</p></div><div className="heading-actions"><button className="btn secondary" onClick={load}><RefreshCw size={14}/> Refresh</button><button className="btn primary" onClick={()=>go("Error Lab")}><Zap size={14}/> Run simulation</button></div></div>
        {active==="Overview"&&<Overview data={data} events={events} go={go} simulate={simulate} busy={busy} setSelected={setSelected}/>}
        {active==="Error Lab"&&<ErrorLab simulate={simulate} busy={busy}/>}
        {active==="Event Stream"&&<><div className="toolbar"><div className="searchbox"><Search size={15}/><input placeholder="Search events, services..." value={search} onChange={e=>setSearch(e.target.value)}/></div><select value={filter} onChange={e=>setFilter(e.target.value)}><option>All events</option><option>Critical</option><option>Warning</option><option>Info</option></select></div><EventTable events={visible} setSelected={setSelected}/></>}
        {active==="Integrations"&&<Integrations data={data} test={test} testing={testing} testResult={testResult}/>}
        <footer><span>◈ SIGNALFORGE <span className="muted">v1.0.0 · LOCAL SANDBOX</span></span><span><span className="footer-dot"/> API CONNECTED <span className="muted">·</span> <a href="https://github.com/Em001hub/Internal-Developer-Platform" target="_blank">PROJECT CONTEXT <ExternalLink size={11}/></a></span></footer>
      </div>
    </main>
    {selected&&<div className="drawer-backdrop" onClick={()=>setSelected(null)}><div className="event-drawer" onClick={e=>e.stopPropagation()}><div className="drawer-head"><span className="eyebrow">EVENT DETAILS</span><button className="icon-btn" onClick={()=>setSelected(null)}><X size={17}/></button></div><div className="drawer-status"><span className={`severity ${selected.severity}`}>{selected.severity}</span><span className="mono">HTTP {selected.status}</span></div><h2>{selected.title}</h2><p className="muted">{selected.message}</p><div className="detail-grid"><span>Service</span><b>{selected.service}</b><span>Endpoint</span><b className="mono">{selected.route}</b><span>Source</span><b>{selected.source}</b><span>Timestamp</span><b className="mono">{selected.timestamp?new Date(selected.timestamp).toLocaleString():"Just now"}</b><span>Event ID</span><b className="mono small">{selected.id}</b></div>{!selected.resolved&&<button className="btn primary full" onClick={()=>resolve(selected.id)}><Check size={15}/> Mark as resolved</button>}</div></div>}
    {toast&&<div className="toast"><CheckCircle2 size={16}/>{toast}</div>}
  </div>;
}
function Metric({label,value,unit,change,icon:Icon,trend="up",tone="blue",foot}){return <div className="metric-card"><div className="metric-top"><span>{label}</span><div className={`metric-icon ${tone}`}><Icon size={17}/></div></div><div className="metric-value">{value}<small>{unit}</small></div><div className="metric-foot"><span className={trend==="down"?"good":"neutral"}>{trend==="down"?<ArrowDownRight size={13}/>:<ArrowUpRight size={13}/>} {change}</span><span>{foot}</span></div></div>}
function Overview({data,events,go,simulate,busy,setSelected}){
  const stats=data?.stats||{total:1284,failed:37,latency:184,uptime:99.94};
  return <>
    <div className="metric-grid"><Metric label="TOTAL REQUESTS" value="24.8" unit="k" change="12.8%" foot="vs last 24h" icon={Activity}/><Metric label="ERROR RATE" value="1.48" unit="%" change="0.32%" trend="down" foot="vs last 24h" icon={AlertOctagon} tone="red"/><Metric label="P95 LATENCY" value="184" unit="ms" change="8.4%" trend="down" foot="vs last 24h" icon={Gauge} tone="purple"/><Metric label="AVAILABILITY" value="99.94" unit="%" change="0.02%" foot="30-day SLO" icon={ShieldCheck} tone="green"/></div>
    <div className="content-grid"><div className="panel traffic-panel"><div className="panel-head"><div><h3>Request & error volume</h3><p>Traffic distribution over the last 60 minutes</p></div><div className="select-chip">Last 60 minutes <ChevronDown size={13}/></div></div><div className="chart-legend"><span><i className="legend-blue"/> Requests</span><span><i className="legend-red"/> Errors</span></div><TrafficChart/></div>
    <div className="panel health-panel"><div className="panel-head"><div><h3>Service health</h3><p>Live status across your stack</p></div><button className="dots">···</button></div>{[["Payment API","Operational","99.99%"],["Auth Gateway","Operational","99.98%"],["Catalog Service","Degraded","97.21%"],["Orders Worker","Operational","99.95%"]].map((x,i)=><div className="service-row" key={x[0]}><div className="service-symbol">{["$","A","C","O"][i]}</div><div className="service-name"><b>{x[0]}</b><small>{x[1]}</small></div><span className={`status ${i===2?"degraded":"ok"}`}><i/>{x[1]}</span><b className="uptime">{x[2]}</b></div>)}</div></div>
    <div className="panel events-panel"><div className="panel-head"><div><h3>Recent events</h3><p>Latest signals from your connected providers</p></div><button className="text-btn" onClick={()=>go("Event Stream")}>View all events <ArrowUpRight size={13}/></button></div><EventTable events={events.slice(0,5)} setSelected={setSelected}/></div>
    <div className="panel quick-panel"><div className="panel-head"><div><h3>Quick actions</h3><p>Generate test signals for your pipeline</p></div><Sparkles size={17} className="purple-text"/></div><div className="quick-actions"><button onClick={()=>go("Error Lab")}><div className="qa-icon red"><AlertTriangle size={17}/></div><span><b>Trigger an error</b><small>Simulate HTTP failures</small></span><ArrowUpRight size={15}/></button><button onClick={()=>go("Integrations")}><div className="qa-icon blue"><Settings2 size={17}/></div><span><b>Configure providers</b><small>Grafana & Sentry</small></span><ArrowUpRight size={15}/></button><button onClick={()=>go("Event Stream")}><div className="qa-icon green"><Radio size={17}/></div><span><b>Inspect event stream</b><small>Review incoming signals</small></span><ArrowUpRight size={15}/></button></div></div>
  </>;
}
function TrafficChart(){let a=[34,39,35,48,43,52,49,57,46,60,54,62,58,68,60,73,66,75,64,70,60,77,69,82,71,79,66,88,74,83,70,92,80,86,74,95,82,90,77,87,70,82,73,92,80,96,83,91,75,87,78,97,83,92,74,88,77,96,85,91,79,98];let b=[5,6,4,8,6,9,7,8,7,10,8,11,9,12,9,13,10,14,12,13,9,15,11,16,12,15,10,18,13,17,11,19,14,16,12,20,14,18,12,17,11,16,12,18,13,19,12,17,10,16,12,20,14,18,11,17,12,19,13,16,11,18];const path=(arr)=>arr.map((v,i)=>`${i?"L":"M"} ${(i/(arr.length-1))*700} ${150-v*1.25}`).join(" ");return <div className="chart-wrap"><svg viewBox="0 0 700 170" preserveAspectRatio="none"><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#5d8dff" stopOpacity=".22"/><stop offset="100%" stopColor="#5d8dff" stopOpacity="0"/></linearGradient></defs>{[25,65,105,145].map(y=><line key={y} x1="0" x2="700" y1={y} y2={y} stroke="#252a39" strokeDasharray="3 5"/>)}<path d={`${path(a)} L700 150 L0 150Z`} fill="url(#area)"/><path d={path(a)} fill="none" stroke="#6e9bff" strokeWidth="2.4" vectorEffect="non-scaling-stroke"/><path d={path(b)} fill="none" stroke="#ff647c" strokeWidth="1.8" vectorEffect="non-scaling-stroke"/></svg><div className="chart-labels"><span>60 min ago</span><span>45 min</span><span>30 min</span><span>15 min</span><span>Now</span></div></div>}
function EventTable({events,setSelected}){return <div className="table-wrap"><table><thead><tr><th>EVENT</th><th>SERVICE</th><th>STATUS</th><th>SOURCE</th><th>TIME</th><th></th></tr></thead><tbody>{events.map((e,i)=><tr key={e.id||i} onClick={()=>setSelected(e)}><td><div className="event-title"><span className={`event-icon ${e.severity}`}><AlertOctagon size={14}/></span><div><b>{e.title}</b><small>{e.route}</small></div></div></td><td>{e.service}</td><td><span className={`http-code ${e.status>=500?"bad":e.status>=400?"warn":"ok-code"}`}>{e.status}</span></td><td><span className="source"><i className={e.source}/>{e.source}</span></td><td className="mono time">{fmt(e.timestamp)}</td><td><button className="row-more" onClick={ev=>{ev.stopPropagation();setSelected(e)}}><MoreHorizontal size={16}/></button></td></tr>)}</tbody></table>{!events.length&&<div className="empty">No events match your filters.</div>}</div>}
function ErrorLab({simulate,busy}){return <><div className="lab-banner"><div className="banner-icon"><Zap size={20}/></div><div><b>Controlled failure injection</b><p>These scenarios return real HTTP error responses from the local API. Events are added to the live stream and optionally forwarded to Sentry when configured.</p></div><span className="sandbox-tag">SANDBOX ONLY</span></div><div className="section-title"><div><h3>HTTP response scenarios</h3><p>Choose a failure mode to inject into the demo services.</p></div><span className="mono muted">9 SCENARIOS AVAILABLE</span></div><div className="scenario-grid">{scenarios.map(([key,code,name,desc,severity])=><div className="scenario-card" key={key}><div className="scenario-top"><span className={`scenario-code ${severity}`}>{code}</span><span className={`severity ${severity}`}>{severity}</span></div><h3>{name}</h3><p>{desc}</p><div className="scenario-bottom"><span className="mono">POST /api/simulate</span><button className="btn small-btn" disabled={!!busy} onClick={()=>simulate(key)}>{busy===key?<RefreshCw className="spin" size={13}/>:<Zap size={13}/>} Trigger</button></div></div>)}</div><div className="panel safety-panel"><ShieldCheck size={17}/><div><b>Safe by design</b><p>All failures are synthetic and isolated to this local sandbox. No production services or customer data are modified.</p></div></div></>}
function Integrations({data,test,testing,testResult}){const integrations=[{id:"grafana",name:"Grafana Cloud",desc:"Metrics, alert rules, dashboards & webhook ingestion",icon:"G",cls:"grafana",fields:["GRAFANA_URL","GRAFANA_API_KEY","GRAFANA_PROJECT_SELECTOR"],configured:data?.integrations?.grafana?.configured,detail:data?.integrations?.grafana?.url||"URL not configured"},{id:"sentry",name:"Sentry",desc:"Exception tracking, issue metadata & webhook ingestion",icon:"S",cls:"sentry",fields:["SENTRY_URL","SENTRY_AUTH_TOKEN","SENTRY_ORG_SLUG","SENTRY_PROJECT_SLUGS"],configured:data?.integrations?.sentry?.configured,detail:data?.integrations?.sentry?.org?`Organization: ${data.integrations.sentry.org}`:"Organization not configured"}];return <><div className="integration-note"><LockKeyhole size={16}/><span>Credentials stay on the server in <code>.env</code>. They are never returned to the browser.</span></div><div className="integration-grid">{integrations.map(x=><div className="panel integration-card" key={x.id}><div className="integration-head"><div className={`provider-logo ${x.cls}`}>{x.icon}</div><div><h3>{x.name}</h3><p>{x.desc}</p></div><span className={`connect-state ${x.configured?"connected":"not-connected"}`}><i/>{x.configured?"Configured":"Setup required"}</span></div><div className="config-detail"><span>ENDPOINT / ACCOUNT</span><b>{x.detail}</b></div><div className="env-list"><span>ENVIRONMENT VARIABLES</span>{x.fields.map(f=><div key={f}><code>{f}</code><span>{f.endsWith("KEY")||f.endsWith("TOKEN")?"••••••••••••": "from .env"}</span></div>)}</div><div className="integration-foot"><button className="btn secondary" disabled={testing===x.id} onClick={()=>test(x.id)}>{testing===x.id?<RefreshCw size={14} className="spin"/>:<Wifi size={14}/>} Test connection</button>{testResult[x.id]&&<span className={`test-result ${testResult[x.id].ok?"success":"failure"}`}>{testResult[x.id].ok?<CheckCircle2 size={13}/>:<AlertTriangle size={13}/>} {testResult[x.id].message}</span>}</div></div>)}</div><div className="panel webhook-panel"><div className="panel-head"><div><h3>Inbound webhooks</h3><p>Send provider alert payloads into this local event stream.</p></div><span className="live-pill"><span/> LISTENING</span></div><div className="webhook-row"><span className="provider-mini grafana">G</span><div><b>Grafana alert receiver</b><code>POST /api/webhooks/grafana</code></div><span className="webhook-enabled">Enabled</span></div><div className="webhook-row"><span className="provider-mini sentry">S</span><div><b>Sentry issue receiver</b><code>POST /api/webhooks/sentry</code></div><span className="webhook-enabled">Enabled</span></div></div><div className="setup-hint"><TerminalSquare size={16}/><div><b>Applying credential changes</b><p>Edit the root <code>.env</code> file and restart the app with <code>npm run dev</code>. Never commit your real tokens.</p></div></div></>}
createRoot(document.getElementById("root")).render(<App/>);
