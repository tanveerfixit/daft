import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, ArrowRight, CheckCircle, XCircle, Clock, Loader, History, Package, Share2, Plus, CornerDownLeft } from 'lucide-react';

const statusColors: Record<string, { bg: string; text: string; icon: any }> = {
  in_transit: { bg: 'bg-[var(--brand-warning)]/10 border-[var(--brand-warning)]/20', text: 'text-[var(--brand-warning-hover)]', icon: Clock },
  completed: { bg: 'bg-[var(--brand-success)]/10 border-[var(--brand-success)]/20', text: 'text-[var(--brand-success)]', icon: CheckCircle },
  accepted: { bg: 'bg-[var(--brand-success)]/10 border-[var(--brand-success)]/20', text: 'text-[var(--brand-success)]', icon: CheckCircle },
  cancelled: { bg: 'bg-[var(--brand-danger)]/10 border-[var(--brand-danger)]/20', text: 'text-[var(--brand-danger)]', icon: XCircle },
  rejected: { bg: 'bg-[var(--brand-danger)]/10 border-[var(--brand-danger)]/20', text: 'text-[var(--brand-danger)]', icon: XCircle },
  pending: { bg: 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/20', text: 'text-[var(--brand-primary)]', icon: Clock },
};

export default function BranchTransfer() {
  const { token, currentUser } = useAuth();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [tab, setTab] = useState<'create' | 'list' | 'lookup' | 'b2b-create' | 'b2b-list'>('b2b-create');
  const [branches, setBranches] = useState<any[]>([]);
  const [deviceSearch, setDeviceSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [toBranch, setToBranch] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [transfers, setTransfers] = useState<any[]>([]);
  
  // IMEI Lookup State
  const [imeiLookup, setImeiLookup] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // B2B States
  const [b2bBusinesses, setB2bBusinesses] = useState<any[]>([]);
  const [toB2bBusiness, setToB2bBusiness] = useState('');
  const [b2bTransfers, setB2bTransfers] = useState<{ incoming: any[]; outgoing: any[] }>({ incoming: [], outgoing: [] });
  const [selectedIncomingTransfer, setSelectedIncomingTransfer] = useState<any>(null);
  
  // Accept dialog states
  const [acceptBranch, setAcceptBranch] = useState('');
  const [acceptMode, setAcceptMode] = useState<'map' | 'create'>('map');
  const [localProducts, setLocalProducts] = useState<any[]>([]);
  const [selectedLocalSku, setSelectedLocalSku] = useState('');
  const [autoProductName, setAutoProductName] = useState('');
  const [autoSkuCode, setAutoSkuCode] = useState('');
  const [autoSellingPrice, setAutoSellingPrice] = useState('');

  useEffect(() => {
    fetch('/api/branches', { headers }).then(r => r.json()).then(setBranches);
    loadTransfers();
    loadB2bBusinesses();
    loadB2bTransfers();
    loadLocalProducts();
  }, []);

  const loadTransfers = () => {
    fetch('/api/transfers', { headers }).then(r => r.json()).then(setTransfers);
  };

  const loadB2bBusinesses = () => {
    fetch('/api/inventory/b2b-businesses', { headers })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setB2bBusinesses(data);
      });
  };

  const loadB2bTransfers = () => {
    fetch('/api/inventory/b2b-transfers', { headers })
      .then(r => r.json())
      .then(data => {
        if (data && data.incoming) setB2bTransfers(data);
      });
  };

  const loadLocalProducts = () => {
    fetch('/api/products?limit=100', { headers })
      .then(r => r.json())
      .then(data => {
        const list = data.products || data;
        if (Array.isArray(list)) setLocalProducts(list);
      });
  };

  const searchDevices = async (q: string) => {
    setDeviceSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const res = await fetch(`/api/devices/search?q=${encodeURIComponent(q)}`, { headers });
    setSearchResults(await res.json());
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice || !toBranch) return;
    setLoading(true);
    setMsg({ text: '', type: '' });
    try {
      const res = await fetch('/api/transfers', {
        method: 'POST', headers,
        body: JSON.stringify({ device_id: selectedDevice.id, to_branch_id: Number(toBranch), notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg({ text: '✓ Transfer initiated successfully', type: 'success' });
      setSelectedDevice(null); setDeviceSearch(''); setToBranch(''); setNotes('');
      loadTransfers();
    } catch (err: any) {
      setMsg({ text: `✗ ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateB2bTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice || !toB2bBusiness) return;
    setLoading(true);
    setMsg({ text: '', type: '' });
    try {
      const res = await fetch('/api/inventory/b2b-transfers/initiate', {
        method: 'POST', headers,
        body: JSON.stringify({
          device_id: selectedDevice.id,
          to_business_id: Number(toB2bBusiness),
          notes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg({ text: '✓ B2B Transfer initiated successfully', type: 'success' });
      setSelectedDevice(null); setDeviceSearch(''); setToB2bBusiness(''); setNotes('');
      loadB2bTransfers();
    } catch (err: any) {
      setMsg({ text: `✗ ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const completeTransfer = async (id: number) => {
    await fetch(`/api/transfers/${id}/complete`, { method: 'PUT', headers });
    loadTransfers();
  };

  const cancelTransfer = async (id: number) => {
    if (!confirm('Cancel this transfer?')) return;
    await fetch(`/api/transfers/${id}/cancel`, { method: 'PUT', headers });
    loadTransfers();
  };

  const cancelB2bTransfer = async (id: number) => {
    if (!confirm('Cancel this B2B transfer?')) return;
    await fetch(`/api/inventory/b2b-transfers/${id}/cancel`, { method: 'POST', headers });
    loadB2bTransfers();
  };

  const respondB2bTransfer = async (id: number, action: 'accept' | 'reject') => {
    if (action === 'reject') {
      if (!confirm('Reject this incoming transfer?')) return;
      await fetch(`/api/inventory/b2b-transfers/${id}/respond`, {
        method: 'POST', headers,
        body: JSON.stringify({ action })
      });
      loadB2bTransfers();
    } else {
      // Find the transfer details
      const transfer = b2bTransfers.incoming.find(t => t.id === id);
      if (transfer) {
        setSelectedIncomingTransfer(transfer);
        setAcceptBranch('');
        setAcceptMode('map');
        setSelectedLocalSku('');
        setAutoProductName(transfer.product_name || '');
        setAutoSkuCode(transfer.sku_code || '');
        setAutoSellingPrice('');
      }
    }
  };

  const submitAcceptB2b = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncomingTransfer || !acceptBranch) return;
    setLoading(true);
    try {
      const body: any = {
        action: 'accept',
        to_branch_id: Number(acceptBranch)
      };

      if (acceptMode === 'map') {
        if (!selectedLocalSku) throw new Error('Please select a local product SKU');
        body.receiver_sku_id = Number(selectedLocalSku);
      } else {
        if (!autoProductName || !autoSkuCode || !autoSellingPrice) {
          throw new Error('Please enter all product/SKU creation details');
        }
        body.auto_create = {
          product_name: autoProductName,
          sku_code: autoSkuCode,
          selling_price: Number(autoSellingPrice)
        };
      }

      const res = await fetch(`/api/inventory/b2b-transfers/${selectedIncomingTransfer.id}/respond`, {
        method: 'POST', headers,
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSelectedIncomingTransfer(null);
      loadB2bTransfers();
      alert('✓ Transfer accepted and added to your inventory!');
    } catch (err: any) {
      alert(`✗ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const doLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupLoading(true); setLookupResult(null);
    try {
      const res = await fetch(`/api/transfers/device/${encodeURIComponent(imeiLookup)}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLookupResult(data);
    } catch (err: any) {
      setLookupResult({ error: err.message });
    } finally { setLookupLoading(false); }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-app)]">
      <div className="p-6 border-b border-[var(--border-base)] bg-[var(--bg-card)]">
        <h2 className="text-xl font-bold text-[var(--text-main)] font-sans">B2B Device Transfers</h2>
        <p className="text-sm text-[var(--text-muted)] mt-0.5 font-sans">Transfer serialized/IMEI devices between businesses</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-4 bg-[var(--bg-card)] border-b border-[var(--border-base)] overflow-x-auto">
        {[
          { id: 'b2b-create', label: 'Send Device', icon: Share2 },
          { id: 'b2b-list', label: `B2B Logs (${b2bTransfers.incoming.length + b2bTransfers.outgoing.length})`, icon: Package },
          { id: 'lookup', label: 'IMEI History', icon: History },
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id as any); if (t.id === 'list') loadTransfers(); if (t.id === 'b2b-list') loadB2bTransfers(); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition duration-150 whitespace-nowrap ${tab === t.id ? 'border-[var(--brand-primary)] text-[var(--brand-primary)] bg-[var(--bg-hover)]/30' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]'}`}>
            <t.icon size={15} />{t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-6 font-sans">

        {/* NEW BRANCH TRANSFER */}
        {tab === 'create' && (
          <div className="max-w-lg">
            {msg.text && (
              <div className={`mb-4 px-4 py-3 text-sm border ${msg.type === 'success' ? 'bg-[var(--brand-success)]/10 text-[var(--brand-success)] border-[var(--brand-success)]/20' : 'bg-[var(--brand-danger)]/10 text-[var(--brand-danger)] border-[var(--brand-danger)]/20'}`}>
                {msg.text}
              </div>
            )}

            <form onSubmit={handleCreateTransfer} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[var(--text-main)] mb-1.5">Search Device (IMEI, Model, SKU)</label>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    value={deviceSearch}
                    onChange={e => { searchDevices(e.target.value); setSelectedDevice(null); }}
                    placeholder="Type IMEI, Model Name, or SKU..."
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)] text-[var(--text-main)]"
                  />
                </div>
                {searchResults.length > 0 && !selectedDevice && (
                  <div className="border border-[var(--border-base)] bg-[var(--bg-card)] mt-1 overflow-hidden max-h-60 overflow-y-auto z-50 relative">
                    {searchResults.map(d => (
                      <button key={d.id} type="button" onClick={() => { setSelectedDevice(d); setDeviceSearch(d.imei); setSearchResults([]); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-[var(--bg-hover)] text-sm border-b border-[var(--border-base)] last:border-0 transition flex flex-col">
                        <div className="font-semibold text-[var(--text-main)] font-mono">{d.imei}</div>
                        <div className="text-[var(--text-muted)] text-xs mt-0.5">{d.product_name} · {d.color} {d.gb} · <span className="text-[var(--brand-primary)] font-medium">{d.branch_name}</span></div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedDevice && (
                  <div className="mt-2 p-3 bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 text-sm">
                    <div className="font-semibold text-[var(--brand-primary)]">{selectedDevice.product_name}</div>
                    <div className="text-[var(--text-main)] text-xs mt-0.5">IMEI: <span className="font-mono">{selectedDevice.imei}</span> · {selectedDevice.color} {selectedDevice.gb} · Currently at: <strong>{selectedDevice.branch_name}</strong></div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-main)] mb-1.5">Transfer To Branch</label>
                <select value={toBranch} onChange={e => setToBranch(e.target.value)} required
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)] text-[var(--text-main)]">
                  <option value="">Select destination branch...</option>
                  {branches.filter(b => b.id !== currentUser?.branch_id && (!selectedDevice || b.id !== selectedDevice.branch_id)).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-main)] mb-1.5">Notes (optional)</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason for transfer..."
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)] text-[var(--text-main)]" />
              </div>

              <button type="submit" disabled={loading || !selectedDevice || !toBranch}
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] disabled:opacity-50 text-white font-semibold px-6 py-2.5 transition flex items-center gap-2">
                {loading ? <Loader size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                Initiate Transfer
              </button>
            </form>
          </div>
        )}

        {/* BRANCH TRANSFERS LIST */}
        {tab === 'list' && (
          <div className="space-y-2">
            {transfers.length === 0 && <div className="text-center text-[var(--text-muted)] py-16">No branch transfers yet.</div>}
            {transfers.map(t => {
              const s = statusColors[t.status] || statusColors.pending;
              const Icon = s.icon;
              return (
                <div key={t.id} className="bg-[var(--bg-card)] border border-[var(--border-base)] p-4 flex items-center gap-4">
                  <div className={`p-2 border ${s.bg}`}><Icon size={16} className={s.text} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[var(--text-main)] text-sm">{t.product_name || 'Stock Item'}</span>
                      {t.imei && <span className="text-xs bg-[var(--bg-hover)] border border-[var(--border-base)] text-[var(--text-muted)] px-2 py-0.5 font-mono">{t.imei}</span>}
                      <span className={`text-xs px-2 py-0.5 border ${s.bg} ${s.text}`}>{t.status.replace('_', ' ')}</span>
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">
                      <span className="font-semibold text-[var(--text-main)]">{t.from_branch_name}</span>
                      <ArrowRight size={11} className="inline mx-1 text-[var(--text-muted)]" />
                      <span className="font-semibold text-[var(--text-main)]">{t.to_branch_name}</span>
                      {t.notes && ` · "${t.notes}"`}
                      {' · '}{new Date(t.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {t.status === 'in_transit' && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => completeTransfer(t.id)}
                        className="text-xs bg-[var(--brand-success)]/10 hover:bg-[var(--brand-success)]/20 text-[var(--brand-success)] border border-[var(--brand-success)]/20 px-3 py-1.5 font-bold transition">
                        ✓ Received
                      </button>
                      <button onClick={() => cancelTransfer(t.id)}
                        className="text-xs bg-[var(--brand-danger)]/10 hover:bg-[var(--brand-danger)]/20 text-[var(--brand-danger)] border border-[var(--brand-danger)]/20 px-3 py-1.5 font-bold transition">
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* B2B SEND DEVICE */}
        {tab === 'b2b-create' && (
          <div className="max-w-lg">
            {msg.text && (
              <div className={`mb-4 px-4 py-3 text-sm border ${msg.type === 'success' ? 'bg-[var(--brand-success)]/10 text-[var(--brand-success)] border-[var(--brand-success)]/20' : 'bg-[var(--brand-danger)]/10 text-[var(--brand-danger)] border-[var(--brand-danger)]/20'}`}>
                {msg.text}
              </div>
            )}

            <form onSubmit={handleCreateB2bTransfer} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[var(--text-main)] mb-1.5">Select Device (IMEI, Model, SKU)</label>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    value={deviceSearch}
                    onChange={e => { searchDevices(e.target.value); setSelectedDevice(null); }}
                    placeholder="Type IMEI, Model Name, or SKU..."
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)] text-[var(--text-main)]"
                  />
                </div>
                {searchResults.length > 0 && !selectedDevice && (
                  <div className="border border-[var(--border-base)] bg-[var(--bg-card)] mt-1 overflow-hidden max-h-60 overflow-y-auto z-50 relative">
                    {searchResults.map(d => (
                      <button key={d.id} type="button" onClick={() => { setSelectedDevice(d); setDeviceSearch(d.imei); setSearchResults([]); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-[var(--bg-hover)] text-sm border-b border-[var(--border-base)] last:border-0 transition flex flex-col">
                        <div className="font-semibold text-[var(--text-main)] font-mono">{d.imei}</div>
                        <div className="text-[var(--text-muted)] text-xs mt-0.5">{d.product_name} · {d.color} {d.gb} · <span className="text-[var(--brand-primary)] font-medium">{d.branch_name}</span></div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedDevice && (
                  <div className="mt-2 p-3 bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 text-sm">
                    <div className="font-semibold text-[var(--brand-primary)]">{selectedDevice.product_name}</div>
                    <div className="text-[var(--text-main)] text-xs mt-0.5">IMEI: <span className="font-mono">{selectedDevice.imei}</span> · {selectedDevice.color} {selectedDevice.gb} · Cost Price: €{selectedDevice.cost_price}</div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-main)] mb-1.5">Target Business</label>
                <select value={toB2bBusiness} onChange={e => setToB2bBusiness(e.target.value)} required
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)] text-[var(--text-main)]">
                  <option value="">Select target business...</option>
                  {b2bBusinesses.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-main)] mb-1.5">Notes (optional)</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="E.g., Transfer to business partner..."
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)] text-[var(--text-main)]" />
              </div>

              <button type="submit" disabled={loading || !selectedDevice || !toB2bBusiness}
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] disabled:opacity-50 text-white font-semibold px-6 py-2.5 transition flex items-center gap-2">
                {loading ? <Loader size={15} className="animate-spin" /> : <Share2 size={15} />}
                Initiate B2B Transfer
              </button>
            </form>
          </div>
        )}

        {/* B2B LOGS (INCOMING & OUTGOING) */}
        {tab === 'b2b-list' && (
          <div className="space-y-6">
            {/* INCOMING */}
            <div>
              <h3 className="text-lg font-bold text-[var(--text-main)] mb-3 border-b pb-2 flex items-center gap-2">
                <CornerDownLeft size={18} className="text-[var(--brand-primary)]" />
                Incoming Transfers
              </h3>
              <div className="space-y-2">
                {b2bTransfers.incoming.length === 0 && <div className="text-center text-[var(--text-muted)] py-8 border border-dashed border-[var(--border-base)]">No incoming B2B transfers.</div>}
                {b2bTransfers.incoming.map(t => {
                  const s = statusColors[t.status] || statusColors.pending;
                  const Icon = s.icon;
                  return (
                    <div key={t.id} className="bg-[var(--bg-card)] border border-[var(--border-base)] p-4 flex items-center gap-4">
                      <div className={`p-2 border ${s.bg}`}><Icon size={16} className={s.text} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[var(--text-main)] text-sm">{t.product_name || 'Stock Item'}</span>
                          {t.imei && <span className="text-xs bg-[var(--bg-hover)] border border-[var(--border-base)] text-[var(--text-muted)] px-2 py-0.5 font-mono">{t.imei}</span>}
                          <span className={`text-xs px-2 py-0.5 border ${s.bg} ${s.text}`}>{t.status}</span>
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-1">
                          From business: <span className="font-bold text-[var(--text-main)]">{t.from_business_name}</span> · Cost: €{t.cost_price}
                          {t.notes && ` · "${t.notes}"`}
                          {' · '}{new Date(t.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      {t.status === 'pending' && (
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => respondB2bTransfer(t.id, 'accept')}
                            className="text-xs bg-[var(--brand-success)]/10 hover:bg-[var(--brand-success)]/20 text-[var(--brand-success)] border border-[var(--brand-success)]/20 px-3 py-1.5 font-bold transition">
                            Accept
                          </button>
                          <button onClick={() => respondB2bTransfer(t.id, 'reject')}
                            className="text-xs bg-[var(--brand-danger)]/10 hover:bg-[var(--brand-danger)]/20 text-[var(--brand-danger)] border border-[var(--brand-danger)]/20 px-3 py-1.5 font-bold transition">
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* OUTGOING */}
            <div>
              <h3 className="text-lg font-bold text-[var(--text-main)] mb-3 border-b pb-2 flex items-center gap-2">
                <Share2 size={18} className="text-[var(--brand-primary)]" />
                Outgoing Transfers
              </h3>
              <div className="space-y-2">
                {b2bTransfers.outgoing.length === 0 && <div className="text-center text-[var(--text-muted)] py-8 border border-dashed border-[var(--border-base)]">No outgoing B2B transfers.</div>}
                {b2bTransfers.outgoing.map(t => {
                  const s = statusColors[t.status] || statusColors.pending;
                  const Icon = s.icon;
                  return (
                    <div key={t.id} className="bg-[var(--bg-card)] border border-[var(--border-base)] p-4 flex items-center gap-4">
                      <div className={`p-2 border ${s.bg}`}><Icon size={16} className={s.text} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[var(--text-main)] text-sm">{t.product_name || 'Stock Item'}</span>
                          {t.imei && <span className="text-xs bg-[var(--bg-hover)] border border-[var(--border-base)] text-[var(--text-muted)] px-2 py-0.5 font-mono">{t.imei}</span>}
                          <span className={`text-xs px-2 py-0.5 border ${s.bg} ${s.text}`}>{t.status}</span>
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-1">
                          To business: <span className="font-bold text-[var(--text-main)]">{t.to_business_name}</span> · Cost: €{t.cost_price}
                          {t.notes && ` · "${t.notes}"`}
                          {' · '}{new Date(t.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      {t.status === 'pending' && (
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => cancelB2bTransfer(t.id)}
                            className="text-xs bg-[var(--brand-danger)]/10 hover:bg-[var(--brand-danger)]/20 text-[var(--brand-danger)] border border-[var(--brand-danger)]/20 px-3 py-1.5 font-bold transition">
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* IMEI LOOKUP */}
        {tab === 'lookup' && (
          <div className="max-w-lg">
            <form onSubmit={doLookup} className="flex gap-3 mb-6">
              <input value={imeiLookup} onChange={e => setImeiLookup(e.target.value)} placeholder="Enter IMEI to see full history..." required
                className="flex-1 bg-[var(--bg-input)] border border-[var(--border-base)] px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)] text-[var(--text-main)]" />
              <button type="submit" disabled={lookupLoading}
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white px-5 py-2.5 transition flex items-center gap-2 text-sm font-semibold disabled:opacity-60">
                {lookupLoading ? <Loader size={14} className="animate-spin" /> : <Search size={14} />} Search
              </button>
            </form>

            {lookupResult?.error && (
              <div className="text-[var(--brand-danger)] text-sm bg-[var(--brand-danger)]/10 border border-[var(--brand-danger)]/20 p-3">
                {lookupResult.error}
              </div>
            )}

            {lookupResult?.device && (
              <div>
                <div className="bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 p-4 mb-4 text-[var(--text-main)]">
                  <div className="font-bold text-[var(--brand-primary)]">{lookupResult.device.imei}</div>
                  <div className="text-sm mt-1">Currently at: <strong>{lookupResult.currentBranch?.name}</strong> · Status: {lookupResult.device.status}</div>
                </div>

                <h3 className="text-sm font-bold text-[var(--text-main)] mb-2 uppercase tracking-wide">Transfer History ({lookupResult.transfers.length})</h3>
                {lookupResult.transfers.length === 0 && <div className="text-[var(--text-muted)] text-sm">No transfers recorded for this device.</div>}
                <div className="space-y-2">
                  {lookupResult.transfers.map((t: any) => {
                    const s = statusColors[t.status] || statusColors.pending;
                    const Icon = s.icon;
                    return (
                      <div key={t.id} className="bg-[var(--bg-card)] border border-[var(--border-base)] p-3 flex items-center gap-3">
                        <Icon size={15} className={s.text} />
                        <div className="flex-1 text-sm">
                          <span className="font-semibold text-[var(--text-main)]">{t.from_branch_name}</span>
                          <ArrowRight size={11} className="inline mx-1 text-[var(--text-muted)]" />
                          <span className="font-semibold text-[var(--text-main)]">{t.to_branch_name}</span>
                          <span className={`ml-2 text-xs px-2 py-0.5 border ${s.bg} ${s.text}`}>{t.status}</span>
                          <div className="text-xs text-[var(--text-muted)] mt-1">{new Date(t.created_at).toLocaleString()} · by {t.initiated_by_name}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ACCEPT B2B DIALOG / MODAL */}
      {selectedIncomingTransfer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[var(--bg-card)] border border-[var(--border-base)] w-full max-w-lg p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-main)]">Accept Incoming B2B Transfer</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                You are accepting device <strong>{selectedIncomingTransfer.product_name}</strong> (IMEI: <span className="font-mono">{selectedIncomingTransfer.imei}</span>) from <strong>{selectedIncomingTransfer.from_business_name}</strong>.
              </p>
            </div>

            <form onSubmit={submitAcceptB2b} className="space-y-5">
              {/* Target Branch */}
              <div>
                <label className="block text-sm font-semibold text-[var(--text-main)] mb-1.5">Destination Branch</label>
                <select value={acceptBranch} onChange={e => setAcceptBranch(e.target.value)} required
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] text-[var(--text-main)]">
                  <option value="">Select branch...</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Mode Selection */}
              <div>
                <label className="block text-sm font-semibold text-[var(--text-main)] mb-2">Product Catalog Action</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setAcceptMode('map')}
                    className={`py-2 px-3 border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${acceptMode === 'map' ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]' : 'bg-[var(--bg-hover)]/30 text-[var(--text-muted)] border-[var(--border-base)]'}`}>
                    Link to Existing Product
                  </button>
                  <button type="button" onClick={() => setAcceptMode('create')}
                    className={`py-2 px-3 border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${acceptMode === 'create' ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]' : 'bg-[var(--bg-hover)]/30 text-[var(--text-muted)] border-[var(--border-base)]'}`}>
                    <Plus size={13} /> Auto-Create Product
                  </button>
                </div>
              </div>

              {/* Map Mode */}
              {acceptMode === 'map' && (
                <div>
                  <label className="block text-sm font-semibold text-[var(--text-main)] mb-1.5">Select Local Product SKU</label>
                  <select value={selectedLocalSku} onChange={e => setSelectedLocalSku(e.target.value)} required
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] text-[var(--text-main)] font-sans">
                    <option value="">Select matching product SKU...</option>
                    {localProducts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.product_name} ({p.sku_code || p.barcode}) - €{p.selling_price}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Create Mode */}
              {acceptMode === 'create' && (
                <div className="space-y-4 border border-[var(--border-base)] p-4 bg-[var(--bg-hover)]/10">
                  <div className="text-xs font-bold text-[var(--brand-primary)] uppercase tracking-wide">Auto-Create Product & SKU Details</div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">Product Name</label>
                    <input value={autoProductName} onChange={e => setAutoProductName(e.target.value)} required
                      className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] text-[var(--text-main)]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">SKU Code</label>
                    <input value={autoSkuCode} onChange={e => setAutoSkuCode(e.target.value)} required
                      className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] text-[var(--text-main)] font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">Selling Price (€)</label>
                    <input type="number" step="0.01" value={autoSellingPrice} onChange={e => setAutoSellingPrice(e.target.value)} required placeholder="E.g., 299.99"
                      className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] text-[var(--text-main)]" />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setSelectedIncomingTransfer(null)} disabled={loading}
                  className="px-4 py-2 border border-[var(--border-base)] text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition">
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="px-5 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs font-bold transition flex items-center gap-1.5">
                  {loading && <Loader size={12} className="animate-spin" />}
                  Confirm & Accept
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
