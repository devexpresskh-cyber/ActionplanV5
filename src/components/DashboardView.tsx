import React, { useState, useMemo } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  PointElement, 
  LineElement, 
  ArcElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { 
  Layers, 
  Clock, 
  CheckCircle, 
  AlertOctagon, 
  TrendingUp, 
  Calendar, 
  CheckSquare, 
  Filter, 
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import { User, Language, ActionPlan, Activity } from '../types';
import { translations } from '../services/i18n';
import { db } from '../services/db';
import { webPushService } from '../services/webPushService';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  PointElement, 
  LineElement, 
  ArcElement, 
  Title, 
  Tooltip, 
  Legend
);

interface DashboardViewProps {
  currentUser: User;
  lang: Language;
  onNavigatePlan: (planId: string) => void;
  onNavigateTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  lang,
  onNavigatePlan,
  onNavigateTab,
}) => {
  const t = translations[lang];

  // Filters
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all'); // all | q1 | q2 | q3 | q4

  const departments = db.getDepartments();
  const allUsers = db.getUsers();
  const allPlans = db.getAuthorizedPlans(currentUser);
  const allActivities = db.getActivities();

  // Apply Filters
  const filteredPlans = useMemo(() => {
    return allPlans.filter(plan => {
      if (selectedDeptId !== 'all' && plan.departmentId !== selectedDeptId) return false;
      if (selectedStatus !== 'all' && plan.status !== selectedStatus) return false;
      if (dateFilter !== 'all') {
        const planMonth = new Date(plan.dueDate).getMonth() + 1;
        if (dateFilter === 'q1' && (planMonth < 1 || planMonth > 3)) return false;
        if (dateFilter === 'q2' && (planMonth < 4 || planMonth > 6)) return false;
        if (dateFilter === 'q3' && (planMonth < 7 || planMonth > 9)) return false;
        if (dateFilter === 'q4' && (planMonth < 10 || planMonth > 12)) return false;
      }
      return true;
    });
  }, [allPlans, selectedDeptId, selectedStatus, dateFilter]);

  // Metric Computations
  const totalPlansCount = filteredPlans.length;
  const draftCount = filteredPlans.filter(p => p.status === 'Draft').length;
  const pendingApprovalCount = filteredPlans.filter(p => p.approvalStatus === 'Pending Review' || p.approvalStatus === 'Pending Completion').length;
  const inProgressCount = filteredPlans.filter(p => p.status === 'In Progress').length;
  const completedCount = filteredPlans.filter(p => p.status === 'Completed').length;
  
  const today = new Date().toISOString().split('T')[0];
  const overduePlans = filteredPlans.filter(p => p.dueDate < today && p.status !== 'Completed');
  const overdueCount = overduePlans.length;

  const relevantPlanIds = new Set(filteredPlans.map(p => p.id));
  const filteredActivities = allActivities.filter(a => relevantPlanIds.has(a.actionPlanId));
  const totalActivitiesCount = filteredActivities.length;
  const completedActivitiesCount = filteredActivities.filter(a => a.status === 'Completed').length;

  const overallCompletionPercentage = totalPlansCount > 0
    ? Math.round(filteredPlans.reduce((sum, p) => sum + p.completionPercentage, 0) / totalPlansCount)
    : 0;

  // Upcoming Deadlines (within 45 days)
  const upcomingDeadlines = useMemo(() => {
    return [...filteredPlans]
      .filter(p => p.status !== 'Completed')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);
  }, [filteredPlans]);

  // Recently updated plans
  const recentlyUpdated = useMemo(() => {
    return [...filteredPlans]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [filteredPlans]);

  // My Assigned Tasks
  const myAssignedTasks = useMemo(() => {
    return allActivities.filter(a => a.assignedEmployeeId === currentUser.id || a.teamLeaderId === currentUser.id);
  }, [allActivities, currentUser.id]);

  // Chart Data: Department Comparison
  const deptPerformanceData = useMemo(() => {
    const labels = departments.map(d => d.code);
    const avgProgress = departments.map(d => {
      const deptPlans = allPlans.filter(p => p.departmentId === d.id);
      if (deptPlans.length === 0) return 0;
      return Math.round(deptPlans.reduce((s, p) => s + p.completionPercentage, 0) / deptPlans.length);
    });

    return {
      labels,
      datasets: [
        {
          label: 'Avg Completion %',
          data: avgProgress,
          backgroundColor: 'rgba(37, 99, 235, 0.8)',
          borderRadius: 6,
        },
      ],
    };
  }, [departments, allPlans]);

  // Chart Data: Monthly Trends
  const monthlyTrendsData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyCounts = new Array(12).fill(0);
    const monthlyCompletions = new Array(12).fill(0);

    allPlans.forEach(p => {
      const m = new Date(p.dueDate).getMonth();
      monthlyCounts[m] += 1;
      if (p.status === 'Completed') {
        monthlyCompletions[m] += 1;
      }
    });

    return {
      labels: months,
      datasets: [
        {
          label: 'Target Action Plans',
          data: monthlyCounts,
          borderColor: '#94A3B8',
          backgroundColor: 'rgba(148, 163, 184, 0.2)',
          tension: 0.3,
        },
        {
          label: 'Completed Plans',
          data: monthlyCompletions,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          tension: 0.3,
        },
      ],
    };
  }, [allPlans]);

  // Chart Data: Status Breakdown Doughnut
  const statusDoughnutData = useMemo(() => {
    return {
      labels: [t.draft, t.submitted, t.inProgress, t.completed, t.rejected],
      datasets: [
        {
          data: [
            filteredPlans.filter(p => p.status === 'Draft').length,
            filteredPlans.filter(p => p.status === 'Submitted' || p.status === 'In Review').length,
            filteredPlans.filter(p => p.status === 'In Progress').length,
            filteredPlans.filter(p => p.status === 'Completed').length,
            filteredPlans.filter(p => p.status === 'Rejected').length,
          ],
          backgroundColor: ['#94A3B8', '#F59E0B', '#3B82F6', '#10B981', '#EF4444'],
          borderWidth: 0,
        },
      ],
    };
  }, [filteredPlans, t]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Filters */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {t.dashboard}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === 'km' ? 'វិសាលភាពអ្នកប្រើប្រាស់សកម្ម៖' : 'Active User Scope:'} <span className="font-semibold text-slate-800">{currentUser.name}</span> ({currentUser.role}) &bull; {allPlans.length} {lang === 'km' ? 'ផែនការដែលអាចចូលប្រើបាន' : 'Total Accessible Plans'}
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedDeptId}
              onChange={e => setSelectedDeptId(e.target.value)}
              className="bg-transparent text-slate-700 font-medium focus:outline-hidden"
            >
              <option value="all">{lang === 'km' ? 'គ្រប់នាយកដ្ឋានទាំងអស់' : 'All Departments'}</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="bg-transparent text-slate-700 font-medium focus:outline-hidden"
            >
              <option value="all">{lang === 'km' ? 'គ្រប់ស្ថានភាពទាំងអស់' : 'All Statuses'}</option>
              <option value="Draft">{t.draft}</option>
              <option value="Submitted">{t.submitted}</option>
              <option value="In Progress">{t.inProgress}</option>
              <option value="Completed">{t.completed}</option>
            </select>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="bg-transparent text-slate-700 font-medium focus:outline-hidden"
            >
              <option value="all">{lang === 'km' ? 'ពេញមួយឆ្នាំ ២០២៦' : 'Full Year 2026'}</option>
              <option value="q1">{lang === 'km' ? 'ត្រីមាសទី ១ (មករា - មីនា)' : 'Q1 (Jan - Mar)'}</option>
              <option value="q2">{lang === 'km' ? 'ត្រីមាសទី ២ (មេសា - មិថុនា)' : 'Q2 (Apr - Jun)'}</option>
              <option value="q3">{lang === 'km' ? 'ត្រីមាសទី ៣ (កក្កដា - កញ្ញា)' : 'Q3 (Jul - Sep)'}</option>
              <option value="q4">{lang === 'km' ? 'ត្រីមាសទី ៤ (តុលា - ធ្នូ)' : 'Q4 (Oct - Dec)'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Plans */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">{t.totalPlans}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalPlansCount}</p>
            <span className="text-[11px] text-blue-600 font-medium">{filteredActivities.length} {lang === 'km' ? 'សកម្មភាព' : 'activities'}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">{t.pendingApproval}</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{pendingApprovalCount}</p>
            <span className="text-[11px] text-slate-400">{draftCount} {lang === 'km' ? 'សេចក្តីព្រាង' : 'drafts'}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">{t.inProgressPlans}</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{inProgressCount}</p>
            <span className="text-[11px] text-emerald-600 font-medium">{completedCount} {lang === 'km' ? 'បានបញ្ចប់' : 'completed'}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Overdue Plans Alert */}
        <div className={`p-4 rounded-xl border shadow-xs flex items-center justify-between ${
          overdueCount > 0 ? 'bg-rose-50/50 border-rose-200' : 'bg-white border-slate-200'
        }`}>
          <div>
            <p className="text-xs font-medium text-slate-500">{t.overduePlans}</p>
            <p className={`text-2xl font-bold mt-1 ${overdueCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {overdueCount}
            </p>
            <span className="text-[11px] text-rose-500 font-medium">{lang === 'km' ? 'ត្រូវការយកចិត្តទុកដាក់' : 'Requires attention'}</span>
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            overdueCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'
          }`}>
            <AlertOctagon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Today's Attendance & Time Tracking Quick Bar */}
      {(() => {
        const todayAtt = db.getTodayAttendance(currentUser.id);
        const todayAll = db.getAttendanceRecords().filter(r => r.date === '2026-09-17');
        const presentCount = todayAll.filter(r => r.status === 'Present' || r.status === 'Overtime').length;
        const totalEmps = db.getUsers().filter(u => u.status === 'Active' && u.isActive !== false).length;
        const complianceRate = Math.round((presentCount / Math.max(1, totalEmps)) * 100);

        return (
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                todayAtt?.checkInTime ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
              }`}>
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-800">
                    {t.todayStatus || (lang === 'km' ? 'ស្ថានភាពវត្តមានថ្ងៃនេះ' : "Today's Attendance Status")}
                  </span>
                  <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                    todayAtt?.checkOutTime 
                      ? 'bg-slate-100 text-slate-700' 
                      : todayAtt?.checkInTime 
                      ? 'bg-emerald-100 text-emerald-800 animate-pulse' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {todayAtt?.checkOutTime 
                      ? (t.alreadyCheckedOut || (lang === 'km' ? 'បានបញ្ចប់វេនការងារ' : 'Shift Completed')) 
                      : todayAtt?.checkInTime 
                      ? `${t.alreadyCheckedIn || (lang === 'km' ? 'បានចូលធ្វើការ' : 'Clocked In')} (${todayAtt.checkInTime})` 
                      : (t.attendanceCheckIn || (lang === 'km' ? 'មិនទាន់កត់ត្រាចូល' : 'Not Clocked In'))}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentUser.role === 'Employee'
                    ? (lang === 'km'
                        ? 'កំណត់ត្រាវត្តមានផ្ទាល់ខ្លួន (ការពារឯកជនភាព) • ប្រសិនបើអ្នកត្រូវការពិនិត្យ ឬគ្រប់គ្រងវត្តមានអ្នកដទៃ សូមទាក់ទងអ្នកគ្រប់គ្រង ឬ HR'
                        : 'Personal Attendance Record (Privacy Protected) • To check or manage attendance for others, contact your supervisor or HR.')
                    : (lang === 'km'
                        ? `អត្រាវត្តមានស្ថាប័នថ្ងៃនេះ៖ ${presentCount}/${totalEmps} បុគ្គលិកមានវត្តមាន (${complianceRate}%) • មានរបាយការណ៍ស្វ័យប្រវត្តិប្រចាំខែ`
                        : `Corporate Rate Today: ${presentCount}/${totalEmps} Staff Present (${complianceRate}%) • Automated Monthly Reports available`)}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {!todayAtt?.checkInTime ? (
                <button
                  onClick={() => {
                    const res = db.checkIn(currentUser.id, 'Punched from Dashboard');
                    if (res.success) {
                      webPushService.sendCheckInAlert({
                        userName: currentUser.name,
                        shift: 'Morning',
                        time: res.record?.checkInTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        status: res.record?.status || 'Present',
                        location: 'Phnom Penh HQ - Main Tower',
                      });
                    }
                    onNavigateTab('attendance');
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition"
                >
                  {t.checkInNow || (lang === 'km' ? 'កត់ត្រាម៉ោងចូលភ្លាមៗ' : 'Clock In Now')}
                </button>
              ) : !todayAtt?.checkOutTime ? (
                <button
                  onClick={() => {
                    const res = db.checkOut(currentUser.id, 'Punched out from Dashboard');
                    if (res.success) {
                      webPushService.sendCheckOutAlert({
                        userName: currentUser.name,
                        shift: res.record?.shiftType || 'Morning',
                        time: res.record?.checkOutTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        workingHours: res.record?.workingHours || 8,
                        overtimeHours: res.record?.overtimeHours || 0,
                      });
                    }
                    onNavigateTab('attendance');
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition"
                >
                  {t.checkOutNow || (lang === 'km' ? 'កត់ត្រាម៉ោងចេញភ្លាមៗ' : 'Clock Out Now')}
                </button>
              ) : null}

              <button
                onClick={() => onNavigateTab('attendance')}
                className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition"
              >
                <span>{t.attendance || (lang === 'km' ? 'ទំព័រវត្តមាន' : 'Attendance Hub')}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })()}

      {/* Secondary Progress Bar Card */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-5 rounded-xl shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-blue-300">
              {lang === 'km' ? 'សន្ទស្សន៍អនុវត្តយុទ្ធសាស្ត្រសាជីវកម្ម' : 'Corporate Strategy Execution Index'}
            </div>
            <h3 className="text-lg font-bold mt-0.5">
              {t.overallCompletion}: <span className="text-emerald-400 font-mono text-xl">{overallCompletionPercentage}%</span>
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              {lang === 'km'
                ? `${completedActivitiesCount} នៃ ${totalActivitiesCount} សកម្មភាពបានបញ្ចប់ ស្របតាមគោលបំណងយុទ្ធសាស្ត្រស្ថាប័នដែលបានតាមដាន។`
                : `${completedActivitiesCount} of ${totalActivitiesCount} activities completed across monitored organizational objectives.`}
            </p>
          </div>
          <div className="w-full sm:w-64">
            <div className="w-full bg-slate-800 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-700">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${overallCompletionPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>{lang === 'km' ? 'គោលដៅ ០%' : '0% Target'}</span>
              <span>{lang === 'km' ? 'គោលដៅ ១០០%' : '100% Goal'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Performance Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-800">
              {t.departmentPerformance}
            </h3>
            <span className="text-xs text-slate-400">
              {lang === 'km' ? 'ទិន្នន័យបូកសរុបស្វ័យប្រវត្តិ' : 'MySQL Stored Aggregation'}
            </span>
          </div>
          <div className="h-64">
            <Bar 
              data={deptPerformanceData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { min: 0, max: 100, ticks: { callback: v => `${v}%` } },
                  x: { grid: { display: false } }
                }
              }} 
            />
          </div>
        </div>

        {/* Status Distribution Doughnut */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm text-slate-800">
                {lang === 'km' ? 'ការបែងចែកស្ថានភាពផែនការ' : 'Plan Status Distribution'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              {lang === 'km' ? 'ការបែងចែកបច្ចុប្បន្នតាមដំណាក់កាលវដ្តជីវិត' : 'Current distribution across lifecycle phases'}
            </p>
          </div>
          <div className="h-48 relative flex items-center justify-center">
            <Doughnut 
              data={statusDoughnutData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } }
              }} 
            />
          </div>
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-800">
              {t.monthlyTrends} ({lang === 'km' ? 'គោលដៅឆ្នាំ ២០២៦ ធៀបនឹងការសម្រេចជាក់ស្តែង' : '2026 Target vs Actual Delivery'})
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'km' ? 'ការវិភាគបន្ទាត់ពេលវេលានៃដំណាក់កាលផែនការ និងការបញ្ចប់ចុងក្រោយ' : 'Timeline analysis of plan milestones and final completions'}
            </p>
          </div>
        </div>
        <div className="h-56">
          <Line 
            data={monthlyTrendsData} 
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'top', labels: { font: { size: 11 } } } },
              scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } },
                x: { grid: { display: false } }
              }
            }} 
          />
        </div>
      </div>

      {/* Lists Row: Upcoming Deadlines & My Assigned Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-800">{t.upcomingDeadlines}</h3>
            </div>
            <button 
              onClick={() => onNavigateTab('calendar-gantt')}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center"
            >
              {lang === 'km' ? 'មើលប្រតិទិន' : 'View Calendar'} <ChevronRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {upcomingDeadlines.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">
                {lang === 'km' ? 'មិនមានកាលបរិច្ឆេទជិតមកដល់ទេ។' : 'No upcoming deadlines.'}
              </p>
            ) : (
              upcomingDeadlines.map(plan => {
                const isOverdue = plan.dueDate < today;
                const dept = departments.find(d => d.id === plan.departmentId);
                return (
                  <div 
                    key={plan.id}
                    onClick={() => onNavigatePlan(plan.id)}
                    className="py-3 flex items-center justify-between hover:bg-slate-50 rounded-lg px-2 cursor-pointer transition"
                  >
                    <div className="pr-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-blue-700">{plan.planNumber}</span>
                        <span className="text-xs font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-xs">{plan.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {dept?.name} &bull; <span className="font-medium text-slate-700">{plan.completionPercentage}% {lang === 'km' ? 'សម្រេច' : 'done'}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        isOverdue ? 'bg-rose-100 text-rose-700 font-bold' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {plan.dueDate}
                      </span>
                      {isOverdue && (
                        <span className="block text-[10px] text-rose-600 font-semibold mt-0.5">
                          {lang === 'km' ? 'ហួសកំណត់' : 'Overdue'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* My Assigned Tasks */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-800">{t.myAssignedTasks}</h3>
            </div>
            <button 
              onClick={() => onNavigateTab('activities')}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center"
            >
              {lang === 'km' ? 'សកម្មភាពទាំងអស់' : 'All Activities'} <ChevronRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {myAssignedTasks.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                {lang === 'km' ? 'មិនមានសកម្មភាពផ្ទាល់ខ្លួនត្រូវបានចាត់តាំងសម្រាប់គណនីរបស់អ្នកនៅឡើយទេ។' : 'No personal activities assigned to your current user session.'}
              </p>
            ) : (
              myAssignedTasks.slice(0, 5).map(act => {
                const plan = allPlans.find(p => p.id === act.actionPlanId);
                return (
                  <div 
                    key={act.id}
                    onClick={() => {
                      if (plan) onNavigatePlan(plan.id);
                    }}
                    className="py-3 flex items-center justify-between hover:bg-slate-50 rounded-lg px-2 cursor-pointer transition"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[11px] font-bold text-slate-600">{act.code}</span>
                        <span className="text-xs font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-xs">{act.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {lang === 'km' ? 'ផុតកំណត់៖' : 'Due:'} {act.dueDate} &bull; {lang === 'km' ? 'អាទិភាព៖' : 'Priority:'} <span className="font-medium text-slate-700">{act.priority}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        act.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {act.progressPercentage}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
