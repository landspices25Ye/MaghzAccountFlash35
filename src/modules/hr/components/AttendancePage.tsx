import React, { useState } from 'react';
import { UserCheck, Plus, CalendarDays } from 'lucide-react';
import { Card, Button, Input, Table } from '@/core/ui/components';

interface AttendanceRecord {
  id: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  overtimeHours: number;
  status: 'present' | 'absent' | 'late';
}

const STATUS_LABELS: Record<string, string> = {
  present: 'حاضر',
  absent: 'غائب',
  late: 'متأخر',
};

const STATUS_COLORS: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-700',
  absent: 'bg-rose-100 text-rose-700',
  late: 'bg-amber-100 text-amber-700',
};

export const AttendancePage: React.FC = () => {
  const [records] = useState<AttendanceRecord[]>([
    { id: '1', employeeName: 'أحمد محمد', date: '2026-06-30', checkIn: '08:00', checkOut: '17:00', overtimeHours: 0, status: 'present' },
    { id: '2', employeeName: 'خالد عبدالله', date: '2026-06-30', checkIn: '08:15', checkOut: '17:30', overtimeHours: 0.5, status: 'late' },
    { id: '3', employeeName: 'محمد علي', date: '2026-06-30', checkIn: '', checkOut: '', overtimeHours: 0, status: 'absent' },
  ]);
  const [selectedDate, setSelectedDate] = useState('2026-06-30');

  const columns = [
    { key: 'employeeName', header: 'الموظف' },
    { key: 'date', header: 'التاريخ', width: '120px' },
    { key: 'checkIn', header: 'دخول', width: '100px' },
    { key: 'checkOut', header: 'خروج', width: '100px' },
    { key: 'overtimeHours', header: 'إضافي', width: '100px' },
    { key: 'status', header: 'الحالة', width: '100px', render: (row: AttendanceRecord) => (
      <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[row.status]}`}>{STATUS_LABELS[row.status]}</span>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserCheck size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">الحضور والانصراف</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">تسجيل ومتابعة حضور الموظفين</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-40" />
          <Button variant="primary" leftIcon={<Plus size={16} />}>تسجيل حضور</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="الحاضرون" value="24" color="bg-emerald-500" />
        <StatCard label="الغائبون" value="2" color="bg-rose-500" />
        <StatCard label="المتأخرون" value="3" color="bg-amber-500" />
        <StatCard label="إجمالي ساعات العمل" value="192" color="bg-blue-500" />
      </div>

      <Card>
        <Table<AttendanceRecord>
          data={records}
          columns={columns}
          keyExtractor={(row, i) => row.id || String(i)}
          emptyMessage="لا توجد سجلات"
        />
      </Card>
    </div>
  );
};

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center text-white`}>
        <CalendarDays size={24} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default AttendancePage;
