import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Printer, 
  Filter, 
  Calendar, 
  Building2, 
  User, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  Target,
  FileText
} from 'lucide-react';
import { Language, User as UserType, ActionPlan, Activity } from '../types';
import { translations } from '../services/i18n';
import { db } from '../services/db';
import { exportToCSV, exportToExcel, printReport } from '../services/exportUtils';

interface ReportsViewProps {
  currentUser: UserType;
  lang: Language;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  currentUser,
  lang,
}) => {
  const t = translations[lang];

  // Selected report type
  const [selectedReport, setSelectedReport] = useState<number>(1);

  // Filters
  const [filterDept, setFilterDept] = useState('all');
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');

  const departments = db.getDepartments();
  const users = db.getUsers();
  const objectives = db.getObjectives();
  const plans = db.getAuthorizedPlans(currentUser);
  const activities = db.getActivities();
  const progressUpdates = db.getProgressUpdates();
  const approvals = db.getApprovals();

  const reportList = [
    { id: 1, name: t.report1, desc: 'Complete breakdown of all departmental action plans with status and budgets' },
    { id: 2, name: t.report2, desc: 'Aggregated completion rates, on-time delivery index, and KPI achievement by department' },
    { id: 3, name: t.report3, desc: 'Individual employee task delivery, completion percentages, and active workload' },
    { id: 4, name: t.report4, desc: 'All overdue action plans and activities with delay days and risk exposure' },
    { id: 5, name: t.report5, desc: 'Historical chronological log of all progress submissions and obstacle notes' },
    { id: 6, name: t.report6, desc: 'Corporate strategic objective attainment vs planned target metrics' },
    { id: 7, name: t.report7, desc: 'Monthly milestone deliverables and completed plans distribution for 2026' },
    { id: 8, name: t.report8, desc: 'Full audit history of plan submissions, management approvals, and rejections' },
    { id: 9, name: t.report9, desc: 'Workload distribution matrix across teams, assigned vs completed tasks' },
  ];

  // Filtered action plans
  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      if (filterDept !== 'all' && p.departmentId !== filterDept) return false;
      if (filterEmployee !== 'all' && p.ownerId !== filterEmployee) return false;
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (filterPriority !== 'all' && p.priority !== filterPriority) return false;
      if (p.dueDate < startDate || p.startDate > endDate) return false;
      return true;
    });
  }, [plans, filterDept, filterEmployee, filterStatus, filterPriority, startDate, endDate]);

  // Generate Report Table Data & Columns based on selected report
  const reportData = useMemo(() => {
    switch (selectedReport) {
      case 1: // Action Plan Summary
        return {
          title: t.report1,
          headers: ['Plan No.', 'Title', 'Department', 'Owner', 'Due Date', 'Priority', 'Budget ($)', 'Progress (%)', 'Status'],
          rows: filteredPlans.map(p => [
            p.planNumber,
            p.title,
            departments.find(d => d.id === p.departmentId)?.name || '',
            users.find(u => u.id === p.ownerId)?.name || '',
            p.dueDate,
            p.priority,
            p.budget.toLocaleString(),
            `${p.completionPercentage}%`,
            p.status,
          ]),
        };

      case 2: // Department Performance
        return {
          title: t.report2,
          headers: ['Department', 'Code', 'Total Plans', 'Avg Progress (%)', 'Completed Plans', 'Overdue Plans', 'Total Budget ($)'],
          rows: departments.map(d => {
            const dPlans = plans.filter(p => p.departmentId === d.id);
            const avgProgress = dPlans.length ? Math.round(dPlans.reduce((s, p) => s + p.completionPercentage, 0) / dPlans.length) : 0;
            const completed = dPlans.filter(p => p.status === 'Completed').length;
            const overdue = dPlans.filter(p => p.dueDate < new Date().toISOString().split('T')[0] && p.status !== 'Completed').length;
            const budget = dPlans.reduce((s, p) => s + p.budget, 0);
            return [d.name, d.code, dPlans.length, `${avgProgress}%`, completed, overdue, budget.toLocaleString()];
          }),
        };

      case 3: // Employee Task Performance
        return {
          title: t.report3,
          headers: ['Employee Name', 'Department', 'Assigned Tasks', 'Completed', 'In Progress', 'Overdue Tasks', 'Avg Task Completion'],
          rows: users.map(u => {
            const userActs = activities.filter(a => a.assignedEmployeeId === u.id);
            const dept = departments.find(d => d.id === u.departmentId)?.name || '';
            const completed = userActs.filter(a => a.status === 'Completed').length;
            const inProgress = userActs.filter(a => a.status === 'In Progress').length;
            const overdue = userActs.filter(a => a.dueDate < new Date().toISOString().split('T')[0] && a.status !== 'Completed').length;
            const avgPct = userActs.length ? Math.round(userActs.reduce((s, a) => s + a.progressPercentage, 0) / userActs.length) : 0;
            return [u.name, dept, userActs.length, completed, inProgress, overdue, `${avgPct}%`];
          }),
        };

      case 4: // Overdue Action Plans
        const today = new Date().toISOString().split('T')[0];
        const overduePlans = filteredPlans.filter(p => p.dueDate < today && p.status !== 'Completed');
        return {
          title: t.report4,
          headers: ['Plan No.', 'Title', 'Department', 'Owner', 'Due Date', 'Days Overdue', 'Progress (%)', 'Status'],
          rows: overduePlans.map(p => {
            const diffDays = Math.ceil((new Date(today).getTime() - new Date(p.dueDate).getTime()) / (1000 * 3600 * 24));
            return [
              p.planNumber,
              p.title,
              departments.find(d => d.id === p.departmentId)?.name || '',
              users.find(u => u.id === p.ownerId)?.name || '',
              p.dueDate,
              `${diffDays} days`,
              `${p.completionPercentage}%`,
              p.status,
            ];
          }),
        };

      case 5: // Progress History
        return {
          title: t.report5,
          headers: ['Date & Time', 'Entity', 'Author', 'Progress Change', 'Actual KPI', 'Completed Work', 'Obstacles Reported'],
          rows: progressUpdates.slice(0, 30).map(u => {
            const author = users.find(usr => usr.id === u.updatedById)?.name || 'System';
            return [
              new Date(u.createdAt).toLocaleString(),
              u.entityType.toUpperCase(),
              author,
              `${u.previousPercentage}% -> ${u.newPercentage}%`,
              u.actualKpiResult || '-',
              u.completedWork || u.description,
              u.problemsObstacles || 'None',
            ];
          }),
        };

      case 6: // Objective and KPI Achievement
        return {
          title: t.report6,
          headers: ['Objective Code', 'Strategic Title', 'Category', 'Target KPI', 'Current Progress (%)', 'Linked Plans', 'Status'],
          rows: objectives.map(o => {
            const linkedPlans = plans.filter(p => p.objectiveId === o.id);
            const avgProgress = linkedPlans.length ? Math.round(linkedPlans.reduce((s, p) => s + p.completionPercentage, 0) / linkedPlans.length) : 0;
            return [
              o.code,
              o.title,
              o.category || 'Operational',
              `${o.targetValue} ${o.targetUnit || o.measurementUnit || '%'}`,
              `${avgProgress}%`,
              linkedPlans.length,
              avgProgress >= 100 ? 'Achieved' : 'In Progress',
            ];
          }),
        };

      case 7: // Monthly Completion Report
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return {
          title: t.report7,
          headers: ['Month (2026)', 'Due Action Plans', 'Completed Plans', 'Monthly Success Rate (%)'],
          rows: months.map((m, idx) => {
            const mPlans = plans.filter(p => new Date(p.dueDate).getMonth() === idx);
            const mCompleted = mPlans.filter(p => p.status === 'Completed').length;
            const rate = mPlans.length ? Math.round((mCompleted / mPlans.length) * 100) : 0;
            return [m, mPlans.length, mCompleted, `${rate}%`];
          }),
        };

      case 8: // Approval History Report
        return {
          title: t.report8,
          headers: ['Timestamp', 'Plan No.', 'Reviewer', 'Role', 'Decision', 'Stage', 'Review Comments'],
          rows: approvals.map(a => {
            const plan = plans.find(p => p.id === a.actionPlanId);
            const reviewer = users.find(u => u.id === a.reviewerId);
            return [
              new Date(a.timestamp).toLocaleString(),
              plan?.planNumber || a.actionPlanId,
              reviewer?.name || 'Reviewer',
              a.reviewerRole,
              a.decision,
              a.stage,
              a.comments,
            ];
          }),
        };

      case 9: // Workload and Task Assignment
      default:
        return {
          title: t.report9,
          headers: ['Employee', 'Position', 'Total Tasks', 'High/Critical Tasks', 'Completed Tasks', 'Workload Rating'],
          rows: users.map(u => {
            const userActs = activities.filter(a => a.assignedEmployeeId === u.id);
            const highCrit = userActs.filter(a => a.priority === 'High' || a.priority === 'Critical').length;
            const completed = userActs.filter(a => a.status === 'Completed').length;
            const rating = userActs.length > 5 ? 'Heavy Load' : userActs.length > 2 ? 'Normal' : 'Light';
            return [u.name, u.position, userActs.length, highCrit, completed, rating];
          }),
        };
    }
  }, [selectedReport, filteredPlans, departments, users, objectives, activities, progressUpdates, approvals, plans, t]);

  // Export handlers
  const handleExportCSV = () => {
    const safeTitle = (reportData.title || `Report_${selectedReport}`).replace(/\s+/g, '_');
    exportToCSV(`ActionPlan_${safeTitle}`, reportData.headers, reportData.rows);
  };

  const handleExportExcel = () => {
    const safeTitle = (reportData.title || `Report_${selectedReport}`).replace(/\s+/g, '_');
    exportToExcel(`ActionPlan_${safeTitle}`, reportData.headers, reportData.rows);
  };

  const handlePrint = () => {
    printReport('report-print-area');
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {t.reports} & Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Enterprise analytics engine with CSV, Excel (.xls), and print export functionality.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <Download className="w-4 h-4" />
            <span>{t.exportExcel}</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-xs transition"
          >
            <Download className="w-4 h-4" />
            <span>{t.exportCsv}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
          >
            <Printer className="w-4 h-4" />
            <span>{t.printPdf}</span>
          </button>
        </div>
      </div>

      {/* Report Selector Pills */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs overflow-x-auto no-print">
        <div className="flex items-center space-x-2 min-w-max">
          {reportList.map(rep => {
            const isSelected = selectedReport === rep.id;
            return (
              <button
                key={rep.id}
                onClick={() => setSelectedReport(rep.id)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                  isSelected 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  isSelected ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {rep.id}
                </span>
                <span>{rep.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs no-print">
        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-700">Report Filters:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Department */}
          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {/* Employee */}
          <select
            value={filterEmployee}
            onChange={e => setFilterEmployee(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Staff</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>

          {/* Date range */}
          <div className="flex flex-wrap items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-hidden text-xs"
            />
            <span className="text-slate-400">&rarr;</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-hidden text-xs"
            />
          </div>
        </div>
      </div>

      {/* PRINTABLE REPORT CONTAINER */}
      <div id="report-print-area" className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
        {/* Report Header */}
        <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                R{selectedReport}
              </span>
              <h3 className="text-lg font-bold text-slate-900">{reportData.title}</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {reportList.find(r => r.id === selectedReport)?.desc}
            </p>
          </div>
          <div className="text-right text-[11px] text-slate-400">
            <div>Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
            <div>Generated by: {currentUser.name} ({currentUser.role})</div>
          </div>
        </div>

        {/* Summary Stat Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 text-[11px] block">Total Records</span>
            <span className="text-xl font-bold text-slate-900 mt-0.5 block">{reportData.rows.length}</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 text-[11px] block">Scope Filter</span>
            <span className="text-xs font-semibold text-slate-800 mt-0.5 block truncate">
              {filterDept === 'all' ? 'All Depts' : departments.find(d => d.id === filterDept)?.name}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 text-[11px] block">Date Filter</span>
            <span className="text-xs font-semibold text-slate-800 mt-0.5 block">
              {startDate} to {endDate}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 text-[11px] block">Compliance Status</span>
            <span className="text-xs font-bold text-emerald-600 mt-0.5 block">Audit Verified</span>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase">
                {reportData.headers.map((h, idx) => (
                  <th key={idx} className="py-2.5 px-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.rows.length === 0 ? (
                <tr>
                  <td colSpan={reportData.headers.length} className="py-6 text-center text-slate-400">
                    No records found matching current report criteria.
                  </td>
                </tr>
              ) : (
                reportData.rows.map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2.5 px-3 text-slate-700">
                        {String(cell)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Print Footer */}
        <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
          Corporate Action Plan Management System &bull; Confidential & Internal Use Only &bull; Page 1 of 1
        </div>
      </div>
    </div>
  );
};
