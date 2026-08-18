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
      default: return <Settings size={12} className="text-neutral-500" />;
    }
  };

  const getActivityBg = (type: Activity['type']) => {
    switch (type) {
      case 'sale': return 'bg-emerald-100 dark:bg-emerald-950/20';
      case 'customer': return 'bg-blue-100 dark:bg-blue-950/20';
      case 'stock': return 'bg-amber-100 dark:bg-amber-950/20';
      default: return 'bg-neutral-100 dark:bg-neutral-900';
    }
  };

  return (
    <div className={`bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-md shadow-xs overflow-hidden flex flex-col transition-all duration-300 ${isCollapsed ? 'h-[40px]' : 'h-[200px]'} font-mono`}>
      <div 
        className="px-4 py-1.5 border-b border-neutral-300 dark:border-neutral-800 bg-neutral-200 dark:bg-neutral-900 flex items-center justify-between cursor-pointer hover:bg-neutral-250 dark:hover:bg-neutral-850 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <History size={16} className="text-neutral-600 dark:text-neutral-400" />
          <h2 className="font-bold text-black dark:text-white text-[13px] uppercase tracking-wider">Recent Activity</h2>
          {activities.length > 0 && (
            <span className="bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 text-[10px] px-1.5 py-0.5 rounded-sm font-bold border border-neutral-300 dark:border-neutral-800">
              {activities.length}
            </span>
          )}
        </div>
        {isCollapsed ? <ChevronDown size={16} className="text-neutral-555" /> : <ChevronUp size={16} className="text-neutral-555" />}
      </div>
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5 custom-scrollbar">
          {activities.length === 0 ? (
            <div className="h-full flex items-center justify-center text-neutral-450 dark:text-neutral-500 text-xs italic">
              No recent activity
            </div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex gap-3 p-2 rounded-sm hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors group border-b border-neutral-200 dark:border-neutral-800 last:border-0">
                <div className={`mt-0.5 w-6 h-6 rounded-sm flex items-center justify-center shrink-0 border border-neutral-300 dark:border-neutral-800 ${getActivityBg(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="min-w-0 font-sans">
                  <div className="flex items-center gap-2 font-sans">
                    <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate font-sans">{activity.action}</p>
                    <span className="text-[10px] text-neutral-500 font-mono whitespace-nowrap">{activity.time}</span>
                  </div>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400 truncate leading-tight mt-0.5 font-sans">{activity.details}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
