import React, { useState } from 'react';
import { GitBranch, Plus, Pencil, Trash2 } from 'lucide-react';
import { Card, Button, Input, Modal, Table } from '@/core/ui/components';

interface BomLine {
  materialName: string;
  quantity: number;
  unitCost: number;
}

interface Bom {
  id: string;
  productName: string;
  version: string;
  lines: BomLine[];
  totalCost: number;
  isActive: boolean;
}

export const BomPage: React.FC = () => {
  const [boms, setBoms] = useState<Bom[]>([
    {
      id: '1',
      productName: 'منتج أ',
      version: '1.0',
      isActive: true,
      totalCost: 2500,
      lines: [
        { materialName: 'خامة أ1', quantity: 2, unitCost: 500 },
        { materialName: 'خامة أ2', quantity: 1, unitCost: 1500 },
      ],
    },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Bom | null>(null);
  const [formData, setFormData] = useState({ productName: '', version: '1.0' });
  const [lines, setLines] = useState<BomLine[]>([{ materialName: '', quantity: 1, unitCost: 0 }]);

  const addLine = () => setLines(prev => [...prev, { materialName: '', quantity: 1, unitCost: 0 }]);
  const updateLine = (index: number, field: keyof BomLine, value: string | number) => {
    setLines(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l));
  };
  const removeLine = (index: number) => setLines(prev => prev.filter((_, i) => i !== index));

  const calculateTotal = () => lines.reduce((sum, l) => sum + (l.quantity * l.unitCost), 0);

  const handleSave = () => {
    if (!formData.productName) return;
    const total = calculateTotal();
    if (editing) {
      setBoms(prev => prev.map(b => b.id === editing.id ? { ...b, productName: formData.productName, version: formData.version, lines, totalCost: total } : b));
    } else {
      setBoms(prev => [...prev, { id: crypto.randomUUID(), productName: formData.productName, version: formData.version, lines, totalCost: total, isActive: true }]);
    }
    setIsModalOpen(false);
    setEditing(null);
    setFormData({ productName: '', version: '1.0' });
    setLines([{ materialName: '', quantity: 1, unitCost: 0 }]);
  };

  const handleDelete = (id: string) => setBoms(prev => prev.filter(b => b.id !== id));

  const columns = [
    { key: 'productName', header: 'المنتج' },
    { key: 'version', header: 'الإصدار', width: '100px' },
    { key: 'lines', header: 'المواد', render: (row: Bom) => `${row.lines.length} مادة` },
    { key: 'totalCost', header: 'التكلفة', align: 'right' as const, render: (row: Bom) => Number(row.totalCost).toLocaleString('ar-SA') },
    { key: 'isActive', header: 'الحالة', width: '100px', render: (row: Bom) => row.isActive ? 'نشط' : 'معطل' },
    { key: 'actions', header: '', width: '100px', render: (row: Bom) => (
      <div className="flex gap-1">
        <button onClick={() => { setEditing(row); setFormData({ productName: row.productName, version: row.version }); setLines(row.lines); setIsModalOpen(true); }} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-primary-600">
          <Pencil size={14} />
        </button>
        <button onClick={() => handleDelete(row.id)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-danger-600">
          <Trash2 size={14} />
        </button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitBranch size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">فاتير المواد</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Bill of Materials - إدارة تكوين المنتجات</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => { setEditing(null); setFormData({ productName: '', version: '1.0' }); setLines([{ materialName: '', quantity: 1, unitCost: 0 }]); setIsModalOpen(true); }}>
          BOM جديد
        </Button>
      </div>

      <Card>
        <Table<Bom>
          data={boms}
          columns={columns}
          keyExtractor={(row, i) => row.id || String(i)}
          emptyMessage="لا توجد BOMs"
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? 'تعديل BOM' : 'BOM جديد'}
        size="lg"
        footer={<><Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button><Button variant="primary" onClick={handleSave}>حفظ</Button></>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="اسم المنتج" value={formData.productName} onChange={e => setFormData(prev => ({ ...prev, productName: e.target.value }))} />
            <Input label="الإصدار" value={formData.version} onChange={e => setFormData(prev => ({ ...prev, version: e.target.value }))} />
          </div>

          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">مواد التصنيع</h4>
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2 items-end">
                  <Input label={idx === 0 ? 'المادة' : ''} value={line.materialName} onChange={e => updateLine(idx, 'materialName', e.target.value)} />
                  <Input label={idx === 0 ? 'الكمية' : ''} type="number" value={String(line.quantity)} onChange={e => updateLine(idx, 'quantity', Number(e.target.value))} />
                  <Input label={idx === 0 ? 'سعر الوحدة' : ''} type="number" value={String(line.unitCost)} onChange={e => updateLine(idx, 'unitCost', Number(e.target.value))} />
                  {lines.length > 1 && (
                    <button onClick={() => removeLine(idx)} className="p-2 rounded text-rose-500 hover:bg-rose-50">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <Button variant="secondary" className="mt-3" onClick={addLine}>+ إضافة مادة</Button>
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-200">التكلفة الإجمالية:</span>
              <span className="font-bold text-primary-600 tabular-nums">{calculateTotal().toLocaleString('ar-SA')}</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BomPage;
