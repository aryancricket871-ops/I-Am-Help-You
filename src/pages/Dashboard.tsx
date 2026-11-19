import { useEffect, useState } from "react";
import { Network, Users, Wrench, User } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../auth";

const CARDS = [
  { role: "super_distributor", label: "सुपर डिस्ट्रीब्यूटर", icon: Network, tone: "bg-brand-soft text-brand", color: "#00574f" },
  { role: "distributor", label: "डिस्ट्रीब्यूटर", icon: Users, tone: "bg-amber-soft text-ink", color: "#007a6e" },
  { role: "provider", label: "सेवा प्रदाता", icon: Wrench, tone: "bg-brand-soft text-brand", color: "#f9a53a" },
  { role: "customer", label: "ग्राहक", icon: User, tone: "bg-amber-soft text-ink", color: "#35967b" },
];
const MONTHS = ["जन","फ़र","मार्च","अप्रै","मई","जून","जुला","अग","सित","अक्टू","नव","दिस"];

export default function Dashboard() {
  const { me } = useAuth();
  const [d, setD] = useState<any>(null);
  useEffect(() => { api("/api/stats").then(setD).catch(() => setD({ counts: {}, monthly: [] })); }, []);
  if (!d) return <p className="text-stone-500">लोड हो रहा है…</p>;

  const visible = CARDS.filter((c) =>
    me?.role === "admin" ? true : me?.role === "super_distributor" ? c.role !== "super_distributor" : c.role === "provider" || c.role === "customer");

  // build last 12 month buckets
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const dt = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return { key: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`, label: MONTHS[dt.getMonth()] };
  });
  const val = (m: string, role: string) => d.monthly.find((x: any) => x.m === m && x.role === role)?.n || 0;
  const max = Math.max(1, ...months.map((m) => visible.reduce((s, c) => s + val(m.key, c.role), 0)));

  return (
    <div>
      <h1 className="text-3xl font-extrabold">डैशबोर्ड</h1>
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {visible.map((c) => (
          <div key={c.role} className="card p-5">
            <div className="flex items-start justify-between">
              <div className="text-stone-600">{c.label}</div>
              <div className={`h-12 w-12 rounded-full grid place-items-center ${c.tone}`}><c.icon size={22} /></div>
            </div>
            <div className="mt-3 text-4xl font-extrabold">{d.counts[c.role] || 0}</div>
            <div className="mt-4 h-0.5" style={{ background: c.color }} />
            <div className="text-sm text-stone-500 mt-2">पिछले 12 महीने में नए</div>
          </div>
        ))}
        {me?.role === "admin" && (
          <div className="card p-5">
            <div className="text-stone-600">बाकी स्वीकृतियाँ</div>
            <div className="mt-3 text-4xl font-extrabold">{d.pending}</div>
          </div>
        )}
      </div>

      <div className="card p-6 mt-6">
        <h2 className="text-xl font-extrabold">हर महीने नए खाते</h2>
        <p className="text-stone-500 text-sm">पिछले 12 महीने</p>
        <div className="mt-6 flex items-end gap-2 h-52">
          {months.map((m) => (
            <div key={m.key} className="flex-1 flex flex-col items-center justify-end h-full gap-2">
              <div className="w-full flex flex-col-reverse rounded-t-lg overflow-hidden" style={{ height: `${(visible.reduce((s, c) => s + val(m.key, c.role), 0) / max) * 100}%` }}>
                {visible.map((c) => (
                  <div key={c.role} style={{ height: `${(val(m.key, c.role) / Math.max(1, visible.reduce((s, x) => s + val(m.key, x.role), 0))) * 100}%`, background: c.color }} />
                ))}
              </div>
              <span className="text-xs text-stone-500">{m.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          {visible.map((c) => (<span key={c.role} className="flex items-center gap-2"><i className="h-3 w-3 rounded-full" style={{ background: c.color }} />{c.label}</span>))}
        </div>
      </div>
    </div>
  );
}
