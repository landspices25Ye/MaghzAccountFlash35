import React, { useState, useEffect, useMemo } from 'react';
import { Package, AlertTriangle, FileDown, Filter, RotateCcw, TrendingDown } from 'lucide-react';
import { Card, Button, Table } from '@/core/ui/components';
import { useAppStore } from '@/core/store';
import { getDbAdapter } from '@/core/database/adapters';
import { exportToExcel, exportToPDF } from '@/core/utils/exportEngine';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useTranslation } from '@/core/i18n/useTranslation';
import { useFormatters } from '@/core/utils/useFormatters';

interface StockItem {
  product: string;
  sku: string;
  warehouse: string;
  quantity: number;
  minStock: number;
  status: 'good' | 'low' | 'out';
  value: number;
  cost: number;
  price: number;
  stockValue: number;
  turnoverDays: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export const InventoryAnalysisReport: React.FC = () => {
  const { t } = useTranslation();
  const activeCompany = useAppStore((state) => state.activeCompany);
  const { formatCurrency } = useFormatters(activeCompany?.id || '');
  const [items, setItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'good' | 'low' | 'out'>('all');
  const [view, setView] = useState<'all' | 'lowStock' | 'slowMoving' | 'abc'>('all');

  useEffect(() => {
    if (!activeCompany?.id) return;
    const companyId = activeCompany.id;
    async function load() {
      setIsLoading(true);
      const adapter = await getDbAdapter();
      const prodResult = await adapter.getProducts(companyId);
      const products = (prodResult.data || []) as Record<string, unknown>[];
      const whResult = await adapter.query(`SELECT * FROM warehouses WHERE company_id = $1`, [companyId]);
      const warehouses = (whResult.rows || []) as Record<string, unknown>[];
      const stockResult = await adapter.query(`SELECT * FROM stock WHERE company_id = $1`, [companyId]);
      const stock = (stockResult.rows || []) as Record<string, unknown>[];

      // Fetch movements to calculate turnover from actual transaction data
      const movResult = await adapter.query(
        `SELECT product_id, SUM(quantity) as total_qty, MIN(date) as first_date, MAX(date) as last_date
         FROM inventory_transactions WHERE company_id = $1 GROUP BY product_id`,
        [companyId]
      );
      const movements = (movResult.rows || []) as Record<string, unknown>[];

      const rows: StockItem[] = [];
      for (const s of stock) {
        const prod = products.find((p) => p.id === s.product_id);
        const wh = warehouses.find((w) => w.id === s.warehouse_id);
        if (prod && wh) {
          const qty = Number(s.quantity || 0);
          const min = Number(prod.min_stock || 0);
          let status: 'good' | 'low' | 'out' = 'good';
          if (qty === 0) status = 'out';
          else if (qty <= min) status = 'low';

          // Calculate turnover from actual movement data
          const mov = movements.find((m) => m.product_id === s.product_id);
          let turnoverDays = 999;
          if (mov && mov.total_qty) {
            const totalQty = Number(mov.total_qty);
            const firstDate = mov.first_date ? new Date(String(mov.first_date)) : null;
            const lastDate = mov.last_date ? new Date(String(mov.last_date)) : null;
            if (firstDate && lastDate && totalQty > 0) {
              const daysDiff = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / 86400000));
              const avgDaily = totalQty / daysDiff;
              turnoverDays = avgDaily > 0 ? Math.floor(qty / avgDaily) : 999;
            }
          }

          rows.push({
            product: String(prod.name || ''),
            sku: String(prod.sku || ''),
            warehouse: String(wh.name || ''),
            quantity: qty,
            minStock: min,
            status,
            value: qty * Number(prod.cost || 0),
            cost: Number(prod.cost || 0),
            price: Number(prod.price || 0),
            stockValue: qty * Number(prod.cost || 0),
            turnoverDays,
          });
        }
      }
      setItems(rows);
      setIsLoading(false);
    }
    load();
  }, [activeCompany?.id]);

  const filteredItems = useMemo(() => {
    let data = [...items];
    if (statusFilter !== 'all') data = data.filter((i) => i.status === statusFilter);
    if (view === 'lowStock') data = data.filter((i) => i.status === 'low' || i.status === 'out');
    if (view === 'slowMoving') data = data.filter((i) => i.turnoverDays > 90);
    if (view === 'abc') {
      data.sort((a, b) => b.stockValue - a.stockValue);
    }
    return data;
  }, [items, statusFilter, view]);

  const abcData = useMemo(() => {
    const sorted = [...items].sort((a, b) => b.stockValue - a.stockValue);
    const totalValue = sorted.reduce((s, i) => s + i.stockValue, 0);
    const rows = sorted.reduce<{ cum: number; data: (StockItem & { grade: string; cumPct: number })[] }>(
      (acc, item) => {
        acc.cum += item.stockValue;
        const cumPct = totalValue > 0 ? (acc.cum / totalValue) * 100 : 0;
        const grade = cumPct <= 80 ? 'A' : cumPct <= 95 ? 'B' : 'C';
        acc.data.push({ ...item, grade, cumPct: Math.round(cumPct) });
        return acc;
      },
      { cum: 0, data: [] }
    );
    return rows.data;
  }, [items]);

