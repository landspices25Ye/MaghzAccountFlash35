import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, LogIn, Eye, EyeOff } from 'lucide-react';
import { Button, Input } from '@/core/ui/components';
import { useAuthStore } from '../store';
import { authApi } from '../api';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await authApi.login(credentials);
    
    if (result.success && result.user) {
      login(result.user);
      navigate('/');
    } else {
      setError(result.error || 'حدث خطأ أثناء تسجيل الدخول');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">محاسبة المهذب</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">نظام ERP محاسبي متكامل</p>
        </div>

        {/* Login Form */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4">تسجيل الدخول</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg text-danger-600 dark:text-danger-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="اسم المستخدم"
              value={credentials.username}
              onChange={e => setCredentials(prev => ({ ...prev, username: e.target.value }))}
              required
              autoFocus
            />
            
            <div className="relative">
              <Input
                label="كلمة المرور"
                type={showPassword ? 'text' : 'password'}
                value={credentials.password}
                onChange={e => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-[2.1rem] text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              leftIcon={<LogIn size={18} />}
              isLoading={isLoading}
            >
              تسجيل الدخول
            </Button>
          </form>

          {/* Demo accounts hint */}
          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs text-slate-500">
            <p className="font-medium mb-1">حسابات تجريبية:</p>
            <div className="space-y-1">
              <p>admin (مدير النظام)</p>
              <p>محاسب (محاسب)</p>
              <p>مبيعات (مندوب مبيعات)</p>
              <p>مدير (مدير)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
