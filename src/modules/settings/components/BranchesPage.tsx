import React, { useState, useEffect } from 'react';
import { GitBranch, Plus, Pencil, Trash2, Save } from 'lucide-react';
import { Card, Button, Input, Table, ConfirmDialog } from '@/core/ui/components';
import { useAppStore } from '@/core/store';
import { useAuthStore } from '@/modules/auth/store';
import { getDbAdapter } from '@/core/database/adapters';
import { logAudit } from '@/core/utils/auditLogger';
import { Can } from '@/core/ui/components/PermissionGate';
import { useTranslation } from '@/core/i18n/useTranslation';

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
  const { t } = useTranslation();
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
    } catch {
      // Error handled by caller
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
    } catch {
      // Error handled by caller
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
    } catch {
      // Error handled by caller
    }
  };

  const columns = [
    { key: 'name', header: t('settings.branches.name') },
    { key: 'code', header: t('settings.branches.code'), width: '100px' },
    { key: 'city', header: t('settings.branches.city'), width: '120px' },
    { key: 'phone', header: t('settings.branches.phone'), width: '140px' },
    { key: 'isActive', header: t('settings.branches.status'), render: (row: Branch) => (
      <span className={row.isActive ? 'badge-posted' : 'badge-draft'}>{row.isActive ? t('settings.common.active') : t('settings.common.disabled')}</span>
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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t('settings.branches.title')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('settings.branches.subtitle')}</p>
          </div>
        </div>
        <Can action="create" module="settings">
          <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => { setEditingId(null); setFormData({ name: '', code: '', city: '', phone: '', isActive: true }); }}>
            {t('settings.branches.newBranch')}
          </Button>
        </Can>
      </div>

      <Card>
        {(editingId !== null || formData.name) && (
          <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input label={t('settings.branches.name')} value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
              <Input label={t('settings.branches.code')} value={formData.code} onChange={e => setFormData(p => ({ ...p, code: e.target.value }))} />
              <Input label={t('settings.branches.city')} value={formData.city} onChange={e => setFormData(p => ({ ...p, city: e.target.value }))} />
              <Input label={t('settings.branches.phone')} value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setEditingId(null); setFormData({ name: '', code: '', city: '', phone: '', isActive: true }); }}>{t('settings.common.cancel')}</Button>
              <Button variant="primary" leftIcon={<Save size={16} />} onClick={handleSave} isLoading={isSaving}>{t('settings.common.save')}</Button>
            </div>
          </div>
        )}

        <Table<Branch>
          data={branches}
          columns={columns}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          emptyMessage={t('settings.branches.emptyMessage')}
        />
      </Card>

      <ConfirmDialog isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} onConfirm={() => showDeleteConfirm && handleDelete(showDeleteConfirm)} title={t('settings.branches.deleteTitle')} message={t('settings.branches.deleteMessage')} confirmText={t('settings.branches.deleteConfirm')} variant="danger" />
    </div>
  );
};

export default BranchesPage;
