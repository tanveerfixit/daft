import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, 
  GitBranch, 
  Mail, 
  CheckCircle, 
  XCircle, 
  UserX, 
  Edit2, 
  Trash2, 
  Plus, 
  Loader, 
  Save, 
  Eye, 
  EyeOff, 
  Key, 
  Shield, 
  LogOut,
  Building,
  Search,
  Bell,
  Sparkles
} from 'lucide-react';

type Tab = 'users' | 'branches' | 'smtp' | 'access' | 'businesses' | 'announcements';

const statusColors: Record<string, string> = {
  approved: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  pending: 'bg-amber-50 text-amber-600 border-amber-100',
  rejected: 'bg-rose-50 text-rose-600 border-rose-100',
  inactive: 'bg-slate-50 text-slate-500 border-slate-100',
};

export default function AdminPortal({ onClose }: { onClose: () => void }) {
  const { token, currentUser } = useAuth();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [smtp, setSmtp] = useState<any>({ host: 'smtp.hostinger.com', port: 465, secure: true, user: '', pass: '', from_name: 'EPOS', from_email: '' });
  const [showPass, setShowPass] = useState(false);
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpMsg, setSmtpMsg] = useState('');
  const [newBranch, setNewBranch] = useState({ name: '', address: '', phone: '', business_id: '' });
  const [editBranch, setEditBranch] = useState<any>(null);
  const [editUser, setEditUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [accessSettings, setAccessSettings] = useState({ allow_signup: true, allow_signin: true });
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessMsg, setAccessMsg] = useState('');
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [newBusiness, setNewBusiness] = useState({ name: '', email: '', phone: '', address: '', city: '', state: '', zip_code: '', country: 'Ireland' });
  const [showAddBusiness, setShowAddBusiness] = useState(false);
  const [editBusiness, setEditBusiness] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
  const [editAnnouncement, setEditAnnouncement] = useState<any>(null);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    category: 'feature',
    version: 'v2.4',
    summary: '',
    detailsText: ''
  });

  const loadUsers = () => fetch('/api/admin/users', { headers }).then(r => r.json()).then(d => Array.isArray(d) ? setUsers(d) : null);
  const loadBranches = () => fetch('/api/admin/branches', { headers }).then(r => r.json()).then(d => Array.isArray(d) ? setBranches(d) : null);
  const loadSmtp = () => fetch('/api/admin/smtp', { headers }).then(r => r.json()).then(setSmtp);
  const loadAccess = () => fetch('/api/settings', { headers }).then(r => r.json()).then(s => {
    if (s) setAccessSettings({ allow_signup: s.allow_signup !== 0, allow_signin: s.allow_signin !== 0 });
  });
  const loadBusinesses = () => {
    fetch('/api/admin/system/businesses', { headers })
      .then(r => r.json())
      .then(d => Array.isArray(d) ? setBusinesses(d) : null);
  };
  const loadAnnouncements = () => {
    fetch('/api/admin/announcements', { headers })
      .then(r => r.json())
      .then(d => Array.isArray(d) ? setAnnouncements(d) : null);
  };

  useEffect(() => { 
    loadUsers(); 
    loadBranches(); 
    loadSmtp(); 
    loadAccess(); 
    loadBusinesses(); 
    loadAnnouncements();
  }, []);

  const pendingCount = Array.isArray(users) ? users.filter(u => u.status === 'pending').length : 0;
  const pendingBusinessCount = Array.isArray(businesses) ? businesses.filter(b => b.status === 'inactive' || b.status === 'pending').length : 0;

  const showMsg = (msg: string) => { setActionMsg(msg); setTimeout(() => setActionMsg(''), 3000); };
  const showSmtpMsg = (msg: string) => { setSmtpMsg(msg); setTimeout(() => setSmtpMsg(''), 4000); };
  const showAccessMsg = (msg: string) => { setAccessMsg(msg); setTimeout(() => setAccessMsg(''), 4000); };

  const updateStatus = async (userId: number, status: string) => {
    await fetch(`/api/admin/users/${userId}/status`, { method: 'PUT', headers, body: JSON.stringify({ status }) });
    loadUsers();
  };

  const deleteUser = async (userId: number) => {
    if (!confirm('Remove this user permanently?')) return;
    await fetch(`/api/admin/users/${userId}`, { method: 'DELETE', headers });
    loadUsers();
  };

  const saveUser = async () => {
    if (!editUser) return;
    setLoading(true);
    const r = await fetch(`/api/admin/users/${editUser.id}`, {
      method: 'PUT', headers,
      body: JSON.stringify({ 
        name: editUser.name, 
        email: editUser.email, 
        branch_id: editUser.branch_id, 
        role: editUser.role, 
        password: editUser.newPassword || undefined 
      }),
    });
    const data = await r.json();
    showMsg(r.ok ? '✓ Staff member updated successfully' : `✗ ${data.error || 'Failed to update staff member'}`);
    setEditUser(null); setLoading(false); loadUsers();
  };

  const resetUserPassword = async (userId: number, userName: string) => {
    if (!confirm(`Reset password for ${userName} and send it by email?`)) return;
    setLoading(true);
    const r = await fetch(`/api/admin/users/${userId}/reset-password`, { method: 'POST', headers });
    const data = await r.json();
    showMsg(r.ok ? `✓ ${data.message}` : `✗ ${data.error}`);
    setLoading(false);
  };

  const createBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranch.name.trim()) return;
    const res = await fetch('/api/admin/branches', { 
      method: 'POST', 
      headers, 
      body: JSON.stringify({
        ...newBranch,
        business_id: newBranch.business_id ? Number(newBranch.business_id) : currentUser?.business_id
      }) 
    });
    if (res.ok) {
      setNewBranch({ name: '', address: '', phone: '', business_id: '' });
      showMsg('✓ Branch created successfully');
      loadBranches();
    }
  };

  const saveBranch = async () => {
    if (!editBranch) return;
    setLoading(true);
    const res = await fetch(`/api/admin/branches/${editBranch.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(editBranch)
    });
    if (res.ok) {
      setEditBranch(null);
      showMsg('✓ Branch updated successfully');
      loadBranches();
    }
    setLoading(false);
  };

  const deleteBranch = async (branchId: number) => {
    if (!confirm('Deactivate this branch?')) return;
    const res = await fetch(`/api/admin/branches/${branchId}`, { method: 'DELETE', headers });
    if (res.ok) {
      showMsg('✓ Branch deactivated');
      loadBranches();
    }
  };

  const createBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBusiness.name.trim()) return;
    setLoading(true);
    const res = await fetch('/api/admin/system/businesses', {
      method: 'POST',
      headers,
      body: JSON.stringify(newBusiness)
    });
    const data = await res.json();
    if (res.ok) {
      setNewBusiness({ name: '', email: '', phone: '', address: '', city: '', state: '', zip_code: '', country: 'Ireland' });
      setShowAddBusiness(false);
      showMsg('✓ Business created successfully');
      loadBusinesses();
      loadBranches();
    } else {
      showMsg(`✗ ${data.error || 'Failed to create business'}`);
    }
    setLoading(false);
  };

  const saveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmtpLoading(true); setSmtpMsg('');
    try {
      const res = await fetch('/api/admin/smtp', { method: 'PUT', headers, body: JSON.stringify({ ...smtp, secure: smtp.secure ? 1 : 0 }) });
      showSmtpMsg(res.ok ? '✓ Settings saved' : '✗ Failed to save');
    } finally { setSmtpLoading(false); }
  };

  const testSmtp = async () => {
    setSmtpLoading(true); setSmtpMsg('');
    try {
      const res = await fetch('/api/admin/smtp/test', { method: 'POST', headers });
      const data = await res.json();
      showSmtpMsg(res.ok ? `✓ ${data.message}` : `✗ ${data.error}`);
    } finally { setSmtpLoading(false); }
  };

  const saveAccess = async () => {
    setAccessLoading(true); setAccessMsg('');
    try {
      const res = await fetch('/api/settings/auth', { method: 'POST', headers, body: JSON.stringify(accessSettings) });
      showAccessMsg(res.ok ? '✓ Saved' : '✗ Failed to save');
    } finally { setAccessLoading(false); }
  };

  const updateBusinessStatus = async (businessId: number, status: string) => {
    await fetch(`/api/admin/system/businesses/${businessId}/status`, { method: 'PUT', headers, body: JSON.stringify({ status }) });
    loadBusinesses();
  };

  const saveBusiness = async () => {
    if (!editBusiness) return;
    setLoading(true);
    await fetch(`/api/admin/system/businesses/${editBusiness.id}`, {
      method: 'PUT', headers,
      body: JSON.stringify(editBusiness),
    });
    setEditBusiness(null); setLoading(false); loadBusinesses();
  };

  const filteredUsers = Array.isArray(users) ? users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  const createAnnouncement = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.summary.trim()) {
      alert('Please provide a title and summary.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: newAnnouncement.title,
          category: newAnnouncement.category,
          version: newAnnouncement.version,
          summary: newAnnouncement.summary,
          details: newAnnouncement.detailsText.split('\n').map(s => s.trim()).filter(Boolean)
        })
      });
      if (res.ok) {
        showMsg('✓ Announcement broadcasted');
        setShowAddAnnouncement(false);
        setNewAnnouncement({ title: '', category: 'feature', version: 'v2.4', summary: '', detailsText: '' });
        loadAnnouncements();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to publish announcement');
      }
    } finally {
      setLoading(false);
    }
  };

  const saveEditAnnouncement = async () => {
    if (!editAnnouncement || !editAnnouncement.title.trim() || !editAnnouncement.summary.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/announcements/${editAnnouncement.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          title: editAnnouncement.title,
          category: editAnnouncement.category,
          version: editAnnouncement.version,
          summary: editAnnouncement.summary,
          details: Array.isArray(editAnnouncement.details) 
            ? editAnnouncement.details 
            : (typeof editAnnouncement.details === 'string' ? editAnnouncement.details.split('\n').map((s: string) => s.trim()).filter(Boolean) : [])
        })
      });
      if (res.ok) {
        showMsg('✓ Announcement updated');
        setEditAnnouncement(null);
        loadAnnouncements();
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm('Delete this announcement? It will be removed from all POS devices.')) return;
    const res = await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE', headers });
    if (res.ok) {
      showMsg('✓ Announcement deleted');
      loadAnnouncements();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex font-sans bg-slate-50 text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center">
              <Shield size={18} className="text-white" />
            </div>
            <span className="font-bold text-slate-900">Admin Panel</span>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'users', label: 'Staff', icon: Users, badge: pendingCount },
              { id: 'branches', label: 'Branches', icon: GitBranch },
              { id: 'businesses', label: 'Businesses', icon: Building, badge: pendingBusinessCount },
              { id: 'announcements', label: 'Announcements', icon: Bell },
              { id: 'smtp', label: 'Email', icon: Mail },
              { id: 'access', label: 'Security', icon: Shield },
            ].map(t => (
              <button 
                key={t.id} 
                onClick={() => setTab(t.id as Tab)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium ${
                  tab === t.id 
                    ? 'bg-slate-100 text-slate-900' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <t.icon size={16} />
                <span className="flex-1 text-left">{t.label}</span>
                {t.badge > 0 && (
                  <span className="px-1.5 py-0.5 bg-slate-900 text-white text-[10px] rounded font-bold">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100 mt-auto">
          <button 
            onClick={onClose}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-900 rounded-md transition-colors"
          >
            <LogOut size={14} /> Exit Admin
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col min-w-0 bg-slate-50">
        <header className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="font-bold text-slate-900 capitalize">{tab} Management</h2>
            {actionMsg && (
              <span className="text-xs bg-slate-900 text-white px-2 py-1 rounded animate-fade-in font-medium">
                {actionMsg}
              </span>
            )}
          </div>
        </header>

        <div className="p-8 flex-1 min-w-0">
          <div className="max-w-5xl mx-auto">
            {/* USERS TAB */}
            {tab === 'users' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search staff members..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-xs outline-none focus:border-slate-400 font-medium"
                    />
                  </div>
                </div>

                {editUser && (
                  <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm mb-6">
                    <h4 className="font-bold mb-4">Edit Staff Member</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Name</label>
                        <input value={editUser.name} onChange={e => setEditUser({ ...editUser, name: e.target.value })}
                          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-slate-400" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Login Email Address</label>
                        <input type="email" value={editUser.email || ''} onChange={e => setEditUser({ ...editUser, email: e.target.value })}
                          placeholder="e.g. staff@gmail.com"
                          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-slate-400" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Branch</label>
                        <select value={editUser.branch_id || ''} onChange={e => setEditUser({ ...editUser, branch_id: Number(e.target.value) })}
                          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-slate-400 bg-white">
                          <option value="">Select Branch</option>
                          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Role</label>
                        <select value={editUser.role} onChange={e => setEditUser({ ...editUser, role: e.target.value })}
                          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-slate-400 bg-white">
                          <option value="staff">Staff</option>
                          <option value="superadmin">Superadmin</option>
                          <option value="developer">Developer</option>
                        </select>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Set New Password</label>
                        <input type="password" value={editUser.newPassword || ''} onChange={e => setEditUser({ ...editUser, newPassword: e.target.value })}
                          placeholder="Leave blank to keep current password"
                          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-slate-400" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveUser} disabled={loading} className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2">
                        {loading && <Loader size={14} className="animate-spin" />} Save Changes
                      </button>
                      <button onClick={() => setEditUser(null)} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-md text-sm font-bold">Cancel</button>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-6 py-3">Staff</th>
                        <th className="px-6 py-3">Role</th>
                        <th className="px-6 py-3">Branch</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">{u.name}</div>
                            <div className="text-[11px] text-slate-400">{u.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="capitalize px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-600">
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-600">
                            {u.branch_name || '—'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${statusColors[u.status] || statusColors.inactive}`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {u.status === 'pending' && (
                                <>
                                  <button onClick={() => updateStatus(u.id, 'approved')} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><CheckCircle size={16} /></button>
                                  <button onClick={() => updateStatus(u.id, 'rejected')} className="p-1 text-rose-600 hover:bg-rose-50 rounded"><XCircle size={16} /></button>
                                </>
                              )}
                              {u.status === 'approved' && (
                                <button onClick={() => updateStatus(u.id, 'inactive')} className="p-1 text-amber-600 hover:bg-amber-50 rounded" title="Deactivate"><UserX size={16} /></button>
                              )}
                              {u.status === 'inactive' && (
                                <button onClick={() => updateStatus(u.id, 'approved')} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Reactivate"><CheckCircle size={16} /></button>
                              )}
                              <button onClick={() => resetUserPassword(u.id, u.name)} className="p-1 text-slate-400 hover:text-slate-900 rounded" title="Reset Password"><Key size={16} /></button>
                              <button onClick={() => setEditUser(u)} className="p-1 text-slate-400 hover:text-slate-900 rounded" title="Edit"><Edit2 size={16} /></button>
                              <button onClick={() => deleteUser(u.id)} className="p-1 text-rose-400 hover:text-rose-600 rounded" title="Delete"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* BRANCHES TAB */}
            {tab === 'branches' && (
              <div className="space-y-6">
                {editBranch && (
                  <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm mb-6">
                    <h4 className="font-bold mb-4">Edit Branch</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Branch Name</label>
                        <input value={editBranch.name || ''} onChange={e => setEditBranch({ ...editBranch, name: e.target.value })}
                          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-slate-400" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Assigned Business</label>
                        <select value={editBranch.business_id || ''} onChange={e => setEditBranch({ ...editBranch, business_id: Number(e.target.value) })}
                          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-slate-400 bg-white">
                          {businesses.map(b => <option key={b.id} value={b.id}>{b.name} (ID: {b.id})</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Phone</label>
                        <input value={editBranch.phone || ''} onChange={e => setEditBranch({ ...editBranch, phone: e.target.value })}
                          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-slate-400" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Status</label>
                        <select value={editBranch.status || 'active'} onChange={e => setEditBranch({ ...editBranch, status: e.target.value })}
                          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-slate-400 bg-white">
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Address</label>
                        <input value={editBranch.address || ''} onChange={e => setEditBranch({ ...editBranch, address: e.target.value })}
                          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-slate-400" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveBranch} disabled={loading} className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2">
                        {loading && <Loader size={14} className="animate-spin" />} Save Changes
                      </button>
                      <button onClick={() => setEditBranch(null)} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-md text-sm font-bold">Cancel</button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 rounded-lg p-6">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Plus size={16} /> Add Branch</h3>
                    <form onSubmit={createBranch} className="space-y-3">
                      {businesses.length > 0 && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Business</label>
                          <select 
                            value={newBranch.business_id} 
                            onChange={e => setNewBranch({ ...newBranch, business_id: e.target.value })}
                            className="w-full border border-slate-200 rounded-md px-3 py-2 text-xs outline-none focus:border-slate-400 bg-white"
                          >
                            <option value="">Current Business ({currentUser?.business_name || 'Primary'})</option>
                            {businesses.map(b => (
                              <option key={b.id} value={b.id}>{b.name} (ID: {b.id})</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <input value={newBranch.name} onChange={e => setNewBranch({ ...newBranch, name: e.target.value })} required 
                        placeholder="Branch Name" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-slate-400" />
                      <input value={newBranch.address} onChange={e => setNewBranch({ ...newBranch, address: e.target.value })}
                        placeholder="Address" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-slate-400" />
                      <input value={newBranch.phone} onChange={e => setNewBranch({ ...newBranch, phone: e.target.value })}
                        placeholder="Phone" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-slate-400" />
                      <button type="submit" className="w-full bg-slate-900 text-white font-bold py-2 rounded-md text-sm mt-2">Save Branch</button>
                    </form>
                  </div>

                  {branches.map(b => (
                    <div key={b.id} className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between group">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded flex items-center justify-center font-bold">{b.name.charAt(0)}</div>
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${statusColors[b.status] || statusColors.active}`}>
                              {b.status || 'active'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-300">ID {b.id}</span>
                          </div>
                        </div>
                        <h4 className="font-bold text-slate-900">{b.name}</h4>
                        {b.business_name && (
                          <div className="text-[10px] font-bold text-blue-600 uppercase mt-0.5 tracking-wider">
                            Business: {b.business_name}
                          </div>
                        )}
                        <p className="text-xs text-slate-500 mt-2">{b.address || 'No address provided'}</p>
                        <div className="text-xs font-bold text-slate-900 mt-3">{b.phone || 'No phone'}</div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
                        <button onClick={() => setEditBranch(b)} className="p-1.5 text-slate-400 hover:text-slate-900 rounded"><Edit2 size={15} /></button>
                        <button onClick={() => deleteBranch(b.id)} className="p-1.5 text-rose-400 hover:text-rose-600 rounded"><Trash2 size={15} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BUSINESSES TAB */}
            {tab === 'businesses' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">Manage Businesses</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Register, update, and manage all business accounts</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {pendingBusinessCount > 0 && (
                      <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-md">
                        {pendingBusinessCount} PENDING APPROVAL
                      </span>
                    )}
                    <button
                      onClick={() => setShowAddBusiness(!showAddBusiness)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-md text-xs flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Plus size={14} /> Add Business
                    </button>
                  </div>
                </div>

                {showAddBusiness && (
                  <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm mb-6">
                    <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Plus size={16} /> New Business Registration</h4>
                    <form onSubmit={createBusiness} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Business Name *</label>
                          <input value={newBusiness.name} onChange={e => setNewBusiness({ ...newBusiness, name: e.target.value })} required
                            placeholder="e.g. FIXD GORT"
                            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-slate-400" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Email</label>
                          <input type="email" value={newBusiness.email} onChange={e => setNewBusiness({ ...newBusiness, email: e.target.value })}
                            placeholder="e.g. fixd.gort@gmail.com"
                            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-slate-400" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Phone / Contact</label>
                          <input value={newBusiness.phone} onChange={e => setNewBusiness({ ...newBusiness, phone: e.target.value })}
                            placeholder="e.g. (089) 981 5157"
                            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-slate-400" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">City</label>
                          <input value={newBusiness.city} onChange={e => setNewBusiness({ ...newBusiness, city: e.target.value })}
                            placeholder="e.g. Gort"
                            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-slate-400" />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Address</label>
                          <input value={newBusiness.address} onChange={e => setNewBusiness({ ...newBusiness, address: e.target.value })}
                            placeholder="e.g. 1 Bridge St, Ballyhugh, Gort, Co. Galway"
                            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-slate-400" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" disabled={loading} className="bg-slate-900 text-white font-bold px-4 py-2 rounded-md text-sm flex items-center gap-2">
                          {loading && <Loader size={14} className="animate-spin" />} Save Business
                        </button>
                        <button type="button" onClick={() => setShowAddBusiness(false)} className="bg-slate-100 text-slate-600 font-bold px-4 py-2 rounded-md text-sm">Cancel</button>
                      </div>
                    </form>
                  </div>
                )}

                {editBusiness && (
                  <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm mb-6">
                    <h4 className="font-bold mb-4">Edit Business</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Name</label>
                        <input value={editBusiness.name || ''} onChange={e => setEditBusiness({ ...editBusiness, name: e.target.value })}
                          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-slate-400" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Phone</label>
                        <input value={editBusiness.phone || ''} onChange={e => setEditBusiness({ ...editBusiness, phone: e.target.value })}
                          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-slate-400" />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Address</label>
                        <input value={editBusiness.address || ''} onChange={e => setEditBusiness({ ...editBusiness, address: e.target.value })}
                          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-slate-400" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveBusiness} disabled={loading} className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2">
                        {loading && <Loader size={14} className="animate-spin" />} Save Changes
                      </button>
                      <button onClick={() => setEditBusiness(null)} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-md text-sm font-bold">Cancel</button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3">
                  {businesses.map(b => (
                    <div key={b.id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between group hover:border-slate-300 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-md flex items-center justify-center font-bold text-slate-600">{b.name.charAt(0)}</div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-bold text-slate-900">{b.name}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${statusColors[b.status] || statusColors.inactive}`}>{b.status}</span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {b.id}</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {b.email || 'No email'} {b.phone ? `• ${b.phone}` : ''} {b.address ? `• ${b.address}` : ''}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(b.status === 'inactive' || b.status === 'pending') && (
                          <button onClick={() => updateBusinessStatus(b.id, 'active')} className="px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-bold uppercase rounded transition-colors hover:bg-emerald-700">Approve / Activate</button>
                        )}
                        {b.status === 'active' && (
                          <button onClick={() => updateBusinessStatus(b.id, 'inactive')} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded transition-colors hover:bg-rose-50 hover:text-rose-600">Deactivate</button>
                        )}
                        <button onClick={() => setEditBusiness(b)} className="p-2 text-slate-400 hover:text-slate-900 rounded"><Edit2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SMTP TAB */}
            {tab === 'smtp' && (
              <div className="max-w-2xl bg-white border border-slate-200 rounded-lg p-8">
                <h3 className="text-lg font-bold mb-6">Email Settings</h3>
                <form onSubmit={saveSmtp} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">SMTP Host</label>
                      <input value={smtp.host} onChange={e => setSmtp({ ...smtp, host: e.target.value })}
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-slate-400" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Port</label>
                      <input type="number" value={smtp.port} onChange={e => setSmtp({ ...smtp, port: Number(e.target.value) })}
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-slate-400" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={smtp.secure} onChange={e => setSmtp({ ...smtp, secure: e.target.checked })} id="secure" className="w-4 h-4 rounded border-slate-300" />
                    <label htmlFor="secure" className="text-xs font-bold text-slate-700">Use SSL/TLS</label>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Email User</label>
                      <input type="email" value={smtp.user} onChange={e => setSmtp({ ...smtp, user: e.target.value })}
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-slate-400" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Password</label>
                      <div className="relative">
                        <input type={showPass ? 'text' : 'password'} value={smtp.pass} onChange={e => setSmtp({ ...smtp, pass: e.target.value })}
                          className="w-full border border-slate-200 rounded-md pl-3 pr-10 py-2 text-sm outline-none focus:border-slate-400" />
                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900">
                          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Sender Name</label>
                      <input value={smtp.from_name} onChange={e => setSmtp({ ...smtp, from_name: e.target.value })}
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-slate-400" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Sender Email</label>
                      <input type="email" value={smtp.from_email} onChange={e => setSmtp({ ...smtp, from_email: e.target.value })}
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-slate-400" />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button type="submit" disabled={smtpLoading} className="flex-1 bg-slate-900 text-white font-bold py-2.5 rounded-md text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                      {smtpLoading && <Loader size={14} className="animate-spin" />} Save Settings
                    </button>
                    <button type="button" onClick={testSmtp} disabled={smtpLoading} className="px-6 bg-slate-100 text-slate-900 font-bold py-2.5 rounded-md text-sm border border-slate-200 flex items-center justify-center gap-2">
                      {smtpLoading && <Loader size={14} className="animate-spin" />} Send Test
                    </button>
                  </div>
                </form>
                {smtpMsg && (
                  <div className={`mt-4 p-3 rounded text-xs font-bold border ${smtpMsg.startsWith('✓') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                    {smtpMsg}
                  </div>
                )}
              </div>
            )}

            {/* SECURITY TAB */}
            {tab === 'access' && (
              <div className="max-w-2xl space-y-6">
                <div className="bg-white border border-slate-200 rounded-lg p-8">
                  <h3 className="text-lg font-bold mb-2">System Settings</h3>
                  <p className="text-xs text-slate-500 mb-8">Global rules for account access and registration.</p>

                  <div className="space-y-4">
                    {[
                      { 
                        id: 'allow_signup', 
                        label: 'Allow Sign Up', 
                        desc: 'Permit new staff to register accounts',
                        active: accessSettings.allow_signup,
                        icon: Users
                      },
                      { 
                        id: 'allow_signin', 
                        label: 'Allow Sign In', 
                        desc: 'Global switch to enable/disable all logins',
                        active: accessSettings.allow_signin,
                        icon: Shield
                      }
                    ].map(policy => (
                      <div key={policy.id} className="flex items-center justify-between p-5 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded flex items-center justify-center border ${
                            policy.active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-300 border-slate-200'
                          }`}>
                            <policy.icon size={18} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{policy.label}</h4>
                            <p className="text-[11px] text-slate-500">{policy.desc}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setAccessSettings(a => ({ ...a, [policy.id]: !(a as any)[policy.id] }))}
                          className={`w-20 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
                            policy.active 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {policy.active ? 'Active' : 'Locked'}
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="pt-8">
                    <button onClick={saveAccess} disabled={accessLoading}
                      className="w-full bg-slate-900 text-white font-bold py-3 rounded-md text-sm flex items-center justify-center gap-2">
                      {accessLoading && <Loader size={16} className="animate-spin" />} Save Settings
                    </button>
                    {accessMsg && (
                      <div className={`mt-4 text-center text-xs font-bold ${accessMsg.startsWith('✓') ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {accessMsg}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ANNOUNCEMENTS TAB */}
            {tab === 'announcements' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">
                      Active Broadcasts ({announcements.length})
                    </span>
                  </div>
                  <button
                    onClick={() => setShowAddAnnouncement(true)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus size={14} /> Broadcast Announcement
                  </button>
                </div>

                {/* Announcement Cards List */}
                <div className="grid grid-cols-1 gap-4">
                  {announcements.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 bg-white border border-slate-200 rounded-lg text-sm">
                      No announcements broadcasted yet. Click "Broadcast Announcement" to create one.
                    </div>
                  ) : (
                    announcements.map((item) => (
                      <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs hover:border-slate-300 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-col gap-1.5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                                item.category === 'feature'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : item.category === 'setting'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {item.category}
                              </span>
                              {item.version && (
                                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                  {item.version}
                                </span>
                              )}
                              <span className="text-xs text-slate-400">
                                {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>

                            <h3 className="text-base font-bold text-slate-900 mt-1">
                              {item.title}
                            </h3>

                            <p className="text-sm text-slate-600 leading-relaxed">
                              {item.summary}
                            </p>

                            {item.details && item.details.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-slate-100">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                  Key Points & Release Notes:
                                </span>
                                <ul className="list-disc list-inside space-y-0.5 text-xs text-slate-600">
                                  {item.details.map((d: string, idx: number) => (
                                    <li key={idx}>{d}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => setEditAnnouncement({
                                ...item,
                                details: Array.isArray(item.details) ? item.details.join('\n') : (item.details || '')
                              })}
                              className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                              title="Edit Announcement"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => deleteAnnouncement(item.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Delete Announcement"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* MODAL: ADD ANNOUNCEMENT */}
                {showAddAnnouncement && (
                  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4">
                    <div className="bg-white rounded-lg w-full max-w-lg shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 bg-red-100 text-red-600 rounded">
                            <Bell size={16} />
                          </span>
                          <h3 className="font-bold text-slate-900 text-base">New System Announcement</h3>
                        </div>
                        <button onClick={() => setShowAddAnnouncement(false)} className="text-slate-400 hover:text-slate-900 text-lg font-bold">✕</button>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Title *</label>
                          <input
                            type="text"
                            placeholder="e.g. Single Product Details Page Redesign"
                            value={newAnnouncement.title}
                            onChange={e => setNewAnnouncement(a => ({ ...a, title: e.target.value }))}
                            className="w-full border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:border-slate-900"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="font-bold text-slate-700 block mb-1">Category</label>
                            <select
                              value={newAnnouncement.category}
                              onChange={e => setNewAnnouncement(a => ({ ...a, category: e.target.value }))}
                              className="w-full border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:border-slate-900 bg-white"
                            >
                              <option value="feature">🚀 New Feature</option>
                              <option value="setting">⚙️ Setting Update</option>
                              <option value="system">📢 System Update</option>
                            </select>
                          </div>
                          <div>
                            <label className="font-bold text-slate-700 block mb-1">Version Tag</label>
                            <input
                              type="text"
                              placeholder="e.g. v2.4"
                              value={newAnnouncement.version}
                              onChange={e => setNewAnnouncement(a => ({ ...a, version: e.target.value }))}
                              className="w-full border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:border-slate-900 font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Summary / Short Message *</label>
                          <textarea
                            rows={2}
                            placeholder="Brief description of the changes or news..."
                            value={newAnnouncement.summary}
                            onChange={e => setNewAnnouncement(a => ({ ...a, summary: e.target.value }))}
                            className="w-full border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:border-slate-900"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Key Points / Release Bullets (one per line)</label>
                          <textarea
                            rows={3}
                            placeholder={"- First feature detail\n- Second feature detail"}
                            value={newAnnouncement.detailsText}
                            onChange={e => setNewAnnouncement(a => ({ ...a, detailsText: e.target.value }))}
                            className="w-full border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:border-slate-900 font-sans"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => setShowAddAnnouncement(false)}
                          className="px-4 py-2 border border-slate-200 rounded text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={createAnnouncement}
                          disabled={loading}
                          className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2 rounded text-xs flex items-center gap-2 cursor-pointer shadow-xs"
                        >
                          {loading && <Loader size={14} className="animate-spin" />}
                          Publish Broadcast
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODAL: EDIT ANNOUNCEMENT */}
                {editAnnouncement && (
                  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4">
                    <div className="bg-white rounded-lg w-full max-w-lg shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 bg-slate-100 text-slate-700 rounded">
                            <Edit2 size={16} />
                          </span>
                          <h3 className="font-bold text-slate-900 text-base">Edit Announcement</h3>
                        </div>
                        <button onClick={() => setEditAnnouncement(null)} className="text-slate-400 hover:text-slate-900 text-lg font-bold">✕</button>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Title *</label>
                          <input
                            type="text"
                            value={editAnnouncement.title}
                            onChange={e => setEditAnnouncement((a: any) => ({ ...a, title: e.target.value }))}
                            className="w-full border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:border-slate-900"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="font-bold text-slate-700 block mb-1">Category</label>
                            <select
                              value={editAnnouncement.category}
                              onChange={e => setEditAnnouncement((a: any) => ({ ...a, category: e.target.value }))}
                              className="w-full border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:border-slate-900 bg-white"
                            >
                              <option value="feature">🚀 New Feature</option>
                              <option value="setting">⚙️ Setting Update</option>
                              <option value="system">📢 System Update</option>
                            </select>
                          </div>
                          <div>
                            <label className="font-bold text-slate-700 block mb-1">Version Tag</label>
                            <input
                              type="text"
                              value={editAnnouncement.version || ''}
                              onChange={e => setEditAnnouncement((a: any) => ({ ...a, version: e.target.value }))}
                              className="w-full border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:border-slate-900 font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Summary *</label>
                          <textarea
                            rows={2}
                            value={editAnnouncement.summary}
                            onChange={e => setEditAnnouncement((a: any) => ({ ...a, summary: e.target.value }))}
                            className="w-full border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:border-slate-900"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Key Points / Bullets (one per line)</label>
                          <textarea
                            rows={3}
                            value={editAnnouncement.details}
                            onChange={e => setEditAnnouncement((a: any) => ({ ...a, details: e.target.value }))}
                            className="w-full border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:border-slate-900 font-sans"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => setEditAnnouncement(null)}
                          className="px-4 py-2 border border-slate-200 rounded text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={saveEditAnnouncement}
                          disabled={loading}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2 rounded text-xs flex items-center gap-2 cursor-pointer shadow-xs"
                        >
                          {loading && <Loader size={14} className="animate-spin" />}
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
