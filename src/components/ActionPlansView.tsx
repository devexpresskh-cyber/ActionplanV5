import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Copy, 
  Trash2, 
  Edit3, 
  Eye, 
  TrendingUp, 
  CheckCircle, 
  CheckCircle2,
  AlertCircle,
  AlertTriangle, 
  Calendar, 
  DollarSign, 
  User as UserIcon, 
  Building2, 
  Target, 
  FileText, 
  CheckSquare, 
  X, 
  ShieldCheck, 
  ArrowUpDown,
  Paperclip,
  Mic,
  Sparkles,
  UserCheck,
  Check,
  Users as UsersIcon,
  MessageSquare,
  Network,
  ListTree,
  Layers
} from 'lucide-react';
import { ActionPlan, Language, User, PriorityLevel, PlanStatus, Department, Objective } from '../types';
import { translations } from '../services/i18n';
import { db } from '../services/db';
import { ProgressModal } from './ProgressModal';
import { ApprovalModal } from './ApprovalModal';
import { PlanCollaborationModal } from './PlanCollaborationModal';
import { PlanGoalReviewModal } from './PlanGoalReviewModal';
import { OrganizationalTreeview } from './OrganizationalTreeview';
import { WorkBreakdownStructureView } from './WorkBreakdownStructureView';

interface ActionPlansViewProps {
  currentUser: User;
  lang: Language;
  selectedPlanId?: string | null;
  onSelectPlan?: (id: string | null) => void;
  onOpenVoiceAssistant?: () => void;
  initialCreateOpen?: boolean;
  onClearInitialCreateOpen?: () => void;
}

