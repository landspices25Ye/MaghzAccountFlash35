import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, Legend
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1'];

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  height?: number;
  action?: React.ReactNode;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, children, height = 300, action }) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold text-slate-900 dark:text-slate-50 text-sm">{title}</h3>
      {action}
    </div>
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  </div>
);

// --- Monthly Revenue & Expenses (Bar) ---
interface MonthlyRevenueProps {
  data: Array<{ month: string; revenue: number; expenses: number }>;
}

export const MonthlyRevenueChart: React.FC<MonthlyRevenueProps> = ({ data }) => {
  const chartData = data?.length ? data : [{ month: 'لا يوجد', revenue: 0, expenses: 0 }];
  return (
    <ChartCard title="المبيعات والمصروفات الشهرية">
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
        <Tooltip
          formatter={(value: unknown) => [Number(value).toLocaleString('ar-SA'), '']}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
        />
        <Legend />
        <Bar dataKey="revenue" fill="#3b82f6" name="الإيرادات" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expenses" fill="#ef4444" name="المصروفات" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartCard>
  );
};

// --- Top Products (Donut) ---
interface TopProductsProps {
  data: Array<{ name: string; value: number }>;
}

export const TopProductsChart: React.FC<TopProductsProps> = ({ data }) => {
  const chartData = data?.length ? data : [{ name: 'لا يوجد', value: 0 }];
  return (
    <ChartCard title="أعلى المنتجات مبيعاً">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="45%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={4}
          dataKey="value"
          nameKey="name"
        >
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: unknown) => Number(value).toLocaleString('ar-SA')} />
        <Legend verticalAlign="bottom" height={36} iconType="circle" />
      </PieChart>
    </ChartCard>
  );
};

// --- AR Aging (Horizontal Bar) ---
interface ArAgingProps {
  data: Array<{ range: string; amount: number }>;
}

export const ArAgingChart: React.FC<ArAgingProps> = ({ data }) => {
  const chartData = data?.length ? data : [{ range: '0-30', amount: 0 }];
  return (
    <ChartCard title="عمر الديون (A/R)">
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" tickFormatter={(v: number | string) => `${(Number(v) / 1000).toFixed(0)}K`} />
        <YAxis dataKey="range" type="category" tick={{ fontSize: 12 }} width={60} />
        <Tooltip formatter={(value: unknown) => Number(value).toLocaleString('ar-SA')} />
        <Bar dataKey="amount" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="المبلغ" />
      </BarChart>
    </ChartCard>
  );
};

// --- Cash Flow (Area) ---
interface CashFlowProps {
  data: Array<{ month: string; inflow: number; outflow: number }>;
}

export const CashFlowChart: React.FC<CashFlowProps> = ({ data }) => {
  const chartData = data?.length ? data : [{ month: 'يناير', inflow: 0, outflow: 0 }];
  return (
    <ChartCard title="التدفقات النقدية">
      <AreaChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v: number | string) => `${(Number(v) / 1000).toFixed(0)}K`} />
        <Tooltip formatter={(value: unknown) => Number(value).toLocaleString('ar-SA')} />
        <Legend />
        <Area type="monotone" dataKey="inflow" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="الوارد" />
        <Area type="monotone" dataKey="outflow" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} name="الصادر" />
      </AreaChart>
    </ChartCard>
  );
};

// --- Sales Trend (Line) ---
interface SalesTrendProps {
  data: Array<{ date: string; sales: number; purchases: number }>;
}

export const SalesTrendChart: React.FC<SalesTrendProps> = ({ data }) => {
  const chartData = data?.length ? data : [{ date: '-', sales: 0, purchases: 0 }];
  return (
    <ChartCard title="اتجاه المبيعات والمشتريات">
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={50} />
        <YAxis tickFormatter={(v: number | string) => `${(Number(v) / 1000).toFixed(0)}K`} />
        <Tooltip formatter={(value: unknown) => Number(value).toLocaleString('ar-SA')} />
        <Legend />
        <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} dot={false} name="المبيعات" />
        <Line type="monotone" dataKey="purchases" stroke="#f59e0b" strokeWidth={2} dot={false} name="المشتريات" />
      </LineChart>
    </ChartCard>
  );
};

// --- Profit Trend (Area) ---
interface ProfitTrendProps {
  data: Array<{ date: string; profit: number }>;
}

export const ProfitTrendChart: React.FC<ProfitTrendProps> = ({ data }) => {
  const chartData = data?.length ? data : [{ date: '-', profit: 0 }];
  return (
    <ChartCard title="اتجاه الربحية">
      <AreaChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={50} />
        <YAxis tickFormatter={(v: number | string) => `${(Number(v) / 1000).toFixed(0)}K`} />
        <Tooltip formatter={(value: unknown) => Number(value).toLocaleString('ar-SA')} />
        <Area type="monotone" dataKey="profit" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="الربح" />
      </AreaChart>
    </ChartCard>
  );
};

// --- Category Share (Pie) ---
interface CategoryShareProps {
  data: Array<{ name: string; value: number }>;
}

export const CategoryShareChart: React.FC<CategoryShareProps> = ({ data }) => {
  const chartData = data?.length ? data : [{ name: 'لا يوجد', value: 0 }];
  return (
    <ChartCard title="توزيع المخزون حسب التصنيف">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="45%"
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
          nameKey="name"
        >
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: unknown) => Number(value).toLocaleString('ar-SA')} />
        <Legend verticalAlign="bottom" height={36} iconType="circle" />
      </PieChart>
    </ChartCard>
  );
};
