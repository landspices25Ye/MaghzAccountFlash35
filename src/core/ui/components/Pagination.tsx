import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './Button';

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  showSizeChanger?: boolean;
  className?: string;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  showSizeChanger = true,
  className = '',
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className={`flex items-center justify-between gap-3 px-3 py-2 border-t border-slate-200 dark:border-slate-700 ${className}`} dir="rtl">
      <div className="text-sm text-slate-600 dark:text-slate-400">
        {total === 0 ? 'لا توجد نتائج' : `${start}-${end} من ${total}`}
      </div>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onPageChange(1)}
          disabled={!canPrev}
          title="الأولى"
          aria-label="First page"
        >
          <ChevronsRight size={16} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev}
          title="السابقة"
          aria-label="Previous page"
        >
          <ChevronRight size={16} />
        </Button>
        <span className="text-sm text-slate-700 dark:text-slate-300 px-2">
          صفحة <span className="font-semibold">{page}</span> من {totalPages}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext}
          title="التالية"
          aria-label="Next page"
        >
          <ChevronLeft size={16} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onPageChange(totalPages)}
          disabled={!canNext}
          title="الأخيرة"
          aria-label="Last page"
        >
          <ChevronsLeft size={16} />
        </Button>
      </div>
      {showSizeChanger && onPageSizeChange && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 dark:text-slate-400">حجم الصفحة:</label>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="text-sm border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            aria-label="Page size"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export default Pagination;
