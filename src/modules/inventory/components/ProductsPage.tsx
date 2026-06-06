import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Package, Plus, Upload, Camera, X } from 'lucide-react';
import { Card, Button, Input, Modal, Table, Pagination } from '@/core/ui/components';
import { ActionButtons } from '@/core/ui/components/ActionButtons';
import { StatusBadge } from '@/core/ui/components/StatusBadge';
import { ConfirmDialog } from '@/core/ui/components/ConfirmDialog';
import { EmptyState } from '@/core/ui/components/EmptyState';
import { UnitSelect, ProductTypeSelect } from '@/core/ui/components/smart';
import { useProductsPaginated, useProductCategories } from '../hooks/useInventory';
import { useProductTypes } from '@/core/hooks/useSettings';
import type { ProductType } from '@/core/types';
import { useAppStore } from '@/core/store';
import { useAuthStore } from '@/modules/auth/store';
import { useTranslation } from '@/core/i18n/useTranslation';
import { barcodeScanner } from '@/core/utils/barcodeScanner';
import { logAudit } from '@/core/utils/auditLogger';
import { useFormatters } from '@/core/utils/useFormatters';
import type { Product } from '../types';

interface FormData {
  code: string;
  nameAr: string;
  nameEn: string;
  barcode: string;
  sku: string;
  unit: string;
  costPrice: string;
  salePrice: string;
  minStock: string;
  maxStock: string;
  reorderPoint: string;
  image: string;
  categoryIds: string[];
  productTypeId: string;
  isActive: boolean;
}

const initialForm: FormData = {
  code: '', nameAr: '', nameEn: '', barcode: '', sku: '', unit: 'pcs',
  costPrice: '0', salePrice: '0', minStock: '0', maxStock: '0', reorderPoint: '0',
  image: '', categoryIds: [], productTypeId: '', isActive: true,
};

