import { FormEvent, useCallback, useEffect, useState } from "react";
import { Search, Copy, MessageCircle } from "lucide-react";
import { api, Role, ROLE_LABEL, PUBLIC_URL } from "../api";
import { useAuth } from "../auth";

type Props = { allowed: Role[]; fixedRole?: Role; createOnly?: boolean };

export default function UsersPage({ allowed, fixedRole, createOnly }: Props) {
  const { me } = useAuth();
  const [role, setRole] = useState<string>(fixedRole || "");
  const [q, setQ] = useState(""); const [page, setPage] = useState(1);
  const [data, setData] = useState<any>({ users: [], total: 0, size: 20 });
  const [created, setCreated] = useState<any>(null);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [newRole, setNewRole] = useState<Role>(allowed[0]);

  const load = useCallback(() => {
    if (createOnly) return;
    api(`/api/users?page=${page}&q=${encodeURIComponent(q)}${role ? `&role=${role}` : ""}`).then(setData).catch(() => {});
  }, [page, q, role, createOnly]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(""); setBusy(true);
    const form = e.currentTarget;
    const f: any = Object.fromEntries(new FormData(form));
    try {
      await api("/api/users", { body: { ...f, role: newRole } });
      setCreated({ username: f.username, password: f.password, role: newRole });
      form.reset(); load();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }
  const share = created && `I Am Help You में आपका खाता बन गया है।\nलिंक: ${PUBLIC_URL}/login\nयूज़रनेम: ${created.username}\nपासवर्ड: ${created.password}`;
  const pages = Math.max(1, Math.ceil(data.total / data.size));

  return (
    <div>
      <h1 className="text-3xl font-extrabold">{createOnly ? "खाता बनाएँ" : "उपयोगकर्ता"}</h1>

      <div className="card p-6 mt-6">
        <h2 className="font-extrabold text-xl">नया खाता बनाएँ</h2>
        <form onSubmit={create} className="mt-4 grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">भूमिका</label>
            <select className="input" value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}>
              {allowed.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </div>
          <div><label className="label">पूरा नाम</label><input name="name" className="input" required /></div>
          <div><label className="label">यूज़रनेम</label><input name="username" className="input" autoCapitalize="none" required /></div>
          <div><label className="label">पासवर्ड</label><input name="password" minLength={8} className="input" required /></div>
          <div><label className="label">फ़ोन</label><input name="phone" inputMode="tel" className="input" /></div>
          <div><label className="label">शहर</label><input name="city" className="input" /></div>
          {err && <p className="text-red-600 text-sm md:col-span-2">{err}</p>}
          <button className="btn-brand md:col-span-2" disabled={busy}>{busy ? "…" : "खाता बनाएँ"}</button>
        </form>
        {created && (
          <div className="mt-5 rounded-2xl bg-brand-soft p-5">
            <div className="font-bold">खाता बन गया ✔ ({ROLE_LABEL[created.role as Role]})</div>
            <pre className="mt-2 whitespace-pre-wrap text-sm">{share}</pre>
            <div className="mt-3 flex gap-3">
              <button className="btn-ghost h-10" onClick={() => navigator.clipboard.writeText(share)}><Copy size={16} /> कॉपी</button>
              <a className="btn-amber h-10" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(share)}`}><MessageCircle size={16} /> WhatsApp</a>
            </div>
          </div>
        )}
      </div>

      {!createOnly && (
        <div className="card p-6 mt-6">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 text-stone-400" size={20} />
              <input className="input pl-12" placeholder="नाम, यूज़रनेम या फ़ोन से खोजें" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
            </div>
            {!fixedRole && (
              <select className="input md:w-56" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
                <option value="">सभी भूमिकाएँ</option>
                {(["super_distributor", "distributor", "provider", "customer"] as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            )}
          </div>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left">
              <thead className="text-stone-500 text-sm"><tr><th className="py-2">नाम</th><th>यूज़रनेम</th><th>भूमिका</th><th>फ़ोन</th><th>शहर</th><th>स्थिति</th>{me?.role === "admin" && <th />}</tr></thead>
              <tbody>
                {data.users.map((u: any) => (
                  <tr key={u.id} className="border-t border-stone-200">
                    <td className="py-3 font-semibold">{u.name}</td><td>{u.username}</td><td>{ROLE_LABEL[u.role as Role]}</td><td>{u.phone || "—"}</td><td>{u.city || "—"}</td>
                    <td><span className={`rounded-full px-3 py-1 text-xs font-semibold ${u.status === "active" ? "bg-brand-soft text-brand" : "bg-red-100 text-red-700"}`}>{u.status === "active" ? "चालू" : u.status === "blocked" ? "बंद" : "लंबित"}</span></td>
                    {me?.role === "admin" && (
                      <td><button className="text-sm underline" onClick={async () => { await api(`/api/users/${u.id}/status`, { body: { status: u.status === "blocked" ? "active" : "blocked" } }); load(); }}>{u.status === "blocked" ? "चालू करें" : "बंद करें"}</button></td>
                    )}
                  </tr>
                ))}
                {!data.users.length && <tr><td colSpan={7} className="py-10 text-center text-stone-500">अभी कोई नहीं मिला</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-stone-600">
            <span>कुल {data.total}</span>
            <div className="flex items-center gap-3">
              <button className="btn-ghost h-10 px-4" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
              <span>पेज {page} / {pages}</span>
              <button className="btn-ghost h-10 px-4" disabled={page >= pages} onClick={() => setPage(page + 1)}>›</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
