import React from 'react';
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

interface HomeMenuProps {
  onNavigate: (view: any) => void;
}

const HomeMenu: React.FC<HomeMenuProps> = ({ onNavigate }) => {
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
            className="flex flex-col items-center justify-center bg-[rgb(2,133,181)] text-white p-1.5 sm:p-2 rounded shadow-sm sm:shadow-md transition-all aspect-square group w-full border border-[rgb(2,133,181)] hover:-translate-y-1 hover:brightness-110 active:scale-[0.97] cursor-pointer"
          >
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
