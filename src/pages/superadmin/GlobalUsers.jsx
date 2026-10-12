import React, { useState, useEffect } from "react";
import { getGlobalMembers, approveMember, rejectMember, removeMember } from "../../service/adminService";
import { useDialog } from "../../context/DialogContext";
import { HiOutlineCheck, HiOutlineX, HiOutlineTrash } from 'react-icons/hi';

export default function GlobalUsers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const dialog = useDialog();

  const fetchMembers = async () => {
    try {
      const data = await getGlobalMembers();
      setMembers(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleApprove = async (orgId, userId, memberName) => {
    const confirmed = await dialog.showConfirm(
      `Are you sure you want to approve ${memberName || 'this organization admin'}?`,
      "Yes",
      "No",
      false
    );
    if (!confirmed) return;

    try {
      // Optimistic update
      setMembers((prev) =>
        prev.map((m) =>
          m.user_id === userId
            ? { ...m, approval_status: 'approved', status: 'active' }
            : m
        )
      );

      await approveMember(orgId, userId);
      await fetchMembers();
      dialog.showAlert(`${memberName || 'Organization Admin'} approved successfully!`);
    } catch (err) {
      await fetchMembers();
      dialog.showAlert(err.message || "Failed to approve admin");
    }
  };

  const handleReject = async (orgId, userId, memberName) => {
    const reason = await dialog.showPrompt(`Enter reason for rejecting ${memberName || 'this org admin'}:`);
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
      await fetchMembers();
      dialog.showAlert("Organization Admin has been rejected.");
    } catch (err) {
      await fetchMembers();
      dialog.showAlert(err.message || "Failed to reject admin");
    }
  };

  const handleRemove = async (orgId, memberId) => {
    const confirmed = await dialog.showConfirm(
      "Are you sure you want to remove this org admin?",
      "Yes",
      "No",
      true
    );
    if (!confirmed) return;
    try {
      await removeMember(orgId, memberId);
      await fetchMembers();
      dialog.showAlert("Org Admin removed successfully.");
    } catch (err) {
      dialog.showAlert(err.message || "Failed to remove admin");
    }
  };

  const filteredMembers = members.filter(member => member.role === 'org_admin');

  // Sort so pending / unapproved org admins are shown at the very top
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    const aStatus = (a.approval_status || 'pending').toLowerCase();
    const bStatus = (b.approval_status || 'pending').toLowerCase();
    const aPending = aStatus === 'pending' || aStatus === 'unapproved';
    const bPending = bStatus === 'pending' || bStatus === 'unapproved';
    if (aPending && !bPending) return -1;
    if (!aPending && bPending) return 1;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  return (
    <div className="admin-section">
      <div className="panel-header">
        <h2>Global Users Management</h2>
      </div>

      <div className="admin-panel">
        <h3>Organization Admins</h3>
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p style={{ color: "red" }}>{error}</p>
        ) : sortedMembers.length === 0 ? (
          <p>No organization admins found.</p>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Organization</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Signed Up At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedMembers.map((member) => {
                  const status = (member.approval_status || 'pending').toLowerCase();
                  const isPending = status === 'pending' || status === 'unapproved';

                  return (
                    <tr 
                      key={member.member_id}
                      style={isPending ? { background: 'rgba(245, 158, 11, 0.06)' } : {}}
                    >
                      <td data-label="Name">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>{member.full_name}</span>
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
                      <td data-label="Email">{member.email}</td>
                      <td data-label="Organization">{member.organization_name}</td>
                      <td data-label="Role"><span className="timeline-category-badge">{member.role}</span></td>
                      <td data-label="Status">
                        <span className={`status-badge ${status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending'}`}>
                          {status}
                        </span>
                      </td>
                      <td data-label="Signed Up At">{new Date(member.created_at).toLocaleString()}</td>
                      <td data-label="Actions" className="actions-cell">
                        {isPending ? (
                          <>
                            <button 
                              onClick={() => handleApprove(member.organization_id, member.user_id, member.full_name)} 
                              className="action-btn success" 
                              title="Approve Org Admin"
                            >
                              <HiOutlineCheck />
                            </button>
                            <button 
                              onClick={() => handleReject(member.organization_id, member.user_id, member.full_name)} 
                              className="action-btn delete" 
                              title="Reject Org Admin"
                            >
                              <HiOutlineX />
                            </button>
                          </>
                        ) : (
                          <button onClick={() => handleRemove(member.organization_id, member.member_id)} className="action-btn delete" title="Remove Org Admin">
                            <HiOutlineTrash />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
