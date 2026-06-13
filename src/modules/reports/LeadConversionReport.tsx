import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { Card, Button, Table } from '@/core/ui/components';
import { EmptyState } from '@/core/ui/components/EmptyState';
import { useAppStore } from '@/core/store';
import { getDbAdapter } from '@/core/database/adapters';
import { exportToExcel, exportToPDF } from '@/core/utils/exportEngine';
import { useTranslation } from '@/core/i18n/useTranslation';
import { formatCurrency } from '@/core/utils';

interface LeadSourceRow {
  source: string;
  total: number;
  contacted: number;
  qualified: number;
  converted: number;
  lost: number;
  conversionRate: number;
}

interface ConversionSummary {
  totalLeads: number;
  contacted: number;
  qualified: number;
  converted: number;
  lost: number;
  overallRate: number;
  totalEstimatedValue: number;
  convertedValue: number;
}

export const LeadConversionReport: React.FC = () => {
  const { t } = useTranslation();
  const activeCompany = useAppStore((state) => state.activeCompany);
  const [summary, setSummary] = useState<ConversionSummary | null>(null);
  const [sourceData, setSourceData] = useState<LeadSourceRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!activeCompany?.id) return;
    const companyId = activeCompany.id;

    async function load() {
      setIsLoading(true);
      const adapter = await getDbAdapter();

      const whereBase = 'WHERE company_id = $1';
      const params: unknown[] = [companyId];

      const summaryResult = await adapter.query<Record<string, unknown>>(
        `SELECT
           COUNT(*)::int AS total,
           COALESCE(SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END))::int AS contacted,
           COALESCE(SUM(CASE WHEN status IN ('qualified', 'converted') THEN 1 ELSE 0 END))::int AS qualified,
           COALESCE(SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END))::int AS converted,
           COALESCE(SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END))::int AS lost,
           COALESCE(SUM(estimated_value), 0) AS total_estimated,
           COALESCE(SUM(CASE WHEN status = 'converted' THEN estimated_value ELSE 0 END), 0) AS converted_value
         FROM leads ${whereBase}`,
        params
      );

      const sourceResult = await adapter.query<Record<string, unknown>>(
        `SELECT
           COALESCE(source, 'unknown') AS source,
           COUNT(*)::int AS total,
           COALESCE(SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END))::int AS contacted,
           COALESCE(SUM(CASE WHEN status IN ('qualified', 'converted') THEN 1 ELSE 0 END))::int AS qualified,
           COALESCE(SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END))::int AS converted,
           COALESCE(SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END))::int AS lost
         FROM leads ${whereBase}
         GROUP BY source
         ORDER BY total DESC`,
        params
      );

      if (summaryResult.success && summaryResult.rows?.[0]) {
        const r = summaryResult.rows[0];
        const total = Number(r.total) || 0;
        const converted = Number(r.converted) || 0;
        setSummary({
          totalLeads: total,
          contacted: Number(r.contacted) || 0,
          qualified: Number(r.qualified) || 0,
          converted,
          lost: Number(r.lost) || 0,
          overallRate: total > 0 ? (converted / total) * 100 : 0,
          totalEstimatedValue: Number(r.total_estimated) || 0,
          convertedValue: Number(r.converted_value) || 0,
        });
      }

      if (sourceResult.success && sourceResult.rows) {
        const rows: LeadSourceRow[] = sourceResult.rows.map((r: Record<string, unknown>) => {
          const ttl = Number(r.total) || 1;
          const conv = Number(r.converted) || 0;
          return {
            source: String(r.source),
            total: ttl,
            contacted: Number(r.contacted) || 0,
            qualified: Number(r.qualified) || 0,
            converted: conv,
            lost: Number(r.lost) || 0,
            conversionRate: (conv / ttl) * 100,
          };
        });
        setSourceData(rows);
      }

      setIsLoading(false);
    }

    load();
  }, [activeCompany?.id]);

  const handleExportExcel = async () => {
    if (!sourceData.length) return;
    const cols: Array<{ key: string; header: string; width?: number }> = [
      { key: 'source', header: t('reports.source') },
      { key: 'total', header: t('crm.status.new') },
      { key: 'contacted', header: t('crm.status.contacted') },
      { key: 'qualified', header: t('crm.status.qualified') },
      { key: 'converted', header: t('crm.status.converted') },
      { key: 'lost', header: t('crm.status.lost') },
      { key: 'conversionRate', header: t('reports.conversionRate') },
    ];
    const rows = sourceData.map((r) => ({
      source: r.source,
      total: r.total,
      contacted: r.contacted,
      qualified: r.qualified,
      converted: r.converted,
      lost: r.lost,
      conversionRate: `${r.conversionRate.toFixed(1)}%`,
    }));
    await exportToExcel(rows, cols, `Lead_Conversion_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPDF = async () => {
    if (!summary) return;
    const pdfRows = [
      { metric: t('reports.totalLeads'), value: summary.totalLeads },
      { metric: t('reports.overallConversionRate'), value: `${summary.overallRate.toFixed(1)}%` },
      { metric: t('reports.convertedLeads'), value: summary.converted },
      { metric: t('reports.totalEstimatedValue'), value: formatCurrency(summary.totalEstimatedValue) },
      { metric: t('reports.convertedValue'), value: formatCurrency(summary.convertedValue) },
    ];
    const pdfCols = [
      { key: 'metric', header: t('reports.kpiMetric'), width: 50 },
      { key: 'value', header: t('reports.kpiValue'), width: 50 },
    ];
    await exportToPDF(pdfRows, pdfCols, `Lead_Conversion_${new Date().toISOString().split('T')[0]}`, {
      title: t('reports.leadConversion'),
      subtitle: activeCompany?.name || '',
      companyName: activeCompany?.name,
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

  if (!summary || summary.totalLeads === 0) {
    return (
      <EmptyState icon="inbox" title={t('reports.noData')} description={t('reports.leadConversionNoData')} />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t('reports.leadConversion')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('reports.leadConversionDesc')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {summary.totalLeads > 0 && (
            <>
              <Button variant="secondary" onClick={handleExportExcel}>{t('reports.exportExcel')}</Button>
              <Button variant="secondary" onClick={handleExportPDF}>{t('reports.exportPdf')}</Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card><div className="p-4 text-center"><p className="text-3xl font-bold text-primary-600">{summary.totalLeads}</p><p className="text-sm text-slate-500 mt-1">{t('reports.totalLeads')}</p></div></Card>
        <Card><div className="p-4 text-center"><p className="text-3xl font-bold text-blue-600">{summary.contacted}</p><p className="text-sm text-slate-500 mt-1">{t('crm.status.contacted')}</p></div></Card>
        <Card><div className="p-4 text-center"><p className="text-3xl font-bold text-purple-600">{summary.qualified}</p><p className="text-sm text-slate-500 mt-1">{t('crm.status.qualified')}</p></div></Card>
        <Card><div className="p-4 text-center"><p className="text-3xl font-bold text-emerald-600">{summary.converted}</p><p className="text-sm text-slate-500 mt-1">{t('crm.status.converted')}</p></div></Card>
        <Card><div className="p-4 text-center"><p className="text-3xl font-bold text-rose-600">{summary.lost}</p><p className="text-sm text-slate-500 mt-1">{t('crm.status.lost')}</p></div></Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><div className="p-4"><p className="text-sm text-slate-500">{t('reports.overallConversionRate')}</p><p className="text-2xl font-bold mt-1">{summary.overallRate.toFixed(1)}%</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-slate-500">{t('reports.totalEstimatedValue')}</p><p className="text-2xl font-bold mt-1">{formatCurrency(summary.totalEstimatedValue)}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-slate-500">{t('reports.convertedValue')}</p><p className="text-2xl font-bold mt-1">{formatCurrency(summary.convertedValue)}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-slate-500">{t('reports.qualifiedRate')}</p><p className="text-2xl font-bold mt-1">{summary.totalLeads > 0 ? ((summary.qualified / summary.totalLeads) * 100).toFixed(1) : '0'}%</p></div></Card>
      </div>

      <Card>
        <div className="space-y-4 p-4">
          <h3 className="font-bold text-lg">{t('reports.leadConversionBySource')}</h3>
          <Table<LeadSourceRow>
            data={sourceData}
            columns={[
              { key: 'source', header: t('reports.source'), render: (r) => <span className="font-medium">{r.source === 'unknown' ? t('reports.unknown') : r.source}</span> },
              { key: 'total', header: t('crm.status.new'), width: '80px', align: 'center' },
              { key: 'contacted', header: t('crm.status.contacted'), width: '90px', align: 'center' },
              { key: 'qualified', header: t('crm.status.qualified'), width: '90px', align: 'center' },
              { key: 'converted', header: t('crm.status.converted'), width: '90px', align: 'center' },
              { key: 'lost', header: t('crm.status.lost'), width: '80px', align: 'center' },
              { key: 'conversionRate', header: t('reports.conversionRate'), width: '110px', align: 'center', render: (r) => (
                <span className="font-semibold text-primary-600">{r.conversionRate.toFixed(1)}%</span>
              )},
            ]}
            keyExtractor={(r) => r.source}
            emptyMessage={t('reports.noData')}
          />
        </div>
      </Card>
    </div>
  );
};

export default LeadConversionReport;
