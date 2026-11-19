import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";

const STATUS: Record<string, { t: string; c: string }> = {
  pending: { t: "मंज़ूरी का इंतज़ार", c: "bg-amber-soft text-ink" },
  approved: { t: "मंज़ूर — ग्राहकों को दिख रहा है", c: "bg-brand-soft text-brand" },
  rejected: { t: "अस्वीकृत — बदलाव कर फिर भेजें", c: "bg-red-100 text-red-700" },
};

export default function ProviderPanel() {
  const [cats, setCats] = useState<any[]>([]);
  const [p, setP] = useState<any>(null);
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => {
    api("/api/categories").then((d) => setCats(d.categories));
    api("/api/provider/profile").then((d) => setP(d.profile || {}));
  }, []);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMsg("");
    const f: any = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api("/api/provider/profile", { method: "PUT", body: f });
      setP({ ...p, ...f, approval: "pending" });
      setMsg("सेव हो गया। एडमिन की मंज़ूरी के बाद प्रोफ़ाइल दिखेगी।");
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }
  if (!p) return <p className="text-stone-500">लोड हो रहा है…</p>;
  const st = STATUS[p.approval || "pending"];
  return (
    <div>
      <h1 className="text-3xl font-extrabold">मेरी प्रोफ़ाइल</h1>
      <span className={`inline-block mt-3 rounded-full px-4 py-1.5 text-sm font-semibold ${st.c}`}>{st.t}</span>
      <form onSubmit={save} className="card p-6 mt-6 grid md:grid-cols-2 gap-4 max-w-3xl">
        <div className="md:col-span-2"><label className="label">श्रेणी</label>
          <select name="category_id" className="input" defaultValue={p.category_id || ""} required>
            <option value="" disabled>चुनें</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></div>
        <div><label className="label">दुकान / क्लिनिक का नाम</label><input name="shop_name" className="input" defaultValue={p.shop_name || ""} /></div>
        <div><label className="label">WhatsApp नंबर</label><input name="whatsapp" inputMode="tel" className="input" defaultValue={p.whatsapp || ""} /></div>
        <div className="md:col-span-2"><label className="label">पता</label><input name="address" className="input" defaultValue={p.address || ""} /></div>
        <div className="md:col-span-2"><label className="label">अपने बारे में</label>
          <textarea name="about" className="w-full rounded-2xl border border-stone-300 p-4 h-28 outline-none focus:border-brand" defaultValue={p.about || ""} /></div>
        {msg && <p className="md:col-span-2 text-sm font-semibold">{msg}</p>}
        <button className="btn-brand md:col-span-2" disabled={busy}>{busy ? "…" : "सेव करें"}</button>
      </form>
    </div>
  );
}
