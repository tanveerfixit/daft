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
    } catch { setError('Failed to send verification code. Please try again.'); }
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
      if (!r.ok) { setError(data.error || 'Invalid code'); return; }
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
    <div className="min-h-screen bg-[#ffffff] flex flex-col items-center justify-center p-6 font-sans text-slate-900">
      <div className="w-full max-w-md space-y-6">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-slate-400 hover:text-[#00abec] transition-colors group border-0 bg-transparent cursor-pointer font-bold text-xs uppercase tracking-wider"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to Login</span>
        </button>

        <div className="bg-white border border-slate-200 p-8 rounded-none shadow-sm relative overflow-hidden">
          {/* Progress Indicators */}
          <div className="flex gap-2 mb-8">
            {(['email', 'otp', 'password'] as Step[]).map((s, i) => (
              <div 
                key={s} 
                className={`flex-1 h-1.5 rounded-none transition-all duration-500 ${
                  (['email', 'otp', 'password'].indexOf(step) >= i) ? 'bg-[#00abec]' : 'bg-slate-100'
                }`}
              />
            ))}
          </div>

          {step === 'done' ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-[#ebf3fe] text-[#00abec] rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-950 mb-3">Password Updated!</h2>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                Your password has been successfully reset. You can now use your new credentials to sign in.
              </p>
              <button 
                onClick={onBack} 
                className="w-full bg-[#00abec] hover:bg-[#0096d2] text-white font-bold py-3 rounded-none transition-all cursor-pointer shadow-sm text-sm"
              >
                Sign In Now
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-col items-center text-center">
                <div className="text-[#00abec] mb-4">
                  {step === 'email' && <Mail size={36} />}
                  {step === 'otp' && <ShieldCheck size={36} />}
                  {step === 'password' && <KeyRound size={36} />}
                </div>
                <h2 className="text-xl font-bold text-slate-950">
                  {step === 'email' && 'Forgot Password?'}
                  {step === 'otp' && 'Security Code'}
                  {step === 'password' && 'New Password'}
                </h2>
                <p className="text-slate-400 text-sm mt-1 font-medium">
                  {step === 'email' && "Enter your email and we'll send a verification code."}
                  {step === 'otp' && `Enter the authentication code sent to ${email}.`}
                  {step === 'password' && "Create a new secure password for your account."}
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 rounded-none p-3 mb-5 text-xs font-bold flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  {error}
                </div>
              )}

              {step === 'email' && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                    <input
                      type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full bg-[#ebf3fe] border border-slate-200 rounded-none px-4 py-2.5 text-slate-900 focus:outline-none focus:border-[#00abec] focus:bg-white transition-all text-sm font-medium"
                    />
                  </div>
                  <button type="submit" disabled={loading} 
                    className="w-full bg-[#00abec] hover:bg-[#0096d2] text-white font-bold py-3 rounded-none transition-all flex items-center justify-center gap-2 shadow-sm text-sm"
                  >
                    {loading ? <Loader size={18} className="animate-spin" /> : <><Send size={16} /> Send Code</>}
                  </button>
                </form>
              )}

              {step === 'otp' && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verification Code</label>
                      {timer > 0 ? (
                        <span className="text-[10px] font-bold text-[#00abec] bg-[#ebf3fe] px-2 py-0.5 rounded-none">{fmtTimer(timer)}</span>
                      ) : (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-none">EXPIRED</span>
                      )}
                    </div>
                    <input
                      type="text" required value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                      placeholder="000000" maxLength={6}
                      className="w-full bg-[#ebf3fe] border border-slate-200 rounded-none px-4 py-3 text-slate-900 text-center text-2xl font-bold tracking-[0.2em] focus:outline-none focus:border-[#00abec] focus:bg-white transition-all font-mono"
                    />
                  </div>
                  <button type="submit" disabled={loading || otp.length !== 6} 
                    className="w-full bg-[#00abec] hover:bg-[#0096d2] text-white font-bold py-3 rounded-none transition-all shadow-sm text-sm"
                  >
                    {loading ? <Loader size={18} className="animate-spin" /> : 'Verify & Continue'}
                  </button>
                  <button type="button" onClick={() => { setStep('email'); setOtp(''); setError(''); }} className="w-full text-slate-400 hover:text-slate-650 text-xs font-bold transition-colors bg-transparent border-0 cursor-pointer mt-2">
                    Wait, that's the wrong email
                  </button>
                </form>
              )}

              {step === 'password' && (
                <form onSubmit={handleReset} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Password</label>
                    <input
                      type="password" required value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full bg-[#ebf3fe] border border-slate-200 rounded-none px-4 py-2.5 text-slate-900 focus:outline-none focus:border-[#00abec] focus:bg-white transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Repeat Password</label>
                    <input
                      type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
                      className="w-full bg-[#ebf3fe] border border-slate-200 rounded-none px-4 py-2.5 text-slate-900 focus:outline-none focus:border-[#00abec] focus:bg-white transition-all text-sm font-medium"
                    />
                  </div>
                  <button type="submit" disabled={loading} 
                    className="w-full bg-[#00abec] hover:bg-[#0096d2] text-white font-bold py-3 rounded-none transition-all shadow-sm text-sm"
                  >
                    {loading ? <Loader size={18} className="animate-spin" /> : 'Confirm New Password'}
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
