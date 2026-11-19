import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Phone, MessageCircle, MapPin } from "lucide-react";
import { api } from "../api";
import Logo from "../components/Logo";

export default function ProviderPage() {
  const { id } = useParams();
  const [p, setP] = useState<any>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => { api(`/api/providers/${id}`).then((d) => setP(d.provider)).catch(() => setMissing(true)); }, [id]);
  if (missing) return <div className="p-10 text-center">यह प्रोफ़ाइल नहीं मिली। <Link className="underline" to="/">होम पर जाएँ</Link></div>;
  if (!p) return <div className="p-10 text-center text-stone-500">लोड हो रहा है…</div>;
  const wa = (p.whatsapp || p.phone || "").replace(/[^0-9]/g, "");
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-cream/90 backdrop-blur border-b border-stone-200">
        <div className="mx-auto max-w-3xl flex items-center gap-4 px-4 h-20">
          <Link to={p.category_id ? `/c/${p.category_id}` : "/"} className="p-2 rounded-full border border-stone-300 bg-white"><ArrowLeft size={20} /></Link>
          <Logo />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="card p-6 md:p-8">
          {p.category && <span className="rounded-full bg-amber-soft px-3 py-1 text-sm font-semibold">{p.category}</span>}
          <h1 className="mt-3 text-3xl font-extrabold">{p.title}</h1>
          <div className="text-stone-500 mt-1">{p.name}</div>
          {(p.address || p.city) && <div className="mt-3 flex items-center gap-2 text-stone-600"><MapPin size={18} />{[p.address, p.city].filter(Boolean).join(", ")}</div>}
          {p.about && <p className="mt-4 text-lg leading-relaxed">{p.about}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            {p.phone && <a className="btn-brand" href={`tel:${p.phone}`}><Phone size={18} /> कॉल करें</a>}
            {wa && <a className="btn-amber" target="_blank" rel="noreferrer" href={`https://wa.me/${wa}`}><MessageCircle size={18} /> WhatsApp</a>}
          </div>
        </div>
      </main>
    </div>
  );
}
