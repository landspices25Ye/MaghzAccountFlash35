import React, { useState } from 'react';
import { Banknote, Plus, CheckSquare, Users, BookOpen, Printer } from 'lucide-react';
import { printDocument } from '@/core/utils/printDocument';
import { Card, Button, Modal, Input, Table, Badge } from '@/core/ui/components';
import { CustomerSelect, BankSelect } from '@/core/ui/components/smart';
import { useAppStore } from '@/core/store';
import { postReceiptVoucher } from '@/core/utils/journalEntryGenerator';

interface ReceiptVoucher {
  id: string;
  voucherNumber: string;
  date: string;
  customer: string;
  amount: number;
  paymentMethod: 'cash' | 'bank' | 'check';
  bankAccount?: string;
  checkNumber?: string;
  checkDate?: string;
  notes: string;
  status: 'draft' | 'posted';
}

export const ReceiptVouchersPage: React.FC = () => {
  const [vouchers, setVouchers] = useState<ReceiptVoucher[]>([
    { id: '1', voucherNumber: 'RV-2024-001', date: '2024-06-05', customer: 'شركة اليمن للتجارة', amount: 500000, paymentMethod: 'bank', bankAccount: 'البنك اليمني الدولي', notes: 'تحصيل دفعة من العميل', status: 'posted' },
    { id: '2', voucherNumber: 'RV-2024-002', date: '2024-06-08', customer: 'مؤسسة الأمل التجارية', amount: 200000, paymentMethod: 'cash', notes: 'تحصيل نقدي من العميل', status: 'posted' },
    { id: '3', voucherNumber: 'RV-2024-003', date: '2024-06-12', customer: 'شركة الخليج للمواد الغذائية', amount: 750000, paymentMethod: 'check', checkNumber: 'CH-445566', checkDate: '2024-06-20', notes: 'شيك بنكي مؤجل', status: 'draft' },
    { id: '4', voucherNumber: 'RV-2024-004', date: '2024-06-15', customer: 'مؤسسة النور للأدوات المنزلية', amount: 300000, paymentMethod: 'bank', bankAccount: 'البنك اليمني الدولي', notes: 'تحويل بنكي', status: 'posted' },
  ]);

  const activeCompany = useAppStore(state => state.activeCompany);
  const [postingId, setPostingId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<Partial<ReceiptVoucher>>({ paymentMethod: 'cash' });

  const handlePrint = (voucher: ReceiptVoucher) => {
    printDocument({
      type: 'receipt-voucher',
      docNumber: voucher.voucherNumber,
      date: voucher.date,
      partyName: voucher.customer,
      partyLabel: 'العميل',
      lines: [{
        description: voucher.notes || 'سند قبض',
        total: voucher.amount,
      }],
      subtotal: voucher.amount,
      vatAmount: 0,
      totalAmount: voucher.amount,
      notes: voucher.notes,
      companyName: activeCompany?.name,
      currency: activeCompany?.currency,
    });
  };

  const handlePost = async (voucher: ReceiptVoucher) => {
    if (!activeCompany?.id) return;
    setPostingId(voucher.id);
    const result = await postReceiptVoucher(activeCompany.id, {
      voucherNumber: voucher.voucherNumber,
      date: voucher.date,
      customer: voucher.customer,
      amount: voucher.amount,
      paymentMethod: voucher.paymentMethod,
    });
    setPostingId(null);
    if (result.success) {
      alert(`تم ترحيل سند القبض ${voucher.voucherNumber} وتوليد القيد اليومي بنجاح!`);
      setVouchers(vouchers.map(v => v.id === voucher.id ? { ...v, status: 'posted' as const } : v));
    } else {
      alert(`فشل الترحيل: ${result.error}`);
    }
  };

  const handleAdd = () => {
    if (!form.customer || !form.amount) return;
    const newV: ReceiptVoucher = {
      id: String(vouchers.length + 1),
      voucherNumber: `RV-2024-${String(vouchers.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      customer: form.customer,
      amount: Number(form.amount) || 0,
      paymentMethod: form.paymentMethod as any || 'cash',
      bankAccount: form.bankAccount,
      checkNumber: form.checkNumber,
      checkDate: form.checkDate,
      notes: form.notes || '',
      status: 'draft',
    };
    setVouchers([newV, ...vouchers]);
    setIsOpen(false);
    setForm({ paymentMethod: 'cash' });
  };

  const totalCash = vouchers.filter(v => v.status === 'posted' && v.paymentMethod === 'cash').reduce((s, v) => s + v.amount, 0);
  const totalBank = vouchers.filter(v => v.status === 'posted' && v.paymentMethod === 'bank').reduce((s, v) => s + v.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Banknote size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">سندات القبض</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">سندات استلام النقدية والشيكات من العملاء - اضغط ترحيل لتوليد القيد المحاسبي</p>
          </div>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => setIsOpen(true)}>سند قبض جديد</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">إجمالي القبض النقدي</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalCash.toLocaleString('ar-SA')} YER</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">إجمالي القبض البنكي</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalBank.toLocaleString('ar-SA')} YER</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">عدد السندات</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{vouchers.length}</p>
          </div>
        </Card>
      </div>

      <Card>
        <Table
          data={vouchers}
          columns={[
            { key: 'voucherNumber', header: 'رقم السند' },
            { key: 'date', header: 'التاريخ' },
            { key: 'customer', header: 'العميل', render: (row) => (
              <span className="flex items-center gap-1"><Users size={14} /> {row.customer}</span>
            )},
            { key: 'amount', header: 'المبلغ', align: 'right', render: (row) => row.amount.toLocaleString('ar-SA') },
            { key: 'paymentMethod', header: 'طريقة الدفع', render: (row) => (
              <Badge className={
                row.paymentMethod === 'cash' ? 'bg-emerald-100 text-emerald-700' :
                row.paymentMethod === 'bank' ? 'bg-blue-100 text-blue-700' :
                'bg-amber-100 text-amber-700'
              }>
                {row.paymentMethod === 'cash' ? 'نقدي' : row.paymentMethod === 'bank' ? 'بنكي' : 'شيك'}
              </Badge>
            )},
            { key: 'checkNumber', header: 'رقم الشيك' },
            { key: 'notes', header: 'ملاحظات' },
            { key: 'status', header: 'الحالة', render: (row) => (
              <Badge className={row.status === 'posted' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                {row.status === 'posted' ? 'مرحّل' : 'مسوّد'}
              </Badge>
            )},
            { key: 'actions', header: 'إجراء', render: (row: ReceiptVoucher) => (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" leftIcon={<Printer size={14} />} onClick={() => handlePrint(row)} title="طباعة" />
                {row.status === 'draft' ? (
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
                )}
              </div>
            )},
          ]}
          keyExtractor={(row) => row.id}
        />
      </Card>

      {isOpen && (
        <Modal isOpen={isOpen} title="سند قبض جديد" onClose={() => setIsOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">العميل</label>
              <CustomerSelect companyId={activeCompany?.id || ''} value={form.customer || ''} onChange={v => setForm({ ...form, customer: v || '' })} />
            </div>
            <Input label="المبلغ" type="number" value={String(form.amount || '')} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
            <div>
              <label className="block text-sm mb-1">طريقة الدفع</label>
              <select className="input w-full" value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value as any })}>
                <option value="cash">نقدي</option>
                <option value="bank">تحويل بنكي</option>
                <option value="check">شيك</option>
              </select>
            </div>
            {form.paymentMethod === 'bank' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">الحساب البنكي</label>
                <BankSelect companyId={activeCompany?.id || ''} value={form.bankAccount || ''} onChange={v => setForm({ ...form, bankAccount: v || '' })} />
              </div>
            )}
            {form.paymentMethod === 'check' && (
              <>
                <Input label="رقم الشيك" value={form.checkNumber || ''} onChange={e => setForm({ ...form, checkNumber: e.target.value })} />
                <Input label="تاريخ الشيك" type="date" value={form.checkDate || ''} onChange={e => setForm({ ...form, checkDate: e.target.value })} />
              </>
            )}
            <Input label="ملاحظات" value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
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

export default ReceiptVouchersPage;
