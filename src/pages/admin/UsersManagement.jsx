import React, { useState, useEffect } from "react";
import { getOrganizationMembers, approveMember, rejectMember, getMyOrganizations, removeMember } from "../../service/adminService";
import { HiOutlineCheck, HiOutlineX, HiOutlineUserGroup, HiOutlineTrash } from 'react-icons/hi';
import { useDialog } from '../../context/DialogContext';
import "../../style/Admin.css";

export default function UsersManagement() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orgId, setOrgId] = useState(null);
  const dialog = useDialog();

  const fetchMembers = async (id) => {
    try {
      const data = await getOrganizationMembers(id);
      setMembers(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const orgs = await getMyOrganizations();
        if (orgs && orgs.length > 0) {
          setOrgId(orgs[0].id);
          await fetchMembers(orgs[0].id);
        } else {
          setError("No organization found.");
          setLoading(false);
        }
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleApprove = async (userId, memberName) => {
    const confirmed = await dialog.showConfirm(
      `Are you sure you want to approve ${memberName || 'this user'}?`,
      "Yes",
      "No",
      false
    );
    if (!confirmed) return;

    try {
      // Optimistic update so the UI immediately updates to show "approved"
      setMembers((prev) =>
        prev.map((m) =>
          m.user_id === userId
            ? { ...m, approval_status: 'approved', status: 'active' }
            : m
        )
      );

      await approveMember(orgId, userId);
      await fetchMembers(orgId);
      dialog.showAlert(`${memberName || 'User'} has been approved successfully!`);
    } catch (err) {
      await fetchMembers(orgId);
      dialog.showAlert(err.message || "Failed to approve member");
    }
  };

  const handleReject = async (userId, memberName) => {
    const reason = await dialog.showPrompt(`Enter reason for rejecting ${memberName || 'this user'}:`);
    if (reason === null) return;
    try {
      setMembers((prev) =>
        prev.map((m) =>
          m.user_id === userId
            ? { ...m, approval_status: 'rejected', status: 'suspended', rejection_reason: reason }
            : m
        )
      );
      await rejectMember(orgId, userId, reason);
      await fetchMembers(orgId);
      dialog.showAlert("Member has been rejected.");
    } catch (err) {
      await fetchMembers(orgId);
      dialog.showAlert(err.message || "Failed to reject member");
    }
  };

  const handleRemove = async (memberId) => {
    const confirmed = await dialog.showConfirm(
      "Are you sure you want to remove this member?",
      "Yes",
      "No",
      true
    );
    if (!confirmed) return;
    try {
      await removeMember(orgId, memberId);
      await fetchMembers(orgId);
      dialog.showAlert("Member removed successfully.");
    } catch (err) {
      dialog.showAlert(err.message || "Failed to remove member");
    }
  };

  // Sort so unapproved/pending members are displayed on top
  const sortedMembers = [...members].sort((a, b) => {
    const aStatus = (a.approval_status || 'pending').toLowerCase();
    const bStatus = (b.approval_status || 'pending').toLowerCase();
    const aPending = aStatus === 'pending' || aStatus === 'unapproved';
    const bPending = bStatus === 'pending' || bStatus === 'unapproved';
    if (aPending && !bPending) return -1;
    if (!aPending && bPending) return 1;
    return new Date(b.created_at || b.joined_at || 0) - new Date(a.created_at || a.joined_at || 0);
  });

  return (
    <div className="admin-section">
      <h2 className="admin-section-title">👥 Users & Invitations</h2>
      <p className="admin-section-subtitle">Manage organization members, wishers, and their access levels.</p>

      <div className="admin-table-container">
        {loading ? (
          <div className="admin-loading">Loading members...</div>
        ) : error ? (
          <div className="admin-empty" style={{ color: "var(--admin-danger)" }}>{error}</div>
        ) : sortedMembers.length === 0 ? (
          <div className="admin-empty">No members found.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedMembers.map((member) => {
                const status = (member.approval_status || 'pending').toLowerCase();
                const isPending = status === 'pending' || status === 'unapproved';

                return (
                  <tr 
                    key={member.id} 
                    style={isPending ? { background: 'rgba(245, 158, 11, 0.06)' } : {}}
                  >
                    <td data-label="Name">
                      <div className="font-medium" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <HiOutlineUserGroup style={{ color: isPending ? '#f59e0b' : 'var(--admin-primary)' }} />
                        <span>{member.full_name || 'Member'}</span>
                        {isPending && (
                          <span style={{ 
                            fontSize: '0.7rem', 
                            padding: '2px 6px', 
                            background: 'rgba(245, 158, 11, 0.2)', 
                            color: '#f59e0b', 
                            borderRadius: '4px', 
                            fontWeight: 700 
                          }}>
                            PENDING
                          </span>
                        )}
                      </div>
                    </td>
                    <td data-label="Email">{member.email || '—'}</td>
                    <td data-label="Role"><span className="timeline-category-badge">{member.role}</span></td>
                    <td data-label="Status">
                      <span className={`status-badge ${status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending'}`}>
                        {status}
                      </span>
                    </td>
                    <td data-label="Actions" className="actions-cell">
                      {isPending ? (
                        <>
                          <button 
                            onClick={() => handleApprove(member.user_id, member.full_name)} 
                            className="action-btn success" 
                            title="Approve Member"
                          >
                            <HiOutlineCheck />
                          </button>
                          <button 
                            onClick={() => handleReject(member.user_id, member.full_name)} 
                            className="action-btn delete" 
                            title="Reject Member"
                          >
                            <HiOutlineX />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => handleRemove(member.id)} className="action-btn delete" title="Remove Member">
                          <HiOutlineTrash />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
