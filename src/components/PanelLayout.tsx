import { useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { LayoutDashboard, Users, Network, Grid2x2, BadgeCheck, Image, Settings, ScrollText, Home, LogOut, Menu, X, UserPlus, Share2 } from "lucide-react";
import { useAuth } from "../auth";
import { ROLE_LABEL } from "../api";
import Logo from "./Logo";

const MENUS: Record<string, { to: string; label: string; icon: any; end?: boolean }[]> = {
  admin: [
    { to: "/admin", label: "डैशबोर्ड", icon: LayoutDashboard, end: true },
    { to: "/admin/users", label: "उपयोगकर्ता", icon: Users },
    { to: "/admin/network", label: "नेटवर्क", icon: Network },
    { to: "/admin/categories", label: "श्रेणियाँ व सेवाएँ", icon: Grid2x2 },
    { to: "/admin/approvals", label: "स्वीकृतियाँ", icon: BadgeCheck },
    { to: "/admin/banners", label: "बैनर व ऑफ़र", icon: Image },
    { to: "/admin/settings", label: "सेटिंग्स", icon: Settings },
    { to: "/admin/audit", label: "ऑडिट लॉग", icon: ScrollText },
  ],
  super_distributor: [
    { to: "/super-distributor", label: "डैशबोर्ड", icon: LayoutDashboard, end: true },
    { to: "/super-distributor/distributors", label: "मेरे डिस्ट्रीब्यूटर", icon: Users },
    { to: "/super-distributor/providers", label: "मेरे सेवा प्रदाता", icon: Users },
    { to: "/super-distributor/create", label: "खाता बनाएँ", icon: UserPlus },
  ],
  distributor: [
    { to: "/distributor", label: "डैशबोर्ड", icon: LayoutDashboard, end: true },
    { to: "/distributor/providers", label: "मेरे सेवा प्रदाता", icon: Users },
    { to: "/distributor/create", label: "सेवा प्रदाता बनाएँ", icon: UserPlus },
    { to: "/distributor/referral", label: "रेफ़रल", icon: Share2 },
  ],
  provider: [{ to: "/provider", label: "डैशबोर्ड", icon: LayoutDashboard, end: true }],
};

export default function PanelLayout({ kind }: { kind: string }) {
  const { me, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menu = MENUS[kind] || [];
  const sidebar = (
    <aside className="w-72 h-full bg-gradient-to-b from-brand-dark to-brand-deep text-white flex flex-col p-5">
      <Logo light />
      <div className="text-white/60 text-sm mt-1 ml-14">{ROLE_LABEL[kind as keyof typeof ROLE_LABEL]} पैनल</div>
      <div className="mt-8 text-xs text-white/50 px-3">मेन्यू</div>
      <nav className="mt-2 space-y-1">
        {menu.map((m) => (
          <NavLink key={m.to} to={m.to} end={m.end} onClick={() => setOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 rounded-full px-4 py-3 font-medium ${isActive ? "bg-white/15" : "hover:bg-white/10 text-white/85"}`}>
            <m.icon size={20} /> {m.label}
          </NavLink>
        ))}
        <Link to="/" className="flex items-center gap-3 rounded-full px-4 py-3 font-medium hover:bg-white/10 text-white/85"><Home size={20} /> होम पेज</Link>
      </nav>
      <button onClick={logout} className="mt-auto flex items-center gap-3 px-4 py-3 text-white/85 hover:text-white"><LogOut size={20} /> लॉग आउट</button>
    </aside>
  );
  return (
    <div className="min-h-screen md:flex">
      <div className="hidden md:block sticky top-0 h-screen">{sidebar}</div>
      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="h-full">{sidebar}</div>
          <div className="flex-1 bg-black/40" onClick={() => setOpen(false)} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-cream/90 backdrop-blur border-b border-stone-200 h-20 flex items-center gap-4 px-4 md:px-8">
          <button className="md:hidden p-2 rounded-lg border border-stone-300" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
          <div>
            <div className="font-extrabold text-xl">नमस्ते, {me?.name}</div>
            <div className="text-sm text-stone-500">{me && ROLE_LABEL[me.role]}</div>
          </div>
        </header>
        <main className="p-4 md:p-8 max-w-6xl"><Outlet /></main>
      </div>
    </div>
  );
}
