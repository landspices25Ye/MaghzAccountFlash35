import React, { useState, useMemo } from 'react';
import { UserCheck, Plus, CalendarDays, CheckSquare, Download, Printer } from 'lucide-react';
import { Card, Button, Input, Table, Modal } from '@/core/ui/components';
import { EmptyState } from '@/core/ui/components/EmptyState';
import { exportToPDF, exportToExcel } from '@/core/utils/exportEngine';
import { useAppStore } from '@/core/store';
import { useAttendance, useEmployees } from '../hooks/useHr';
import type { AttendanceRecord } from '../types';

interface DailyFormRecord {
  employeeId: string;
  employeeName: string;
  status: 'present' | 'absent' | 'late' | 'on_leave';
  checkIn: string;
  checkOut: string;
  overtime: string;
}

export const AttendancePage: React.FC = () => {
  const activeCompany = useAppStore((state) => state.activeCompany);
  const companyId = activeCompany?.id || '';

  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedMonth, _setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, _setSelectedYear] = useState(new Date().getFullYear());
  const [isOpen, setIsOpen] = useState(false);

  const { employees } = useEmployees(companyId);
  const { records, isLoading, save } = useAttendance(companyId, selectedMonth, selectedYear);

  const filteredRecords = useMemo(() => records.filter((r) => r.date === selectedDate), [records, selectedDate]);

  const presentCount = filteredRecords.filter((r) => r.status === 'present').length;
  const absentCount = filteredRecords.filter((r) => r.status === 'absent').length;
  const lateCount = filteredRecords.filter((r) => r.status === 'late').length;
  const totalHours = filteredRecords.reduce((sum, r) => {
    if (r.checkIn && r.checkOut) {
      const [inH, inM] = r.checkIn.split(':').map(Number);
      const [outH, outM] = r.checkOut.split(':').map(Number);
      return sum + (outH + outM / 60) - (inH + inM / 60);
    }
    return sum;
  }, 0);

  const [formRecords, setFormRecords] = useState<Record<string, DailyFormRecord>>({});

  const openModal = () => {
    const existing: Record<string, DailyFormRecord> = {};
    filteredRecords.forEach((r) => {
      existing[r.employeeId] = {
        employeeId: r.employeeId,
        employeeName: r.employeeName || r.employeeId,
        status: r.status,
        checkIn: r.checkIn || '08:00',
        checkOut: r.checkOut || '17:00',
        overtime: String(r.overtimeHours || 0),
      };
    });
    employees.forEach((emp) => {
      if (!existing[emp.id]) {
        existing[emp.id] = {
          employeeId: emp.id,
          employeeName: emp.fullName,
          status: 'present',
          checkIn: '08:00',
          checkOut: '17:00',
          overtime: '0',
        };
      }
    });
    setFormRecords(existing);
    setIsOpen(true);
  };

  const handleSave = async () => {
    const payload: Omit<AttendanceRecord, 'id'>[] = Object.values(formRecords).map((rec) => {
      const checkInH = rec.checkIn ? Number(rec.checkIn.split(':')[0]) : 0;
      const checkOutH = rec.checkOut ? Number(rec.checkOut.split(':')[0]) : 0;
      let overtimeHours = Number(rec.overtime) || 0;
      if (!overtimeHours && rec.checkIn && rec.checkOut) {
        const diff = (checkOutH + Number(rec.checkOut.split(':')[1] || 0) / 60) - (checkInH + Number(rec.checkIn.split(':')[1] || 0) / 60) - 8;
        if (diff > 0) overtimeHours = Math.round(diff * 100) / 100;
      }
      return {
        companyId,
        employeeId: rec.employeeId,
        date: selectedDate,
        checkIn: rec.checkIn,
        checkOut: rec.checkOut,
        overtimeHours,
        status: rec.status,
        notes: undefined,
      };
    });
    await save(payload);
    setIsOpen(false);
  };

  const updateRecord = (employeeId: string, field: keyof DailyFormRecord, value: string) => {
    setFormRecords((prev) => ({ ...prev, [employeeId]: { ...prev[employeeId], [field]: value } }));
  };

  const handleExportExcel = () => {
    exportToExcel(
      filteredRecords.map((r) => ({ ...r, employeeName: r.employeeName || r.employeeId })),
      [
        { key: 'employeeName', header: 'الموظف' },
        { key: 'date', header: 'التاريخ' },
        { key: 'checkIn', header: 'دخول' },
        { key: 'checkOut', header: 'خروج' },
        { key: 'overtimeHours', header: 'إضافي' },
        { key: 'status', header: 'الحالة' },
      ],
      `attendance-${selectedDate}`
    );
  };

  const handleExportPDF = () => {
    exportToPDF(
      filteredRecords.map((r) => ({ ...r, employeeName: r.employeeName || r.employeeId, status: statusLabel(r.status) })),
      [
        { key: 'employeeName', header: 'الموظف' },
        { key: 'date', header: 'التاريخ' },
        { key: 'checkIn', header: 'دخول' },
        { key: 'checkOut', header: 'خروج' },
        { key: 'overtimeHours', header: 'إضافي' },
        { key: 'status', header: 'الحالة' },
      ],
      `attendance-${selectedDate}`,
      { title: 'تقرير الحضور والانصراف', subtitle: `بتاريخ: ${selectedDate}`, rtl: true }
    );
  };

  const columns = [
    { key: 'employeeName', header: 'الموظف', render: (row: AttendanceRecord) => row.employeeName || row.employeeId },
    { key: 'date', header: 'التاريخ', width: '120px' },
    { key: 'checkIn', header: 'دخول', width: '100px' },
    { key: 'checkOut', header: 'خروج', width: '100px' },
    { key: 'overtimeHours', header: 'إضافي', width: '100px' },
    { key: 'status', header: 'الحالة', width: '100px', render: (row: AttendanceRecord) => (
      <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[row.status]}`}>{statusLabel(row.status)}</span>
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
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-40" />
          <Button variant="secondary" leftIcon={<Download size={16} />} onClick={handleExportExcel}>تصدير</Button>
          <Button variant="secondary" leftIcon={<Printer size={16} />} onClick={handleExportPDF}>طباعة</Button>
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
        {isLoading ? (
          <div className="py-12 text-center text-slate-500">جارٍ التحميل...</div>
        ) : filteredRecords.length === 0 ? (
          <EmptyState icon="file" title="لا توجد سجلات" description="لا توجد سجلات للتاريخ المحدد" action={<Button variant="primary" leftIcon={<Plus size={16} />} onClick={openModal}>تسجيل حضور</Button>} />
        ) : (
          <Table<AttendanceRecord>
            data={filteredRecords}
            columns={columns}
            keyExtractor={(row) => row.id}
            emptyMessage="لا توجد سجلات"
          />
        )}
      </Card>

      {isOpen && (
        <Modal isOpen={isOpen} title={`تسجيل الحضور - ${selectedDate}`} onClose={() => setIsOpen(false)} size="xl">
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="flex gap-2 items-center">
              <span className="text-sm text-slate-500">التسجيل للتاريخ:</span>
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-40" />
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
                  {Object.values(formRecords).map((rec) => (
                    <tr key={rec.employeeId} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-3 py-2 font-medium">{rec.employeeName}</td>
                      <td className="px-3 py-2">
                        <select value={rec.status} onChange={(e) => updateRecord(rec.employeeId, 'status', e.target.value)} className="border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-900 text-sm">
                          <option value="present">حاضر</option>
                          <option value="absent">غائب</option>
                          <option value="late">متأخر</option>
                        </select>
                      </td>
                      <td className="px-3 py-2"><Input type="time" value={rec.checkIn} onChange={(e) => updateRecord(rec.employeeId, 'checkIn', e.target.value)} className="w-28" /></td>
                      <td className="px-3 py-2"><Input type="time" value={rec.checkOut} onChange={(e) => updateRecord(rec.employeeId, 'checkOut', e.target.value)} className="w-28" /></td>
                      <td className="px-3 py-2"><Input type="number" value={rec.overtime} onChange={(e) => updateRecord(rec.employeeId, 'overtime', e.target.value)} className="w-20" /></td>
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

const statusLabel = (status: string) => {
  const labels: Record<string, string> = { present: 'حاضر', absent: 'غائب', late: 'متأخر', on_leave: 'في إجازة' };
  return labels[status] || status;
};

const statusColors: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-700',
  absent: 'bg-rose-100 text-rose-700',
  late: 'bg-amber-100 text-amber-700',
  on_leave: 'bg-blue-100 text-blue-700',
};

export default AttendancePage;
