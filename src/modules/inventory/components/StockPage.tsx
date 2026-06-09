import React, { useState } from 'react';
import { Boxes, ArrowRightLeft, Plus, Scale, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, Modal, Table, Can } from '@/core/ui/components';
import { StatusBadge } from '@/core/ui/components/StatusBadge';
import { EmptyState } from '@/core/ui/components/EmptyState';
import { ProductSelect, WarehouseSelect } from '@/core/ui/components/smart';
import { useStockDetailed, useStockTransfers } from '../hooks/useInventory';
import { useAppStore } from '@/core/store';
import { useTranslation } from '@/core/i18n/useTranslation';
import type { StockItem, StockTransfer } from '../types';

export const StockPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const activeCompany = useAppStore(state => state.activeCompany);
  const { stock, isLoading } = useStockDetailed(activeCompany?.id || '');
  const { transfers, create: createTransfer } = useStockTransfers(activeCompany?.id || '');

  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    productId: '',
    fromWarehouseId: '',
    toWarehouseId: '',
    quantity: '',
    date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
  });

  const handleCreateTransfer = async () => {
    if (!activeCompany || !transferForm.productId) return;
    await createTransfer({
      companyId: activeCompany.id,
      productId: transferForm.productId,
      fromWarehouseId: transferForm.fromWarehouseId,
      toWarehouseId: transferForm.toWarehouseId,
      quantity: Number(transferForm.quantity) || 0,
      date: transferForm.date,
      reference: transferForm.reference,
      notes: transferForm.notes,
      status: 'draft',
    });
    setIsTransferOpen(false);
    setTransferForm({
      productId: '',
      fromWarehouseId: '',
      toWarehouseId: '',
      quantity: '',
      date: new Date().toISOString().split('T')[0],
      reference: '',
      notes: '',
    });
  };

  const stockColumns = [
    { key: 'productCode', header: t('inventory.productCode'), width: '120px' },
    { key: 'productName', header: t('inventory.productName') },
    { key: 'warehouseName', header: t('inventory.warehouse') },
    { key: 'quantity', header: t('inventory.quantity'), align: 'right' as const },
    { key: 'unit', header: t('inventory.unitPrice'), width: '100px' },
    { key: 'minStockAlert', header: t('inventory.minStock'), align: 'right' as const, render: (row: StockItem) => row.minStockAlert ?? '-' },
    { key: 'alert', header: '', width: '60px', render: (row: StockItem) => {
      if (row.minStockAlert && row.quantity < row.minStockAlert) {
        return <AlertTriangle size={16} className="text-amber-500" aria-label={t('inventory.lowStock')} />;
      }
      return null;
    }},
  ];

  const transferColumns = [
    { key: 'date', header: t('inventory.date') },
    { key: 'reference', header: t('inventory.reference') },
    { key: 'fromWarehouseId', header: t('inventory.fromWarehouse'), render: (row: StockTransfer) => row.fromWarehouseId },
    { key: 'toWarehouseId', header: t('inventory.toWarehouse'), render: (row: StockTransfer) => row.toWarehouseId },
    { key: 'quantity', header: t('inventory.quantity'), align: 'right' as const },
    { key: 'status', header: t('inventory.status'), render: (row: StockTransfer) => <StatusBadge status={row.status} /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Boxes size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t('inventory.stock')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('inventory.stockByWarehouse')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" leftIcon={<Scale size={16} />} onClick={() => navigate('/inventory/adjustments')}>
            {t('inventory.adjustments')}
          </Button>
          <Can action="create" module="inventory">
            <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setIsTransferOpen(true)}>
              {t('inventory.newTransfer')}
            </Button>
          </Can>
        </div>
      </div>

      <Card>
        {stock.length === 0 && !isLoading ? (
          <EmptyState icon="inbox" title={t('inventory.empty.stock.title')} description={t('inventory.empty.stock.description')} />
        ) : (
          <Table<StockItem>
            data={stock}
            columns={stockColumns}
            keyExtractor={(row) => row.id}
            isLoading={isLoading}
            emptyMessage=""
          />
        )}
      </Card>

      {/* Transfers Section */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
          <ArrowRightLeft size={20} />
          {t('inventory.transfers')}
        </h2>
        <Card>
          {transfers.length === 0 ? (
            <EmptyState icon="inbox" title={t('inventory.empty.transfers.title')} description={t('inventory.empty.transfers.description')} />
          ) : (
            <Table<StockTransfer>
              data={transfers}
              columns={transferColumns}
              keyExtractor={(row) => row.id}
            />
          )}
        </Card>
      </div>

      {/* Transfer Modal */}
      <Modal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        title={t('inventory.newTransfer')}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsTransferOpen(false)}>{t('cancel')}</Button>
            <Button variant="primary" onClick={handleCreateTransfer}>{t('save')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{t('inventory.productName')}</label>
            <ProductSelect companyId={activeCompany?.id || ''} value={transferForm.productId} onChange={v => setTransferForm(prev => ({ ...prev, productId: Array.isArray(v) ? (v[0] || '') : (v || '') }))} module="inventory" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{t('inventory.fromWarehouse')}</label>
              <WarehouseSelect companyId={activeCompany?.id || ''} value={transferForm.fromWarehouseId} onChange={v => setTransferForm(prev => ({ ...prev, fromWarehouseId: Array.isArray(v) ? (v[0] || '') : (v || '') }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{t('inventory.toWarehouse')}</label>
              <WarehouseSelect companyId={activeCompany?.id || ''} value={transferForm.toWarehouseId} onChange={v => setTransferForm(prev => ({ ...prev, toWarehouseId: Array.isArray(v) ? (v[0] || '') : (v || '') }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('inventory.quantity')} type="number" value={transferForm.quantity} onChange={e => setTransferForm(prev => ({ ...prev, quantity: e.target.value }))} />
            <Input label={t('inventory.date')} type="date" value={transferForm.date} onChange={e => setTransferForm(prev => ({ ...prev, date: e.target.value }))} />
          </div>
          <Input label={t('inventory.reference')} value={transferForm.reference} onChange={e => setTransferForm(prev => ({ ...prev, reference: e.target.value }))} />
          <Input label={t('inventory.notes')} value={transferForm.notes} onChange={e => setTransferForm(prev => ({ ...prev, notes: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
};

export default StockPage;
