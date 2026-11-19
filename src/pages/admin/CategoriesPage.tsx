import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Upload } from "lucide-react";
import { api } from "../../api";
import { ICON_NAMES } from "../../icons";

// tiny CSV reader: handles BOM, quotes, commas inside quotes
function parseCsv(text: string): string[][] {
  text = text.replace(/^﻿/, "");
  const rows: string[][] = []; let row: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

function Services({ id }: { id: number }) {
  const [list, setList] = useState<any[]>([]);
  const [names, setNames] = useState(""); const [msg, setMsg] = useState("");
  const load = useCallback(() => api(`/api/admin/categories/${id}/services`).then((d) => setList(d.services)), [id]);
  useEffect(() => { load(); }, [load]);
  async function add(e: FormEvent) {
    e.preventDefault(); setMsg("");
    try { const r = await api(`/api/admin/categories/${id}/services`, { body: { names } }); setMsg(`${r.added} सेवाएँ जोड़ी गईं`); setNames(""); load(); }
    catch (e: any) { setMsg(e.message); }
  }
  async function toggle(s: any) { await api(`/api/admin/services/${s.id}`, { method: "PUT", body: { name: s.name, active: !s.active } }); load(); }
  return (
    <div className="mt-4 border-t border-stone-200 pt-4">
      <form onSubmit={add}>
        <label className="label">नई सेवाएँ (हर लाइन में एक)</label>
        <textarea className="w-full rounded-2xl border border-stone-300 p-4 h-28 outline-none focus:border-brand" value={names} onChange={(e) => setNames(e.target.value)} />
        <div className="mt-2 flex items-center gap-3"><button className="btn-brand h-10">जोड़ें</button><span className="text-sm text-stone-600">{msg}</span></div>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        {list.map((s) => (
          <button key={s.id} onClick={() => toggle(s)} title="चालू/बंद करने के लिए दबाएँ"
            className={`rounded-full px-3 py-1 text-sm font-semibold border ${s.active ? "bg-brand-soft text-brand border-transparent" : "bg-stone-100 text-stone-400 line-through border-stone-200"}`}>{s.name}</button>
        ))}
        {!list.length && <span className="text-stone-500 text-sm">अभी कोई सेवा नहीं है।</span>}
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const [cats, setCats] = useState<any[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [name, setName] = useState(""); const [icon, setIcon] = useState("wrench"); const [err, setErr] = useState("");
  const [rows, setRows] = useState<{ category: string; service: string }[]>([]);
  const [replace, setReplace] = useState(false); const [importMsg, setImportMsg] = useState(""); const [busy, setBusy] = useState(false);

  const load = useCallback(() => api("/api/admin/categories").then((d) => setCats(d.categories)), []);
  useEffect(() => { load(); }, [load]);

  async function addCat(e: FormEvent) {
    e.preventDefault(); setErr("");
    try { await api("/api/admin/categories", { body: { name, icon } }); setName(""); load(); } catch (e: any) { setErr(e.message); }
  }
  async function save(c: any, patch: any) {
    await api(`/api/admin/categories/${c.id}`, { method: "PUT", body: { name: c.name, icon: c.icon, active: c.active, sort_order: c.sort_order, ...patch } });
    load();
  }
  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    f.text().then((t) => {
      const all = parseCsv(t);
      const head = all[0]?.map((x) => x.trim().toLowerCase()) || [];
      const ci = head.indexOf("category"), si = head.indexOf("service");
      if (ci < 0 || si < 0) { setImportMsg("फ़ाइल में 'category' और 'service' कॉलम होने चाहिए"); setRows([]); return; }
      setRows(all.slice(1).map((r) => ({ category: (r[ci] || "").trim(), service: (r[si] || "").trim() })).filter((r) => r.category));
      setImportMsg("");
    });
  }
  async function runImport() {
    setBusy(true); setImportMsg("");
    try {
      // send in chunks of 1000 rows; "replace" only on the last chunk, after every category has been created
      for (let i = 0; i < rows.length; i += 1000) {
        const chunk = rows.slice(i, i + 1000);
        await api("/api/admin/import", { body: { rows: chunk, replace: false } });
      }
      let removed = 0;
      if (replace) { const r = await api("/api/admin/import", { body: { rows: rows.slice(0, 3000), replace: true } }); removed = r.removed; }
      setImportMsg(`हो गया: ${new Set(rows.map((r) => r.category)).size} श्रेणियाँ, ${rows.length} पंक्तियाँ${replace ? `, ${removed} पुरानी श्रेणियाँ हटीं` : ""}`);
      setRows([]); load();
    } catch (e: any) { setImportMsg(e.message); }
    setBusy(false);
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold">श्रेणियाँ व सेवाएँ</h1>

      <div className="card p-6 mt-6">
        <h2 className="font-extrabold text-xl">नई श्रेणी</h2>
        <form onSubmit={addCat} className="mt-3 flex flex-col md:flex-row gap-3">
          <input className="input flex-1" placeholder="श्रेणी का नाम" value={name} onChange={(e) => setName(e.target.value)} required />
          <select className="input md:w-48" value={icon} onChange={(e) => setIcon(e.target.value)}>{ICON_NAMES.map((n) => <option key={n}>{n}</option>)}</select>
          <button className="btn-brand">जोड़ें</button>
        </form>
        {err && <p className="text-red-600 text-sm mt-2">{err}</p>}
      </div>

      <div className="card p-6 mt-6">
        <h2 className="font-extrabold text-xl">CSV से एक साथ जोड़ें</h2>
        <p className="text-stone-500 text-sm mt-1">कॉलम: category, service. (हमारी categories_services.csv फ़ाइल सीधे चलेगी।)</p>
        <label className="btn-ghost mt-3 cursor-pointer"><Upload size={18} /> फ़ाइल चुनें<input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} /></label>
        {rows.length > 0 && (
          <div className="mt-4">
            <div>{new Set(rows.map((r) => r.category)).size} श्रेणियाँ और {rows.length} पंक्तियाँ मिलीं।</div>
            <label className="mt-2 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
              पुरानी श्रेणियाँ हटाएँ जो इस फ़ाइल में नहीं हैं और जिनमें कोई सेवा प्रदाता नहीं है (शुरुआती 12 श्रेणियाँ बदलने के लिए)</label>
            <button className="btn-amber mt-3" disabled={busy} onClick={runImport}>{busy ? "…" : "इम्पोर्ट करें"}</button>
          </div>
        )}
        {importMsg && <p className="mt-3 text-sm font-semibold">{importMsg}</p>}
      </div>

      <div className="mt-6 space-y-3">
        {cats.map((c) => (
          <div key={c.id} className="card p-5">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className={`font-extrabold text-lg ${c.active ? "" : "text-stone-400 line-through"}`}>{c.name}</div>
                <div className="text-sm text-stone-500">{c.services} सेवाएँ • {c.providers} सेवा प्रदाता</div>
              </div>
              <button className="text-sm underline" onClick={() => save(c, { active: !c.active })}>{c.active ? "छिपाएँ" : "दिखाएँ"}</button>
              <button className="p-2 rounded-full border border-stone-300" onClick={() => setOpen(open === c.id ? null : c.id)}>{open === c.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>
            </div>
            {open === c.id && (
              <>
                <div className="mt-4 grid md:grid-cols-3 gap-3">
                  <input className="input" defaultValue={c.name} onBlur={(e) => e.target.value.trim() !== c.name && save(c, { name: e.target.value })} />
                  <select className="input" defaultValue={c.icon} onChange={(e) => save(c, { icon: e.target.value })}>{ICON_NAMES.map((n) => <option key={n}>{n}</option>)}</select>
                  <input className="input" type="number" defaultValue={c.sort_order} onBlur={(e) => save(c, { sort_order: Number(e.target.value) })} />
                </div>
                <Services id={c.id} />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
