import React, { useState } from 'react';
import { Undo2, Plus, CheckSquare, FileText, BookOpen } from 'lucide-react';
import { Card, Button, Modal, Input, Table, Badge } from '@/core/ui/components';
import { SupplierSelect, ProductSelect } from '@/core/ui/components/smart';
import { useAppStore } from '@/core/store';
import { postPurchaseReturn } from '@/core/utils/journalEntryGenerator';

interface PurchaseReturn {
  id: string;
  returnNumber: string;
  invoiceNumber: string;
  supplier: string;
  date: string;
  product: string;
  quantity: number;
  amount: number;
  reason: string;
  status: 'draft' | 'posted';
}

export const PurchaseReturnsPage: React.FC = () => {
  const [returns, setReturns] = useState<PurchaseReturn[]>([
    { id: '1', returnNumber: 'PR-2024-001', invoiceNumber: 'PINV-2024-0012', supplier: 'مصنع الريان للبلاستيك', date: '2024-06-08', product: 'خلاط كهربائي 500 واط', quantity: 5, amount: 75000, reason: 'عيب مصنعي', status: 'posted' },
    { id: '2', returnNumber: 'PR-2024-002', invoiceNumber: 'PINV-2024-0015', supplier: 'شركة الصين للتجارة الدولية', date: '2024-06-14', product: 'مكيف سبليت 18000', quantity: 2, amount: 190000, reason: 'تلف أثناء الشحن', status: 'draft' },
  ]);

  const activeCompany = useAppStore(state => state.activeCompany);
  const [postingId, setPostingId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<Partial<PurchaseReturn>>({});

  const handlePost = async (ret: PurchaseReturn) => {
    if (!activeCompany?.id) return;
    setPostingId(ret.id);
    const result = await postPurchaseReturn(activeCompany.id, {
      returnNumber: ret.returnNumber,
      date: ret.date,
      supplier: ret.supplier,
      amount: ret.amount,
    });
    setPostingId(null);
    if (result.success) {
      alert(`تم ترحيل مردود المشتريات ${ret.returnNumber} وتوليد القيد اليومي بنجاح!`);
      setReturns(returns.map(r => r.id === ret.id ? { ...r, status: 'posted' as const } : r));
    } else {
      alert(`فشل الترحيل: ${result.error}`);
    }
  };

  const handleAdd = () => {
    if (!form.supplier || !form.invoiceNumber) return;
    const newRet: PurchaseReturn = {
      id: String(returns.length + 1),
      returnNumber: `PR-2024-${String(returns.length + 1).padStart(3, '0')}`,
      invoiceNumber: form.invoiceNumber,
      supplier: form.supplier,
      date: new Date().toISOString().split('T')[0],
      product: form.product || '',
      quantity: Number(form.quantity) || 0,
      amount: Number(form.amount) || 0,
      reason: form.reason || '',
      status: 'draft',
    };
    setReturns([newRet, ...returns]);
    setIsOpen(false);
    setForm({});
  };

  const totalAmount = returns.filter(r => r.status === 'posted').reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Undo2 size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">مردودات المشتريات</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة مردودات البضاعة للموردين - اضغط ترحيل لتوليد القيد المحاسبي</p>
          </div>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => setIsOpen(true)}>مردود جديد</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">عدد المردودات</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{returns.length}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">إجمالي المردودات المرحّلة</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{totalAmount.toLocaleString('ar-SA')} YER</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">مسودات</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{returns.filter(r => r.status === 'draft').length}</p>
          </div>
        </Card>
      </div>

      <Card>
        <Table
          data={returns}
          columns={[
            { key: 'returnNumber', header: 'رقم المردود' },
            { key: 'date', header: 'التاريخ' },
            { key: 'invoiceNumber', header: 'رقم فاتورة الشراء', render: (row) => (
              <span className="flex items-center gap-1 text-blue-600"><FileText size={14} /> {row.invoiceNumber}</span>
            )},
            { key: 'supplier', header: 'المورد' },
            { key: 'product', header: 'المنتج' },
            { key: 'quantity', header: 'الكمية', align: 'right' },
            { key: 'amount', header: 'المبلغ', align: 'right', render: (row) => row.amount.toLocaleString('ar-SA') },
            { key: 'reason', header: 'السبب' },
            { key: 'status', header: 'الحالة', render: (row) => (
              <Badge className={row.status === 'posted' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                {row.status === 'posted' ? 'مرحّل' : 'مسوّد'}
              </Badge>
            )},
            { key: 'actions', header: 'إجراء', render: (row) => (
              row.status === 'draft' ? (
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<CheckSquare size={14} />}
                  onClick={() => handlePost(row)}
                  disabled={postingId === row.id}
                >
                  {postingId === row.id ? 'جارٍ الترحيل...' : 'ترحيل'}
                </Button>
              ) : (
                <span className="text-xs text-slate-400 flex items-center gap-1"><BookOpen size={12} /> مرحّل</span>
              )
            )},
          ]}
          keyExtractor={(row) => row.id}
        />
      </Card>

      {isOpen && (
        <Modal isOpen={isOpen} title="مردود مشتريات جديد" onClose={() => setIsOpen(false)}>
          <div className="space-y-4">
            <Input label="رقم فاتورة الشراء الأصلية" value={form.invoiceNumber || ''} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })} />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">المورد</label>
              <SupplierSelect companyId={activeCompany?.id || ''} value={form.supplier || ''} onChange={v => setForm({ ...form, supplier: v || '' })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">المنتج</label>
              <ProductSelect companyId={activeCompany?.id || ''} value={form.product || ''} onChange={v => setForm({ ...form, product: (Array.isArray(v) ? v[0] : v) || '' })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="الكمية" type="number" value={String(form.quantity || '')} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} />
              <Input label="المبلغ" type="number" value={String(form.amount || '')} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
            </div>
            <Input label="سبب المردود" value={form.reason || ''} onChange={e => setForm({ ...form, reason: e.target.value })} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsOpen(false)}>إلغاء</Button>
              <Button onClick={handleAdd} leftIcon={<CheckSquare size={16} />}>حفظ</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PurchaseReturnsPage;
