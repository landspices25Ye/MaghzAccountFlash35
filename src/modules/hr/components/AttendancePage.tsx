import React, { useState } from 'react';
import { UserCheck, Plus, CalendarDays, CheckSquare } from 'lucide-react';
import { Card, Button, Input, Table, Modal } from '@/core/ui/components';

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

const EMPLOYEES = [
  'أحمد محمد', 'خالد عبدالله', 'محمد علي', 'سعيد حسن', 'عبدالرحمن صالح',
  'فهد عمر', 'ياسر علي', 'طارق محمود', 'خالد سعيد', 'بندر فهد',
  'منصور عبدالله', 'عبدالعزيز محمد', 'فيصل خالد', 'راشد فهد', 'ماجد صالح',
  'عبدالله علي', 'يوسف حسن', 'مروان صالح', 'هشام خالد', 'وليد عبدالرحمن',
];

export const AttendancePage: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([
    { id: '1', employeeName: 'أحمد محمد', date: '2026-06-30', checkIn: '08:00', checkOut: '17:00', overtimeHours: 0, status: 'present' },
    { id: '2', employeeName: 'خالد عبدالله', date: '2026-06-30', checkIn: '08:15', checkOut: '17:30', overtimeHours: 0.5, status: 'late' },
    { id: '3', employeeName: 'محمد علي', date: '2026-06-30', checkIn: '', checkOut: '', overtimeHours: 0, status: 'absent' },
  ]);
  const [selectedDate, setSelectedDate] = useState('2026-06-30');
  const [isOpen, setIsOpen] = useState(false);
  const [newRecords, setNewRecords] = useState<Record<string, { status: 'present' | 'absent' | 'late'; checkIn: string; checkOut: string; overtime: string }>>({});

  const filteredRecords = records.filter(r => r.date === selectedDate);
  const presentCount = filteredRecords.filter(r => r.status === 'present').length;
  const absentCount = filteredRecords.filter(r => r.status === 'absent').length;
  const lateCount = filteredRecords.filter(r => r.status === 'late').length;
  const totalHours = filteredRecords.reduce((sum, r) => {
    if (r.checkIn && r.checkOut) {
      const [inH, inM] = r.checkIn.split(':').map(Number);
      const [outH, outM] = r.checkOut.split(':').map(Number);
      return sum + (outH + outM / 60) - (inH + inM / 60);
    }
    return sum;
  }, 0);

  const openModal = () => {
    const existing: Record<string, { status: 'present' | 'absent' | 'late'; checkIn: string; checkOut: string; overtime: string }> = {};
    filteredRecords.forEach(r => {
      existing[r.employeeName] = { status: r.status, checkIn: r.checkIn, checkOut: r.checkOut, overtime: String(r.overtimeHours) };
    });
    EMPLOYEES.forEach(name => {
      if (!existing[name]) {
        existing[name] = { status: 'present', checkIn: '08:00', checkOut: '17:00', overtime: '0' };
      }
    });
    setNewRecords(existing);
    setIsOpen(true);
  };

  const handleSave = () => {
    const newRecs: AttendanceRecord[] = [];
    Object.entries(newRecords).forEach(([employeeName, data]) => {
      const existing = records.find(r => r.employeeName === employeeName && r.date === selectedDate);
      const checkInH = data.checkIn ? Number(data.checkIn.split(':')[0]) : 0;
      const checkOutH = data.checkOut ? Number(data.checkOut.split(':')[0]) : 0;
      let overtimeHours = Number(data.overtime) || 0;
      if (!overtimeHours && data.checkIn && data.checkOut) {
        const diff = (checkOutH + Number(data.checkOut.split(':')[1] || 0) / 60) - (checkInH + Number(data.checkIn.split(':')[1] || 0) / 60) - 8;
        if (diff > 0) overtimeHours = Math.round(diff * 100) / 100;
      }
      const record: AttendanceRecord = {
        id: existing?.id || String(Date.now() + Math.random()),
        employeeName,
        date: selectedDate,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        overtimeHours,
        status: data.status,
      };
      newRecs.push(record);
    });
    setRecords(prev => {
      const others = prev.filter(r => r.date !== selectedDate);
      return [...others, ...newRecs];
    });
    setIsOpen(false);
  };

  const updateRecord = (name: string, field: string, value: string) => {
    setNewRecords(prev => ({
      ...prev,
      [name]: { ...prev[name], [field]: value },
    }));
  };

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
          <Button variant="primary" leftIcon={<Plus size={16} />} onClick={openModal}>تسجيل حضور</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="الحاضرون" value={String(presentCount)} color="bg-emerald-500" />
        <StatCard label="الغائبون" value={String(absentCount)} color="bg-rose-500" />
        <StatCard label="المتأخرون" value={String(lateCount)} color="bg-amber-500" />
        <StatCard label="إجمالي ساعات العمل" value={String(Math.round(totalHours))} color="bg-blue-500" />
      </div>

      <Card>
        <Table<AttendanceRecord>
          data={filteredRecords}
          columns={columns}
          keyExtractor={(row, i) => row.id || String(i)}
          emptyMessage="لا توجد سجلات"
        />
      </Card>

      {isOpen && (
        <Modal isOpen={isOpen} title={`تسجيل الحضور - ${selectedDate}`} onClose={() => setIsOpen(false)} size="xl">
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="flex gap-2 items-center">
              <span className="text-sm text-slate-500">التسجيل للتاريخ:</span>
              <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-40" />
            </div>
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-right">الموظف</th>
                    <th className="px-3 py-2">الحالة</th>
                    <th className="px-3 py-2">دخول</th>
                    <th className="px-3 py-2">خروج</th>
                    <th className="px-3 py-2">س. إضافية</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(newRecords).map(([name, data]) => (
                    <tr key={name} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-3 py-2 font-medium">{name}</td>
                      <td className="px-3 py-2">
                        <select
                          value={data.status}
                          onChange={e => updateRecord(name, 'status', e.target.value)}
                          className="border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-900 text-sm"
                        >
                          <option value="present">حاضر</option>
                          <option value="absent">غائب</option>
                          <option value="late">متأخر</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <Input type="time" value={data.checkIn} onChange={e => updateRecord(name, 'checkIn', e.target.value)} className="w-28" />
                      </td>
                      <td className="px-3 py-2">
                        <Input type="time" value={data.checkOut} onChange={e => updateRecord(name, 'checkOut', e.target.value)} className="w-28" />
                      </td>
                      <td className="px-3 py-2">
                        <Input type="number" value={data.overtime} onChange={e => updateRecord(name, 'overtime', e.target.value)} className="w-20" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsOpen(false)}>إلغاء</Button>
              <Button onClick={handleSave} leftIcon={<CheckSquare size={16} />}>حفظ التسجيل</Button>
            </div>
          </div>
        </Modal>
      )}
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
