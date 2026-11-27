import React, { useState, useEffect, useRef } from 'react';
import { PageHeader } from './common/PageHeader';
import { Search, ExternalLink, Download, ArrowLeft, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ActivityItem {
  log_id: string;
  user_id: number | null;
  user_name: string;
  activity_type: string;
  details: string;
  reference_type?: string | null;
  reference_id?: number | null;
  reference_link?: string | null;
  ip_address?: string | null;
  created_at: string;
}

interface UserOption {
  id: number;
  name: string;
}

const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

export const ActivityReport: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const branchSlug = slugify(currentUser?.branch_name || 'branch');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [logs, setLogs] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  // Date Range calculation matching InvoiceList
  const getLocalDateString = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'weekly' | 'monthly' | 'all' | 'custom'>('today');
  const [customStart, setCustomStart] = useState(getLocalDateString());
  const [customEnd, setCustomEnd] = useState(getLocalDateString());
  const [selectedActivity, setSelectedActivity] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Dropdown Options
  const [users, setUsers] = useState<UserOption[]>([]);
  const [activityTypes, setActivityTypes] = useState<string[]>([]);

  const buildFilterParams = () => {
    let start = '';
    let end = '';
    const today = new Date();

    if (dateRange === 'today') {
      const str = getLocalDateString(today);
      start = str;
      end = str;
    } else if (dateRange === 'yesterday') {
      const yest = new Date();
      yest.setDate(yest.getDate() - 1);
      const str = getLocalDateString(yest);
      start = str;
      end = str;
    } else if (dateRange === 'weekly') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      start = getLocalDateString(sevenDaysAgo);
      end = getLocalDateString(today);
    } else if (dateRange === 'monthly') {
      start = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      end = getLocalDateString(today);
    } else if (dateRange === 'custom') {
      start = customStart;
      end = customEnd;
    }

    const params = new URLSearchParams();
    if (dateRange === 'all') {
      params.append('all_dates', '1');
    } else {
      if (start) params.append('start_date', start);
      if (end) params.append('end_date', end);
    }
    if (selectedActivity !== 'all') params.append('activity_type', selectedActivity);
    if (selectedUser !== 'all') params.append('user_id', selectedUser);
    if (searchTerm.trim()) params.append('search', searchTerm.trim());
    return params;
  };

  const metaLoadedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const prevSearchRef = useRef(searchTerm);

  const fetchLogs = async (targetPage = page, targetLimit = limit) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = sessionStorage.getItem('epos_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const params = buildFilterParams();
      params.append('page', String(targetPage));
      params.append('limit', String(targetLimit));
      if (metaLoadedRef.current) params.append('include_meta', '0');

      const res = await fetch(`/api/reports/activity-logs?${params.toString()}`, {
        headers,
        signal: controller.signal
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        if (data.users) setUsers(data.users);
        if (data.activityTypes && data.activityTypes.length > 0) {
          setActivityTypes(data.activityTypes);
        }
        metaLoadedRef.current = true;
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Error fetching activity logs:', error);
      }
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const searchChanged = prevSearchRef.current !== searchTerm;
    prevSearchRef.current = searchTerm;
    const delay = searchChanged && searchTerm.trim() !== '' ? 300 : 0;

    const timer = setTimeout(() => {
      setPage(1);
      fetchLogs(1, limit);
    }, delay);

    return () => clearTimeout(timer);
  }, [dateRange, customStart, customEnd, selectedActivity, selectedUser, searchTerm]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1);
    setPage(1);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  };

  const totalPages = Math.ceil(total / limit) || 1;

  // Render clickable details matching brand style
  const renderDetailsCell = (item: ActivityItem) => {
    const text = item.details || '';

    if (item.reference_type === 'invoice' && item.reference_id) {
      return (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/${branchSlug}/invoices/${item.reference_id}`);
          }}
          className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer inline-flex items-center gap-1"
        >
          <span>{text}</span>
          <ExternalLink size={12} className="inline opacity-70" />
        </span>
      );
    }

    if (item.reference_type === 'product' && item.reference_id) {
      return (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/${branchSlug}/products/${item.reference_id}`);
          }}
          className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer inline-flex items-center gap-1"
        >
          <span>{text}</span>
          <ExternalLink size={12} className="inline opacity-70" />
        </span>
      );
    }

    if (item.reference_type === 'customer' && item.reference_id) {
      return (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/${branchSlug}/customers/${item.reference_id}`);
          }}
          className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer inline-flex items-center gap-1"
        >
          <span>{text}</span>
          <ExternalLink size={12} className="inline opacity-70" />
        </span>
      );
    }

    if (item.reference_type === 'device' && item.reference_id) {
      return (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/${branchSlug}/devices/${item.reference_id}`);
          }}
          className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer inline-flex items-center gap-1"
        >
          <span>{text}</span>
          <ExternalLink size={12} className="inline opacity-70" />
        </span>
      );
    }

    return <span>{text}</span>;
  };

  const handleExportCSV = async () => {
    if (total === 0 && logs.length === 0) return;
    try {
      const headers: Record<string, string> = {};
      const token = sessionStorage.getItem('epos_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const params = buildFilterParams();
      const res = await fetch(`/api/reports/activity-logs/export?${params.toString()}`, { headers });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Activity_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      }
    } catch (err) {
      console.error('Server CSV export failed, falling back to current page:', err);
    }

    if (logs.length === 0) return;
    const csvHeaders = ['Date', 'Time', 'User', 'Activity', 'Details', 'IP Address'];
    const rows = logs.map(log => [
      formatDate(log.created_at),
      formatTime(log.created_at),
      `"${(log.user_name || 'System').replace(/"/g, '""')}"`,
      `"${(log.activity_type || '').replace(/"/g, '""')}"`,
      `"${(log.details || '').replace(/"/g, '""')}"`,
      `"${(log.ip_address || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [csvHeaders.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Activity_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 text-sm px-3 pb-3 pt-1 select-none w-full font-sans">
      {/* Header */}
      <PageHeader
        title="Activity Report"
        onBack={() => navigate(`/${branchSlug}/home`)}
        backTitle="Back to Home Menu"
        actions={
          <>
            <button 
              onClick={handleExportCSV}
              className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium py-1.5 px-3 text-sm flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-200"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
            <button 
              onClick={() => navigate(`/${branchSlug}/register`)}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium py-1.5 px-3.5 text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Cash Register</span>
            </button>
          </>
        }
      />

      {/* Filters & Search */}
      <div className="px-4 py-2.5 flex flex-wrap gap-2 items-center bg-white dark:bg-neutral-900 border-x border-b border-neutral-200 dark:border-neutral-800 shrink-0">
        <div className="flex items-center gap-2">
          {/* Date Range Preset */}
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="bg-white text-neutral-800 border border-neutral-200 dark:bg-neutral-950 dark:text-neutral-200 dark:border-neutral-800 rounded px-2.5 py-1 outline-none focus:border-neutral-400 h-8 font-normal text-xs cursor-pointer"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="weekly">Weekly (Last 7 Days)</option>
            <option value="monthly">Monthly (This Month)</option>
            <option value="all">All Dates</option>
            <option value="custom">Custom Range</option>
          </select>

          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input 
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-white text-neutral-800 border border-neutral-200 dark:bg-neutral-950 dark:text-neutral-200 dark:border-neutral-800 rounded px-2.5 py-1 outline-none focus:border-neutral-400 h-8 text-xs font-normal"
              />
              <span className="text-neutral-400 text-xs">to</span>
              <input 
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-white text-neutral-800 border border-neutral-200 dark:bg-neutral-950 dark:text-neutral-200 dark:border-neutral-800 rounded px-2.5 py-1 outline-none focus:border-neutral-400 h-8 text-xs font-normal"
              />
            </div>
          )}
        </div>

        {/* Activity Type Dropdown */}
        <select 
          value={selectedActivity}
          onChange={(e) => setSelectedActivity(e.target.value)}
          className="bg-white text-neutral-800 border border-neutral-200 dark:bg-neutral-950 dark:text-neutral-200 dark:border-neutral-800 rounded px-2.5 py-1 outline-none w-48 h-8 text-xs font-normal cursor-pointer"
        >
          <option value="all">All Activities</option>
          {activityTypes.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Users Dropdown */}
        <select 
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="bg-white text-neutral-800 border border-neutral-200 dark:bg-neutral-950 dark:text-neutral-200 dark:border-neutral-800 rounded px-2.5 py-1 outline-none w-40 h-8 text-xs font-normal cursor-pointer"
        >
          <option value="all">All Users</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        {(dateRange !== 'today' || selectedActivity !== 'all' || selectedUser !== 'all' || searchTerm.trim() !== '') && (
          <button
            type="button"
            onClick={() => {
              const todayStr = getLocalDateString();
              setDateRange('today');
              setSelectedActivity('all');
              setSelectedUser('all');
              setSearchTerm('');
              setCustomStart(todayStr);
              setCustomEnd(todayStr);
            }}
            className="text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 border border-red-200 dark:border-red-900/60 px-2.5 py-1 rounded transition-colors cursor-pointer"
            title="Reset filters to Today"
          >
            Reset
          </button>
        )}

        {/* Search Input Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm ml-auto">
          <input
            ref={searchInputRef}
            type="text"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Search activities, details, or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearchTerm('');
              }
            }}
            className="w-full pl-3 pr-14 py-1 bg-white border border-neutral-200 dark:bg-neutral-950 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 rounded text-xs font-normal outline-none focus:border-neutral-400 h-8"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  searchInputRef.current?.focus();
                }}
                className="p-0.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded cursor-pointer"
                title="Clear Search"
              >
                <X size={13} />
              </button>
            )}
            <button type="submit" className="cursor-pointer">
              <Search size={14} className="text-neutral-400" />
            </button>
          </div>
        </form>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto bg-white dark:bg-neutral-900 border-x border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-left border-collapse text-[13px]">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
              <th className="px-3 py-2.5 w-24">Date</th>
              <th className="px-3 py-2.5 w-24">Time</th>
              <th className="px-3 py-2.5 w-40">User</th>
              <th className="px-3 py-2.5 w-48">Activity</th>
              <th className="px-3 py-2.5">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/70">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-neutral-400 text-sm">
                  Loading activity logs...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-neutral-400 text-sm">
                  No activity logs found for this period.
                </td>
              </tr>
            ) : (
              logs.map((item, idx) => (
                <tr 
                  key={item.log_id || idx}
                  className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors"
                >
                  <td className="px-3 py-2 text-neutral-500 dark:text-neutral-400 whitespace-nowrap tabular-nums">
                    {formatDate(item.created_at)}
                  </td>
                  <td className="px-3 py-2 text-neutral-500 dark:text-neutral-400 whitespace-nowrap tabular-nums">
                    {formatTime(item.created_at)}
                  </td>
                  <td className="px-3 py-2 text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                    {item.user_name && item.user_name.toLowerCase() !== 'null' ? item.user_name : 'System'}
                  </td>
                  <td className="px-3 py-2 text-neutral-900 dark:text-neutral-100 font-medium whitespace-nowrap">
                    {item.activity_type || (item as any).activity || 'Activity'}
                  </td>
                  <td className="px-3 py-2 text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    {renderDetailsCell(item)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Pagination */}
      <div className="px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-b-md flex justify-between items-center text-xs text-neutral-500 dark:text-neutral-400 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-neutral-500">Show:</span>
            <select
              value={limit}
              onChange={(e) => {
                const newLimit = Number(e.target.value);
                setLimit(newLimit);
                setPage(1);
                fetchLogs(1, newLimit);
              }}
              className="bg-white text-neutral-900 border border-neutral-300 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700 rounded-none px-2 py-0.5 outline-none text-xs cursor-pointer h-7 font-normal"
              title="Select records per page"
            >
              <option value={50}>50 records</option>
              <option value={100}>100 records</option>
              <option value={200}>200 records</option>
            </select>
          </div>
          <span className="font-normal text-xs text-neutral-600 dark:text-neutral-400">
            {logs.length > 0 ? `${(page - 1) * limit + 1}-${Math.min(page * limit, total)} of ${total} records` : '0 of 0 records'}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={() => { if (page > 1) { setPage(page - 1); fetchLogs(page - 1, limit); } }}
            disabled={page <= 1 || loading}
            className="px-2 py-0.5 border border-neutral-200 dark:border-neutral-800 rounded-none bg-neutral-200 dark:bg-neutral-900 hover:bg-neutral-300 dark:hover:bg-neutral-850 text-neutral-850 dark:text-neutral-200 disabled:opacity-40 cursor-pointer"
          >
            «
          </button>
          <span className="px-3 py-0.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black rounded-none font-normal">
            {page} / {totalPages}
          </span>
          <button 
            onClick={() => { if (page < totalPages) { setPage(page + 1); fetchLogs(page + 1, limit); } }}
            disabled={page >= totalPages || loading}
            className="px-2 py-0.5 border border-neutral-200 dark:border-neutral-800 rounded-none bg-neutral-200 dark:bg-neutral-900 hover:bg-neutral-300 dark:hover:bg-neutral-850 text-neutral-850 dark:text-neutral-200 disabled:opacity-40 cursor-pointer"
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityReport;
