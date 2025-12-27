import { useState, useEffect } from 'react';
import { Flag, CheckCircle, XCircle, Eye } from 'lucide-react';
import { adminApi } from '../../services/adminApi';

interface Report {
  report_id: string;
  content_type: 'toki' | 'user' | 'message';
  content_id: string;
  reason: string;
  reported_at: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  notes?: string;
  reviewed_at?: string;
  reporter_name: string;
  reporter_id: string;
  reviewer_name?: string;
  content_preview?: string;
  content_owner_id?: string;
  // Toki-specific fields
  toki_location?: string;
  toki_category?: string;
  toki_scheduled_time?: string;
  toki_status?: 'active' | 'blocked' | 'cancelled' | 'completed';
  toki_visibility?: 'public' | 'private' | 'friends';
  toki_host_name?: string;
  // Message-specific fields
  message_created_at?: string;
  message_sender_name?: string;
  message_type?: 'direct' | 'group';
}

export default function ReportsTab() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'reviewed' | 'resolved' | 'dismissed'>('pending');
  const [contentTypeFilter, setContentTypeFilter] = useState<'all' | 'toki' | 'user' | 'message'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    loadReports();
  }, [statusFilter, contentTypeFilter, page]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response: any = await adminApi.getReports({
        page,
        limit: 20,
        status: statusFilter,
        contentType: contentTypeFilter
      });
      setReports(response.data.reports);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewReport = async (reportId: string, newStatus: 'reviewed' | 'resolved' | 'dismissed') => {
    try {
      await adminApi.updateReport(reportId, {
        status: newStatus,
        notes: reviewNotes
      });
      setShowReviewModal(false);
      setReviewNotes('');
      setSelectedReport(null);
      loadReports();
    } catch (error) {
      console.error('Error updating report:', error);
      alert('Failed to update report');
    }
  };

  const handleBlockToki = async (tokiId: string, shouldBlock: boolean) => {
    try {
      await adminApi.blockToki(tokiId, { 
        block: shouldBlock, 
        reason: reviewNotes 
      });
      alert(shouldBlock ? 'Toki blocked successfully' : 'Toki unblocked successfully');
      // Refresh reports to show updated status
      loadReports();
    } catch (error) {
      console.error('Error blocking/unblocking Toki:', error);
      alert('Failed to update Toki status');
    }
  };

  const getContentTypeColor = (type: string) => {
    switch (type) {
      case 'toki': return '#8B5CF6';
      case 'user': return '#EF4444';
      case 'message': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getContentTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div>
      {/* Header */}
      <div style={{
        background: 'var(--gradient-card)',
        backdropFilter: 'var(--glass-blur)',
        borderRadius: 'var(--border-radius-lg)',
        padding: '24px',
        marginBottom: '24px',
        border: '1px solid var(--glass-border)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <Flag size={24} color="var(--primary-purple)" />
          <h2 style={{
            fontSize: '24px',
            fontFamily: 'var(--font-bold)',
            color: '#1F2937'
          }}>
            Content Reports
          </h2>
        </div>
        <p style={{ color: '#6B7280', fontSize: '14px' }}>
          Review and manage user-reported content including Tokis, users, and messages.
        </p>
      </div>

      {/* Filters */}
      <div style={{
        background: 'white',
        borderRadius: 'var(--border-radius-lg)',
        padding: '20px',
        marginBottom: '20px',
        border: '1px solid var(--glass-border)',
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontFamily: 'var(--font-medium)',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setPage(1);
            }}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #D1D5DB',
              borderRadius: 'var(--border-radius-md)',
              fontSize: '14px',
              fontFamily: 'var(--font-regular)',
              cursor: 'pointer'
            }}
          >
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>

        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontFamily: 'var(--font-medium)',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Content Type
          </label>
          <select
            value={contentTypeFilter}
            onChange={(e) => {
              setContentTypeFilter(e.target.value as any);
              setPage(1);
            }}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #D1D5DB',
              borderRadius: 'var(--border-radius-md)',
              fontSize: '14px',
              fontFamily: 'var(--font-regular)',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Types</option>
            <option value="toki">Tokis</option>
            <option value="user">Users</option>
            <option value="message">Messages</option>
          </select>
        </div>
      </div>

      {/* Reports Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
          Loading reports...
        </div>
      ) : reports.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: 'var(--border-radius-lg)',
          padding: '40px',
          textAlign: 'center',
          border: '1px solid var(--glass-border)'
        }}>
          <Flag size={48} color="#D1D5DB" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: '#6B7280', fontSize: '16px' }}>
            No {statusFilter} reports found
          </p>
        </div>
      ) : (
        <div style={{
          background: 'white',
          borderRadius: 'var(--border-radius-lg)',
          overflow: 'hidden',
          border: '1px solid var(--glass-border)'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse'
          }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <th style={tableHeaderStyle}>Type</th>
                <th style={tableHeaderStyle}>Content</th>
                <th style={tableHeaderStyle}>Reason</th>
                <th style={tableHeaderStyle}>Reporter</th>
                <th style={tableHeaderStyle}>Reported At</th>
                <th style={tableHeaderStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr
                  key={report.report_id}
                  style={{
                    borderBottom: '1px solid #E5E7EB',
                    transition: 'background 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#F9FAFB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                  }}
                >
                  <td style={tableCellStyle}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontFamily: 'var(--font-semi)',
                      backgroundColor: getContentTypeColor(report.content_type) + '20',
                      color: getContentTypeColor(report.content_type)
                    }}>
                      {getContentTypeLabel(report.content_type)}
                    </span>
                  </td>
                  <td style={tableCellStyle}>
                    <div style={{
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {report.content_preview || 'N/A'}
                    </div>
                  </td>
                  <td style={tableCellStyle}>
                    <div style={{
                      maxWidth: '250px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {report.reason}
                    </div>
                  </td>
                  <td style={tableCellStyle}>{report.reporter_name}</td>
                  <td style={tableCellStyle}>{formatDate(report.reported_at)}</td>
                  <td style={tableCellStyle}>
                    <button
                      onClick={() => {
                        setSelectedReport(report);
                        setReviewNotes(report.notes || '');
                        setShowReviewModal(true);
                      }}
                      style={{
                        padding: '6px 12px',
                        background: 'var(--gradient-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--border-radius-md)',
                        fontSize: '13px',
                        fontFamily: 'var(--font-medium)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Eye size={14} />
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          marginTop: '20px',
          display: 'flex',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            style={{
              padding: '8px 16px',
              border: '1px solid #D1D5DB',
              borderRadius: 'var(--border-radius-md)',
              background: 'white',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              opacity: page === 1 ? 0.5 : 1
            }}
          >
            Previous
          </button>
          <span style={{ padding: '8px 16px', color: '#6B7280' }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            style={{
              padding: '8px 16px',
              border: '1px solid #D1D5DB',
              borderRadius: 'var(--border-radius-md)',
              background: 'white',
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              opacity: page === totalPages ? 0.5 : 1
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedReport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: 'var(--border-radius-lg)',
            padding: '32px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontFamily: 'var(--font-bold)',
              marginBottom: '16px',
              color: '#1F2937'
            }}>
              Review Report
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ marginBottom: '12px' }}>
                <strong>Content Type:</strong>{' '}
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-semi)',
                  backgroundColor: getContentTypeColor(selectedReport.content_type) + '20',
                  color: getContentTypeColor(selectedReport.content_type)
                }}>
                  {getContentTypeLabel(selectedReport.content_type)}
                </span>
              </div>

              {/* Toki-specific context */}
              {selectedReport.content_type === 'toki' && (
                <>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>Toki Title:</strong> {selectedReport.content_preview || 'N/A'}
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>Host:</strong> {selectedReport.toki_host_name || 'N/A'}
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>Location:</strong> {selectedReport.toki_location || 'N/A'}
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>Category:</strong> {selectedReport.toki_category || 'N/A'}
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>Scheduled:</strong>{' '}
                    {selectedReport.toki_scheduled_time 
                      ? new Date(selectedReport.toki_scheduled_time).toLocaleString()
                      : 'N/A'}
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>Visibility:</strong>{' '}
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: selectedReport.toki_visibility === 'public' ? '#DBEAFE' : 
                                      selectedReport.toki_visibility === 'friends' ? '#FEF3C7' : '#F3E8FF',
                      color: selectedReport.toki_visibility === 'public' ? '#1E40AF' : 
                             selectedReport.toki_visibility === 'friends' ? '#92400E' : '#6B21A8'
                    }}>
                      {selectedReport.toki_visibility?.toUpperCase() || 'N/A'}
                    </span>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>Current Status:</strong>{' '}
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: selectedReport.toki_status === 'active' ? '#D1FAE5' : 
                                      selectedReport.toki_status === 'blocked' ? '#FEE2E2' : 
                                      selectedReport.toki_status === 'completed' ? '#E0E7FF' : '#F3F4F6',
                      color: selectedReport.toki_status === 'active' ? '#065F46' : 
                             selectedReport.toki_status === 'blocked' ? '#991B1B' : 
                             selectedReport.toki_status === 'completed' ? '#3730A3' : '#6B7280'
                    }}>
                      {selectedReport.toki_status?.toUpperCase() || 'N/A'}
                    </span>
                  </div>
                </>
              )}
              
              {/* Message-specific context */}
              {selectedReport.content_type === 'message' && (
                <>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>Message:</strong>
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#F9FAFB',
                      borderRadius: '8px',
                      borderLeft: '3px solid #F59E0B',
                      marginTop: '6px',
                      fontStyle: 'italic',
                      color: '#374151',
                      fontSize: '14px',
                      lineHeight: '1.5'
                    }}>
                      "{selectedReport.content_preview || 'N/A'}"
                    </div>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>Sender:</strong> {selectedReport.message_sender_name || 'N/A'}
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>Message Type:</strong>{' '}
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: selectedReport.message_type === 'direct' ? '#E0E7FF' : '#DBEAFE',
                      color: selectedReport.message_type === 'direct' ? '#4338CA' : '#1E40AF'
                    }}>
                      {selectedReport.message_type === 'direct' ? 'DIRECT MESSAGE' : 
                       selectedReport.message_type === 'group' ? 'GROUP CHAT' : 'N/A'}
                    </span>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>Sent At:</strong>{' '}
                    {selectedReport.message_created_at 
                      ? new Date(selectedReport.message_created_at).toLocaleString()
                      : 'N/A'}
                  </div>
                </>
              )}
              
              {/* User-specific context */}
              {selectedReport.content_type === 'user' && (
                <div style={{ marginBottom: '12px' }}>
                  <strong>User Name:</strong> {selectedReport.content_preview || 'N/A'}
                </div>
              )}
              
              <div style={{ marginBottom: '12px' }}>
                <strong>Reason:</strong> {selectedReport.reason}
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong>Reporter:</strong> {selectedReport.reporter_name}
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong>Reported At:</strong> {formatDate(selectedReport.reported_at)}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontFamily: 'var(--font-medium)',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Review Notes (Optional)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add notes about your review decision..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: 'var(--border-radius-md)',
                  fontSize: '14px',
                  fontFamily: 'var(--font-regular)',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              {/* Block/Unblock button - only for Tokis */}
              {selectedReport.content_type === 'toki' && (
                <button
                  onClick={() => {
                    const shouldBlock = selectedReport.toki_status !== 'blocked';
                    const message = shouldBlock 
                      ? 'Are you sure you want to BLOCK this Toki? It will be hidden from all users but remain in the database.'
                      : 'Are you sure you want to UNBLOCK this Toki? It will become visible again to users.';
                    
                    if (window.confirm(message)) {
                      handleBlockToki(selectedReport.content_id, shouldBlock);
                      // Also mark report as resolved
                      handleReviewReport(selectedReport.report_id, 'resolved');
                    }
                  }}
                  style={{
                    flex: 1,
                    minWidth: '140px',
                    padding: '10px 16px',
                    background: selectedReport.toki_status === 'blocked' ? '#10B981' : '#F59E0B',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--border-radius-md)',
                    fontFamily: 'var(--font-semi)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  {selectedReport.toki_status === 'blocked' ? '✓ Unblock Toki' : '🚫 Block Toki'}
                </button>
              )}
              
              <button
                onClick={() => handleReviewReport(selectedReport.report_id, 'resolved')}
                style={{
                  flex: 1,
                  minWidth: '120px',
                  padding: '10px 16px',
                  background: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--border-radius-md)',
                  fontFamily: 'var(--font-semi)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <CheckCircle size={16} />
                Resolve
              </button>
              <button
                onClick={() => handleReviewReport(selectedReport.report_id, 'dismissed')}
                style={{
                  flex: 1,
                  minWidth: '120px',
                  padding: '10px 16px',
                  background: '#EF4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--border-radius-md)',
                  fontFamily: 'var(--font-semi)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <XCircle size={16} />
                Dismiss
              </button>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setReviewNotes('');
                  setSelectedReport(null);
                }}
                style={{
                  flex: 1,
                  minWidth: '120px',
                  padding: '10px 16px',
                  background: 'white',
                  color: '#6B7280',
                  border: '1px solid #D1D5DB',
                  borderRadius: 'var(--border-radius-md)',
                  fontFamily: 'var(--font-semi)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const tableHeaderStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: '12px',
  fontFamily: 'var(--font-semi)',
  color: '#6B7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
};

const tableCellStyle: React.CSSProperties = {
  padding: '16px',
  fontSize: '14px',
  fontFamily: 'var(--font-regular)',
  color: '#1F2937'
};
