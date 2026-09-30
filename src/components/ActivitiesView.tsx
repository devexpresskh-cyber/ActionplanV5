import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  User, 
  TrendingUp, 
  Edit3, 
  Trash2, 
  X, 
  Flag,
  ArrowRight,
  ShieldAlert,
  UserCheck,
  Calendar,
  ListTree,
  Table
} from 'lucide-react';
import { Activity, Language, User as UserType, PriorityLevel, ActivityStatus } from '../types';
import { translations } from '../services/i18n';
import { db } from '../services/db';
import { ProgressModal } from './ProgressModal';
import { TaskScheduleModal } from './TaskScheduleModal';
import { WorkBreakdownStructureView } from './WorkBreakdownStructureView';

interface ActivitiesViewProps {
  currentUser: UserType;
  lang: Language;
}

export const ActivitiesView: React.FC<ActivitiesViewProps> = ({
  currentUser,
  lang,
}) => {
  const t = translations[lang];

  // Data
  const [activities, setActivities] = useState<Activity[]>(() => db.getActivities());
  const plans = useMemo(() => db.getAuthorizedPlans(currentUser), [currentUser]);
  const users = db.getUsers();

  // Filters
  const [viewMode, setViewMode] = useState<'table' | 'wbs'>('table');
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState(() => {
    return currentUser.role === 'Employee' ? currentUser.id : 'all';
  });
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [progressActivity, setProgressActivity] = useState<Activity | null>(null);
  const [scheduleActivity, setScheduleActivity] = useState<Activity | null>(null);
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [dependencyWarning, setDependencyWarning] = useState<string | null>(null);

  // Form State
  const [formPlanId, setFormPlanId] = useState(plans[0]?.id || '');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAssignedId, setFormAssignedId] = useState(currentUser.id);
  const [formTeamLeaderId, setFormTeamLeaderId] = useState(users[0]?.id || '');
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDueDate, setFormDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [formPriority, setFormPriority] = useState<PriorityLevel>('Medium');
  const [formWeight, setFormWeight] = useState(25);
  const [formIsMilestone, setFormIsMilestone] = useState(false);
  const [formDeliverable, setFormDeliverable] = useState('');
  const [formDependencies, setFormDependencies] = useState<string[]>([]);
  const [formError, setFormError] = useState('');

  const refreshActivities = () => {
    setActivities(db.getActivities());
  };

  const handleOpenCreate = () => {
    setFormPlanId(plans[0]?.id || '');
    setFormTitle('');
    setFormDescription('');
    setFormAssignedId(currentUser.id);
    setFormTeamLeaderId(users[0]?.id || '');
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormDueDate(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
    setFormPriority('Medium');
    setFormWeight(25);
    setFormIsMilestone(false);
    setFormDeliverable('');
    setFormDependencies([]);
    setFormError('');
    setEditingActivity(null);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (act: Activity) => {
    setFormPlanId(act.actionPlanId);
    setFormTitle(act.title);
    setFormDescription(act.description);
    setFormAssignedId(act.assignedEmployeeId);
    setFormTeamLeaderId(act.teamLeaderId);
    setFormStartDate(act.startDate);
    setFormDueDate(act.dueDate);
    setFormPriority(act.priority);
    setFormWeight(act.weightPercentage || act.weight || 10);
    setFormIsMilestone(Boolean(act.isMilestone));
    setFormDeliverable(act.deliverableOutput || '');
    setFormDependencies(act.dependencies || []);
    setFormError('');
    setEditingActivity(act);
    setShowCreateModal(true);
  };

  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError(lang === 'km' ? 'សូមបញ្ចូលចំណងជើងសកម្មភាព។' : 'Activity title is required.');
      return;
    }
    if (!formPlanId) {
      setFormError(lang === 'km' ? 'សូមជ្រើសរើសផែនការសកម្មភាពមេ។' : 'Please select a parent action plan.');
      return;
    }

    try {
      db.saveActivity({
        id: editingActivity?.id,
        actionPlanId: formPlanId,
        title: formTitle,
        description: formDescription,
        assignedEmployeeId: formAssignedId,
        teamLeaderId: formTeamLeaderId,
        startDate: formStartDate,
        dueDate: formDueDate,
        priority: formPriority,
        weight: Number(formWeight),
        weightPercentage: Number(formWeight),
        isMilestone: formIsMilestone,
        deliverableOutput: formDeliverable,
        dependencies: formDependencies,
      });

      setShowCreateModal(false);
      refreshActivities();
    } catch (err: any) {
      setFormError(err.message || (lang === 'km' ? 'មិនអាចរក្សាទុកសកម្មភាពបានទេ។' : 'Failed to save activity.'));
    }
  };

  // Quick toggle status with strict dependency check
  const handleToggleStatus = (act: Activity) => {
    if (act.status !== 'Completed') {
      // Validate dependencies
      const validation = db.validateDependencies(act.id);
      if (!validation.canComplete) {
        setDependencyWarning(
          lang === 'km'
            ? `មិនអាចសម្គាល់សកម្មភាពនេះថាបានបញ្ចប់ឡើយ។ សកម្មភាពអាស្រ័យជាមុនខាងក្រោមមិនទាន់បានបញ្ចប់នៅឡើយទេ៖\n- ${validation.blockingActivities.map(b => `${b.code}: ${b.title}`).join('\n- ')}`
            : `Cannot mark this activity completed. The following prerequisite dependencies are not yet completed:\n- ${validation.blockingActivities.map(b => `${b.code}: ${b.title}`).join('\n- ')}`
        );
        return;
      }

      // Mark completed & 100%
      db.saveActivity({
        ...act,
        status: 'Completed',
        progressPercentage: 100,
      });
      // Also log progress
      db.addProgressUpdate({
        entityType: 'activity',
        entityId: act.id,
        previousPercentage: act.progressPercentage,
        newPercentage: 100,
        description: lang === 'km' ? 'បានបញ្ចប់សកម្មភាពតាមរយៈបញ្ជីផ្ទៀងផ្ទាត់កិច្ចការ' : 'Completed activity via task checklist',
        completedWork: lang === 'km' ? 'សកម្មភាពបានបញ្ចប់ពេញលេញតាមការកំណត់ជាក់លាក់។' : 'Activity completed fully according to specifications.',
        problemsObstacles: lang === 'km' ? 'គ្មាន' : 'None',
        nextActions: lang === 'km' ? 'បន្តទៅសកម្មភាពដែលអាស្រ័យនៅក្នុងលំហូរការងារ។' : 'Proceed to dependent activities in workflow.',
        actualKpiResult: lang === 'km' ? 'សម្រេចបាន' : 'Achieved',
      });
    } else {
      // Revert to In Progress
      db.saveActivity({
        ...act,
        status: 'In Progress',
        progressPercentage: 50,
      });
    }
    refreshActivities();
  };

  const handleDelete = (act: Activity, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActivityToDelete(act);
    setDeleteError(null);
  };

  const handleConfirmDelete = () => {
    if (!activityToDelete) return;
    try {
      db.deleteActivity(activityToDelete.id);
      refreshActivities();
      setActivityToDelete(null);
    } catch (err: any) {
      setDeleteError(err.message || (lang === 'km' ? 'មិនអាចលុបសកម្មភាពបានទេ។' : 'Failed to delete activity.'));
    }
  };

  // Filter
  const filteredActivities = useMemo(() => {
    const authorizedPlanIds = new Set(plans.map(p => p.id));
    return activities.filter(a => {
      if (currentUser.role === 'Employee') {
        if (!authorizedPlanIds.has(a.actionPlanId) && a.assignedEmployeeId !== currentUser.id) {
          return false;
        }
      }
      if (planFilter !== 'all' && a.actionPlanId !== planFilter) return false;
      if (employeeFilter !== 'all' && a.assignedEmployeeId !== employeeFilter) return false;
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return a.title.toLowerCase().includes(q) || a.code.toLowerCase().includes(q);
      }
      return true;
    });
  }, [activities, plans, currentUser, planFilter, employeeFilter, statusFilter, search]);

  const statusColors: Record<ActivityStatus, string> = {
    'Not Started': 'bg-slate-100 text-slate-700',
    'In Progress': 'bg-blue-100 text-blue-800',
    'On Hold': 'bg-amber-100 text-amber-800',
    'Completed': 'bg-emerald-100 text-emerald-800',
    'Cancelled': 'bg-slate-200 text-slate-700',
    'Under Review': 'bg-indigo-100 text-indigo-800',
    'Delayed': 'bg-rose-100 text-rose-800',
    'Blocked': 'bg-purple-100 text-purple-800',
  };

  const getStatusLabel = (status: ActivityStatus) => {
    if (lang !== 'km') return status;
    switch (status) {
      case 'Not Started': return t.notStarted;
      case 'In Progress': return t.inProgress;
      case 'Completed': return t.completed;
      case 'On Hold': return 'ផ្អាកបណ្តោះអាសន្ន';
      case 'Cancelled': return 'បានបោះបង់';
      case 'Under Review': return 'កំពុងត្រួតពិនិត្យ';
      case 'Delayed': return 'ពន្យារពេល';
      case 'Blocked': return 'ជាប់គាំង';
      default: return status;
    }
  };

  return (
    <div className="space-y-2.5 sm:space-y-3.5 max-w-7xl mx-auto">
      {/* Header and Controls */}
      <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {t.activities} {lang === 'km' ? '& កិច្ចការ' : '& Tasks'}
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {lang === 'km'
              ? 'ការអនុវត្តកិច្ចការលម្អិត ការគណនាទម្ងន់ផែនការ និងការផ្ទៀងផ្ទាត់ភាពអាស្រ័យនៃកិច្ចការ។'
              : 'Granular task execution, weighted plan calculations, and dependency validation.'}
          </p>
        </div>

        {db.canCreatePlan(currentUser) && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition self-start md:self-auto active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'បន្ថែមសកម្មភាព' : 'New Activity'}</span>
          </button>
        )}
      </div>

      {/* View Mode Switcher: Table View vs WBS Plan & Task Treeview */}
      <div className="flex items-center justify-between bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setViewMode('table')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              viewMode === 'table'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'តារាងកិច្ចការ' : 'Tasks'}</span>
          </button>

          <button
            onClick={() => setViewMode('wbs')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              viewMode === 'wbs'
                ? 'bg-purple-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ListTree className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'មែកធាង Tree' : 'Tree Grid'}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
              viewMode === 'wbs' ? 'bg-amber-300 text-amber-950' : 'bg-purple-100 text-purple-800'
            }`}>
              WBS
            </span>
          </button>
        </div>

        {viewMode === 'table' && (
          <div className="text-[11px] text-slate-500 font-medium hidden sm:block pr-2">
            {filteredActivities.length} {lang === 'km' ? 'កិច្ចការ' : 'Activities'}
          </div>
        )}
      </div>

      {viewMode === 'wbs' ? (
        <WorkBreakdownStructureView
          currentUser={currentUser}
          lang={lang}
          selectedPlanId={planFilter !== 'all' ? planFilter : undefined}
        />
      ) : (
        <>
      {/* Filters - Compact */}
      <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative w-full max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={lang === 'km' ? 'ស្វែងរកកូដកិច្ចការ...' : 'Search task code, title...'}
              className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Direct My Assigned Tasks Toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
            <button
              onClick={() => setEmployeeFilter('all')}
              className={`px-2 py-0.5 rounded-md font-semibold transition ${
                employeeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'km' ? 'ទាំងអស់' : 'All'} ({activities.length})
            </button>
            <button
              onClick={() => setEmployeeFilter(currentUser.id)}
              className={`px-2 py-0.5 rounded-md font-semibold transition flex items-center space-x-1 ${
                employeeFilter === currentUser.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3 h-3" />
              <span>{lang === 'km' ? 'របស់ខ្ញុំ' : 'My Tasks'}</span>
              <span className={`ml-0.5 px-1 py-0.2 rounded-full text-[9px] ${
                employeeFilter === currentUser.id ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {activities.filter(a => a.assignedEmployeeId === currentUser.id).length}
              </span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Plan filter */}
          <select
            value={planFilter}
            onChange={e => setPlanFilter(e.target.value)}
            className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden max-w-[170px]"
          >
            <option value="all">{lang === 'km' ? 'គ្រប់ផែនការ' : 'All Plans'}</option>
            {plans.map(p => (
              <option key={p.id} value={p.id}>{p.planNumber}: {p.title}</option>
            ))}
          </select>

          {/* Assigned employee */}
          <select
            value={employeeFilter}
            onChange={e => setEmployeeFilter(e.target.value)}
            className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden max-w-[150px]"
          >
            <option value="all">{lang === 'km' ? 'គ្រប់បុគ្គលិក' : 'All Assignees'}</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden"
          >
            <option value="all">{lang === 'km' ? 'គ្រប់ស្ថានភាព' : 'All Status'}</option>
            <option value="Not Started">{t.notStarted}</option>
            <option value="In Progress">{t.inProgress}</option>
            <option value="Under Review">{lang === 'km' ? 'កំពុងត្រួតពិនិត្យ' : 'Under Review'}</option>
            <option value="Completed">{t.completed}</option>
            <option value="Delayed">{lang === 'km' ? 'ពន្យារពេល' : 'Delayed'}</option>
            <option value="Blocked">{lang === 'km' ? 'ជាប់គាំង' : 'Blocked'}</option>
          </select>
        </div>
      </div>

      {/* Direct Responsibility & Priority Management Banner */}
      {employeeFilter === currentUser.id && (
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-2.5 sm:p-3 rounded-xl shadow-2xs border border-blue-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="space-y-0.5 max-w-2xl">
            <div className="flex items-center space-x-1.5">
              <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-400/30 text-[9px]">
                {lang === 'km' ? 'ភារកិច្ចផ្ទាល់ខ្លួន' : 'My Responsibilities'}
              </span>
              <span className="text-slate-300 font-semibold text-[11px]">
                {lang === 'km' ? 'ការកំណត់អាទិភាព និងកាលបរិច្ឆេទ' : 'Prioritization & Deadlines'}
              </span>
            </div>
            <p className="text-slate-300 text-[10px] leading-relaxed line-clamp-1">
              {lang === 'km'
                ? 'បុគ្គលិកអាចកំណត់អាទិភាពកិច្ចការប្រកបដោយប្រសិទ្ធភាព និងធ្វើការកែសម្រួលដើម្បីឆ្លើយតបនឹងកាលកំណត់។'
                : 'Prioritize tasks and update deliverables to meet target deadlines smoothly.'}
            </p>
          </div>
          <div className="shrink-0 flex items-center space-x-1.5">
            <span className="px-2 py-0.5 rounded-lg bg-white/10 text-slate-200 font-mono text-[10px] border border-white/15">
              {activities.filter(a => a.assignedEmployeeId === currentUser.id && a.status === 'Completed').length} / {activities.filter(a => a.assignedEmployeeId === currentUser.id).length} {lang === 'km' ? 'រួច' : 'Done'}
            </span>
          </div>
        </div>
      )}

      {/* Dependency Warning Modal */}
      {dependencyWarning && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-2 text-rose-600 mb-2">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                {lang === 'km' ? 'បំពានវិធានភាពអាស្រ័យនៃកិច្ចការ' : 'Task Dependency Rule Violated'}
              </h3>
            </div>
            <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed mb-3">
              {dependencyWarning}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setDependencyWarning(null)}
                className="px-3 py-1 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900"
              >
                {lang === 'km' ? 'យល់ព្រម' : 'Understood'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activities Display: Mobile Card List (sm:hidden) & Desktop Table (hidden sm:block) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Mobile View: Cards */}
        <div className="sm:hidden divide-y divide-slate-100">
          {filteredActivities.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <CheckCircle className="w-7 h-7 mx-auto mb-1 text-slate-300" />
              <p className="text-xs font-medium">No activities found</p>
            </div>
          ) : (
            filteredActivities.map(act => {
              const plan = plans.find(p => p.id === act.actionPlanId);
              const isCompleted = act.status === 'Completed';

              return (
                <div key={act.id} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start space-x-2 min-w-0">
                      <button
                        onClick={() => handleToggleStatus(act)}
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition ${
                          isCompleted 
                            ? 'bg-emerald-600 border-emerald-600 text-white' 
                            : 'border-slate-300 hover:border-blue-500 bg-white'
                        }`}
                      >
                        {isCompleted && <CheckCircle className="w-3 h-3" />}
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <span className="font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded text-[10px]">
                            {act.code}
                          </span>
                          <span className={`font-semibold text-xs text-slate-900 ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                            {act.title}
                          </span>
                        </div>
                        {act.deliverableOutput && (
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">
                            {act.deliverableOutput}
                          </p>
                        )}
                      </div>
                    </div>

                    <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold shrink-0 ${statusColors[act.status]}`}>
                      {getStatusLabel(act.status)}
                    </span>
                  </div>

                  {/* Progress & Meta Bar */}
                  <div className="bg-slate-50/80 p-2 rounded-lg space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span className="truncate max-w-[160px] font-medium">{plan?.planNumber}</span>
                      <span className="font-mono text-slate-800 font-bold">{act.progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-blue-600'}`}
                        style={{ width: `${act.progressPercentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span>Due: {act.dueDate}</span>
                      <span>Weight: {act.weightPercentage}%</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-0.5">
                    <button
                      onClick={() => setProgressActivity(act)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200 active:scale-95"
                    >
                      <TrendingUp className="w-3 h-3" />
                      <span>Update</span>
                    </button>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setScheduleActivity(act)}
                        className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-slate-100"
                        title="Schedule"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(act)}
                        className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                        title="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(act, e);
                        }}
                        className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-slate-100"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Dense Clean Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-3 w-10 text-center">{lang === 'km' ? 'រួច' : 'Done'}</th>
                <th className="py-2.5 px-3">{lang === 'km' ? 'កូដ និងចំណងជើងសកម្មភាព' : 'Activity Code & Title'}</th>
                <th className="py-2.5 px-3">{t.actionPlans}</th>
                <th className="py-2.5 px-3">{lang === 'km' ? 'អ្នកទទួលបន្ទុក' : 'Assignee'}</th>
                <th className="py-2.5 px-2 text-center">{lang === 'km' ? 'ទម្ងន់' : 'Weight'}</th>
                <th className="py-2.5 px-2.5">{t.dueDate}</th>
                <th className="py-2.5 px-3">{lang === 'km' ? 'វឌ្ឍនភាព' : 'Progress'}</th>
                <th className="py-2.5 px-2.5">{t.status}</th>
                <th className="py-2.5 px-3 text-right">{lang === 'km' ? 'សកម្មភាព' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    {lang === 'km' ? 'រកមិនឃើញសកម្មភាពដែលត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ។' : 'No activities found matching criteria.'}
                  </td>
                </tr>
              ) : (
                filteredActivities.map(act => {
                  const plan = plans.find(p => p.id === act.actionPlanId);
                  const assignee = users.find(u => u.id === act.assignedEmployeeId);
                  const leader = users.find(u => u.id === act.teamLeaderId);
                  const isCompleted = act.status === 'Completed';

                  return (
                    <tr key={act.id} className="hover:bg-slate-50/80 transition">
                      {/* Done Checkbox */}
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(act)}
                          className={`w-4 h-4 rounded border flex items-center justify-center transition mx-auto ${
                            isCompleted 
                              ? 'bg-emerald-600 border-emerald-600 text-white' 
                              : 'border-slate-300 hover:border-blue-500 bg-white'
                          }`}
                          title={isCompleted ? (lang === 'km' ? 'សម្គាល់ថាកំពុងដំណើរការ' : 'Mark In Progress') : (lang === 'km' ? 'សម្គាល់ថាបានបញ្ចប់' : 'Mark Completed')}
                        >
                          {isCompleted && <CheckCircle className="w-3 h-3" />}
                        </button>
                      </td>

                      {/* Code & Title */}
                      <td className="py-2 px-3">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded text-[10px]">
                            {act.code}
                          </span>
                          <span className={`font-semibold text-slate-900 ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                            {act.title}
                          </span>
                          {act.isMilestone && (
                            <span className="inline-flex items-center space-x-0.5 text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-bold">
                              <Flag className="w-2.5 h-2.5" />
                              <span>{lang === 'km' ? 'ព្រឹត្តិការណ៍គន្លឹះ' : 'Milestone'}</span>
                            </span>
                          )}
                        </div>
                        {act.deliverableOutput && (
                          <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                            {lang === 'km' ? 'លទ្ធផល៖' : 'Output:'} {act.deliverableOutput}
                          </div>
                        )}
                        {act.dependencies && act.dependencies.length > 0 && (
                          <div className="text-[9px] text-amber-600 font-medium mt-0.5 flex items-center space-x-1">
                            <span>{lang === 'km' ? 'ទាមទារជាមុន៖' : 'Requires:'}</span>
                            <span className="font-mono">
                              {act.dependencies.map(depId => activities.find(a => a.id === depId)?.code).filter(Boolean).join(', ')}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Action Plan */}
                      <td className="py-2 px-3">
                        <div className="font-medium text-slate-800 truncate max-w-[140px] text-xs">
                          {plan?.planNumber}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                          {plan?.title}
                        </div>
                      </td>

                      {/* Assignee & Leader */}
                      <td className="py-2 px-3">
                        <div className="font-medium text-slate-800 text-xs">{assignee?.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {lang === 'km' ? 'ប្រធាន៖' : 'Lead:'} {leader?.name}
                        </div>
                      </td>

                      {/* Weight */}
                      <td className="py-2 px-2 text-center font-mono font-semibold text-slate-700 text-xs">
                        {act.weightPercentage}%
                      </td>

                      {/* Due Date */}
                      <td className="py-2 px-2.5 text-slate-700 font-medium text-xs">
                        {act.dueDate}
                      </td>

                      {/* Progress */}
                      <td className="py-2 px-3 min-w-[90px]">
                        <div className="flex justify-between items-center text-[10px] mb-0.5">
                          <span className="font-mono font-bold text-slate-800">{act.progressPercentage}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-blue-600'}`}
                            style={{ width: `${act.progressPercentage}%` }}
                          />
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-2 px-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${statusColors[act.status]}`}>
                          {getStatusLabel(act.status)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => setScheduleActivity(act)}
                            className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-slate-100"
                            title={lang === 'km' ? 'កែសម្រួលកាលបរិច្ឆេទ & អាទិភាព' : 'Manage Deadline & Priority'}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setProgressActivity(act)}
                            className="p-1 rounded text-slate-500 hover:text-emerald-600 hover:bg-slate-100"
                            title={lang === 'km' ? 'កែប្រែវឌ្ឍនភាព' : 'Update Progress'}
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(act)}
                            className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                            title={lang === 'km' ? 'កែសម្រួលសកម្មភាព' : 'Edit Activity'}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(act, e);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-slate-100 transition cursor-pointer"
                            title={lang === 'km' ? 'លុបសកម្មភាព' : 'Delete Activity'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* CREATE / EDIT ACTIVITY MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <h3 className="text-base font-bold text-slate-900">
                {editingActivity
                  ? (lang === 'km' ? 'កែសម្រួលសកម្មភាព / កិច្ចការ' : 'Edit Activity / Task')
                  : (lang === 'km' ? 'បន្ថែមសកម្មភាពថ្មី' : 'Add New Activity')}
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="activity-form" onSubmit={handleSaveActivity} className="p-6 overflow-y-auto space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Action Plan */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'km' ? 'ផែនការសកម្មភាពមេ *' : 'Parent Action Plan *'}
                </label>
                <select
                  value={formPlanId}
                  onChange={e => setFormPlanId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  required
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.planNumber}: {p.title}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'km' ? 'ចំណងជើងសកម្មភាព *' : 'Activity Title *'}
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder={lang === 'km' ? 'ឧ. អនុវត្តការធ្វើតេស្តសុវត្ថិភាពលើប្រព័ន្ធផ្ទៀងផ្ទាត់' : 'e.g. Conduct security penetration test on authentication endpoints'}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t.description}
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder={lang === 'km' ? 'ព័ត៌មានលម្អិតនៃការអនុវត្តជំហានម្តងៗ...' : 'Step by step execution details...'}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Assignee */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'km' ? 'បុគ្គលិកទទួលបន្ទុក *' : 'Assigned Employee *'}
                  </label>
                  <select
                    value={formAssignedId}
                    onChange={e => setFormAssignedId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>

                {/* Team Leader */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'km' ? 'ប្រធានក្រុម *' : 'Team Leader *'}
                  </label>
                  <select
                    value={formTeamLeaderId}
                    onChange={e => setFormTeamLeaderId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t.startDate} *
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={e => setFormStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    required
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t.dueDate} *
                  </label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={e => setFormDueDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    required
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t.priority}
                  </label>
                  <select
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value as PriorityLevel)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="Low">{t.low}</option>
                    <option value="Medium">{t.medium}</option>
                    <option value="High">{t.high}</option>
                    <option value="Critical">{t.critical}</option>
                  </select>
                </div>

                {/* Weight Percentage */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'km' ? 'ភាគរយទម្ងន់ (%) *' : 'Weight Percentage (%) *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formWeight}
                    onChange={e => setFormWeight(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              {/* Deliverable Output */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'km' ? 'លទ្ធផលសម្រេចបាន' : 'Deliverable Output'}
                </label>
                <input
                  type="text"
                  value={formDeliverable}
                  onChange={e => setFormDeliverable(e.target.value)}
                  placeholder={lang === 'km' ? 'ឧ. របាយការណ៍សវនកម្មដែលបានបោះពុម្ព' : 'e.g. Published penetration test audit report with zero unpatched CVEs'}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Milestone checkbox */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="milestone-check"
                  checked={formIsMilestone}
                  onChange={e => setFormIsMilestone(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="milestone-check" className="font-semibold text-slate-700 flex items-center space-x-1">
                  <Flag className="w-3.5 h-3.5 text-purple-600" />
                  <span>{lang === 'km' ? 'កំណត់ជាព្រឹត្តិការណ៍គន្លឹះយុទ្ធសាស្ត្រ' : 'Flag as Strategic Milestone'}</span>
                </label>
              </div>

              {/* Task Dependencies (Prerequisites) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'km' ? 'ភាពអាស្រ័យជាមុន (ត្រូវតែបញ្ចប់ជាមុន)' : 'Prerequisite Dependencies (Must be completed first)'}
                </label>
                <div className="border border-slate-200 rounded-lg p-2 max-h-36 overflow-y-auto space-y-1">
                  {activities
                    .filter(a => a.id !== editingActivity?.id && a.actionPlanId === formPlanId)
                    .map(dep => {
                      const isChecked = formDependencies.includes(dep.id);
                      return (
                        <label key={dep.id} className="flex items-center space-x-2 hover:bg-slate-50 p-1 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => {
                              if (e.target.checked) {
                                setFormDependencies([...formDependencies, dep.id]);
                              } else {
                                setFormDependencies(formDependencies.filter(id => id !== dep.id));
                              }
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-mono font-bold text-slate-700">{dep.code}</span>
                          <span className="text-slate-700 truncate">{dep.title}</span>
                          <span className={`text-[10px] px-1 rounded ml-auto ${dep.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                            {getStatusLabel(dep.status)}
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>
            </form>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-2 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                {t.cancel}
              </button>
              <button
                form="activity-form"
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
              >
                {editingActivity
                  ? (lang === 'km' ? 'រក្សាទុកការកែប្រែ' : 'Save Changes')
                  : (lang === 'km' ? 'បន្ថែមសកម្មភាព' : 'Add Activity')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROGRESS MODAL */}
      {progressActivity && (
        <ProgressModal
          entityType="activity"
          item={progressActivity}
          currentUser={currentUser}
          lang={lang}
          onClose={() => setProgressActivity(null)}
          onSuccess={() => {
            refreshActivities();
          }}
        />
      )}

      {/* CONFIRM DELETE ACTIVITY MODAL */}
      {activityToDelete && (
        <div 
          id="confirm-delete-activity-modal"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {lang === 'km' ? 'បញ្ជាក់ការលុបសកម្មភាព' : 'Confirm Delete Activity'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'km' ? 'លុបសកម្មភាព / កិច្ចការចេញពីផែនការ' : 'Remove activity task from plan'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4 text-xs space-y-2">
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {activityToDelete.code}
                </span>
                <span className="font-semibold text-slate-900 line-clamp-1">{activityToDelete.title}</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                {lang === 'km'
                  ? `តើអ្នកប្រាកដជាចង់លុបសកម្មភាព ${activityToDelete.code} («${activityToDelete.title}») នេះមែនទេ?`
                  : `Are you sure you want to remove activity ${activityToDelete.code} ("${activityToDelete.title}")?`}
              </p>
            </div>

            {deleteError && (
              <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setActivityToDelete(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition"
              >
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition flex items-center space-x-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{lang === 'km' ? 'យល់ព្រមលុប' : 'Yes, Delete Activity'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TASK SCHEDULE & PRIORITY ADJUSTMENT MODAL */}
      {scheduleActivity && (
        <TaskScheduleModal
          isOpen={!!scheduleActivity}
          onClose={() => setScheduleActivity(null)}
          activity={scheduleActivity}
          currentUser={currentUser}
          lang={lang}
          onSuccess={() => {
            refreshActivities();
          }}
        />
      )}
    </div>
  );
};
