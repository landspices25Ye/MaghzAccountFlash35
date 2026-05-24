import React, { useState } from 'react';
import { Percent, Save } from 'lucide-react';
import { Card, Button, Input } from '@/core/ui/components';
import { useVatSettings } from '../hooks/useCore';
import { useAppStore } from '@/core/store';
import type { VatSetting } from '../types';

export const VatSettingsPage: React.FC = () => {
  const activeCompany = useAppStore(state => state.activeCompany);
  const { settings, isLoading, update } = useVatSettings(activeCompany?.id || '');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<VatSetting>>({});
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    const result = await update(formData);
    if (result.success) {
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Percent size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">إعدادات ضريبة القيمة المضافة</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">تهيئة نسبة الضريبة والرقم الضريبي</p>
          </div>
        </div>
        {!isEditing ? (
          <Button variant="primary" onClick={() => setIsEditing(true)}>تعديل</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { setIsEditing(false); setFormData(settings || {}); }}>
              إلغاء
            </Button>
            <Button variant="primary" leftIcon={<Save size={16} />} onClick={handleSave} isLoading={isSaving}>
              حفظ
            </Button>
          </div>
        )}
      </div>

      <Card>
        <div className="space-y-4 max-w-lg">
          <Input
            label="الرقم الضريبي"
            value={formData?.vatNumber || ''}
            onChange={e => setFormData((prev: any) => ({ ...prev, vatNumber: e.target.value }))}
            disabled={!isEditing}
          />
          <Input
            label="نسبة الضريبة (%)"
            type="number"
            value={formData?.vatRate || '15'}
            onChange={e => setFormData((prev: any) => ({ ...prev, vatRate: Number(e.target.value) }))}
            disabled={!isEditing}
          />
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={formData?.isInclusive || false}
              onChange={e => setFormData((prev: any) => ({ ...prev, isInclusive: e.target.checked }))}
              disabled={!isEditing}
              className="rounded border-slate-300"
            />
            الضريبة شاملة في السعر
          </label>
        </div>
      </Card>
    </div>
  );
};

export default VatSettingsPage;
