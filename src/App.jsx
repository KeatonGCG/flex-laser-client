
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import clsx from 'clsx'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

const COLORS = ['#00B050','#00C16A','#44FFB2','#2DD4BF','#22D3EE','#A7F3D0','#60A5FA','#F59E0B']
const TTP = { contentStyle:{background:'#0f0f0f', border:'1px solid #1f1f1f', color:'#fff'}, itemStyle:{color:'#fff'}, labelStyle:{color:'#9CA3AF'} }
async function j(url){ const r = await fetch(url); if(!r.ok) throw new Error(url); return r.json() }
const pct = (v)=> v==null ? '—' : (v*100).toFixed(1)+'%'
const dclass = (v)=> v>0 ? 'text-good' : v<0 ? 'text-bad' : 'text-gray-400'

function Header({club,onExport}){
  const isSC = club === 'Sandcastle'
  const title = isSC ? 'Sandcastle Fitness LASER' : 'Flex Fitness LASER'
  return (
    <header id="stickyHeader" className={clsx('sticky top-0 z-40 border-b backdrop-blur transition-colors duration-500', isSC ? 'bg-[#0b0b0b]/95 border-[#272727]' : 'bg-flexInk/95 border-flexEdge')}>
      <div className="max-w-7xl mx-auto px-5 py-3 flex items-center gap-3">
        <div className="relative w-32 h-12 -ml-1">
          <img src="/logo2.png.webp" className={clsx('absolute left-0 top-1/2 -translate-y-1/2 transition-opacity duration-500 h-10', isSC ? 'opacity-0' : 'opacity-100')} alt="Flex Fitness LASER" />
          <img src="/sandcastle.png" className={clsx('absolute left-0.5 top-1/2 -translate-y-1/2 transition-opacity duration-500', isSC ? 'opacity-100 h-12' : 'opacity-0 h-12')} alt="Sandcastle Fitness LASER" />
        </div>
        <div className="flex-1">
          <h1 className="font-display text-2xl tracking-tight font-semibold"><span className="text-[#00C16A]">{title}</span></h1>
          <div className="h-[2px] w-28 mt-1 rounded-full transition-all duration-500" style={{background: isSC ? 'linear-gradient(90deg,#22d3ee,#2dd4bf)' : 'linear-gradient(90deg,#00B050,#00C16A)'}}/>
          <p className="text-xs text-gray-400 mt-1">Weekly operational intelligence — sales, PT, marketing, calls, finance, digital</p>
        </div>
        <button onClick={onExport} className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/15 border border-white/10 text-sm">Export PDF</button>
      </div>
    </header>
  )
}

