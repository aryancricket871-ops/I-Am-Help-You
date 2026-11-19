import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "./auth";
import { Role, ROLE_HOME, IS_APP } from "./api";
import Setup from "./pages/Setup";
import Home from "./pages/Home";
import { Login, Signup } from "./pages/AuthPages";
import PanelLayout from "./components/PanelLayout";
import Dashboard from "./pages/Dashboard";
import UsersPage from "./pages/UsersPage";
import Referral from "./pages/Referral";
import Soon from "./pages/Soon";
import AuditPage from "./pages/AuditPage";
import CategoryPage from "./pages/CategoryPage";
import ProviderPage from "./pages/ProviderPage";
import CategoriesPage from "./pages/admin/CategoriesPage";
import ApprovalsPage from "./pages/admin/ApprovalsPage";
import ProviderPanel from "./pages/ProviderPanel";

function Guard({ role, children }: { role: Role; children: ReactNode }) {
  const { me, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="p-10 text-center text-stone-500">लोड हो रहा है…</div>;
  if (!me) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (me.role !== role) return <Navigate to={ROLE_HOME[me.role]} replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      {!IS_APP && <Route path="/setup" element={<Setup />} />}
      <Route path="/c/:id" element={<CategoryPage />} />
      <Route path="/p/:id" element={<ProviderPage />} />

      {!IS_APP && (
        <>
      <Route path="/admin" element={<Guard role="admin"><PanelLayout kind="admin" /></Guard>}>
        <Route index element={<Dashboard />} />
        <Route path="users" element={<UsersPage allowed={["super_distributor", "distributor", "provider", "customer"]} />} />
        <Route path="network" element={<Soon title="नेटवर्क" />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="banners" element={<Soon title="बैनर व ऑफ़र" />} />
        <Route path="settings" element={<Soon title="सेटिंग्स" />} />
        <Route path="audit" element={<AuditPage />} />
      </Route>

      <Route path="/super-distributor" element={<Guard role="super_distributor"><PanelLayout kind="super_distributor" /></Guard>}>
        <Route index element={<Dashboard />} />
        <Route path="distributors" element={<UsersPage fixedRole="distributor" allowed={["distributor"]} />} />
        <Route path="providers" element={<UsersPage fixedRole="provider" allowed={["provider"]} />} />
        <Route path="create" element={<UsersPage allowed={["distributor", "provider"]} createOnly />} />
      </Route>

      <Route path="/distributor" element={<Guard role="distributor"><PanelLayout kind="distributor" /></Guard>}>
        <Route index element={<Dashboard />} />
        <Route path="providers" element={<UsersPage fixedRole="provider" allowed={["provider"]} />} />
        <Route path="create" element={<UsersPage allowed={["provider"]} createOnly />} />
        <Route path="referral" element={<Referral />} />
      </Route>

      <Route path="/provider" element={<Guard role="provider"><PanelLayout kind="provider" /></Guard>}>
        <Route index element={<ProviderPanel />} />
      </Route>

        </>
      )}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
