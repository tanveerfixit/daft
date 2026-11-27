import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Search, ExternalLink } from 'lucide-react';

interface DeviceDetail {
  id: number;
  imei: string;
  color?: string;
  gb?: string;
  condition?: string;
  status: string;
  created_at: string;
  invoice_number?: string;
  branch_name?: string;
  user_name?: string;
}

interface Props {
  skuId: number;
  onBack: () => void;
}

export default function SkuDeviceDetails({ skuId, onBack }: Props) {
  const navigate = useNavigate();
  const { branchSlug } = useParams<{ branchSlug?: string }>();
  const [devices, setDevices] = useState<DeviceDetail[]>([]);
  const [productName, setProductName] = useState('');
  const [skuCode, setSkuCode] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    // Fetch SKU info to get product name
    fetch(`/api/products/${skuId}`, { signal: controller.signal })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data) {
          setProductName(data.product_name || data.name || '');
          setSkuCode(data.sku_code || '');
        }
      })
      .catch(err => {
        if (err?.name !== 'AbortError') console.error('Failed to fetch product name:', err);
      });

    // Fetch all devices for this SKU
    fetch(`/api/products/${skuId}/devices`, { signal: controller.signal })
      .then(res => (res.ok ? res.json() : []))
      .then(data => {
        setDevices(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        if (err?.name !== 'AbortError') {
          console.error('Failed to fetch SKU devices:', err);
          setDevices([]);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [skuId]);

  const filteredDevices = Array.isArray(devices) ? devices.filter(d => {
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    const imeiStr = (d.imei || '').toLowerCase();
    const matchesSearch = !searchQuery.trim() || imeiStr.includes(searchQuery.trim().toLowerCase());
    return matchesStatus && matchesSearch;
  }) : [];

  const inStockCount = devices.filter(d => d.status === 'in_stock' || d.status === 'available').length;
  const soldCount = devices.filter(d => d.status === 'sold').length;

  const formatStatus = (status: string) => {
    const s = String(status || 'unknown').toLowerCase();
    if (s === 'in_stock' || s === 'available') return 'In Stock';
    if (s === 'sold') return 'Sold';
    if (s === 'in_transfer' || s === 'transfer') return 'In Transfer';
    if (s === 'repair') return 'In Repair';
    if (s === 'returned') return 'Returned';
    return s.replace(/_/g, ' ');
  };

  return (
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 text-sm p-3 md:p-5 select-none w-full overflow-auto font-sans">
      {/* Top Summary Header */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white leading-tight">
            {productName || 'SKU Devices'}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {skuCode && <span className="font-mono text-neutral-700 dark:text-neutral-300">{skuCode}</span>}
            {skuCode && <span className="text-neutral-300 dark:text-neutral-700">•</span>}
            <span><strong className="text-neutral-800 dark:text-neutral-200">{devices.length}</strong> Total</span>
            <span className="text-neutral-300 dark:text-neutral-700">•</span>
            <span><strong className="text-emerald-600 dark:text-emerald-400">{inStockCount}</strong> In Stock</span>
            <span className="text-neutral-300 dark:text-neutral-700">•</span>
            <span><strong className="text-neutral-800 dark:text-neutral-200">{soldCount}</strong> Sold</span>
          </div>
        </div>

        <button
          onClick={onBack}
          className="bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-600 font-medium py-1.5 px-3.5 rounded text-sm inline-flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] self-start sm:self-auto"
        >
          <ArrowLeft size={15} />
          <span>Back</span>
        </button>
      </div>

      {/* Main Devices Table Card */}
      <div className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md flex flex-col overflow-hidden">
        {/* Filters Bar */}
        <div className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap justify-between items-center gap-3 shrink-0">
          <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            Serialized Units
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search IMEI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 pl-8 pr-3 py-1.5 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:border-blue-500 w-44 sm:w-56"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm text-neutral-800 dark:text-neutral-200 outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="in_stock">In Stock</option>
              <option value="sold">Sold</option>
              <option value="transfer">In Transfer</option>
              <option value="repair">In Repair</option>
              <option value="returned">Returned</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-neutral-400 text-sm">
              Loading devices...
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-50/80 dark:bg-neutral-800/40 border-b border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  <th className="py-2.5 px-4">IMEI / Serial</th>
                  <th className="py-2.5 px-3">Specs</th>
                  <th className="py-2.5 px-3">Condition</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Branch</th>
                  <th className="py-2.5 px-3">Added By</th>
                  <th className="py-2.5 px-3">Date Added</th>
                  <th className="py-2.5 px-4">Invoice #</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/70">
                {filteredDevices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-neutral-400 text-sm">
                      No devices found matching the filter.
                    </td>
                  </tr>
                ) : (
                  filteredDevices.map((device) => (
                    <tr
                      key={device.id}
                      onClick={() => branchSlug && navigate(`/${branchSlug}/devices/${device.id}`)}
                      className={`hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors ${branchSlug ? 'cursor-pointer' : ''}`}
                    >
                      <td className="py-2.5 px-4 font-mono font-semibold text-neutral-900 dark:text-white whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <span>{device.imei}</span>
                          {branchSlug && <ExternalLink size={12} className="text-neutral-400" />}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
                        {[device.gb, device.color].filter(Boolean).join(' • ') || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
                        {device.condition || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                        {formatStatus(device.status)}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                        {device.branch_name || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                        {device.user_name || 'System'}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-500 dark:text-neutral-400 whitespace-nowrap tabular-nums">
                        {new Date(device.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-')}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                        {device.invoice_number || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-neutral-50/50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center text-xs text-neutral-500 dark:text-neutral-400 shrink-0">
          <span>
            {filteredDevices.length > 0 ? `Showing ${filteredDevices.length} of ${devices.length} device(s)` : '0 devices'}
          </span>
        </div>
      </div>
    </div>
  );
}
