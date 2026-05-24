import React, { useState } from 'react';
import { ArrowRightLeft, Plus, CheckSquare, BookOpen } from 'lucide-react';
import { Card, Button, Modal, Input, Table, Badge } from '@/core/ui/components';
import { useAppStore } from '@/core/store';
import { postInventoryTransaction } from '@/core/utils/journalEntryGenerator';

interface InventoryTx {
  id: string;
  date: string;
  type: 'in' | 'out' | 'adjustment' | 'transfer';
  product: string;
  warehouse: string;
  quantity: number;
  reference: string;
  notes: string;
  unitCost?: number;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  in: { label: 'وارد', color: 'bg-emerald-100 text-emerald-700' },
  out: { label: 'صادر', color: 'bg-rose-100 text-rose-700' },
  adjustment: { label: 'تسوية', color: 'bg-amber-100 text-amber-700' },
  transfer: { label: 'تحويل', color: 'bg-blue-100 text-blue-700' },
};

export const InventoryTransactionsPage: React.FC = () => {
  const activeCompany = useAppStore(state => state.activeCompany);
  const [transactions, setTransactions] = useState<InventoryTx[]>([
    { id: '1', date: '2024-06-01', type: 'in', product: 'غسالة أوتوماتيك 7 كغ', warehouse: 'المستودع الرئيسي', quantity: 20, reference: 'PINV-2024-0001', notes: 'استلام بضاعة من المورد', unitCost: 85000 },
    { id: '2', date: '2024-06-02', type: 'out', product: 'براد ماء 20 لتر', warehouse: 'المستودع الرئيسي', quantity: 5, reference: 'INV-2024-0001', notes: 'صرف بضاعة لفاتورة مبيعات', unitCost: 15000 },
    { id: '3', date: '2024-06-03', type: 'adjustment', product: 'مكيف سبليت 18000', warehouse: 'مستودع عدن', quantity: -2, reference: 'ADJ-2024-0001', notes: 'تسوية بعد الجرد', unitCost: 95000 },
    { id: '4', date: '2024-06-04', type: 'transfer', product: 'ثلاجة 16 قدم', warehouse: 'المستودع الرئيسي ← مستودع الحديدة', quantity: 8, reference: 'TRF-2024-0001', notes: 'تحويل بين المستودعات', unitCost: 120000 },
    { id: '5', date: '2024-06-05', type: 'in', product: 'شاشة LED 55 بوصة', warehouse: 'مستودع عدن', quantity: 12, reference: 'PINV-2024-0002', notes: 'استلام بضاعة من المورد', unitCost: 145000 },
    { id: '6', date: '2024-06-06', type: 'out', product: 'خلاط كهربائي 500 واط', warehouse: 'المستودع الرئيسي', quantity: 30, reference: 'INV-2024-0002', notes: 'صرف بضاعة لفاتورة مبيعات', unitCost: 12000 },
  ]);

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<Partial<InventoryTx>>({});
  const [postingId, setPostingId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!form.product || !form.warehouse) return;
    const newTx: InventoryTx = {
      id: String(transactions.length + 1),
      date: new Date().toISOString().split('T')[0],
      type: form.type as any || 'in',
      product: form.product,
      warehouse: form.warehouse,
      quantity: Number(form.quantity) || 0,
      reference: form.reference || '',
      notes: form.notes || '',
      unitCost: Number(form.unitCost) || 0,
    };
    setTransactions([newTx, ...transactions]);
    setIsOpen(false);
    setForm({});
  };

  const handlePost = async (tx: InventoryTx) => {
    if (!activeCompany?.id || tx.type === 'transfer') return;
    setPostingId(tx.id);
    const amount = Math.abs(tx.quantity) * (tx.unitCost || 0);
    const result = await postInventoryTransaction(activeCompany.id, {
      reference: tx.reference,
      date: tx.date,
      type: tx.type,
      product: tx.product,
      amount,
    });
    setPostingId(null);
    if (result.success) {
      alert(`تم توليد القيد اليومي للحركة ${tx.reference} بنجاح!`);
    } else if (result.error) {
      alert(`فشل: ${result.error}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ArrowRightLeft size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">الحركات المخزنية</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">جميع حركات المخزون - اضغط ترحيل لتوليد القيد المحاسبي</p>
          </div>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => setIsOpen(true)}>حركة جديدة</Button>
      </div>

      <Card>
        <Table
          data={transactions}
          columns={[
            { key: 'date', header: 'التاريخ' },
            { key: 'type', header: 'النوع', render: (row) => {
              const t = TYPE_LABELS[row.type];
              return <Badge className={t.color}>{t.label}</Badge>;
            }},
            { key: 'product', header: 'المنتج' },
            { key: 'warehouse', header: 'المستودع' },
            { key: 'quantity', header: 'الكمية', align: 'right' },
            { key: 'unitCost', header: 'تكلفة الوحدة', align: 'right', render: (row) => row.unitCost?.toLocaleString('ar-SA') || '-' },
            { key: 'reference', header: 'المرجع' },
            { key: 'actions', header: 'ترحيل', render: (row) => (
              row.type !== 'transfer' && row.type !== 'adjustment' ? (
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<CheckSquare size={14} />}
                  onClick={() => handlePost(row)}
                  disabled={postingId === row.id}
                >
                  {postingId === row.id ? 'جارٍ...' : <><BookOpen size={12} /> ترحيل</>}
                </Button>
              ) : <span className="text-xs text-slate-400">-</span>
            )},
          ]}
          keyExtractor={(row) => row.id}
        />
      </Card>

      {isOpen && (
        <Modal isOpen={isOpen} title="حركة مخزنية جديدة" onClose={() => setIsOpen(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">نوع الحركة</label>
                <select className="input w-full" value={form.type || 'in'} onChange={e => setForm({ ...form, type: e.target.value as any })}>
                  <option value="in">وارد</option>
                  <option value="out">صادر</option>
                  <option value="adjustment">تسوية</option>
                  <option value="transfer">تحويل</option>
                </select>
              </div>
              <Input label="التاريخ" type="date" value={form.date || new Date().toISOString().split('T')[0]} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <Input label="المنتج" value={form.product || ''} onChange={e => setForm({ ...form, product: e.target.value })} />
            <Input label="المستودع" value={form.warehouse || ''} onChange={e => setForm({ ...form, warehouse: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="الكمية" type="number" value={String(form.quantity || '')} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} />
              <Input label="تكلفة الوحدة" type="number" value={String(form.unitCost || '')} onChange={e => setForm({ ...form, unitCost: Number(e.target.value) })} />
            </div>
            <Input label="المرجع" value={form.reference || ''} onChange={e => setForm({ ...form, reference: e.target.value })} />
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

export default InventoryTransactionsPage;
