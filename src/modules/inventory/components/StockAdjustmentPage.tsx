import React, { useState } from 'react';
import { Scale, Plus, CheckSquare, BookOpen } from 'lucide-react';
import { Card, Button, Modal, Input, Table, Badge } from '@/core/ui/components';
import { ProductSelect, WarehouseSelect } from '@/core/ui/components/smart';
import { useAppStore } from '@/core/store';
import { postStockAdjustment } from '@/core/utils/journalEntryGenerator';

interface StockAdj {
  id: string;
  date: string;
  product: string;
  warehouse: string;
  systemQty: number;
  actualQty: number;
  difference: number;
  reason: string;
  status: 'draft' | 'posted';
  unitCost?: number;
}

export const StockAdjustmentPage: React.FC = () => {
  const activeCompany = useAppStore(state => state.activeCompany);
  const [adjustments, setAdjustments] = useState<StockAdj[]>([
    { id: '1', date: '2024-06-10', product: 'براد ماء 20 لتر', warehouse: 'المستودع الرئيسي', systemQty: 120, actualQty: 118, difference: -2, reason: 'كسر أثناء النقل', status: 'posted', unitCost: 15000 },
    { id: '2', date: '2024-06-12', product: 'غسالة أوتوماتيك 7 كغ', warehouse: 'مستودع عدن', systemQty: 45, actualQty: 45, difference: 0, reason: 'جرد دوري', status: 'posted', unitCost: 85000 },
    { id: '3', date: '2024-06-15', product: 'مكيف سبليت 18000', warehouse: 'مستودع الحديدة', systemQty: 30, actualQty: 28, difference: -2, reason: 'عيب مصنعي - إرجاع', status: 'posted', unitCost: 95000 },
    { id: '4', date: '2024-06-18', product: 'لابتوب Dell i5', warehouse: 'المستودع الرئيسي', systemQty: 35, actualQty: 36, difference: 1, reason: 'عثور على قطعة مفقودة', status: 'draft', unitCost: 180000 },
  ]);

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<Partial<StockAdj>>({});
  const [postingId, setPostingId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!form.product) return;
    const sys = Number(form.systemQty) || 0;
    const act = Number(form.actualQty) || 0;
    const newAdj: StockAdj = {
      id: String(adjustments.length + 1),
      date: new Date().toISOString().split('T')[0],
      product: form.product,
      warehouse: form.warehouse || '',
      systemQty: sys,
      actualQty: act,
      difference: act - sys,
      reason: form.reason || '',
      status: 'draft',
      unitCost: Number(form.unitCost) || 0,
    };
    setAdjustments([newAdj, ...adjustments]);
    setIsOpen(false);
    setForm({});
  };

  const handlePost = async (adj: StockAdj) => {
    if (!activeCompany?.id || adj.difference === 0) return;
    setPostingId(adj.id);
    const result = await postStockAdjustment(activeCompany.id, {
      id: adj.id,
      date: adj.date,
      product: adj.product,
      difference: adj.difference * (adj.unitCost || 0),
      reason: adj.reason,
    });
    setPostingId(null);
    if (result.success) {
      setAdjustments(prev => prev.map(a => a.id === adj.id ? { ...a, status: 'posted' } : a));
      alert(`تم ترحيل التسوية وتوليد القيد اليومي بنجاح!`);
    } else if (result.error) {
      alert(`فشل الترحيل: ${result.error}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Scale size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">تسويات المخزون</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">جرد وتسوية الفروقات - اضغط ترحيل لتوليد القيد المحاسبي</p>
          </div>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => setIsOpen(true)}>تسوية جديدة</Button>
      </div>

      <Card>
        <Table
          data={adjustments}
          columns={[
            { key: 'date', header: 'التاريخ' },
            { key: 'product', header: 'المنتج' },
            { key: 'warehouse', header: 'المستودع' },
            { key: 'systemQty', header: 'النظام', align: 'right' },
            { key: 'actualQty', header: 'الفعلي', align: 'right' },
            { key: 'difference', header: 'الفرق', align: 'right', render: (row) => (
              <span className={row.difference > 0 ? 'text-emerald-600 font-bold' : row.difference < 0 ? 'text-rose-600 font-bold' : ''}>
                {row.difference > 0 ? '+' : ''}{row.difference}
              </span>
            )},
            { key: 'reason', header: 'السبب' },
            { key: 'status', header: 'الحالة', render: (row) => (
              <Badge className={row.status === 'posted' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                {row.status === 'posted' ? 'مرحّل' : 'مسوّد'}
              </Badge>
            )},
            { key: 'actions', header: 'ترحيل', render: (row) => (
              row.status === 'draft' && row.difference !== 0 ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handlePost(row)}
                  disabled={postingId === row.id}
                  leftIcon={<CheckSquare size={14} />}
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
        <Modal isOpen={isOpen} title="تسوية مخزنية جديدة" onClose={() => setIsOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">المنتج</label>
              <ProductSelect companyId={activeCompany?.id || ''} value={form.product || ''} onChange={v => setForm({ ...form, product: (Array.isArray(v) ? v[0] : v) || '' })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">المستودع</label>
              <WarehouseSelect companyId={activeCompany?.id || ''} value={form.warehouse || ''} onChange={v => setForm({ ...form, warehouse: v || '' })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="كمية النظام" type="number" value={String(form.systemQty || '')} onChange={e => setForm({ ...form, systemQty: Number(e.target.value) })} />
              <Input label="الكمية الفعلية" type="number" value={String(form.actualQty || '')} onChange={e => setForm({ ...form, actualQty: Number(e.target.value) })} />
            </div>
            <Input label="تكلفة الوحدة" type="number" value={String(form.unitCost || '')} onChange={e => setForm({ ...form, unitCost: Number(e.target.value) })} />
            <Input label="سبب التسوية" value={form.reason || ''} onChange={e => setForm({ ...form, reason: e.target.value })} />
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

export default StockAdjustmentPage;
