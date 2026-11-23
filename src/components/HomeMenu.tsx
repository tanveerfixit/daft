import React, { useEffect, useState } from 'react';
import { 
  FolderOpen, 
  Banknote, 
  Truck, 
  LineChart, 
  CalendarPlus, 
  Users, 
  Globe, 
  PieChart, 
  ArrowLeftRight, 
  Settings, 
  LayoutGrid
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HomeMenuProps {
  onNavigate: (view: any) => void;
}

const HomeMenu: React.FC<HomeMenuProps> = ({ onNavigate }) => {
  const { currentUser, token } = useAuth();
  const [incomingCount, setIncomingCount] = useState(0);

  const fetchIncoming = async () => {
    const authToken = token || sessionStorage.getItem('epos_token');
    if (!authToken || !currentUser?.business_id) return;
    try {
      const res = await fetch('/api/transfers/incoming-pending', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIncomingCount(Array.isArray(data) ? data.length : 0);
      }
    } catch {}
  };

  useEffect(() => {
    fetchIncoming();
    const onRefresh = () => fetchIncoming();
    window.addEventListener('focus', onRefresh);
    window.addEventListener('epos:transfers-updated', onRefresh);
    return () => {
      window.removeEventListener('focus', onRefresh);
      window.removeEventListener('epos:transfers-updated', onRefresh);
    };
  }, [currentUser?.id, currentUser?.business_id, currentUser?.branch_id, token]);
  const menuTiles = [
    { id: 'stock-take', label: 'Stock Take', icon: FolderOpen },
    { id: 'expenses', label: 'Expenses', icon: Banknote },
    { id: 'transfers', label: 'Inventory Transfer', icon: Truck },
    { id: 'dashboard', label: 'Dashboard', icon: LineChart },
    { id: 'end-of-day', label: 'End of Day', icon: Banknote },
    { id: 'appointment-calendar', label: 'Appointment Calendar', icon: CalendarPlus },
    { id: 'staff-employee', label: 'Staff Employee', icon: Users },
    { id: 'website', label: 'Website', icon: Globe },
    { id: 'sales-reports', label: 'Sales Reports', icon: PieChart },
    { id: 'repairs-reports', label: 'Repairs Reports', icon: PieChart },
    { id: 'inventory-reports', label: 'Inventory Reports', icon: PieChart },
    { id: 'activity-log', label: 'Activity Log', icon: ArrowLeftRight },
    { id: 'getting-started', label: 'Getting Started', icon: Settings },
    { id: 'manage-data', label: 'Manage Data', icon: Settings },
    { id: 'setup', label: 'Setup', icon: Settings },
    { id: 'integrations', label: 'Integrations', icon: LayoutGrid },
  ];

  return (
    <div 
      className="p-2 sm:p-4 bg-[var(--bg-app)] h-full overflow-auto transition-colors duration-300 select-none"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 2xl:grid-cols-14 gap-2 sm:gap-3 max-w-[1600px]">
        {menuTiles.map((tile) => (
          <button
            key={tile.id}
            onClick={() => onNavigate(tile.id)}
            className="relative flex flex-col items-center justify-center bg-[rgb(2,133,181)] text-white p-1.5 sm:p-2 rounded transition-all aspect-square group w-full border border-[rgb(2,133,181)] hover:-translate-y-1 hover:brightness-110 active:scale-[0.97] cursor-pointer"
          >
            {tile.id === 'transfers' && incomingCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[20px] h-[20px] px-1 bg-red-600 text-white text-[11px] font-bold rounded-full flex items-center justify-center">
                {incomingCount}
              </span>
            )}
            <div className="mb-1 group-hover:scale-110 transition-all duration-200 flex items-center justify-center shrink-0">
              <tile.icon className="w-6 h-6 sm:w-7 sm:h-7 md:w-[30px] md:h-[30px] text-white" strokeWidth={1.5} />
            </div>
            <span className="text-[11px] sm:text-[13px] md:text-[14px] font-normal text-center leading-tight px-0.5 mt-0.5 sm:mt-1 text-white break-words line-clamp-2">
              {tile.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HomeMenu;
