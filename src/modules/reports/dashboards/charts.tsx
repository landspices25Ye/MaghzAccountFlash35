import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  height?: number;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, children, height = 300 }) => (
  <div className="card">
    <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-4">{title}</h3>
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  </div>
);

interface MonthlyRevenueProps {
  data: Array<{ month: string; revenue: number; expenses: number }>;
}

export const MonthlyRevenueChart: React.FC<MonthlyRevenueProps> = ({ data }) => {
  const chartData = data && data.length > 0 ? data : [
    { month: 'يناير', revenue: 0, expenses: 0 },
  ];

  return (
    <ChartCard title="المبيعات والمصروفات الشهرية">
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
        <Tooltip
          formatter={(value: any) => [Number(value).toLocaleString('ar-SA'), '']}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
        />
        <Bar dataKey="revenue" fill="#3b82f6" name="الإيرادات" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expenses" fill="#ef4444" name="المصروفات" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartCard>
  );
};

interface TopProductsProps {
  data: Array<{ name: string; value: number }>;
}

export const TopProductsChart: React.FC<TopProductsProps> = ({ data }) => {
  const chartData = data && data.length > 0 ? data : [{ name: 'لا يوجد', value: 0 }];

  return (
    <ChartCard title="أعلى المنتجات مبيعاً">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={4}
          dataKey="value"
          nameKey="name"
        >
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: any) => Number(value).toLocaleString('ar-SA')} />
      </PieChart>
      <div className="flex flex-wrap gap-3 justify-center mt-2">
        {chartData.map((p, i) => (
          <div key={p.name} className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-slate-600 dark:text-slate-300">{p.name}</span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
};

interface ArAgingProps {
  data: Array<{ range: string; amount: number }>;
}

export const ArAgingChart: React.FC<ArAgingProps> = ({ data }) => {
  const chartData = data && data.length > 0 ? data : [
    { range: '0-30 يوم', amount: 0 },
  ];

  return (
    <ChartCard title="عمر الديون (A/R)">
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" tickFormatter={(v: any) => `${(v / 1000).toFixed(0)}K`} />
        <YAxis dataKey="range" type="category" tick={{ fontSize: 12 }} width={80} />
        <Tooltip formatter={(value: any) => Number(value).toLocaleString('ar-SA')} />
        <Bar dataKey="amount" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartCard>
  );
};

interface CashFlowProps {
  data: Array<{ month: string; inflow: number; outflow: number }>;
}

export const CashFlowChart: React.FC<CashFlowProps> = ({ data }) => {
  const chartData = data && data.length > 0 ? data : [
    { month: 'يناير', inflow: 0, outflow: 0 },
  ];

  return (
    <ChartCard title="التدفقات النقدية">
      <AreaChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v: any) => `${(v / 1000).toFixed(0)}K`} />
        <Tooltip formatter={(value: any) => Number(value).toLocaleString('ar-SA')} />
        <Area type="monotone" dataKey="inflow" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="الوارد" />
        <Area type="monotone" dataKey="outflow" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} name="الصادر" />
      </AreaChart>
    </ChartCard>
  );
};
