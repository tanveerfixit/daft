import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Search, ArrowRight, CheckCircle, XCircle, Clock, Loader, History,
  Package, Building2, Smartphone, RefreshCw, Printer, AlertCircle,
  ShieldCheck, ArrowUpRight, ArrowDownLeft, Sparkles, Check, X
} from 'lucide-react';

interface Destination {
  branch_id: number;
  branch_name: string;
  business_id: number;
  business_name: string;
  business_city?: string;
}

const statusColors: Record<string, { bg: string; text: string; icon: any }> = {
  in_transit: { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-600 dark:text-amber-400', icon: Clock },
  completed: { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle },
  cancelled: { bg: 'bg-rose-500/10 border-rose-500/20', text: 'text-rose-600 dark:text-rose-400', icon: XCircle },
  pending: { bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-600 dark:text-blue-400', icon: Clock },
};

export default function BranchTransfer({ isActive = true }: { isActive?: boolean }) {
  const { token, currentUser } = useAuth();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [tab, setTab] = useState<'create' | 'list' | 'lookup'>('create');
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [toBranch, setToBranch] = useState('');

  // Fast Product / Device Search & Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // List Tab State
  const [transfers, setTransfers] = useState<any[]>([]);
  const [filterDirection, setFilterDirection] = useState<'all' | 'outgoing' | 'incoming' | 'in_transit' | 'completed'>('all');
  const [listSearch, setListSearch] = useState('');

  // Lookup Tab State
  const [imeiLookup, setImeiLookup] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Print Transfer Note
  const [printTransferData, setPrintTransferData] = useState<any>(null);

  useEffect(() => {
    loadDestinations();
    loadTransfers();
  }, []);

  useEffect(() => {
    if (isActive) {
      loadDestinations();
      loadTransfers();
    }
  }, [isActive]);

  useEffect(() => {
    const handleFocus = () => {
      if (isActive) {
        loadDestinations();
        loadTransfers();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isActive]);

  const loadDestinations = async () => {
    try {
      const res = await fetch('/api/transfers/destinations', { headers });
      if (res.ok) {
        setDestinations(await res.json());
      }
    } catch (e) {
      console.error('Failed to load destinations:', e);
    }
  };

  const loadTransfers = async () => {
    try {
      const res = await fetch('/api/transfers', { headers });
      if (res.ok) {
        setTransfers(await res.json());
      }
    } catch (e) {
      console.error('Failed to load transfers:', e);
    }
  };

  // Instant fast search by Product Name, IMEI, or Serial in current branch
  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/devices/search?q=${encodeURIComponent(q.trim())}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Search failed:', e);
    }
  };

  const handleSelectItem = (item: any) => {
    setSelectedItem(item);
    setSearchQuery('');
    setSearchResults([]);
    setQuantity(1);
  };

  const handleClearSelection = () => {
    setSelectedItem(null);
    setSearchQuery('');
    setSearchResults([]);
    setQuantity(1);
    setNotes('');
  };

  // Fast B2B Transfer Dispatch
  const handleDispatchTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toBranch) {
      setMsg({ text: 'Please select a recipient destination business & branch.', type: 'error' });
      return;
    }
    if (!selectedItem) {
      setMsg({ text: 'Please search and select a product or IMEI device to transfer.', type: 'error' });
      return;
    }

    setLoading(true);
    setMsg({ text: '', type: '' });

    try {
      const payload = {
        to_branch_id: Number(toBranch),
        device_id: selectedItem.id || null,
        sku_id: selectedItem.sku_id || null,
        product_name: selectedItem.product_name,
        sku_code: selectedItem.sku_code || undefined,
        imei: selectedItem.imei || undefined,
        serial_number: selectedItem.imei_serial || selectedItem.serial_number || undefined,
        quantity: Number(quantity) || 1,
        cost_price: selectedItem.cost_price,
        selling_price: selectedItem.selling_price,
        color: selectedItem.color,
        gb: selectedItem.gb,
        condition: selectedItem.condition,
        notes: notes.trim() || undefined,
      };

      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transfer failed');

      setMsg({
        text: `✓ Successfully transferred "${selectedItem.product_name}" (IMEI: ${selectedItem.imei || 'N/A'}, SKU: ${selectedItem.sku_code || 'N/A'}) to destination business!`,
        type: 'success'
      });

      handleClearSelection();
      setToBranch('');
      loadTransfers();
    } catch (err: any) {
      setMsg({ text: `✗ ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const completeTransfer = async (id: number) => {
    if (!confirm('Confirm receiving this transfer into your inventory? Product/SKU will be verified and added to your stock.')) return;
    try {
      const res = await fetch(`/api/transfers/${id}/complete`, { method: 'PUT', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete transfer');
      loadTransfers();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const cancelTransfer = async (id: number) => {
    if (!confirm('Cancel this transfer and restore stock back to your branch inventory?')) return;
    try {
      const res = await fetch(`/api/transfers/${id}/cancel`, { method: 'PUT', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel transfer');
      loadTransfers();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const doLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imeiLookup.trim()) return;
    setLookupLoading(true);
    setLookupResult(null);
    try {
      const res = await fetch(`/api/transfers/device/${encodeURIComponent(imeiLookup.trim())}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Device not found');
      setLookupResult(data);
    } catch (err: any) {
      setLookupResult({ error: err.message });
    } finally {
      setLookupLoading(false);
    }
  };

  const handlePrintManifest = (t: any) => {
    setPrintTransferData(t);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const isOutgoing = (t: any) => Number(t.from_business_id) === Number(currentUser?.business_id);
  const isIncoming = (t: any) => Number(t.to_business_id) === Number(currentUser?.business_id);

  const filteredTransfers = transfers.filter(t => {
    if (filterDirection === 'outgoing' && !isOutgoing(t)) return false;
    if (filterDirection === 'incoming' && !isIncoming(t)) return false;
    if (filterDirection === 'in_transit' && t.status !== 'in_transit') return false;
    if (filterDirection === 'completed' && t.status !== 'completed') return false;

    if (!listSearch.trim()) return true;
    const q = listSearch.toLowerCase();
    return (
      (t.product_name && t.product_name.toLowerCase().includes(q)) ||
      (t.sku_code && t.sku_code.toLowerCase().includes(q)) ||
      (t.imei && t.imei.toLowerCase().includes(q)) ||
      (t.imei_serial && t.imei_serial.toLowerCase().includes(q)) ||
      (t.from_branch_name && t.from_branch_name.toLowerCase().includes(q)) ||
      (t.to_branch_name && t.to_branch_name.toLowerCase().includes(q)) ||
      (t.from_business_name && t.from_business_name.toLowerCase().includes(q)) ||
      (t.to_business_name && t.to_business_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 font-mono text-sm px-2 py-2 select-none w-full" style={{ fontSize: '15px' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-black shrink-0 flex justify-between items-center px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-medium text-black dark:text-white">B2B & Branch Transfers</h2>
          <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded flex items-center gap-1">
            <ShieldCheck size={13} /> Strict Isolation
          </span>
        </div>
        <button
          onClick={() => { loadTransfers(); loadDestinations(); }}
          className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium py-1.5 px-4 rounded text-sm flex items-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 px-4 bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-850 shrink-0">
        {[
          { id: 'create', label: 'Fast Transfer', icon: ArrowUpRight },
          { id: 'list', label: `Transfer History (${transfers.length})`, icon: Package },
          { id: 'lookup', label: 'IMEI / Serial Lookup', icon: History },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id as any);
              if (t.id === 'list') loadTransfers();
            }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition duration-150 cursor-pointer ${
              tab === t.id
                ? 'border-[var(--brand-primary)] text-[var(--brand-primary)] bg-neutral-100 dark:bg-neutral-900/60'
                : 'border-transparent text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900'
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-auto p-4 font-sans bg-white dark:bg-black border border-neutral-200 dark:border-neutral-850">
        {/* TAB 1: FAST CLEAN TRANSFER */}
        {tab === 'create' && (
          <div className="max-w-2xl mx-auto space-y-5">
            {msg.text && (
              <div
                className={`px-4 py-3 text-sm border rounded-lg flex items-center justify-between shadow-sm ${
                  msg.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  {msg.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                  <span>{msg.text}</span>
                </div>
                <button onClick={() => setMsg({ text: '', type: '' })} className="text-xs opacity-70 hover:opacity-100">✕</button>
              </div>
            )}

            <form onSubmit={handleDispatchTransfer} className="space-y-5 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-850 p-6 rounded-lg shadow-sm">
              {/* CURRENT LOGGED-IN BRANCH (FIXED ORIGIN) */}
              <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-neutral-500 uppercase">Transfer From:</span>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">
                    {currentUser?.business_name ? `${currentUser.business_name} — ` : ''}{currentUser?.branch_name || 'Current Branch'}
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded font-semibold text-[11px]">
                  Logged-in Branch
                </span>
              </div>

              {/* STEP 1: DESTINATION BUSINESS & BRANCH (TRANSFER TO) */}
              <div>
                <label className="block text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Building2 size={15} className="text-[var(--brand-primary)]" />
                  1. Transfer To (Select Recipient Branch / Business) <span className="text-red-500">*</span>
                </label>
                <select
                  value={toBranch}
                  onChange={e => setToBranch(e.target.value)}
                  required
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-3.5 py-2 text-sm focus:outline-none focus:border-neutral-400 text-neutral-900 dark:text-neutral-100 font-semibold"
                >
                  <option value="">-- Choose Recipient Branch to Transfer To --</option>
                  {destinations
                    .filter(d => d.branch_id !== currentUser?.branch_id)
                    .map(d => (
                      <option key={`${d.business_id}-${d.branch_id}`} value={d.branch_id}>
                        {d.business_name} ➔ {d.branch_name} {d.business_city ? `(${d.business_city})` : ''}
                      </option>
                    ))}
                </select>
              </div>

              {/* STEP 2: SEARCH PRODUCT BY NAME OR IMEI */}
              <div className="relative">
                <label className="block text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Search size={15} className="text-[var(--brand-primary)]" />
                  2. Search Item to Transfer (From Current Stock) <span className="text-red-500">*</span>
                </label>
                
                {!selectedItem ? (
                  <>
                    <div className="relative">
                      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input
                        value={searchQuery}
                        onChange={e => handleSearch(e.target.value)}
                        placeholder="Type Product Name (e.g. iPhone, Samsung) or Scan IMEI..."
                        autoFocus
                        className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] text-[var(--text-main)] font-medium"
                      />
                    </div>

                    {/* Quick Search Dropdown Results */}
                    {searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-card)] border border-[var(--border-base)] rounded-xl shadow-xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-[var(--border-base)] z-30">
                        {searchResults.map(item => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectItem(item)}
                            className="w-full text-left px-4 py-3 hover:bg-[var(--bg-hover)] text-sm transition flex flex-col gap-1 group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[var(--text-main)] group-hover:text-[var(--brand-primary)]">
                                {item.product_name}
                              </span>
                              {item.imei ? (
                                <span className="text-xs font-mono px-2 py-0.5 bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 rounded font-bold">
                                  IMEI: {item.imei}
                                </span>
                              ) : (
                                <span className="text-xs font-mono text-[var(--text-muted)]">
                                  SKU: {item.sku_code}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[var(--text-muted)] flex items-center gap-2 flex-wrap">
                              {item.sku_code && <span>SKU: {item.sku_code}</span>}
                              {item.imei_serial && <span>Serial: {item.imei_serial}</span>}
                              {item.color && <span>• {item.color}</span>}
                              {item.gb && <span>• {item.gb}</span>}
                              {item.condition && <span>• {item.condition}</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  /* SELECTED ITEM CLEAN CARD */
                  <div className="p-4 bg-[var(--bg-hover)]/60 border-2 border-[var(--brand-primary)]/30 rounded-xl space-y-3 relative">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)] flex items-center gap-1 mb-1">
                          <Smartphone size={14} /> Selected Item for Transfer
                        </span>
                        <h3 className="text-base font-bold text-[var(--text-main)]">
                          {selectedItem.product_name}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="p-1 rounded-full text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition"
                        title="Change Item"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* Attached IMEI */}
                      {selectedItem.imei && (
                        <div className="p-2.5 bg-[var(--bg-card)] border border-[var(--border-base)] rounded-lg">
                          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">Attached IMEI:</span>
                          <span className="font-mono font-bold text-sm text-[var(--text-main)]">{selectedItem.imei}</span>
                        </div>
                      )}

                      {/* Attached Serial */}
                      {(selectedItem.imei_serial || selectedItem.serial_number) && (
                        <div className="p-2.5 bg-[var(--bg-card)] border border-[var(--border-base)] rounded-lg">
                          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">Attached Serial:</span>
                          <span className="font-mono font-bold text-sm text-[var(--text-main)]">{selectedItem.imei_serial || selectedItem.serial_number}</span>
                        </div>
                      )}

                      {/* Attached SKU with auto-transfer notice */}
                      <div className="p-2.5 bg-[var(--bg-card)] border border-[var(--border-base)] rounded-lg">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">Attached SKU:</span>
                        <span className="font-mono font-bold text-sm text-[var(--text-main)]">{selectedItem.sku_code || 'Standard'}</span>
                      </div>

                      {/* Specs */}
                      <div className="p-2.5 bg-[var(--bg-card)] border border-[var(--border-base)] rounded-lg">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">Specs / Condition:</span>
                        <span className="font-semibold text-sm text-[var(--text-main)]">
                          {[selectedItem.color, selectedItem.gb, selectedItem.condition].filter(Boolean).join(' • ') || 'Standard'}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 pt-1">
                      <Sparkles size={13} className="shrink-0" />
                      <span>If this exact SKU does not exist in the destination business, it will be automatically created upon transfer.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* OPTIONAL NOTES */}
              {selectedItem && (
                <div>
                  <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-1">
                    Transfer Note (Optional)
                  </label>
                  <input
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Courier tracking ref, B2B exchange order..."
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] rounded-lg px-3.5 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  />
                </div>
              )}

              {/* ACTION DISPATCH BUTTON */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !toBranch || !selectedItem}
                  className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2 shadow text-sm"
                >
                  {loading ? <Loader size={17} className="animate-spin" /> : <ArrowUpRight size={17} />}
                  Dispatch B2B Transfer to Business
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: TRANSFER LIST */}
        {tab === 'list' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-card)] border border-[var(--border-base)] p-3 rounded-lg">
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'all', label: 'All Transfers' },
                  { id: 'outgoing', label: 'Outgoing (Sent)' },
                  { id: 'incoming', label: 'Incoming (Received)' },
                  { id: 'in_transit', label: 'In Transit' },
                  { id: 'completed', label: 'Completed' },
                ].map(flt => (
                  <button
                    key={flt.id}
                    onClick={() => setFilterDirection(flt.id as any)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
                      filterDirection === flt.id
                        ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                        : 'bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    {flt.label}
                  </button>
                ))}
              </div>

              <div className="relative w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  value={listSearch}
                  onChange={e => setListSearch(e.target.value)}
                  placeholder="Filter by Product, IMEI, Branch..."
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] rounded pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] text-[var(--text-main)]"
                />
              </div>
            </div>

            {filteredTransfers.length === 0 ? (
              <div className="text-center py-16 text-[var(--text-muted)] bg-[var(--bg-card)] border border-[var(--border-base)] rounded-lg">
                No transfer records found.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTransfers.map(t => {
                  const s = statusColors[t.status] || statusColors.pending;
                  const Icon = s.icon;
                  const outgoing = isOutgoing(t);
                  const incoming = isIncoming(t);

                  return (
                    <div
                      key={t.id}
                      className="bg-[var(--bg-card)] border border-[var(--border-base)] p-4 rounded-lg flex flex-wrap items-center justify-between gap-4 shadow-sm hover:border-[var(--brand-primary)]/40 transition"
                    >
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <div className={`p-2.5 rounded border ${s.bg} shrink-0 mt-0.5`}>
                          <Icon size={18} className={s.text} />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[var(--text-main)] text-sm">
                              {t.product_name || 'Stock Item'}
                            </span>
                            {outgoing && (
                              <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 rounded flex items-center gap-1">
                                <ArrowUpRight size={11} /> Outgoing
                              </span>
                            )}
                            {incoming && (
                              <span className="text-[11px] font-bold px-2 py-0.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 rounded flex items-center gap-1">
                                <ArrowDownLeft size={11} /> Incoming
                              </span>
                            )}
                            {t.sku_code && (
                              <span className="text-xs font-mono bg-[var(--bg-hover)] border border-[var(--border-base)] px-2 py-0.5 rounded text-[var(--text-muted)]">
                                SKU: {t.sku_code}
                              </span>
                            )}
                            {t.imei && (
                              <span className="text-xs font-mono bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded font-bold">
                                IMEI: {t.imei}
                              </span>
                            )}
                            {t.imei_serial && !t.imei && (
                              <span className="text-xs font-mono bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded font-bold">
                                Serial: {t.imei_serial}
                              </span>
                            )}
                            <span className={`text-xs px-2.5 py-0.5 rounded border font-semibold capitalize ${s.bg} ${s.text}`}>
                              {t.status.replace('_', ' ')}
                            </span>
                          </div>

                          <div className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-[var(--text-main)]">
                              {t.from_business_name ? `${t.from_business_name} (${t.from_branch_name})` : t.from_branch_name}
                            </span>
                            <ArrowRight size={12} className="text-[var(--brand-primary)]" />
                            <span className="font-semibold text-[var(--text-main)]">
                              {t.to_business_name ? `${t.to_business_name} (${t.to_branch_name})` : t.to_branch_name}
                            </span>
                            <span>• Qty: {t.quantity || 1}</span>
                            {t.color && <span>• Color: {t.color}</span>}
                            {t.gb && <span>• {t.gb}</span>}
                            {t.condition && <span>• {t.condition}</span>}
                          </div>

                          <div className="text-xs text-[var(--text-muted)] opacity-80">
                            Transfer #{t.id} • Created {new Date(t.created_at).toLocaleString()}
                            {t.initiated_by_name && ` by ${t.initiated_by_name}`}
                            {t.notes && <span className="italic ml-2">"{t.notes}"</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handlePrintManifest(t)}
                          className="px-3 py-1.5 text-xs font-medium text-[var(--text-main)] bg-[var(--bg-hover)] border border-[var(--border-base)] rounded hover:bg-[var(--bg-hover)]/80 transition flex items-center gap-1.5"
                        >
                          <Printer size={13} /> Print Slip
                        </button>

                        {t.status === 'in_transit' && (
                          <>
                            {incoming && (
                              <button
                                onClick={() => completeTransfer(t.id)}
                                className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition shadow-sm flex items-center gap-1"
                              >
                                <CheckCircle size={13} /> Receive & Accept
                              </button>
                            )}

                            {outgoing && (
                              <button
                                onClick={() => cancelTransfer(t.id)}
                                className="px-3 py-1.5 text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded transition"
                              >
                                Cancel Dispatch
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: IMEI / SERIAL LOOKUP */}
        {tab === 'lookup' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <form onSubmit={doLookup} className="flex gap-2">
              <input
                value={imeiLookup}
                onChange={e => setImeiLookup(e.target.value)}
                placeholder="Enter 15-digit IMEI or Serial number to track movement history..."
                required
                className="flex-1 bg-[var(--bg-input)] border border-[var(--border-base)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
              <button
                type="submit"
                disabled={lookupLoading}
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white px-5 py-2.5 rounded-lg font-semibold transition flex items-center gap-2 text-sm disabled:opacity-60"
              >
                {lookupLoading ? <Loader size={15} className="animate-spin" /> : <Search size={15} />}
                Search
              </button>
            </form>

            {lookupResult?.error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
                <AlertCircle size={16} /> {lookupResult.error}
              </div>
            )}

            {lookupResult?.device && (
              <div className="space-y-4">
                <div className="bg-[var(--bg-card)] border border-[var(--border-base)] p-5 rounded-xl shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-[var(--text-main)]">
                      {lookupResult.device.product_name || lookupResult.device.imei}
                    </span>
                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 capitalize">
                      Status: {lookupResult.device.status}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] space-y-1">
                    <div>
                      <strong>IMEI:</strong> <span className="font-mono font-bold text-[var(--text-main)]">{lookupResult.device.imei}</span>
                      {lookupResult.device.imei_serial && ` • Serial: ${lookupResult.device.imei_serial}`}
                    </div>
                    <div>
                      <strong>Location:</strong> {lookupResult.currentBranch?.business_name || 'Business'} — {lookupResult.currentBranch?.name || 'Branch'}
                    </div>
                    <div>
                      <strong>Specs:</strong> {lookupResult.device.color || 'N/A'} • {lookupResult.device.gb || 'N/A'} • {lookupResult.device.condition || 'N/A'}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-3">
                    Movement & Transfer History ({lookupResult.transfers?.length || 0})
                  </h3>
                  {lookupResult.transfers?.length === 0 ? (
                    <div className="text-sm text-[var(--text-muted)] p-4 bg-[var(--bg-card)] border border-[var(--border-base)] rounded-lg text-center">
                      No transfers recorded for this device.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {lookupResult.transfers.map((t: any) => {
                        const s = statusColors[t.status] || statusColors.pending;
                        const Icon = s.icon;
                        return (
                          <div
                            key={t.id}
                            className="bg-[var(--bg-card)] border border-[var(--border-base)] p-3 rounded-lg flex items-center gap-3 text-xs"
                          >
                            <Icon size={16} className={s.text} />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-[var(--text-main)] flex items-center gap-1.5 flex-wrap">
                                <span>{t.from_business_name ? `${t.from_business_name} (${t.from_branch_name})` : t.from_branch_name}</span>
                                <ArrowRight size={11} className="text-[var(--brand-primary)]" />
                                <span>{t.to_business_name ? `${t.to_business_name} (${t.to_branch_name})` : t.to_branch_name}</span>
                                <span className={`ml-1 px-2 py-0.2 rounded border text-[10px] ${s.bg} ${s.text}`}>
                                  {t.status}
                                </span>
                              </div>
                              <div className="text-[var(--text-muted)] mt-0.5">
                                {new Date(t.created_at).toLocaleString()} • Handled by {t.initiated_by_name || 'Staff'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PRINTABLE TRANSFER MANIFEST */}
      {printTransferData && (
        <div className="hidden print:block fixed inset-0 bg-white text-black p-8 font-sans z-50">
          <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-wider">B2B Goods Transfer Manifest</h1>
              <p className="text-sm text-gray-600 mt-1">Transfer Note #{printTransferData.id} • Status: {printTransferData.status.toUpperCase()}</p>
            </div>
            <div className="text-right text-sm">
              <p><strong>Date:</strong> {new Date(printTransferData.created_at).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {new Date(printTransferData.created_at).toLocaleTimeString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-6 p-4 border border-gray-300 rounded bg-gray-50">
            <div>
              <h2 className="font-bold text-xs uppercase text-gray-500 mb-1">Dispatching Origin (Sender):</h2>
              <p className="font-bold text-base">{printTransferData.from_business_name || 'Origin Business'}</p>
              <p className="text-sm">Branch: {printTransferData.from_branch_name}</p>
              <p className="text-xs text-gray-600 mt-1">Dispatched by: {printTransferData.initiated_by_name || 'Staff'}</p>
            </div>
            <div>
              <h2 className="font-bold text-xs uppercase text-gray-500 mb-1">Receiving Destination (Recipient):</h2>
              <p className="font-bold text-base">{printTransferData.to_business_name || 'Destination Business'}</p>
              <p className="text-sm">Branch: {printTransferData.to_branch_name}</p>
            </div>
          </div>

          <table className="w-full text-left border-collapse border border-gray-300 mb-8 text-sm">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="p-2 border-r border-gray-300">Product Description</th>
                <th className="p-2 border-r border-gray-300">SKU / Code</th>
                <th className="p-2 border-r border-gray-300">IMEI / Serial Number</th>
                <th className="p-2 border-r border-gray-300">Specs / Condition</th>
                <th className="p-2 text-center">Qty</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="p-2 border-r border-gray-300 font-bold">{printTransferData.product_name}</td>
                <td className="p-2 border-r border-gray-300 font-mono text-xs">{printTransferData.sku_code || 'N/A'}</td>
                <td className="p-2 border-r border-gray-300 font-mono text-xs font-bold">{printTransferData.imei || printTransferData.imei_serial || 'N/A'}</td>
                <td className="p-2 border-r border-gray-300 text-xs">
                  {[printTransferData.color, printTransferData.gb, printTransferData.condition].filter(Boolean).join(' • ') || 'Standard'}
                </td>
                <td className="p-2 text-center font-bold">{printTransferData.quantity || 1}</td>
              </tr>
            </tbody>
          </table>

          {printTransferData.notes && (
            <div className="mb-8 p-3 border border-gray-200 rounded text-xs bg-gray-50">
              <strong>Transfer Notes:</strong> {printTransferData.notes}
            </div>
          )}

          <div className="grid grid-cols-2 gap-12 mt-16 pt-8 border-t border-gray-300">
            <div>
              <div className="border-b border-black pb-1 mb-2"></div>
              <p className="text-xs font-bold uppercase text-gray-700">Sender Signature & Date</p>
            </div>
            <div>
              <div className="border-b border-black pb-1 mb-2"></div>
              <p className="text-xs font-bold uppercase text-gray-700">Receiver Signature & Date</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
