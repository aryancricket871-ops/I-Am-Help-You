import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import Logo from "../components/Logo";

// One-time page to create the first admin. Works only while no admin exists and needs the SETUP_KEY secret.
export default function Setup() {
  const [msg, setMsg] = useState(""); const [ok, setOk] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMsg("");
    const f = Object.fromEntries(new FormData(e.currentTarget));
    try { await api("/api/setup", { body: f }); setOk(true); } catch (e: any) { setMsg(e.message); }
  }
  return (
    <div className="min-h-screen grid place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6"><Logo /></div>
        <div className="card p-8">
          <h1 className="text-2xl font-extrabold">पहला एडमिन बनाएँ</h1>
          {ok ? (
            <p className="mt-4">एडमिन बन गया ✔ <Link className="font-bold text-brand underline" to="/login">लॉग इन करें</Link></p>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-4">
              <div><label className="label">सेटअप की (SETUP_KEY)</label><input name="key" className="input" required /></div>
              <div><label className="label">पूरा नाम</label><input name="name" className="input" required /></div>
              <div><label className="label">यूज़रनेम</label><input name="username" className="input" autoCapitalize="none" required /></div>
              <div><label className="label">पासवर्ड</label><input name="password" minLength={8} className="input" required /></div>
              {msg && <p className="text-red-600 text-sm">{msg}</p>}
              <button className="btn-brand w-full">एडमिन बनाएँ</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
