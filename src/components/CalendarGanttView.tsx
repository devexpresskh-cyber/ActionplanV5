import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  BarChart2, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Flag, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Layers, 
  User, 
  Building2,
  X
} from 'lucide-react';
import { ActionPlan, Activity, Language, User as UserType } from '../types';
import { translations } from '../services/i18n';
import { db } from '../services/db';

interface CalendarGanttViewProps {
  currentUser: UserType;
  lang: Language;
  onNavigatePlan: (planId: string) => void;
}

export const CalendarGanttView: React.FC<CalendarGanttViewProps> = ({
  currentUser,
  lang,
  onNavigatePlan,
}) => {
  const t = translations[lang];
  const [activeMode, setActiveMode] = useState<'calendar' | 'gantt'>('gantt');

  // Month navigation for Calendar
  const [calendarDate, setCalendarDate] = useState(() => new Date(2026, 2, 1)); // March 2026

  // Filters
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const plans = db.getAuthorizedPlans(currentUser);
  const activities = db.getActivities();
  const departments = db.getDepartments();
  const users = db.getUsers();

  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      if (filterDept !== 'all' && p.departmentId !== filterDept) return false;
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      return true;
    });
  }, [plans, filterDept, filterStatus]);

  // Selected item drawer
  const [selectedPlan, setSelectedPlan] = useState<ActionPlan | null>(null);

  // Month details for calendar
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthName = calendarDate.toLocaleString('default', { month: 'long' });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Map events to days
  const eventsByDay = useMemo(() => {
    const map: Record<number, { plans: ActionPlan[]; acts: Activity[] }> = {};
    for (let d = 1; d <= 31; d++) {
      map[d] = { plans: [], acts: [] };
    }

    const currentYearMonth = `${year}-${String(month + 1).padStart(2, '0')}`;

    filteredPlans.forEach(p => {
      if (p.dueDate.startsWith(currentYearMonth)) {
        const day = parseInt(p.dueDate.split('-')[2], 10);
        if (map[day]) map[day].plans.push(p);
      }
    });

    activities.forEach(a => {
      if (a.dueDate.startsWith(currentYearMonth)) {
        const day = parseInt(a.dueDate.split('-')[2], 10);
        if (map[day]) map[day].acts.push(a);
      }
    });

    return map;
  }, [filteredPlans, activities, year, month]);

  // Gantt Chart Calculations (Timeline Jan - Jun 2026 or current Quarter)
  // We'll project plans onto a 6-month scale (Jan 1, 2026 to Jun 30, 2026)
  const timelineStart = new Date('2026-01-01').getTime();
  const timelineEnd = new Date('2026-06-30').getTime();
  const totalTimelineDuration = timelineEnd - timelineStart;

  const monthsHeader = [
    { name: lang === 'km' ? 'មករា ២០២៦' : 'Jan 2026', days: 31 },
    { name: lang === 'km' ? 'កុម្ភៈ ២០២៦' : 'Feb 2026', days: 28 },
    { name: lang === 'km' ? 'មីនា ២០២៦' : 'Mar 2026', days: 31 },
    { name: lang === 'km' ? 'មេសា ២០២៦' : 'Apr 2026', days: 30 },
    { name: lang === 'km' ? 'ឧសភា ២០២៦' : 'May 2026', days: 31 },
    { name: lang === 'km' ? 'មិថុនា ២០២៦' : 'Jun 2026', days: 30 },
  ];

  const khmerMonths = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];

  const getPositionStyles = (startDateStr: string, dueDateStr: string) => {
    const s = Math.max(new Date(startDateStr).getTime(), timelineStart);
    const e = Math.min(new Date(dueDateStr).getTime(), timelineEnd);
    const leftPct = ((s - timelineStart) / totalTimelineDuration) * 100;
    const widthPct = Math.max(((e - s) / totalTimelineDuration) * 100, 2);
    return { left: `${Math.max(0, leftPct)}%`, width: `${Math.min(100 - leftPct, widthPct)}%` };
  };

  const getStatusLabel = (status: string) => {
    if (lang !== 'km') return status;
    if (status === 'Draft') return 'ព្រាង';
    if (status === 'In Progress') return 'កំពុងដំណើរការ';
    if (status === 'Under Review') return 'កំពុងត្រួតពិនិត្យ';
    if (status === 'Approved') return 'បានអនុម័ត';
    if (status === 'Rejected') return 'បានបដិសេធ';
    if (status === 'Completed') return 'បានបញ្ចប់';
    return status;
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {t.calendarGantt}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === 'km'
              ? 'មើលឃើញពីដំណាក់កាលសំខាន់ៗរបស់អង្គភាព បន្ទាត់ពេលវេលា Gantt ភាពអាស្រ័យនៃកិច្ចការ និងកាលបរិច្ឆេទកំណត់។'
              : 'Visualize organizational milestones, Gantt timelines, task dependencies, and deadlines.'}
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center space-x-2">
          <div className="bg-slate-100 p-1 rounded-lg flex items-center space-x-1 text-xs font-semibold">
            <button
              onClick={() => setActiveMode('gantt')}
              className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition ${
                activeMode === 'gantt' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? 'បន្ទាត់ពេលវេលា Gantt' : 'Gantt Timeline'}</span>
            </button>
            <button
              onClick={() => setActiveMode('calendar')}
              className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition ${
                activeMode === 'calendar' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? 'ក្រឡាប្រតិទិន' : 'Calendar Grid'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-700">
            {lang === 'km' ? 'ត្រងតាម៖' : 'Filter By:'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-hidden"
          >
            <option value="all">{lang === 'km' ? 'គ្រប់នាយកដ្ឋាន' : 'All Departments'}</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-hidden"
          >
            <option value="all">{lang === 'km' ? 'គ្រប់ស្ថានភាព' : 'All Statuses'}</option>
            <option value="Draft">{lang === 'km' ? 'ព្រាង' : 'Draft'}</option>
            <option value="In Progress">{lang === 'km' ? 'កំពុងដំណើរការ' : 'In Progress'}</option>
            <option value="Completed">{lang === 'km' ? 'បានបញ្ចប់' : 'Completed'}</option>
          </select>
        </div>
      </div>

      {/* GANTT VIEW */}
      {activeMode === 'gantt' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">
              {lang === 'km' 
                ? 'បន្ទាត់ពេលវេលា Gantt អន្តរកម្ម៖ ឆមាសទី១ ឆ្នាំ២០២៦ (មករា - មិថុនា)' 
                : 'Interactive Gantt Timeline: H1 2026 (Jan - Jun)'}
            </span>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[11px] text-slate-500">
              <span className="flex items-center space-x-1">
                <span className="w-3 h-3 rounded bg-blue-600 inline-block"></span>
                <span>{lang === 'km' ? 'កំពុងដំណើរការ' : 'In Progress'}</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
                <span>{lang === 'km' ? 'បានបញ្ចប់' : 'Completed'}</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-3 h-3 rounded bg-purple-600 inline-block"></span>
                <span>{lang === 'km' ? 'ដំណាក់កាលសំខាន់' : 'Milestone'}</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-3 h-3 rounded bg-rose-500 inline-block"></span>
                <span>{lang === 'km' ? 'ហួសកាលកំណត់' : 'Overdue'}</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[850px]">
              {/* Timeline Header Months */}
              <div className="grid grid-cols-12 border-b border-slate-200 bg-slate-100 text-[11px] font-bold text-slate-600 divide-x divide-slate-200">
                <div className="col-span-4 p-2.5">
                  {lang === 'km' ? 'ផែនការសកម្មភាព / ឈ្មោះសកម្មភាព' : 'Action Plan / Activity Name'}
                </div>
                <div className="col-span-8 grid grid-cols-6 divide-x divide-slate-200 text-center">
                  {monthsHeader.map((m, idx) => (
                    <div key={idx} className="p-2.5">{m.name}</div>
                  ))}
                </div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-100 text-xs">
                {filteredPlans.map(plan => {
                  const planActs = activities.filter(a => a.actionPlanId === plan.id);
                  const isOverdue = plan.dueDate < new Date().toISOString().split('T')[0] && plan.status !== 'Completed';
                  const pos = getPositionStyles(plan.startDate, plan.dueDate);

                  return (
                    <React.Fragment key={plan.id}>
                      {/* Action Plan Level Row */}
                      <div className="grid grid-cols-12 hover:bg-slate-50/80 transition items-center py-2.5 bg-slate-50/40">
                        <div className="col-span-4 px-3 flex items-center space-x-2">
                          <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span 
                            onClick={() => onNavigatePlan(plan.id)}
                            className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer truncate"
                          >
                            {plan.planNumber}: {plan.title}
                          </span>
                        </div>
                        <div className="col-span-8 px-2 relative h-7 flex items-center">
                          {/* Timeline Bar */}
                          <div 
                            className={`absolute h-5 rounded-md shadow-xs flex items-center px-2 cursor-pointer transition ${
                              plan.status === 'Completed' ? 'bg-emerald-600 text-white' :
                              isOverdue ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'
                            }`}
                            style={pos}
                            onClick={() => setSelectedPlan(plan)}
                            title={`${plan.title} (${plan.completionPercentage}%)`}
                          >
                            <span className="text-[10px] font-bold truncate">
                              {plan.completionPercentage}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Activities Level Rows */}
                      {planActs.map(act => {
                        const actPos = getPositionStyles(act.startDate, act.dueDate);
                        const actOverdue = act.dueDate < new Date().toISOString().split('T')[0] && act.status !== 'Completed';
                        return (
                          <div key={act.id} className="grid grid-cols-12 hover:bg-slate-50 transition items-center py-1.5 pl-6">
                            <div className="col-span-4 px-3 flex items-center space-x-2">
                              <span className="font-mono text-[10px] text-slate-400">{act.code}</span>
                              <span className="truncate text-slate-700 text-[11px]">{act.title}</span>
                              {act.isMilestone && <Flag className="w-2.5 h-2.5 text-purple-600 shrink-0" />}
                            </div>
                            <div className="col-span-8 px-2 relative h-5 flex items-center">
                              <div 
                                className={`absolute h-3 rounded shadow-2xs ${
                                  act.status === 'Completed' ? 'bg-emerald-400' :
                                  actOverdue ? 'bg-rose-400' :
                                  act.isMilestone ? 'bg-purple-500' : 'bg-blue-400'
                                }`}
                                style={actPos}
                                title={`${act.code}: ${act.title} (${act.progressPercentage}%)`}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CALENDAR VIEW */}
      {activeMode === 'calendar' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Calendar Navigation Header */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h3 className="font-bold text-sm text-slate-800">
                {lang === 'km' ? `${khmerMonths[month]} ឆ្នាំ ${year}` : `${monthName} ${year}`}
              </h3>
              <span className="text-xs text-slate-400">
                {lang === 'km' ? 'កាលបរិច្ឆេទកំណត់ & ការប្រគល់ការងារ' : 'Deadlines & Deliveries'}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-white"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-white"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Responsive Calendar Container with Horizontal Scroll on Mobile */}
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100 text-center text-xs font-bold text-slate-600 py-2">
            <div>{lang === 'km' ? 'អាទិត្យ' : 'Sun'}</div>
            <div>{lang === 'km' ? 'ចន្ទ' : 'Mon'}</div>
            <div>{lang === 'km' ? 'អង្គារ' : 'Tue'}</div>
            <div>{lang === 'km' ? 'ពុធ' : 'Wed'}</div>
            <div>{lang === 'km' ? 'ព្រហ' : 'Thu'}</div>
            <div>{lang === 'km' ? 'សុក្រ' : 'Fri'}</div>
            <div>{lang === 'km' ? 'សៅរ៍' : 'Sat'}</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 min-h-[500px]">
            {/* Blank leading days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-slate-50/50 p-2 min-h-[90px]"></div>
            ))}

            {/* Days in month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dayData = eventsByDay[dayNum] || { plans: [], acts: [] };
              const isToday = dayNum === 17 && month === 2 && year === 2026;

              return (
                <div 
                  key={`day-${dayNum}`} 
                  className={`p-2 min-h-[90px] hover:bg-slate-50/60 transition ${isToday ? 'bg-blue-50/30' : ''}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs font-bold ${isToday ? 'w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center' : 'text-slate-700'}`}>
                      {dayNum}
                    </span>
                    {(dayData.plans.length > 0 || dayData.acts.length > 0) && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {dayData.plans.length + dayData.acts.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {dayData.plans.map(p => {
                      const isOverdue = p.dueDate < new Date().toISOString().split('T')[0] && p.status !== 'Completed';
                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPlan(p)}
                          className={`p-1 rounded text-[10px] truncate cursor-pointer font-medium border ${
                            p.status === 'Completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            isOverdue ? 'bg-rose-50 text-rose-800 border-rose-200 font-bold' :
                            'bg-blue-50 text-blue-800 border-blue-200'
                          }`}
                          title={`${p.planNumber}: ${p.title}`}
                        >
                          {p.planNumber}
                        </div>
                      );
                    })}

                    {dayData.acts.map(a => (
                      <div
                        key={a.id}
                        className={`p-1 rounded text-[10px] truncate font-medium ${
                          a.status === 'Completed' ? 'bg-slate-100 text-slate-500 line-through' :
                          'bg-amber-50 text-amber-900 border border-amber-200'
                        }`}
                        title={`${a.code}: ${a.title}`}
                      >
                        {a.code}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan Details Modal / Inspector */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div>
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {selectedPlan.planNumber}
                </span>
                <h4 className="font-bold text-sm text-slate-900 mt-1">{selectedPlan.title}</h4>
              </div>
              <button 
                onClick={() => setSelectedPlan(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 text-xs text-slate-600 mb-4">
              <p>{selectedPlan.description}</p>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <div>{lang === 'km' ? 'កាលបរិច្ឆេទកំណត់៖' : 'Due Date:'} <span className="font-semibold text-slate-800">{selectedPlan.dueDate}</span></div>
                <div>{lang === 'km' ? 'ស្ថានភាព៖' : 'Status:'} <span className="font-semibold text-slate-800">{getStatusLabel(selectedPlan.status)}</span></div>
                <div>{lang === 'km' ? 'វឌ្ឍនភាព៖' : 'Progress:'} <span className="font-semibold text-slate-800">{selectedPlan.completionPercentage}%</span></div>
                <div>{lang === 'km' ? 'ថវិកា៖' : 'Budget:'} <span className="font-semibold text-slate-800">${selectedPlan.budget.toLocaleString()}</span></div>
              </div>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  const id = selectedPlan.id;
                  setSelectedPlan(null);
                  onNavigatePlan(id);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
              >
                {lang === 'km' ? 'បើកមើលផែនការសកម្មភាពពេញលេញ' : 'Open Full Action Plan'}
              </button>
              <button
                onClick={() => setSelectedPlan(null)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-700 hover:bg-slate-50"
              >
                {lang === 'km' ? 'បិទ' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
