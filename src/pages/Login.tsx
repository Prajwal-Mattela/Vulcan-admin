import React, { useState } from 'react';

interface LoginProps {
  setIsLoggedIn: (val: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ setIsLoggedIn }) => {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);

  const handleLogin = () => {
    if (password === import.meta.env.VITE_ADMIN_PASSWORD) {
      setIsLoggedIn(true);
    } else {
      setError(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="flex flex-col min-h-screen justify-center items-center bg-[#0A0A0A]">
      <div className="max-w-sm w-full mx-auto">
        <div className="flex flex-col items-center">
          <span className="font-bold text-2xl tracking-tighter text-[#F5F0EB]">VULCAN</span>
          <span className="text-[#E8450A] text-lg">●</span>
          <span className="text-sm text-[#6B6B6B] uppercase tracking-widest">Admin Portal</span>
        </div>
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-8 mt-8">
          <div className="text-xl font-semibold text-[#F5F0EB] mb-1">Welcome back</div>
          <div className="text-sm text-[#6B6B6B] mb-6">Enter your admin password to continue</div>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              placeholder="Admin password"
              className="w-full bg-[#111111] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F0EB] text-sm focus:outline-none focus:border-[#E8450A]"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(false); }}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B6B]"
              onClick={() => setShow(s => !s)}
              tabIndex={-1}
            >
              {show ? '🙈' : '👁️'}
            </button>
          </div>
          {error && <div className="text-red-400 text-sm mt-2">Incorrect password. Try again.</div>}
          <button
            className="w-full bg-[#E8450A] text-white font-semibold py-3 rounded-lg mt-4 hover:bg-[#FF6B35] transition-colors text-sm tracking-wide"
            onClick={handleLogin}
          >
            Login
          </button>
        </div>
        <div className="text-xs text-[#3A3A3A] text-center mt-6">Vulcan Agency — Internal Use Only</div>
      </div>
    </div>
  );
};

export default Login;