function TargetRibbon({value, target}){
  if (target == null) return null
  const diff = value - target
  const pctv = target===0 ? null : (value-target)/target
  const good = diff >= 0
  return (<div className={clsx('text-[10px] mt-1', good ? 'text-good' : 'text-bad')}>Target {good?'▲':'▼'} {diff>0?'+':''}{diff.toLocaleString()} ({pct(pctv)})</div>)
}
function KPICard({title, p, b, target}){
  const abs = (p-b), pctv = b===0 ? null : (p-b)/b
  return (
    <div className="kpi">
      <div className="text-xs text-gray-400">{title}</div>
      <div className="text-2xl font-display">{(p ?? 0).toLocaleString()}</div>
      <div className="text-xs text-gray-400">Baseline: {(b ?? 0).toLocaleString()}</div>
      <div className={clsx('text-sm font-semibold', dclass(abs))}>Δ {abs>0?'+':''}{(abs ?? 0).toLocaleString()} ({pct(pctv)})</div>
      <TargetRibbon value={p} target={target} />
    </div>
  )
}
function RateCard({title, value, baseline}){
  const abs = (value - (baseline ?? 0)), pctv = (baseline ?? 0)===0 ? null : (value - baseline) / baseline
  return (
    <div className="kpi">
      <div className="text-xs text-gray-400">{title}</div>
      <div className="text-2xl font-display">{pct(value)}</div>
      <div className="text-xs text-gray-400">Baseline: {pct(baseline)}</div>
      <div className={clsx('text-sm font-semibold', dclass(abs))}>Δ {abs>0?'+':''}{pct(abs)} ({pct(pctv)})</div>
    </div>
  )
}
function toTitle(s){ return s.replace(/_/g,' ').replace(/\\b\\w/g, m => m.toUpperCase()).replace('Leads','Leads') }
function detectLeadSources(row){
  return Object.entries(row)
    .filter(([k,v]) => /_Leads$/.test(k) && typeof v === 'number')
    .map(([k,v]) => ({ key:k, name: toTitle(k.replace('_Leads','')), value: v }))
    .sort((a,b)=> b.value - a.value)
}
function MixPie({ row }){
  const dataRaw = [
    { key: 'Regular_OE', name: 'Regular O/E', value: row?.Mix?.Regular_OE ?? 0 },
    { key: 'AllInc_1Y', name: 'All-Inclusive 1Y', value: row?.Mix?.AllInc_1Y ?? 0 },
    { key: 'Regular_1Y', name: 'Regular 1Y', value: row?.Mix?.Regular_1Y ?? 0 },
    { key: 'AllInc_OE', name: 'All-Inclusive O/E', value: row?.Mix?.AllInc_OE ?? 0 },
    { key: 'Regular_2Y', name: 'Regular 2Y', value: row?.Mix?.Regular_2Y ?? 0 },
    { key: 'Other', name: 'Other', value: row?.Mix?.Other ?? 0 },
  ].map(d => ({ ...d, value: Math.max(0, Math.min(1, Number(d.value) || 0)) })).sort((a, b) => b.value - a.value);
  const total = dataRaw.reduce((a, c) => a + c.value, 0) || 1;
  const renderPct = (v) => `${Math.round((v / total) * 100)}%`; const showPctLabel = (p) => p >= 0.06;
  return (
    <div className="card p-4 h-80">
      <div className="text-sm mb-3">Membership Mix — This Week</div>
      <div className="grid grid-cols-12 gap-4 h-[calc(100%-1.5rem)]">
        <div className="col-span-7 h-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{top:4,right:4,bottom:4,left:4}}>
              <Pie data={dataRaw} dataKey="value" nameKey="name" outerRadius={112} innerRadius={52} paddingAngle={1.5} labelLine label={({ value }) => {
                    const p = value / total; return showPctLabel(p) ? renderPct(value) : ''; }}>
                {dataRaw.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} stroke="#0f0f0f" strokeWidth={1} />))}
              </Pie>
              <Tooltip {...TTP} formatter={(v, n) => [renderPct(v), n]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="col-span-5 flex flex-col gap-2 overflow-hidden">
          {dataRaw.map((d, i) => (
            <div key={d.key} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="truncate text-gray-200">{d.name}</span>
              </div>
              <div className="font-semibold tabular-nums text-gray-100">{renderPct(d.value)}</div>
            </div>
          ))}
          <div className="mt-auto pt-2 text-[10px] text-gray-400 border-t border-flexEdge">Shares sum to 100% (rounded).</div>
        </div>
      </div>
    </div>
  )
}
function LeadSourceDonut({row, active, setActive}){
  const sources = detectLeadSources(row)
  return (
    <div className="card p-4 h-80">
      <div className="text-sm mb-1">Lead Sources — This Week {active ? <span className="text-xs text-gray-400"> (highlight: {active})</span> : null}</div>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={sources} dataKey="value" nameKey="name" innerRadius={60} outerRadius={110} onClick={(d)=> setActive(d?.name === active ? null : d?.name)}>
            {sources.map((s,i)=>(<Cell key={i} fill={COLORS[i%COLORS.length]} opacity={!active || active===s.name ? 1 : 0.35} style={{cursor:'pointer'}}/>))}
          </Pie>
          <Tooltip {...TTP} /><Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="text-[10px] text-gray-400 mt-1">Tip: click a slice to highlight that source in the stacked chart.</div>
    </div>
  )
}
function MarketingStack({rows, active}){
  const last8 = rows.slice(-8)
  const any = last8[0]||{}
  const the_keys = Object.keys(any).filter(k => /_Leads$/.test(k))
  const data = last8.map(r => Object.fromEntries([['Week', r.Week], ...the_keys.map(k=>[k.replace('_Leads',''), r[k]])]))
  return (
    <div className="card p-4 h-80">
      <div className="text-sm mb-1">Leads by Source — Last 8 Weeks</div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#222" />
          <XAxis dataKey="Week" stroke="#aaa" /><YAxis stroke="#aaa" /><Tooltip {...TTP} /><Legend />
          {Object.keys(data[0]||{}).filter(k=>k!=='Week').map((k,i)=>(
            <Bar key={k} dataKey={k} stackId="a" fill={COLORS[i%COLORS.length]} opacity={!active || active===k ? 1 : 0.35} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
function Trend8({data, metric, label}){
  return (
    <div className="card p-4 h-80">
      <div className="text-sm mb-1">{label}</div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#222" />
          <XAxis dataKey="Week" stroke="#aaa" /><YAxis stroke="#aaa" /><Tooltip {...TTP} /><Legend />
          <Line type="monotone" dataKey={metric} stroke="#00B050" strokeWidth={2} dot={{ r: 2.5 }} />
          <Line type="monotone" dataKey={`${metric}_MA`} stroke="#94a3b8" strokeDasharray="5 5" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
function Funnel({row}){
  const stages = [{name:'Leads', value: row.Leads},{name:'Calls', value: row.Calls},{name:'Booked', value: row.Booked},{name:'Shows', value: row.Shows},{name:'Sales', value: row.ApptSales + row.WalkInSales}]
  return (
    <div className="card p-4 h-80">
      <div className="text-sm mb-1">Funnel — This Week</div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={stages}><CartesianGrid strokeDasharray="3 3" stroke="#222" />
          <XAxis dataKey="name" stroke="#aaa" /><YAxis stroke="#aaa" /><Tooltip {...TTP} />
          <Bar dataKey="value" fill="#00B050" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
function IGReachCard({ rows }){
  const last8 = rows.slice(-8).map(r => ({ Week: r.Week, Reach: r.Digital?.IG_Reach || 0 }))
  const followers = rows.slice(-1)[0]?.Digital?.IG_Followers || 0
  return (
    <div className="card p-4 h-72">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm">Instagram Reach — Last 8 Weeks</div>
        <div className="text-[10px] text-gray-400">Source: Meta weekly</div>
      </div>
      <ResponsiveContainer width="100%" height="82%">
        <BarChart data={last8}><CartesianGrid strokeDasharray="3 3" stroke="#222" />
          <XAxis dataKey="Week" stroke="#aaa" /><YAxis stroke="#aaa" /><Tooltip {...TTP} />
          <Bar dataKey="Reach" fill="#00C16A" />
        </BarChart>
      </ResponsiveContainer>
      <div className="text-[11px] mt-1">Followers: {followers.toLocaleString()}</div>
    </div>
  )
}
function WebSourcesCard({ rows, selected }){
  const cur = rows.find(r => r.Week === selected) || {}
  const ig = cur.Digital || {}
  const sources = ig.Web_Sources || {}
  const pie = Object.entries(sources).map(([name,val]) => ({ name, value: val }))
  return (
    <div className="card p-4 h-72">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm">Website — Top Sources</div>
        <div className="text-[10px] text-gray-400">Source: GA weekly</div>
      </div>
      <div className="grid grid-cols-12 gap-4 h-[calc(100%-1.5rem)]">
        <div className="col-span-5 h-full">
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie data={pie} dataKey="value" nameKey="name" innerRadius={48} outerRadius={88} paddingAngle={1.5}>
                {pie.map((_,i)=>(<Cell key={i} fill={COLORS[i%COLORS.length]} />))}
              </Pie>
              <Tooltip {...TTP} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="col-span-7 flex flex-col justify-center gap-1.5">
          {Object.entries(sources).map(([k,v],i)=> (
            <div key={k} className="flex items-center gap-2 text-[11px]">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{background: COLORS[i % COLORS.length]}} />
              <span className="w-20 text-gray-300">{k}</span>
              <div className="flex-1 h-1 bg-[#1b1b1b] rounded">
                <div className="h-1 rounded" style={{width: Math.round(v*100)+'%', background: COLORS[i % COLORS.length]}}></div>
              </div>
              <span className="w-10 text-right tabular-nums text-gray-200">{Math.round(v*100)}%</span>
            </div>
          ))}
          <div className="text-[11px] mt-1">Visitors (est.): {(ig.Web_Visitors||0).toLocaleString()}</div>
        </div>
      </div>
    </div>
  )
}
function AICommentary({ club, selected, baseline }){
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tone, setTone] = useState(localStorage.getItem('tone')||'exec')
  useEffect(()=>{ setText(''); setError(''); }, [club, selected, tone])
  useEffect(()=>{ localStorage.setItem('tone', tone) },[tone])
  async function generate(){
    setLoading(true); setError('')
    try{
      const r = await fetch('/api/ai_commentary', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ club, week: selected, baselineType: baseline, tone }) })
      const j = await r.json(); if(!r.ok) throw new Error(j?.detail||j?.error||'OpenAI call failed'); setText(j.text||'')
    }catch(e){ setError(e.message) } finally { setLoading(false) }
  }
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="text-sm">AI Commentary</div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-400">Tone</span>
          <select className="bg-black/30 border border-flexEdge rounded px-2 py-1 text-sm" value={tone} onChange={e=>setTone(e.target.value)}>
            <option value="exec">Exec (Board-Ready)</option>
            <option value="ops">Ops (Action-Focused)</option>
          </select>
          <button onClick={generate} disabled={loading} className="px-3 py-1.5 rounded bg-[#00B050] hover:opacity-90 text-sm">{loading ? 'Generating…' : 'Generate'}</button>
        </div>
      </div>
      {error && <div className="text-bad text-xs mb-2">{error}</div>}
      <textarea className="w-full h-48 rounded border border-flexEdge bg-black/30 p-3 text-sm" placeholder="Generated commentary will appear here. You can edit it." value={text} onChange={e=>setText(e.target.value)} />
      <div className="text-[10px] text-gray-400 mt-1">Uses your server's OPENAI_API_KEY. Bound to the selected club & week.</div>
    </div>
  )
}

export default function App(){
  const [clubs, setClubs] = useState(['Flex','Sandcastle'])
  const [club, setClub] = useState(localStorage.getItem('club')||'Flex')
  const [weeks, setWeeks] = useState([])
  const [selected, setSelected] = useState(localStorage.getItem('week')||'')
  const [baseline, setBaseline] = useState(localStorage.getItem('baseline')||'prev_week')
  const [compare, setCompare] = useState(null)
  const [targets, setTargets] = useState([])
  const [sourceActive, setSourceActive] = useState(null)

  async function loadAll(c){
    const w = await j(`/api/weeks?club=${c}`); setWeeks(w.weeks); const latest = w.latest; 
    const exists = (w.weeks||[]).some(x => x.Week === selected)
    const sel = exists ? selected : latest
    if(!exists) setSelected(latest)
    setClubs(w.clubs||clubs);
    const t = await j(`/api/targets_week?club=${c}`); setTargets(t.rows||[]);
    const cdata = await j(`/api/compare_week?club=${c}&week=${sel}&baseline=${baseline}`); setCompare(cdata);
  }
  useEffect(()=>{ loadAll(club) },[club])

  async function refresh(){
    const cdata = await j(`/api/compare_week?club=${club}&week=${selected}&baseline=${baseline}`); setCompare(cdata);
  }
  useEffect(()=>{ if(selected){ refresh(); localStorage.setItem('week', selected) } },[selected])
  useEffect(()=>{ localStorage.setItem('club', club) },[club])
  useEffect(()=>{ if(selected){ refresh(); localStorage.setItem('baseline', baseline) } },[baseline])

  const last8 = useMemo(()=> weeks.slice(-8).map((r,i,arr)=>{
    const slice = arr.slice(Math.max(0,i-3), i+1);
    const avg = (k)=> Math.round(slice.reduce((a,c)=>a+(c[k]||0),0)/Math.max(1,slice.length));
    return { ...r, NetSales_MA: avg('NetSales'), Leads_MA: avg('Leads'), Calls_MA: avg('Calls') };
  }), [weeks])

  const row = weeks.find(w => w.Week === selected) || {}
  const p = compare?.primary || {}; const b = compare?.baseline || {};
  const targetRow = targets.find(t => t.Week === selected) || {}

  async function handleExport(){
    const hdr = document.getElementById('stickyHeader')
    const prev = hdr?.className || ''
    if(hdr) hdr.className = prev + ' sticky-capture'
    window.scrollTo(0,0)
    const el = document.querySelector('main')
    const canvas = await html2canvas(el, { backgroundColor: '#0b0b0b', scale: 2, useCORS: true })
    if(hdr) hdr.className = prev
    const img = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p','pt','a4')
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const imgW = pageW - 40
    const imgH = canvas.height * (imgW / canvas.width)
    pdf.addImage(img, 'PNG', 20, 20, imgW, imgH)
    let heightLeft = imgH - (pageH - 40); let position = 20
    while (heightLeft > 0) { pdf.addPage(); position = 20 - (imgH - heightLeft); pdf.addImage(img, 'PNG', 20, position, imgW, imgH); heightLeft -= (pageH - 40) }
    pdf.save(`LASER_${club}_${selected}.pdf`)
  }

  return (
    <div className="min-h-screen">
      <Header club={club} onExport={handleExport} />
      <main className="max-w-7xl mx-auto px-5 py-6 space-y-6">
        <div className="card p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div><div className="text-xs text-gray-400">Club</div>
              <select className="bg-black/30 border border-flexEdge rounded px-3 py-2 hover:bg-black/40" value={club} onChange={e=>setClub(e.target.value)}>
                {clubs.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><div className="text-xs text-gray-400">Week</div>
              <select className="bg-black/30 border border-flexEdge rounded px-3 py-2 hover:bg-black/40" value={selected} onChange={e=>setSelected(e.target.value)}>
                {weeks.slice().reverse().map(w => <option key={w.Week} value={w.Week}>{w.Week}</option>)}
              </select>
            </div>
            <div><div className="text-xs text-gray-400">Baseline</div>
              <select className="bg-black/30 border border-flexEdge rounded px-3 py-2 hover:bg-black/40" value={baseline} onChange={e=>setBaseline(e.target.value)}>
                <option value="prev_week">Prev Week</option>
                <option value="prev_year">Same Week LY</option>
                <option value="t4w_avg">Trailing 4-Week Avg</option>
              </select>
            </div>
            <button onClick={refresh} className="ml-auto px-4 py-2 rounded bg-[#00B050] hover:opacity-90">Update</button>
          </div>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <KPICard title="Net Sales" p={p.NetSales||0} b={b.NetSales||0} target={targetRow.Target_NetSales} />
          <KPICard title="Leads" p={p.Leads||0} b={b.Leads||0} target={targetRow.Target_Leads} />
          <KPICard title="Calls" p={p.Calls||0} b={b.Calls||0} />
          <RateCard title="Answer Rate" value={p.AnswerRate||0} baseline={b.AnswerRate||0} />
          <RateCard title="Close Rate" value={p.CloseRate||0} baseline={b.CloseRate||0} />
          <KPICard title="Contribution ($)" p={p.Contribution||0} b={b.Contribution||0} />
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard title="CAC ($)" p={p.CAC||0} b={b.CAC||0} />
          <KPICard title="LTV:CAC" p={p.LTV_to_CAC||0} b={b.LTV_to_CAC||0} />
          <KPICard title="Payback (mo)" p={p.Payback_months||0} b={b.Payback_months||0} />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Funnel row={row} />
          <MixPie row={p} />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Trend8 data={last8} metric="NetSales" label="Net Sales — Last 8 Weeks (with 4wk MA)" />
          <LeadSourceDonut row={row} active={sourceActive} setActive={setSourceActive} />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          <MarketingStack rows={weeks} active={sourceActive} />
        </section>

        {/* AI first */}
        <section className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          <AICommentary key={`${club}-${selected}`} club={club} selected={selected} baseline={baseline} />
        </section>

        {/* Digital below AI */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <IGReachCard rows={weeks} />
          <WebSourcesCard rows={weeks} selected={selected} />
        </section>
      </main>
    </div>
  )
}
