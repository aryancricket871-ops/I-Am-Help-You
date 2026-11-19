import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { api } from "../../api";

export default function ApprovalsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const load = useCallback(() => api("/api/admin/approvals").then((d) => setRows(d.rows)).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  async function decide(id: number, decision: string) { await api(`/api/admin/approvals/${id}`, { body: { decision } }); load(); }
  return (
    <div>
      <h1 className="text-3xl font-extrabold">स्वीकृतियाँ</h1>
      <p className="text-stone-500 mt-1">सेवा प्रदाता की प्रोफ़ाइल मंज़ूर होने के बाद ही ग्राहकों को दिखती है।</p>
      <div className="mt-6 space-y-4">
        {rows.map((r) => (
          <div key={r.id} className="card p-5">
            <div className="font-extrabold text-lg">{r.shop_name || r.name}</div>
            <div className="text-sm text-stone-500">{r.name} • @{r.username} • {r.phone || "फ़ोन नहीं"} • {r.city || "शहर नहीं"}</div>
            <div className="mt-2 text-sm"><b>श्रेणी:</b> {r.category || "—"}</div>
            {r.about && <p className="mt-1 text-stone-700">{r.about}</p>}
            {r.address && <p className="text-sm text-stone-500 mt-1">{r.address}</p>}
            <div className="mt-4 flex gap-3">
              <button className="btn-brand h-10" onClick={() => decide(r.id, "approved")}><Check size={18} /> मंज़ूर</button>
              <button className="btn-ghost h-10" onClick={() => decide(r.id, "rejected")}><X size={18} /> अस्वीकार</button>
            </div>
          </div>
        ))}
        {!rows.length && <div className="card p-10 text-center text-stone-500">कोई स्वीकृति बाकी नहीं है।</div>}
      </div>
    </div>
  );
}
