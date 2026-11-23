import React, { useState, useEffect, useRef } from 'react';
import { useRefetchOnActivate } from '../hooks/useRefetchOnActivate';
import { useAuth } from '../context/AuthContext';
import {
  Search, ArrowRight, CheckCircle, XCircle, Clock, Loader, History,
  Package, Building2, Smartphone, RefreshCw, Printer, AlertCircle,
  ShieldCheck, ArrowUpRight, ArrowDownLeft, Sparkles, Check, X,
  Plus, Minus, Trash2, ClipboardList, Layers
} from 'lucide-react';

interface Destination {
  branch_id: number;
  branch_name: string;
  business_id: number;
  business_name: string;
  business_city?: string;
}

interface TransferQueueItem {
  queueKey: string;
  item_type: 'device' | 'stock';
  device_id: number | null;
  sku_id: number | null;
  product_name: string;
  sku_code?: string;
  imei?: string;
  serial_number?: string;
  quantity: number;
  stock_quantity?: number;
  cost_price?: number;
  selling_price?: number;
  color?: string;
  gb?: string;
  condition?: string;
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

  // Fast & Bulk Product / Device Search & Queue Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [activeResultIdx, setActiveResultIdx] = useState<number>(0);
  const [selectedItems, setSelectedItems] = useState<TransferQueueItem[]>([]);
  const [notes, setNotes] = useState('');

