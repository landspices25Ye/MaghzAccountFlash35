import React, { useState, useEffect } from 'react';
import { GitBranch, Plus, Pencil, Trash2, Save } from 'lucide-react';
import { Card, Button, Input, Table, ConfirmDialog } from '@/core/ui/components';
import { useAppStore } from '@/core/store';
import { useAuthStore } from '@/modules/auth/store';
import { getDbAdapter } from '@/core/database/adapters';
import { logAudit } from '@/core/utils/auditLogger';

interface Branch {
  id: string;
  name: string;
  code: string;
  city: string;
  phone: string;
  isActive: boolean;
}

export const BranchesPage: React.FC = () => {
  const activeCompany = useAppStore((state) => state.activeCompany);
  const user = useAuthStore((state) => state.user);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Branch>>({ name: '', code: '', city: '', phone: '', isActive: true });

  const loadData = async () => {
    if (!activeCompany?.id) return;
    setIsLoading(true);
    try {
      const adapter = await getDbAdapter();
      const result = await adapter.query<{ id: string; name: string; code?: string; city?: string; phone?: string; is_active: boolean }>(`SELECT * FROM branches WHERE company_id = $1`, [activeCompany.id]);
      if (result.success && result.rows) {
        setBranches(result.rows.map((row) => ({
          id: row.id,
          name: row.name,
          code: row.code ?? '',
          city: row.city ?? '',
          phone: row.phone ?? '',
          isActive: row.is_active,
        })));
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [activeCompany?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!activeCompany?.id || !formData.name) return;
    setIsSaving(true);
    try {
      const adapter = await getDbAdapter();
      
      if (editingId) {
        await adapter.query(
          `UPDATE branches SET name = $1, code = $2, city = $3, phone = $4, is_active = $5 WHERE id = $6`,
          [formData.name, formData.code, formData.city, formData.phone, formData.isActive, editingId]
        );
      } else {
        await adapter.query(
          `INSERT INTO branches (id, company_id, name, code, city, phone, is_active, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [crypto.randomUUID(), activeCompany.id, formData.name, formData.code, formData.city, formData.phone, formData.isActive, new Date().toISOString()]
        );
      }

      await logAudit({ userId: user?.id || 'system', action: editingId ? 'update' : 'create', tableName: 'branches', recordId: editingId || 'new', companyId: activeCompany.id });
      setEditingId(null); setFormData({ name: '', code: '', city: '', phone: '', isActive: true }); loadData();
    } catch (err) {
      console.error('Failed to save branch:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!activeCompany?.id) return;
    try {
      const adapter = await getDbAdapter();
      await adapter.query(`DELETE FROM branches WHERE id = $1`, [id]);
      await logAudit({ userId: user?.id || 'system', action: 'delete', tableName: 'branches', recordId: id, companyId: activeCompany.id });
      setShowDeleteConfirm(null); loadData();
    } catch (err) {
      console.error('Failed to delete branch:', err);
    }
  };

  const columns = [
    { key: 'name', header: 'الاسم' },
    { key: 'code', header: 'الرمز', width: '100px' },
    { key: 'city', header: 'المدينة', width: '120px' },
    { key: 'phone', header: 'الهاتف', width: '140px' },
    { key: 'isActive', header: 'الحالة', render: (row: Branch) => (
      <span className={row.isActive ? 'badge-posted' : 'badge-draft'}>{row.isActive ? 'نشط' : 'معطل'}</span>
    )},
    { key: 'actions', header: '', render: (row: Branch) => (
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" onClick={() => { setEditingId(row.id); setFormData(row); }}>
          <Pencil size={14} className="text-amber-600" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(row.id)}>
          <Trash2 size={14} className="text-rose-600" />
        </Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <GitBranch size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">الفروع</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة فروع الشركة</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => { setEditingId(null); setFormData({ name: '', code: '', city: '', phone: '', isActive: true }); }}>
          فرع جديد
        </Button>
      </div>

      <Card>
        {(editingId !== null || formData.name) && (
          <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input label="الاسم" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
              <Input label="الرمز" value={formData.code} onChange={e => setFormData(p => ({ ...p, code: e.target.value }))} />
              <Input label="المدينة" value={formData.city} onChange={e => setFormData(p => ({ ...p, city: e.target.value }))} />
              <Input label="الهاتف" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setEditingId(null); setFormData({ name: '', code: '', city: '', phone: '', isActive: true }); }}>إلغاء</Button>
              <Button variant="primary" leftIcon={<Save size={16} />} onClick={handleSave} isLoading={isSaving}>حفظ</Button>
            </div>
          </div>
        )}

        <Table<Branch>
          data={branches}
          columns={columns}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          emptyMessage="لا توجد فروع"
        />
      </Card>

      <ConfirmDialog isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} onConfirm={() => showDeleteConfirm && handleDelete(showDeleteConfirm)} title="حذف الفرع" message="هل أنت متأكد من حذف هذا الفرع؟" confirmText="حذف" variant="danger" />
    </div>
  );
};

export default BranchesPage;


