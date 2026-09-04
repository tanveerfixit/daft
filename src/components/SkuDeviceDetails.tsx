import { useState, useEffect } from 'react';
import { ArrowLeft, Search, Filter } from 'lucide-react';

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
  const [devices, setDevices] = useState<DeviceDetail[]>([]);
  const [productName, setProductName] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Fetch SKU info to get product name
    fetch(`/api/products/${skuId}`)
      .then(res => res.json())
      .then(data => {
        setProductName(data.product_name || data.name);
      });

    // Fetch all devices for this SKU
    fetch(`/api/products/${skuId}/devices`)
      .then(res => res.json())
      .then(data => {
        setDevices(data);
        setLoading(false);
      });
  }, [skuId]);

  const filteredDevices = Array.isArray(devices) ? devices.filter(d => {
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchesSearch = d.imei.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  }) : [];

  return (
    <div className="flex flex-col h-full bg-[var(--bg-app)]">
      {/* Header */}
      <div className="p-4 bg-[var(--bg-card)] border-b border-[var(--border-base)] flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-[var(--bg-hover)] rounded-full transition-colors text-[var(--text-muted)]"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="font-medium text-[var(--text-main)]" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '22px' }}>{productName}</h2>
          <p className="text-xs text-[var(--text-muted-more)] uppercase tracking-wider font-bold">Device History & Inventory</p>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 bg-[var(--bg-card)] border-b border-[var(--border-base)] flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-[var(--text-muted-more)]" />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[var(--bg-input)] border border-[var(--border-header)] rounded px-3 py-1.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] w-48"
          >
            <option value="all">All Devices</option>
            <option value="in_stock">Available (In Stock)</option>
            <option value="sold">Sold</option>
            <option value="repair">In Repair</option>
            <option value="returned">Returned</option>
          </select>
        </div>

        <div className="relative flex-1 max-w-md ml-auto flex">
          <input
            type="text"
            placeholder="Search IMEI in this list..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-10 py-1.5 bg-[var(--bg-input)] border border-[var(--border-header)] rounded-l text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
          />
          <button className="px-3 bg-[var(--bg-accent-subtle)] border border-l-0 border-[var(--border-header)] rounded-r hover:bg-[var(--bg-hover)]">
            <Search size={16} className="text-[var(--text-muted)]" />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-primary)]"></div>
          </div>
        ) : (
          <div className="bg-[var(--bg-card)] border border-[var(--border-header)] rounded shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                <tr className="bg-[var(--bg-header)] dark:bg-neutral-800 border-b border-neutral-300 dark:border-neutral-700 text-[14px] font-semibold text-black dark:text-white text-center">
                  <th className="px-2 py-1.5 border-r border-neutral-300 dark:border-neutral-700 text-center">IMEI Number</th>
                  <th className="px-2 py-1.5 border-r border-neutral-300 dark:border-neutral-700 text-center">Color</th>
                  <th className="px-2 py-1.5 border-r border-neutral-300 dark:border-neutral-700 text-center">GB</th>
                  <th className="px-2 py-1.5 border-r border-neutral-300 dark:border-neutral-700 text-center">Condition</th>
                  <th className="px-2 py-1.5 border-r border-neutral-300 dark:border-neutral-700 text-center">Status</th>
                  <th className="px-2 py-1.5 border-r border-neutral-300 dark:border-neutral-700 text-center">Branch</th>
                  <th className="px-2 py-1.5 border-r border-neutral-300 dark:border-neutral-700 text-center whitespace-nowrap min-w-[110px]">Added By</th>
                  <th className="px-2 py-1.5 border-r border-neutral-300 dark:border-neutral-700 text-center">Date Added</th>
                  <th className="px-2 py-1.5 text-center">Invoice #</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-[var(--text-muted-more)] italic">
                      No devices found matching the filter.
                    </td>
                  </tr>
                ) : (
                  filteredDevices.map((device, idx) => (
                    <tr key={device.id} className={`border-b border-[var(--border-base)] text-sm hover:bg-[var(--bg-hover)] transition-colors ${idx % 2 === 1 ? 'bg-[var(--bg-zebra)]' : ''}`}>
                      <td className="px-4 py-3 border-r border-[var(--border-base)] font-mono text-[var(--text-main)] font-bold">{device.imei}</td>
                      <td className="px-4 py-3 border-r border-[var(--border-base)] text-center text-[var(--text-muted)]">{device.color || '-'}</td>
                      <td className="px-4 py-3 border-r border-[var(--border-base)] text-center text-[var(--text-muted)]">{device.gb || '-'}</td>
                      <td className="px-4 py-3 border-r border-[var(--border-base)] text-center text-[var(--text-muted)]">{device.condition || '-'}</td>
                      <td className="px-4 py-3 border-r border-[var(--border-base)] text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          device.status === 'in_stock' ? 'bg-[var(--brand-success)]/10 text-[var(--brand-success)]' :
                          device.status === 'sold' ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' :
                          'bg-[var(--brand-warning)]/10 text-[var(--brand-warning)]'
                        }`}>
                          {device.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-r border-[var(--border-base)] text-center text-xs text-[var(--text-muted)]">
                        {device.branch_name || '-'}
                      </td>
                      <td className="px-4 py-3 border-r border-[var(--border-base)] text-center text-xs text-[var(--text-muted)]">
                        {device.user_name || '-'}
                      </td>
                      <td className="px-4 py-3 border-r border-[var(--border-base)] text-[var(--text-muted-more)]">
                        {new Date(device.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center text-[var(--text-muted)] font-bold">
                        {device.invoice_number || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
