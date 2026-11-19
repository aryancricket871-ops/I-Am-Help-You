import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api, ROLE_HOME, IS_APP, setToken } from "../api";
import { useAuth } from "../auth";
import Logo from "../components/Logo";

function Shell({ title, sub, children }: any) {
  return (
    <div className="min-h-screen grid place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6"><Logo /></div>
        <div className="card p-8">
          <h1 className="text-3xl font-extrabold">{title}</h1>
          <p className="text-stone-500 mt-1">{sub}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Login() {
  const nav = useNavigate();
  const loc: any = useLocation();
  const { refresh } = useAuth();
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(""); setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await api("/api/login", { body: { username: f.get("username"), password: f.get("password") } });
      const me = (await api("/api/me")).user;
      if (IS_APP && me.role !== "customer") {
        await api("/api/logout", { method: "POST", body: {} }).catch(() => {}); setToken("");
        throw new Error("यह ऐप सिर्फ़ ग्राहकों के लिए है। अपना पैनल वेबसाइट पर खोलें।");
      }
      await refresh();
      const back = loc.state?.from;
      nav(back && back.startsWith(ROLE_HOME[me.role]) ? back : ROLE_HOME[me.role], { replace: true });
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }
  return (
    <Shell title="लॉग इन करें" sub="अपने यूज़रनेम और पासवर्ड से आगे बढ़ें">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label">यूज़रनेम</label><input name="username" className="input" autoCapitalize="none" autoComplete="username" required /></div>
        <div><label className="label">पासवर्ड</label><input name="password" type="password" className="input" autoComplete="current-password" required /></div>
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <button className="btn-brand w-full" disabled={busy}>{busy ? "…" : "लॉग इन"}</button>
      </form>
      <p className="mt-6 text-center text-stone-500">नया खाता चाहिए? <Link to="/signup" className="font-bold text-brand">साइन अप करें</Link></p>
    </Shell>
  );
}

export function Signup() {
  const nav = useNavigate();
  const { refresh } = useAuth();
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(""); setBusy(true);
    const f = Object.fromEntries(new FormData(e.currentTarget)) as any;
    let ref = ""; try { ref = localStorage.getItem("ref") || ""; } catch {}
    try {
      await api("/api/signup", { body: { ...f, ref } });
      await refresh(); nav("/", { replace: true });
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }
  return (
    <Shell title="नया खाता बनाएँ" sub="ग्राहक के रूप में जुड़ें — बस कुछ सेकंड">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label">पूरा नाम</label><input name="name" className="input" required /></div>
        <div><label className="label">यूज़रनेम</label><input name="username" className="input" placeholder="जैसे ramesh_01" autoCapitalize="none" required /></div>
        <div><label className="label">फ़ोन नंबर (वैकल्पिक)</label><input name="phone" inputMode="tel" className="input" /></div>
        <div><label className="label">पासवर्ड</label><input name="password" type="password" minLength={8} className="input" autoComplete="new-password" required /></div>
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <button className="btn-amber w-full" disabled={busy}>{busy ? "…" : "साइन अप"}</button>
      </form>
      <p className="mt-6 text-center text-stone-500">पहले से खाता है? <Link to="/login" className="font-bold text-brand">लॉग इन करें</Link></p>
    </Shell>
  );
}
