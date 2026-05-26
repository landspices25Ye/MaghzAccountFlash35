import React, { useState, useMemo } from 'react';
import { LogOut, Plus, Printer, Calculator } from 'lucide-react';
import { Card, Button, Input, Modal, Table } from '@/core/ui/components';
import { ConfirmDialog } from '@/core/ui/components/ConfirmDialog';
import { StatusBadge } from '@/core/ui/components/StatusBadge';
import { EmptyState } from '@/core/ui/components/EmptyState';
import { useAppStore } from '@/core/store';
import { useEndOfServices, useEmployees } from '../hooks/useHr';
import { useFormatters } from '@/core/utils/useFormatters';
import type { EndOfService } from '../types';

export const EndOfServicePage: React.FC = () => {
  const activeCompany = useAppStore((state) => state.activeCompany);
  const companyId = activeCompany?.id || '';
  const { items, isLoading, create, updateStatus, remove } = useEndOfServices(companyId);
  const { employees } = useEmployees(companyId);
  const { formatCurrency } = useFormatters(companyId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<EndOfService | null>(null);
  const [formData, setFormData] = useState({
    employeeId: '', terminationDate: '', reason: 'resignation' as EndOfService['reason'], notes: '',
  });

  const resetForm = () => {
    setFormData({ employeeId: '', terminationDate: '', reason: 'resignation', notes: '' });
  };

  const selectedEmployee = useMemo(() => employees.find((e) => e.id === formData.employeeId), [employees, formData.employeeId]);

  const serviceYears = useMemo(() => {
    if (!selectedEmployee || !formData.terminationDate || !selectedEmployee.hireDate) return 0;
    const start = new Date(selectedEmployee.hireDate);
    const end = new Date(formData.terminationDate);
    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25)));
  }, [selectedEmployee, formData.terminationDate]);

  const lastSalary = selectedEmployee?.baseSalary || 0;

  const eosAmount = useMemo(() => {
    // Simplified EOS formula: (lastSalary / 2) * serviceYears for first 5 years, full salary per year after
    if (serviceYears <= 0 || lastSalary <= 0) return 0;
    const firstFive = Math.min(serviceYears, 5);
    const afterFive = Math.max(0, serviceYears - 5);
    return Math.round((lastSalary / 2) * firstFive + lastSalary * afterFive);
  }, [serviceYears, lastSalary]);

  const handleSave = async () => {
    if (!formData.employeeId || !formData.terminationDate) return;
    await create({
      companyId,
      employeeId: formData.employeeId,
      terminationDate: formData.terminationDate,
      serviceYears,
      lastSalary,
      eosAmount,
      reason: formData.reason,
      status: 'draft',
      notes: formData.notes || undefined,
    });
    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await remove(confirmDelete);
    setConfirmDelete(null);
  };

  const handlePrint = (item: EndOfService) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const html = generateEosPrintHtml(item, formatCurrency);
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const columns = [
    { key: 'employeeName', header: 'الموظف', render: (row: EndOfService) => row.employeeName || row.employeeId },
    { key: 'terminationDate', header: 'تاريخ الانتهاء', width: '140px' },
    { key: 'serviceYears', header: 'سنوات الخدمة', width: '110px' },
    { key: 'lastSalary', header: 'آخر راتب', align: 'right' as const, render: (row: EndOfService) => formatCurrency(row.lastSalary) },
    { key: 'eosAmount', header: 'مبلغ نهاية الخدمة', align: 'right' as const, render: (row: EndOfService) => <span className="font-bold text-primary-600">{formatCurrency(row.eosAmount)}</span> },
    { key: 'status', header: 'الحالة', width: '100px', render: (row: EndOfService) => <StatusBadge status={row.status} /> },
    { key: 'actions', header: '', width: '140px', render: (row: EndOfService) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="text-slate-600" onClick={() => setSelectedItem(row)} title="عرض">
          <Calculator size={16} />
        </Button>
        <Button variant="ghost" size="sm" className="text-slate-600" onClick={() => handlePrint(row)} title="طباعة">
          <Printer size={16} />
        </Button>
        {row.status === 'draft' && (
          <Button variant="ghost" size="sm" className="text-emerald-600" onClick={() => updateStatus(row.id, 'approved')} title="اعتماد">
            <span className="text-xs">اعتماد</span>
          </Button>
        )}
        <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => setConfirmDelete(row.id)} title="حذف">
          <LogOut size={16} />
        </Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LogOut size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">نهاية الخدمة</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">حساب وإدارة مستحقات نهاية الخدمة</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>حساب جديد</Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="py-12 text-center text-slate-500">جارٍ التحميل...</div>
        ) : items.length === 0 ? (
          <EmptyState icon="file" title="لا توجد سجلات" description="يمكنك إنشاء حساب نهاية خدمة جديد" action={<Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>حساب جديد</Button>} />
        ) : (
          <Table<EndOfService>
            data={items}
            columns={columns}
            keyExtractor={(row) => row.id}
            emptyMessage="لا توجد سجلات"
          />
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title="حساب نهاية خدمة"
        size="md"
        footer={
          <div className="flex items-center gap-2 justify-end w-full">
            <Button variant="secondary" onClick={() => { setIsModalOpen(false); resetForm(); }}>إلغاء</Button>
            <Button variant="primary" onClick={handleSave}>حفظ</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">الموظف</label>
            <select value={formData.employeeId} onChange={(e) => setFormData((prev) => ({ ...prev, employeeId: e.target.value }))} className="form-control">
              <option value="">اختر موظف</option>
              {employees.map((emp) => (<option key={emp.id} value={emp.id}>{emp.fullName}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="تاريخ نهاية الخدمة" type="date" value={formData.terminationDate} onChange={(e) => setFormData((prev) => ({ ...prev, terminationDate: e.target.value }))} />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">السبب</label>
              <select value={formData.reason} onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value as EndOfService['reason'] }))} className="form-control">
                <option value="resignation">استقالة</option>
                <option value="termination">فصل</option>
                <option value="contract_end">انتهاء عقد</option>
                <option value="retirement">تقاعد</option>
              </select>
            </div>
          </div>
          {selectedEmployee && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">تاريخ التعيين:</span><span className="font-medium">{selectedEmployee.hireDate || '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">الراتب الأخير:</span><span className="font-medium">{formatCurrency(lastSalary)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">سنوات الخدمة:</span><span className="font-medium">{serviceYears.toFixed(1)}</span></div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
                <span className="text-slate-500 font-bold">مبلغ نهاية الخدمة:</span>
                <span className="font-bold text-primary-600 text-lg">{formatCurrency(eosAmount)} YER</span>
              </div>
            </div>
          )}
          <Input label="ملاحظات" value={formData.notes} onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))} />
        </div>
      </Modal>

      {/* View Modal */}
      {selectedItem && (
        <Modal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          title="تفاصيل نهاية الخدمة"
          size="md"
          footer={<Button variant="secondary" onClick={() => setSelectedItem(null)}>إغلاق</Button>}
        >
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">الموظف:</span><span className="font-medium">{selectedItem.employeeName || selectedItem.employeeId}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">تاريخ الانتهاء:</span><span className="font-medium">{selectedItem.terminationDate}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">سنوات الخدمة:</span><span className="font-medium">{selectedItem.serviceYears}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">آخر راتب:</span><span className="font-medium">{formatCurrency(selectedItem.lastSalary)}</span></div>
            <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
              <span className="text-slate-500 font-bold">المبلغ:</span>
              <span className="font-bold text-primary-600 text-lg">{formatCurrency(selectedItem.eosAmount)} YER</span>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="حذف سجل نهاية الخدمة"
        message="هل أنت متأكد من حذف هذا السجل؟"
        variant="danger"
      />
    </div>
  );
};