export const ActionPlansView: React.FC<ActionPlansViewProps> = ({
  currentUser,
  lang,
  selectedPlanId,
  onSelectPlan,
  onOpenVoiceAssistant,
  initialCreateOpen,
  onClearInitialCreateOpen,
}) => {
  const t = translations[lang];

  // Data
  const [plans, setPlans] = useState<ActionPlan[]>(() => db.getAuthorizedPlans(currentUser));
  const departments = db.getDepartments();
  const objectives = db.getObjectives();
  const users = db.getUsers();

  // Search & Filter state
  const [viewLayout, setViewLayout] = useState<'cards' | 'wbs' | 'treeview'>('cards');
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterOwnership, setFilterOwnership] = useState<'all' | 'my-owned'>(() => {
    return currentUser.role === 'Employee' ? 'my-owned' : 'all';
  });
  const [sortField, setSortField] = useState<'dueDate' | 'completionPercentage' | 'priority'>('dueDate');
  const [sortAsc, setSortAsc] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ActionPlan | null>(null);
  const [inspectingPlan, setInspectingPlan] = useState<ActionPlan | null>(null);
  const [progressPlan, setProgressPlan] = useState<ActionPlan | null>(null);
  const [approvalPlan, setApprovalPlan] = useState<ActionPlan | null>(null);
  const [collaborationPlan, setCollaborationPlan] = useState<ActionPlan | null>(null);
  const [goalReviewPlan, setGoalReviewPlan] = useState<ActionPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<ActionPlan | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State for Create/Edit
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDeptId, setFormDeptId] = useState(departments[0]?.id || '');
  const [formObjectiveId, setFormObjectiveId] = useState(objectives[0]?.id || '');
  const [formOwnerId, setFormOwnerId] = useState(currentUser.id);
  const [formSupportingIds, setFormSupportingIds] = useState<string[]>([]);
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDueDate, setFormDueDate] = useState(new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0]);
  const [formPriority, setFormPriority] = useState<PriorityLevel>('Medium');
  const [formKpi, setFormKpi] = useState('');
  const [formKpiTarget, setFormKpiTarget] = useState(100);
  const [formKpiUnit, setFormKpiUnit] = useState('%');
  const [formBudget, setFormBudget] = useState(0);
  const [formExpectedResult, setFormExpectedResult] = useState('');
  const [formError, setFormError] = useState('');

  const refreshPlans = () => {
    setPlans(db.getAuthorizedPlans(currentUser));
  };

  // Sync plans whenever active user changes
  React.useEffect(() => {
    setPlans(db.getAuthorizedPlans(currentUser));
    if (currentUser.role === 'Employee') {
      setFilterOwnership('my-owned');
    }
  }, [currentUser]);

  // If selectedPlanId prop passed, auto open inspector if authorized
  React.useEffect(() => {
    if (selectedPlanId) {
      const p = db.getPlanById(selectedPlanId);
      if (p && db.canViewPlan(currentUser, p)) {
        setInspectingPlan(p);
      }
    }
  }, [selectedPlanId, currentUser]);

  const handleInspectPlan = (plan: ActionPlan) => {
    if (!db.canViewPlan(currentUser, plan)) {
      setFeedbackNotice({
        type: 'error',
        message: lang === 'km'
          ? 'អ្នកមិនមានសិទ្ធិមើលផែនការនេះទេ។ ក្នុងនាមជាបុគ្គលិក អ្នកអាចមើលបានតែផែនការដែលជាកម្មសិទ្ធិផ្ទាល់ខ្លួនប៉ុណ្ណោះ។'
          : 'Access denied: As an Employee, you can view owned plans only.'
      });
      return;
    }
    setInspectingPlan(plan);
  };

  // If initialCreateOpen is requested (e.g. from Employee Hub)
  React.useEffect(() => {
    if (initialCreateOpen) {
      handleOpenCreate();
      onClearInitialCreateOpen?.();
    }
  }, [initialCreateOpen]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormTitle('');
    setFormDescription('');
    setFormDeptId(currentUser.departmentId || departments[0]?.id || '');
    setFormObjectiveId(objectives[0]?.id || '');
    setFormOwnerId(currentUser.id);
    setFormSupportingIds([]);
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormDueDate(new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0]);
    setFormPriority('Medium');
    setFormKpi('');
    setFormKpiTarget(100);
    setFormKpiUnit('%');
    setFormBudget(0);
    setFormExpectedResult('');
    setFormError('');
    setEditingPlan(null);
    setShowCreateModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (plan: ActionPlan) => {
    setFormTitle(plan.title);
    setFormDescription(plan.description);
    setFormDeptId(plan.departmentId);
    setFormObjectiveId(plan.objectiveId);
    setFormOwnerId(plan.ownerId);
    setFormSupportingIds(plan.supportingEmployeeIds || []);
    setFormStartDate(plan.startDate);
    setFormDueDate(plan.dueDate);
    setFormPriority(plan.priority);
    setFormKpi(plan.kpi);
    setFormKpiTarget(plan.kpiTarget);
    setFormKpiUnit(plan.kpiUnit);
    setFormBudget(plan.budget);
    setFormExpectedResult(plan.expectedResult);
    setFormError('');
    setEditingPlan(plan);
    setShowCreateModal(true);
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError(lang === 'km' ? 'សូមបញ្ចូលចំណងជើងផែនការ។' : 'Plan title is required.');
      return;
    }
    if (!formDeptId) {
      setFormError(lang === 'km' ? 'សូមជ្រើសរើសនាយកដ្ឋានមួយ។' : 'Please select a department.');
      return;
    }

    try {
      db.savePlan({
        id: editingPlan?.id,
        title: formTitle,
        description: formDescription,
        departmentId: formDeptId,
        objectiveId: formObjectiveId,
        ownerId: formOwnerId,
        supportingEmployeeIds: formSupportingIds,
        startDate: formStartDate,
        dueDate: formDueDate,
        priority: formPriority,
        kpi: formKpi,
        kpiTarget: Number(formKpiTarget),
        kpiUnit: formKpiUnit,
        budget: Number(formBudget),
        expectedResult: formExpectedResult,
      });

      setShowCreateModal(false);
      refreshPlans();
    } catch (err: any) {
      setFormError(err.message || (lang === 'km' ? 'បរាជ័យក្នុងការរក្សាទុកផែនការសកម្មភាព។' : 'Failed to save action plan.'));
    }
  };

  const handleQuickCompletePlan = (planId: string) => {
    try {
      const updated = db.updatePlanProgress(
        planId, 
        100, 
        lang === 'km' ? 'បានបញ្ចប់ផែនការសកម្មភាព' : 'Completed action plan via 1-click quick action'
      );
      if (updated) {
        refreshPlans();
        if (inspectingPlan?.id === planId) {
          setInspectingPlan(updated);
        }
        setFeedbackNotice({
          type: 'success',
          message: lang === 'km' 
            ? `ផែនការ ${updated.planNumber} បានបញ្ចប់ ១០០% ដោយជោគជ័យ!` 
            : `Plan ${updated.planNumber} marked 100% completed!`
        });
        setTimeout(() => setFeedbackNotice(null), 4000);
      }
    } catch (err: any) {
      setFeedbackNotice({
        type: 'error',
        message: err.message || (lang === 'km' ? 'មិនអាចបញ្ចប់ផែនការបានទេ។' : 'Failed to complete plan.')
      });
      setTimeout(() => setFeedbackNotice(null), 4000);
    }
  };

  const handleDuplicate = (planId: string) => {
    try {
      const duplicated = db.duplicatePlan(planId);
      refreshPlans();
      setFeedbackNotice({
        type: 'success',
        message: lang === 'km' 
          ? `បានចម្លងផែនការ ${duplicated.planNumber} ដោយជោគជ័យ។` 
          : `Duplicated plan ${duplicated.planNumber} successfully.`
      });
      setTimeout(() => setFeedbackNotice(null), 4000);
    } catch (err: any) {
      setFeedbackNotice({
        type: 'error',
        message: err.message || (lang === 'km' ? 'បរាជ័យក្នុងការចម្លងផែនការ។' : 'Failed to duplicate plan.')
      });
      setTimeout(() => setFeedbackNotice(null), 5000);
    }
  };

  const handleDelete = (plan: ActionPlan, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPlanToDelete(plan);
    setDeleteError(null);
  };

  const handleConfirmDelete = () => {
    if (!planToDelete) return;
    try {
      db.deletePlan(planToDelete.id);
      refreshPlans();
      if (inspectingPlan?.id === planToDelete.id) {
        setInspectingPlan(null);
      }
      const target = planToDelete;
      setPlanToDelete(null);
      setFeedbackNotice({
        type: 'success',
        message: lang === 'km'
          ? `បានទុកផែនការ ${target.planNumber} («${target.title}») ក្នុងបណ្ណសារដោយជោគជ័យ។`
          : `Action plan ${target.planNumber} ("${target.title}") has been archived successfully.`
      });
      setTimeout(() => setFeedbackNotice(null), 4000);
    } catch (err: any) {
      setDeleteError(err.message || (lang === 'km' ? 'បរាជ័យក្នុងការលុប/រក្សាទុកក្នុងបណ្ណសារនូវផែនការ។' : 'Failed to archive action plan.'));
    }
  };

  // Count of plans owned/created by the current user
  const myOwnedPlansCount = useMemo(() => {
    return plans.filter(p => p.ownerId === currentUser.id || p.createdById === currentUser.id).length;
  }, [plans, currentUser.id]);

  // Filter & Sort
  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      if (filterOwnership === 'my-owned' && !(p.ownerId === currentUser.id || p.createdById === currentUser.id)) {
        return false;
      }
      if (filterDept !== 'all' && p.departmentId !== filterDept) return false;
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (filterPriority !== 'all' && p.priority !== filterPriority) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(query);
        const matchNum = p.planNumber.toLowerCase().includes(query);
        const matchDesc = p.description.toLowerCase().includes(query);
        if (!matchTitle && !matchNum && !matchDesc) return false;
      }
      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortField === 'dueDate') {
        comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else if (sortField === 'completionPercentage') {
        comparison = a.completionPercentage - b.completionPercentage;
      } else if (sortField === 'priority') {
        const priorityOrder: Record<PriorityLevel, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
        comparison = priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return sortAsc ? comparison : -comparison;
    });
  }, [plans, filterOwnership, currentUser, filterDept, filterStatus, filterPriority, search, sortField, sortAsc]);

  // Paginated
  const paginatedPlans = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPlans.slice(start, start + pageSize);
  }, [filteredPlans, currentPage]);

  const totalPages = Math.ceil(filteredPlans.length / pageSize) || 1;

  const priorityBadgeColors: Record<PriorityLevel, string> = {
    Low: 'bg-slate-100 text-slate-700 border-slate-200',
    Medium: 'bg-blue-50 text-blue-700 border-blue-200',
    High: 'bg-amber-50 text-amber-800 border-amber-200',
    Critical: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
  };

  const statusBadgeColors: Record<PlanStatus, string> = {
    'Draft': 'bg-slate-100 text-slate-700',
    'Submitted': 'bg-amber-100 text-amber-800',
    'In Review': 'bg-amber-100 text-amber-800',
    'Approved': 'bg-blue-100 text-blue-800',
    'In Progress': 'bg-indigo-100 text-indigo-800',
    'Submitted for Completion': 'bg-purple-100 text-purple-800',
    'Completed': 'bg-emerald-100 text-emerald-800',
    'Rejected': 'bg-rose-100 text-rose-800',
    'On Hold': 'bg-slate-200 text-slate-800',
  };

  return (
    <div className="space-y-2.5 sm:space-y-3.5 max-w-7xl mx-auto">
      {/* Header and Controls */}
      <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {t.actionPlans}
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {lang === 'km'
              ? 'គ្រប់គ្រងផែនការសកម្មភាពតាមនាយកដ្ឋាន ការសម្រេចតាមដំណាក់កាល និងលំហូរការងារអនុម័តពហុកម្រិត។'
              : 'Manage departmental action plans, milestone delivery, and multi-tier approval states.'}
          </p>
        </div>

        <div className="flex items-center space-x-1.5 self-start md:self-auto shrink-0">
          {onOpenVoiceAssistant && (
            <button
              onClick={onOpenVoiceAssistant}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold shadow-2xs transition"
              title="Voice-Activated Plan Commands (Create, Update, Delete)"
            >
              <Mic className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
              <span>{lang === 'km' ? 'បញ្ជាសំឡេង' : 'Voice AI'}</span>
            </button>
          )}

          {db.canCreatePlan(currentUser) && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? 'បង្កើតផែនការថ្មី' : 'Create Plan'}</span>
            </button>
          )}
        </div>
      </div>

      {/* View Switcher: Cards vs WBS Plan & Task Treeview vs Hierarchy Treeview Plan */}
      <div className="flex flex-wrap items-center justify-between bg-white p-1.5 sm:p-2 rounded-xl border border-slate-200 shadow-2xs gap-1.5">
        <div className="flex flex-wrap items-center space-x-1.5">
          <button
            onClick={() => setViewLayout('cards')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              viewLayout === 'cards'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'បញ្ជីផែនការ (Cards)' : 'Plans Directory (Cards)'}</span>
          </button>

          <button
            onClick={() => setViewLayout('wbs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              viewLayout === 'wbs'
                ? 'bg-purple-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ListTree className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'មែកធាងឋានានុក្រមគម្រោង និងកិច្ចការ (Tree Table)' : 'Hierarchical Tree Table'}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              viewLayout === 'wbs' ? 'bg-amber-300 text-amber-950' : 'bg-purple-100 text-purple-800'
            }`}>
              Tree Grid
            </span>
          </button>

          <button
            onClick={() => setViewLayout('treeview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              viewLayout === 'treeview'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'មែកធាងឋានានុក្រមបុគ្គលិក' : 'Employee Org Tree'}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              viewLayout === 'treeview' ? 'bg-amber-400 text-amber-950' : 'bg-amber-100 text-amber-800'
            }`}>
              L1 - L4
            </span>
          </button>
        </div>
        {viewLayout === 'cards' && (
          <div className="text-[11px] text-slate-500 font-medium hidden sm:block pr-2">
            {filteredPlans.length} {lang === 'km' ? 'ផែនការសកម្មភាព' : 'Action Plans'}
          </div>
        )}
      </div>

      {viewLayout === 'wbs' ? (
        <WorkBreakdownStructureView
          currentUser={currentUser}
          lang={lang}
          selectedPlanId={selectedPlanId || filteredPlans[0]?.id}
          onNavigatePlan={(planId) => {
            const plan = db.getPlanById(planId);
            if (plan) handleInspectPlan(plan);
          }}
        />
      ) : viewLayout === 'treeview' ? (
        <OrganizationalTreeview
          currentUser={currentUser}
          lang={lang}
          onNavigatePlan={(planId) => {
            const plan = db.getPlanById(planId);
            if (plan) handleInspectPlan(plan);
          }}
        />
      ) : (
        <>
      {/* Feedback Banner */}
      {feedbackNotice && (
        <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-xs transition-all ${
          feedbackNotice.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <div className="flex items-center space-x-2">
            {feedbackNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackNotice.message}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setFeedbackNotice(null)}
            className="text-slate-400 hover:text-slate-600 text-xs px-1.5 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar - Compact */}
      <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[220px]">
          <div className="relative w-full max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder={lang === 'km' ? 'ស្វែងរកលេខកូដ, ចំណងជើង...' : 'Search plan number, title...'}
              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Ownership Toggle (All vs My Owned) */}
          {currentUser.role === 'Employee' ? (
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-semibold shadow-2xs">
              <UserCheck className="w-3.5 h-3.5 text-cyan-600" />
              <span>{lang === 'km' ? 'ផែនការផ្ទាល់ខ្លួន' : 'My Owned Plans Only'}</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-cyan-200 text-cyan-900 text-[10px] font-bold">
                {plans.length}
              </span>
            </div>
          ) : (
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
              <button
                onClick={() => { setFilterOwnership('all'); setCurrentPage(1); }}
                className={`px-2 py-0.5 rounded-md font-semibold transition ${
                  filterOwnership === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lang === 'km' ? 'ទាំងអស់' : 'All'} ({plans.length})
              </button>
              <button
                onClick={() => { setFilterOwnership('my-owned'); setCurrentPage(1); }}
                className={`px-2 py-0.5 rounded-md font-semibold transition flex items-center space-x-1 ${
                  filterOwnership === 'my-owned'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3 h-3" />
                <span>{lang === 'km' ? 'ផ្ទាល់ខ្លួន' : 'My Owned'}</span>
                <span className={`ml-1 px-1 py-0.2 rounded-full text-[10px] ${
                  filterOwnership === 'my-owned' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {myOwnedPlansCount}
                </span>
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {/* Department Filter */}
          <select
            value={filterDept}
            onChange={e => { setFilterDept(e.target.value); setCurrentPage(1); }}
            className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-hidden text-xs"
          >
            <option value="all">{lang === 'km' ? 'គ្រប់នាយកដ្ឋាន' : 'All Departments'}</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-hidden text-xs"
          >
            <option value="all">{lang === 'km' ? 'គ្រប់ស្ថានភាព' : 'All Statuses'}</option>
            <option value="Draft">{t.draft}</option>
            <option value="Submitted">{t.submitted}</option>
            <option value="Approved">{t.approved}</option>
            <option value="In Progress">{t.inProgress}</option>
            <option value="Completed">{t.completed}</option>
            <option value="Rejected">{t.rejected}</option>
          </select>

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={e => { setFilterPriority(e.target.value); setCurrentPage(1); }}
            className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-hidden text-xs"
          >
            <option value="all">{lang === 'km' ? 'គ្រប់អាទិភាព' : 'All Priorities'}</option>
            <option value="Low">{t.low}</option>
            <option value="Medium">{t.medium}</option>
            <option value="High">{t.high}</option>
            <option value="Critical">{t.critical}</option>
          </select>

          {/* Sort Control */}
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 flex items-center space-x-1 hover:bg-slate-50 text-xs"
            title={lang === 'km' ? 'ប្តូរទិសដៅតម្រៀប' : 'Toggle sort direction'}
          >
            <ArrowUpDown className="w-3 h-3" />
            <span>
              {sortField === 'dueDate' ? (lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Due') : sortField === 'completionPercentage' ? (lang === 'km' ? 'វឌ្ឍនភាព' : 'Progress') : (lang === 'km' ? 'អាទិភាព' : 'Priority')} ({sortAsc ? '↑' : '↓'})
            </span>
          </button>
        </div>
      </div>

      {/* Owned Responsibilities & Collaboration Guidance Banner - Compact */}
      {filterOwnership === 'my-owned' && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white p-3 sm:p-3.5 rounded-xl shadow-2xs border border-blue-800/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5">
          <div className="space-y-1 max-w-2xl min-w-0">
            <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-semibold border border-blue-400/30">
              <UserCheck className="w-3 h-3" />
              <span>{lang === 'km' ? 'ការគ្រប់គ្រងផែនការផ្ទាល់ខ្លួន' : 'Owned Action Plans & Responsibilities'}</span>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-white leading-tight">
              {lang === 'km' ? 'ការគ្រប់គ្រងសម្រួលការងារ វឌ្ឍនភាព និងការតម្រឹមគោលដៅស្ថាប័ន' : 'Direct Access, Priority Management & Team Collaboration'}
            </h3>
            <p className="text-[11px] text-slate-300 leading-snug line-clamp-2">
              {lang === 'km'
                ? 'បុគ្គលិកអាចចូលមើលផែនការសកម្មភាព និងកិច្ចការដែលខ្លួនគ្រប់គ្រងដោយផ្ទាល់យ៉ាងងាយស្រួល តាមដានវឌ្ឍនភាព និងចែករំលែកជាមួយអ្នកគ្រប់គ្រងដើម្បីទទួលបានមតិកែលម្អ។'
                : 'Directly track, manage and share your owned action plans with team leaders and supervisors for instant feedback and periodic goal alignment.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {myOwnedPlansCount > 0 && (
              <button
                onClick={() => {
                  const firstOwned = plans.find(p => p.ownerId === currentUser.id || p.createdById === currentUser.id);
                  if (firstOwned) setCollaborationPlan(firstOwned);
                }}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition active:scale-95"
              >
                <UsersIcon className="w-3 h-3 text-blue-300" />
                <span>{lang === 'km' ? 'ចែករំលែក' : 'Collaborate'}</span>
              </button>
            )}
            {myOwnedPlansCount > 0 && (
              <button
                onClick={() => {
                  const firstOwned = plans.find(p => p.ownerId === currentUser.id || p.createdById === currentUser.id);
                  if (firstOwned) setGoalReviewPlan(firstOwned);
                }}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-2xs active:scale-95"
              >
                <Target className="w-3 h-3 text-white" />
                <span>{lang === 'km' ? 'ត្រួតពិនិត្យ' : 'Goal Review'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Plans Container: Mobile Native Cards + Desktop Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* MOBILE CARD LIST (Hidden on tablet/desktop, Clean App Card List on Mobile) */}
        <div className="block sm:hidden divide-y divide-slate-100">
          {paginatedPlans.length === 0 ? (
            <div className="p-6 text-center text-slate-400">
              <Layers className="w-8 h-8 mx-auto mb-1.5 text-slate-300" />
              <p className="text-xs font-bold text-slate-700">No action plans found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting filters or create a new plan.</p>
            </div>
          ) : (
            paginatedPlans.map(plan => {
              const dept = departments.find(d => d.id === plan.departmentId);
              const owner = users.find(u => u.id === plan.ownerId);
              const isOverdue = plan.dueDate < new Date().toISOString().split('T')[0] && plan.status !== 'Completed';
              const canEdit = db.canEditPlan(currentUser, plan);
              const canDelete = db.canDeletePlan(currentUser, plan);

              return (
                <div key={plan.id} className="p-3 space-y-2 hover:bg-slate-50/60 transition">
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0 pr-1">
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded text-[10px] border border-blue-200">
                          {plan.planNumber}
                        </span>
                        {(plan.ownerId === currentUser.id || plan.createdById === currentUser.id) && (
                          <span className="inline-flex items-center space-x-0.5 px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <UserCheck className="w-2.5 h-2.5" />
                            <span>Owner</span>
                          </span>
                        )}
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${statusBadgeColors[plan.status]}`}>
                          {plan.status}
                        </span>
                      </div>
                      <h4 
                        onClick={() => handleInspectPlan(plan)}
                        className="font-bold text-xs text-slate-900 mt-1 hover:text-blue-600 cursor-pointer line-clamp-2"
                      >
                        {plan.title}
                      </h4>
                    </div>

                    <span className={`px-1.5 py-0.5 rounded text-[10px] border shrink-0 ${priorityBadgeColors[plan.priority]}`}>
                      {plan.priority}
                    </span>
                  </div>

                  {/* Progress Bar & Stats */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Progress</span>
                      <span className="font-bold font-mono text-slate-900">{plan.completionPercentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          plan.completionPercentage === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${plan.completionPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Meta strip */}
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                    <span className="truncate max-w-[140px]">{dept?.name} • {owner?.name}</span>
                    <span className={isOverdue ? 'text-rose-600 font-bold' : ''}>
                      {isOverdue ? 'Overdue: ' : 'Due: '}{plan.dueDate}
                    </span>
                  </div>

                  {/* Mobile Action Buttons Strip */}
                  <div className="flex items-center justify-between pt-1 gap-1">
                    <div className="flex items-center space-x-1">
                      {canEdit && plan.status !== 'Completed' && (
                        <button
                          type="button"
                          onClick={() => handleQuickCompletePlan(plan.id)}
                          className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200"
                        >
                          ✓ 100%
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setProgressPlan(plan)}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[10px]"
                      >
                        Progress
                      </button>
                      <button
                        type="button"
                        onClick={() => setCollaborationPlan(plan)}
                        className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px]"
                      >
                        Collab
                      </button>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => handleInspectPlan(plan)}
                        className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px]"
                      >
                        Details
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(plan)}
                          className="p-1 rounded-md text-slate-400 hover:text-blue-600"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(plan, e);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP TABLE VIEW (Hidden on mobile, pristine and clean on sm and up) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-3.5">{lang === 'km' ? 'លេខកូដ និងចំណងជើងផែនការ' : 'Plan No. & Title'}</th>
                <th className="py-2.5 px-3.5">{lang === 'km' ? 'នាយកដ្ឋាន និងអ្នកទទួលខុសត្រូវ' : 'Department & Owner'}</th>
                <th className="py-2.5 px-3.5">{lang === 'km' ? 'បន្ទាត់ពេលវេលា' : 'Timeline'}</th>
                <th className="py-2.5 px-3.5">{lang === 'km' ? 'អាទិភាព' : 'Priority'}</th>
                <th className="py-2.5 px-3.5">{lang === 'km' ? 'វឌ្ឍនភាព' : 'Progress'}</th>
                <th className="py-2.5 px-3.5">{lang === 'km' ? 'ស្ថានភាព និងការអនុម័ត' : 'Status & Approval'}</th>
                <th className="py-2.5 px-3.5 text-right">{lang === 'km' ? 'សកម្មភាព' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedPlans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <div className="max-w-md mx-auto space-y-1.5">
                      <p className="font-semibold text-slate-700 text-sm">
                        {currentUser.role === 'Employee' 
                          ? (lang === 'km' ? 'មិនមានផែនការដែលជាកម្មសិទ្ធិផ្ទាល់ខ្លួនទេ' : 'No Owned Action Plans Found')
                          : (lang === 'km' ? 'មិនមានផែនការសកម្មភាពត្រូវនឹងតម្រងដែលបានជ្រើសរើសទេ។' : 'No action plans match the current filters.')}
                      </p>
                      <p className="text-xs text-slate-500">
                        {currentUser.role === 'Employee'
                          ? (lang === 'km' 
                              ? 'ក្នុងនាមជាបុគ្គលិក អ្នកត្រូវបានអនុញ្ញាតឱ្យមើលតែផែនការដែលអ្នកជាម្ចាស់ (Owner) ឬបានបង្កើតប៉ុណ្ណោះ។'
                              : 'As an Employee, you can view owned plans only. You can create a new action plan to get started.')
                          : (lang === 'km' ? 'សូមព្យាយាមផ្លាស់ប្តូរតម្រង ឬស្វែងរកឡើងវិញ។' : 'Try adjusting your search criteria or resetting filters.')}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPlans.map(plan => {
                  const dept = departments.find(d => d.id === plan.departmentId);
                  const owner = users.find(u => u.id === plan.ownerId);
                  const isOverdue = plan.dueDate < new Date().toISOString().split('T')[0] && plan.status !== 'Completed';
                  const canEdit = db.canEditPlan(currentUser, plan);
                  const canDelete = db.canDeletePlan(currentUser, plan);

                  return (
                    <tr key={plan.id} className="hover:bg-slate-50/80 transition">
                      {/* Plan No & Title */}
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 text-[11px]">
                            {plan.planNumber}
                          </span>
                          {(plan.ownerId === currentUser.id || plan.createdById === currentUser.id) && (
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                              <UserCheck className="w-3 h-3" />
                              <span>{lang === 'km' ? 'ផែនការផ្ទាល់ខ្លួន' : 'My Plan'}</span>
                            </span>
                          )}
                          <span 
                            onClick={() => handleInspectPlan(plan)}
                            className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer line-clamp-1"
                          >
                            {plan.title}
                          </span>
                        </div>
                        {plan.kpi && (
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            KPI: <span className="text-slate-700 font-medium">{plan.kpi} ({plan.kpiActual}/{plan.kpiTarget} {plan.kpiUnit})</span>
                          </div>
                        )}
                        {plan.alignmentStatus && (
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span className={`inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                              plan.alignmentStatus === 'Fully Aligned' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              plan.alignmentStatus === 'Review Needed' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              <Target className="w-2.5 h-2.5" />
                              <span>{plan.alignmentStatus}</span>
                            </span>
                            {plan.nextReviewDate && (
                              <span className="text-[10px] text-slate-400">
                                {lang === 'km' ? 'ត្រួតពិនិត្យបន្ទាប់៖' : 'Next review:'} {plan.nextReviewDate}
                              </span>
                            )}
                          </div>
                        )}
                        {plan.collaborationReviews && plan.collaborationReviews.length > 0 && (
                          <div className="mt-0.5">
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <UsersIcon className="w-2.5 h-2.5" />
                              <span>{plan.collaborationReviews.length} {lang === 'km' ? 'សំណើសហការ/មតិ' : 'reviews/notes'}</span>
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Department & Owner */}
                      <td className="py-2.5 px-3.5">
                        <div className="font-medium text-slate-800">{dept?.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                          <UserIcon className="w-3 h-3 text-slate-400" />
                          <span>
                            {owner?.name} {plan.ownerId === currentUser.id ? (lang === 'km' ? '(អ្នក)' : '(You)') : ''}
                          </span>
                        </div>
                      </td>

                      {/* Timeline */}
                      <td className="py-2.5 px-3.5">
                        <div className="text-slate-700 font-medium">{plan.dueDate}</div>
                        <div className={`text-[10px] mt-0.5 ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                          {isOverdue ? (lang === 'km' ? 'ហួសកាលកំណត់' : 'Overdue') : `${lang === 'km' ? 'ចាប់ផ្តើម៖' : 'Start:'} ${plan.startDate}`}
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-2.5 px-3.5">
                        <span className={`px-2 py-0.5 rounded text-[11px] border ${priorityBadgeColors[plan.priority]}`}>
                          {plan.priority === 'Critical' ? t.critical : plan.priority === 'High' ? t.high : plan.priority === 'Medium' ? t.medium : t.low}
                        </span>
                      </td>

                      {/* Progress Bar */}
                      <td className="py-2.5 px-3.5 min-w-[120px]">
                        <div className="flex items-center justify-between text-[11px] mb-0.5">
                          <span className="font-mono font-bold text-slate-800">{plan.completionPercentage}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              plan.completionPercentage === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${plan.completionPercentage}%` }}
                          ></div>
                        </div>
                      </td>

                      {/* Status & Approval */}
                      <td className="py-2.5 px-3.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${statusBadgeColors[plan.status]}`}>
                          {plan.status === 'Draft' ? t.draft : plan.status === 'Submitted' ? t.submitted : plan.status === 'Approved' ? t.approved : plan.status === 'In Progress' ? t.inProgress : plan.status === 'Completed' ? t.completed : plan.status === 'Rejected' ? t.rejected : plan.status}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {lang === 'km' ? 'ការអនុម័ត៖' : 'Approval:'} <span className="font-medium text-slate-700">{plan.approvalStatus}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {/* Collaborate / Share with Supervisor or Team */}
                          <button
                            onClick={() => setCollaborationPlan(plan)}
                            className="p-1 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                            title={lang === 'km' ? 'ចែករំលែក & ស្នើសុំមតិសហការ' : 'Share & Request Feedback / Support'}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* Goal Alignment & Periodic Review */}
                          <button
                            onClick={() => setGoalReviewPlan(plan)}
                            className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                            title={lang === 'km' ? 'ត្រួតពិនិត្យការតម្រឹមគោលដៅ និងកាលបរិច្ឆេទ' : 'Goal Alignment & Review Checkpoint'}
                          >
                            <Target className="w-3.5 h-3.5" />
                          </button>

                          {/* Inspect Details */}
                          <button
                            onClick={() => handleInspectPlan(plan)}
                            className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                            title={lang === 'km' ? 'មើលលម្អិត' : 'View Details'}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Complete 1-Click */}
                          {canEdit && plan.status !== 'Completed' && (
                            <button
                              onClick={() => handleQuickCompletePlan(plan.id)}
                              className="p-1 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              title={lang === 'km' ? 'បញ្ចប់ ១០០% ភ្លាមៗ (១ ចុច)' : '1-Click Complete (100%)'}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                          )}

                          {/* Update Progress */}
                          <button
                            onClick={() => setProgressPlan(plan)}
                            className="p-1 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-slate-100"
                            title={lang === 'km' ? 'កត់ត្រាវឌ្ឍនភាព' : 'Update Progress'}
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                          </button>

                          {/* Approval Modal */}
                          <button
                            onClick={() => setApprovalPlan(plan)}
                            className="p-1 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-slate-100"
                            title={lang === 'km' ? 'ដំណើរការអនុម័ត' : 'Workflow Approval'}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>

                          {/* Duplicate */}
                          <button
                            onClick={() => handleDuplicate(plan.id)}
                            className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                            title={lang === 'km' ? 'ចម្លងផែនការ' : 'Duplicate Plan'}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          {canEdit && (
                            <button
                              onClick={() => handleOpenEdit(plan)}
                              className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                              title={lang === 'km' ? 'កែប្រែផែនការ' : 'Edit Plan'}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete */}
                          {canDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(plan, e);
                              }}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition cursor-pointer"
                              title={lang === 'km' ? 'ទុកក្នុងបណ្ណសារ / លុប' : 'Archive Plan'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div>
            {lang === 'km' ? 'បង្ហាញ' : 'Showing'} <span className="font-semibold text-slate-700">{paginatedPlans.length}</span> {lang === 'km' ? 'នៃ' : 'of'}{' '}
            <span className="font-semibold text-slate-700">{filteredPlans.length}</span> {lang === 'km' ? 'ផែនការសកម្មភាព' : 'action plans'}
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-white"
            >
              {lang === 'km' ? 'ទំព័រមុន' : 'Prev'}
            </button>
            <span className="px-2 font-medium text-slate-700">
              {lang === 'km' ? `ទំព័រ ${currentPage} នៃ ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-white"
            >
              {lang === 'km' ? 'ទំព័របន្ទាប់' : 'Next'}
            </button>
          </div>
        </div>
      </div>
      </>
      )}

      {/* CREATE / EDIT PLAN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <h3 className="text-base font-bold text-slate-900">
                {editingPlan 
                  ? (lang === 'km' ? 'កែប្រែផែនការសកម្មភាព' : 'Edit Action Plan') 
                  : (lang === 'km' ? 'បង្កើតផែនការសកម្មភាពថ្មី' : 'Create New Action Plan')}
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form id="action-plan-form" onSubmit={handleSavePlan} className="p-6 overflow-y-auto space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'km' ? 'ចំណងជើងផែនការ *' : 'Plan Title *'}
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder={lang === 'km' ? 'ឧ. ការធ្វើចំណាកស្រុកប្រព័ន្ធទិន្នន័យ MySQL 8' : 'e.g. Core Database Migration to MySQL 8'}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'km' ? 'ការពិពណ៌នា' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder={lang === 'km' ? 'វិសាលភាព គោលបំណង និងតម្រូវការអនុវត្ត...' : 'Scope, objectives, and implementation requirements...'}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Department */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'km' ? 'នាយកដ្ឋាន *' : 'Department *'}
                  </label>
                  <select
                    value={formDeptId}
                    onChange={e => setFormDeptId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>

                {/* Linked Objective */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'km' ? 'គោលបំណងយុទ្ធសាស្ត្រភ្ជាប់' : 'Linked Strategic Objective'}
                  </label>
                  <select
                    value={formObjectiveId}
                    onChange={e => setFormObjectiveId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="">{lang === 'km' ? 'គ្មាន (ផែនការឯករាជ្យ)' : 'None (Stand-alone Plan)'}</option>
                    {objectives.map(o => (
                      <option key={o.id} value={o.id}>{o.code}: {o.title}</option>
                    ))}
                  </select>
                </div>

                {/* Plan Owner */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'km' ? 'អ្នកទទួលខុសត្រូវ *' : 'Plan Owner *'}
                  </label>
                  <select
                    value={formOwnerId}
                    onChange={e => setFormOwnerId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role}) {u.id === currentUser.id ? (lang === 'km' ? '(អ្នក)' : '(You)') : ''}
                      </option>
                    ))}
                  </select>
                  {currentUser.role === 'Employee' && (
                    <p className="text-[11px] text-emerald-600 mt-1 flex items-center space-x-1">
                      <UserCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {lang === 'km'
                          ? 'ក្នុងនាមជាបុគ្គលិក អ្នកមានសិទ្ធិពេញលេញក្នុងការកែប្រែ និងលុប/ទុកក្នុងបណ្ណសារនូវផែនការដែលអ្នកជាម្ចាស់។'
                          : 'As an employee, you have full ownership permissions to edit and delete/archive your owned plans.'}
                      </span>
                    </p>
                  )}
                </div>

                {/* Priority */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'km' ? 'កម្រិតអាទិភាព *' : 'Priority Level *'}
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

                {/* Start Date */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'km' ? 'កាលបរិច្ឆេទចាប់ផ្តើម *' : 'Start Date *'}
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
                    {lang === 'km' ? 'កាលបរិច្ឆេទបញ្ចប់ *' : 'Due Date *'}
                  </label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={e => setFormDueDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    required
                  />
                </div>

                {/* KPI Name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'km' ? 'សូចនាករ KPI' : 'KPI Metric'}
                  </label>
                  <input
                    type="text"
                    value={formKpi}
                    onChange={e => setFormKpi(e.target.value)}
                    placeholder={lang === 'km' ? 'ឧ. ភាពអាចរកបាននៃប្រព័ន្ធ / ការគ្របដណ្តប់តេស្ត' : 'e.g. System Availability / Test coverage'}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* KPI Target & Unit */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {lang === 'km' ? 'គោលដៅ KPI' : 'KPI Target'}
                    </label>
                    <input
                      type="number"
                      value={formKpiTarget}
                      onChange={e => setFormKpiTarget(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {lang === 'km' ? 'ខ្នាត' : 'Unit'}
                    </label>
                    <input
                      type="text"
                      value={formKpiUnit}
                      onChange={e => setFormKpiUnit(e.target.value)}
                      placeholder="%, Items, Days"
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Budget */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'km' ? 'ថវិកា (ដុល្លារ USD)' : 'Budget (USD)'}
                  </label>
                  <input
                    type="number"
                    value={formBudget}
                    onChange={e => setFormBudget(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* Expected Result */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'km' ? 'លទ្ធផលរំពឹងទុក' : 'Expected Result'}
                  </label>
                  <input
                    type="text"
                    value={formExpectedResult}
                    onChange={e => setFormExpectedResult(e.target.value)}
                    placeholder={lang === 'km' ? 'ឧ. ល្បឿនឆ្លើយតបក្រោម ៤០ms ក្នុងអំឡុងពេលប្រើប្រាស់ខ្ពស់' : 'e.g. Sub-40ms response latency under peak load'}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-2 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button
                form="action-plan-form"
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
              >
                {editingPlan 
                  ? (lang === 'km' ? 'រក្សាទុកការកែប្រែ' : 'Save Changes') 
                  : (lang === 'km' ? 'បង្កើតផែនការ' : 'Create Plan')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAN DETAIL DRAWER / INSPECTOR */}
      {inspectingPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div className="flex items-center space-x-3">
                <span className="font-mono text-sm font-bold bg-blue-600 text-white px-2.5 py-1 rounded-lg">
                  {inspectingPlan.planNumber}
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {inspectingPlan.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === 'km' ? 'បានបង្កើតនៅ' : 'Created on'} {new Date(inspectingPlan.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingPlan(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Top Overview Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[11px]">{lang === 'km' ? 'ស្ថានភាពវដ្តជីវិត' : 'Lifecycle Status'}</span>
                  <span className={`inline-block mt-0.5 px-2 py-0.5 rounded font-bold ${statusBadgeColors[inspectingPlan.status]}`}>
                    {inspectingPlan.status === 'Draft' ? t.draft : inspectingPlan.status === 'Submitted' ? t.submitted : inspectingPlan.status === 'Approved' ? t.approved : inspectingPlan.status === 'In Progress' ? t.inProgress : inspectingPlan.status === 'Completed' ? t.completed : inspectingPlan.status === 'Rejected' ? t.rejected : inspectingPlan.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">{lang === 'km' ? 'ស្ថានភាពអនុម័ត' : 'Approval State'}</span>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800">
                    {inspectingPlan.approvalStatus}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">{lang === 'km' ? 'អាទិភាព' : 'Priority'}</span>
                  <span className={`inline-block mt-0.5 px-2 py-0.5 rounded ${priorityBadgeColors[inspectingPlan.priority]}`}>
                    {inspectingPlan.priority === 'Critical' ? t.critical : inspectingPlan.priority === 'High' ? t.high : inspectingPlan.priority === 'Medium' ? t.medium : t.low}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">{lang === 'km' ? 'ការសម្រេច' : 'Completion'}</span>
                  <span className="font-mono text-base font-bold text-blue-700">
                    {inspectingPlan.completionPercentage}%
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-bold text-slate-800 mb-1">{lang === 'km' ? 'វិសាលភាព និងការពិពណ៌នា' : 'Scope & Description'}</h4>
                <p className="text-slate-600 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                  {inspectingPlan.description || (lang === 'km' ? 'មិនមានការពិពណ៌នាវិសាលភាពលម្អិតទេ។' : 'No detailed scope description provided.')}
                </p>
              </div>

              {/* Department, Strategic Objective & Owner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[11px] block">{lang === 'km' ? 'នាយកដ្ឋាន' : 'Department'}</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    {departments.find(d => d.id === inspectingPlan.departmentId)?.name}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[11px] block">{lang === 'km' ? 'គោលបំណងយុទ្ធសាស្ត្រ' : 'Strategic Objective'}</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    {objectives.find(o => o.id === inspectingPlan.objectiveId)?.title || (lang === 'km' ? 'ផែនការឯករាជ្យ' : 'Independent Plan')}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[11px] block">{lang === 'km' ? 'អ្នកទទួលខុសត្រូវ' : 'Plan Owner'}</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    {users.find(u => u.id === inspectingPlan.ownerId)?.name}
                  </span>
                </div>
              </div>

              {/* KPI, Budget, Results */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[11px] block">{lang === 'km' ? 'ថវិកាបានបែងចែក' : 'Budget Allocated'}</span>
                  <span className="font-mono text-sm font-bold text-emerald-600 mt-0.5 block">
                    ${inspectingPlan.budget.toLocaleString()} USD
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[11px] block">{lang === 'km' ? 'សូចនាករ KPI និងគោលដៅ' : 'KPI Metric & Target'}</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    {inspectingPlan.kpi || 'N/A'}: {inspectingPlan.kpiActual}/{inspectingPlan.kpiTarget} {inspectingPlan.kpiUnit}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[11px] block">{lang === 'km' ? 'លទ្ធផលសម្រេចរំពឹងទុក' : 'Expected Delivery Outcome'}</span>
                  <span className="text-slate-700 mt-0.5 block">
                    {inspectingPlan.expectedResult || (lang === 'km' ? 'មិនទាន់បញ្ជាក់' : 'Not specified')}
                  </span>
                </div>
              </div>

              {/* Activities Breakdown */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-800 flex items-center space-x-1.5">
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                    <span>
                      {lang === 'km'
                        ? `សកម្មភាពនៅក្នុងផែនការនេះ (${db.getActivities(inspectingPlan.id).length})`
                        : `Activities in this Plan (${db.getActivities(inspectingPlan.id).length})`}
                    </span>
                  </h4>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[11px] text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">{lang === 'km' ? 'លេខកូដ' : 'Code'}</th>
                        <th className="py-2 px-3">{lang === 'km' ? 'សកម្មភាព' : 'Activity'}</th>
                        <th className="py-2 px-3">{lang === 'km' ? 'បុគ្គលិកទទួលបន្ទុក' : 'Assigned Staff'}</th>
                        <th className="py-2 px-3">{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Due Date'}</th>
                        <th className="py-2 px-3">{lang === 'km' ? 'វឌ្ឍនភាព' : 'Progress'}</th>
                        <th className="py-2 px-3">{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {db.getActivities(inspectingPlan.id).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-3 text-center text-slate-400">
                            {lang === 'km' ? 'មិនទាន់មានសកម្មភាពកំណត់សម្រាប់ផែនការនេះនៅឡើយទេ។' : 'No activities defined yet for this plan.'}
                          </td>
                        </tr>
                      ) : (
                        db.getActivities(inspectingPlan.id).map(act => (
                          <tr key={act.id}>
                            <td className="py-2 px-3 font-mono font-bold text-slate-700">{act.code}</td>
                            <td className="py-2 px-3 font-medium text-slate-900">{act.title}</td>
                            <td className="py-2 px-3 text-slate-600">{users.find(u => u.id === act.assignedEmployeeId)?.name}</td>
                            <td className="py-2 px-3 text-slate-600">{act.dueDate}</td>
                            <td className="py-2 px-3 font-mono font-semibold text-blue-700">{act.progressPercentage}%</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                act.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {act.status === 'Completed' ? t.completed : act.status === 'In Progress' ? t.inProgress : act.status === 'Not Started' ? t.notStarted : act.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Attachments Section */}
              {inspectingPlan.attachments && inspectingPlan.attachments.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-800 mb-2 flex items-center space-x-1.5">
                    <Paperclip className="w-4 h-4 text-slate-500" />
                    <span>
                      {lang === 'km'
                        ? `ឯកសារភ្ជាប់ (${inspectingPlan.attachments.length})`
                        : `Attachments (${inspectingPlan.attachments.length})`}
                    </span>
                  </h4>
                  <div className="space-y-1.5">
                    {inspectingPlan.attachments.map(att => (
                      <div key={att.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-slate-800">{att.fileName}</span>
                          <span className="text-[10px] text-slate-400">({att.fileSize})</span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {lang === 'km' ? 'បានផ្ទុកឡើងនៅ' : 'Uploaded'} {new Date(att.uploadedAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2 rounded-b-2xl">
              <div className="flex flex-wrap items-center gap-2">
                {inspectingPlan.status !== 'Completed' && (
                  <button
                    onClick={() => handleQuickCompletePlan(inspectingPlan.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center space-x-1"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>{lang === 'km' ? 'បញ្ចប់ ១០០% ភ្លាមៗ' : '1-Click Complete (100%)'}</span>
                  </button>
                )}
                {/* Collaborate & Feedback Button */}
                <button
                  onClick={() => {
                    const p = inspectingPlan;
                    setCollaborationPlan(p);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition flex items-center space-x-1"
                >
                  <UsersIcon className="w-3.5 h-3.5" />
                  <span>{lang === 'km' ? 'កិច្ចសហការ & មតិកែលម្អ' : 'Collaborate / Feedback'}</span>
                </button>
                {/* Periodic Review & Alignment Button */}
                <button
                  onClick={() => {
                    const p = inspectingPlan;
                    setGoalReviewPlan(p);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition flex items-center space-x-1"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>{lang === 'km' ? 'ត្រួតពិនិត្យគោលដៅទៀងទាត់' : 'Periodic Goal Review'}</span>
                </button>
                <button
                  onClick={() => {
                    setProgressPlan(inspectingPlan);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-semibold text-xs transition"
                >
                  {lang === 'km' ? 'កត់ត្រាវឌ្ឍនភាព' : 'Update Progress'}
                </button>
                <button
                  onClick={() => {
                    setApprovalPlan(inspectingPlan);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition"
                >
                  {lang === 'km' ? 'ដំណើរការអនុម័ត' : 'Approval Actions'}
                </button>
                {db.canEditPlan(currentUser, inspectingPlan) && (
                  <button
                    onClick={() => {
                      const p = inspectingPlan;
                      setInspectingPlan(null);
                      handleOpenEdit(p);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center space-x-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{lang === 'km' ? 'កែប្រែផែនការ' : 'Edit Plan'}</span>
                  </button>
                )}
                {db.canDeletePlan(currentUser, inspectingPlan) && (
                  <button
                    onClick={(e) => {
                      const p = inspectingPlan;
                      setInspectingPlan(null);
                      handleDelete(p, e);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs transition flex items-center space-x-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{lang === 'km' ? 'ទុកក្នុងបណ្ណសារ / លុប' : 'Archive / Delete'}</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => setInspectingPlan(null)}
                className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs"
              >
                {lang === 'km' ? 'បិទ' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM ARCHIVE / DELETE PLAN MODAL */}
      {planToDelete && (
        <div 
          id="confirm-delete-plan-modal"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {lang === 'km' ? 'បញ្ជាក់ការទុកក្នុងបណ្ណសារ / លុប' : 'Confirm Archive / Delete'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'km' ? 'សកម្មភាពនេះនឹងដកផែនការចេញពីបញ្ជីសកម្ម' : 'This will remove the action plan from active views'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4 text-xs space-y-2">
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {planToDelete.planNumber}
                </span>
                <span className="font-semibold text-slate-900 line-clamp-1">{planToDelete.title}</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                {lang === 'km'
                  ? `តើអ្នកពិតជាចង់ទុកផែនការសកម្មភាព ${planToDelete.planNumber} («${planToDelete.title}») ក្នុងបណ្ណសារមែនទេ? ផែនការដែលបានទុកក្នុងបណ្ណសារនឹងត្រូវដកចេញពីផ្ទាំងគ្រប់គ្រងសកម្ម។`
                  : `Are you sure you want to archive action plan ${planToDelete.planNumber} ("${planToDelete.title}")? Archived plans are retained for historical compliance audit records but hidden from active dashboards.`}
              </p>
            </div>

            {deleteError && (
              <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setPlanToDelete(null);
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
                <span>{lang === 'km' ? 'យល់ព្រមលុប / ទុកក្នុងបណ្ណសារ' : 'Yes, Archive Plan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROGRESS MODAL */}
      {progressPlan && (
        <ProgressModal
          entityType="action_plan"
          item={progressPlan}
          currentUser={currentUser}
          lang={lang}
          onClose={() => setProgressPlan(null)}
          onSuccess={() => {
            refreshPlans();
            if (inspectingPlan) {
              setInspectingPlan(db.getPlanById(inspectingPlan.id) || null);
            }
          }}
        />
      )}

      {/* APPROVAL MODAL */}
      {approvalPlan && (
        <ApprovalModal
          plan={approvalPlan}
          currentUser={currentUser}
          lang={lang}
          onClose={() => setApprovalPlan(null)}
          onSuccess={() => {
            refreshPlans();
            if (inspectingPlan) {
              setInspectingPlan(db.getPlanById(inspectingPlan.id) || null);
            }
          }}
        />
      )}

      {/* PLAN COLLABORATION & FEEDBACK MODAL */}
      {collaborationPlan && (
        <PlanCollaborationModal
          isOpen={!!collaborationPlan}
          onClose={() => setCollaborationPlan(null)}
          plan={collaborationPlan}
          currentUser={currentUser}
          lang={lang}
          onSuccess={(msg) => {
            refreshPlans();
            setFeedbackNotice({ type: 'success', message: msg });
            if (inspectingPlan) {
              setInspectingPlan(db.getPlanById(inspectingPlan.id) || null);
            }
          }}
        />
      )}

      {/* PLAN GOAL ALIGNMENT & PERIODIC REVIEW MODAL */}
      {goalReviewPlan && (
        <PlanGoalReviewModal
          isOpen={!!goalReviewPlan}
          onClose={() => setGoalReviewPlan(null)}
          plan={goalReviewPlan}
          currentUser={currentUser}
          lang={lang}
          onSuccess={(msg) => {
            refreshPlans();
            setFeedbackNotice({ type: 'success', message: msg });
            if (inspectingPlan) {
              setInspectingPlan(db.getPlanById(inspectingPlan.id) || null);
            }
          }}
        />
      )}
    </div>
  );
};
