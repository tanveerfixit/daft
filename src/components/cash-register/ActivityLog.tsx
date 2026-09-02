import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, FileSignature, StickyNote } from 'lucide-react';
import { Activity } from './types';

interface ActivityLogProps {
  activities: Activity[];
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ activities }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [filter, setFilter] = useState('All');
  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [customNotes, setCustomNotes] = useState<{ id: string; text: string; time: string }[]>([]);

  const filteredActivities = activities.filter((act) => {
    if (filter === 'Notes') return (act.type as string) === 'custom' || act.action.toLowerCase().includes('note');
    if (filter === 'Signatures') return act.action.toLowerCase().includes('signature');
    return true;
  });

  const totalCount = activities.length + customNotes.length;

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    setCustomNotes((prev) => [
      {
        id: String(Date.now()),
        text: noteText.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
      ...prev
    ]);
    setNoteText('');
    setShowNoteInput(false);
    if (isCollapsed) setIsCollapsed(false);
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-[#d8d8d8] dark:border-neutral-800 rounded shadow-xs overflow-hidden w-full h-fit self-start" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-[var(--bg-header)] dark:bg-neutral-800 px-3 py-2 border-b border-neutral-300 dark:border-neutral-700 gap-2 flex-wrap">
        <button 
          type="button"
          className="flex items-center gap-1.5 text-black dark:text-white font-semibold text-xs cursor-pointer select-none bg-transparent border-0 p-0 hover:opacity-80 transition-opacity"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" /> : <ChevronUp className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />}
          <span>Activity Log</span>
          {totalCount > 0 && (
            <span className="text-[10px] bg-white/70 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-mono px-1.5 py-0.2 rounded-full border border-neutral-300/60 dark:border-neutral-600">
              {totalCount}
            </span>
          )}
        </button>

        {/* Right Action Controls kept neatly inside the bar */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          <select 
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              if (isCollapsed) setIsCollapsed(false);
            }}
            className="border border-neutral-300 dark:border-neutral-700 rounded px-2 py-1 bg-white dark:bg-neutral-900 text-xs text-neutral-700 dark:text-neutral-200 outline-none cursor-pointer focus:border-blue-500"
          >
            <option value="All">All Activities</option>
            <option value="Notes">Notes</option>
            <option value="Signatures">Signatures</option>
          </select>
          <button 
            type="button"
            onClick={() => alert('Digital signature feature ready for hardware pad / touch screen.')}
            className="border border-neutral-300 dark:border-neutral-700 rounded px-2 py-1 bg-white dark:bg-neutral-900 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-1 cursor-pointer transition-colors"
            title="Add Digital Signature"
          >
            <FileSignature size={12} className="text-neutral-500" />
            <span className="hidden sm:inline">Signature</span>
          </button>
          <button 
            type="button"
            onClick={() => {
              setShowNoteInput(!showNoteInput);
              if (isCollapsed && !showNoteInput) setIsCollapsed(false);
            }}
            className="border border-neutral-300 dark:border-neutral-700 rounded px-2 py-1 bg-white dark:bg-neutral-900 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-1 cursor-pointer transition-colors"
            title="Add New Note"
          >
            <Plus size={12} className="text-neutral-500" />
            <span>Note</span>
          </button>
        </div>
      </div>

      {/* Note Input Box */}
      {showNoteInput && (
        <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 flex items-center gap-2">
          <input
            type="text"
            placeholder="Type your note here..."
            className="flex-1 border border-neutral-300 dark:border-neutral-700 rounded px-2.5 py-1 text-xs outline-none text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-950 focus:border-blue-500"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
            autoFocus
          />
          <button
            type="button"
            onClick={handleAddNote}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded font-medium cursor-pointer transition-colors shrink-0"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setShowNoteInput(false)}
            className="px-2 py-1 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Activities Content Body - fits content height */}
      {!isCollapsed && (
        <div id="activity-body" className="text-xs text-neutral-600 dark:text-neutral-300 max-h-48 overflow-y-auto p-2.5 custom-scrollbar divide-y divide-neutral-100 dark:divide-neutral-800/60">
          {customNotes.map((note) => (
            <div key={note.id} className="py-1.5 flex justify-between items-start text-xs">
              <span className="text-neutral-800 dark:text-neutral-200 font-medium">
                <strong className="text-blue-600 font-semibold">[Note]</strong> {note.text}
              </span>
              <span className="text-neutral-400 font-mono ml-2 shrink-0">{note.time}</span>
            </div>
          ))}
          {filteredActivities.length === 0 && customNotes.length === 0 ? (
            <div className="text-center italic py-2.5 text-xs text-neutral-400">
              No activity logged yet.
            </div>
          ) : (
            filteredActivities.map((act) => (
              <div key={act.id} className="py-1.5 flex justify-between items-start text-xs">
                <span className="text-neutral-800 dark:text-neutral-200">{act.details || act.action}</span>
                <span className="text-neutral-400 font-mono ml-2 shrink-0">{act.time}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

