import React, { useState } from 'react';
import { Database, Download, Upload, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { Card, Button } from '@/core/ui/components';

export const BackupPage: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'backing-up' | 'restoring' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleBackup = () => {
    setStatus('backing-up');
    setMessage('جاري إنشاء نسخة احتياطية...');
    setTimeout(() => {
      setStatus('success');
      setMessage('تم إنشاء النسخة الاحتياطية بنجاح: backup_2026-06-30.zip');
    }, 2000);
  };

  const handleRestore = () => {
    setStatus('restoring');
    setMessage('جاري استعادة البيانات...');
    setTimeout(() => {
      setStatus('success');
      setMessage('تمت استعادة البيانات بنجاح');
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Database size={28} className="text-primary-600 dark:text-primary-400" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">النسخ الاحتياطي</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">نسخ احتياطي واستعادة لبيانات النظام</p>
        </div>
      </div>

      {status === 'success' && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 flex items-center gap-3">
          <Check size={20} className="text-emerald-600" />
          <p className="text-emerald-700 dark:text-emerald-300 text-sm">{message}</p>
        </div>
      )}

      {status === 'error' && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-rose-600" />
          <p className="text-rose-700 dark:text-rose-300 text-sm">{message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Download size={32} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">نسخ احتياطي</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">قم بتحميل نسخة احتياطية كاملة من قاعدة البيانات</p>
            <Button 
              variant="primary" 
              className="w-full" 
              leftIcon={<Download size={18} />}
              onClick={handleBackup}
              isLoading={status === 'backing-up'}
            >
              إنشاء نسخة احتياطية
            </Button>
          </div>
        </Card>

        <Card>
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <RotateCcw size={32} className="text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">استعادة</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">استعادة البيانات من نسخة احتياطية سابقة</p>
            <div className="flex flex-col gap-3">
              <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer hover:border-primary-500 dark:hover:border-primary-400 transition-colors">
                <Upload size={18} className="text-slate-500" />
                <span className="text-sm text-slate-500">اختر ملف النسخة الاحتياطية</span>
                <input type="file" className="hidden" accept=".zip,.sql,.json" />
              </label>
              <Button 
                variant="secondary" 
                className="w-full" 
                leftIcon={<RotateCcw size={18} />}
                onClick={handleRestore}
                isLoading={status === 'restoring'}
              >
                استعادة البيانات
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-4">سجل النسخ الاحتياطية</h3>
          <div className="space-y-2">
            {[
              { date: '2026-06-30', size: '12.5 MB', type: 'تلقائي' },
              { date: '2026-06-23', size: '11.8 MB', type: 'يدوي' },
              { date: '2026-06-16', size: '11.2 MB', type: 'تلقائي' },
            ].map((backup, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Database size={16} className="text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{backup.date}</p>
                    <p className="text-xs text-slate-400">{backup.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-500">{backup.size}</span>
                  <Button variant="ghost" size="sm" leftIcon={<Download size={14} />}>تحميل</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BackupPage;
