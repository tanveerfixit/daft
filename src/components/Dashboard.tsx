import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Wrench, Users, Calendar, Search, ArrowRight, BarChart3, Award, Target, RefreshCw } from 'lucide-react';
import SalesTrendChart from './dashboard/SalesTrendChart';
import PeakTradingHoursChart from './dashboard/PeakTradingHoursChart';
import ExecutiveKpiStrip from './dashboard/ExecutiveKpiStrip';
import ProfitDriversTable from './dashboard/ProfitDriversTable';
import GrowthLeversCard from './dashboard/GrowthLeversCard';

export default function Dashboard({ isActive }: { isActive?: boolean }) {
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [timeframe, setTimeframe] = useState<'today' | 'yesterday' | 'weekly' | 'last_weekly' | 'monthly' | 'last_monthly' | 'custom'>('today');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    sales: { total: 0, count: 0 },
    repairs: { open: 0, added: 0, invoiced: 0, fixRate: 100 },
    customers: { added: 0, purchased: 0 },
    financials: {
      grossRevenue: 0,
      cogs: 0,
      grossProfit: 0,
      marginPercent: 0,
      aov: 0,
      taxTotal: 0
    },
    topProfitDrivers: [] as any[],
    growthLevers: {
      attachmentRate: 0,
      repairRevenue: 0,
      retailRevenue: 0,
      repairPercent: 50,
      retailPercent: 50,
      repeatCustomerRate: 0,
      reorderAlerts: [] as any[]
    },
    payments: [] as any[],
    categories: [] as any[],
    dailyTrend: [] as any[],
    hourlyTrend: [] as any[]
  });

  const handleTimeframeChange = (tf: 'today' | 'yesterday' | 'weekly' | 'last_weekly' | 'monthly' | 'last_monthly' | 'custom') => {
    setTimeframe(tf);
    if (tf === 'custom') return;
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

  const isSingleDay = startDate === endDate;

  // Process data for trend chart
  const trendDataPoints = useMemo(() => {
    if (isSingleDay) {
      return (data.hourlyTrend || [])
        .filter(h => h.hour >= 8 && h.hour <= 21)
        .map(h => ({
          label: h.label.replace(' ', ''),
          fullDate: `${formatDateDisplay(startDate)} @ ${h.label}`,
          total: Number(h.total || 0),
          count: Number(h.count || 0)
        }));
    }

    return (data.dailyTrend || []).map(d => {
      const parts = d.date.split('-');
      const dObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const dayName = dObj.toLocaleDateString('en-IE', { weekday: 'short', day: '2-digit', month: 'short' });
      return {
        label: `${parts[2]}/${parts[1]}`,
        fullDate: dayName,
        total: Number(d.total || 0),
        count: Number(d.count || 0)
      };
    });
  }, [isSingleDay, data.dailyTrend, data.hourlyTrend, startDate]);

  // Filter to show ONLY categories with sales in the selected duration
  const categoriesWithSales = (data.categories || []).filter(cat => cat.qtySold > 0);

  return (
    <div 
      className="p-3 sm:p-4 space-y-4 bg-[var(--bg-app)] h-full overflow-auto font-sans text-neutral-800 dark:text-neutral-200 transition-colors duration-300"
      style={{ fontSize: '14px' }}
    >
      
      {/* Header & Filter Controls (Direct on page, no background card wrapper) */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 pt-1 pb-1">
        
        {/* Left: Title + Live Status */}
        <div className="flex items-center gap-2.5">
          <h2 className="font-bold text-neutral-900 dark:text-white text-xl tracking-tight" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
            Dashboard
          </h2>
          {loading && (
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
          )}
        </div>

        {/* Right: Controls with clear, visible native date pickers and readable fonts */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Timeframe Dropdown */}
          <select
            value={timeframe}
            onChange={(e) => handleTimeframeChange(e.target.value as any)}
            className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-850 dark:text-neutral-100 text-sm font-semibold rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="weekly">This Week (Mon-Sun)</option>
            <option value="last_weekly">Last Week (Mon-Sun)</option>
            <option value="monthly">This Month</option>
            <option value="last_monthly">Last Month</option>
            <option value="custom">Custom Date Range</option>
          </select>

          {/* Visible, Reliable Date Range Inputs */}
          <div className="flex items-center gap-1.5">
            {/* Start Date */}
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setTimeframe('custom');
              }}
              className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-sm font-medium font-mono rounded px-2.5 py-1.5 outline-none focus:border-blue-500 cursor-pointer"
            />

            <span className="text-neutral-400 text-xs font-bold">to</span>

            {/* End Date */}
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setTimeframe('custom');
              }}
              className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-sm font-medium font-mono rounded px-2.5 py-1.5 outline-none focus:border-blue-500 cursor-pointer"
            />

            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchDashboardStats}
              title="Refresh Analytics"
              className="px-2.5 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors cursor-pointer flex items-center justify-center"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-blue-600' : ''} />
            </button>
          </div>

        </div>

      </div>

      {/* SECTION 2: Executive CFO & Financial Performance Strip */}
      <ExecutiveKpiStrip
        salesCount={data.sales.count}
        financials={data.financials}
        repairs={data.repairs}
      />

      {/* SECTION 3: Interactive Visual Analytics Charts (2-column responsive grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1600px]">
        {/* Sales Trend Progression */}
        <SalesTrendChart
          data={trendDataPoints}
          title={isSingleDay ? `Hourly Sales Trend (${formatDateDisplay(startDate)})` : `Daily Sales Progression (${formatDateDisplay(startDate)} → ${formatDateDisplay(endDate)})`}
          isSingleDay={isSingleDay}
        />

        {/* Peak Trading Rush Hours */}
        <PeakTradingHoursChart
          data={data.hourlyTrend || []}
          title={isSingleDay ? `Hourly Activity (${formatDateDisplay(startDate)})` : `Peak Trading Rush Hours`}
        />
      </div>

      {/* SECTION 4: Marketing & Catalog Growth Engine (2-column responsive grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1600px]">
        {/* Top Profit Drivers ("Money Makers") */}
        <ProfitDriversTable
          drivers={data.topProfitDrivers || []}
        />

        {/* Growth & Marketing Levers */}
        <GrowthLeversCard
          growthLevers={data.growthLevers}
        />
      </div>

      {/* SECTION 5: Payments Summary */}
      <div className="space-y-2 max-w-[1600px]">
        <h3 className="text-base font-bold text-blue-600 dark:text-blue-400">Payments</h3>
        
        <div className="bg-white dark:bg-neutral-900 rounded border border-neutral-300 dark:border-neutral-800 overflow-hidden">
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

      {/* SECTION 6: Category Reporting */}
      <div className="space-y-2 max-w-[1600px] flex flex-col">
        <h3 className="text-base font-bold text-blue-600 dark:text-blue-400">Categories</h3>
        
        <div className="bg-white dark:bg-neutral-900 rounded border border-neutral-300 dark:border-neutral-800 overflow-hidden flex flex-col">
          {/* Scrollable container with fixed headers */}
          <div className="overflow-auto max-h-[350px]">
            <table className="w-full text-left border-collapse relative">
              <thead className="sticky top-0 z-10 bg-neutral-100 dark:bg-neutral-850">
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
