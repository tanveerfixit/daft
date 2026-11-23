import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  Sparkles, 
  Settings as SettingsIcon, 
  Info, 
  CheckCheck, 
  ChevronRight,
  Megaphone,
  Truck,
  CheckCircle,
  Loader
} from 'lucide-react';

export interface IncomingTransferNotif {
  id: number;
  product_name: string;
  sku_code?: string;
  imei?: string;
  imei_serial?: string;
  quantity: number;
  from_branch_name?: string;
  from_business_name?: string;
  initiated_by_name?: string;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  category: 'feature' | 'setting' | 'system' | 'announcement';
  date: string;
  version?: string;
  summary: string;
  details?: string[];
  link?: string;
}

import { useAuth } from '../context/AuthContext';

export default function NotificationBell() {
  const { currentUser, token } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [incomingTransfers, setIncomingTransfers] = useState<IncomingTransferNotif[]>([]);
  const [acceptingTransferId, setAcceptingTransferId] = useState<number | null>(null);
  const [transferError, setTransferError] = useState('');
  const [readIds, setReadIds] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Storage key helper for reliable per-user read persistence
  const getUserReadStorageKey = (u?: any) => {
    if (u?.id) return `epos_read_announcements_u_${u.id}`;
    if (u?.email) return `epos_read_announcements_u_${encodeURIComponent(u.email)}`;
    return 'epos_read_announcements_global';
  };

  // Helper to load read IDs from local storage (merging user-specific & legacy keys)
  const getStoredReadIds = (): string[] => {
    try {
      const idsSet = new Set<string>();
      const userKey = getUserReadStorageKey(currentUser);
      
      const rawUser = localStorage.getItem(userKey);
      if (rawUser) {
        try {
          const parsed = JSON.parse(rawUser);
          if (Array.isArray(parsed)) parsed.forEach(id => idsSet.add(String(id)));
        } catch {}
      }

      const rawGlobal = localStorage.getItem('epos_read_announcements');
      if (rawGlobal) {
        try {
          const parsed = JSON.parse(rawGlobal);
          if (Array.isArray(parsed)) parsed.forEach(id => idsSet.add(String(id)));
        } catch {}
      }

      return Array.from(idsSet);
    } catch {
      return [];
    }
  };

  // Helper to save read IDs locally
  const saveStoredReadIds = (ids: string[]) => {
    try {
      const userKey = getUserReadStorageKey(currentUser);
      const serialized = JSON.stringify(ids);
      localStorage.setItem(userKey, serialized);
      localStorage.setItem('epos_read_announcements', serialized);
    } catch (e) {
      console.error('Failed to save read announcements to localStorage', e);
    }
  };

  // Load announcements & read state from localStorage, API, and DB
  useEffect(() => {
    const localReadIds = getStoredReadIds();
    setReadIds(localReadIds);

    const authToken = token || sessionStorage.getItem('epos_token');
    const authHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) {
      authHeaders['Authorization'] = `Bearer ${authToken}`;
    }

    // 1. Fetch latest announcements from API
    fetch('/api/public/announcements')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAnnouncements(data);
        } else {
          setAnnouncements([]);
        }
      })
      .catch(() => {
        setAnnouncements([]);
      });

    // 2. Fetch server-side read IDs if authenticated and merge
    if (authToken) {
      fetch('/api/public/announcements/read-ids', { headers: authHeaders })
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data.readIds) && data.readIds.length > 0) {
            setReadIds(prev => {
              const merged = Array.from(new Set([...prev, ...data.readIds.map(String)]));
              saveStoredReadIds(merged);
              return merged;
            });
          }
        })
        .catch(() => {});
    }

    // Listen to storage updates from other tabs
    const handleStorage = (e: StorageEvent) => {
      const userKey = getUserReadStorageKey(currentUser);
      if (e.key === userKey || e.key === 'epos_read_announcements') {
        setReadIds(getStoredReadIds());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [currentUser?.id, token]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchIncomingTransfers = async () => {
    const authToken = token || sessionStorage.getItem('epos_token');
    if (!authToken || !currentUser?.business_id) {
      setIncomingTransfers([]);
      return;
    }
    try {
      const res = await fetch('/api/transfers/incoming-pending', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIncomingTransfers(Array.isArray(data) ? data : []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchIncomingTransfers();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchIncomingTransfers();
    }, 45000);
    const handleRefresh = () => fetchIncomingTransfers();
    window.addEventListener('focus', handleRefresh);
    window.addEventListener('epos:transfers-updated', handleRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener('epos:transfers-updated', handleRefresh);
    };
  }, [currentUser?.id, currentUser?.business_id, currentUser?.branch_id, token]);

  const handleAcceptTransfer = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (acceptingTransferId !== null) return;
    const authToken = token || sessionStorage.getItem('epos_token');
    if (!authToken) return;
    setAcceptingTransferId(id);
    setTransferError('');
    try {
      const res = await fetch(`/api/transfers/${id}/complete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to accept transfer');
      setIncomingTransfers(prev => prev.filter(t => t.id !== id));
      window.dispatchEvent(new Event('epos:transfers-updated'));
    } catch (err: any) {
      setTransferError(err.message || 'Failed to accept transfer');
    } finally {
      setAcceptingTransferId(null);
    }
  };

  const unreadCount = announcements.filter(a => !readIds.includes(String(a.id))).length;
  const totalBadgeCount = unreadCount + incomingTransfers.length;

  const markAllAsRead = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const allIds = announcements.map(a => String(a.id));
    const merged = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(merged);
    saveStoredReadIds(merged);

    // Sync with server DB if authenticated
    const authToken = token || sessionStorage.getItem('epos_token');
    if (authToken && allIds.length > 0) {
      fetch('/api/public/announcements/mark-all-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ ids: allIds })
      }).catch(() => {});
    }
  };

  const markSingleAsRead = (id: string | number) => {
    const strId = String(id);
    if (!readIds.includes(strId)) {
      const updated = [...readIds, strId];
      setReadIds(updated);
      saveStoredReadIds(updated);

      // Sync with server DB if authenticated
      const authToken = token || sessionStorage.getItem('epos_token');
      if (authToken) {
        fetch('/api/public/announcements/mark-read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ ids: [strId] })
        }).catch(() => {});
      }
    }
  };

  const toggleExpand = (id: string) => {
    markSingleAsRead(id);
    setExpandedId(prev => prev === id ? null : id);
  };

  const filteredAnnouncements = selectedCategory === 'all' 
    ? announcements 
    : announcements.filter(a => a.category === selectedCategory);

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'feature':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <Sparkles size={11} /> Feature
          </span>
        );
      case 'setting':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <SettingsIcon size={11} /> Setting
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <Info size={11} /> Update
          </span>
        );
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors cursor-pointer flex items-center justify-center"
        title="What's New & System Updates"
      >
        <Bell size={22} />
        {totalBadgeCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-600 rounded-full ring-2 ring-white dark:ring-neutral-900 animate-in fade-in zoom-in-75 duration-200">
            {totalBadgeCount}
          </span>
        )}
      </button>

      {/* Flyout Panel */}
      {isOpen && (
        <div className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto mt-2 sm:w-96 max-w-[calc(100vw-16px)] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg z-[99999] overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-sans text-neutral-900 dark:text-neutral-100">
          
          {/* Header */}
          <div className="px-4 py-3 bg-[var(--bg-header)] dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-neutral-900 dark:text-white">Notifications</span>
              {totalBadgeCount > 0 && (
                <span className="px-1.5 py-0.2 bg-red-600 text-white text-[10px] font-bold rounded-full">
                  {totalBadgeCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <CheckCheck size={13} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Incoming Transfers Section */}
          {incomingTransfers.length > 0 && (
            <div className="border-b border-neutral-200 dark:border-neutral-800 bg-blue-50/40 dark:bg-blue-950/20">
              <div className="px-3.5 py-2 border-b border-blue-200/60 dark:border-blue-900/50 flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                  <Truck size={13} />
                  Incoming Transfers ({incomingTransfers.length})
                </span>
              </div>
              {transferError && (
                <div className="px-3.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 border-b border-rose-500/20">
                  {transferError}
                </div>
              )}
              <div className="max-h-56 overflow-y-auto divide-y divide-blue-100 dark:divide-blue-900/40">
                {incomingTransfers.map(t => (
                  <div key={t.id} className="px-3.5 py-2.5 flex items-center justify-between gap-2.5 text-xs">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        {t.product_name}
                      </div>
                      <div className="text-neutral-600 dark:text-neutral-400 flex flex-wrap gap-x-2">
                        {t.imei && <span className="font-mono text-blue-600 dark:text-blue-400">IMEI: {t.imei}</span>}
                        {!t.imei && t.imei_serial && <span className="font-mono text-purple-600 dark:text-purple-400">Serial: {t.imei_serial}</span>}
                        {!t.imei && !t.imei_serial && <span>Qty: {t.quantity || 1}</span>}
                        <span>From: {t.from_branch_name || t.from_business_name || 'Branch'}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={acceptingTransferId === t.id}
                      onClick={(e) => handleAcceptTransfer(e, t.id)}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1 shrink-0 cursor-pointer rounded"
                    >
                      {acceptingTransferId === t.id ? <Loader size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                      Accept
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category Filter Chips */}
          {announcements.length > 0 && (
            <div className="px-3 py-2 bg-neutral-50 dark:bg-neutral-850 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-1.5 overflow-x-auto text-xs">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                    : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedCategory('feature')}
                className={`px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                  selectedCategory === 'feature'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100'
                }`}
              >
                Features
              </button>
              <button
                onClick={() => setSelectedCategory('setting')}
                className={`px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                  selectedCategory === 'setting'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100'
                }`}
              >
                Settings
              </button>
            </div>
          )}

          {/* Announcements List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
            {announcements.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500 flex flex-col items-center justify-center gap-2">
                <Megaphone size={24} className="text-neutral-400 opacity-50" />
                <p className="font-medium text-neutral-600 dark:text-neutral-300">No new updates or announcements</p>
                <p className="text-[11px] text-neutral-400">You're all caught up with the latest system features.</p>
              </div>
            ) : filteredAnnouncements.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-500 italic">
                No updates in this category
              </div>
            ) : (
              filteredAnnouncements.map((item) => {
                const isRead = readIds.includes(String(item.id));
                const isExpanded = expandedId === item.id;

                return (
                  <div 
                    key={item.id}
                    onClick={() => toggleExpand(item.id)}
                    className={`p-3.5 transition-colors cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60 ${
                      !isRead ? 'bg-red-50/40 dark:bg-red-950/20' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1 flex-1">
                        <div className="flex items-center gap-2">
                          {getCategoryBadge(item.category)}
                          {item.version && (
                            <span className="text-[11px] font-mono text-neutral-500 font-medium">
                              {item.version}
                            </span>
                          )}
                          {!isRead && (
                            <span className="w-2 h-2 rounded-full bg-red-600" title="Unread" />
                          )}
                          <span className="text-[11px] text-neutral-400 dark:text-neutral-500 ml-auto">
                            {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-neutral-900 dark:text-white leading-snug mt-0.5">
                          {item.title}
                        </h4>

                        <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                          {item.summary}
                        </p>
                      </div>

                      <ChevronRight 
                        size={15} 
                        className={`text-neutral-400 mt-1 transition-transform shrink-0 ${
                          isExpanded ? 'rotate-90' : ''
                        }`} 
                      />
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && item.details && item.details.length > 0 && (
                      <div className="mt-2.5 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-700/60 animate-in fade-in duration-150 text-xs">
                        <ul className="space-y-1 list-disc list-inside text-neutral-600 dark:text-neutral-300 text-[11px]">
                          {item.details.map((detail, idx) => (
                            <li key={idx} className="leading-tight">{detail}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 text-center text-[11px] text-neutral-500">
            System is up to date · EPOS Platform
          </div>

        </div>
      )}
    </div>
  );
}
