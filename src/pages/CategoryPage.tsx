import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Search, MapPin } from "lucide-react";
import { api } from "../api";
import Logo from "../components/Logo";

export default function CategoryPage() {
  const { id } = useParams();
  const [cat, setCat] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [q, setQ] = useState(""); const [page, setPage] = useState(1);
  const [list, setList] = useState<any>({ providers: [], total: 0, size: 20 });
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    api(`/api/categories/${id}`).then((d) => { setCat(d.category); setServices(d.services); }).catch(() => setMissing(true));
  }, [id]);
  useEffect(() => {
    const t = setTimeout(() => {
      api(`/api/categories/${id}/providers?page=${page}&q=${encodeURIComponent(q)}`).then(setList).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [id, q, page]);

  const pages = Math.max(1, Math.ceil(list.total / list.size));
  if (missing) return <div className="p-10 text-center">यह श्रेणी नहीं मिली। <Link className="underline" to="/">होम पर जाएँ</Link></div>;
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-cream/90 backdrop-blur border-b border-stone-200">
        <div className="mx-auto max-w-5xl flex items-center gap-4 px-4 h-20">
          <Link to="/" className="p-2 rounded-full border border-stone-300 bg-white"><ArrowLeft size={20} /></Link>
          <Logo />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-3xl md:text-4xl font-extrabold">{cat?.name}</h1>

        {services.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {services.map((s) => <span key={s.id} className="rounded-full bg-brand-soft text-brand px-4 py-1.5 text-sm font-semibold">{s.name}</span>)}
          </div>
        )}

        <div className="relative mt-6">
          <Search className="absolute left-4 top-3.5 text-stone-400" size={20} />
          <input className="input pl-12" placeholder="नाम या शहर से खोजें" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>

        <div className="mt-5 grid md:grid-cols-2 gap-4">
          {list.providers.map((p: any) => (
            <Link key={p.id} to={`/p/${p.id}`} className="card p-5 hover:-translate-y-0.5 transition block">
              <div className="font-extrabold text-lg">{p.title}</div>
              {p.city && <div className="text-stone-500 text-sm mt-1 flex items-center gap-1"><MapPin size={14} />{p.city}</div>}
              {p.about && <p className="mt-2 text-stone-600 line-clamp-2">{p.about}</p>}
            </Link>
          ))}
        </div>
        {!list.providers.length && <div className="card p-10 mt-5 text-center text-stone-500">अभी इस श्रेणी में कोई सेवा प्रदाता नहीं है।</div>}

        {pages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3 text-sm">
            <button className="btn-ghost h-10 px-4" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
            <span>पेज {page} / {pages}</span>
            <button className="btn-ghost h-10 px-4" disabled={page >= pages} onClick={() => setPage(page + 1)}>›</button>
          </div>
        )}
      </main>
    </div>
  );
}
