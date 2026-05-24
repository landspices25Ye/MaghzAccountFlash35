import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Check, X } from 'lucide-react';
import { Card, Button, Input, Modal, Table } from '@/core/ui/components';
import { useAuthStore } from '../store';
import { useUsers } from '../hooks/useAuth';
import { useAppStore } from '@/core/store';
import type { User } from '../types';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'مدير النظام',
  admin: 'أدمن',
  manager: 'مدير',
  accountant: 'محاسب',
  sales_rep: 'مندوب مبيعات',
  viewer: 'مشاهد فقط',
};

export const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const activeCompany = useAppStore(state => state.activeCompany);
  const hasPermission = useAuthStore(state => state.hasPermission);
  const { users, isLoading, create, update } = useUsers(activeCompany?.id || '');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [formData, setFormData] = useState({ username: '', email: '', role: 'accountant' as User['role'] });

  // Redirect if no permission
  React.useEffect(() => {
    if (!hasPermission('settings.users')) {
      navigate('/');
    }
  }, [hasPermission, navigate]);

  const handleSave = async () => {
    if (!activeCompany) return;
    
    const data = {
      companyId: activeCompany.id,
      username: formData.username,
      email: formData.email,
      role: formData.role,
      isActive: true,
    };

    if (editing) {
      await update(editing.id, data);
    } else {
      await create(data);
    }
    
    setIsModalOpen(false);
    setFormData({ username: '', email: '', role: 'accountant' });
  };

  const columns = [
    { key: 'username', header: 'اسم المستخدم' },
    { key: 'email', header: 'البريد الإلكتروني' },
    { key: 'role', header: 'الدور', render: (row: User) => ROLE_LABELS[row.role] || row.role },
    { key: 'isActive', header: 'الحالة', width: '100px', render: (row: User) => 
      row.isActive ? <span className="text-success-600 flex items-center gap-1"><Check size={14} /> نشط</span> : <span className="text-danger-600 flex items-center gap-1"><X size={14} /> معطل</span>
    },
    { key: 'actions', header: '', width: '100px', render: (row: User) => (
      <button 
        onClick={() => { setEditing(row); setFormData({ username: row.username, email: row.email || '', role: row.role }); setIsModalOpen(true); }}
        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-primary-600"
      >
        تعديل
      </button>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">المستخدمين</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة المستخدمين والأدوار</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => { setEditing(null); setFormData({ username: '', email: '', role: 'accountant' }); setIsModalOpen(true); }}>
          مستخدم جديد
        </Button>
      </div>

      <Card>
        <Table<User>
          data={users}
          columns={columns}
          keyExtractor={(row, i) => row.id || String(i)}
          isLoading={isLoading}
          emptyMessage="لا يوجد مستخدمين"
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? 'تعديل مستخدم' : 'مستخدم جديد'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
            <Button variant="primary" onClick={handleSave}>حفظ</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="اسم المستخدم"
            value={formData.username}
            onChange={e => setFormData(prev => ({ ...prev, username: e.target.value }))}
          />
          <Input
            label="البريد الإلكتروني"
            type="email"
            value={formData.email}
            onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
          />
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">الدور</label>
            <select
              value={formData.role}
              onChange={e => setFormData(prev => ({ ...prev, role: e.target.value as User['role'] }))}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 px-3.5 py-2.5 text-sm rounded-lg outline-none"
            >
              <option value="manager">مدير</option>
              <option value="accountant">محاسب</option>
              <option value="sales_rep">مندوب مبيعات</option>
              <option value="viewer">مشاهد فقط</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UsersPage;
