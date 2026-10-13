import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DialogProvider } from "./context/DialogContext";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import InviteSignup from "./pages/InviteSignup";
import SuperAdminHome from "./pages/superadmin/SuperAdminHome";
import AdminHome from "./pages/admin/AdminHome";
import ProtectedRoute from "./common/ProtectedRoute";
import BirthdayPerson from "./pages/BirthdayPerson";

import WishersHome from "./pages/WishersHome";
import VaultWishes from "./pages/VaultWishes";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <DialogProvider>
      <BrowserRouter>
        <Routes>
        {/* Default home — Landing page with Login/Signup buttons */}
        <Route path="/" element={<Landing />} />

        {/* Auth pages */}
        <Route path="/login" element={<Login />} />
        
        {/* Direct signup (usually for Super Admin to create first Org Admin, or disabled in true SaaS) */}
        <Route path="/signup" element={<Signup />} />
        
        {/* Secure Invitation Link for Wishers/Birthday Person */}
        <Route path="/invite/:token" element={<InviteSignup />} />

        {/* Role-based protected routes */}
        
        {/* Super Admin Dashboard */}
        <Route path="/super-admin/*" element={
          <ProtectedRoute allowedRoles={["super_admin", "super-admin"]}>
            <SuperAdminHome />
          </ProtectedRoute>
        } />
        
        {/* Org Admin Dashboard */}
        <Route path="/admin/*" element={
          <ProtectedRoute allowedRoles={["org_admin", "org-admin", "super_admin", "super-admin", "admin"]}>
            <AdminHome />
          </ProtectedRoute>
        } />
        
        {/* Wisher Portal */}
        <Route path="/wisher" element={
          <ProtectedRoute allowedRoles={["wisher", "org_admin", "org-admin", "super_admin", "super-admin", "admin"]}>
            <WishersHome />
          </ProtectedRoute>
        } />

        {/* Birthday Experience (Shared by Wisher and Birthday Person) */}
        <Route path="/birthday/:slug" element={
          <ProtectedRoute allowedRoles={["bday_person", "birthday_person", "bday-person", "wisher", "org_admin", "org-admin", "super_admin", "super-admin", "admin"]}>
            <BirthdayPerson />
          </ProtectedRoute>
        } />

        {/* Dedicated Secret Vault Page (Question Challenge Protected) */}
        <Route path="/vault" element={<VaultWishes />} />
        <Route path="/vault/:eventId" element={<VaultWishes />} />

        {/* Legacy redirect for old hardcoded routes if needed */}
        <Route path="/wishes" element={<Navigate to="/birthday/default" replace />} />
        <Route path="/superadmin" element={<Navigate to="/super-admin" replace />} />

        {/* Catch-all 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </BrowserRouter>
    </DialogProvider>
  );
}

export default App;