export const ProductsPage: React.FC = () => {
  const { t } = useTranslation();
  const activeCompany = useAppStore(state => state.activeCompany);
  const user = useAuthStore((state) => state.user);
  const [filterTypeId, setFilterTypeId] = useState<string>('');
  const { products, total, page, pageSize, isLoading, goToPage, changePageSize, create, update, remove } = useProductsPaginated(activeCompany?.id || '', { productTypeId: filterTypeId || undefined });
  const { categories } = useProductCategories(activeCompany?.id || '');
  const { types: productTypes } = useProductTypes(activeCompany?.id || '');
  const { formatCurrency } = useFormatters(activeCompany?.id || '');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [scanning, setScanning] = useState(false);
  const [filterCategoryId, setFilterCategoryId] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);

  const filteredProducts = useMemo(() => products.filter(p => {
    const matchesCategory = !filterCategoryId ||
      p.categoryId === filterCategoryId ||
      p.categoryIds?.includes(filterCategoryId);
    return matchesCategory;
  }), [products, filterCategoryId]);

  const handleOpenCreate = () => {
    setFormData(initialForm);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setFormData({
      code: product.code,
      nameAr: product.nameAr,
      nameEn: product.nameEn || '',
      barcode: product.barcode || '',
      sku: product.sku || '',
      unit: product.unit,
      costPrice: String(product.costPrice),
      salePrice: String(product.salePrice),
      minStock: String(product.minStock ?? 0),
      maxStock: String(product.maxStock ?? 0),
      reorderPoint: String(product.reorderPoint ?? 0),
      image: product.image || '',
      categoryIds: product.categoryIds || [],
      productTypeId: product.productTypeId || '',
      isActive: product.isActive,
    });
    setEditingId(product.id);
    setIsModalOpen(true);
  };

  const handleViewDetail = (product: Product) => {
    setDetailProduct(product);
    setIsDetailOpen(true);
  };

  const handleSave = async () => {
    if (!activeCompany) return;
    const payload = {
      companyId: activeCompany.id,
      code: formData.code,
      nameAr: formData.nameAr,
      nameEn: formData.nameEn || undefined,
      barcode: formData.barcode || undefined,
      sku: formData.sku || undefined,
      unit: formData.unit,
      costPrice: Number(formData.costPrice) || 0,
      salePrice: Number(formData.salePrice) || 0,
      isActive: formData.isActive,
      image: formData.image || undefined,
      minStock: Number(formData.minStock) || undefined,
      maxStock: Number(formData.maxStock) || undefined,
      reorderPoint: Number(formData.reorderPoint) || undefined,
      categoryIds: formData.categoryIds.length > 0 ? formData.categoryIds : undefined,
      productTypeId: formData.productTypeId || undefined,
    };

    if (editingId) {
      const result = await update(editingId, payload);
      if (result.success) {
        await logAudit({
          userId: user?.id || '',
          action: 'update',
          tableName: 'products',
          recordId: editingId,
          companyId: activeCompany.id,
        });
      }
    } else {
      const result = await create(payload);
      if (result.success) {
        await logAudit({
          userId: user?.id || '',
          action: 'create',
          tableName: 'products',
          recordId: result.id || '',
          companyId: activeCompany.id,
        });
      }
    }
    setIsModalOpen(false);
    setFormData(initialForm);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!activeCompany) return;
    const result = await remove(id);
    if (result.success) {
      await logAudit({
        userId: user?.id || '',
        action: 'delete',
        tableName: 'products',
        recordId: id,
        companyId: activeCompany.id,
      });
    }
    setConfirmDelete(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, image: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const startBarcodeScan = useCallback(async () => {
    if (!videoRef.current) return;
    setScanning(true);
    try {
      await barcodeScanner.startCameraScan(
        videoRef.current,
        (result) => {
          setFormData(prev => ({ ...prev, barcode: result.barcode }));
          setScanning(false);
          barcodeScanner.stopCamera();
        }
      );
    } catch (error) {
      console.error('Barcode scan error:', error);
      setScanning(false);
    }
  }, []);

  const stopBarcodeScan = useCallback(() => {
    setScanning(false);
    barcodeScanner.stopCamera();
  }, []);

  const toggleCategory = (catId: string) => {
    setFormData(prev => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(catId)
        ? prev.categoryIds.filter(id => id !== catId)
        : [...prev.categoryIds, catId],
    }));
  };

  const columns = [
    { key: 'image', header: '', width: '60px', render: (row: Product) => (
      row.image ? (
        <img src={row.image} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700" />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Package size={16} className="text-slate-400" />
        </div>
      )
    )},
    { key: 'code', header: t('inventory.productCode'), width: '100px' },
    { key: 'nameAr', header: t('inventory.productName') },
    { key: 'barcode', header: t('inventory.barcode'), width: '120px' },
    { key: 'unit', header: t('inventory.unitPrice'), width: '80px' },
    { key: 'costPrice', header: t('inventory.costPrice'), align: 'right' as const, render: (row: Product) => formatCurrency(row.costPrice) },
    { key: 'salePrice', header: t('inventory.salePrice'), align: 'right' as const, render: (row: Product) => formatCurrency(row.salePrice) },
    { key: 'isActive', header: t('inventory.status'), width: '90px', render: (row: Product) => (
      <StatusBadge status={row.isActive ? 'active' : 'inactive'} />
    )},
    { key: 'actions', header: '', width: '120px', render: (row: Product) => (
      <ActionButtons
        onView={() => handleViewDetail(row)}
        onEdit={() => handleOpenEdit(row)}
        onDelete={() => setConfirmDelete(row.id)}
        showPrint={false}
        showExport={false}
      />
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Package size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t('inventory.products')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('inventory.products')}</p>
          </div>
        </div>
      <div className="flex items-center gap-2">
          <select
            value={filterCategoryId}
            onChange={e => setFilterCategoryId(e.target.value)}
            className="h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            aria-label="فلترة حسب التصنيف"
            title="تصفية حسب التصنيف"
          >
            <option value="">كل التصنيفات</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select
            value={filterTypeId}
            onChange={e => setFilterTypeId(e.target.value)}
            className="h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            aria-label="فلترة حسب النوع"
            title="تصفية حسب النوع"
          >
            <option value="">كل الأنواع</option>
            {productTypes.map((t: ProductType) => (
              <option key={t.id} value={t.id}>{t.nameAr}</option>
            ))}
          </select>
          <Button variant="primary" leftIcon={<Plus size={16} />} onClick={handleOpenCreate}>
            {t('inventory.newProduct')}
          </Button>
        </div>
      </div>

      <Card>
        {filteredProducts.length === 0 && !isLoading ? (
          <EmptyState
            icon="search"
            title="لا توجد منتجات"
            description="أضف منتجات جديدة للبدء"
            action={<Button variant="primary" leftIcon={<Plus size={16} />} onClick={handleOpenCreate}>{t('inventory.newProduct')}</Button>}
          />
        ) : (
          <Table<Product>
            data={filteredProducts}
            columns={columns}
            keyExtractor={(row) => row.id}
            isLoading={isLoading}
            emptyMessage=""
          />
        )}
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={goToPage}
          onPageSizeChange={changePageSize}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); stopBarcodeScan(); }}
        title={editingId ? t('inventory.editProduct') : t('inventory.newProduct')}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setIsModalOpen(false); stopBarcodeScan(); }}>{t('cancel')}</Button>
            <Button variant="primary" onClick={handleSave}>{t('save')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Image Upload */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {formData.image ? (
                <img src={formData.image} alt="product" className="w-20 h-20 rounded-lg object-cover border border-slate-200 dark:border-slate-700" />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Package size={24} className="text-slate-400" />
                </div>
              )}
              <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center cursor-pointer shadow-sm hover:bg-primary-700">
                <Upload size={14} className="text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Input label={t('inventory.barcode')} value={formData.barcode} onChange={e => setFormData(prev => ({ ...prev, barcode: e.target.value }))} />
                {!scanning ? (
                  <Button variant="secondary" size="sm" leftIcon={<Camera size={14} />} onClick={startBarcodeScan} className="mt-6">
                    {t('inventory.scanBarcode')}
                  </Button>
                ) : (
                  <Button variant="danger" size="sm" leftIcon={<X size={14} />} onClick={stopBarcodeScan} className="mt-6">
                    {t('inventory.stopScan')}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {scanning && (
            <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-black">
              <video ref={videoRef} className="w-full h-48 object-cover" playsInline muted />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-24 border-2 border-primary-400 rounded-lg opacity-50" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input label={t('inventory.productCode')} value={formData.code} onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))} />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{t('inventory.unitPrice')}</label>
              <UnitSelect companyId={activeCompany?.id || ''} value={formData.unit} onChange={v => setFormData(prev => ({ ...prev, unit: v || 'pcs' }))} size="sm" />
            </div>
          </div>
          <Input label={t('inventory.productName')} value={formData.nameAr} onChange={e => setFormData(prev => ({ ...prev, nameAr: e.target.value }))} />
          <Input label="Name (English)" value={formData.nameEn} onChange={e => setFormData(prev => ({ ...prev, nameEn: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('inventory.sku')} value={formData.sku} onChange={e => setFormData(prev => ({ ...prev, sku: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label={t('inventory.costPrice')} type="number" value={formData.costPrice} onChange={e => setFormData(prev => ({ ...prev, costPrice: e.target.value }))} />
            <Input label={t('inventory.salePrice')} type="number" value={formData.salePrice} onChange={e => setFormData(prev => ({ ...prev, salePrice: e.target.value }))} />
            <div className="flex items-end">
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
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">نوع المنتج</label>
            <ProductTypeSelect
              companyId={activeCompany?.id || ''}
              value={formData.productTypeId}
              onChange={(v) => setFormData(prev => ({ ...prev, productTypeId: v || '' }))}
              size="sm"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label={t('inventory.minStock')} type="number" value={formData.minStock} onChange={e => setFormData(prev => ({ ...prev, minStock: e.target.value }))} />
            <Input label={t('inventory.maxStock')} type="number" value={formData.maxStock} onChange={e => setFormData(prev => ({ ...prev, maxStock: e.target.value }))} />
            <Input label={t('inventory.reorderPoint')} type="number" value={formData.reorderPoint} onChange={e => setFormData(prev => ({ ...prev, reorderPoint: e.target.value }))} />
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{t('inventory.categories')}</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    formData.categoryIds.includes(cat.id)
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={t('inventory.productDetails')}
        size="md"
        footer={<Button variant="secondary" onClick={() => setIsDetailOpen(false)}>{t('close')}</Button>}
      >
        {detailProduct && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {detailProduct.image ? (
                <img src={detailProduct.image} alt={detailProduct.nameAr} className="w-24 h-24 rounded-xl object-cover border border-slate-200 dark:border-slate-700" />
              ) : (
                <div className="w-24 h-24 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Package size={32} className="text-slate-400" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">{detailProduct.nameAr}</h3>
                <p className="text-sm text-slate-500">{detailProduct.nameEn}</p>
                <div className="mt-2">
                  <StatusBadge status={detailProduct.isActive ? 'active' : 'inactive'} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                <span className="text-slate-500 block">{t('inventory.productCode')}</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{detailProduct.code}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                <span className="text-slate-500 block">{t('inventory.barcode')}</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{detailProduct.barcode || '-'}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                <span className="text-slate-500 block">{t('inventory.sku')}</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{detailProduct.sku || '-'}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                <span className="text-slate-500 block">{t('inventory.unitPrice')}</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{detailProduct.unit}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                <span className="text-slate-500 block">{t('inventory.costPrice')}</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(detailProduct.costPrice)}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                <span className="text-slate-500 block">{t('inventory.salePrice')}</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(detailProduct.salePrice)}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                <span className="text-slate-500 block">{t('inventory.minStock')}</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{detailProduct.minStock ?? '-'}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                <span className="text-slate-500 block">{t('inventory.reorderPoint')}</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{detailProduct.reorderPoint ?? '-'}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Delete */}
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

export default ProductsPage;
