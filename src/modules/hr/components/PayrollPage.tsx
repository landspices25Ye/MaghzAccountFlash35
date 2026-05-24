import React, { useState, useMemo } from 'react';
import { Banknote, Plus, Calculator } from 'lucide-react';
import { Card, Button, Input, Modal, Table } from '@/core/ui/components';

interface PayrollLine {
  id: string;
  employeeName: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  overtime: number;
  netSalary: number;
}

interface PayrollRun {
  id: string;
  month: number;
  year: number;
  totalAmount: number;
  status: 'draft' | 'posted';
  lines: PayrollLine[];
}

export const PayrollPage: React.FC = () => {
  const [payrolls, setPayrolls] = useState<PayrollRun[]>([
    {
      id: '1', month: 6, year: 2026, status: 'posted',
      totalAmount: 4750000,
      lines: [
        { id: '1', employeeName: 'أحمد محمد', baseSalary: 250000, allowances: 50000, deductions: 25000, overtime: 30000, netSalary: 295000 },
        { id: '2', employeeName: 'خالد عبدالله', baseSalary: 300000, allowances: 60000, deductions: 30000, overtime: 45000, netSalary: 375000 },
        { id: '3', employeeName: 'محمد علي', baseSalary: 200000, allowances: 40000, deductions: 20000, overtime: 20000, netSalary: 240000 },
      ],
    },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollRun | null>(null);

  const [employees] = useState([
    { name: 'أحمد محمد', baseSalary: 250000 },
    { name: 'خالد عبدالله', baseSalary: 300000 },
    { name: 'محمد علي', baseSalary: 200000 },
    { name: 'عبدالرحمن سالم', baseSalary: 180000 },
  ]);

  const [formData, setFormData] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const [lines, setLines] = useState<PayrollLine[]>([]);

  const calculateNet = (base: number, allowances: number, deductions: number, overtime: number) => {
    return base + allowances + overtime - deductions;
  };

  const initLines = () => {
    setLines(employees.map(emp => ({
      id: crypto.randomUUID(),
      employeeName: emp.name,
      baseSalary: emp.baseSalary,
      allowances: 0,
      deductions: 0,
      overtime: 0,
      netSalary: emp.baseSalary,
    })));
  };

  const updateLine = (index: number, field: keyof PayrollLine, value: number) => {
    setLines(prev => prev.map((l, i) => {
      if (i !== index) return l;
      const updated = { ...l, [field]: value };
      updated.netSalary = calculateNet(updated.baseSalary, updated.allowances, updated.deductions, updated.overtime);
      return updated;
    }));
  };

  const totalPayroll = useMemo(() => lines.reduce((sum, l) => sum + l.netSalary, 0), [lines]);

  const handleSave = () => {
    setPayrolls(prev => [...prev, {
      id: crypto.randomUUID(),
      month: formData.month,
      year: formData.year,
      totalAmount: totalPayroll,
      status: 'draft',
      lines: [...lines],
    }]);
    setIsModalOpen(false);
    setLines([]);
  };

  const columns = [
    { key: 'month', header: 'الشهر', render: (row: PayrollRun) => `${row.month}/${row.year}` },
    { key: 'totalAmount', header: 'المجموع', align: 'right' as const, render: (row: PayrollRun) => Number(row.totalAmount).toLocaleString('ar-SA') },
    { key: 'status', header: 'الحالة', render: (row: PayrollRun) => (
      <span className={`px-2 py-0.5 rounded-full text-xs ${row.status === 'posted' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
        {row.status === 'posted' ? 'مرحل' : 'مسودة'}
      </span>
    )},
    { key: 'actions', header: '', render: (row: PayrollRun) => (
      <button onClick={() => setSelectedPayroll(row)} className="text-sm text-primary-600 hover:underline">
        عرض التفاصيل
      </button>
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
        <Table<PayrollRun>
          data={payrolls}
          columns={columns}
          keyExtractor={(row, i) => row.id || String(i)}
          emptyMessage="لا يوجد مسير رواتب"
        />
      </Card>

      {/* Payroll Detail Modal */}
      {selectedPayroll && (
        <Modal
          isOpen={!!selectedPayroll}
          onClose={() => setSelectedPayroll(null)}
          title={`مسير ${selectedPayroll.month}/${selectedPayroll.year}`}
          size="lg"
          footer={<Button variant="secondary" onClick={() => setSelectedPayroll(null)}>إغلاق</Button>}
        >
          <Table<PayrollLine>
            data={selectedPayroll.lines}
            columns={[
              { key: 'employeeName', header: 'الموظف' },
              { key: 'baseSalary', header: 'الأساسي', align: 'right' as const, render: (row) => Number(row.baseSalary).toLocaleString('ar-SA') },
              { key: 'allowances', header: 'البدلات', align: 'right' as const, render: (row) => Number(row.allowances).toLocaleString('ar-SA') },
              { key: 'overtime', header: 'الإضافي', align: 'right' as const, render: (row) => Number(row.overtime).toLocaleString('ar-SA') },
              { key: 'deductions', header: 'الاستقطاعات', align: 'right' as const, render: (row) => Number(row.deductions).toLocaleString('ar-SA') },
              { key: 'netSalary', header: 'الصافي', align: 'right' as const, render: (row) => <span className="font-bold">{Number(row.netSalary).toLocaleString('ar-SA')}</span> },
            ]}
            keyExtractor={(row, i) => row.id || String(i)}
          />
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between">
            <span className="font-bold text-slate-700 dark:text-slate-200">الإجمالي:</span>
            <span className="font-bold text-primary-600 text-xl">{Number(selectedPayroll.totalAmount).toLocaleString('ar-SA')} YER</span>
          </div>
        </Modal>
      )}

      {/* Create Payroll Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="إنشاء مسير رواتب"
        size="lg"
        footer={<><Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button><Button variant="primary" leftIcon={<Calculator size={16} />} onClick={handleSave}>حساب وحفظ</Button></>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="الشهر" type="number" value={String(formData.month)} onChange={e => setFormData(prev => ({ ...prev, month: Number(e.target.value) }))} />
            <Input label="السنة" type="number" value={String(formData.year)} onChange={e => setFormData(prev => ({ ...prev, year: Number(e.target.value) }))} />
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
                    <td className="p-2"><Input type="number" value={String(line.baseSalary)} onChange={e => updateLine(idx, 'baseSalary', Number(e.target.value))} /></td>
                    <td className="p-2"><Input type="number" value={String(line.allowances)} onChange={e => updateLine(idx, 'allowances', Number(e.target.value))} /></td>
                    <td className="p-2"><Input type="number" value={String(line.deductions)} onChange={e => updateLine(idx, 'deductions', Number(e.target.value))} /></td>
                    <td className="p-2"><Input type="number" value={String(line.overtime)} onChange={e => updateLine(idx, 'overtime', Number(e.target.value))} /></td>
                    <td className="p-2 text-sm font-bold text-primary-600 text-right">{line.netSalary.toLocaleString('ar-SA')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between py-3 px-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
            <span className="font-bold text-primary-700 dark:text-primary-300">الإجمالي:</span>
            <span className="font-bold text-primary-700 dark:text-primary-300 text-xl">{totalPayroll.toLocaleString('ar-SA')} YER</span>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PayrollPage;
