import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Loader2, RotateCw } from 'lucide-react';

interface Props {
  onGoSignup?: () => void;
  onForgotPassword?: () => void;
  onAdminLogin?: () => void;
}

export default function LoginPage({ onForgotPassword }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Security Math Question
  const [num1, setNum1] = useState(2);
  const [num2, setNum2] = useState(7);
  const [captchaInput, setCaptchaInput] = useState('');

  const generateCaptcha = () => {
    const n1 = Math.floor(Math.random() * 8) + 1;
    const n2 = Math.floor(Math.random() * 8) + 1;
    setNum1(n1);
    setNum2(n2);
    setCaptchaInput('');
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Verify Captcha
    if (parseInt(captchaInput.trim(), 10) !== num1 + num2) {
      setError('Please enter the correct answer to the security question.');
      generateCaptcha();
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message);
      generateCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f2f2] dark:bg-neutral-950 flex flex-col items-center justify-center p-3 sm:p-6 py-6 sm:py-10 font-sans select-none overflow-y-auto">
      <div className="w-full max-w-[480px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 shadow-xs sm:shadow-sm my-auto transition-all">
        
        {/* Top Book SVG Icon */}
        <div className="mb-3 sm:mb-4">
          <svg className="w-12 h-12 sm:w-14 sm:h-14" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bookGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#009beb" />
              </linearGradient>
            </defs>
            {/* Book Pages Fill */}
            <path 
              d="M32 18C26 13 14 13 8 16V46C14 43 26 43 32 48C38 43 50 43 56 46V16C50 13 38 13 32 18Z" 
              fill="#E0F2FE" 
            />
            {/* Center Spine */}
            <path d="M32 18V48" stroke="#0284C7" strokeWidth="2.5" strokeLinecap="round" />
            {/* Left Page Text Lines */}
            <path d="M15 24C19 22.5 24 22.5 27 24.5" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M15 30C19 28.5 24 28.5 27 30.5" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M15 36C19 34.5 24 34.5 27 36.5" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
            {/* Right Page Text Lines */}
            <path d="M37 24.5C40 22.5 45 22.5 49 24" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M37 30.5C40 28.5 45 28.5 49 30" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M37 36.5C40 34.5 45 34.5 49 36" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
            {/* Outer Cover Border */}
            <path 
              d="M8 16C14 13 26 13 32 18C38 13 50 13 56 16V46C50 43 38 43 32 48C26 43 14 43 8 46V16Z" 
              stroke="url(#bookGrad)" 
              strokeWidth="3.5" 
              strokeLinejoin="round" 
            />
          </svg>
        </div>

        {/* Title (Responsive Font) */}
        <h1 className="text-2xl sm:text-3xl md:text-[32px] font-bold text-[#009beb] tracking-tight mb-5 sm:mb-7">
          Log in to System
        </h1>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 sm:mb-5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl p-3 text-xs sm:text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          
          {/* Email Input */}
          <div>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="Email address"
              className="w-full h-11 sm:h-12 px-5 sm:px-6 text-base bg-[#eef4fc] dark:bg-neutral-800/80 border border-[#cbd5e1] dark:border-neutral-700 rounded-full text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-[#009beb] focus:bg-white dark:focus:bg-neutral-800 transition-colors"
            />
          </div>

          {/* Password Input */}
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Password"
              className="w-full h-11 sm:h-12 px-5 sm:px-6 pr-12 sm:pr-14 text-base bg-[#eef4fc] dark:bg-neutral-800/80 border border-[#cbd5e1] dark:border-neutral-700 rounded-full text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-[#009beb] focus:bg-white dark:focus:bg-neutral-800 transition-colors font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 text-neutral-800 dark:text-neutral-200 hover:text-black dark:hover:text-white p-1.5 cursor-pointer"
              tabIndex={-1}
            >
              {showPass ? <EyeOff size={19} strokeWidth={2.2} /> : <Eye size={19} strokeWidth={2.2} />}
            </button>
          </div>

          {/* Math Captcha Row (Responsive & Touch Friendly) */}
          <div className="pt-0.5 flex items-center">
            <div className="bg-gradient-to-b from-[#f7f7f7] to-[#e1e1e1] border border-[#c4c4c4] rounded-full px-3.5 sm:px-5 py-1.5 sm:py-2 flex items-center gap-2 sm:gap-3 shadow-xs max-w-full">
              <span className="font-serif italic font-extrabold text-base sm:text-lg tracking-wide text-neutral-900 select-none whitespace-nowrap">
                {num1} + {num2} =
              </span>
              <input
                type="text"
                value={captchaInput}
                onChange={e => setCaptchaInput(e.target.value)}
                required
                maxLength={4}
                className="w-14 sm:w-18 h-7 sm:h-8 bg-white dark:bg-neutral-900 border border-neutral-700 rounded-full text-center font-bold text-sm sm:text-base text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-[#009beb]"
              />
              <button
                type="button"
                onClick={generateCaptcha}
                title="Change security question"
                className="text-[#009beb] hover:text-[#007bbd] p-1 transition-colors cursor-pointer shrink-0"
              >
                <RotateCw size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="text-right pt-0.5">
            {onForgotPassword && (
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:text-[#009beb] hover:underline cursor-pointer"
              >
                Forgot Password
              </button>
            )}
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 sm:h-12 bg-[#009beb] hover:bg-[#0088d1] disabled:opacity-50 text-white font-semibold text-base sm:text-lg rounded-full shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-colors mt-2"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <span>Login</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
