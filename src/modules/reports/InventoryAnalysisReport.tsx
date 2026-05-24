import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, FileDown } from 'lucide-react';
import { Card, Button, Table } from '@/core/ui/components';
import { useAppStore } from '@/core/store';
import { getDbAdapter } from '@/core/database/adapters';
import { exportToExcel, exportToPdf } from '@/core/utils/export';

interface StockItem {
  product: string;
  sku: string;
  warehouse: string;
  quantity: number;
  minStock: number;
  status: 'good' | 'low' | 'out';
  value: number;
}

export const InventoryAnalysisReport: React.FC = () => {
  const activeCompany = useAppStore(state => state.activeCompany);
  const [items, setItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!activeCompany?.id) return;
    const companyId = activeCompany.id;
    async function load() {
      setIsLoading(true);
      const adapter = await getDbAdapter();
      const prodResult = await adapter.getProducts(companyId);
      const products = (prodResult.data || []) as any[];
      const whResult = await adapter.query(`SELECT * FROM warehouses WHERE company_id = $1`, [companyId]);
      const warehouses = (whResult.rows || []) as any[];
      const stockResult = await adapter.query(`SELECT * FROM stock WHERE company_id = $1`, [companyId]);
      const stock = (stockResult.rows || []) as any[];

      const rows: StockItem[] = [];
      for (const s of stock) {
        const prod = products.find(p => p.id === s.product_id);
        const wh = warehouses.find(w => w.id === s.warehouse_id);
        if (prod && wh) {
          const qty = Number(s.quantity || 0);
          const min = Number(prod.min_stock || 0);
          let status: 'good' | 'low' | 'out' = 'good';
          if (qty === 0) status = 'out';
          else if (qty <= min) status = 'low';

          rows.push({
            product: prod.name,
            sku: prod.sku,
            warehouse: wh.name,
            quantity: qty,
            minStock: min,
            status,
            value: qty * Number(prod.cost || 0),
          });
        }
      }
      setItems(rows);
      setIsLoading(false);
    }
    load();
  }, [activeCompany?.id]);

  const totalValue = items.reduce((s, i) => s + i.value, 0);
  const lowStock = items.filter(i => i.status === 'low').length;
  const outOfStock = items.filter(i => i.status === 'out').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">تحليل المخزون</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">تقرير شامل لحالة المخزون والمنتجات</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" leftIcon={<FileDown size={16} />} onClick={() => exportToExcel(items, 'Inventory_Analysis')}>Excel</Button>
          <Button variant="secondary" leftIcon={<FileDown size={16} />} onClick={() => exportToPdf('inv-print', 'Inventory_Analysis', 'تحليل المخزون')}>PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">إجمالي قيمة المخزون</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalValue.toLocaleString('ar-SA')} YER</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">منتجات منخفضة</p>
            <div className="flex items-center justify-center gap-2">
              <AlertTriangle size={20} className="text-amber-500" />
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{lowStock}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">نفذ من المخزون</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{outOfStock}</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-4">تفاصيل المخزون</h3>
          <Table
            data={items}
            columns={[
              { key: 'product', header: 'المنتج' },
              { key: 'sku', header: 'الرمز' },
              { key: 'warehouse', header: 'المستودع' },
              { key: 'quantity', header: 'الكمية', align: 'right' },
              { key: 'minStock', header: 'الحد الأدنى', align: 'right' },
              { key: 'status', header: 'الحالة', render: (row) => (
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                  row.status === 'good' ? 'bg-emerald-100 text-emerald-700' :
                  row.status === 'low' ? 'bg-amber-100 text-amber-700' :
                  'bg-rose-100 text-rose-700'
                }`}>
                  {row.status === 'good' ? 'متوفر' : row.status === 'low' ? 'منخفض' : 'نفذ'}
                </span>
              )},
              { key: 'value', header: 'القيمة', align: 'right', render: (row) => row.value.toLocaleString('ar-SA') },
            ]}
            keyExtractor={(row, i) => `${row.sku}-${i}`}
          />
        </div>
      </Card>

      <div id="inv-print" className="hidden">
        <table>
          <thead><tr><th>المنتج</th><th>المستودع</th><th>الكمية</th><th>القيمة</th></tr></thead>
          <tbody>
            {items.map((row, i) => (
              <tr key={i}><td>{row.product}</td><td>{row.warehouse}</td><td className="number">{row.quantity}</td><td className="number">{row.value.toLocaleString('ar-SA')}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryAnalysisReport;
