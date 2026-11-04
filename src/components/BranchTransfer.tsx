import React, { useState, useEffect, useRef } from 'react';
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
    if (!confirm('Confirm receiving this transfer into your inventory? Product/SKU will be verified and added to your stock.')) return;
    try {
      const res = await fetch(`/api/transfers/${id}/complete`, { method: 'PUT', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete transfer');
      setSelectedTransferIds(prev => prev.filter(tid => tid !== id));
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
      setSelectedTransferIds(prev => prev.filter(tid => tid !== id));
      loadTransfers();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
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
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 font-mono text-sm px-2 pb-2 pt-0 select-none w-full" style={{ fontSize: '15px' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-black shrink-0 flex justify-between items-center px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="font-medium text-black dark:text-white" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '22px' }}>B2B & Branch Transfers</h2>
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
        {/* TAB 1: FAST & BULK TRANSFER */}
        {tab === 'create' && (
          <div className="max-w-3xl mx-auto space-y-5">
            {msg.text && (
              <div
                className={`px-4 py-3 text-sm border rounded-lg flex flex-wrap items-center justify-between gap-3 shadow-sm ${
                  msg.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  {msg.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                  <span>{msg.text}</span>
                </div>
                <div className="flex items-center gap-2">
                  {msg.batchItems && msg.batchItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handlePrintManifest(msg.batchItems)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Printer size={13} /> Print Manifest ({msg.batchItems.length})
                    </button>
                  )}
                  <button onClick={() => setMsg({ text: '', type: '' })} className="text-xs opacity-70 hover:opacity-100 px-1">✕</button>
                </div>
              </div>
            )}

            <form onSubmit={handleDispatchTransfer} className="space-y-5 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-850 p-6 rounded-lg shadow-sm">
              {/* CURRENT LOGGED-IN BRANCH (FIXED ORIGIN) */}
              <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-neutral-500 uppercase">Transfer From:</span>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">
                    {currentUser?.branch_name || currentUser?.business_name || 'Current Branch'}
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
                    .filter(d => d.branch_id !== currentUser?.branch_id && (d.branch_name || d.business_name || '').trim() !== '')
                    .map(d => (
                      <option key={`${d.business_id}-${d.branch_id}`} value={d.branch_id}>
                        {(d.branch_name || d.business_name).trim()}
                      </option>
                    ))}
                </select>
              </div>

              {/* STEP 2: SEARCH & ADD MULTIPLE PRODUCTS OR IMEI DEVICES */}
              <div className="space-y-3" ref={searchContainerRef}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider flex items-center gap-1.5">
                    <Search size={15} className="text-[var(--brand-primary)]" />
                    2. Add Products or IMEI Devices (Single or Bulk) <span className="text-red-500">*</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowBulkPaste(prev => !prev)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded border flex items-center gap-1.5 transition cursor-pointer ${
                      showBulkPaste
                        ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                        : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400'
                    }`}
                  >
                    <ClipboardList size={13} />
                    {showBulkPaste ? 'Hide Bulk Paste' : 'Bulk Paste IMEIs / SKUs'}
                  </button>
                </div>

                {/* BULK PASTE IMEIS / SKUS PANEL */}
                {showBulkPaste && (
                  <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900/90 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        Paste or Scan Multiple IMEIs, Serial Numbers, or SKU Codes (one per line or comma-separated)
                      </span>
                      <button
                        type="button"
                        onClick={() => { setBulkPasteText(''); setShowBulkPaste(false); }}
                        className="text-xs text-neutral-400 hover:text-neutral-600"
                      >
                        ✕
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={bulkPasteText}
                      onChange={e => setBulkPasteText(e.target.value)}
                      placeholder="e.g.&#10;354891092837461&#10;354891092837462&#10;SKU-USBC-20W"
                      className="w-full bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded p-2.5 text-xs font-mono text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={bulkResolving || !bulkPasteText.trim()}
                        onClick={handleBulkPasteResolve}
                        className="px-3.5 py-1.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] disabled:opacity-50 text-white text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer"
                      >
                        {bulkResolving ? <Loader size={13} className="animate-spin" /> : <Plus size={14} />}
                        Add All Matching Items to Queue
                      </button>
                    </div>
                  </div>
                )}

                {/* SEARCH INPUT */}
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={e => handleSearch(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="Search Product Name, SKU, or Scan IMEI (Press Enter to quick-add)..."
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] rounded-lg pl-10 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] text-[var(--text-main)] font-medium"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(''); setSearchResults([]); searchInputRef.current?.focus(); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    >
                      ✕
                    </button>
                  )}

                  {/* Quick Search Dropdown Results */}
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-card)] border border-[var(--border-base)] rounded-xl shadow-xl overflow-hidden max-h-80 overflow-y-auto divide-y divide-[var(--border-base)] z-30">
                      <div className="px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 flex items-center justify-between text-xs border-b border-[var(--border-base)] sticky top-0 z-10">
                        <span className="font-semibold text-[var(--text-muted)]">
                          Found {searchResults.length} matching item(s) — Click to add to transfer queue
                        </span>
                        {searchResults.length > 1 && (
                          <button
                            type="button"
                            onClick={handleAddAllSearchResults}
                            className="text-xs font-bold text-[var(--brand-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={12} /> Add All ({searchResults.filter(i => !isItemQueued(i)).length})
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
                            className={`w-full text-left px-4 py-2.5 text-sm transition flex items-center justify-between gap-3 group cursor-pointer ${
                              isActiveRow
                                ? 'bg-blue-50/95 dark:bg-blue-950/50 border-l-4 border-l-blue-600'
                                : 'hover:bg-[var(--bg-hover)]'
                            }`}
                          >
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-[var(--text-main)] group-hover:text-[var(--brand-primary)]">
                                  {item.product_name}
                                </span>
                                {isDevice ? (
                                  <span className="text-xs font-mono px-2 py-0.5 bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 rounded font-bold">
                                    IMEI: {item.imei || item.imei_serial}
                                  </span>
                                ) : (
                                  <span className="text-xs font-mono px-2 py-0.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 rounded font-semibold">
                                    Stock Product • In Stock: {item.stock_quantity ?? 0}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-[var(--text-muted)] flex items-center gap-2 flex-wrap">
                                {item.sku_code && <span>SKU: {item.sku_code}</span>}
                                {item.imei_serial && item.imei && <span>Serial: {item.imei_serial}</span>}
                                {item.color && <span>• {item.color}</span>}
                                {item.gb && <span>• {item.gb}</span>}
                                {item.condition && <span>• {item.condition}</span>}
                              </div>
                            </div>

                            <div className="shrink-0">
                              {queued && isDevice ? (
                                <span className="px-2.5 py-1 text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded flex items-center gap-1">
                                  <Check size={12} /> Queued
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 text-xs font-bold bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-primary)]/20 rounded flex items-center gap-1 group-hover:bg-[var(--brand-primary)] group-hover:text-white transition">
                                  <Plus size={12} /> {queued ? 'Add +1' : 'Add'}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 3: QUEUED ITEMS FOR TRANSFER */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <Layers size={14} className="text-[var(--brand-primary)]" />
                    3. Transfer Queue ({selectedItems.length} {selectedItems.length === 1 ? 'Product' : 'Products'} • {totalQueueUnits} {totalQueueUnits === 1 ? 'Unit' : 'Units'})
                  </span>
                  {selectedItems.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={12} /> Clear All
                    </button>
                  )}
                </div>

                {selectedItems.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-neutral-300 dark:border-neutral-800 rounded-lg text-xs text-neutral-500">
                    No items added yet. Search above by product name, SKU, or scan/paste multiple IMEIs to build your transfer list.
                  </div>
                ) : (
                  <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
                    <div className="max-h-80 overflow-y-auto divide-y divide-neutral-200 dark:divide-neutral-800">
                      {selectedItems.map((item, index) => (
                        <div
                          key={item.queueKey}
                          className="p-3 bg-white dark:bg-neutral-950 hover:bg-neutral-50/70 dark:hover:bg-neutral-900/50 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <span className="w-5 h-5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                              {index + 1}
                            </span>
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                                  {item.product_name}
                                </span>
                                {item.item_type === 'device' ? (
                                  <span className="px-2 py-0.5 font-mono font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 rounded">
                                    IMEI: {item.imei || item.serial_number}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 rounded">
                                    Stock SKU
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-neutral-500 flex items-center gap-2 flex-wrap">
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

                          {/* Quantity Control & Remove */}
                          <div className="flex items-center gap-2 shrink-0">
                            {item.item_type === 'device' ? (
                              <span className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded font-bold text-neutral-700 dark:text-neutral-300">
                                Qty: 1
                              </span>
                            ) : (
                              <div className="flex items-center border border-neutral-200 dark:border-neutral-800 rounded overflow-hidden bg-white dark:bg-neutral-900">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQueueQuantity(item.queueKey, item.quantity - 1)}
                                  className="px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                                >
                                  <Minus size={12} />
                                </button>
                                <input
                                  type="number"
                                  min={1}
                                  value={item.quantity}
                                  onChange={e => handleUpdateQueueQuantity(item.queueKey, Number(e.target.value))}
                                  className="w-12 text-center font-bold text-xs py-1 bg-transparent text-neutral-900 dark:text-neutral-100 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQueueQuantity(item.queueKey, item.quantity + 1)}
                                  className="px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemoveFromQueue(item.queueKey)}
                              className="p-1.5 rounded text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                              title="Remove from queue"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-300">
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={13} className="shrink-0" />
                        <span>Missing products/SKUs in the destination business will be automatically created upon receiving.</span>
                      </div>
                      <span className="font-bold text-neutral-900 dark:text-neutral-100 shrink-0">
                        Total: {selectedItems.length} item(s) / {totalQueueUnits} unit(s)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* OPTIONAL NOTES */}
              {selectedItems.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-1">
                    Transfer Note / Batch Reference (Optional)
                  </label>
                  <input
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Courier tracking ref, B2B batch order..."
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] rounded-lg px-3.5 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  />
                </div>
              )}

              {/* ACTION DISPATCH BUTTON */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !toBranch || selectedItems.length === 0}
                  className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2 shadow text-sm cursor-pointer"
                >
                  {loading ? <Loader size={17} className="animate-spin" /> : <ArrowUpRight size={17} />}
                  {selectedItems.length <= 1
                    ? 'Dispatch B2B Transfer to Business'
                    : `Dispatch Bulk Transfer (${selectedItems.length} Products • ${totalQueueUnits} Units)`}
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
                    className={`px-3 py-1.5 text-xs font-semibold rounded transition cursor-pointer ${
                      filterDirection === flt.id
                        ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                        : 'bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    {flt.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {filteredTransfers.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleSelectAllVisible}
                    className="px-2.5 py-1.5 text-xs font-semibold bg-[var(--bg-hover)] border border-[var(--border-base)] rounded text-[var(--text-main)] hover:border-[var(--brand-primary)] transition cursor-pointer"
                  >
                    {filteredTransfers.every(t => selectedTransferIds.includes(t.id))
                      ? 'Unselect All'
                      : 'Select All'}
                  </button>
                )}

                <div className="relative w-72">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    value={listSearch}
                    onChange={e => setListSearch(e.target.value)}
                    placeholder="Filter by Product, IMEI, Branch..."
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] rounded pl-8 pr-7 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] text-[var(--text-main)]"
                  />
                  {listSearch && (
                    <button
                      type="button"
                      onClick={() => setListSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* BULK SELECTION ACTION BAR */}
            {selectedTransferObjects.length > 0 && (
              <div className="bg-blue-500/10 border border-blue-500/30 px-4 py-2.5 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <span>{selectedTransferObjects.length} transfer(s) selected</span>
                  <button
                    type="button"
                    onClick={() => setSelectedTransferIds([])}
                    className="underline font-normal opacity-80 hover:opacity-100 cursor-pointer"
                  >
                    Clear selection
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handlePrintManifest(selectedTransferObjects)}
                    className="px-3 py-1.5 font-semibold bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5 hover:bg-neutral-50 cursor-pointer"
                  >
                    <Printer size={13} /> Print Combined Slip ({selectedTransferObjects.length})
                  </button>

                  {selectedIncomingInTransit.length > 0 && (
                    <button
                      type="button"
                      disabled={bulkActionLoading}
                      onClick={handleBulkCompleteSelected}
                      className="px-3.5 py-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle size={13} /> Receive & Accept Selected ({selectedIncomingInTransit.length})
                    </button>
                  )}

                  {selectedOutgoingInTransit.length > 0 && (
                    <button
                      type="button"
                      disabled={bulkActionLoading}
                      onClick={handleBulkCancelSelected}
                      className="px-3 py-1.5 font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      <XCircle size={13} /> Cancel Selected ({selectedOutgoingInTransit.length})
                    </button>
                  )}
                </div>
              </div>
            )}

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
                  const isChecked = selectedTransferIds.includes(t.id);

                  return (
                    <div
                      key={t.id}
                      className={`bg-[var(--bg-card)] border p-4 rounded-lg flex flex-wrap items-center justify-between gap-4 shadow-sm transition ${
                        isChecked
                          ? 'border-[var(--brand-primary)] bg-blue-500/5'
                          : 'border-[var(--border-base)] hover:border-[var(--brand-primary)]/40'
                      }`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectTransfer(t.id)}
                          className="mt-2 w-4 h-4 rounded border-neutral-300 text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] cursor-pointer shrink-0"
                        />
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
                              {t.from_branch_name || t.from_business_name}
                            </span>
                            <ArrowRight size={12} className="text-[var(--brand-primary)]" />
                            <span className="font-semibold text-[var(--text-main)]">
                              {t.to_branch_name || t.to_business_name}
                            </span>
                            <span className="font-bold text-[var(--text-main)]">• Qty: {t.quantity || 1}</span>
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
                          className="px-3 py-1.5 text-xs font-medium text-[var(--text-main)] bg-[var(--bg-hover)] border border-[var(--border-base)] rounded hover:bg-[var(--bg-hover)]/80 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Printer size={13} /> Print Slip
                        </button>

                        {t.status === 'in_transit' && (
                          <>
                            {incoming && (
                              <button
                                onClick={() => completeTransfer(t.id)}
                                className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition shadow-sm flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle size={13} /> Receive & Accept
                              </button>
                            )}

                            {outgoing && (
                              <button
                                onClick={() => cancelTransfer(t.id)}
                                className="px-3 py-1.5 text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded transition cursor-pointer"
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
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white px-5 py-2.5 rounded-lg font-semibold transition flex items-center gap-2 text-sm disabled:opacity-60 cursor-pointer"
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
                      <strong>Location:</strong> {lookupResult.currentBranch?.name || lookupResult.currentBranch?.business_name || 'Branch'}
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
                                <span>{t.from_branch_name || t.from_business_name}</span>
                                <ArrowRight size={11} className="text-[var(--brand-primary)]" />
                                <span>{t.to_branch_name || t.to_business_name}</span>
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
