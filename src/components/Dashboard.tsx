import { useState, useEffect } from 'react';
import { TrendingUp, Wrench, Users, Calendar, Search, ArrowRight } from 'lucide-react';

export default function Dashboard({ isActive }: { isActive?: boolean }) {
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [timeframe, setTimeframe] = useState<'today' | 'yesterday' | 'weekly' | 'last_weekly' | 'monthly' | 'last_monthly'>('today');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    sales: { total: 0, count: 0 },
    repairs: { open: 0, added: 0, invoiced: 0 },
    customers: { added: 0, purchased: 0 },
    payments: [] as any[],
    categories: [] as any[]
  });

  const handleTimeframeChange = (tf: 'today' | 'yesterday' | 'weekly' | 'last_weekly' | 'monthly' | 'last_monthly') => {
    setTimeframe(tf);
    const today = new Date();
    let startStr = today.toISOString().split('T')[0];
    let endStr = today.toISOString().split('T')[0];

    if (tf === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      startStr = yesterday.toISOString().split('T')[0];
      endStr = yesterday.toISOString().split('T')[0];
    } else if (tf === 'weekly') {
      // This week (Mon-Sun)
      const day = today.getDay();
      const diffToMon = day === 0 ? -6 : 1 - day;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diffToMon);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      
      startStr = monday.toISOString().split('T')[0];
      endStr = sunday.toISOString().split('T')[0];
    } else if (tf === 'last_weekly') {
      // Last Week (Mon-Sun)
      const monday = new Date();
      const day = monday.getDay();
      const diffToMon = day === 0 ? -6 : 1 - day;
      monday.setDate(monday.getDate() + diffToMon - 7);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      startStr = monday.toISOString().split('T')[0];
      endStr = sunday.toISOString().split('T')[0];
    } else if (tf === 'monthly') {
      // This Month
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      startStr = firstDay.toISOString().split('T')[0];
      endStr = lastDay.toISOString().split('T')[0];
    } else if (tf === 'last_monthly') {
      // Last Month
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      startStr = firstDay.toISOString().split('T')[0];
      endStr = lastDay.toISOString().split('T')[0];
    }

    setStartDate(startStr);
    setEndDate(endStr);
  };

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/dashboard-stats?startDate=${startDate}&endDate=${endDate}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [startDate, endDate]);

  useEffect(() => {
    if (isActive) {
      fetchDashboardStats();
    }
  }, [isActive]);

  const formatDateDisplay = (dateStr: string) => {
    return dateStr.split('-').reverse().join('-');
  };

  // Filter to show ONLY categories with sales in the selected duration
  const categoriesWithSales = data.categories.filter(cat => cat.qtySold > 0);

  return (
    <div 
      className="p-4 space-y-6 bg-[var(--bg-app)] h-full overflow-auto font-sans text-neutral-800 dark:text-neutral-200 transition-colors duration-300"
      style={{ fontSize: '15px' }} // Increased base fonts globally by ~2px
    >
      
      {/* Dashboard Title */}
      <h2 className="font-normal text-neutral-900 dark:text-white shrink-0" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '22px' }}>Dashboard</h2>

      {/* SECTION 1: Control Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-2 shrink-0">
        
        {/* Timeframe Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {(['today', 'yesterday', 'weekly', 'last_weekly', 'monthly', 'last_monthly'] as const).map((tf) => {
            const labels: Record<string, string> = {
              today: 'Today',
              yesterday: 'Yesterday',
              weekly: 'This week (Mon-Sun)',
              last_weekly: 'Last Week (Mon-Sun)',
              monthly: 'This Month',
              last_monthly: 'Last Month'
            };
            return (
              <button
                key={tf}
                type="button"
                onClick={() => handleTimeframeChange(tf)}
                className={`px-3 py-1.5 text-sm border rounded transition-colors font-medium cursor-pointer ${
                  timeframe === tf
                    ? 'bg-neutral-800 border-neutral-800 text-white dark:bg-white dark:border-white dark:text-neutral-900 font-bold'
                    : 'bg-white border-neutral-300 text-neutral-850 hover:bg-neutral-50 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-850'
                }`}
              >
                {labels[tf]}
              </button>
            );
          })}
        </div>

        {/* Date Selector input group */}
        <div className="flex items-center gap-1.5 shrink-0 self-end xl:self-auto">
          {loading && (
            <div className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin shrink-0 dark:border-neutral-700 dark:border-t-white" />
          )}

          <div className="flex items-center border border-neutral-300 rounded overflow-hidden bg-white dark:bg-neutral-900 dark:border-neutral-800 text-sm font-semibold">
            {/* Start Date Input */}
            <div className="relative px-3.5 py-2 flex items-center gap-1.5 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-850">
              <Calendar size={14} className="text-neutral-500 mr-1" />
              <span>{formatDateDisplay(startDate)}</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setTimeframe('' as any);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
              />
            </div>

            <div className="px-1.5 text-neutral-400">
              <ArrowRight size={12} />
            </div>

            {/* End Date Input */}
            <div className="relative px-3.5 py-2 flex items-center gap-1.5 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-850">
              <span>{formatDateDisplay(endDate)}</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setTimeframe('' as any);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
              />
            </div>

            {/* Action Search button block */}
            <button 
              type="button"
              onClick={fetchDashboardStats}
              className="bg-neutral-100 hover:bg-neutral-200 border-l border-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-750 dark:border-neutral-750 p-2.5 text-neutral-600 dark:text-neutral-300 flex items-center justify-center cursor-pointer"
            >
              <Search size={15} />
            </button>
          </div>
        </div>

      </div>

      {/* SECTION 2: 3-column responsive KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[1600px]">
        
        {/* Card 1: Sales */}
        <div className="bg-white dark:bg-neutral-900 rounded border border-neutral-300 dark:border-neutral-800 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-neutral-100 dark:bg-neutral-800 px-4 py-2.5 border-b border-neutral-300 dark:border-neutral-800 flex items-center gap-2">
            <TrendingUp size={18} className="text-neutral-700 dark:text-neutral-300" />
            <span className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">Sales</span>
          </div>
          <div className="p-5 space-y-2.5 flex-1 flex flex-col justify-center text-sm font-semibold">
            <div className="flex justify-between">
              <span className="text-neutral-500">Total:</span>
              <span className="text-neutral-900 dark:text-white font-mono text-base">{data.sales.count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Total Sales:</span>
              <span className="text-neutral-900 dark:text-white font-mono text-base">
                €{Number(data.sales.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Repairs */}
        <div className="bg-white dark:bg-neutral-900 rounded border border-neutral-300 dark:border-neutral-800 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-neutral-100 dark:bg-neutral-800 px-4 py-2.5 border-b border-neutral-300 dark:border-neutral-800 flex items-center gap-2">
            <Wrench size={18} className="text-neutral-700 dark:text-neutral-300" />
            <span className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">Repairs</span>
          </div>
          <div className="p-5 space-y-2.5 flex-1 flex flex-col justify-center text-sm font-semibold">
            <div className="flex justify-between">
              <span className="text-neutral-500">Open:</span>
              <span className="text-neutral-900 dark:text-white font-mono text-base">{data.repairs.open}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Added:</span>
              <span className="text-neutral-900 dark:text-white font-mono text-base">{data.repairs.added}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Invoiced:</span>
              <span className="text-neutral-900 dark:text-white font-mono text-base">{data.repairs.invoiced}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Customers */}
        <div className="bg-white dark:bg-neutral-900 rounded border border-neutral-300 dark:border-neutral-800 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-neutral-100 dark:bg-neutral-800 px-4 py-2.5 border-b border-neutral-300 dark:border-neutral-800 flex items-center gap-2">
            <Users size={18} className="text-neutral-700 dark:text-neutral-300" />
            <span className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">Customers</span>
          </div>
          <div className="p-5 space-y-2.5 flex-1 flex flex-col justify-center text-sm font-semibold">
            <div className="flex justify-between">
              <span className="text-neutral-500">Added:</span>
              <span className="text-neutral-900 dark:text-white font-mono text-base">{data.customers.added}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Purchased:</span>
              <span className="text-neutral-900 dark:text-white font-mono text-base">{data.customers.purchased}</span>
            </div>
          </div>
        </div>

      </div>

      {/* SECTION 3: Payments Summary */}
      <div className="space-y-2 max-w-[1600px]">
        <h3 className="text-base font-bold text-blue-600 dark:text-blue-400">Payments</h3>
        
        <div className="bg-white dark:bg-neutral-900 rounded border border-neutral-300 dark:border-neutral-800 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-300 dark:border-neutral-800 text-xs font-bold text-neutral-850 dark:text-neutral-200">
                <th className="px-4 py-2.5 w-2/3">Payment Type</th>
                <th className="px-4 py-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map((p, idx) => (
                <tr key={idx} className="border-b border-neutral-300 last:border-0 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-850 transition-colors text-sm font-semibold">
                  <td className="px-4 py-3 text-neutral-900 dark:text-white">
                    {p.payment_type || '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-900 dark:text-white font-mono">
                    €{Number(p.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {data.payments.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-10 text-center text-sm text-neutral-400 dark:text-neutral-500 italic">
                    No payment records in selected timeframe.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: Category Reporting */}
      <div className="space-y-2 max-w-[1600px] flex flex-col">
        <h3 className="text-base font-bold text-blue-600 dark:text-blue-400">Categories</h3>
        
        <div className="bg-white dark:bg-neutral-900 rounded border border-neutral-300 dark:border-neutral-800 shadow-sm overflow-hidden flex flex-col">
          {/* Scrollable container with fixed headers */}
          <div className="overflow-auto max-h-[350px]">
            <table className="w-full text-left border-collapse relative">
              <thead className="sticky top-0 z-10 bg-neutral-100 dark:bg-neutral-850 shadow-[0_1px_0_0_rgba(0,0,0,0.1)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                <tr className="text-xs font-bold text-neutral-850 dark:text-neutral-200">
                  <th className="px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 font-bold">Category Name</th>
                  <th className="px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 font-bold text-right">Qty Purchased</th>
                  <th className="px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 font-bold text-right">Total Cost</th>
                  <th className="px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 font-bold text-right">Qty Sold</th>
                  <th className="px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 font-bold text-right">Total Sales</th>
                </tr>
              </thead>
              <tbody>
                {categoriesWithSales.map((cat, idx) => (
                  <tr key={idx} className="border-b border-neutral-300 last:border-0 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-850 transition-colors text-sm font-semibold">
                    <td className="px-4 py-3 text-neutral-900 dark:text-white font-medium">
                      {cat.name}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-neutral-500 dark:text-neutral-400">
                      {cat.qtyPurchased}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-neutral-500 dark:text-neutral-400">
                      €{Number(cat.totalCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--brand-primary)]">
                      {cat.qtySold}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-neutral-900 dark:text-white">
                      €{Number(cat.totalSales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                {categoriesWithSales.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-16 text-center text-sm text-neutral-400 dark:text-neutral-500 italic">
                      No categories with sales in selected timeframe.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
    </div>
  );
}
