import React, { useState } from 'react';
import { Smartphone, Mail, Key, ShieldCheck, CheckCircle, ArrowLeft, Loader, Send, KeyRound } from 'lucide-react';

type Step = 'email' | 'otp' | 'password' | 'done';

export default function ForgotPassword({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(0);

  const startTimer = () => {
    setTimer(600);
    const iv = setInterval(() => {
      setTimer(t => { if (t <= 1) { clearInterval(iv); return 0; } return t - 1; });
    }, 1000);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      startTimer();
      setStep('otp');
    } catch { setError('Failed to send OTP. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/auth/verify-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || 'Invalid OTP'); return; }
      setResetToken(data.reset_token);
      setStep('password');
    } catch { setError('Verification failed. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password })
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || 'Reset failed'); return; }
      setStep('done');
    } catch { setError('Reset failed. Please try again.'); }
    finally { setLoading(false); }
  };

  const fmtTimer = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-8 transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#3498db]">Back to login</span>
        </button>

        <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 relative overflow-hidden">
          {/* Progress Indicators */}
          <div className="flex gap-2 mb-8">
            {(['email', 'otp', 'password'] as Step[]).map((s, i) => (
              <div 
                key={s} 
                className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                  (['email', 'otp', 'password'].indexOf(step) >= i) ? 'bg-blue-600' : 'bg-slate-100'
                }`}
              />
            ))}
          </div>

          {step === 'done' ? (
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={40} className="text-green-500" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-3">Password Updated!</h2>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                Your password has been successfully reset. You can now use your new credentials to sign in.
              </p>
              <button 
                onClick={onBack} 
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-all"
              >
                Sign In Now
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-4 text-blue-600">
                  {step === 'email' && <Mail size={24} />}
                  {step === 'otp' && <ShieldCheck size={24} />}
                  {step === 'password' && <KeyRound size={24} />}
                </div>
                <h2 className="text-2xl font-black text-slate-900">
                  {step === 'email' && 'Forgot Password?'}
                  {step === 'otp' && 'Security Code'}
                  {step === 'password' && 'New Password'}
                </h2>
                <p className="text-slate-400 text-sm mt-2 font-medium">
                  {step === 'email' && "Enter your email and we'll send a 6-digit code."}
                  {step === 'otp' && `Enter the authentication code sent to ${email}.`}
                  {step === 'password' && "Create a new secure password for your account."}
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl p-4 mb-6 text-sm font-medium flex items-center gap-3">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  {error}
                </div>
              )}

              {step === 'email' && (
                <form onSubmit={handleSendOtp} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wider">Work Email</label>
                    <input
                      type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all font-medium"
                    />
                  </div>
                  <button type="submit" disabled={loading} 
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader size={20} className="animate-spin" /> : <><Send size={18} /> Send Code</>}
                  </button>
                </form>
              )}

              {step === 'otp' && (
                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">6-Digit Code</label>
                      {timer > 0 ? (
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{fmtTimer(timer)}</span>
                      ) : (
                        <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full">EXPIRED</span>
                      )}
                    </div>
                    <input
                      type="text" required value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                      placeholder="000 000" maxLength={6}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-6 text-slate-900 text-center text-3xl font-black tracking-[0.5em] focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all"
                    />
                  </div>
                  <button type="submit" disabled={loading || otp.length !== 6} 
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-all"
                  >
                    {loading ? <Loader size={20} className="animate-spin" /> : 'Verify & Continue'}
                  </button>
                  <button type="button" onClick={() => { setStep('email'); setOtp(''); setError(''); }} className="w-full text-slate-400 hover:text-slate-600 text-xs font-bold transition-colors">
                    Wait, that's the wrong email
                  </button>
                </form>
              )}

              {step === 'password' && (
                <form onSubmit={handleReset} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wider">New Password</label>
                    <input
                      type="password" required value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wider">Repeat Password</label>
                    <input
                      type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all"
                    />
                  </div>
                  <button type="submit" disabled={loading} 
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all"
                  >
                    {loading ? <Loader size={20} className="animate-spin" /> : 'Confirm New Password'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
