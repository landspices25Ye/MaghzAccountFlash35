import React, { useState, useMemo } from 'react';
import { useFormatters } from '@/core/utils/useFormatters';
import { CheckSquare, Plus, TrendingUp, BarChart3, MoveHorizontal } from 'lucide-react';
import { Card, Button, Input, Modal, Table } from '@/core/ui/components';
import { ConfirmDialog } from '@/core/ui/components/ConfirmDialog';
import { StatusBadge } from '@/core/ui/components/StatusBadge';
import { EmptyState } from '@/core/ui/components/EmptyState';
import { useAppStore } from '@/core/store';
import { useOpportunities } from '../hooks/useCrm';
import { useOwnerFilter } from '@/core/utils/useOwnerFilter';
import { OwnerFilterToggle } from '@/core/ui/components/OwnerFilterToggle';
import type { Opportunity } from '../types';

const STAGES: Opportunity['stage'][] = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

const STAGE_LABELS: Record<string, string> = {
  new: 'جديد',
  qualified: 'مؤهل',
  proposal: 'عرض سعر',
  negotiation: 'تفاوض',
  won: 'ربح',
  lost: 'خسارة',
};

const STAGE_COLORS: Record<string, string> = {
  new: 'bg-slate-100 dark:bg-slate-800',
  qualified: 'bg-blue-50 dark:bg-blue-900/20',
  proposal: 'bg-purple-50 dark:bg-purple-900/20',
  negotiation: 'bg-amber-50 dark:bg-amber-900/20',
  won: 'bg-emerald-50 dark:bg-emerald-900/20',
  lost: 'bg-rose-50 dark:bg-rose-900/20',
};