  const totalValue = items.reduce((s, i) => s + i.value, 0);
  const lowStockCount = items.filter((i) => i.status === 'low').length;
  const outOfStock = items.filter((i) => i.status === 'out').length;
  const slowMovingCount = items.filter((i) => i.turnoverDays > 90).length;

  const statusChart = [
    { name: 'متوفر', value: items.filter((i) => i.status === 'good').length },
    { name: 'منخفض', value: lowStockCount },
    { name: 'نفذ', value: outOfStock },
  ];

  const handleExportExcel = async () => {
    const cols = [
      { key: 'product', header: 'المنتج' },
      { key: 'sku', header: 'الرمز' },
      { key: 'warehouse', header: 'المستودع' },
      { key: 'quantity', header: 'الكمية' },
      { key: 'minStock', header: 'الحد الأدنى' },
      { key: 'status', header: 'الحالة' },
      { key: 'value', header: 'القيمة' },
    ];
    await exportToExcel(view === 'abc' ? abcData : filteredItems, cols, 'Inventory_Analysis');
  };

  const handleExportPDF = async () => {
    const cols = [
      { key: 'product', header: 'المنتج', width: 25 },
      { key: 'sku', header: 'الرمز', width: 15 },
      { key: 'quantity', header: 'الكمية', width: 12 },
      { key: 'value', header: 'القيمة', width: 15 },
    ];
    await exportToPDF(view === 'abc' ? abcData : filteredItems, cols, 'Inventory_Analysis', {
      title: t('reports.inventoryAnalysis'),
      subtitle: activeCompany?.name,
      rtl: true,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Package size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t('reports.inventoryAnalysis')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">تقرير شامل لحالة المخزون والمنتجات</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" leftIcon={<Filter size={16} />} onClick={() => setShowFilters((s) => !s)}>
            {t('reports.filter')}
          </Button>
          <Button variant="secondary" leftIcon={<FileDown size={16} />} onClick={handleExportExcel}>
            Excel
          </Button>
          <Button variant="secondary" leftIcon={<FileDown size={16} />} onClick={handleExportPDF}>
            PDF
          </Button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'all', label: 'الكل' },
          { key: 'lowStock', label: t('reports.lowStockItems') },
          { key: 'slowMoving', label: t('reports.slowMoving') },
          { key: 'abc', label: t('reports.abcAnalysis') },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              view === tab.key
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <div className="p-4 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('reports.status')}</label>
              <select className="px-2 py-1.5 text-sm border rounded-md dark:bg-slate-900 dark:border-slate-600" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
                <option value="all">الكل</option>
                <option value="good">متوفر</option>
                <option value="low">منخفض</option>
                <option value="out">نفذ</option>
              </select>
            </div>
            <Button variant="ghost" size="sm" leftIcon={<RotateCcw size={14} />} onClick={() => setStatusFilter('all')}>
              {t('reports.clearFilter')}
            </Button>
          </div>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('reports.total')}</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totalValue)}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('reports.lowStock')}</p>
            <div className="flex items-center justify-center gap-2">
              <AlertTriangle size={20} className="text-amber-500" />
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{lowStockCount}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('reports.slowMoving')}</p>
            <div className="flex items-center justify-center gap-2">
              <TrendingDown size={20} className="text-rose-500" />
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{slowMovingCount}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('reports.out')}</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{outOfStock}</p>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="p-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-4">توزيع الحالة</h3>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusChart} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" nameKey="name">
                    {statusChart.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-4">أعلى 10 منتجات قيمة</h3>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={items.sort((a, b) => b.value - a.value).slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <YAxis dataKey="product" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: unknown) => formatCurrency(Number(value))} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <div className="p-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-4">
            {view === 'abc' ? t('reports.abcAnalysis') : 'تفاصيل المخزون'}
          </h3>
          {view === 'abc' ? (
            <Table
              data={abcData}
              columns={[
                { key: 'product', header: 'المنتج' },
                { key: 'sku', header: 'الرمز' },
                { key: 'quantity', header: 'الكمية', align: 'right' },
                { key: 'stockValue', header: 'القيمة', align: 'right', render: (row) => formatCurrency(row.stockValue) },
                { key: 'cumPct', header: 'تراكمي %', align: 'right', render: (row) => `${row.cumPct}%` },
                { key: 'grade', header: 'الدرجة', align: 'center', render: (row) => (
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${
                    row.grade === 'A' ? 'bg-emerald-100 text-emerald-700' :
                    row.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>{row.grade}</span>
                )},
              ]}
              keyExtractor={(row, i) => `${row.sku}-${i}`}
            />
          ) : (
            <Table
              data={filteredItems}
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
                { key: 'value', header: 'القيمة', align: 'right', render: (row) => formatCurrency(row.value) },
                { key: 'turnoverDays', header: 'أيام الدوران', align: 'right' },
              ]}
              keyExtractor={(row, i) => `${row.sku}-${i}`}
            />
          )}
        </div>
      </Card>
    </div>
  );
};

export default InventoryAnalysisReport;
