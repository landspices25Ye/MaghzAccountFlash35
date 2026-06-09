import React, { useState } from 'react';
import { Warehouse, Plus, Building2 } from 'lucide-react';
import { Card, Button, Input, Modal, Table } from '@/core/ui/components';
import { ActionButtons } from '@/core/ui/components/ActionButtons';
import { StatusBadge } from '@/core/ui/components/StatusBadge';
import { ConfirmDialog } from '@/core/ui/components/ConfirmDialog';
import { EmptyState } from '@/core/ui/components/EmptyState';
import { BranchSelect } from '@/core/ui/components/smart';
import { useWarehouses } from '../hooks/useInventory';
import { useStockDetailed } from '../hooks/useInventory';
import { useAppStore } from '@/core/store';
import { useTranslation } from '@/core/i18n/useTranslation';
import type { Warehouse as WarehouseType } from '../types';
import { Can } from '@/core/ui/components/PermissionGate';

interface FormData {
  name: string;
  code: string;
  branchId: string;
  isActive: boolean;
}

const initialForm: FormData = { name: '', code: '', branchId: '', isActive: true };

export const WarehousesPage: React.FC = () => {
  const { t } = useTranslation();
  const activeCompany = useAppStore(state => state.activeCompany);
  const { warehouses, isLoading, create, update, remove } = useWarehouses(activeCompany?.id || '');
  const { stock } = useStockDetailed(activeCompany?.id || '');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseType | null>(null);

  const handleOpenCreate = () => {
    setFormData(initialForm);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (wh: WarehouseType) => {
    setFormData({
      name: wh.name,
      code: wh.code || '',
      branchId: wh.branchId || '',
      isActive: wh.isActive,
    });
    setEditingId(wh.id);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!activeCompany) return;
    const payload = {
      companyId: activeCompany.id,
      name: formData.name,
      code: formData.code || undefined,
      branchId: formData.branchId || undefined,
      isActive: formData.isActive,
    };

    if (editingId) {
      await update(editingId, payload);
    } else {
      await create(payload);
    }
    setIsModalOpen(false);
    setFormData(initialForm);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    setConfirmDelete(null);
  };

  const handleViewStock = (wh: WarehouseType) => {
    setSelectedWarehouse(wh);
    setIsStockModalOpen(true);
  };

  const warehouseStock = selectedWarehouse
    ? stock.filter(s => s.warehouseId === selectedWarehouse.id)
    : [];

  const columns = [
    { key: 'code', header: t('inventory.productCode'), render: (row: WarehouseType) => row.code || '-' },
    { key: 'name', header: t('inventory.warehouse') },
    { key: 'branch', header: t('inventory.branch'), render: (row: WarehouseType) => row.branchId ? <span className="flex items-center gap-1"><Building2 size={14} /> {row.branchId}</span> : '-' },
    { key: 'isActive', header: t('inventory.status'), width: '100px', render: (row: WarehouseType) => <StatusBadge status={row.isActive ? 'active' : 'inactive'} /> },
    { key: 'actions', header: '', width: '160px', render: (row: WarehouseType) => (
      <ActionButtons
        onView={() => handleViewStock(row)}
        onEdit={() => handleOpenEdit(row)}
        onDelete={() => setConfirmDelete(row.id)}
        showPrint={false}
        showExport={false}
      />
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Warehouse size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t('inventory.warehouses')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('inventory.warehouses')}</p>
          </div>
        </div>
        <Can action="create" module="inventory"><Button variant="primary" leftIcon={<Plus size={16} />} onClick={handleOpenCreate}>
          {t('inventory.newWarehouse')}
        </Button></Can>
      </div>

      <Card>
        {warehouses.length === 0 && !isLoading ? (
          <EmptyState
            icon="inbox"
            title={t('inventory.empty.warehouses.title')}
            description={t('inventory.empty.warehouses.description')}
            action={<Can action="create" module="inventory"><Button variant="primary" leftIcon={<Plus size={16} />} onClick={handleOpenCreate}>{t('inventory.newWarehouse')}</Button></Can>}
          />
        ) : (
          <Table<WarehouseType>
            data={warehouses}
            columns={columns}
            keyExtractor={(row) => row.id}
            isLoading={isLoading}
            emptyMessage=""
          />
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? t('edit') : t('inventory.newWarehouse')}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>{t('cancel')}</Button>
            <Button variant="primary" onClick={handleSave}>{t('save')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label={t('inventory.warehouse')} value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} />
          <Input label={t('inventory.productCode')} value={formData.code} onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))} />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{t('inventory.branch')}</label>
            <BranchSelect
              companyId={activeCompany?.id || ''}
              value={formData.branchId}
              onChange={v => setFormData(prev => ({ ...prev, branchId: v || '' }))}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={e => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-200">{t('inventory.active')}</span>
          </label>
        </div>
      </Modal>

      {/* Stock by Warehouse Modal */}
      <Modal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        title={`${t('inventory.stockByWarehouse')} - ${selectedWarehouse?.name}`}
        size="lg"
        footer={<Button variant="secondary" onClick={() => setIsStockModalOpen(false)}>{t('close')}</Button>}
      >
        {warehouseStock.length === 0 ? (
          <EmptyState icon="inbox" title={t('inventory.empty.stock.title')} description={t('inventory.empty.warehouseProducts.description')} />
        ) : (
          <Table
            data={warehouseStock}
            columns={[
              { key: 'productCode', header: t('inventory.productCode') },
              { key: 'productName', header: t('inventory.productName') },
              { key: 'quantity', header: t('inventory.quantity'), align: 'right' as const },
              { key: 'unit', header: t('inventory.unitPrice'), width: '100px' },
            ]}
            keyExtractor={(row) => row.id}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        title={t('delete')}
        message={t('inventory.deleteConfirm')}
        variant="danger"
      />
    </div>
  );
};

export default WarehousesPage;
