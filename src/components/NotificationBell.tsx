import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  Sparkles, 
  Settings as SettingsIcon, 
  Info, 
  CheckCheck, 
  ChevronRight, 
  ExternalLink 
} from 'lucide-react';
import initialAnnouncements from '../data/announcements.json';

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

export default function NotificationBell() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load announcements & read state from localStorage and API
  useEffect(() => {
    try {
      const storedRead = localStorage.getItem('epos_read_announcements');
      if (storedRead) {
        setReadIds(JSON.parse(storedRead));
      }
    } catch (e) {
      console.error('Failed to parse read announcements from localStorage', e);
    }
    
    // Fetch latest announcements from API with fallback to bundled data
    fetch('/api/public/announcements')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setAnnouncements(data);
        } else {
          setAnnouncements(initialAnnouncements as Announcement[]);
        }
      })
      .catch(() => {
        setAnnouncements(initialAnnouncements as Announcement[]);
      });
  }, []);

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

  const unreadCount = announcements.filter(a => !readIds.includes(a.id)).length;

  const markAllAsRead = () => {
    const allIds = announcements.map(a => a.id);
    setReadIds(allIds);
    try {
      localStorage.setItem('epos_read_announcements', JSON.stringify(allIds));
    } catch (e) {
      console.error('Failed to save read announcements to localStorage', e);
    }
  };

  const markSingleAsRead = (id: string) => {
    if (!readIds.includes(id)) {
      const updated = [...readIds, id];
      setReadIds(updated);
      try {
        localStorage.setItem('epos_read_announcements', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save read announcements to localStorage', e);
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
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-600 rounded-full shadow-xs ring-2 ring-white dark:ring-neutral-900">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Flyout Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-2xl z-[99999] overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-sans text-neutral-900 dark:text-neutral-100">
          
          {/* Header */}
          <div className="px-4 py-3 bg-[var(--bg-header)] dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-neutral-900 dark:text-white">What's New</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 bg-red-600 text-white text-[10px] font-bold rounded-full">
                  {unreadCount} new
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

          {/* Category Filter Chips */}
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
                  ? 'bg-red-600 text-white'
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

          {/* Announcements List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
            {filteredAnnouncements.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-500 italic">
                No updates in this category
              </div>
            ) : (
              filteredAnnouncements.map((item) => {
                const isRead = readIds.includes(item.id);
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
