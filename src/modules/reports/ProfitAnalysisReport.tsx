import React, { useState, useEffect } from 'react';
import { PieChart, FileDown } from 'lucide-react';
import { Card, Button, Table } from '@/core/ui/components';
import { useAppStore } from '@/core/store';
import { getDbAdapter } from '@/core/database/adapters';
import { exportToExcel, exportToPdf } from '@/core/utils/export';
import { PieChart as RePieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface ExpenseBreakdown {
  category: string;
  amount: number;
  percent: number;
}

interface ProductProfit {
  product: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export const ProfitAnalysisReport: React.FC = () => {
  const activeCompany = useAppStore(state => state.activeCompany);
  const [expenses, setExpenses] = useState<ExpenseBreakdown[]>([]);
  const [products, setProducts] = useState<ProductProfit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!activeCompany?.id) return;
    const companyId = activeCompany.id;
    async function load() {
      setIsLoading(true);
      const adapter = await getDbAdapter();

      // Get expense accounts
      const accResult = await adapter.getAccounts(companyId);
      const accounts = (accResult.data || []) as any[];
      const expenseAccs = accounts.filter(a => a.type === 'expense');
      const totalExp = expenseAccs.reduce((s, a) => s + Math.abs(a.balance), 0);
      const expenseRows: ExpenseBreakdown[] = expenseAccs
        .filter(a => Math.abs(a.balance) > 0)
        .map(a => ({
          category: a.name_ar,
          amount: Math.abs(a.balance),
          percent: totalExp > 0 ? Math.round((Math.abs(a.balance) / totalExp) * 100) : 0,
        }))
        .sort((a, b) => b.amount - a.amount);
      setExpenses(expenseRows);

      // Get products and estimate profit
      const prodResult = await adapter.getProducts(companyId);
      const prods = (prodResult.data || []) as any[];
      const profitRows: ProductProfit[] = prods
        .filter(p => p.price > 0 && p.cost > 0)
        .map(p => {
          const revenue = (p.price || 0) * (p.stock || 0);
          const cost = (p.cost || 0) * (p.stock || 0);
          const profit = revenue - cost;
          return {
            product: p.name,
            revenue,
            cost,
            profit,
            margin: revenue > 0 ? Math.round((profit / revenue) * 100) : 0,
          };
        })
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 10);
      setProducts(profitRows);
      setIsLoading(false);
    }
    load();
  }, [activeCompany?.id]);

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalRevenue = products.reduce((s, p) => s + p.revenue, 0);
  const totalProfit = products.reduce((s, p) => s + p.profit, 0);

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
          <PieChart size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">تحليل الربحية</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">هوامش الربح وتحليل المصروفات</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" leftIcon={<FileDown size={16} />} onClick={() => exportToExcel([...expenses, ...products], 'Profit_Analysis')}>Excel</Button>
          <Button variant="secondary" leftIcon={<FileDown size={16} />} onClick={() => exportToPdf('profit-print', 'Profit_Analysis', 'تحليل الربحية')}>PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">إجمالي الإيرادات (تقديري)</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalRevenue.toLocaleString('ar-SA')} YER</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">إجمالي المصروفات</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{totalExpenses.toLocaleString('ar-SA')} YER</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">صافي الربح (تقديري)</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalProfit.toLocaleString('ar-SA')} YER</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="p-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-4">توزيع المصروفات</h3>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={expenses}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="amount"
                    nameKey="category"
                  >
                    {expenses.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => Number(value).toLocaleString('ar-SA')} />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {expenses.map((e, i) => (
                <div key={e.category} className="flex items-center gap-1.5 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-slate-600 dark:text-slate-300">{e.category} ({e.percent}%)</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-4">تفاصيل المصروفات</h3>
            <Table
              data={expenses}
              columns={[
                { key: 'category', header: 'البند' },
                { key: 'amount', header: 'المبلغ', align: 'right', render: (row) => row.amount.toLocaleString('ar-SA') },
                { key: 'percent', header: 'النسبة', align: 'right', render: (row) => `${row.percent}%` },
              ]}
              keyExtractor={(row) => row.category}
            />
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-4">أعلى 10 منتجات ربحية</h3>
          <Table
            data={products}
            columns={[
              { key: 'product', header: 'المنتج' },
              { key: 'revenue', header: 'الإيرادات', align: 'right', render: (row) => row.revenue.toLocaleString('ar-SA') },
              { key: 'cost', header: 'التكلفة', align: 'right', render: (row) => row.cost.toLocaleString('ar-SA') },
              { key: 'profit', header: 'الربح', align: 'right', render: (row) => row.profit.toLocaleString('ar-SA') },
              { key: 'margin', header: 'الهامش %', align: 'right', render: (row) => (
                <span className={`font-medium ${row.margin >= 30 ? 'text-emerald-600' : row.margin >= 15 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {row.margin}%
                </span>
              )},
            ]}
            keyExtractor={(row) => row.product}
          />
        </div>
      </Card>

      <div id="profit-print" className="hidden">
        <table>
          <thead><tr><th>البند</th><th>المبلغ</th></tr></thead>
          <tbody>
            {expenses.map(row => (
              <tr key={row.category}><td>{row.category}</td><td className="number">{row.amount.toLocaleString('ar-SA')}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProfitAnalysisReport;