  // Bulk Paste IMEIs / SKUs state
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState('');
  const [bulkResolving, setBulkResolving] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: string; batchItems?: any[] }>({ text: '', type: '' });

  // List Tab State
  const [transfers, setTransfers] = useState<any[]>([]);
  const [filterDirection, setFilterDirection] = useState<'all' | 'outgoing' | 'incoming' | 'in_transit' | 'completed'>('all');
  const [listSearch, setListSearch] = useState('');
  const [selectedTransferIds, setSelectedTransferIds] = useState<number[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Lookup Tab State
  const [imeiLookup, setImeiLookup] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Print Transfer Note (supports single or multi-item manifest)
  const [printTransferData, setPrintTransferData] = useState<any>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDestinations();
    loadTransfers();
  }, []);

  useRefetchOnActivate(isActive, () => {
    loadDestinations();
    loadTransfers();
  });

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

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        const data = await res.json();
        setTransfers(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to load transfers:', e);
    }
  };

  // Unified search for both in-stock IMEI devices AND standard stock products
  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    setActiveResultIdx(0);
    if (q.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/transfers/search-items?q=${encodeURIComponent(q.trim())}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
        return;
      }
      // Fallback to /api/devices/search if needed
      const fallbackRes = await fetch(`/api/devices/search?q=${encodeURIComponent(q.trim())}&status=in_stock`, { headers });
      if (fallbackRes.ok) {
        const data = await fallbackRes.json();
        setSearchResults(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Search failed:', e);
    }
  };

  const buildQueueKey = (item: any): string => {
    const devId = item.device_id || item.id;
    if (devId || item.imei) {
      return `dev-${devId || item.imei}`;
    }
    return `sku-${item.sku_id || item.sku_code || item.product_name}`;
  };

  const isItemQueued = (item: any): boolean => {
    const key = buildQueueKey(item);
    return selectedItems.some(i => i.queueKey === key);
  };

  const handleAddItemToQueue = (item: any, keepDropdownOpen = false) => {
    const devId = item.device_id || (item.imei ? item.id : null);
    const isDevice = Boolean(devId || item.imei || item.item_type === 'device');
    const queueKey = buildQueueKey(item);

    setSelectedItems(prev => {
      const existingIdx = prev.findIndex(i => i.queueKey === queueKey);
      if (existingIdx !== -1) {
        // If it's a serialized IMEI device, don't duplicate it
        if (isDevice) {
          return prev;
        }
        // If it's a stock SKU, increment its transfer quantity by 1
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + 1
        };
        return updated;
      }

      const newQueueItem: TransferQueueItem = {
        queueKey,
        item_type: isDevice ? 'device' : 'stock',
        device_id: devId ? Number(devId) : null,
        sku_id: item.sku_id ? Number(item.sku_id) : null,
        product_name: item.product_name || 'Stock Item',
        sku_code: item.sku_code || undefined,
        imei: item.imei || undefined,
        serial_number: item.imei_serial || item.serial_number || undefined,
        quantity: Number(item.quantity) || 1,
        stock_quantity: item.stock_quantity !== undefined ? Number(item.stock_quantity) : undefined,
        cost_price: item.cost_price !== undefined ? Number(item.cost_price) : undefined,
        selling_price: item.selling_price !== undefined ? Number(item.selling_price) : undefined,
        color: item.color || undefined,
        gb: item.gb || undefined,
        condition: item.condition || undefined,
      };
      return [...prev, newQueueItem];
    });

    if (!keepDropdownOpen) {
      setSearchQuery('');
      setSearchResults([]);
      searchInputRef.current?.focus();
    }
  };

  const handleAddAllSearchResults = () => {
    const available = searchResults.filter(item => !isItemQueued(item));
    available.forEach(item => handleAddItemToQueue(item, true));
    setSearchQuery('');
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setSearchResults([]);
      setSearchQuery('');
      return;
    }
    if (searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveResultIdx(prev => (prev + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveResultIdx(prev => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const qTrim = searchQuery.trim().toLowerCase();
      const exactMatch = searchResults.find(
        r =>
          (r.imei && String(r.imei).toLowerCase() === qTrim) ||
          (r.imei_serial && String(r.imei_serial).toLowerCase() === qTrim) ||
          (r.sku_code && String(r.sku_code).toLowerCase() === qTrim) ||
          (r.barcode && String(r.barcode).toLowerCase() === qTrim)
      );
      const target = exactMatch || searchResults[activeResultIdx] || searchResults[0];
      if (target) {
        handleAddItemToQueue(target, false);
      }
    }
  };

  const handleUpdateQueueQuantity = (queueKey: string, newQty: number) => {
    setSelectedItems(prev =>
      prev.map(item => {
        if (item.queueKey !== queueKey || item.item_type === 'device') return item;
        return { ...item, quantity: Math.max(1, Math.floor(newQty) || 1) };
      })
    );
  };

  const handleRemoveFromQueue = (queueKey: string) => {
    setSelectedItems(prev => prev.filter(item => item.queueKey !== queueKey));
  };

  const handleClearSelection = () => {
    setSelectedItems([]);
    setSearchQuery('');
    setSearchResults([]);
    setNotes('');
  };

  // Bulk Paste IMEIs / Serials / SKUs Handler
  const handleBulkPasteResolve = async () => {
    const codes = bulkPasteText
      .split(/[\n,;,\t\s]+/)
      .map(s => s.trim())
      .filter(Boolean);

    if (codes.length === 0) return;

    setBulkResolving(true);
    setMsg({ text: '', type: '' });
    try {
      const res = await fetch('/api/transfers/resolve-bulk', {
        method: 'POST',
        headers,
        body: JSON.stringify({ codes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resolve codes');

      const matched: any[] = data.matched || [];
      const notFound: string[] = data.notFound || [];

      matched.forEach(item => handleAddItemToQueue(item, true));

      if (matched.length > 0 && notFound.length === 0) {
        setMsg({ text: `✓ Added ${matched.length} item(s) to the transfer queue.`, type: 'success' });
        setBulkPasteText('');
        setShowBulkPaste(false);
      } else if (matched.length > 0 && notFound.length > 0) {
        setMsg({
          text: `Added ${matched.length} item(s). Could not add ${notFound.length}: ${notFound.join(', ')}`,
          type: 'error'
        });
      } else {
        setMsg({
          text: `No available in-stock items matched: ${notFound.join(', ')}`,
          type: 'error'
        });
      }
    } catch (err: any) {
      setMsg({ text: `✗ ${err.message}`, type: 'error' });
    } finally {
      setBulkResolving(false);
    }
  };

  // Fast & Bulk B2B Transfer Dispatch
  const handleDispatchTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toBranch) {
      setMsg({ text: 'Please select a recipient destination business & branch.', type: 'error' });
      return;
    }
    if (selectedItems.length === 0) {
      setMsg({ text: 'Please search and add at least one product or IMEI device to transfer.', type: 'error' });
      return;
    }

    setLoading(true);
    setMsg({ text: '', type: '' });

    try {
      const destObj = destinations.find(d => Number(d.branch_id) === Number(toBranch));
      const itemsPayload = selectedItems.map(item => ({
        device_id: item.device_id || null,
        sku_id: item.sku_id || null,
        product_name: item.product_name,
        sku_code: item.sku_code || undefined,
        imei: item.imei || undefined,
        serial_number: item.serial_number || undefined,
        quantity: item.item_type === 'device' ? 1 : Math.max(1, Number(item.quantity) || 1),
        cost_price: item.cost_price,
        selling_price: item.selling_price,
        color: item.color,
        gb: item.gb,
        condition: item.condition,
        notes: notes.trim() || undefined,
      }));

      const firstItem = itemsPayload[0];
      const payload = {
        to_branch_id: Number(toBranch),
        ...firstItem,
        notes: notes.trim() || undefined,
        items: itemsPayload,
      };

      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transfer failed');

      const totalUnits = itemsPayload.reduce((acc, i) => acc + (i.quantity || 1), 0);
      const manifestItems = selectedItems.map((it, idx) => ({
        id: data.ids?.[idx] || data.id,
        status: 'in_transit',
        created_at: new Date().toISOString(),
        from_business_name: currentUser?.business_name,
        from_branch_name: currentUser?.branch_name,
        to_business_name: destObj?.business_name,
        to_branch_name: destObj?.branch_name,
        initiated_by_name: currentUser?.name,
        product_name: it.product_name,
        sku_code: it.sku_code,
        imei: it.imei,
        imei_serial: it.serial_number,
        color: it.color,
        gb: it.gb,
        condition: it.condition,
        quantity: it.item_type === 'device' ? 1 : it.quantity,
        notes: notes.trim() || undefined,
      }));

      const destLabel = destObj?.branch_name || destObj?.business_name || 'destination';
      setMsg({
        text:
          selectedItems.length === 1
            ? `✓ Successfully transferred "${selectedItems[0].product_name}" (${selectedItems[0].imei ? `IMEI: ${selectedItems[0].imei}` : `Qty: ${selectedItems[0].quantity}`}) to ${destLabel}!`
            : `✓ Successfully dispatched ${selectedItems.length} products (${totalUnits} total units) to ${destLabel}!`,
        type: 'success',
        batchItems: manifestItems,
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
    if (actionLoadingId !== null) return;
    if (!confirm('Confirm receiving this transfer into your inventory? Product/SKU will be verified and added to your stock.')) return;
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/transfers/${id}/complete`, { method: 'PUT', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete transfer');
      setSelectedTransferIds(prev => prev.filter(tid => tid !== id));
      loadTransfers();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const cancelTransfer = async (id: number) => {
    if (actionLoadingId !== null) return;
    if (!confirm('Cancel this transfer and restore stock back to your branch inventory?')) return;
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/transfers/${id}/cancel`, { method: 'PUT', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel transfer');
      setSelectedTransferIds(prev => prev.filter(tid => tid !== id));
      loadTransfers();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBulkCompleteSelected = async () => {
    const incomingIds = filteredTransfers
      .filter(t => selectedTransferIds.includes(t.id) && t.status === 'in_transit' && isIncoming(t))
      .map(t => t.id);

    if (incomingIds.length === 0) return;
    if (!confirm(`Confirm receiving ${incomingIds.length} selected transfer(s) into your branch inventory?`)) return;

    setBulkActionLoading(true);
    try {
      for (const id of incomingIds) {
        const res = await fetch(`/api/transfers/${id}/complete`, { method: 'PUT', headers });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || `Failed on transfer #${id}`);
        }
      }
      setSelectedTransferIds([]);
      await loadTransfers();
    } catch (err: any) {
      alert(`Bulk receive error: ${err.message}`);
      await loadTransfers();
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkCancelSelected = async () => {
    const outgoingIds = filteredTransfers
      .filter(t => selectedTransferIds.includes(t.id) && t.status === 'in_transit' && isOutgoing(t))
      .map(t => t.id);

    if (outgoingIds.length === 0) return;
    if (!confirm(`Cancel ${outgoingIds.length} selected transfer(s) and restore stock to your branch?`)) return;

    setBulkActionLoading(true);
    try {
      for (const id of outgoingIds) {
        const res = await fetch(`/api/transfers/${id}/cancel`, { method: 'PUT', headers });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || `Failed on transfer #${id}`);
        }
      }
      setSelectedTransferIds([]);
      await loadTransfers();
    } catch (err: any) {
      alert(`Bulk cancel error: ${err.message}`);
      await loadTransfers();
    } finally {
      setBulkActionLoading(false);
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

  const handlePrintManifest = (tOrArray: any) => {
    const items = Array.isArray(tOrArray) ? tOrArray : [tOrArray];
    if (items.length === 0) return;
    const first = items[0];
    setPrintTransferData({
      ...first,
      id: items.length === 1 ? first.id : `${first.id} (+${items.length - 1} more)`,
      items,
    });
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

  const toggleSelectTransfer = (id: number) => {
    setSelectedTransferIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    if (filteredTransfers.length === 0) return;
    const visibleIds = filteredTransfers.map(t => t.id);
    const allSelected = visibleIds.every(id => selectedTransferIds.includes(id));
    if (allSelected) {
      setSelectedTransferIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedTransferIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const totalQueueUnits = selectedItems.reduce((sum, item) => sum + (item.item_type === 'device' ? 1 : item.quantity), 0);
  const selectedTransferObjects = filteredTransfers.filter(t => selectedTransferIds.includes(t.id));
  const selectedIncomingInTransit = selectedTransferObjects.filter(t => t.status === 'in_transit' && isIncoming(t));
  const selectedOutgoingInTransit = selectedTransferObjects.filter(t => t.status === 'in_transit' && isOutgoing(t));

  return (
    <div className="flex flex-col h-full bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 font-sans text-sm select-none w-full">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-neutral-900 shrink-0 flex justify-between items-center px-5 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <h2 className="font-semibold text-xl tracking-tight text-neutral-900 dark:text-neutral-100">
          B2B & Branch Transfers
        </h2>
        <button
          onClick={() => { loadTransfers(); loadDestinations(); }}
          className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium py-2 px-4 text-sm flex items-center gap-2 transition-colors cursor-pointer"
        >
          <RefreshCw size={15} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 shrink-0 px-5 gap-1">
        {[
          { id: 'create', label: 'Fast & Bulk Transfer', icon: ArrowUpRight },
          { id: 'list', label: `Transfer History (${transfers.length})`, icon: Package },
          { id: 'lookup', label: 'IMEI / Serial Lookup', icon: History },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id as any);
              if (t.id === 'list') loadTransfers();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              tab === t.id
                ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-auto p-5">
        {/* TAB 1: FAST & BULK TRANSFER */}
        {tab === 'create' && (
          <div className="max-w-7xl mx-auto space-y-4">
            {msg.text && (
              <div
                className={`px-4 py-3 text-sm border flex flex-wrap items-center justify-between gap-3 ${
                  msg.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  {msg.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                  <span>{msg.text}</span>
                </div>
                <div className="flex items-center gap-3">
                  {msg.batchItems && msg.batchItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handlePrintManifest(msg.batchItems)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer size={14} /> Print Manifest ({msg.batchItems.length})
                    </button>
                  )}
                  <button onClick={() => setMsg({ text: '', type: '' })} className="text-sm opacity-70 hover:opacity-100 px-1 cursor-pointer">✕</button>
                </div>
              </div>
            )}

            <form onSubmit={handleDispatchTransfer} className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* LEFT COLUMN: ROUTE, SEARCH & DISPATCH */}
              <div className="lg:col-span-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                    Transfer From (Origin)
                  </label>
                  <div className="px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm font-medium text-neutral-900 dark:text-neutral-100 flex items-center justify-between">
                    <span>{currentUser?.branch_name || currentUser?.business_name || 'Current Branch'}</span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Active Branch</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                    Transfer To (Recipient Branch) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={toBranch}
                    onChange={e => setToBranch(e.target.value)}
                    required
                    className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 px-3.5 py-2.5 text-sm focus:outline-none focus:border-[var(--brand-primary)] text-neutral-900 dark:text-neutral-100"
                  >
                    <option value="">-- Choose Recipient Branch --</option>
                    {destinations
                      .filter(d => d.branch_id !== currentUser?.branch_id && (d.branch_name || d.business_name || '').trim() !== '')
                      .map(d => (
                        <option key={`${d.business_id}-${d.branch_id}`} value={d.branch_id}>
                          {(d.branch_name || d.business_name).trim()}
                        </option>
                      ))}
                  </select>
                </div>

                {/* SEARCH & BULK PASTE */}
                <div className="space-y-2.5" ref={searchContainerRef}>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Add Products or IMEIs <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowBulkPaste(prev => !prev)}
                      className={`text-xs font-medium px-2.5 py-1 border flex items-center gap-1.5 transition-colors cursor-pointer ${
                        showBulkPaste
                          ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                          : 'bg-neutral-50 dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:border-neutral-500'
                      }`}
                    >
                      <ClipboardList size={13} />
                      {showBulkPaste ? 'Hide Bulk Paste' : 'Bulk Paste'}
                    </button>
                  </div>

                  {showBulkPaste && (
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-600 dark:text-neutral-300">
                          Paste IMEIs, Serials, or SKUs (one per line or comma-separated)
                        </span>
                        <button
                          type="button"
                          onClick={() => { setBulkPasteText(''); setShowBulkPaste(false); }}
                          className="text-sm text-neutral-400 hover:text-neutral-600 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                      <textarea
                        rows={4}
                        value={bulkPasteText}
                        onChange={e => setBulkPasteText(e.target.value)}
                        placeholder="354891092837461&#10;354891092837462&#10;SKU-USBC-20W"
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 p-2.5 text-sm font-mono text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-[var(--brand-primary)]"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={bulkResolving || !bulkPasteText.trim()}
                          onClick={handleBulkPasteResolve}
                          className="px-3.5 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] disabled:opacity-50 text-white text-sm font-medium flex items-center gap-1.5 cursor-pointer"
                        >
                          {bulkResolving ? <Loader size={14} className="animate-spin" /> : <Plus size={15} />}
                          Add Matching Items
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      ref={searchInputRef}
                      value={searchQuery}
                      onChange={e => handleSearch(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="Search Product, SKU, or Scan IMEI..."
                      className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 pl-10 pr-9 py-2.5 text-sm focus:outline-none focus:border-[var(--brand-primary)] text-neutral-900 dark:text-neutral-100"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => { setSearchQuery(''); setSearchResults([]); searchInputRef.current?.focus(); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                      >
                        ✕
                      </button>
                    )}

                    {/* Quick Search Dropdown Results */}
                    {searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 overflow-hidden max-h-80 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800 z-30 shadow-lg">
                        <div className="px-3.5 py-2 bg-neutral-50 dark:bg-neutral-800 flex items-center justify-between text-xs border-b border-neutral-200 dark:border-neutral-700 sticky top-0 z-10">
                          <span className="text-neutral-500 dark:text-neutral-400">
                            {searchResults.length} matching item(s)
                          </span>
                          {searchResults.length > 1 && (
                            <button
                              type="button"
                              onClick={handleAddAllSearchResults}
                              className="text-xs font-medium text-[var(--brand-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Plus size={13} /> Add All ({searchResults.filter(i => !isItemQueued(i)).length})
                            </button>
                          )}
                        </div>

                        {searchResults.map((item, idx) => {
                          const queued = isItemQueued(item);
                          const isDevice = Boolean(item.imei || item.device_id || item.item_type === 'device');
                          const isActiveRow = idx === activeResultIdx;

                          return (
                            <button
                              key={`${item.item_type || 'dev'}-${item.id || item.sku_id}-${idx}`}
                              type="button"
                              onMouseEnter={() => setActiveResultIdx(idx)}
                              onClick={() => handleAddItemToQueue(item, searchResults.length > 1)}
                              className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                                isActiveRow
                                  ? 'bg-blue-50 dark:bg-blue-950/40 border-l-2 border-l-blue-600'
                                  : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                              }`}
                            >
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                                    {item.product_name}
                                  </span>
                                  {isDevice ? (
                                    <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                                      IMEI: {item.imei || item.imei_serial}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-purple-600 dark:text-purple-400">
                                      In Stock: {item.stock_quantity ?? 0}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-neutral-500 flex items-center gap-2 flex-wrap">
                                  {item.sku_code && <span>SKU: {item.sku_code}</span>}
                                  {item.imei_serial && item.imei && <span>Serial: {item.imei_serial}</span>}
                                  {item.color && <span>• {item.color}</span>}
                                  {item.gb && <span>• {item.gb}</span>}
                                  {item.condition && <span>• {item.condition}</span>}
                                </div>
                              </div>

                              <span className="text-xs font-medium text-[var(--brand-primary)] shrink-0">
                                {queued && isDevice ? 'Queued' : (queued ? '+1' : '+ Add')}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {selectedItems.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                      Transfer Note (Optional)
                    </label>
                    <input
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="e.g. Courier tracking ref, B2B batch order..."
                      className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 px-3.5 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-[var(--brand-primary)]"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !toBranch || selectedItems.length === 0}
                  className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] disabled:opacity-50 text-white font-medium py-2.5 px-4 transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  {loading ? <Loader size={16} className="animate-spin" /> : <ArrowUpRight size={16} />}
                  {selectedItems.length <= 1
                    ? 'Dispatch B2B Transfer'
                    : `Dispatch Bulk Transfer (${selectedItems.length} Products • ${totalQueueUnits} Units)`}
                </button>
              </div>

              {/* RIGHT COLUMN: TRANSFER QUEUE */}
              <div className="lg:col-span-7 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-col">
                <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/70 dark:bg-neutral-800/40">
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    Transfer Queue ({selectedItems.length} {selectedItems.length === 1 ? 'Item' : 'Items'} • {totalQueueUnits} {totalQueueUnits === 1 ? 'Unit' : 'Units'})
                  </span>
                  {selectedItems.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={13} /> Clear All
                    </button>
                  )}
                </div>

                {selectedItems.length === 0 ? (
                  <div className="p-10 text-center text-sm text-neutral-400">
                    No items queued yet. Search by product name, SKU, or scan/paste IMEIs on the left.
                  </div>
                ) : (
                  <div className="max-h-[420px] overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
                    {selectedItems.map((item, index) => (
                      <div
                        key={item.queueKey}
                        className="px-4 py-3 hover:bg-neutral-50/80 dark:hover:bg-neutral-800/30 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="text-sm text-neutral-400 tabular-nums w-6 shrink-0">{index + 1}.</span>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
                                {item.product_name}
                              </span>
                              {item.item_type === 'device' ? (
                                <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                                  IMEI: {item.imei || item.serial_number}
                                </span>
                              ) : (
                                <span className="text-xs text-purple-600 dark:text-purple-400">
                                  Stock SKU
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-neutral-500 flex items-center gap-2 flex-wrap">
                              {item.sku_code && <span className="font-mono">SKU: {item.sku_code}</span>}
                              {item.serial_number && item.imei && <span className="font-mono">• Serial: {item.serial_number}</span>}
                              {[item.color, item.gb, item.condition].filter(Boolean).length > 0 && (
                                <span>• {[item.color, item.gb, item.condition].filter(Boolean).join(' • ')}</span>
                              )}
                              {item.item_type === 'stock' && item.stock_quantity !== undefined && (
                                <span>• Branch Stock: {item.stock_quantity}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          {item.item_type === 'device' ? (
                            <span className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                              Qty: 1
                            </span>
                          ) : (
                            <div className="flex items-center border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950">
                              <button
                                type="button"
                                onClick={() => handleUpdateQueueQuantity(item.queueKey, item.quantity - 1)}
                                className="px-2.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                              >
                                <Minus size={13} />
                              </button>
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={e => handleUpdateQueueQuantity(item.queueKey, Number(e.target.value))}
                                className="w-12 text-center text-sm py-1 bg-transparent text-neutral-900 dark:text-neutral-100 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateQueueQuantity(item.queueKey, item.quantity + 1)}
                                className="px-2.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveFromQueue(item.queueKey)}
                            className="p-1.5 text-neutral-400 hover:text-rose-500 cursor-pointer"
                            title="Remove from queue"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                  <span>Missing products/SKUs in the destination business are created automatically upon receiving.</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100 shrink-0 ml-3">
                    {selectedItems.length} item(s) / {totalQueueUnits} unit(s)
                  </span>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: TRANSFER LIST */}
        {tab === 'list' && (
          <div className="max-w-7xl mx-auto space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'outgoing', label: 'Outgoing' },
                  { id: 'incoming', label: 'Incoming' },
                  { id: 'in_transit', label: 'In Transit' },
                  { id: 'completed', label: 'Completed' },
                ].map(flt => (
                  <button
                    key={flt.id}
                    onClick={() => setFilterDirection(flt.id as any)}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                      filterDirection === flt.id
                        ? 'bg-[var(--brand-primary)] text-white'
                        : 'bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {flt.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2.5">
                {filteredTransfers.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleSelectAllVisible}
                    className="px-3 py-1.5 text-sm font-medium bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-200 hover:border-neutral-400 cursor-pointer"
                  >
                    {filteredTransfers.every(t => selectedTransferIds.includes(t.id))
                      ? 'Unselect All'
                      : 'Select All'}
                  </button>
                )}

                <div className="relative w-72">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    value={listSearch}
                    onChange={e => setListSearch(e.target.value)}
                    placeholder="Filter by Product, IMEI, Branch..."
                    className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 pl-9 pr-8 py-1.5 text-sm focus:outline-none focus:border-[var(--brand-primary)] text-neutral-900 dark:text-neutral-100"
                  />
                  {listSearch && (
                    <button
                      type="button"
                      onClick={() => setListSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* BULK SELECTION ACTION BAR */}
            {selectedTransferObjects.length > 0 && (
              <div className="bg-blue-500/10 border border-blue-500/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-sm">
                <div className="font-medium text-blue-700 dark:text-blue-300 flex items-center gap-3">
                  <span>{selectedTransferObjects.length} selected</span>
                  <button
                    type="button"
                    onClick={() => setSelectedTransferIds([])}
                    className="underline text-xs opacity-80 hover:opacity-100 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handlePrintManifest(selectedTransferObjects)}
                    className="px-3 py-1.5 text-sm font-medium bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5 hover:bg-neutral-50 cursor-pointer"
                  >
                    <Printer size={14} /> Print Combined Slip ({selectedTransferObjects.length})
                  </button>

                  {selectedIncomingInTransit.length > 0 && (
                    <button
                      type="button"
                      disabled={bulkActionLoading}
                      onClick={handleBulkCompleteSelected}
                      className="px-3.5 py-1.5 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle size={14} /> Receive & Accept ({selectedIncomingInTransit.length})
                    </button>
                  )}

                  {selectedOutgoingInTransit.length > 0 && (
                    <button
                      type="button"
                      disabled={bulkActionLoading}
                      onClick={handleBulkCancelSelected}
                      className="px-3 py-1.5 text-sm font-medium bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <XCircle size={14} /> Cancel ({selectedOutgoingInTransit.length})
                    </button>
                  )}
                </div>
              </div>
            )}

            {filteredTransfers.length === 0 ? (
              <div className="text-center py-12 text-neutral-400 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm">
                No transfer records found.
              </div>
            ) : (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
                {filteredTransfers.map(t => {
                  const s = statusColors[t.status] || statusColors.pending;
                  const outgoing = isOutgoing(t);
                  const incoming = isIncoming(t);
                  const isChecked = selectedTransferIds.includes(t.id);

                  return (
                    <div
                      key={t.id}
                      className={`px-4 py-3 flex flex-wrap items-center justify-between gap-4 transition-colors ${
                        isChecked
                          ? 'bg-blue-50/70 dark:bg-blue-950/30'
                          : 'hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectTransfer(t.id)}
                          className="mt-1.5 w-4 h-4 border-neutral-300 text-[var(--brand-primary)] cursor-pointer shrink-0"
                        />
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2.5 flex-wrap text-sm">
                            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                              {t.product_name || 'Stock Item'}
                            </span>
                            {outgoing && (
                              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Outgoing</span>
                            )}
                            {incoming && (
                              <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Incoming</span>
                            )}
                            {t.sku_code && (
                              <span className="text-xs font-mono text-neutral-500">SKU: {t.sku_code}</span>
                            )}
                            {t.imei && (
                              <span className="text-xs font-mono text-blue-600 dark:text-blue-400">IMEI: {t.imei}</span>
                            )}
                            {t.imei_serial && !t.imei && (
                              <span className="text-xs font-mono text-purple-600 dark:text-purple-400">Serial: {t.imei_serial}</span>
                            )}
                            <span className={`text-xs font-medium capitalize ${s.text}`}>
                              • {t.status.replace('_', ' ')}
                            </span>
                          </div>

                          <div className="text-sm text-neutral-600 dark:text-neutral-400 flex items-center gap-2 flex-wrap">
                            <span className="text-neutral-800 dark:text-neutral-200 font-medium">
                              {t.from_branch_name || t.from_business_name}
                            </span>
                            <ArrowRight size={13} className="text-neutral-400" />
                            <span className="text-neutral-800 dark:text-neutral-200 font-medium">
                              {t.to_branch_name || t.to_business_name}
                            </span>
                            <span>• Qty: {t.quantity || 1}</span>
                            {t.color && <span>• {t.color}</span>}
                            {t.gb && <span>• {t.gb}</span>}
                            {t.condition && <span>• {t.condition}</span>}
                          </div>

                          <div className="text-xs text-neutral-400">
                            Transfer #{t.id} • {new Date(t.created_at).toLocaleString()}
                            {t.initiated_by_name && ` • ${t.initiated_by_name}`}
                            {t.notes && <span className="italic ml-2">"{t.notes}"</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handlePrintManifest(t)}
                          className="px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Printer size={14} /> Print
                        </button>

                        {t.status === 'in_transit' && (
                          <>
                            {incoming && (
                              <button
                                disabled={actionLoadingId === t.id}
                                onClick={() => completeTransfer(t.id)}
                                className="px-3 py-1.5 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white flex items-center gap-1.5 cursor-pointer"
                              >
                                <CheckCircle size={14} /> {actionLoadingId === t.id ? 'Receiving...' : 'Receive'}
                              </button>
                            )}

                            {outgoing && (
                              <button
                                disabled={actionLoadingId === t.id}
                                onClick={() => cancelTransfer(t.id)}
                                className="px-3 py-1.5 text-sm font-medium bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-50 text-rose-600 dark:text-rose-400 border border-rose-500/20 cursor-pointer"
                              >
                                {actionLoadingId === t.id ? 'Cancelling...' : 'Cancel'}
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
          <div className="max-w-4xl mx-auto space-y-4">
            <form onSubmit={doLookup} className="flex gap-2">
              <input
                value={imeiLookup}
                onChange={e => setImeiLookup(e.target.value)}
                placeholder="Enter 15-digit IMEI or Serial number to track movement history..."
                required
                className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 px-3.5 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-[var(--brand-primary)]"
              />
              <button
                type="submit"
                disabled={lookupLoading}
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white px-5 py-2.5 font-medium transition-colors flex items-center gap-2 text-sm disabled:opacity-60 cursor-pointer"
              >
                {lookupLoading ? <Loader size={15} className="animate-spin" /> : <Search size={15} />}
                Search
              </button>
            </form>

            {lookupResult?.error && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
                <AlertCircle size={16} /> {lookupResult.error}
              </div>
            )}

            {lookupResult?.device && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                      {lookupResult.device.product_name || lookupResult.device.imei}
                    </span>
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 capitalize">
                      {lookupResult.device.status}
                    </span>
                  </div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400 flex flex-wrap gap-x-5 gap-y-1">
                    <span>IMEI: <strong className="font-mono text-neutral-900 dark:text-neutral-100">{lookupResult.device.imei}</strong></span>
                    {lookupResult.device.imei_serial && <span>Serial: {lookupResult.device.imei_serial}</span>}
                    <span>Location: {lookupResult.currentBranch?.name || lookupResult.currentBranch?.business_name || 'Branch'}</span>
                    <span>Specs: {lookupResult.device.color || 'N/A'} • {lookupResult.device.gb || 'N/A'} • {lookupResult.device.condition || 'N/A'}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                    Movement & Transfer History ({lookupResult.transfers?.length || 0})
                  </h3>
                  {lookupResult.transfers?.length === 0 ? (
                    <div className="text-sm text-neutral-400 p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-center">
                      No transfers recorded for this device.
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
                      {lookupResult.transfers.map((t: any) => {
                        const s = statusColors[t.status] || statusColors.pending;
                        return (
                          <div
                            key={t.id}
                            className="px-4 py-3 flex items-center justify-between gap-3 text-sm"
                          >
                            <div className="min-w-0">
                              <div className="font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2 flex-wrap">
                                <span>{t.from_branch_name || t.from_business_name}</span>
                                <ArrowRight size={13} className="text-neutral-400" />
                                <span>{t.to_branch_name || t.to_business_name}</span>
                                <span className={`ml-1 capitalize ${s.text}`}>• {t.status}</span>
                              </div>
                              <div className="text-xs text-neutral-500 mt-0.5">
                                {new Date(t.created_at).toLocaleString()} • {t.initiated_by_name || 'Staff'}
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

      {/* PRINTABLE TRANSFER MANIFEST (SINGLE OR BULK) */}
      {printTransferData && (
        <div className="hidden print:block fixed inset-0 bg-white text-black p-8 font-sans z-50">
          <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-wider">B2B Goods Transfer Manifest</h1>
              <p className="text-sm text-gray-600 mt-1">
                Transfer Note #{printTransferData.id} • Status: {(printTransferData.status || 'in_transit').toUpperCase()}
              </p>
            </div>
            <div className="text-right text-sm">
              <p><strong>Date:</strong> {new Date(printTransferData.created_at || Date.now()).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {new Date(printTransferData.created_at || Date.now()).toLocaleTimeString()}</p>
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
                <th className="p-2 border-r border-gray-300 w-10 text-center">#</th>
                <th className="p-2 border-r border-gray-300">Product Description</th>
                <th className="p-2 border-r border-gray-300">SKU / Code</th>
                <th className="p-2 border-r border-gray-300">IMEI / Serial Number</th>
                <th className="p-2 border-r border-gray-300">Specs / Condition</th>
                <th className="p-2 text-center">Qty</th>
              </tr>
            </thead>
            <tbody>
              {(printTransferData.items || [printTransferData]).map((row: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="p-2 border-r border-gray-300 text-center text-xs">{idx + 1}</td>
                  <td className="p-2 border-r border-gray-300 font-bold">{row.product_name}</td>
                  <td className="p-2 border-r border-gray-300 font-mono text-xs">{row.sku_code || 'N/A'}</td>
                  <td className="p-2 border-r border-gray-300 font-mono text-xs font-bold">{row.imei || row.imei_serial || 'N/A'}</td>
                  <td className="p-2 border-r border-gray-300 text-xs">
                    {[row.color, row.gb, row.condition].filter(Boolean).join(' • ') || 'Standard'}
                  </td>
                  <td className="p-2 text-center font-bold">{row.quantity || 1}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-bold">
                <td colSpan={5} className="p-2 border-r border-gray-300 text-right uppercase text-xs">
                  Total Units Transferred:
                </td>
                <td className="p-2 text-center">
                  {(printTransferData.items || [printTransferData]).reduce((s: number, r: any) => s + (Number(r.quantity) || 1), 0)}
                </td>
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
