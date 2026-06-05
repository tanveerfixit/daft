import { useState, useEffect } from 'react';
import { Smartphone, Eye, EyeOff, Loader, CheckCircle, ArrowLeft, Building2, UserPlus, Search } from 'lucide-react';

interface Props { onGoLogin: () => void; }

type SignupMode = 'staff-join' | 'business-register';

export default function SignupPage({ onGoLogin }: Props) {
  const [mode, setMode] = useState<SignupMode>('staff-join');
  const [branches, setBranches] = useState<any[]>([]);
  const [businessEmail, setBusinessEmail] = useState('');
  const [searchingBranches, setSearchingBranches] = useState(false);
  const [branchesError, setBranchesError] = useState('');
  
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    confirm: '', 
    branch_id: '',
    business_name: '',
    branch_name: '' 
  });
  
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const lookupBranches = async () => {
    if (!businessEmail) return;
    setSearchingBranches(true);
    setBranchesError('');
    try {
      const res = await fetch(`/api/auth/branches-lookup?email=${encodeURIComponent(businessEmail)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Business not found');
      setBranches(data);
    } catch (err: any) {
      setBranchesError(err.message);
      setBranches([]);
    } finally {
      setSearchingBranches(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (form.password !== form.confirm) return setError('Passwords do not match');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mode: mode === 'business-register' ? 'business_register' : 'staff_join',
          name: form.name, 
          email: form.email, 
          password: form.password, 
          branch_id: mode === 'staff-join' ? Number(form.branch_id) : undefined,
          business_name: mode === 'business-register' ? form.business_name : undefined,
          branch_name: mode === 'business-register' ? form.branch_name : undefined
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#ffffff] flex items-center justify-center p-6 font-sans text-slate-900">
        <div className="w-full max-w-md text-center">
          <div className="bg-white border border-slate-200 p-10 rounded-none shadow-sm">
            <div className="w-16 h-16 bg-[#ebf3fe] text-[#00abec] rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-950 mb-3">
              {mode === 'business-register' ? 'Registration Complete!' : 'Request Sent!'}
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              {mode === 'business-register' 
                ? 'Your registration has been submitted successfully. You can now log in to the portal.'
                : 'Your registration request has been sent to the manager. You will receive access once approved.'}
            </p>
            <button 
              onClick={onGoLogin} 
              className="w-full bg-[#00abec] hover:bg-[#0096d2] text-white font-bold py-3 rounded-none transition-all cursor-pointer"
            >
              Sign In Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#ffffff] flex flex-col items-center justify-center p-6 font-sans text-slate-900">
      <div className="w-full max-w-md space-y-6">
        <button 
          onClick={onGoLogin} 
          className="flex items-center gap-2 text-slate-400 hover:text-[#00abec] transition-colors group border-0 bg-transparent cursor-pointer font-bold text-xs uppercase tracking-wider"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to Login</span>
        </button>

        {/* Brand Logo & Header */}
        <div className="flex flex-col items-center text-center">
          <div className="text-[#00abec] mb-4">
            <UserPlus size={44} />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight">Staff Registration</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Join the Phone Lab portal</p>
        </div>

        {/* Mode Toggle */}
        <div className="bg-[#ebf3fe] p-1 rounded-none flex items-center border border-slate-200">
          <button 
            onClick={() => setMode('staff-join')}
            className={`flex-1 py-2 rounded-none text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'staff-join' ? 'bg-[#00abec] text-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <UserPlus size={13} />
            Join Branch
          </button>
          <button 
            onClick={() => setMode('business-register')}
            className={`flex-1 py-2 rounded-none text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'business-register' ? 'bg-[#00abec] text-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building2 size={13} />
            New Business
          </button>
        </div>

        <div className="bg-white border border-slate-200 p-8 rounded-none shadow-sm">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 rounded-none p-3 mb-5 text-xs font-bold flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Common Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <input 
                  type="text" 
                  value={form.name} 
                  onChange={set('name')} 
                  required 
                  placeholder="John Doe"
                  className="w-full bg-[#ebf3fe] border border-slate-200 rounded-none px-4 py-2.5 text-slate-900 focus:outline-none focus:border-[#00abec] focus:bg-white transition-all text-sm font-medium" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Email</label>
                <input 
                  type="email" 
                  value={form.email} 
                  onChange={set('email')} 
                  required 
                  placeholder="you@example.com"
                  className="w-full bg-[#ebf3fe] border border-slate-200 rounded-none px-4 py-2.5 text-slate-900 focus:outline-none focus:border-[#00abec] focus:bg-white transition-all text-sm font-medium" 
                />
              </div>
            </div>

            {mode === 'business-register' ? (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Business Name</label>
                  <input 
                    type="text" 
                    value={form.business_name} 
                    onChange={set('business_name')} 
                    required 
                    placeholder="e.g. Phone Lab"
                    className="w-full bg-[#ebf3fe] border border-slate-200 rounded-none px-4 py-2.5 text-slate-900 focus:outline-none focus:border-[#00abec] focus:bg-white transition-all text-sm font-medium" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">First Branch Name</label>
                  <input 
                    type="text" 
                    value={form.branch_name} 
                    onChange={set('branch_name')} 
                    required 
                    placeholder="e.g. Central Store"
                    className="w-full bg-[#ebf3fe] border border-slate-200 rounded-none px-4 py-2.5 text-slate-900 focus:outline-none focus:border-[#00abec] focus:bg-white transition-all text-sm font-medium" 
                  />
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Find Business</label>
                  <div className="relative">
                    <input 
                      type="email" 
                      value={businessEmail} 
                      onChange={(e) => setBusinessEmail(e.target.value)} 
                      placeholder="Admin email to find branches..."
                      className="w-full bg-[#ebf3fe] border border-slate-200 rounded-none pl-4 pr-12 py-2.5 text-slate-900 focus:outline-none focus:border-[#00abec] focus:bg-white transition-all text-sm font-medium" 
                    />
                    <button 
                      type="button"
                      onClick={lookupBranches}
                      disabled={searchingBranches}
                      className="absolute right-1.5 top-1.5 p-1.5 bg-[#00abec] hover:bg-[#0096d2] text-white rounded-none border-0 transition-colors flex items-center justify-center cursor-pointer"
                    >
                      {searchingBranches ? <Loader size={14} className="animate-spin" /> : <Search size={14} />}
                    </button>
                  </div>
                  {branchesError && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tight">{branchesError}</p>}
                </div>

                {branches.length > 0 && (
                  <div className="space-y-1 animate-in slide-in-from-top duration-300">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Branch</label>
                    <select 
                      value={form.branch_id} 
                      onChange={set('branch_id')} 
                      required
                      className="w-full bg-[#ebf3fe] border border-slate-200 rounded-none px-4 py-2.5 text-slate-900 focus:outline-none focus:border-[#00abec] focus:bg-white transition-all appearance-none cursor-pointer text-sm font-medium"
                    >
                      <option value="">Select your branch...</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                <input 
                  type="password" 
                  value={form.password} 
                  onChange={set('password')} 
                  required 
                  placeholder="••••••••"
                  className="w-full bg-[#ebf3fe] border border-slate-200 rounded-none px-4 py-2.5 text-slate-900 focus:outline-none focus:border-[#00abec] focus:bg-white transition-all text-sm font-medium" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm</label>
                <input 
                  type="password" 
                  value={form.confirm} 
                  onChange={set('confirm')} 
                  required 
                  placeholder="••••••••"
                  className="w-full bg-[#ebf3fe] border border-slate-200 rounded-none px-4 py-2.5 text-slate-900 focus:outline-none focus:border-[#00abec] focus:bg-white transition-all text-sm font-medium" 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#00abec] hover:bg-[#0096d2] disabled:bg-slate-200 text-white font-bold py-3 rounded-none transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer shadow-sm text-sm"
            >
              {loading ? (
                <Loader size={18} className="animate-spin" />
              ) : (
                <>
                  <UserPlus size={16} />
                  {mode === 'business-register' ? 'Register Business' : 'Request Access'}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
