import React, { useState, useMemo } from 'react';
import { Banknote, Plus, Calculator, Printer } from 'lucide-react';
import { Card, Button, Input, Modal, Table } from '@/core/ui/components';
import { StatusBadge } from '@/core/ui/components/StatusBadge';
import { EmptyState } from '@/core/ui/components/EmptyState';
import { useAppStore } from '@/core/store';
import { usePayrollRuns, useEmployees } from '../hooks/useHr';
import { useFormatters } from '@/core/utils/useFormatters';
import type { PayrollLine } from '../types';

export const PayrollPage: React.FC = () => {
  const activeCompany = useAppStore((state) => state.activeCompany);
  const companyId = activeCompany?.id || '';
  const { payrolls, isLoading, create, post } = usePayrollRuns(companyId);
  const { employees } = useEmployees(companyId);
  const { formatCurrency } = useFormatters(companyId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<string | null>(null);
  const [formData, setFormData] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const [lines, setLines] = useState<PayrollLine[]>([]);

  const calculateNet = (base: number, allowances: number, deductions: number, overtime: number) => base + allowances + overtime - deductions;

  const initLines = () => {
    setLines(employees.map((emp) => ({
      id: crypto.randomUUID(),
      payrollRunId: '',
      employeeId: emp.id,
      employeeName: emp.fullName,
      baseSalary: emp.baseSalary || 0,
      allowances: 0,
      deductions: 0,
      overtime: 0,
      netSalary: emp.baseSalary || 0,
    })));
  };

  const updateLine = (index: number, field: keyof PayrollLine, value: number) => {
    setLines((prev) => prev.map((l, i) => {
      if (i !== index) return l;
      const updated = { ...l, [field]: value };
      updated.netSalary = calculateNet(updated.baseSalary, updated.allowances, updated.deductions, updated.overtime);
      return updated;
    }));
  };

  const totalPayroll = useMemo(() => lines.reduce((sum, l) => sum + l.netSalary, 0), [lines]);

  const handleSave = async () => {
    await create({
      companyId,
      month: formData.month,
      year: formData.year,
      totalAmount: totalPayroll,
      status: 'draft',
      lines: [...lines],
    });
    setIsModalOpen(false);
    setLines([]);
  };

  const handlePost = async (id: string) => {
    await post(id);
  };

  const selectedPayrollData = selectedPayroll ? payrolls.find((p) => p.id === selectedPayroll) || null : null;

  const columns = [
    { key: 'month', header: 'الشهر', render: (row: { month: number; year: number }) => `${row.month}/${row.year}` },
    { key: 'totalAmount', header: 'المجموع', align: 'right' as const, render: (row: { totalAmount: number }) => formatCurrency(row.totalAmount) },
    { key: 'status', header: 'الحالة', render: (row: { status: string }) => <StatusBadge status={row.status} /> },
    { key: 'actions', header: '', render: (row: { id: string; status: string }) => (
      <div className="flex items-center gap-1">
        <button onClick={() => setSelectedPayroll(row.id)} className="text-sm text-primary-600 hover:underline">عرض التفاصيل</button>
        {row.status === 'draft' && (
          <button onClick={() => handlePost(row.id)} className="text-sm text-emerald-600 hover:underline mr-2">ترحيل</button>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Banknote size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">مسير الرواتب</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">حساب وإدارة رواتب الموظفين</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => { initLines(); setIsModalOpen(true); }}>
          مسير جديد
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="py-12 text-center text-slate-500">جارٍ التحميل...</div>
        ) : payrolls.length === 0 ? (
          <EmptyState icon="file" title="لا يوجد مسير رواتب" description="يمكنك إنشاء مسير جديد" action={<Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => { initLines(); setIsModalOpen(true); }}>مسير جديد</Button>} />
        ) : (
          <Table
            data={payrolls}
            columns={columns}
            keyExtractor={(row) => row.id}
            emptyMessage="لا يوجد مسير رواتب"
          />
        )}
      </Card>

      {/* Detail Modal */}
      {selectedPayrollData && (
        <Modal
          isOpen={!!selectedPayrollData}
          onClose={() => setSelectedPayroll(null)}
          title={`مسير ${selectedPayrollData.month}/${selectedPayrollData.year}`}
          size="lg"
          footer={
            <div className="flex items-center gap-2 justify-end w-full">
              <Button variant="secondary" onClick={() => setSelectedPayroll(null)}>إغلاق</Button>
              <Button variant="primary" leftIcon={<Printer size={16} />} onClick={() => handlePrintPayroll(selectedPayrollData, formatCurrency)}>طباعة</Button>
            </div>
          }
        >
          <Table<PayrollLine>
            data={selectedPayrollData.lines}
            columns={[
              { key: 'employeeName', header: 'الموظف' },
              { key: 'baseSalary', header: 'الأساسي', align: 'right' as const, render: (row) => formatCurrency(row.baseSalary) },
              { key: 'allowances', header: 'البدلات', align: 'right' as const, render: (row) => formatCurrency(row.allowances) },
              { key: 'overtime', header: 'الإضافي', align: 'right' as const, render: (row) => formatCurrency(row.overtime) },
              { key: 'deductions', header: 'الاستقطاعات', align: 'right' as const, render: (row) => formatCurrency(row.deductions) },
              { key: 'netSalary', header: 'الصافي', align: 'right' as const, render: (row) => <span className="font-bold">{formatCurrency(row.netSalary)}</span> },
            ]}
            keyExtractor={(row) => row.id}
          />
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between">
            <span className="font-bold text-slate-700 dark:text-slate-200">الإجمالي:</span>
            <span className="font-bold text-primary-600 text-xl">{formatCurrency(selectedPayrollData.totalAmount)} YER</span>
          </div>
        </Modal>
      )}

      {/* Create Payroll Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="إنشاء مسير رواتب"
        size="lg"
        footer={
          <div className="flex items-center gap-2 justify-end w-full">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
            <Button variant="primary" leftIcon={<Calculator size={16} />} onClick={handleSave}>حساب وحفظ</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="الشهر" type="number" value={String(formData.month)} onChange={(e) => setFormData((prev) => ({ ...prev, month: Number(e.target.value) }))} />
            <Input label="السنة" type="number" value={String(formData.year)} onChange={(e) => setFormData((prev) => ({ ...prev, year: Number(e.target.value) }))} />
          </div>

          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="text-xs font-semibold text-slate-500 p-2 text-right">الموظف</th>
                  <th className="text-xs font-semibold text-slate-500 p-2 text-right w-28">الأساسي</th>
                  <th className="text-xs font-semibold text-slate-500 p-2 text-right w-24">بدلات</th>
                  <th className="text-xs font-semibold text-slate-500 p-2 text-right w-24">استقطاعات</th>
                  <th className="text-xs font-semibold text-slate-500 p-2 text-right w-24">إضافي</th>
                  <th className="text-xs font-semibold text-slate-500 p-2 text-right w-28">الصافي</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={line.id} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="p-2 text-sm">{line.employeeName}</td>
                    <td className="p-2"><Input type="number" value={String(line.baseSalary)} onChange={(e) => updateLine(idx, 'baseSalary', Number(e.target.value))} /></td>
                    <td className="p-2"><Input type="number" value={String(line.allowances)} onChange={(e) => updateLine(idx, 'allowances', Number(e.target.value))} /></td>
                    <td className="p-2"><Input type="number" value={String(line.deductions)} onChange={(e) => updateLine(idx, 'deductions', Number(e.target.value))} /></td>
                    <td className="p-2"><Input type="number" value={String(line.overtime)} onChange={(e) => updateLine(idx, 'overtime', Number(e.target.value))} /></td>
                    <td className="p-2 text-sm font-bold text-primary-600 text-right">{formatCurrency(line.netSalary)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between py-3 px-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
            <span className="font-bold text-primary-700 dark:text-primary-300">الإجمالي:</span>
            <span className="font-bold text-primary-700 dark:text-primary-300 text-xl">{formatCurrency(totalPayroll)} YER</span>
          </div>
        </div>
      </Modal>
    </div>
  );
};

function handlePrintPayroll(payroll: { month: number; year: number; totalAmount: number; lines: PayrollLine[] }, formatCurrency: (value: number | string) => string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const rows = payroll.lines.map((l, i) => `
    <tr>
      <td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${i + 1}</td>
      <td style="padding:8px;border:1px solid #e2e8f0">${l.employeeName}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${formatCurrency(l.baseSalary)}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${formatCurrency(l.allowances)}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${formatCurrency(l.deductions)}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${formatCurrency(l.overtime)}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;text-align:center;font-weight:700">${formatCurrency(l.netSalary)}</td>
    </tr>
  `).join('');
  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>مسير رواتب</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
  <style>body{font-family:'Cairo',sans-serif;background:#f8fafc;padding:24px}.page{max-width:210mm;margin:0 auto;background:white;padding:32px;box-shadow:0 4px 6px rgba(0,0,0,0.1);border-radius:8px}h2{color:#1e40af;border-bottom:2px solid #1e40af;padding-bottom:8px}table{width:100%;border-collapse:collapse;font-size:13px;margin-top:16px}th{background:#1e40af;color:white;padding:10px;border:1px solid #1e40af}td{border:1px solid #e2e8f0}.total{font-weight:700;color:#1e40af;font-size:18px;text-align:left;margin-top:12px}</style></head><body>
  <div class="page"><h2>مسير الرواتب</h2>
  <p><strong>الشهر/السنة:</strong> ${payroll.month}/${payroll.year}</p>
  <table><thead><tr><th>#</th><th>الموظف</th><th>الأساسي</th><th>البدلات</th><th>الاستقطاعات</th><th>الإضافي</th><th>الصافي</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="total">الإجمالي: ${formatCurrency(payroll.totalAmount)} ر.ي</div>
  <div style="margin-top:32px;text-align:center;font-size:12px;color:#94a3b8">تم إصدار هذا المستند من نظام maghzaccount-pro</div>
  </div></body></html>`;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export default PayrollPage;
