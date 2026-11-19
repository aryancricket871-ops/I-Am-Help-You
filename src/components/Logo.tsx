import { useState } from "react";

// Put your logo at public/logo.png — until then a simple "H" badge is shown.
export default function Logo({ light = false }: { light?: boolean }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="flex items-center gap-3">
      {broken ? (
        <div className="h-11 w-11 rounded-full bg-gradient-to-br from-amber to-brand grid place-items-center text-white font-extrabold text-lg shadow">H</div>
      ) : (
        <img src="/logo.png" alt="" className="h-11 w-11 rounded-full object-cover" onError={() => setBroken(true)} />
      )}
      <span className={`font-extrabold text-lg tracking-tight ${light ? "text-white" : "text-ink"}`}>I Am Help You</span>
    </div>
  );
}
