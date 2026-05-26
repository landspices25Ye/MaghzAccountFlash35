import React from 'react';
import { cn } from '@/core/utils';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  // Document statuses
  draft: { label: 'مسودة', className: 'badge-draft' },
  posted: { label: 'مرحّلة', className: 'badge-posted' },
  paid: { label: 'مدفوعة', className: 'badge-paid' },
  partially_paid: { label: 'مدفوعة جزئياً', className: 'badge-partial' },
  cancelled: { label: 'ملغاة', className: 'badge-cancelled' },
  cancelled_mfg: { label: 'ملغى', className: 'badge-cancelled' },
  // General
  active: { label: 'نشط', className: 'badge-posted' },
  inactive: { label: 'غير نشط', className: 'badge-draft' },
  pending: { label: 'معلّق', className: 'badge-partial' },
  completed: { label: 'مكتمل', className: 'badge-paid' },
  rejected: { label: 'مرفوض', className: 'badge-cancelled' },
  approved: { label: 'معتمد', className: 'badge-paid' },
  open: { label: 'مفتوح', className: 'badge-draft' },
  closed: { label: 'مغلق', className: 'badge-posted' },
  // Manufacturing
  planned: { label: 'مخطط', className: 'badge-draft' },
  in_progress: { label: 'قيد التنفيذ', className: 'badge-partial' },
  // CRM Leads
  new: { label: 'جديد', className: 'badge-draft' },
  contacted: { label: 'تم التواصل', className: 'badge-partial' },
  qualified: { label: 'مؤهل', className: 'badge-posted' },
  converted: { label: 'محوّل', className: 'badge-paid' },
  lost: { label: 'مفقود', className: 'badge-cancelled' },
  // CRM Opportunities
  proposal: { label: 'عرض سعر', className: 'badge-partial' },
  negotiation: { label: 'تفاوض', className: 'badge-partial' },
  won: { label: 'ربح', className: 'badge-paid' },
  // HR Leaves
  annual: { label: 'سنوية', className: 'badge-draft' },
  sick: { label: 'مرضية', className: 'badge-partial' },
  emergency: { label: 'طارئة', className: 'badge-partial' },
  unpaid: { label: 'بدون راتب', className: 'badge-cancelled' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'sm',
  className,
}) => {
  const config = STATUS_CONFIG[status] || {
    label: status,
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
};

export default StatusBadge;
