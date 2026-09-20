import React, { useState } from 'react';
import { X, Lock, Key, ShieldCheck, Eye, EyeOff, AlertCircle, Mail, Crown } from 'lucide-react';
import { useVisualEditor, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASS } from '../../context/VisualEditorContext';

export const AdminLoginModal: React.FC = () => {
  const { adminLoginModalOpen, setAdminLoginModalOpen, loginAdmin } = useVisualEditor();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!adminLoginModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password.trim()) {
      setError('Vui lòng nhập mật khẩu quản trị.');
      return;
    }

    const success = loginAdmin(password.trim(), email.trim());
    if (success) {
      setPassword('');
      setAdminLoginModalOpen(false);
    } else {
      setError('Thông tin quản trị không chính xác! Vui lòng kiểm tra lại Email và Mật khẩu.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-[#052319] via-[#0a3829] to-[#008874] text-white relative">
          <button
            onClick={() => setAdminLoginModalOpen(false)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white mb-3 shadow-md">
            <Crown className="w-6 h-6 text-amber-300" />
          </div>

          <h3 className="text-xl font-black font-display text-white">
            Đăng Nhập Quản Trị TINGO
          </h3>
          <p className="text-xs text-emerald-100/80 mt-1">
            Dành riêng cho Admin để kích hoạt chế độ Visual Edit trực tiếp trên Landing Page và quản lý toàn bộ hệ thống.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Quản Trị
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="admin@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008874] text-sm"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Mật khẩu Admin
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Nhập mật khẩu..."
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008874] text-sm"
                autoFocus
              />
              <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 rounded-full bg-[#008764] hover:bg-[#007052] active:scale-98 text-white font-bold text-sm shadow-md shadow-emerald-900/15 cursor-pointer transition-all flex items-center justify-center gap-2 mt-2"
          >
            <Lock className="w-4 h-4" />
            <span>Đăng Nhập & Mở Visual Edit</span>
          </button>
        </form>
      </div>
    </div>
  );
};
