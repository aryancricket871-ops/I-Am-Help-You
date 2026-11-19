import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ROLE_HOME } from "../api";
import { useAuth } from "../auth";
import Logo from "../components/Logo";
import { ICONS } from "../icons";
import { Wrench } from "lucide-react";


export default function Home() {
  const { me } = useAuth();
  const [cats, setCats] = useState<any[]>([]);
  useEffect(() => {
    const ref = new URLSearchParams(location.search).get("ref");
    if (ref) try { localStorage.setItem("ref", ref.toUpperCase()); } catch {}
    api("/api/categories").then((d) => setCats(d.categories)).catch(() => {});
  }, []);
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-cream/90 backdrop-blur border-b border-stone-200">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 h-20">
          <Logo />
          <div className="flex items-center gap-3">
            {me ? (
              <Link to={ROLE_HOME[me.role] === "/" ? "/" : ROLE_HOME[me.role]} className="btn-amber h-11 px-5">मेरा खाता</Link>
            ) : (
              <>
                <Link to="/login" className="font-semibold">लॉग इन</Link>
                <Link to="/signup" className="btn-amber h-11 px-5">साइन अप</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <section className="rounded-[2rem] bg-gradient-to-br from-brand to-teal-600 text-white p-8 md:p-12 shadow-card">
          <span className="inline-block rounded-full bg-amber text-brand-deep font-semibold px-4 py-1.5 text-sm">समाधान आस-पास</span>
          <h1 className="mt-5 text-4xl md:text-5xl font-extrabold leading-tight">आपकी हर ज़रूरत, एक जगह</h1>
          <p className="mt-4 text-lg text-white/85">भरोसेमंद सेवा प्रदाता अब आपके पास। नीचे से अपनी सेवा की श्रेणी चुनें।</p>
        </section>
        <div className="mt-10 flex items-end justify-between">
          <h2 className="text-2xl md:text-3xl font-extrabold">श्रेणी के अनुसार खोजें</h2>
          <span className="text-stone-500">{cats.length} श्रेणियाँ</span>
        </div>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {cats.map((c, i) => {
            const Icon = ICONS[c.icon] || Wrench;
            return (
              <Link to={`/c/${c.id}`} key={c.id} className="card p-5 hover:-translate-y-0.5 transition block">
                <div className={`h-14 w-14 rounded-full grid place-items-center ${i % 2 ? "bg-brand-soft text-brand" : "bg-amber-soft text-ink"}`}>
                  <Icon size={26} />
                </div>
                <div className="mt-4 font-bold text-lg">{c.name}</div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
