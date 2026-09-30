import React, { useState, useMemo, useRef } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Lock, 
  Unlock, 
  Filter, 
  ArrowUpDown, 
  MoreHorizontal, 
  Plus, 
  Search, 
  Check, 
  X, 
  Building2, 
  FolderKanban, 
  Target, 
  CheckSquare, 
  Clock, 
  RotateCcw, 
  Maximize2, 
  Minimize2,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  LayoutGrid,
  List,
  SlidersHorizontal,
  Layers,
  Sparkles
} from 'lucide-react';
import { User, Language, ActionPlan, Activity, Department, PriorityLevel, ActivityStatus, Objective } from '../types';
import { db } from '../services/db';
import { translations } from '../services/i18n';

interface WorkBreakdownStructureViewProps {
  currentUser: User;
  lang: Language;
  selectedPlanId?: string;
  onSelectPlan?: (planId: string) => void;
  onNavigatePlan?: (planId: string) => void;
  embedded?: boolean;
}

type GroupByTab = 'Departments' | 'Projects' | 'Tasks' | 'Goals';
type ViewDensity = 'compact' | 'comfortable';
type MobileViewMode = 'grid' | 'cards';

export const WorkBreakdownStructureView: React.FC<WorkBreakdownStructureViewProps> = ({
  currentUser,
  lang,
  selectedPlanId: initialSelectedPlanId,
  onSelectPlan,
  onNavigatePlan,
  embedded = false,
}) => {
  const t = translations[lang];
  const tableRef = useRef<HTMLDivElement>(null);

  // Core Database Data
  const [plans, setPlans] = useState<ActionPlan[]>(() => db.getAuthorizedPlans(currentUser));
  const [activities, setActivities] = useState<Activity[]>(() => db.getActivities());
  const allDepartments = useMemo(() => db.getDepartments(), []);
  const allUsers = useMemo(() => db.getUsers(), []);
  const allObjectives = useMemo(() => db.getObjectives(), []);

  // Top Tabs: Departments | Projects | Tasks | Goals
  const [activeTab, setActiveTab] = useState<GroupByTab>('Departments');
  const [isLocked, setIsLocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [density, setDensity] = useState<ViewDensity>('compact');
  const [mobileViewMode, setMobileViewMode] = useState<MobileViewMode>('grid');

  // Sorting
  const [sortBy, setSortBy] = useState<'name' | 'priority' | 'time' | 'cost'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sortActive, setSortActive] = useState(true);

  // Filters
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Collapsed Nodes: map of keys -> boolean
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  const toggleNode = (nodeKey: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCollapsedNodes(prev => ({
      ...prev,
      [nodeKey]: !prev[nodeKey],
    }));
  };

  const expandAll = () => setCollapsedNodes({});
  const collapseAll = () => {
    const allKeys: Record<string, boolean> = {};
    allDepartments.forEach(d => { allKeys[`dept-${d.id}`] = true; });
    plans.forEach(p => { allKeys[`plan-${p.id}`] = true; });
    allObjectives.forEach(o => { allKeys[`goal-${o.id}`] = true; });
    setCollapsedNodes(allKeys);
  };

  // Horizontal scroll helpers
  const handleScrollLeft = () => {
    if (tableRef.current) {
      tableRef.current.scrollBy({ left: -260, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (tableRef.current) {
      tableRef.current.scrollBy({ left: 260, behavior: 'smooth' });
    }
  };

  // Inline "Add record" state
  const [addingTaskForPlanId, setAddingTaskForPlanId] = useState<string | null>(null);
  const [inlineTaskTitle, setInlineTaskTitle] = useState('');
  const [inlineTaskAssignee, setInlineTaskAssignee] = useState<string>(currentUser.id);
  const [inlineTaskStatus, setInlineTaskStatus] = useState<ActivityStatus>('In Progress');
  const [inlineTaskHours, setInlineTaskHours] = useState<number>(20);

  const handleRefresh = () => {
    setPlans(db.getAuthorizedPlans(currentUser));
    setActivities(db.getActivities());
  };

  // Sync plans whenever currentUser changes
  React.useEffect(() => {
    setPlans(db.getAuthorizedPlans(currentUser));
  }, [currentUser]);

  // Create inline task under a project
  const handleSaveInlineTask = (planId: string) => {
    if (!inlineTaskTitle.trim()) return;

    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    const newCode = `ACT-${String(activities.length + 1).padStart(3, '0')}`;
    const today = new Date().toISOString().substring(0, 10);
    const due = plan.dueDate || today;

    db.saveActivity({
      actionPlanId: plan.id,
      code: newCode,
      title: inlineTaskTitle.trim(),
      description: `Task created from Treeview: ${inlineTaskTitle.trim()}`,
      assignedEmployeeId: inlineTaskAssignee || currentUser.id,
      teamLeaderId: plan.ownerId,
      startDate: today,
      dueDate: due,
      priority: 'Medium',
      status: inlineTaskStatus,
      progressPercentage: inlineTaskStatus === 'Completed' ? 100 : inlineTaskStatus === 'In Progress' ? 40 : 0,
      weight: 10,
      estimatedHours: inlineTaskHours || 20,
      actualHours: inlineTaskStatus === 'Completed' ? inlineTaskHours : 0,
      dependencies: [],
    });

    handleRefresh();
    setInlineTaskTitle('');
    setAddingTaskForPlanId(null);
  };

  const formatCost = (val?: number) => {
    const amount = val || 0;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  const formatHours = (hours?: number) => {
    const h = hours || 0;
    return `${h}h`;
  };

  // Filter and sort plans helper
  const filterAndSortPlans = (plansList: ActionPlan[]) => {
    let result = [...plansList];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.planNumber.toLowerCase().includes(q) ||
        activities.some(a => a.actionPlanId === p.id && a.title.toLowerCase().includes(q))
      );
    }

    if (priorityFilter !== 'all') {
      result = result.filter(p => p.priority.toLowerCase() === priorityFilter.toLowerCase());
    }

    if (sortActive) {
      result.sort((a, b) => {
        if (sortBy === 'name') {
          return sortOrder === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
        }
        if (sortBy === 'cost') {
          return sortOrder === 'asc' ? (a.budget || 0) - (b.budget || 0) : (b.budget || 0) - (a.budget || 0);
        }
        return 0;
      });
    }

    return result;
  };

  // Filter tasks helper
  const filterTasks = (tasksList: Activity[]) => {
    let result = [...tasksList];

    if (statusFilter !== 'all') {
      result = result.filter(a => a.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a => a.title.toLowerCase().includes(q) || a.code.toLowerCase().includes(q));
    }

    return result;
  };

  // Data computed for 'Departments' tab
  const departmentTreeData = useMemo(() => {
    return allDepartments
      .map(dept => {
        const deptManager = allUsers.find(u => u.id === dept.managerId || u.id === dept.headOfDepartmentId);
        const deptMembers = allUsers.filter(u => u.departmentId === dept.id);
        const deptPlans = plans.filter(p => p.departmentId === dept.id);

        if (currentUser.role === 'Employee' && deptPlans.length === 0) {
          return null;
        }

        const sortedPlans = filterAndSortPlans(deptPlans);
        const planIds = new Set(sortedPlans.map(p => p.id));
        const deptActivities = activities.filter(a => planIds.has(a.actionPlanId));

        const totalHours = deptActivities.reduce((sum, a) => sum + (a.estimatedHours || 0), 0)
          + sortedPlans.reduce((sum, p) => sum + (p.budget ? Math.round(p.budget / 100) : 0), 0);
        const totalBudget = sortedPlans.reduce((sum, p) => sum + (p.budget || 0), 0);

        if (searchQuery && sortedPlans.length === 0 && !dept.name.toLowerCase().includes(searchQuery.toLowerCase())) {
          return null;
        }

        return {
          department: dept,
          manager: deptManager,
          memberCount: deptMembers.length > 0 ? deptMembers.length : 3,
          totalHours: totalHours > 0 ? totalHours : 80,
          totalBudget,
          plans: sortedPlans,
        };
      })
      .filter((dept): dept is NonNullable<typeof dept> => dept !== null);
  }, [allDepartments, allUsers, plans, activities, searchQuery, priorityFilter, sortBy, sortOrder, sortActive, currentUser, statusFilter]);

  // Data computed for 'Projects' tab (Flat Project list with child tasks)
  const projectsTreeData = useMemo(() => {
    return filterAndSortPlans(plans).map(plan => {
      const planTasks = filterTasks(activities.filter(a => a.actionPlanId === plan.id));
      const owner = allUsers.find(u => u.id === plan.ownerId);
      const totalHours = planTasks.reduce((sum, a) => sum + (a.estimatedHours || 0), 0);
      return {
        plan,
        tasks: planTasks,
        owner,
        totalHours: totalHours || 40,
      };
    });
  }, [plans, activities, searchQuery, priorityFilter, statusFilter, sortBy, sortOrder, sortActive, allUsers]);

  // Data computed for 'Goals' tab (Objective -> Plans -> Tasks)
  const goalsTreeData = useMemo(() => {
    return allObjectives.map(goal => {
      const goalPlans = filterAndSortPlans(plans.filter(p => p.objectiveId === goal.id));
      const planIds = new Set(goalPlans.map(p => p.id));
      const goalTasks = activities.filter(a => planIds.has(a.actionPlanId));
      const totalHours = goalTasks.reduce((sum, a) => sum + (a.estimatedHours || 0), 0);
      const totalBudget = goalPlans.reduce((sum, p) => sum + (p.budget || 0), 0);

      return {
        goal,
        plans: goalPlans,
        totalHours: totalHours || 120,
        totalBudget,
      };
    }).filter(g => g.plans.length > 0 || (searchQuery && g.goal.title.toLowerCase().includes(searchQuery.toLowerCase())));
  }, [allObjectives, plans, activities, searchQuery, priorityFilter, statusFilter, sortBy, sortOrder, sortActive]);

  // Priority Pill Badge
  const renderPriorityBadge = (priority: PriorityLevel | string) => {
    const p = (priority || 'medium').toLowerCase();
    if (p === 'critical' || p === 'urgent') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white tracking-wide shrink-0">
          critical
        </span>
      );
    }
    if (p === 'high') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white tracking-wide shrink-0">
          high
        </span>
      );
    }
    if (p === 'low') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500 text-white tracking-wide shrink-0">
          low
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white tracking-wide shrink-0">
        medium
      </span>
    );
  };

  // Status Pill Badge
  const renderStatusBadge = (status: ActivityStatus | string) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'done') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 tracking-wide shrink-0">
          done
        </span>
      );
    }
    if (s === 'on hold' || s === 'paused') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800 border border-sky-200 tracking-wide shrink-0">
          on hold
        </span>
      );
    }
    if (s === 'in progress') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200 tracking-wide shrink-0">
          in progress
        </span>
      );
    }
    if (s === 'delayed' || s === 'blocked') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200 tracking-wide shrink-0">
          delayed
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 tracking-wide shrink-0">
        to do
      </span>
    );
  };

  // Responsible Pill with Avatar
  const renderResponsiblePill = (user?: User, fallbackTitle?: string) => {
    if (!user) {
      if (fallbackTitle) {
        return <span className="text-[11px] text-slate-500 font-medium truncate">{fallbackTitle}</span>;
      }
      return null;
    }
    const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2);

    return (
      <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-[11px] font-medium border border-slate-200 transition max-w-full">
        <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-[8px] font-bold shrink-0">
          {initials}
        </div>
        <span className="truncate max-w-[110px]">{user.name}</span>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-2xl shadow-xs border border-slate-200 flex flex-col font-sans select-none max-w-full overflow-hidden ${
      isFullscreen ? 'fixed inset-0 z-50 rounded-none overflow-y-auto' : ''
    }`}>
      
      {/* 1. TOP PURPLE TABS BAR */}
      <div className="bg-[#6b1d7d] px-3 sm:px-4 pt-2 flex items-center justify-between border-b border-[#581567] shrink-0">
        {/* Left Tabs with Smooth Horizontal Touch Panning */}
        <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none py-0.5 min-w-0 flex-1 pr-2">
          {(['Departments', 'Projects', 'Tasks', 'Goals'] as GroupByTab[]).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-t-lg text-xs font-bold transition flex items-center space-x-1 shrink-0 ${
                activeTab === tab
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-purple-100 hover:bg-purple-800/60'
              }`}
            >
              {tab === 'Departments' && <Building2 className="w-3 h-3 text-purple-600" />}
              {tab === 'Projects' && <FolderKanban className="w-3 h-3 text-purple-600" />}
              {tab === 'Tasks' && <CheckSquare className="w-3 h-3 text-purple-600" />}
              {tab === 'Goals' && <Target className="w-3 h-3 text-purple-600" />}
              <span>
                {tab === 'Departments' ? (lang === 'km' ? 'នាយកដ្ឋាន' : 'Departments') :
                 tab === 'Projects' ? (lang === 'km' ? 'គម្រោង' : 'Projects') :
                 tab === 'Tasks' ? (lang === 'km' ? 'កិច្ចការ' : 'Tasks') :
                 (lang === 'km' ? 'គោលដៅ' : 'Goals')}
              </span>
            </button>
          ))}
        </div>

        {/* Right Tools (Fullscreen, Expand/Collapse) */}
        <div className="flex items-center space-x-1 text-purple-200 shrink-0 pl-1">
          <button
            type="button"
            onClick={() => {
              if (Object.keys(collapsedNodes).length === 0) collapseAll();
              else expandAll();
            }}
            title={Object.keys(collapsedNodes).length === 0 ? 'Collapse All' : 'Expand All'}
            className="p-1.5 rounded-lg hover:bg-purple-800/80 hover:text-white transition text-xs flex items-center space-x-1"
          >
            {Object.keys(collapsedNodes).length === 0 ? (
              <ChevronsLeft className="w-4 h-4" />
            ) : (
              <ChevronsRight className="w-4 h-4" />
            )}
            <span className="hidden md:inline text-[11px]">
              {Object.keys(collapsedNodes).length === 0 ? 'Collapse' : 'Expand'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1.5 rounded-lg hover:bg-purple-800/80 hover:text-white transition"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. SUB-TOOLBAR */}
      <div className="bg-white px-3 sm:px-4 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 shrink-0">
        <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap">
          {/* Tree Mode Badge */}
          <div className="flex items-center space-x-1 text-slate-800 font-bold px-2 py-1 rounded-lg bg-slate-100">
            <span className="font-mono text-sm leading-none text-purple-700">⎇</span>
            <span className="text-xs">Tree Grid</span>
          </div>

          {/* Lock icon */}
          <button 
            type="button"
            onClick={() => setIsLocked(!isLocked)}
            title={isLocked ? 'View is locked' : 'View is editable'}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            {isLocked ? <Lock className="w-4 h-4 text-amber-600" /> : <Unlock className="w-4 h-4" />}
          </button>

          {/* Filter button */}
          <button
            type="button"
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border transition font-medium text-xs ${
              statusFilter !== 'all' || priorityFilter !== 'all' || searchQuery
                ? 'bg-purple-50 text-purple-700 border-purple-200 font-bold'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
            {(statusFilter !== 'all' || priorityFilter !== 'all' || searchQuery) && (
              <span className="w-2 h-2 rounded-full bg-purple-600 ml-0.5" />
            )}
          </button>

          {/* Sort Pill Badge */}
          <button
            type="button"
            onClick={() => {
              setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
              setSortActive(true);
            }}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#f5ede4] text-[#855e38] border border-[#e5d8cb] hover:bg-[#ede3d7] transition font-bold text-xs"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortOrder === 'asc' ? 'A → Z' : 'Z → A'}</span>
          </button>

          {/* Density Switcher */}
          <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setDensity('compact')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition ${
                density === 'compact' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Compact
            </button>
            <button
              type="button"
              onClick={() => setDensity('comfortable')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition ${
                density === 'comfortable' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Comfortable
            </button>
          </div>
        </div>

        {/* Right side search & stats */}
        <div className="flex items-center space-x-2 flex-1 sm:flex-initial justify-end">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={lang === 'km' ? 'ស្វែងរក...' : 'Search records...'}
              className="w-full sm:w-48 pl-8 pr-7 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs p-0.5"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            title="Refresh Data"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. OPTIONAL FILTER DRAWER */}
      {showFilterDrawer && (
        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center gap-3 text-xs animate-in fade-in duration-100 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="Completed">Done</option>
              <option value="In Progress">In Progress</option>
              <option value="On Hold">On Hold</option>
              <option value="Not Started">To Do</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-500 font-medium">Priority:</span>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
            >
              <option value="all">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-500 font-medium">Sort Field:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
            >
              <option value="name">Name</option>
              <option value="cost">Cost estimate</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setPriorityFilter('all');
              setSearchQuery('');
            }}
            className="text-purple-700 hover:text-purple-900 underline text-xs ml-auto font-medium"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* MOBILE HORIZONTAL SCROLL HELPER BANNER */}
      <div className="md:hidden bg-purple-50/80 px-3 py-1.5 border-b border-purple-100 flex items-center justify-between text-[11px] text-purple-900 shrink-0">
        <span className="flex items-center space-x-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse shrink-0" />
          <span>Swipe horizontally to view all columns</span>
        </span>
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={handleScrollLeft}
            className="p-1 rounded bg-white text-purple-700 border border-purple-200 shadow-2xs hover:bg-purple-100 transition"
            title="Scroll Left"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleScrollRight}
            className="p-1 rounded bg-white text-purple-700 border border-purple-200 shadow-2xs hover:bg-purple-100 transition"
            title="Scroll Right"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. MAIN HIERARCHICAL TREE TABLE GRID WITH SMOOTH HORIZONTAL SCROLL */}
      <div 
        ref={tableRef}
        className="w-full max-w-full overflow-x-auto overscroll-x-contain touch-pan-x scrollbar-thin scrollbar-thumb-slate-300 select-text flex-1"
      >
        <div className="min-w-[760px] sm:min-w-[880px] w-full flex flex-col">

          {/* UNIFIED MASTER COLUMN HEADER - ALL LEVELS ALIGN TO THIS EXACT GRID */}
          <div className="grid grid-cols-12 px-4 sm:px-6 py-2 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
            <div className="col-span-5 flex items-center space-x-2">
              <span>Name / Work Breakdown Structure</span>
            </div>
            <div className="col-span-2 pl-2">
              <span>Status / Priority</span>
            </div>
            <div className="col-span-3 pl-2">
              <span>Manager / Responsible</span>
            </div>
            <div className="col-span-1 text-right pr-3">
              <span>Effort</span>
            </div>
            <div className="col-span-1 text-right pr-2">
              <span>Budget</span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: DEPARTMENTS VIEW (Department -> Projects -> Tasks)                 */}
          {/* ========================================================================= */}
          {activeTab === 'Departments' && (
            <div className="divide-y divide-slate-100">
              {departmentTreeData.length === 0 && (
                <div className="py-14 text-center text-slate-500">
                  <p className="text-sm font-semibold text-slate-700">No records found</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or filters.</p>
                </div>
              )}

              {departmentTreeData.map(({ department, manager, memberCount, totalHours, totalBudget, plans: deptPlans }) => {
                const isDeptCollapsed = collapsedNodes[`dept-${department.id}`];

                return (
                  <div key={department.id} className="group/dept">
                    
                    {/* LEVEL 1: DEPARTMENT ROW (CLEAN, COMPACT, CRISP) */}
                    <div 
                      onClick={() => toggleNode(`dept-${department.id}`)}
                      className={`grid grid-cols-12 items-center px-4 sm:px-6 transition cursor-pointer select-none border-b border-slate-100 ${
                        density === 'compact' ? 'py-2 bg-slate-50/70 hover:bg-slate-100/80' : 'py-3 bg-slate-50/70 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="col-span-5 flex items-center space-x-2 min-w-0 pr-2">
                        <button
                          type="button"
                          onClick={(e) => toggleNode(`dept-${department.id}`, e)}
                          className="p-1 -ml-1 text-slate-500 hover:text-slate-800 transition shrink-0"
                        >
                          {isDeptCollapsed ? (
                            <ChevronRight className="w-4 h-4 text-purple-700" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-purple-700" />
                          )}
                        </button>
                        <Building2 className="w-4 h-4 text-purple-700 shrink-0" />
                        <span className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight truncate">
                          {department.name}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded-full border border-slate-200 shrink-0">
                          {deptPlans.length} {deptPlans.length === 1 ? 'plan' : 'plans'}
                        </span>
                      </div>

                      <div className="col-span-2 pl-2">
                        <span className="text-[11px] text-slate-400 italic">Department</span>
                      </div>

                      <div className="col-span-3 pl-2 min-w-0">
                        {renderResponsiblePill(manager, 'Department Head')}
                      </div>

                      <div className="col-span-1 text-right pr-3 text-slate-700 text-xs font-mono font-semibold">
                        {formatHours(totalHours)}
                      </div>

                      <div className="col-span-1 text-right pr-2 text-slate-700 text-xs font-mono font-semibold">
                        {formatCost(totalBudget)}
                      </div>
                    </div>

                    {/* LEVEL 2 & 3: PROJECTS AND TASKS UNDER DEPARTMENT */}
                    {!isDeptCollapsed && (
                      <div className="bg-white">
                        {deptPlans.length === 0 ? (
                          <div className="py-3 pl-10 sm:pl-12 text-xs text-slate-400 italic">
                            No active projects under this department.
                          </div>
                        ) : (
                          deptPlans.map(plan => {
                            const isPlanCollapsed = collapsedNodes[`plan-${plan.id}`];
                            const planActs = activities.filter(a => a.actionPlanId === plan.id);
                            const filteredActs = filterTasks(planActs);
                            const planOwner = allUsers.find(u => u.id === plan.ownerId);
                            const totalPlanTime = planActs.reduce((sum, a) => sum + (a.estimatedHours || 0), 0) || 40;

                            return (
                              <div key={plan.id} className="border-b border-slate-100/80">
                                
                                {/* LEVEL 2: PROJECT ROW (ALIGNED PRECISELY WITH HEADER) */}
                                <div 
                                  onClick={() => toggleNode(`plan-${plan.id}`)}
                                  className={`grid grid-cols-12 items-center px-4 sm:px-6 transition cursor-pointer select-none hover:bg-slate-50/70 ${
                                    density === 'compact' ? 'py-1.5' : 'py-2.5'
                                  }`}
                                >
                                  {/* Title with clean tree guide (pl-7 sm:pl-9) */}
                                  <div className="col-span-5 flex items-center space-x-1.5 pl-6 sm:pl-8 min-w-0 pr-2 relative">
                                    {/* Tree connector indicator */}
                                    <span className="text-slate-300 font-mono text-xs select-none mr-0.5">├─</span>
                                    <button
                                      type="button"
                                      onClick={(e) => toggleNode(`plan-${plan.id}`, e)}
                                      className="p-1 -ml-1 text-slate-400 hover:text-slate-700 transition shrink-0"
                                    >
                                      {isPlanCollapsed ? (
                                        <ChevronRight className="w-3.5 h-3.5 text-blue-600" />
                                      ) : (
                                        <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                                      )}
                                    </button>
                                    <FolderKanban className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                    <span className="text-slate-900 text-xs sm:text-sm font-semibold truncate">
                                      {plan.title}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400 shrink-0 hidden lg:inline">
                                      ({plan.planNumber})
                                    </span>
                                  </div>

                                  <div className="col-span-2 pl-2">
                                    {renderPriorityBadge(plan.priority)}
                                  </div>

                                  <div className="col-span-3 pl-2 min-w-0">
                                    {renderResponsiblePill(planOwner, 'Project Lead')}
                                  </div>

                                  <div className="col-span-1 text-right pr-3 text-slate-700 text-xs font-mono font-medium">
                                    {formatHours(totalPlanTime)}
                                  </div>

                                  <div className="col-span-1 text-right pr-2 text-slate-700 text-xs font-mono font-medium">
                                    {formatCost(plan.budget || 5000)}
                                  </div>
                                </div>

                                {/* LEVEL 3: TASKS UNDER PROJECT (COMPACT & CLEAN, NO EXTRA SPACE) */}
                                {!isPlanCollapsed && (
                                  <div className="bg-slate-50/30">
                                    {filteredActs.map(act => {
                                      const assignee = allUsers.find(u => u.id === act.assignedEmployeeId) || allUsers[0];

                                      return (
                                        <div 
                                          key={act.id} 
                                          className={`grid grid-cols-12 items-center px-4 sm:px-6 hover:bg-blue-50/50 transition border-t border-slate-100/60 ${
                                            density === 'compact' ? 'py-1 sm:py-1.5' : 'py-2'
                                          }`}
                                        >
                                          {/* Task Title with neat indent (pl-12 sm:pl-14, NO pl-24) */}
                                          <div className="col-span-5 flex items-center space-x-2 pl-11 sm:pl-14 min-w-0 pr-2">
                                            <span className="text-slate-300 font-mono text-[11px] select-none">│ └</span>
                                            <CheckSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span className="text-slate-800 text-xs font-medium truncate">
                                              {act.title}
                                            </span>
                                          </div>

                                          <div className="col-span-2 pl-2">
                                            {renderStatusBadge(act.status)}
                                          </div>

                                          <div className="col-span-3 pl-2 min-w-0">
                                            {renderResponsiblePill(assignee)}
                                          </div>

                                          <div className="col-span-1 text-right pr-3 text-slate-500 text-xs font-mono">
                                            {formatHours(act.estimatedHours || 16)}
                                          </div>

                                          <div className="col-span-1 text-right pr-2 text-slate-500 text-xs font-mono">
                                            {act.progressPercentage || 0}%
                                          </div>
                                        </div>
                                      );
                                    })}

                                    {/* INLINE "Add task record" ROW */}
                                    {addingTaskForPlanId === plan.id ? (
                                      <div className="grid grid-cols-12 items-center px-4 sm:px-6 py-2 bg-purple-50/50 border-t border-purple-200 pl-11 sm:pl-14 gap-2">
                                        <div className="col-span-5">
                                          <input
                                            type="text"
                                            value={inlineTaskTitle}
                                            onChange={e => setInlineTaskTitle(e.target.value)}
                                            placeholder="Enter task name..."
                                            className="w-full text-xs px-2.5 py-1 rounded-lg border border-purple-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-purple-600"
                                            autoFocus
                                            onKeyDown={e => {
                                              if (e.key === 'Enter') handleSaveInlineTask(plan.id);
                                              if (e.key === 'Escape') setAddingTaskForPlanId(null);
                                            }}
                                          />
                                        </div>

                                        <div className="col-span-2 pl-2">
                                          <select
                                            value={inlineTaskStatus}
                                            onChange={e => setInlineTaskStatus(e.target.value as any)}
                                            className="w-full text-xs px-2 py-1 rounded-lg border border-slate-300 bg-white"
                                          >
                                            <option value="In Progress">in progress</option>
                                            <option value="Completed">done</option>
                                            <option value="On Hold">on hold</option>
                                            <option value="Not Started">to do</option>
                                          </select>
                                        </div>

                                        <div className="col-span-3 pl-2">
                                          <select
                                            value={inlineTaskAssignee}
                                            onChange={e => setInlineTaskAssignee(e.target.value)}
                                            className="w-full text-xs px-2 py-1 rounded-lg border border-slate-300 bg-white truncate"
                                          >
                                            {allUsers.map(u => (
                                              <option key={u.id} value={u.id}>{u.name}</option>
                                            ))}
                                          </select>
                                        </div>

                                        <div className="col-span-2 flex items-center justify-end space-x-1 pr-2">
                                          <button
                                            type="button"
                                            onClick={() => handleSaveInlineTask(plan.id)}
                                            className="p-1 rounded-md bg-purple-700 text-white hover:bg-purple-800 transition"
                                            title="Save task"
                                          >
                                            <Check className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setAddingTaskForPlanId(null)}
                                            className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition"
                                            title="Cancel"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      !isLocked && (
                                        <div className="pl-11 sm:pl-14 py-1.5 border-t border-slate-100/60">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setAddingTaskForPlanId(plan.id);
                                              setInlineTaskTitle('');
                                            }}
                                            className="inline-flex items-center space-x-1.5 text-slate-400 hover:text-purple-700 text-xs font-medium transition py-0.5"
                                          >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Add task record</span>
                                          </button>
                                        </div>
                                      )
                                    )}

                                  </div>
                                )}

                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: PROJECTS VIEW (Action Plan -> Tasks directly)                      */}
          {/* ========================================================================= */}
          {activeTab === 'Projects' && (
            <div className="divide-y divide-slate-100">
              {projectsTreeData.length === 0 && (
                <div className="py-14 text-center text-slate-500">
                  <p className="text-sm font-semibold text-slate-700">No projects found</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or filters.</p>
                </div>
              )}

              {projectsTreeData.map(({ plan, tasks, owner, totalHours }) => {
                const isPlanCollapsed = collapsedNodes[`plan-${plan.id}`];

                return (
                  <div key={plan.id} className="group/plan">
                    <div 
                      onClick={() => toggleNode(`plan-${plan.id}`)}
                      className={`grid grid-cols-12 items-center px-4 sm:px-6 transition cursor-pointer select-none hover:bg-slate-50/80 ${
                        density === 'compact' ? 'py-2 bg-slate-50/40' : 'py-3 bg-slate-50/40'
                      }`}
                    >
                      <div className="col-span-5 flex items-center space-x-2 min-w-0 pr-2">
                        <button
                          type="button"
                          onClick={(e) => toggleNode(`plan-${plan.id}`, e)}
                          className="p-1 -ml-1 text-slate-500 hover:text-slate-800 transition shrink-0"
                        >
                          {isPlanCollapsed ? (
                            <ChevronRight className="w-4 h-4 text-blue-600" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-blue-600" />
                          )}
                        </button>
                        <FolderKanban className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                          {plan.title}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded-full border border-slate-200 shrink-0">
                          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                        </span>
                      </div>

                      <div className="col-span-2 pl-2">
                        {renderPriorityBadge(plan.priority)}
                      </div>

                      <div className="col-span-3 pl-2 min-w-0">
                        {renderResponsiblePill(owner, 'Project Owner')}
                      </div>

                      <div className="col-span-1 text-right pr-3 text-slate-700 text-xs font-mono font-medium">
                        {formatHours(totalHours)}
                      </div>

                      <div className="col-span-1 text-right pr-2 text-slate-700 text-xs font-mono font-medium">
                        {formatCost(plan.budget || 5000)}
                      </div>
                    </div>

                    {/* TASKS UNDER PLAN */}
                    {!isPlanCollapsed && (
                      <div className="bg-slate-50/30">
                        {tasks.map(act => {
                          const assignee = allUsers.find(u => u.id === act.assignedEmployeeId) || allUsers[0];

                          return (
                            <div 
                              key={act.id} 
                              className={`grid grid-cols-12 items-center px-4 sm:px-6 hover:bg-blue-50/50 transition border-t border-slate-100/60 ${
                                density === 'compact' ? 'py-1 sm:py-1.5' : 'py-2'
                              }`}
                            >
                              <div className="col-span-5 flex items-center space-x-2 pl-8 sm:pl-10 min-w-0 pr-2">
                                <span className="text-slate-300 font-mono text-[11px] select-none">├─</span>
                                <CheckSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="text-slate-800 text-xs font-medium truncate">
                                  {act.title}
                                </span>
                              </div>

                              <div className="col-span-2 pl-2">
                                {renderStatusBadge(act.status)}
                              </div>

                              <div className="col-span-3 pl-2 min-w-0">
                                {renderResponsiblePill(assignee)}
                              </div>

                              <div className="col-span-1 text-right pr-3 text-slate-500 text-xs font-mono">
                                {formatHours(act.estimatedHours || 16)}
                              </div>

                              <div className="col-span-1 text-right pr-2 text-slate-500 text-xs font-mono">
                                {act.progressPercentage || 0}%
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: TASKS VIEW (Flat Task Hierarchy with Parent Plan)                  */}
          {/* ========================================================================= */}
          {activeTab === 'Tasks' && (
            <div className="divide-y divide-slate-100">
              {filterTasks(activities).map(act => {
                const parentPlan = plans.find(p => p.id === act.actionPlanId);
                const assignee = allUsers.find(u => u.id === act.assignedEmployeeId) || allUsers[0];

                return (
                  <div 
                    key={act.id} 
                    className={`grid grid-cols-12 items-center px-4 sm:px-6 hover:bg-slate-50 transition ${
                      density === 'compact' ? 'py-1.5' : 'py-2.5'
                    }`}
                  >
                    <div className="col-span-5 flex items-center space-x-2 min-w-0 pr-2">
                      <CheckSquare className="w-4 h-4 text-purple-700 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-slate-900 text-xs font-semibold truncate">
                          {act.title}
                        </div>
                        {parentPlan && (
                          <div className="text-[10px] text-slate-400 truncate">
                            Plan: {parentPlan.title}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="col-span-2 pl-2">
                      {renderStatusBadge(act.status)}
                    </div>

                    <div className="col-span-3 pl-2 min-w-0">
                      {renderResponsiblePill(assignee)}
                    </div>

                    <div className="col-span-1 text-right pr-3 text-slate-700 text-xs font-mono font-medium">
                      {formatHours(act.estimatedHours || 16)}
                    </div>

                    <div className="col-span-1 text-right pr-2 text-slate-700 text-xs font-mono font-medium">
                      {act.progressPercentage || 0}%
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: GOALS VIEW (Corporate Objectives -> Plans -> Tasks)                */}
          {/* ========================================================================= */}
          {activeTab === 'Goals' && (
            <div className="divide-y divide-slate-100">
              {goalsTreeData.map(({ goal, plans: goalPlans, totalHours, totalBudget }) => {
                const isGoalCollapsed = collapsedNodes[`goal-${goal.id}`];

                return (
                  <div key={goal.id} className="group/goal">
                    <div 
                      onClick={() => toggleNode(`goal-${goal.id}`)}
                      className={`grid grid-cols-12 items-center px-4 sm:px-6 transition cursor-pointer select-none hover:bg-slate-100/80 ${
                        density === 'compact' ? 'py-2 bg-slate-50/80' : 'py-3 bg-slate-50/80'
                      }`}
                    >
                      <div className="col-span-5 flex items-center space-x-2 min-w-0 pr-2">
                        <button
                          type="button"
                          onClick={(e) => toggleNode(`goal-${goal.id}`, e)}
                          className="p-1 -ml-1 text-slate-500 hover:text-slate-800 transition shrink-0"
                        >
                          {isGoalCollapsed ? (
                            <ChevronRight className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-emerald-600" />
                          )}
                        </button>
                        <Target className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                          {goal.title}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
                          {goalPlans.length} {goalPlans.length === 1 ? 'plan' : 'plans'}
                        </span>
                      </div>

                      <div className="col-span-2 pl-2">
                        <span className="text-[11px] text-slate-400 italic">Corporate Goal</span>
                      </div>

                      <div className="col-span-3 pl-2 min-w-0">
                        <span className="text-xs text-slate-500 font-medium">Strategic Objective</span>
                      </div>

                      <div className="col-span-1 text-right pr-3 text-slate-700 text-xs font-mono font-semibold">
                        {formatHours(totalHours)}
                      </div>

                      <div className="col-span-1 text-right pr-2 text-slate-700 text-xs font-mono font-semibold">
                        {formatCost(totalBudget)}
                      </div>
                    </div>

                    {!isGoalCollapsed && (
                      <div className="bg-white">
                        {goalPlans.map(plan => {
                          const planActs = filterTasks(activities.filter(a => a.actionPlanId === plan.id));
                          const owner = allUsers.find(u => u.id === plan.ownerId);

                          return (
                            <div key={plan.id} className="border-b border-slate-100">
                              <div className="grid grid-cols-12 items-center px-4 sm:px-6 py-2 hover:bg-slate-50/60 transition">
                                <div className="col-span-5 flex items-center space-x-2 pl-7 sm:pl-9 min-w-0 pr-2">
                                  <span className="text-slate-300 font-mono text-xs select-none">├─</span>
                                  <FolderKanban className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span className="text-slate-900 text-xs font-semibold truncate">
                                    {plan.title}
                                  </span>
                                </div>

                                <div className="col-span-2 pl-2">
                                  {renderPriorityBadge(plan.priority)}
                                </div>

                                <div className="col-span-3 pl-2 min-w-0">
                                  {renderResponsiblePill(owner, 'Plan Owner')}
                                </div>

                                <div className="col-span-1 text-right pr-3 text-slate-700 text-xs font-mono">
                                  {formatHours(planActs.reduce((s, a) => s + (a.estimatedHours || 0), 0) || 40)}
                                </div>

                                <div className="col-span-1 text-right pr-2 text-slate-700 text-xs font-mono">
                                  {formatCost(plan.budget || 5000)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* 5. FOOTER SUMMARY BAR */}
      <div className="bg-slate-50 px-4 sm:px-6 py-2.5 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <span className="font-semibold text-slate-700">{allDepartments.length} Departments</span>
          <span>•</span>
          <span className="font-semibold text-slate-700">{plans.length} Projects</span>
          <span>•</span>
          <span className="font-semibold text-slate-700">{activities.length} Tasks</span>
        </div>

        <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-2">
          <span>Hierarchy: {activeTab === 'Departments' ? 'Dept → Project → Task' : activeTab === 'Goals' ? 'Goal → Project → Task' : 'Project → Task'}</span>
        </div>
      </div>

    </div>
  );
};