function generateEosPrintHtml(item: EndOfService, formatCurrency: (value: number | string) => string): string {
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>نهاية خدمة</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
  <style>body{font-family:'Cairo',sans-serif;background:#f8fafc;padding:24px}.page{max-width:210mm;margin:0 auto;background:white;padding:32px;box-shadow:0 4px 6px rgba(0,0,0,0.1);border-radius:8px}h2{color:#1e40af;border-bottom:2px solid #1e40af;padding-bottom:8px}.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0}.total{font-weight:700;color:#1e40af;font-size:18px;text-align:left;margin-top:12px}</style></head><body>
  <div class="page"><h2>مستحقات نهاية الخدمة</h2>
  <div class="row"><span>الموظف:</span><strong>${item.employeeName || item.employeeId}</strong></div>
  <div class="row"><span>تاريخ الانتهاء:</span><strong>${item.terminationDate}</strong></div>
  <div class="row"><span>سنوات الخدمة:</span><strong>${item.serviceYears}</strong></div>
  <div class="row"><span>آخر راتب:</span><strong>${formatCurrency(item.lastSalary)}</strong></div>
  <div class="total">المبلغ الإجمالي: ${formatCurrency(item.eosAmount)} ر.ي</div>
  <div style="margin-top:32px;text-align:center;font-size:12px;color:#94a3b8">تم إصدار هذا المستند من نظام maghzaccount-pro</div>
  </div></body></html>`;
}

export default EndOfServicePage;
