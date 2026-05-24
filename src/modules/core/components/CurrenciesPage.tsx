import React, { useState } from 'react';
import { Coins, Plus, Pencil } from 'lucide-react';
import { Card, Button, Input, Modal, Table } from '@/core/ui/components';
import { useCurrencies } from '../hooks/useCore';
import { useAppStore } from '@/core/store';
import type { Currency } from '../types';

export const CurrenciesPage: React.FC = () => {
  const activeCompany = useAppStore(state => state.activeCompany);
  const { currencies, isLoading, create, update } = useCurrencies(activeCompany?.id || '');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Currency | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '', symbol: '', exchangeRate: '1', isDefault: false });
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenModal = (currency?: Currency) => {
    if (currency) {
      setEditing(currency);
      setFormData({
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol || '',
        exchangeRate: String(currency.exchangeRate),
        isDefault: currency.isDefault,
      });
    } else {
      setEditing(null);
      setFormData({ code: '', name: '', symbol: '', exchangeRate: '1', isDefault: false });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!activeCompany) return;
    setIsSaving(true);
    
    const data = {
      companyId: activeCompany.id,
      code: formData.code.toUpperCase(),
      name: formData.name,
      symbol: formData.symbol,
      exchangeRate: Number(formData.exchangeRate),
      isDefault: formData.isDefault,
      isActive: true,
    };

    if (editing) {
      await update(editing.id, data);
    } else {
      await create(data);
    }
    
    setIsSaving(false);
    setIsModalOpen(false);
  };

  const columns = [
    { key: 'code', header: 'الرمز', width: '100px' },
    { key: 'name', header: 'الاسم' },
    { key: 'symbol', header: 'الرمز', width: '100px' },
    { key: 'exchangeRate', header: 'سعر الصرف', align: 'right' as const },
    { key: 'isDefault', header: 'افتراضي', width: '100px', render: (row: Currency) => row.isDefault ? '✓' : '' },
    { key: 'actions', header: '', width: '120px', render: (row: Currency) => (
      <div className="flex gap-1">
        <button onClick={() => handleOpenModal(row)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
          <Pencil size={14} />
        </button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Coins size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">العملات</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة العملات وسعر الصرف</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => handleOpenModal()}>
          إضافة عملة
        </Button>
      </div>

      <Card>
        <Table<Currency>
          data={currencies}
          columns={columns}
          keyExtractor={(row, i) => row.id || String(i)}
          isLoading={isLoading}
          emptyMessage="لا توجد عملات"
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? 'تعديل عملة' : 'إضافة عملة'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
            <Button variant="primary" onClick={handleSave} isLoading={isSaving}>حفظ</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="رمز العملة (مثال: USD)"
            value={formData.code}
            onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
            maxLength={3}
          />
          <Input
            label="اسم العملة"
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
          />
          <Input
            label="الرمز (مثال: $)"
            value={formData.symbol}
            onChange={e => setFormData(prev => ({ ...prev, symbol: e.target.value }))}
          />
          <Input
            label="سعر الصرف (مقابل الريال)"
            type="number"
            value={formData.exchangeRate}
            onChange={e => setFormData(prev => ({ ...prev, exchangeRate: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formData.isDefault}
              onChange={e => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
              className="rounded border-slate-300"
            />
            تعيين كعملة افتراضية
          </label>
        </div>
      </Modal>
    </div>
  );
};

export default CurrenciesPage;
