import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
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
  };

  return (
    <div className="bg-white border border-[#d8d8d8] rounded overflow-hidden" style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <div className="flex items-center justify-between bg-[#e5e7eb] px-4 py-3">
        <div 
          className="flex items-center gap-2 text-[#333333] font-medium cursor-pointer select-none"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          <span>Activity Log</span>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-[#d8d8d8] rounded px-3 py-1.5 bg-white text-sm text-[#333333] outline-none"
          >
            <option value="All">All Activities</option>
            <option value="Notes">Notes</option>
            <option value="Signatures">Signatures</option>
          </select>
          <button 
            type="button"
            onClick={() => alert('Digital signature feature ready for hardware pad / touch screen.')}
            className="border border-[#d8d8d8] rounded px-3 py-1.5 bg-white text-sm text-[#333333] hover:bg-gray-50 cursor-pointer"
          >
            Add Digital Signature
          </button>
          <button 
            type="button"
            onClick={() => setShowNoteInput(!showNoteInput)}
            className="border border-[#d8d8d8] rounded px-3 py-1.5 bg-white text-sm text-[#333333] hover:bg-gray-50 cursor-pointer"
          >
            Add New Note
          </button>
        </div>
      </div>

      {showNoteInput && (
        <div className="p-3 border-b border-[#d8d8d8] bg-gray-50 flex gap-2">
          <input
            type="text"
            placeholder="Type your note here..."
            className="flex-1 border border-[#d8d8d8] rounded px-3 py-1.5 text-sm outline-none text-[#333333] bg-white"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
            autoFocus
          />
          <button
            type="button"
            onClick={handleAddNote}
            className="px-3 py-1.5 bg-[#e5e7eb] hover:bg-[#d8d8d8] text-[#333333] text-sm rounded border border-[#d8d8d8] font-medium cursor-pointer"
          >
            Save Note
          </button>
        </div>
      )}

      {!isCollapsed && (
        <div id="activity-body" className="text-sm text-[#757575] max-h-48 overflow-y-auto p-3 custom-scrollbar divide-y divide-[#f0f0f0]">
          {customNotes.map((note) => (
            <div key={note.id} className="py-1.5 flex justify-between items-start text-xs">
              <span className="text-[#333333] font-medium"><strong className="text-blue-600">[Note]</strong> {note.text}</span>
              <span className="text-[#757575] font-mono ml-2 shrink-0">{note.time}</span>
            </div>
          ))}
          {filteredActivities.length === 0 && customNotes.length === 0 ? (
            <div className="text-center italic py-3 text-xs text-[#757575]">
              No activity logged yet.
            </div>
          ) : (
            filteredActivities.map((act) => (
              <div key={act.id} className="py-1.5 flex justify-between items-start text-xs">
                <span className="text-[#333333]">{act.details || act.action}</span>
                <span className="text-[#757575] font-mono ml-2 shrink-0">{act.time}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

