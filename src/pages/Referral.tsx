import { Copy, MessageCircle } from "lucide-react";
import { useAuth } from "../auth";
import { PUBLIC_URL } from "../api";

export default function Referral() {
  const { me } = useAuth();
  const link = `${PUBLIC_URL}/?ref=${me?.referral_code}`;
  const text = `I Am Help You ऐप/वेबसाइट से जुड़ें: ${link}`;
  return (
    <div>
      <h1 className="text-3xl font-extrabold">रेफ़रल</h1>
      <div className="card p-6 mt-6 max-w-xl">
        <div className="text-stone-500">आपका कोड</div>
        <div className="text-4xl font-extrabold tracking-widest mt-1">{me?.referral_code}</div>
        <div className="mt-4 break-all rounded-2xl bg-cream border border-stone-200 p-4 text-sm">{link}</div>
        <div className="mt-4 flex gap-3">
          <button className="btn-ghost" onClick={() => navigator.clipboard.writeText(link)}><Copy size={18} /> कॉपी</button>
          <a className="btn-amber" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(text)}`}><MessageCircle size={18} /> WhatsApp</a>
        </div>
      </div>
    </div>
  );
}
