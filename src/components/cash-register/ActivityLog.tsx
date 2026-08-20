import React, { useState } from 'react';
import { History, Tag, UserPlus, Package, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { Activity } from './types';

interface ActivityLogProps {
  activities: Activity[];
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ activities }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'sale': return <Tag size={12} className="text-emerald-600 dark:text-emerald-400" />;
      case 'customer': return <UserPlus size={12} className="text-blue-600 dark:text-blue-400" />;
      case 'stock': return <Package size={12} className="text-amber-600 dark:text-amber-400" />;
      default: return <Settings size={12} className="text-slate-500" />;
    }
  };

  const getActivityBg = (type: Activity['type']) => {
    switch (type) {
      case 'sale': return 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800';
      case 'customer': return 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800';
      case 'stock': return 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800';
      default: return 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden flex flex-col transition-all duration-300 ${isCollapsed ? 'h-[42px]' : 'h-[200px]'} font-sans`}>
      <div 
        className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-1.5">
          <History size={14} className="text-blue-600 dark:text-blue-400" />
          <h2 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider">Recent Activity</h2>
          {activities.length > 0 && (
            <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] px-1.5 py-0.2 rounded-full font-bold border border-blue-200 dark:border-blue-800">
              {activities.length}
            </span>
          )}
        </div>
        {isCollapsed ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronUp size={14} className="text-slate-400" />}
      </div>
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-1.5 space-y-1 custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800">
          {activities.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 italic text-xs">
              No recent activity
            </div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex gap-2 p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 border ${getActivityBg(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="min-w-0 font-sans">
                  <div className="flex items-center gap-2 font-sans">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate font-sans">{activity.action}</p>
                    <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap">{activity.time}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 truncate leading-tight mt-0.5 font-sans">{activity.details}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