export const OpportunitiesPage: React.FC = () => {
  const activeCompany = useAppStore((state) => state.activeCompany);
  const companyId = activeCompany?.id || '';
  const { formatCurrency } = useFormatters(companyId);
  const { opportunities, isLoading, create, update, remove } = useOpportunities(companyId);
  const { filtered: filteredOpportunities, showToggle: showOwnerToggle, isOwnOnly, toggleOwnOnly } = useOwnerFilter(opportunities, 'crm');

  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'funnel'>('kanban');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const [formData, setFormData] = useState({ name: '', value: '', stage: 'new' as Opportunity['stage'], probability: '50', expectedCloseDate: '', assignedTo: '', notes: '' });

  const resetForm = () => {
    setFormData({ name: '', value: '', stage: 'new', probability: '50', expectedCloseDate: '', assignedTo: '', notes: '' });
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setIsModalOpen(true); };
  const openEdit = (opp: Opportunity) => {
    setEditing(opp);
    setFormData({ name: opp.name, value: String(opp.value), stage: opp.stage, probability: String(opp.probability || 50), expectedCloseDate: opp.expectedCloseDate || '', assignedTo: opp.assignedTo || '', notes: opp.notes || '' });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) return;
    const payload = {
      companyId,
      name: formData.name,
      value: Number(formData.value) || 0,
      stage: formData.stage,
      probability: Number(formData.probability) || 0,
      expectedCloseDate: formData.expectedCloseDate || undefined,
      assignedTo: formData.assignedTo || undefined,
      notes: formData.notes || undefined,
    };
    if (editing) {
      await update(editing.id, payload);
    } else {
      await create(payload);
    }
    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await remove(confirmDelete);
    setConfirmDelete(null);
  };

  const onDragStart = (id: string) => setDraggedId(id);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = async (stage: Opportunity['stage']) => {
    if (!draggedId) return;
    const opp = opportunities.find((o) => o.id === draggedId);
    if (opp && opp.stage !== stage) {
      await update(draggedId, { stage });
    }
    setDraggedId(null);
  };

  const totalValue = useMemo(() => filteredOpportunities.reduce((sum, o) => sum + (o.value || 0), 0), [filteredOpportunities]);
  const weightedValue = useMemo(() => filteredOpportunities.reduce((sum, o) => sum + (o.value || 0) * ((o.probability || 0) / 100), 0), [filteredOpportunities]);

  const funnelData = useMemo(() => {
    return STAGES.map((stage) => {
      const stageOpps = filteredOpportunities.filter((o) => o.stage === stage);
      return { stage, label: STAGE_LABELS[stage], count: stageOpps.length, value: stageOpps.reduce((s, o) => s + o.value, 0) };
    });
  }, [filteredOpportunities]);

  const listColumns = [
    { key: 'name', header: 'الفرصة' },
    { key: 'value', header: 'القيمة', align: 'right' as const, render: (row: Opportunity) => formatCurrency(row.value) },
    { key: 'stage', header: 'المرحلة', render: (row: Opportunity) => <StatusBadge status={row.stage} /> },
    { key: 'probability', header: 'الاحتمالية', render: (row: Opportunity) => `${row.probability || 0}%` },
    { key: 'expectedCloseDate', header: 'تاريخ الإغلاق المتوقع', width: '160px' },
    { key: 'actions', header: '', width: '120px', render: (row: Opportunity) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="text-amber-600" onClick={() => openEdit(row)}>تعديل</Button>
        <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => setConfirmDelete(row.id)}>حذف</Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckSquare size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">الفرص</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة فرص المبيعات ولوحة Kanban</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button onClick={() => setViewMode('kanban')} className={`px-3 py-1 rounded-md text-sm ${viewMode === 'kanban' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}>Kanban</button>
            <button onClick={() => setViewMode('list')} className={`px-3 py-1 rounded-md text-sm ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}>قائمة</button>
            <button onClick={() => setViewMode('funnel')} className={`px-3 py-1 rounded-md text-sm ${viewMode === 'funnel' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}>قمع</button>
      </div>
      <OwnerFilterToggle isOwnOnly={isOwnOnly} showToggle={showOwnerToggle} onToggle={toggleOwnOnly} />
      <Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>فرصة جديدة</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white"><TrendingUp size={20} /></div>
          <div><p className="text-2xl font-bold">{filteredOpportunities.length}</p><p className="text-sm text-slate-500">إجمالي الفرص</p></div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center text-white"><CheckSquare size={20} /></div>
          <div><p className="text-2xl font-bold">{formatCurrency(totalValue)}</p><p className="text-sm text-slate-500">إجمالي القيمة</p></div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center text-white"><BarChart3 size={20} /></div>
          <div><p className="text-2xl font-bold">{formatCurrency(Math.round(weightedValue))}</p><p className="text-sm text-slate-500">القيمة المرجحة</p></div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-slate-500">جارٍ التحميل...</div>
      ) : filteredOpportunities.length === 0 ? (
        <EmptyState icon="inbox" title="لا توجد فرص" description="يمكنك إضافة فرصة جديدة" action={<Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>فرصة جديدة</Button>} />
      ) : viewMode === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => (
            <div
              key={stage}
              className={`min-w-[260px] max-w-[320px] flex-1 rounded-lg border border-slate-200 dark:border-slate-700 ${STAGE_COLORS[stage]}`}
              onDragOver={onDragOver}
              onDrop={() => onDrop(stage)}
            >
              <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="font-semibold text-sm">{STAGE_LABELS[stage]}</span>
                <span className="text-xs bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full">{filteredOpportunities.filter((o) => o.stage === stage).length}</span>
              </div>
              <div className="p-3 space-y-3">
                {filteredOpportunities.filter((o) => o.stage === stage).map((opp) => (
                  <div
                    key={opp.id}
                    draggable
                    onDragStart={() => onDragStart(opp.id)}
                    className="bg-white dark:bg-slate-900 rounded-md p-3 shadow-sm border border-slate-200 dark:border-slate-700 cursor-move hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm">{opp.name}</p>
                      <p className="text-xs text-slate-500">{opp.probability || 0}%</p>
                    </div>
                    <p className="text-primary-600 font-bold text-sm mb-2">{formatCurrency(opp.value)} YER</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">{opp.expectedCloseDate || '—'}</span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="text-amber-600 p-1" onClick={() => openEdit(opp)}><MoveHorizontal size={12} /></Button>
                        <Button variant="ghost" size="sm" className="text-rose-600 p-1" onClick={() => setConfirmDelete(opp.id)}><CheckSquare size={12} /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'list' ? (
        <Card>
          <Table<Opportunity>
            data={opportunities}
            columns={listColumns}
            keyExtractor={(row) => row.id}
            emptyMessage="لا توجد فرص"
          />
        </Card>
      ) : (
        <Card>
          <div className="space-y-4 p-4">
            <h3 className="font-bold text-lg">تقرير قمع المبيعات</h3>
            <div className="space-y-3">
              {funnelData.map((f) => (
                <div key={f.stage} className="flex items-center gap-4">
                  <div className="w-28 text-sm font-medium text-slate-700 dark:text-slate-200">{f.label}</div>
                  <div className="flex-1 h-8 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all duration-500"
                      style={{ width: `${f.count > 0 ? Math.min(100, (f.count / Math.max(1, filteredOpportunities.length)) * 100 * STAGES.length) : 0}%` }}
                    />
                    <span className="absolute inset-0 flex items-center px-3 text-xs text-slate-700 dark:text-slate-200">
                      {f.count} فرص ({formatCurrency(f.value)})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editing ? 'تعديل فرصة' : 'فرصة جديدة'}
        size="md"
        footer={
          <div className="flex items-center gap-2 justify-end w-full">
            <Button variant="secondary" onClick={() => { setIsModalOpen(false); resetForm(); }}>إلغاء</Button>
            <Button variant="primary" onClick={handleSave}>حفظ</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="اسم الفرصة" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} />
          <Input label="القيمة" type="number" value={formData.value} onChange={(e) => setFormData((prev) => ({ ...prev, value: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">المرحلة</label>
              <select value={formData.stage} onChange={(e) => setFormData((prev) => ({ ...prev, stage: e.target.value as Opportunity['stage'] }))} className="form-control">
                {STAGES.map((s) => (<option key={s} value={s}>{STAGE_LABELS[s]}</option>))}
              </select>
            </div>
            <Input label="الاحتمالية (%)" type="number" value={formData.probability} onChange={(e) => setFormData((prev) => ({ ...prev, probability: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="تاريخ الإغلاق المتوقع" type="date" value={formData.expectedCloseDate} onChange={(e) => setFormData((prev) => ({ ...prev, expectedCloseDate: e.target.value }))} />
            <Input label="المكلف" value={formData.assignedTo} onChange={(e) => setFormData((prev) => ({ ...prev, assignedTo: e.target.value }))} />
          </div>
          <Input label="ملاحظات" value={formData.notes} onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))} />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="حذف الفرصة"
        message="هل أنت متأكد من حذف هذه الفرصة؟"
        variant="danger"
      />
    </div>
  );
};

export default OpportunitiesPage;
