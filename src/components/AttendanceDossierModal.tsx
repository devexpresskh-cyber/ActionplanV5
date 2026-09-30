import React from 'react';
import { X, Printer, Download, FileSpreadsheet, Building2, CheckCircle, Clock, Award, ShieldCheck } from 'lucide-react';
import { MonthlyAttendanceReport, Language } from '../types';
import { translations } from '../services/i18n';
import { exportToCSV, exportToExcel, triggerPrint } from '../services/exportUtils';

interface AttendanceDossierModalProps {
  report: MonthlyAttendanceReport | null;
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const AttendanceDossierModal: React.FC<AttendanceDossierModalProps> = ({
  report,
  isOpen,
  onClose,
  lang,
}) => {
  const t = translations[lang];

  if (!isOpen || !report) return null;

  const handleExportCSV = () => {
    const headers = [
      'Employee ID',
      'Employee Name',
      'Department',
      'Position',
      'Standard Days',
      'Present Days',
      'Late Days',
      'Leave Days',
      'Absent Days',
      'Total Work Hours',
      'Overtime Hours',
      'Compliance Rate (%)',
      'Tasks Completed',
      'Performance Remarks',
    ];

    const rows = report.employeeSummaries.map(emp => [
      emp.employeeId,
      emp.employeeName,
      emp.departmentName,
      emp.position,
      emp.totalWorkingDays,
      emp.presentDays,
      emp.lateDays,
      emp.leaveDays,
      emp.absentDays,
      emp.totalWorkingHours,
      emp.totalOvertimeHours,
      `${emp.attendanceRate}%`,
      emp.tasksCompletedThisMonth,
      emp.performanceRemarks,
    ]);

    exportToCSV(`${report.reportCode}_${report.month}`, headers, rows);
  };

  const handleExportExcel = () => {
    const headers = [
      'Employee ID',
      'Employee Name',
      'Department',
      'Position',
      'Standard Days',
      'Present Days',
      'Late Days',
      'Leave Days',
      'Absent Days',
      'Total Hours (h)',
      'Overtime (h)',
      'Compliance Rate (%)',
      'Tasks Completed',
      'Performance Remarks',
    ];

    const rows = report.employeeSummaries.map(emp => [
      emp.employeeId,
      emp.employeeName,
      emp.departmentName,
      emp.position,
      emp.totalWorkingDays,
      emp.presentDays,
      emp.lateDays,
      emp.leaveDays,
      emp.absentDays,
      emp.totalWorkingHours,
      emp.totalOvertimeHours,
      `${emp.attendanceRate}%`,
      emp.tasksCompletedThisMonth,
      emp.performanceRemarks,
    ]);

    exportToExcel(`${report.reportCode}_${report.month}`, headers, rows, `${report.monthLabel} Attendance`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Action Header - Hide on print */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 no-print">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-md">
              {report.reportCode}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {report.monthLabel} • {report.departmentName}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition"
              title="Download CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>CSV</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition"
              title="Download Excel Spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>
            <button
              onClick={triggerPrint}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
              title="Print Official Dossier"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t.printDossier || 'Print Dossier'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Official Document Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 bg-white print:p-0 print:overflow-visible">
          {/* Official Letterhead */}
          <div className="border-b-2 border-slate-900 pb-6 text-center space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500 font-serif">
              <div className="text-left">
                <p className="font-bold text-slate-800 text-sm">
                  {lang === 'km' ? 'យុទ្ធសាស្ត្រ និងអភិបាលកិច្ចសហគ្រាស' : 'ENTERPRISE STRATEGY & GOVERNANCE'}
                </p>
                <p>{lang === 'km' ? 'នាយកដ្ឋានផែនការសកម្មភាព និងធនធានមនុស្ស' : 'Action Plan & Human Resource Directorate'}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-700">{lang === 'km' ? 'ព្រះរាជាណាចក្រកម្ពុជា' : 'KINGDOM OF CAMBODIA'}</p>
                <p className="italic">{lang === 'km' ? 'ជាតិ សាសនា ព្រះមហាក្សត្រ' : 'Nation • Religion • King'}</p>
              </div>
            </div>

            <div className="pt-4">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 font-serif uppercase">
                {lang === 'km' ? 'របាយការណ៍វត្តមាន និងសវនកម្មផលិតភាពពលកម្មប្រចាំខែ' : 'MONTHLY ATTENDANCE & WORKFORCE PRODUCTIVITY REPORT'}
              </h1>
              <p className="text-xs text-slate-600 font-medium mt-1">
                {lang === 'km' ? 'កាលបរិច្ឆេទ៖' : 'Period:'} <span className="font-semibold text-slate-900">{report.monthLabel}</span> | {lang === 'km' ? 'នាយកដ្ឋាន៖' : 'Department:'} <span className="font-semibold text-slate-900">{report.departmentName}</span>
              </p>
              <p className="text-[11px] text-slate-400 font-mono">
                {lang === 'km' ? 'លេខកូដឯកសារ៖' : 'Dossier Ref:'} {report.reportCode} • {lang === 'km' ? 'ចេញផ្សាយ៖' : 'Published:'} {new Date(report.generatedAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <p className="text-[11px] text-slate-500 font-medium">
                {lang === 'km' ? 'អត្រាអនុលោមភាព' : 'Compliance Rate'}
              </p>
              <p className="text-xl font-bold text-blue-600 mt-0.5">{report.averageAttendanceRate}%</p>
              <span className="text-[10px] text-slate-400">
                {lang === 'km' ? 'គោលដៅស្តង់ដារ៖ ≥៩៥%' : 'Target benchmark: ≥95%'}
              </span>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">
                {lang === 'km' ? 'ម៉ោងសរុបបានកត់ត្រា' : 'Total Hours Logged'}
              </p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{report.totalHoursLogged} {lang === 'km' ? 'ម៉ោង' : 'hrs'}</p>
              <span className="text-[10px] text-slate-400">
                {report.totalEmployees} {lang === 'km' ? 'បុគ្គលិកសកម្ម' : 'Active staff'}
              </span>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">
                {lang === 'km' ? 'ម៉ោងបន្ថែមបានចុះបញ្ជី' : 'Overtime Registered'}
              </p>
              <p className="text-xl font-bold text-indigo-600 mt-0.5">{report.totalOvertimeHours} {lang === 'km' ? 'ម៉ោង' : 'hrs'}</p>
              <span className="text-[10px] text-slate-400">
                {lang === 'km' ? 'វេនបន្ថែមបានអនុម័ត' : 'Approved extra shifts'}
              </span>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">
                {lang === 'km' ? 'ករណីលើកលែង / ពន្យារពេល' : 'Exceptions / Delays'}
              </p>
              <p className="text-xl font-bold text-amber-600 mt-0.5">
                {report.totalLateArrivals} {lang === 'km' ? 'យឺត' : 'Late'} / {report.totalAbsences} {lang === 'km' ? 'អវត្តមាន' : 'Absent'}
              </p>
              <span className="text-[10px] text-slate-400">
                {lang === 'km' ? 'កំណត់ត្រាខុសប្រក្រតី' : 'Recorded infractions'}
              </span>
            </div>
          </div>

          {/* Departmental Aggregation Table */}
          {report.departmentSummaries && report.departmentSummaries.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center space-x-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>{lang === 'km' ? '១. ការបូកសរុបប្រសិទ្ធភាពតាមនាយកដ្ឋាន' : '1. Departmental Performance Aggregation'}</span>
              </h3>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">{lang === 'km' ? 'ឈ្មោះនាយកដ្ឋាន' : 'Department Name'}</th>
                      <th className="py-2.5 px-3 text-center">{lang === 'km' ? 'បុគ្គលិក' : 'Employees'}</th>
                      <th className="py-2.5 px-3 text-center">{lang === 'km' ? 'ការអនុលោម (%)' : 'Compliance (%)'}</th>
                      <th className="py-2.5 px-3 text-center">{lang === 'km' ? 'ម៉ោងសរុប' : 'Total Hours'}</th>
                      <th className="py-2.5 px-3 text-center">{lang === 'km' ? 'ថែមម៉ោង (h)' : 'Overtime (h)'}</th>
                      <th className="py-2.5 px-3 text-center">{lang === 'km' ? 'ចំនួនយឺត' : 'Late Count'}</th>
                      <th className="py-2.5 px-3 text-center">{lang === 'km' ? 'អវត្តមាន' : 'Absent'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {report.departmentSummaries.map(dept => (
                      <tr key={dept.departmentId} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-medium text-slate-800">{dept.departmentName}</td>
                        <td className="py-2 px-3 text-center">{dept.employeeCount}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                            dept.averageAttendanceRate >= 96 
                              ? 'bg-emerald-50 text-emerald-700' 
                              : dept.averageAttendanceRate >= 90 
                              ? 'bg-blue-50 text-blue-700' 
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {dept.averageAttendanceRate}%
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono">{dept.totalHours}</td>
                        <td className="py-2 px-3 text-center font-mono">{dept.totalOvertimeHours}</td>
                        <td className="py-2 px-3 text-center">{dept.lateCount}</td>
                        <td className="py-2 px-3 text-center">{dept.absentCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Individual Employee Ledger */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center space-x-1.5">
              <Award className="w-3.5 h-3.5 text-slate-500" />
              <span>{lang === 'km' ? '២. សៀវភៅបញ្ជីវត្តមានបុគ្គលិក និងការតភ្ជាប់ភារកិច្ច KPI' : '2. Employee Attendance & KPI Task Correlation Ledger'}</span>
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">{lang === 'km' ? 'ប្រវត្តិរូបបុគ្គលិក' : 'Staff Profile'}</th>
                    <th className="py-2.5 px-3">{lang === 'km' ? 'នាយកដ្ឋាន & តួនាទី' : 'Department & Role'}</th>
                    <th className="py-2.5 px-2 text-center" title="Present / Late / Leave / Absent">{lang === 'km' ? 'មាន / យឺត / ច្បាប់ / អវត្ត' : 'P / L / Lv / A'}</th>
                    <th className="py-2.5 px-2 text-center">{lang === 'km' ? 'ការងារ (h)' : 'Work (h)'}</th>
                    <th className="py-2.5 px-2 text-center">{lang === 'km' ? 'ថែមម៉ោង (h)' : 'OT (h)'}</th>
                    <th className="py-2.5 px-3 text-center">{lang === 'km' ? 'ការអនុលោម' : 'Compliance'}</th>
                    <th className="py-2.5 px-2 text-center" title="Action Plan tasks completed this month">{lang === 'km' ? 'ភារកិច្ចសម្រេច' : 'Tasks Done'}</th>
                    <th className="py-2.5 px-3">{lang === 'km' ? 'ការវាយតម្លៃ & សម្គាល់' : 'Appraisal & Remarks'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {report.employeeSummaries.map(emp => (
                    <tr key={emp.userId} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{emp.employeeName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{emp.employeeId}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-slate-800 font-medium">{emp.departmentName}</div>
                        <div className="text-[10px] text-slate-500">{emp.position}</div>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-[11px]">
                        <span className="text-emerald-700 font-bold">{emp.presentDays}</span> / 
                        <span className="text-amber-700 ml-1">{emp.lateDays}</span> / 
                        <span className="text-blue-700 ml-1">{emp.leaveDays}</span> / 
                        <span className="text-rose-700 ml-1">{emp.absentDays}</span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-medium text-slate-800">
                        {emp.totalWorkingHours}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-indigo-700">
                        {emp.totalOvertimeHours > 0 ? `+${emp.totalOvertimeHours}` : '0'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          emp.attendanceRate >= 98
                            ? 'bg-emerald-100 text-emerald-800'
                            : emp.attendanceRate >= 90
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {emp.attendanceRate}%
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-xs">
                          {emp.tasksCompletedThisMonth}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-500 max-w-xs">
                        {emp.performanceRemarks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Verification & Formal Signatures Block */}
          <div className="pt-8 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs">
            <div className="space-y-16">
              <p className="font-semibold text-slate-700">
                {lang === 'km' ? 'រៀបចំ និងធ្វើសវនកម្មដោយ' : 'Prepared & Audited By'}
              </p>
              <div>
                <div className="w-32 h-0.5 bg-slate-300 mx-auto mb-1"></div>
                <p className="font-bold text-slate-800">{report.generatedByName}</p>
                <p className="text-[10px] text-slate-400">
                  {lang === 'km' ? 'អ្នកគ្រប់គ្រងធនធានមនុស្ស & អនុលោមភាព' : 'HR & Compliance Administrator'}
                </p>
              </div>
            </div>
            <div className="space-y-16">
              <p className="font-semibold text-slate-700">
                {lang === 'km' ? 'ផ្ទៀងផ្ទាត់ដោយនាយកដ្ឋាន' : 'Verified By Department'}
              </p>
              <div>
                <div className="w-32 h-0.5 bg-slate-300 mx-auto mb-1"></div>
                <p className="font-bold text-slate-800">
                  {lang === 'km' ? 'ប្រធាននាយកដ្ឋាន' : 'Department Director'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {lang === 'km' ? 'នាយកដ្ឋានប្រតិបត្តិការ & យុទ្ធសាស្ត្រ' : 'Operations & Strategy Directorate'}
                </p>
              </div>
            </div>
            <div className="space-y-16">
              <p className="font-semibold text-slate-700">
                {lang === 'km' ? 'អនុម័តដោយថ្នាក់ដឹកនាំ' : 'Approved By Executive'}
              </p>
              <div>
                <div className="w-32 h-0.5 bg-slate-300 mx-auto mb-1"></div>
                <p className="font-bold text-slate-800">
                  {lang === 'km' ? 'អគ្គនាយកប្រតិបត្តិ / CIO' : 'Chief Executive Officer / CIO'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {lang === 'km' ? 'ក្រុមប្រឹក្សាភិបាលសាជីវកម្ម' : 'Corporate Governance Board'}
                </p>
              </div>
            </div>
          </div>

          {/* Official Seal Watermark / Footer */}
          <div className="text-center pt-6 text-[10px] text-slate-400 font-mono">
            {lang === 'km'
              ? 'សម្ងាត់ • សម្រាប់យុទ្ធសាស្ត្រសហគ្រាសផ្ទៃក្នុង & សវនកម្មបើកប្រាក់បៀវត្សរ៍ប៉ុណ្ណោះ • បង្កើតតាមរយៈប្រព័ន្ធ APMS ENTERPRISE'
              : 'CONFIDENTIAL • FOR INTERNAL ENTERPRISE STRATEGY & PAYROLL AUDIT ONLY • GENERATED VIA APMS ENTERPRISE ENGINE'}
          </div>
        </div>
      </div>
    </div>
  );
};
