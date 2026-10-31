import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { PrayerRequestCard } from '../components/dashboard/PrayerRequestCard';
import { EmptyState } from '../components/common/EmptyState';
import { BackButton } from '../components/common/BackButton';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { hasPermission } from '../lib/permissions';
import { Search, Download } from 'lucide-react';

interface PrayerRequestsPageProps {
  onNavigate: (path: string) => void;
}

export const PrayerRequestsPage: React.FC<PrayerRequestsPageProps> = ({ onNavigate: _onNavigate }) => {
  const {
    prayerRequests = [],
    markPrayerRequestAnswered,
    archivePrayerRequest,
    addNoteToPrayerRequest,
    addToast,
  } = useApp();
  const { user } = useAuth();
  const canSeePrivate = hasPermission(user?.role || 'LISTENER', 'canViewPrivateRequests');
  const visibleRequests = (prayerRequests || []).filter((req) => !req.isPrivate || canSeePrivate);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'PRIVATE' | 'PUBLIC' | 'ANSWERED' | 'ARCHIVED'>('ALL');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const filteredRequests = visibleRequests.filter((req) => {
    if (!req) return false;
    const matchesSearch =
      (req.participantName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.request || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.adminNote && req.adminNote.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterTab === 'PRIVATE') return canSeePrivate && req.isPrivate && req.status !== 'ARCHIVED';
    if (filterTab === 'PUBLIC') return !req.isPrivate && req.status !== 'ARCHIVED';
    if (filterTab === 'ANSWERED') return req.status === 'ANSWERED';
    if (filterTab === 'ARCHIVED') return req.status === 'ARCHIVED';
    return req.status !== 'ARCHIVED';
  });

  const selectedRequest = visibleRequests.find((req) => req.id === selectedRequestId) || null;

  const handleExportCSV = () => {
    if (visibleRequests.length === 0) {
      addToast('No prayer requests to export yet.', 'info');
      return;
    }
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Name,Request,Private,Status,Created At,Pastoral Note']
        .concat(
          visibleRequests.map(
            (r) =>
              `"${r.participantName}","${r.request.replace(/"/g, '""')}",${r.isPrivate},${r.status},"${new Date(r.createdAt).toISOString()}","${(r.adminNote || '').replace(/"/g, '""')}"`
          )
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sanctum_prayer_requests_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast('Prayer requests exported as CSV', 'success');
  };

  const detailBreadcrumbs = [
    { label: 'Prayer Requests', path: '/dashboard/prayer-requests' },
    { label: selectedRequest?.participantName || 'Request', isCurrent: true },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#16251F] dark:text-[#F8F7F3] tracking-tight">
            Prayer Requests & Petitions
          </h1>
          <p className="text-xs sm:text-sm text-[#68736D] dark:text-[#96A39D] mt-1">
            Review, pray over, and manage requests submitted by congregation members.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          type="button"
          disabled={visibleRequests.length === 0}
          className="px-4 py-2.5 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] font-semibold text-xs text-[#203C32] dark:text-[#E8D8B2] hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          <span>Export Requests</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#17221D] p-3 rounded-2xl border border-[#E5E6E1] dark:border-[#26362F]">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prayer requests by name or prayer text..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-[#F8F7F3]/70 dark:bg-[#101814] text-[#16251F] dark:text-[#F8F7F3] border border-transparent focus:border-[#203C32] dark:focus:border-[#C9A35A] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'Active Requests' },
            ...(canSeePrivate ? [{ id: 'PRIVATE', label: 'Pastoral Only 🔒' }] : []),
            { id: 'PUBLIC', label: 'Congregation 🌐' },
            { id: 'ANSWERED', label: 'Answered ✨' },
            { id: 'ARCHIVED', label: 'Archived' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                filterTab === tab.id
                  ? 'bg-[#203C32] text-white dark:bg-[#C9A35A] dark:text-[#101814]'
                  : 'text-[#68736D] dark:text-[#96A39D] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Grid */}
      {filteredRequests.length === 0 ? (
        <EmptyState
          title="No prayer requests found"
          description={
            searchQuery
              ? `No requests match "${searchQuery}".`
              : 'Requests submitted by church attendees will appear here.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRequests.map((req) => (
            <PrayerRequestCard
              key={req.id}
              request={req}
              onMarkAnswered={markPrayerRequestAnswered}
              onArchive={archivePrayerRequest}
              onAddNote={addNoteToPrayerRequest}
              onOpenDetail={setSelectedRequestId}
            />
          ))}
        </div>
      )}

      {selectedRequest && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="prayer-request-detail-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="bg-white dark:bg-[#17221D] rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-[#E5E6E1] dark:border-[#26362F] max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col gap-2 mb-4">
              <BackButton
                label="Back to Prayer Requests"
                mobileLabel="Back"
                onClick={() => setSelectedRequestId(null)}
              />
              <Breadcrumbs items={detailBreadcrumbs} onNavigate={() => setSelectedRequestId(null)} />
              <h2 id="prayer-request-detail-title" className="text-lg font-bold text-[#16251F] dark:text-[#F8F7F3]">
                Prayer Request
              </h2>
            </div>
            <PrayerRequestCard
              request={selectedRequest}
              onMarkAnswered={markPrayerRequestAnswered}
              onArchive={(id) => {
                archivePrayerRequest(id);
                setSelectedRequestId(null);
              }}
              onAddNote={addNoteToPrayerRequest}
            />
          </div>
        </div>
      )}
    </div>
  );
};
