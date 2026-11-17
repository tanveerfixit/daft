import { useState, useEffect } from 'react';
import { Smartphone, Loader, CheckCircle, Eye, EyeOff } from 'lucide-react';

interface Props { token: string; onGoLogin: () => void; }

export default function ResetPassword({ token, onGoLogin }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError('Passwords do not match');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2535] to-[#2c3e50] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#3498db]/20 border border-[#3498db]/40 rounded-2xl mb-4">
            <Smartphone size={32} className="text-[#3498db]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Set New Password</h1>
        </div>

        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8">
          {done ? (
            <div className="text-center py-4">
              <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-2">Password Updated!</h3>
              <p className="text-slate-400 text-sm mb-6">You can now log in with your new password.</p>
              <button onClick={onGoLogin} className="bg-[#3498db] hover:bg-[#2980b9] text-white font-semibold py-2 px-6 rounded-lg transition">Sign In</button>
            </div>
          ) : (
            <>
              {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-3 mb-5 text-sm">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min. 6 characters"
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 pr-10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#3498db]/50 transition" />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm Password</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="••••••••"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#3498db]/50 transition" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-[#3498db] hover:bg-[#2980b9] disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition flex items-center justify-center gap-2 mt-2">
                  {loading ? <><Loader size={16} className="animate-spin" />Updating...</> : 'Update Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
