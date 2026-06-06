import React, { useState, useEffect } from 'react';
import { Coins, Plus, Pencil, Trash2, Save, Star } from 'lucide-react';
import { Card, Button, Input, Table, ConfirmDialog } from '@/core/ui/components';
import { useAppStore } from '@/core/store';
import { useFormatters } from '@/core/utils/useFormatters';
import { useAuthStore } from '@/modules/auth/store';
import { getDbAdapter } from '@/core/database/adapters';
import { logAudit } from '@/core/utils/auditLogger';

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isDefault: boolean;
  isActive: boolean;
}

export const CurrenciesPage: React.FC = () => {
  const activeCompany = useAppStore((state) => state.activeCompany);
  const user = useAuthStore((state) => state.user);
  const { formatCurrency } = useFormatters(activeCompany?.id || '');
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Currency>>({ code: '', name: '', symbol: '', exchangeRate: 1, isActive: true });

  const loadData = async () => {
    if (!activeCompany?.id) return;
    setIsLoading(true);
    try {
      const adapter = await getDbAdapter();
      const result = await adapter.query<{ id: string; code: string; name: string; symbol: string; exchange_rate: string | number; is_default: boolean; is_active: boolean }>(`SELECT * FROM currencies WHERE company_id = $1`, [activeCompany.id]);
      if (result.success && result.rows) {
        setCurrencies(result.rows.map((row) => ({
          id: row.id,
          code: row.code,
          name: row.name,
          symbol: row.symbol,
          exchangeRate: Number(row.exchange_rate),
          isDefault: row.is_default,
          isActive: row.is_active,
        })));
      }
    } catch (err) {
      console.error('Failed to load currencies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [activeCompany?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!activeCompany?.id || !formData.code || !formData.name) return;
    setIsSaving(true);
    try {
      const adapter = await getDbAdapter();
      
      if (editingId) {
        await adapter.query(
          `UPDATE currencies SET code = $1, name = $2, symbol = $3, exchange_rate = $4, is_active = $5 WHERE id = $6`,
          [formData.code, formData.name, formData.symbol, formData.exchangeRate, formData.isActive, editingId]
        );
      } else {
        await adapter.query(
          `INSERT INTO currencies (id, company_id, code, name, symbol, exchange_rate, is_default, is_active, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [crypto.randomUUID(), activeCompany.id, formData.code, formData.name, formData.symbol, formData.exchangeRate, false, formData.isActive, new Date().toISOString()]
        );
      }

      await logAudit({ userId: user?.id || 'system', action: editingId ? 'update' : 'create', tableName: 'currencies', recordId: editingId || 'new', companyId: activeCompany.id });
      setEditingId(null); setFormData({ code: '', name: '', symbol: '', exchangeRate: 1, isActive: true }); loadData();
    } catch (err) {
      console.error('Failed to save currency:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!activeCompany?.id) return;
    try {
      const adapter = await getDbAdapter();
      await adapter.query(`UPDATE currencies SET is_default = false WHERE company_id = $1`, [activeCompany.id]);
      await adapter.query(`UPDATE currencies SET is_default = true WHERE id = $1`, [id]);
      loadData();
    } catch (err) {
      console.error('Failed to set default currency:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!activeCompany?.id) return;
    try {
      const adapter = await getDbAdapter();
      await adapter.query(`DELETE FROM currencies WHERE id = $1`, [id]);
      await logAudit({ userId: user?.id || 'system', action: 'delete', tableName: 'currencies', recordId: id, companyId: activeCompany.id });
      setShowDeleteConfirm(null); loadData();
    } catch (err) {
      console.error('Failed to delete currency:', err);
    }
  };

  const columns = [
    { key: 'code', header: 'الرمز', width: '80px' },
    { key: 'name', header: 'الاسم' },
    { key: 'symbol', header: 'الرمز', width: '80px' },
    { key: 'exchangeRate', header: 'سعر الصرف', render: (row: Currency) => formatCurrency(row.exchangeRate) },
    { key: 'isDefault', header: 'أساسية', render: (row: Currency) => row.isDefault ? <Star size={16} className="text-gold-500 fill-gold-500" /> : null },
    { key: 'actions', header: '', render: (row: Currency) => (
      <div className="flex items-center gap-1">
        {!row.isDefault && (
          <Button size="sm" variant="ghost" onClick={() => handleSetDefault(row.id)} title="تعيين كأساسية">
            <Star size={14} className="text-gold-500" />
          </Button>
        )}
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
          <Coins size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">العملات</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة العملات وأسعار الصرف</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => { setEditingId(null); setFormData({ code: '', name: '', symbol: '', exchangeRate: 1, isActive: true }); }}>
          عملة جديدة
        </Button>
      </div>

      <Card>
        {(editingId !== null || formData.code) && (
          <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input label="الرمز" value={formData.code} onChange={e => setFormData(p => ({ ...p, code: e.target.value }))} />
              <Input label="الاسم" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
              <Input label="الرمز (﷼, $)" value={formData.symbol} onChange={e => setFormData(p => ({ ...p, symbol: e.target.value }))} />
              <Input label="سعر الصرف" type="number" value={String(formData.exchangeRate)} onChange={e => setFormData(p => ({ ...p, exchangeRate: Number(e.target.value) }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setEditingId(null); setFormData({ code: '', name: '', symbol: '', exchangeRate: 1, isActive: true }); }}>إلغاء</Button>
              <Button variant="primary" leftIcon={<Save size={16} />} onClick={handleSave} isLoading={isSaving}>حفظ</Button>
            </div>
          </div>
        )}

        <Table<Currency>
          data={currencies}
          columns={columns}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          emptyMessage="لا توجد عملات"
        />
      </Card>

      <ConfirmDialog isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} onConfirm={() => showDeleteConfirm && handleDelete(showDeleteConfirm)} title="حذف العملة" message="هل أنت متأكد؟" confirmText="حذف" variant="danger" />
    </div>
  );
};

export default CurrenciesPage;


