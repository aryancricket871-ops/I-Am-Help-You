import { useEffect, useState } from "react";
import { api } from "../api";

export default function AuditPage() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { api("/api/audit").then((d) => setRows(d.rows)).catch(() => {}); }, []);
  return (
    <div>
      <h1 className="text-3xl font-extrabold">ऑडिट लॉग</h1>
      <div className="card p-6 mt-6 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="text-stone-500 text-sm"><tr><th className="py-2">समय</th><th>किसने</th><th>क्या किया</th><th>किस पर</th></tr></thead>
          <tbody>
            {rows.map((r) => (<tr key={r.id} className="border-t border-stone-200"><td className="py-3">{r.at}</td><td>{r.actor || "—"}</td><td>{r.action}</td><td>{r.target || "—"}</td></tr>))}
            {!rows.length && <tr><td colSpan={4} className="py-10 text-center text-stone-500">अभी कोई गतिविधि नहीं है</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
