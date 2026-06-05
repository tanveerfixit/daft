import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Loader, Shield, Mail, RotateCw, Box, UserPlus } from 'lucide-react';

interface Props {
  onGoSignup: () => void;
  onForgotPassword: () => void;
  onAdminLogin: () => void;
}

export default function LoginPage({ onGoSignup, onForgotPassword, onAdminLogin }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Math Captcha state
  const [num1, setNum1] = useState(() => Math.floor(Math.random() * 10));
  const [num2, setNum2] = useState(() => Math.floor(Math.random() * 10));
  const [captchaInput, setCaptchaInput] = useState('');

  const refreshCaptcha = () => {
    setNum1(Math.floor(Math.random() * 10));
    setNum2(Math.floor(Math.random() * 10));
    setCaptchaInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Verify Captcha
    if (parseInt(captchaInput) !== num1 + num2) {
      setError('Invalid code. Please solve the math problem correctly.');
      refreshCaptcha();
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message);
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#ffffff] flex flex-col items-center justify-center p-6 font-sans text-slate-900">
      <div className="w-full max-w-[420px] space-y-6">
        
        {/* Business Management Brand Logo */}
        <div className="flex flex-col items-center text-center">
          <div className="text-[#00abec] mb-4">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#00abec" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" fill="#ebf3fe" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              <line x1="8" y1="12" x2="8" y2="17" strokeWidth="1.5" />
              <line x1="12" y1="10" x2="12" y2="17" strokeWidth="1.5" />
              <line x1="16" y1="13" x2="16" y2="17" strokeWidth="1.5" />
            </svg>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#00abec]">
            login to Managment System
          </h1>
        </div>

        {/* Form Container */}
        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-none animate-in fade-in duration-300">
              <div className="flex gap-3">
                <div className="shrink-0 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">!</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-red-900 leading-tight">Access Denied</p>
                  <p className="text-[11px] text-red-700 mt-1 leading-relaxed">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Address */}
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="ipear.ennis@gmail.com"
                className="w-full bg-[#ebf3fe] border border-slate-200 rounded-none px-4 py-3 text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:border-[#00abec] focus:bg-white transition-all text-[15px]"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Password"
                className="w-full bg-[#ebf3fe] border border-slate-200 rounded-none px-4 py-3 pr-12 text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:border-[#00abec] focus:bg-white transition-all text-[15px]"
              />
              <button 
                type="button" 
                onClick={() => setShowPass(!showPass)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-900 hover:text-[#00abec] transition-colors p-1"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Math Captcha Row */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-neutral-100 to-neutral-200 border border-slate-350 px-4 py-2.5 w-[220px]">
              <span className="font-mono font-bold text-[18px] text-black italic">
                {num1} + {num2} =
              </span>
              <input
                type="text"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value.replace(/[^0-9]/g, ''))}
                required
                className="w-14 bg-white border border-slate-400 rounded-none text-center font-bold font-mono text-[16px] py-1 text-slate-900 focus:outline-none focus:border-[#00abec]"
              />
              <button
                type="button"
                onClick={refreshCaptcha}
                className="text-[#00abec] hover:text-[#0096d2] p-1 transition-colors"
                title="Refresh Code"
              >
                <RotateCw size={18} />
              </button>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end pt-1">
              <button 
                type="button" 
                onClick={onForgotPassword} 
                className="text-xs font-bold text-slate-900 hover:underline hover:text-[#00abec] transition-all"
              >
                Forgot Password
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00abec] hover:bg-[#0096d2] disabled:bg-slate-200 text-white font-bold py-3.5 rounded-none transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm text-sm"
            >
              {loading ? (
                <Loader size={18} className="animate-spin" />
              ) : (
                'Login'
              )}
            </button>
          </form>

          {/* Registration / Sign Up staff link with a very small icon */}
          <div className="pt-4 text-center">
            <p className="text-xs font-medium text-slate-400 flex items-center justify-center gap-1.5">
              New here?{' '}
              <button 
                onClick={onGoSignup} 
                className="text-[#00abec] font-bold hover:underline underline-offset-4 decoration-2 flex items-center gap-1"
              >
                <UserPlus size={14} className="inline-block" />
                Register Staff
              </button>
            </p>
          </div>
        </div>



        {/* Footer / Version */}
        <div className="pt-6 flex flex-col items-center gap-4">
          <button 
            onClick={onAdminLogin}
            className="group flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all"
          >
            <Shield size={12} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
            <span className="text-[9px] font-bold text-slate-300 group-hover:text-slate-500 uppercase tracking-wider transition-colors">Developer Portal</span>
          </button>
        </div>
      </div>
    </div>
  );
}
