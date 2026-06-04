import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Pencil, Trash2, Save } from 'lucide-react';
import { Card, Button, Input, Table, ConfirmDialog } from '@/core/ui/components';
import { useAppStore } from '@/core/store';
import { useAuthStore } from '@/modules/auth/store';
import { getDbAdapter } from '@/core/database/adapters';
import { logAudit } from '@/core/utils/auditLogger';

interface VatType {
  id: string;
  name: string;
  rate: number;
  accountId?: string;
  isActive: boolean;
}

export const VatSettingsPage: React.FC = () => {
  const activeCompany = useAppStore((state) => state.activeCompany);
  const user = useAuthStore((state) => state.user);
  const [vatTypes, setVatTypes] = useState<VatType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<VatType>>({ name: '', rate: 15, isActive: true });

  const loadData = async () => {
    if (!activeCompany?.id) return;
    setIsLoading(true);
    try {
      const adapter = await getDbAdapter();
      const result = await adapter.query<{ id: string; name?: string; vat_rate: string | number; account_id: string; is_active: boolean }>(
        `SELECT * FROM vat_settings WHERE company_id = $1`,
        [activeCompany.id]
      );
      if (result.success && result.rows) {
        setVatTypes(result.rows.map((row) => ({
          id: row.id,
          name: row.name || 'ضريبة القيمة المضافة',
          rate: Number(row.vat_rate),
          accountId: row.account_id,
          isActive: row.is_active,
        })));
      }
    } catch (err) {
      console.error('Failed to load VAT settings:', err);
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
          `UPDATE vat_settings SET name = $1, vat_rate = $2, account_id = $3, is_active = $4, updated_at = $5 WHERE id = $6`,
          [formData.name, formData.rate, formData.accountId, formData.isActive, new Date().toISOString(), editingId]
        );
      } else {
        await adapter.query(
          `INSERT INTO vat_settings (id, company_id, name, vat_rate, account_id, is_active, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [crypto.randomUUID(), activeCompany.id, formData.name, formData.rate, formData.accountId, formData.isActive, new Date().toISOString()]
        );
      }

      await logAudit({
        userId: user?.id || 'system',
        action: editingId ? 'update' : 'create',
        tableName: 'vat_settings',
        recordId: editingId || 'new',
        companyId: activeCompany.id,
      });

      setEditingId(null);
      setFormData({ name: '', rate: 15, isActive: true });
      loadData();
    } catch (err) {
      console.error('Failed to save VAT settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!activeCompany?.id) return;
    try {
      const adapter = await getDbAdapter();
      await adapter.query(`DELETE FROM vat_settings WHERE id = $1`, [id]);
      await logAudit({
        userId: user?.id || 'system',
        action: 'delete',
        tableName: 'vat_settings',
        recordId: id,
        companyId: activeCompany.id,
      });
      setShowDeleteConfirm(null);
      loadData();
    } catch (err) {
      console.error('Failed to delete VAT settings:', err);
    }
  };

  const columns = [
    { key: 'name', header: 'الاسم' },
    { key: 'rate', header: 'النسبة %', render: (row: VatType) => `${row.rate}%` },
    { key: 'isActive', header: 'الحالة', render: (row: VatType) => (
      <span className={row.isActive ? 'badge-posted' : 'badge-draft'}>
        {row.isActive ? 'نشط' : 'غير نشط'}
      </span>
    )},
    { key: 'actions', header: '', render: (row: VatType) => (
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
          <Receipt size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">إعدادات الضريبة</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة أنواع الضريبة ونسبها</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => { setEditingId(null); setFormData({ name: '', rate: 15, isActive: true }); }}>
          نوع ضريبة جديد
        </Button>
      </div>

      <Card>
        {(editingId !== null || formData.name) && (
          <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input label="الاسم" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
              <Input label="النسبة %" type="number" value={String(formData.rate)} onChange={e => setFormData(p => ({ ...p, rate: Number(e.target.value) }))} />
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.isActive} onChange={e => setFormData(p => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4 rounded" />
                  <span className="text-sm">نشط</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setEditingId(null); setFormData({ name: '', rate: 15, isActive: true }); }}>إلغاء</Button>
              <Button variant="primary" leftIcon={<Save size={16} />} onClick={handleSave} isLoading={isSaving}>حفظ</Button>
            </div>
          </div>
        )}

        <Table<VatType>
          data={vatTypes}
          columns={columns}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          emptyMessage="لا توجد أنواع ضريبة"
        />
      </Card>

      <ConfirmDialog
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
        title="حذف نوع الضريبة"
        message="هل أنت متأكد من حذف هذا النوع؟ لا يمكن التراجع."
        confirmText="حذف"
        variant="danger"
      />
    </div>
  );
};

export default VatSettingsPage;


