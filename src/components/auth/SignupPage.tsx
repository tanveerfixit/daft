import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Loader, Building2, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface Props {
  onGoLogin: () => void;
}

export default function SignupPage({ onGoLogin }: Props) {
  const { setSession } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    address: '',
    contact: '',
    password: ''
  });

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const setField = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) return setError('Business Name is required');
    if (!form.email.trim()) return setError('Email Address is required');
    if (!form.address.trim()) return setError('Business Address is required');
    if (!form.contact.trim()) return setError('Contact Number is required');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');

    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          address: form.address.trim(),
          contact: form.contact.trim(),
          password: form.password
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register business');

      if (data.token && data.user) {
        setSession(data.token, data.user);
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 font-sans text-slate-900">
        <div className="w-full max-w-[420px] text-center">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={36} strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black text-slate-950 mb-2">Registration Complete!</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              Your business <span className="font-bold text-slate-800">"{form.name}"</span> has been created successfully.
            </p>
            <button
              onClick={onGoLogin}
              className="w-full bg-slate-950 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-slate-900/10"
            >
              Sign In Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans text-slate-900">
      <div className="w-full max-w-[440px]">
        {/* Back to Login Button */}
        <button
          onClick={onGoLogin}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 transition-colors group font-semibold text-xs uppercase tracking-wider"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to Login</span>
        </button>

        {/* Card Container */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-xl shadow-slate-200/50">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-950 text-white rounded-2xl mb-4 shadow-md shadow-slate-950/20">
              <Building2 size={22} strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-black text-slate-950 tracking-tight">Register Business</h1>
            <p className="text-slate-500 text-xs font-medium mt-1.5">Create a new isolated business account</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3.5 mb-6 text-xs font-semibold flex items-center gap-2.5">
              <span className="w-2 h-2 bg-red-500 rounded-full shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Clean 5-Field Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">
                Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={setField('name')}
                required
                autoFocus
                placeholder="e.g. FIXD GORT"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-950 placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-slate-950/10 focus:border-slate-950 focus:bg-white transition-all"
              />
            </div>

            {/* 2. Email */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={setField('email')}
                required
                placeholder="e.g. fixd.gort@gmail.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-950 placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-slate-950/10 focus:border-slate-950 focus:bg-white transition-all"
              />
            </div>

            {/* 3. Address */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">
                Address
              </label>
              <input
                type="text"
                value={form.address}
                onChange={setField('address')}
                required
                placeholder="e.g. 1 Bridge St, Ballyhugh, Gort, Co. Galway"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-950 placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-slate-950/10 focus:border-slate-950 focus:bg-white transition-all"
              />
            </div>

            {/* 4. Contact */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">
                Contact
              </label>
              <input
                type="tel"
                value={form.contact}
                onChange={setField('contact')}
                required
                placeholder="e.g. (089) 981 5157"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-950 placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-slate-950/10 focus:border-slate-950 focus:bg-white transition-all"
              />
            </div>

            {/* 5. Password */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={setField('password')}
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-11 text-sm text-slate-950 placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-slate-950/10 focus:border-slate-950 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                >
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-slate-950 hover:bg-slate-800 active:scale-[0.99] text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-slate-950/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  <span>Registering Business...</span>
                </>
              ) : (
                <span>Register Business</span>
              )}
            </button>
          </form>

          {/* Bottom Login Link */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500 font-medium">
              Already have an account?{' '}
              <button
                onClick={onGoLogin}
                className="text-slate-950 hover:underline font-bold transition-all ml-1 cursor-pointer"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
