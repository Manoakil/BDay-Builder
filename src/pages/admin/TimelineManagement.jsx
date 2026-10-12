import React, { useEffect, useState } from 'react';
import { getTimelineForEvent, getMyBirthdayEvent } from '../../service/eventService';
import { deleteTimelineEntry } from '../../service/wishService';
import { HiOutlineTrash, HiOutlineClock, HiOutlineMap, HiOutlineEye } from 'react-icons/hi';
import PreviewModal from '../../components/admin/PreviewModal';
import { useDialog } from '../../context/DialogContext';
import "../../style/Admin.css";

function TimelineManagement() {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const dialog = useDialog();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const evt = await getMyBirthdayEvent();
      setEvent(evt);
      if (evt) {
        const data = await getTimelineForEvent(evt.id);
        // Sort by date descending
        const sorted = (data || []).sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date));
        setTimeline(sorted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (entryId) => {
    const confirmed = await dialog.showConfirm("Are you sure you want to delete this memory?");
    if (!confirmed) return;
    try {
      await deleteTimelineEntry(entryId);
      setTimeline(timeline.filter(t => t.id !== entryId));
    } catch (err) {
      dialog.showAlert(`Delete failed: ${err.message}`);
    }
  };

  if (loading) return <div className="admin-loading">Loading timeline...</div>;
  if (!event) return <div className="admin-empty">No active birthday event found.</div>;

  return (
    <div className="admin-section">
      <h2 className="admin-section-title">⏱️ Memory Line Management</h2>
      <p className="admin-section-subtitle">Curate the chronological journey. Review all Memory Line entries contributed by wishers.</p>

      {timeline.length === 0 ? (
        <div className="admin-empty">No Memory Line entries have been added yet.</div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Title & Location</th>
                <th>Category</th>
                <th>Media Preview</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map(entry => {
                const dateObj = new Date(entry.entry_date);
                return (
                    <tr key={entry.id}>
                      <td data-label="Date">
                        <div className="timeline-date-cell">
                          <strong>{dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</strong>
                          <span>{dateObj.getFullYear()}</span>
                        </div>
                      </td>
                      <td data-label="Title & Location">
                        <div className="font-medium">{entry.title || "Untitled"}</div>
                        {entry.location && <div className="text-sm text-gray-500"><HiOutlineMap /> {entry.location}</div>}
                      </td>
                      <td data-label="Category"><span className="timeline-category-badge">{entry.category || 'photo'}</span></td>
                      <td data-label="Media Preview">
                        <button 
                          onClick={() => setPreviewData({ content: entry.description, mediaUrl: entry.media_url, type: entry.category })} 
                          className="action-btn" 
                          title="View Content"
                          style={{ color: 'var(--admin-secondary)', borderColor: 'var(--admin-secondary)' }}
                        >
                          <HiOutlineEye />
                        </button>
                      </td>
                      <td data-label="Actions" className="actions-cell">
                        <button onClick={() => handleDelete(entry.id)} className="action-btn delete" title="Remove Entry">
                          <HiOutlineTrash />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      <PreviewModal 
        isOpen={!!previewData} 
        onClose={() => setPreviewData(null)} 
        content={previewData?.content} 
        mediaUrl={previewData?.mediaUrl} 
        type={previewData?.type} 
      />
    </div>
  );
}

export default TimelineManagement;
