import React, { useState, useEffect, useRef } from 'react';
import { Search, ExternalLink, Download, ArrowLeft } from 'lucide-react';
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
  const limit = 50;

  // Date Range calculation matching InvoiceList
  const getLocalDateString = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'weekly' | 'monthly' | 'all' | 'custom'>('all');
  const [customStart, setCustomStart] = useState(getLocalDateString());
  const [customEnd, setCustomEnd] = useState(getLocalDateString());
  const [selectedActivity, setSelectedActivity] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Dropdown Options
  const [users, setUsers] = useState<UserOption[]>([]);
  const [activityTypes, setActivityTypes] = useState<string[]>([]);

  const fetchLogs = async (targetPage = page) => {
    setLoading(true);
    try {
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

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = sessionStorage.getItem('epos_token') || localStorage.getItem('epos_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const params = new URLSearchParams();
      params.append('page', String(targetPage));
      params.append('limit', String(limit));

      if (start) params.append('start_date', start);
      if (end) params.append('end_date', end);
      if (selectedActivity !== 'all') params.append('activity_type', selectedActivity);
      if (selectedUser !== 'all') params.append('user_id', selectedUser);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const res = await fetch(`/api/reports/activity-logs?${params.toString()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        setUsers(data.users || []);
        if (data.activityTypes && data.activityTypes.length > 0) {
          setActivityTypes(data.activityTypes);
        }
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
    setPage(1);
  }, [dateRange, customStart, customEnd, selectedActivity, selectedUser]);

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

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['Date', 'Time', 'User', 'Activity', 'Details', 'IP Address'];
    const rows = logs.map(log => [
      formatDate(log.created_at),
      formatTime(log.created_at),
      `"${(log.user_name || '').replace(/"/g, '""')}"`,
      `"${(log.activity_type || '').replace(/"/g, '""')}"`,
      `"${(log.details || '').replace(/"/g, '""')}"`,
      `"${(log.ip_address || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Activity_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 font-mono text-sm px-2 py-2 select-none w-full"
      style={{ fontSize: '15px' }}
    >
      {/* Header matching InvoiceList */}
      <div className="sticky top-0 z-40 bg-white dark:bg-black shrink-0 flex justify-between items-center px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/${branchSlug}/home`)}
            className="p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer"
            title="Back to Home Menu"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-medium text-black dark:text-white">Activity Report</h2>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportCSV}
            className="bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-black dark:text-white font-medium py-1.5 px-3 rounded text-sm flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button 
            onClick={() => navigate(`/${branchSlug}/register`)}
            className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium py-1.5 px-4 rounded text-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <span>Cash Register</span>
          </button>
        </div>
      </div>

      {/* Filters & Search matching InvoiceList bar */}
      <div className="p-2 flex flex-wrap gap-2 items-center bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-850 shrink-0">
        <div className="flex items-center gap-2">
          {/* Date Range Preset */}
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 rounded-none px-2 py-0.5 outline-none focus:border-neutral-400 focus:bg-neutral-50 dark:focus:bg-neutral-900 h-7 font-mono font-bold cursor-pointer"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="weekly">Weekly (Last 7 Days)</option>
            <option value="monthly">Monthly (This Month)</option>
            <option value="custom">Custom Range</option>
          </select>

          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input 
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 rounded-none px-2 py-0.5 outline-none focus:border-neutral-400 focus:bg-neutral-50 dark:focus:bg-neutral-900 h-7 font-mono"
              />
              <span className="text-neutral-500 dark:text-neutral-400 text-xs">to</span>
              <input 
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 rounded-none px-2 py-0.5 outline-none focus:border-neutral-400 focus:bg-neutral-50 dark:focus:bg-neutral-900 h-7 font-mono"
              />
            </div>
          )}
        </div>

        {/* Activity Type Dropdown */}
        <select 
          value={selectedActivity}
          onChange={(e) => setSelectedActivity(e.target.value)}
          className="bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 rounded-none px-2 py-0.5 outline-none w-52 h-7 font-mono cursor-pointer"
        >
          <option value="all">All Activities</option>
          <option value="User Login">User Login</option>
          <option value="Payment Receipt">Payment Receipt</option>
          <option value="Sales Invoice Created">Sales Invoice Created</option>
          <option value="Track Edits">Track Edits</option>
          <option value="Price Updated">Price Updated</option>
          <option value="Discount Applied">Discount Applied</option>
          <option value="Product Created">Product Created</option>
          <option value="Customer Created">Customer Created</option>
          <option value="Device Updated">Device Updated</option>
          {activityTypes.filter(t => ![
            'User Login', 'Payment Receipt', 'Sales Invoice Created', 
            'Track Edits', 'Price Updated', 'Discount Applied', 
            'Product Created', 'Customer Created', 'Device Updated'
          ].includes(t)).map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Users Dropdown */}
        <select 
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 rounded-none px-2 py-0.5 outline-none w-40 h-7 font-mono cursor-pointer"
        >
          <option value="all">All Users</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        {/* Search Input Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md ml-auto">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search activities, details, or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-10 py-0.5 bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-none text-xs outline-none focus:border-neutral-400 h-7 font-mono"
          />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer">
            <Search size={14} className="text-neutral-500 dark:text-neutral-400" />
          </button>
        </form>
      </div>

      {/* Table Content matching InvoiceList table */}
      <div className="flex-1 overflow-auto bg-white dark:bg-black border border-neutral-200 dark:border-neutral-850">
        <table className="w-full text-left border-collapse bg-white dark:bg-black text-[15px]">
          <thead>
            <tr className="bg-neutral-100 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-850 text-[15px] font-semibold text-black dark:text-white">
              <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 w-24">Date</th>
              <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 w-24">Time</th>
              <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 w-44">User</th>
              <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 w-56">Activity</th>
              <th className="px-1.5 py-0.5">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-neutral-500 italic text-sm">
                  Loading activity logs... Please wait
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-neutral-500 italic text-sm">
                  No activity logs found for this period.
                </td>
              </tr>
            ) : (
              logs.map((item, idx) => (
                <tr 
                  key={item.log_id || idx}
                  className="bg-white dark:bg-black hover:bg-neutral-200/70 dark:hover:bg-neutral-800 transition-colors text-[15px]"
                >
                  <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                    {formatDate(item.created_at)}
                  </td>
                  <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                    {formatTime(item.created_at)}
                  </td>
                  <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                    {item.user_name || 'System'}
                  </td>
                  <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-neutral-900 dark:text-neutral-100 font-semibold whitespace-nowrap">
                    {item.activity_type}
                  </td>
                  <td className="px-1.5 py-0.5 text-neutral-900 dark:text-neutral-100 font-normal">
                    {renderDetailsCell(item)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Pagination matching InvoiceList */}
      <div className="p-2 bg-white dark:bg-black border-t border-neutral-200 dark:border-neutral-850 flex justify-between items-center text-xs text-neutral-600 dark:text-neutral-400 shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-normal">
            {logs.length > 0 ? (page - 1) * limit + 1 : 0}-{Math.min(page * limit, total)} of {total} records
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={() => { if (page > 1) { setPage(page - 1); fetchLogs(page - 1); } }}
            disabled={page <= 1 || loading}
            className="px-2 py-0.5 border border-neutral-200 dark:border-neutral-800 rounded-none bg-neutral-200 dark:bg-neutral-900 hover:bg-neutral-300 dark:hover:bg-neutral-850 text-neutral-850 dark:text-neutral-200 disabled:opacity-40 cursor-pointer"
          >
            «
          </button>
          <span className="px-3 py-0.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black rounded-none font-normal">
            {page} / {totalPages}
          </span>
          <button 
            onClick={() => { if (page < totalPages) { setPage(page + 1); fetchLogs(page + 1); } }}
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
