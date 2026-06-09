import React, { useState } from 'react';
import { Building2, Save, Upload } from 'lucide-react';
import { Card, CardTitle, CardDescription, Button, Input } from '@/core/ui/components';
import { useCompany } from '../hooks/useCore';
import { useTranslation } from '@/core/i18n/useTranslation';
import type { Company } from '../types';
import { cn } from '@/core/utils';
import { YER_CODE } from '@/core/utils/currencyConverter';

export const CompanySetup: React.FC = () => {
  const { t } = useTranslation();
  const { company, isLoading, update } = useCompany();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Company>>({});
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (company) {
      setFormData(company);
    }
  }, [company]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev: Partial<typeof company>) => ({ ...prev, [field]: value }));
  };

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
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t('settings.company')}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">إدارة بيانات المؤسسة</p>
        </div>
        {!isEditing ? (
          <Button variant="primary" leftIcon={<Upload size={16} />} onClick={() => setIsEditing(true)}>
            {t('edit')}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { setIsEditing(false); setFormData(company || {}); }}>
              {t('cancel')}
            </Button>
            <Button variant="primary" leftIcon={<Save size={16} />} onClick={handleSave} isLoading={isSaving}>
              {t('save')}
            </Button>
          </div>
        )}
      </div>

      <Card>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
            <Building2 size={32} className="text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <CardTitle>{company?.name || '---'}</CardTitle>
            <CardDescription>{company?.nameEn || '---'}</CardDescription>
          </div>
        </div>

        <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', !isEditing && 'opacity-75')}>
          <Input
            label="اسم الشركة (عربي)"
            value={formData?.name || ''}
            onChange={e => handleChange('name', e.target.value)}
            disabled={!isEditing}
          />
          <Input
            label="اسم الشركة (إنجليزي)"
            value={formData?.nameEn || ''}
            onChange={e => handleChange('nameEn', e.target.value)}
            disabled={!isEditing}
          />
          <Input
            label="العملة الافتراضية"
            value={formData?.currency || YER_CODE}
            disabled
          />
          <Input
            label="الرقم الضريبي"
            value={formData?.taxNumber || ''}
            onChange={e => handleChange('taxNumber', e.target.value)}
            disabled={!isEditing}
          />
          <Input
            label="العنوان"
            value={formData?.address || ''}
            onChange={e => handleChange('address', e.target.value)}
            disabled={!isEditing}
          />
          <Input
            label="الهاتف"
            value={formData?.phone || ''}
            onChange={e => handleChange('phone', e.target.value)}
            disabled={!isEditing}
          />
          <Input
            label="البريد الإلكتروني"
            value={formData?.email || ''}
            onChange={e => handleChange('email', e.target.value)}
            disabled={!isEditing}
          />
        </div>
      </Card>
    </div>
  );
};

export default CompanySetup;
