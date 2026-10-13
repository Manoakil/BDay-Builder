import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import AdminDashboard from "./AdminDashboard";

import UsersManagement from "./UsersManagement";
import BirthdayManagement from './BirthdayManagement';
import WishModeration from './WishModeration';
import MemoriesManagement from './MemoriesManagement';
import TimelineManagement from './TimelineManagement';
import VaultConfiguration from './VaultConfiguration';
import ThemeCustomization from './ThemeCustomization';
import OrganizationSettings from './OrganizationSettings';
import GenerateWishBook from './GenerateWishBook';
import OrgAnalytics from './OrgAnalytics';
import WishersHome from '../WishersHome';

export default function AdminHome() {
  return (
    <AdminLayout role="org_admin">
      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/users" element={<UsersManagement />} />
        <Route path="/birthday" element={<BirthdayManagement />} />
        <Route path="/wishes" element={<WishModeration />} />
        <Route path="/memories" element={<MemoriesManagement />} />
        <Route path="/timeline" element={<TimelineManagement />} />
        <Route path="/vault" element={<VaultConfiguration />} />
        <Route path="/theme" element={<ThemeCustomization />} />
        <Route path="/settings" element={<OrganizationSettings />} />
        <Route path="/wish-book" element={<GenerateWishBook />} />
        <Route path="/analytics" element={<OrgAnalytics />} />
        <Route path="/wisher" element={<WishersHome />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminLayout>
  );
}
