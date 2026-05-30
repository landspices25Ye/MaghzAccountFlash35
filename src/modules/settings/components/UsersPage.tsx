import React, { useState, useEffect } from 'react';
import { Users, Plus, Pencil, Trash2, Save, KeyRound } from 'lucide-react';
import { Card, Button, Input, Table, ConfirmDialog, Modal } from '@/core/ui/components';
import { useAppStore } from '@/core/store';
import { useAuthStore } from '@/modules/auth/store';
import { getDbAdapter } from '@/core/database/adapters';
import { logAudit } from '@/core/utils/auditLogger';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  branchId?: string;
  isActive: boolean;
  lastLoginAt?: string;
}

export const UsersPage: React.FC = () => {
  const activeCompany = useAppStore((state) => state.activeCompany);
  const currentUser = useAuthStore((state) => state.user);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showResetPassword, setShowResetPassword] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [formData, setFormData] = useState<Partial<User>>({ username: '', email: '', role: 'accountant', isActive: true });

  const loadData = async () => {
    if (!activeCompany?.id) return;
    setIsLoading(true);
    try {
      const adapter = await getDbAdapter();
      const result = await adapter.query(`SELECT * FROM users WHERE company_id = $1`, [activeCompany.id]);
      if (result.success && result.rows) {
        setUsers(result.rows.map((row: any) => ({
          id: row.id,
          username: row.username,
          email: row.email,
          role: row.role,
          branchId: row.branch_id,
          isActive: row.is_active,
          lastLoginAt: row.last_login_at,
        })));
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [activeCompany?.id]);

  const handleSave = async () => {
    if (!activeCompany?.id || !formData.username) return;
    setIsSaving(true);
    try {
      const adapter = await getDbAdapter();
      
      if (editingId) {
        await adapter.query(
          `UPDATE users SET username = $1, email = $2, role = $3, is_active = $4 WHERE id = $5`,
          [formData.username, formData.email, formData.role, formData.isActive, editingId]
        );
      } else {
        await adapter.query(
          `INSERT INTO users (id, company_id, username, email, password_hash, role, is_active, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [crypto.randomUUID(), activeCompany.id, formData.username, formData.email, '', formData.role, formData.isActive, new Date().toISOString()]
        );
      }

      await logAudit({ userId: currentUser?.id || 'system', action: editingId ? 'update' : 'create', tableName: 'users', recordId: editingId || 'new', companyId: activeCompany.id });
      setEditingId(null); setFormData({ username: '', email: '', role: 'accountant', isActive: true }); loadData();
    } catch (err) {
      console.error('Failed to save user:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!activeCompany?.id || id === currentUser?.id) return;
    try {
      const adapter = await getDbAdapter();
      await adapter.query(`DELETE FROM users WHERE id = $1`, [id]);
      await logAudit({ userId: currentUser?.id || 'system', action: 'delete', tableName: 'users', recordId: id, companyId: activeCompany.id });
      setShowDeleteConfirm(null); loadData();
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleResetPassword = async () => {
    if (!showResetPassword || !newPassword) return;
    try {
      const adapter = await getDbAdapter();
      const hashed = await hashPassword(newPassword);
      await adapter.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hashed, showResetPassword]);
      setShowResetPassword(null); setNewPassword('');
    } catch (err) {
      console.error('Failed to reset password:', err);
    }
  };

  const roleLabels: Record<string, string> = {
    admin: 'مدير النظام',
    manager: 'مدير',
    accountant: 'محاسب',
    sales_rep: 'مندوب مبيعات',
    hr_admin: 'موارد بشرية',
    viewer: 'مشاهد فقط',
  };

  const columns = [
    { key: 'username', header: 'اسم المستخدم' },
    { key: 'email', header: 'البريد', render: (row: User) => row.email || '-' },
    { key: 'role', header: 'الدور', render: (row: User) => roleLabels[row.role] || row.role },
    { key: 'isActive', header: 'الحالة', render: (row: User) => (
      <span className={row.isActive ? 'badge-posted' : 'badge-draft'}>{row.isActive ? 'نشط' : 'معطل'}</span>
    )},
    { key: 'actions', header: '', render: (row: User) => (
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" onClick={() => setShowResetPassword(row.id)} title="تغيير كلمة المرور">
          <KeyRound size={14} className="text-blue-600" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setEditingId(row.id); setFormData(row); }}>
          <Pencil size={14} className="text-amber-600" />
        </Button>
        {row.id !== currentUser?.id && (
          <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(row.id)}>
            <Trash2 size={14} className="text-rose-600" />
          </Button>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Users size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">المستخدمين</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة المستخدمين والصلاحيات</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => { setEditingId(null); setFormData({ username: '', email: '', role: 'accountant', isActive: true }); }}>
          مستخدم جديد
        </Button>
      </div>

      <Card>
        {(editingId !== null || formData.username) && (
          <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input label="اسم المستخدم *" value={formData.username} onChange={e => setFormData(p => ({ ...p, username: e.target.value }))} />
              <Input label="البريد الإلكتروني" type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
              <div>
                <label className="form-label block mb-1.5">الدور</label>
                <select value={formData.role} onChange={e => setFormData(p => ({ ...p, role: e.target.value }))} className="form-control">
                  {Object.entries(roleLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setEditingId(null); setFormData({ username: '', email: '', role: 'accountant', isActive: true }); }}>إلغاء</Button>
              <Button variant="primary" leftIcon={<Save size={16} />} onClick={handleSave} isLoading={isSaving}>حفظ</Button>
            </div>
          </div>
        )}

        <Table<User>
          data={users}
          columns={columns}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          emptyMessage="لا يوجد مستخدمين"
        />
      </Card>

      <ConfirmDialog isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} onConfirm={() => showDeleteConfirm && handleDelete(showDeleteConfirm)} title="حذف المستخدم" message="هل أنت متأكد من حذف هذا المستخدم؟" confirmText="حذف" variant="danger" />

      <Modal isOpen={!!showResetPassword} onClose={() => setShowResetPassword(null)} title="تغيير كلمة المرور" size="sm" footer={<><Button variant="secondary" onClick={() => setShowResetPassword(null)}>إلغاء</Button><Button variant="primary" onClick={handleResetPassword}>حفظ</Button></>}>
        <Input label="كلمة المرور الجديدة" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
      </Modal>
    </div>
  );
};

export default UsersPage;
