import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Users, 
  Target, 
  Layers, 
  CheckSquare, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Filter, 
  Shield, 
  Mail, 
  Phone, 
  Send, 
  ExternalLink, 
  UserCheck, 
  Sparkles, 
  Printer, 
  Briefcase, 
  Clock, 
  AlertCircle,
  Network,
  GitFork,
  ArrowRight,
  Maximize2,
  Minimize2,
  FolderKanban
} from 'lucide-react';
import { User, Department, ActionPlan, Activity, Language, UserRole } from '../types';
import { db } from '../services/db';
import { translations } from '../services/i18n';

interface OrganizationalTreeviewProps {
  currentUser: User;
  lang: Language;
  onNavigatePlan?: (planId: string) => void;
  onSelectEmployee?: (employee: User) => void;
}

type TreeGroupingMode = 'department' | 'hierarchy' | 'plans';

interface EmployeeNodeData {
  user: User;
  department?: Department;
  hierarchyLevel: 1 | 2 | 3 | 4;
  hierarchyLabel: string;
  responsibilities: string[];
  approachFor: string;
  ownedPlans: ActionPlan[];
  assignedActivities: Activity[];
}

export const OrganizationalTreeview: React.FC<OrganizationalTreeviewProps> = ({
  currentUser,
  lang,
  onNavigatePlan,
  onSelectEmployee,
}) => {
  const t = translations[lang];

  // Raw Database Records
  const allUsers = useMemo(() => db.getUsers().filter(u => u.status === 'Active' && u.isActive !== false), []);
  const allDepartments = useMemo(() => db.getDepartments(), []);
  const allPlans = useMemo(() => db.getAuthorizedPlans(currentUser), [currentUser]);
  const allActivities = useMemo(() => db.getActivities(), []);

  // Controls & Filters
  const [groupingMode, setGroupingMode] = useState<TreeGroupingMode>('department');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [selectedNode, setSelectedNode] = useState<EmployeeNodeData | null>(null);

  // Toggle node collapse
  const toggleNode = (nodeId: string) => {
    setCollapsedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  const expandAll = () => setCollapsedNodes({});
  const collapseAll = () => {
    const collapsed: Record<string, boolean> = {};
    allDepartments.forEach(d => { collapsed[`dept-${d.id}`] = true; });
    allUsers.forEach(u => { collapsed[`user-${u.id}`] = true; });
    setCollapsedNodes(collapsed);
  };

  // Helper to map Role to Hierarchy Level & Responsibilities
  const getEmployeeNodeData = (user: User): EmployeeNodeData => {
    const dept = allDepartments.find(d => d.id === user.departmentId);
    const ownedPlans = allPlans.filter(p => p.ownerId === user.id);
    const assignedActivities = allActivities.filter(a => a.assignedEmployeeId === user.id || a.teamLeaderId === user.id);

    let hierarchyLevel: 1 | 2 | 3 | 4 = 4;
    let hierarchyLabel = lang === 'km' ? 'កម្រិត ៤ • បុគ្គលិកប្រតិបត្តិ' : 'Level 4 • Contributor';
    let responsibilities: string[] = [];
    let approachFor = '';

    if (user.role === 'Super Admin' || user.role === 'Administrator') {
      hierarchyLevel = 1;
      hierarchyLabel = lang === 'km' ? 'កម្រិត ១ • ថ្នាក់ដឹកនាំជាន់ខ្ពស់' : 'Level 1 • Executive Leadership';
      responsibilities = [
        lang === 'km' ? 'កំណត់គោលដៅយុទ្ធសាស្ត្រស្ថាប័ន' : 'Strategic Governance & Vision',
        lang === 'km' ? 'អនុម័តផែនការសកម្មភាពទូទាំងអង្គភាព' : 'Enterprise Plan Approvals',
        lang === 'km' ? 'គ្រប់គ្រងរចនាសម្ព័ន្ធ និងសិទ្ធិប្រព័ន្ធ' : 'Institutional Policy & RBAC Security'
      ];
      approachFor = lang === 'km' 
        ? 'ការសម្រេចចិត្តយុទ្ធសាស្ត្រ ការអនុម័តថវិកា និងគោលការណ៍អង្គភាព'
        : 'Strategic decisions, institutional budget allocation, and policy escalations';
    } else if (user.role === 'Department Manager' || user.id === dept?.headOfDepartmentId) {
      hierarchyLevel = 2;
      hierarchyLabel = lang === 'km' ? 'កម្រិត ២ • ប្រធាននាយកដ្ឋាន' : 'Level 2 • Department Head';
      responsibilities = [
        lang === 'km' ? `គ្រប់គ្រងនាយកដ្ឋាន ${dept?.name || ''}` : `Overseeing ${dept?.name || 'Department'}`,
        lang === 'km' ? 'រៀបចំ និងត្រួតពិនិត្យផែនការសកម្មភាព' : 'Action Plan Submission & Reviews',
        lang === 'km' ? 'បែងចែកធនធាន និងតាមដាន KPI' : 'Resource Allocation & KPI Monitoring'
      ];
      approachFor = lang === 'km'
        ? `បញ្ហានាយកដ្ឋាន ${dept?.name || ''} ការស្នើសុំផែនការ និងការអនុម័តកិច្ចការ`
        : `Departmental initiatives, milestone reviews, and inter-department collaboration`;
    } else if (user.role === 'Team Leader') {
      hierarchyLevel = 3;
      hierarchyLabel = lang === 'km' ? 'កម្រិត ៣ • ប្រធានក្រុម' : 'Level 3 • Team Leader';
      responsibilities = [
        lang === 'km' ? 'សម្របសម្រួល និងដឹកនាំសមាជិកក្រុម' : 'Team Coordination & Supervision',
        lang === 'km' ? 'តាមដានវឌ្ឍនភាពកិច្ចការប្រចាំសប្តាហ៍' : 'Weekly Activity Milestone Tracking',
        lang === 'km' ? 'ផ្ទៀងផ្ទាត់លទ្ធផល និងដោះស្រាយឧបសគ្គ' : 'Deliverable Validation & Blocker Removal'
      ];
      approachFor = lang === 'km'
        ? 'ការចាត់ចែងកិច្ចការប្រតិបត្តិ បញ្ហាបច្ចេកទេស និងការដោះស្រាយឧបសគ្គ'
        : 'Operational task assignments, daily blocker resolution, and technical guidance';
    } else {
      hierarchyLevel = 4;
      hierarchyLabel = lang === 'km' ? 'កម្រិត ៤ • បុគ្គលិកប្រតិបត្តិ' : 'Level 4 • Operational Specialist';
      responsibilities = [
        lang === 'km' ? 'អនុវត្តកិច្ចការ និងសកម្មភាពដែលបានចាត់តាំង' : 'Direct Task Execution & Deliverables',
        lang === 'km' ? 'ធ្វើបច្ចុប្បន្នភាពភាគរយវឌ្ឍនភាព (% Progress)' : 'Milestone Progress Updates',
        lang === 'km' ? 'កត់ត្រាវត្តមាន និងរាយការណ៍ឧបសគ្គ' : 'Shift Attendance & Issue Reporting'
      ];
      approachFor = lang === 'km'
        ? 'ការសាកសួរព័ត៌មានលម្អិតអំពីកិច្ចការប្រតិបត្តិជាក់ស្តែងដែលកំពុងអនុវត្ត'
        : 'Direct execution queries, specific task deliverables, and task documentation';
    }

    return {
      user,
      department: dept,
      hierarchyLevel,
      hierarchyLabel,
      responsibilities,
      approachFor,
      ownedPlans,
      assignedActivities,
    };
  };

  // Filtered list of nodes
  const employeeNodes = useMemo(() => {
    return allUsers.map(getEmployeeNodeData).filter(item => {
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.user.name.toLowerCase().includes(q);
        const matchEmail = item.user.email.toLowerCase().includes(q);
        const matchPosition = (item.user.position || '').toLowerCase().includes(q);
        const matchDept = (item.department?.name || '').toLowerCase().includes(q);
        const matchResponsibility = item.responsibilities.some(r => r.toLowerCase().includes(q));
        const matchPlan = item.ownedPlans.some(p => p.title.toLowerCase().includes(q) || p.planNumber.toLowerCase().includes(q));
        if (!matchName && !matchEmail && !matchPosition && !matchDept && !matchResponsibility && !matchPlan) {
          return false;
        }
      }
      // Department Filter
      if (selectedDeptId !== 'all' && item.user.departmentId !== selectedDeptId) {
        return false;
      }
      // Level Filter
      if (selectedLevel !== 'all' && item.hierarchyLevel.toString() !== selectedLevel) {
        return false;
      }
      return true;
    });
  }, [allUsers, allDepartments, allPlans, allActivities, searchQuery, selectedDeptId, selectedLevel, lang]);

  // Hierarchy Level Groupings
  const hierarchyGroups = useMemo(() => {
    return {
      level1: employeeNodes.filter(n => n.hierarchyLevel === 1),
      level2: employeeNodes.filter(n => n.hierarchyLevel === 2),
      level3: employeeNodes.filter(n => n.hierarchyLevel === 3),
      level4: employeeNodes.filter(n => n.hierarchyLevel === 4),
    };
  }, [employeeNodes]);

  // Department Groupings
  const departmentGroups = useMemo(() => {
    return allDepartments.map(dept => {
      const deptMembers = employeeNodes.filter(n => n.user.departmentId === dept.id);
      const head = deptMembers.find(n => n.hierarchyLevel === 2 || n.user.id === dept.headOfDepartmentId);
      const teamLeaders = deptMembers.filter(n => n.hierarchyLevel === 3);
      const staff = deptMembers.filter(n => n.hierarchyLevel === 4);
      const deptPlans = allPlans.filter(p => p.departmentId === dept.id);

      return {
        department: dept,
        head,
        teamLeaders,
        staff,
        totalMembers: deptMembers.length,
        plans: deptPlans,
        activeMembers: deptMembers,
      };
    }).filter(g => selectedDeptId === 'all' || g.department.id === selectedDeptId);
  }, [allDepartments, employeeNodes, allPlans, selectedDeptId]);

  // Overall statistics
  const stats = useMemo(() => {
    return {
      totalEmployees: allUsers.length,
      totalDepartments: allDepartments.length,
      totalPlans: allPlans.length,
      totalActivities: allActivities.length,
      level1Count: allUsers.filter(u => u.role === 'Super Admin' || u.role === 'Administrator').length,
      level2Count: allUsers.filter(u => u.role === 'Department Manager').length,
      level3Count: allUsers.filter(u => u.role === 'Team Leader').length,
      level4Count: allUsers.filter(u => u.role === 'Employee').length,
    };
  }, [allUsers, allDepartments, allPlans, allActivities]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & INTRO */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-bold border border-blue-400/30 flex items-center space-x-1">
                <Network className="w-3 h-3" />
                <span>{lang === 'km' ? 'រចនាសម្ព័ន្ធមែកធាងអង្គភាព' : 'Organizational Treeview Plan'}</span>
              </span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-slate-300 text-xs">
                {lang === 'km' ? 'ឋានានុក្រម និងការទទួលខុសត្រូវ' : 'Hierarchy & Responsibilities'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              {lang === 'km' 
                ? 'មែកធាងឋានានុក្រម និងផែនការការងារតាមបុគ្គលិក' 
                : 'Employee Hierarchy & Responsibility Treeview'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed">
              {lang === 'km'
                ? 'មើលឃើញច្បាស់នូវរចនាសម្ព័ន្ធឋានានុក្រម តួនាទីភារកិច្ច ការទទួលខុសត្រូវលើផែនការសកម្មភាព និងដឹងច្បាស់ថាត្រូវទាក់ទងអ្នកណាសម្រាប់បញ្ហានីមួយៗ។'
                : 'Visualize institutional hierarchy, roles, operational action plans, and clear escalation paths across all departments.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/10 transition flex items-center space-x-1"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? 'ពន្លាតទាំងអស់' : 'Expand All'}</span>
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/10 transition flex items-center space-x-1"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? 'បង្រួមទាំងអស់' : 'Collapse All'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? 'បោះពុម្ព / Export' : 'Print / Export'}</span>
            </button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-white/10 text-xs">
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
            <span className="text-slate-400 block text-[10px] font-semibold uppercase">{lang === 'km' ? 'បុគ្គលិកសរុប' : 'Total Staff'}</span>
            <span className="text-base font-black text-white">{stats.totalEmployees}</span>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
            <span className="text-slate-400 block text-[10px] font-semibold uppercase">{lang === 'km' ? 'នាយកដ្ឋាន' : 'Departments'}</span>
            <span className="text-base font-black text-white">{stats.totalDepartments}</span>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
            <span className="text-blue-300 block text-[10px] font-semibold uppercase">{lang === 'km' ? 'កម្រិត ១ Leadership' : 'L1 Leadership'}</span>
            <span className="text-base font-black text-blue-300">{stats.level1Count}</span>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
            <span className="text-indigo-300 block text-[10px] font-semibold uppercase">{lang === 'km' ? 'កម្រិត ២ ប្រធាននាយកដ្ឋាន' : 'L2 Dept Heads'}</span>
            <span className="text-base font-black text-indigo-300">{stats.level2Count}</span>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
            <span className="text-amber-300 block text-[10px] font-semibold uppercase">{lang === 'km' ? 'កម្រិត ៣ ប្រធានក្រុម' : 'L3 Team Leads'}</span>
            <span className="text-base font-black text-amber-300">{stats.level3Count}</span>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
            <span className="text-emerald-300 block text-[10px] font-semibold uppercase">{lang === 'km' ? 'កម្រិត ៤ ប្រតិបត្តិការ' : 'L4 Contributors'}</span>
            <span className="text-base font-black text-emerald-300">{stats.level4Count}</span>
          </div>
        </div>
      </div>

      {/* 2. FILTER & VIEW MODE CONTROLLER */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Mode Switcher */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
            <button
              onClick={() => setGroupingMode('department')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1.5 ${
                groupingMode === 'department'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? 'តាមនាយកដ្ឋាន និងក្រុម' : 'By Department & Teams'}</span>
            </button>
            <button
              onClick={() => setGroupingMode('hierarchy')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1.5 ${
                groupingMode === 'hierarchy'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? 'តាមកម្រិតឋានានុក្រម (L1 - L4)' : 'By Hierarchy Tier (L1 - L4)'}</span>
            </button>
            <button
              onClick={() => setGroupingMode('plans')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1.5 ${
                groupingMode === 'plans'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? 'តាមការទទួលខុសត្រូវផែនការ' : 'By Plan Ownership'}</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={lang === 'km' ? 'ស្វែងរកឈ្មោះ តួនាទី ភារកិច្ច ឬផែនការ...' : 'Search staff, role, responsibility, or plan...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Secondary Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-1 text-slate-500 font-semibold mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'ចម្រាញ់៖' : 'Filters:'}</span>
          </div>

          <select
            value={selectedDeptId}
            onChange={e => setSelectedDeptId(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 font-medium focus:outline-hidden"
          >
            <option value="all">{lang === 'km' ? 'គ្រប់នាយកដ្ឋានទាំងអស់' : 'All Departments'}</option>
            {allDepartments.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </select>

          <select
            value={selectedLevel}
            onChange={e => setSelectedLevel(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 font-medium focus:outline-hidden"
          >
            <option value="all">{lang === 'km' ? 'គ្រប់កម្រិតឋានានុក្រម' : 'All Hierarchy Levels'}</option>
            <option value="1">{lang === 'km' ? 'កម្រិត ១ • Executive Leadership' : 'Level 1 • Executive Leadership'}</option>
            <option value="2">{lang === 'km' ? 'កម្រិត ២ • Department Head' : 'Level 2 • Department Head'}</option>
            <option value="3">{lang === 'km' ? 'កម្រិត ៣ • Team Leader' : 'Level 3 • Team Leader'}</option>
            <option value="4">{lang === 'km' ? 'កម្រិត ៤ • Operational Contributor' : 'Level 4 • Operational Contributor'}</option>
          </select>

          <div className="ml-auto text-[11px] text-slate-500">
            {lang === 'km' ? 'បង្ហាញ៖' : 'Showing:'} <strong className="text-slate-800">{employeeNodes.length}</strong> {lang === 'km' ? 'បុគ្គលិក' : 'employees'}
          </div>
        </div>
      </div>

      {/* 3. TREEVIEW CONTENT AREA */}

      {/* MODE 1: BY DEPARTMENT & TEAMS */}
      {groupingMode === 'department' && (
        <div className="space-y-6">
          {departmentGroups.map(group => {
            const isDeptCollapsed = collapsedNodes[`dept-${group.department.id}`];

            return (
              <div key={group.department.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition">
                {/* Department Level Header */}
                <div 
                  onClick={() => toggleNode(`dept-${group.department.id}`)}
                  className="p-4 bg-slate-50 hover:bg-slate-100/80 cursor-pointer flex items-center justify-between border-b border-slate-200 transition"
                >
                  <div className="flex items-center space-x-3">
                    <button className="p-1 rounded text-slate-400 hover:text-slate-600">
                      {isDeptCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                      {group.department.code.substring(0, 3)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-black text-slate-900 text-sm">{group.department.name}</h3>
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-blue-100 text-blue-800">
                          {group.department.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{group.department.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-xs">
                    <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 font-semibold text-[11px]">
                      {group.totalMembers} {lang === 'km' ? 'សមាជិក' : 'members'}
                    </span>
                    <span className="bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 text-blue-700 font-semibold text-[11px]">
                      {group.plans.length} {lang === 'km' ? 'ផែនការ' : 'plans'}
                    </span>
                  </div>
                </div>

                {/* Department Body Tree */}
                {!isDeptCollapsed && (
                  <div className="p-5 space-y-6">
                    {/* Level 2: Department Head */}
                    {group.head ? (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2 text-xs font-bold text-indigo-900 uppercase tracking-wider">
                          <Shield className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{lang === 'km' ? 'ប្រធាននាយកដ្ឋាន (Department Head)' : 'Department Head'}</span>
                        </div>
                        <div className="pl-4 border-l-2 border-indigo-200">
                          <EmployeeCard 
                            node={group.head} 
                            lang={lang} 
                            onSelect={() => setSelectedNode(group.head!)}
                            onNavigatePlan={onNavigatePlan}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{lang === 'km' ? 'នាយកដ្ឋាននេះមិនទាន់មានការចាត់តាំងប្រធាននាយកដ្ឋាននៅឡើយទេ។' : 'No department head currently assigned to this department.'}</span>
                      </div>
                    )}

                    {/* Level 3: Team Leaders */}
                    {group.teamLeaders.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                          <Users className="w-3.5 h-3.5 text-amber-600" />
                          <span>{lang === 'km' ? 'ប្រធានក្រុម និងអ្នកសម្របសម្រួល (Team Leaders)' : 'Team Leaders & Supervisors'}</span>
                          <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px]">
                            {group.teamLeaders.length}
                          </span>
                        </div>
                        <div className="pl-4 border-l-2 border-amber-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {group.teamLeaders.map(tl => (
                            <EmployeeCard 
                              key={tl.user.id} 
                              node={tl} 
                              lang={lang} 
                              onSelect={() => setSelectedNode(tl)}
                              onNavigatePlan={onNavigatePlan}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Level 4: Operational Staff & Specialists */}
                    {group.staff.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2 text-xs font-bold text-emerald-900 uppercase tracking-wider">
                          <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{lang === 'km' ? 'បុគ្គលិកប្រតិបត្តិការ (Operational Contributors)' : 'Operational Contributors & Specialists'}</span>
                          <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
                            {group.staff.length}
                          </span>
                        </div>
                        <div className="pl-4 border-l-2 border-emerald-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {group.staff.map(staffMember => (
                            <EmployeeCard 
                              key={staffMember.user.id} 
                              node={staffMember} 
                              lang={lang} 
                              compact
                              onSelect={() => setSelectedNode(staffMember)}
                              onNavigatePlan={onNavigatePlan}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {group.activeMembers.length === 0 && (
                      <div className="p-4 text-center text-slate-400 text-xs">
                        {lang === 'km' ? 'រកមិនឃើញបុគ្គលិកដែលត្រូវនឹងលក្ខខណ្ឌស្វែងរកក្នុងនាយកដ្ឋាននេះទេ។' : 'No staff match the current search criteria in this department.'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODE 2: BY HIERARCHY TIER (L1 - L4) */}
      {groupingMode === 'hierarchy' && (
        <div className="space-y-8 relative">
          {/* Level 1: Executive Leadership */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2.5 pb-2 border-b-2 border-blue-600">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">1</div>
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide">
                {lang === 'km' ? 'កម្រិត ១ • ថ្នាក់ដឹកនាំជាន់ខ្ពស់ (Executive Leadership)' : 'Level 1 • Executive Leadership & Governance'}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                {hierarchyGroups.level1.length} {lang === 'km' ? 'រូប' : 'officials'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hierarchyGroups.level1.map(node => (
                <EmployeeCard 
                  key={node.user.id} 
                  node={node} 
                  lang={lang} 
                  onSelect={() => setSelectedNode(node)}
                  onNavigatePlan={onNavigatePlan}
                />
              ))}
            </div>
          </div>

          {/* Level 2: Department Heads */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2.5 pb-2 border-b-2 border-indigo-600">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">2</div>
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide">
                {lang === 'km' ? 'កម្រិត ២ • ប្រធាននាយកដ្ឋាន (Department Managers)' : 'Level 2 • Department Managers & Directors'}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                {hierarchyGroups.level2.length} {lang === 'km' ? 'រូប' : 'directors'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hierarchyGroups.level2.map(node => (
                <EmployeeCard 
                  key={node.user.id} 
                  node={node} 
                  lang={lang} 
                  onSelect={() => setSelectedNode(node)}
                  onNavigatePlan={onNavigatePlan}
                />
              ))}
            </div>
          </div>

          {/* Level 3: Team Leaders */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2.5 pb-2 border-b-2 border-amber-500">
              <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs">3</div>
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide">
                {lang === 'km' ? 'កម្រិត ៣ • ប្រធានក្រុមការងារ (Team Leaders)' : 'Level 3 • Team Leaders & Supervisors'}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                {hierarchyGroups.level3.length} {lang === 'km' ? 'រូប' : 'leaders'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hierarchyGroups.level3.map(node => (
                <EmployeeCard 
                  key={node.user.id} 
                  node={node} 
                  lang={lang} 
                  onSelect={() => setSelectedNode(node)}
                  onNavigatePlan={onNavigatePlan}
                />
              ))}
            </div>
          </div>

          {/* Level 4: Operational Staff */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2.5 pb-2 border-b-2 border-emerald-600">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">4</div>
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide">
                {lang === 'km' ? 'កម្រិត ៤ • បុគ្គលិកប្រតិបត្តិ (Operational Specialists)' : 'Level 4 • Operational Specialists & Staff'}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                {hierarchyGroups.level4.length} {lang === 'km' ? 'រូប' : 'staff'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {hierarchyGroups.level4.map(node => (
                <EmployeeCard 
                  key={node.user.id} 
                  node={node} 
                  lang={lang} 
                  compact
                  onSelect={() => setSelectedNode(node)}
                  onNavigatePlan={onNavigatePlan}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: BY PLAN OWNERSHIP */}
      {groupingMode === 'plans' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allPlans.map(plan => {
              const owner = employeeNodes.find(n => n.user.id === plan.ownerId);
              const dept = allDepartments.find(d => d.id === plan.departmentId);
              const activities = allActivities.filter(a => a.actionPlanId === plan.id);
              const completedActs = activities.filter(a => a.status === 'Completed').length;

              return (
                <div key={plan.id} className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 hover:border-blue-400 transition space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {plan.planNumber}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        plan.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                        plan.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {plan.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{plan.title}</h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{plan.description}</p>

                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-2">
                      {/* Owner Node Card */}
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                          {lang === 'km' ? 'អ្នកគ្រប់គ្រងផែនការ (Owner)' : 'Plan Lead / Owner'}
                        </span>
                        {owner ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {owner.user.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className="overflow-hidden">
                              <div className="font-bold text-slate-900 truncate">{owner.user.name}</div>
                              <div className="text-[10px] text-slate-400 truncate">{owner.user.position || owner.user.role}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-slate-500">{lang === 'km' ? 'វឌ្ឍនភាព' : 'Progress'}</span>
                          <span className="font-bold text-slate-900">{plan.completionPercentage}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-blue-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${plan.completionPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      {completedActs}/{activities.length} {lang === 'km' ? 'កិច្ចការរួចរាល់' : 'Tasks Done'}
                    </span>
                    {onNavigatePlan && (
                      <button
                        onClick={() => onNavigatePlan(plan.id)}
                        className="text-blue-600 hover:text-blue-800 font-bold flex items-center space-x-1"
                      >
                        <span>{lang === 'km' ? 'បើកមើល' : 'View Plan'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. EMPLOYEE DETAIL MODAL (WHEN A CARD IS CLICKED) */}
      {selectedNode && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-md">
                  {selectedNode.user.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="font-bold text-base">{selectedNode.user.name}</h3>
                  <p className="text-xs text-slate-300 font-mono flex items-center space-x-1.5 mt-0.5">
                    <span>{selectedNode.user.position || selectedNode.user.role}</span>
                    <span>•</span>
                    <span>{selectedNode.department?.name || 'Enterprise'}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 text-xs">
              {/* Hierarchy Tier Badge */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-600 block">{lang === 'km' ? 'កម្រិតឋានានុក្រម' : 'Hierarchy Tier'}</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedNode.hierarchyLabel}</span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-xs">
                  Level {selectedNode.hierarchyLevel}
                </span>
              </div>

              {/* Core Responsibilities */}
              <div className="space-y-1.5">
                <span className="font-bold text-slate-700 block uppercase text-[10px]">
                  {lang === 'km' ? 'ភារកិច្ច និងការទទួលខុសត្រូវស្នូល' : 'Core Responsibilities & Scope'}
                </span>
                <ul className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {selectedNode.responsibilities.map((r, i) => (
                    <li key={i} className="flex items-start space-x-2 text-slate-700">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Approach For / Escalation Guide */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                <span className="font-bold text-emerald-900 text-[11px] flex items-center space-x-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{lang === 'km' ? 'ទាក់ទងបុគ្គលនេះសម្រាប់៖' : 'Approach this colleague for:'}</span>
                </span>
                <p className="text-emerald-800 leading-relaxed">{selectedNode.approachFor}</p>
              </div>

              {/* Owned Plans & Active Tasks */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">{lang === 'km' ? 'ផែនការសកម្មភាពគ្រប់គ្រង' : 'Owned Action Plans'}</span>
                  <span className="text-base font-black text-slate-900">{selectedNode.ownedPlans.length}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">{lang === 'km' ? 'កិច្ចការ និងសកម្មភាពទទួលបន្ទុក' : 'Assigned Activities'}</span>
                  <span className="text-base font-black text-slate-900">{selectedNode.assignedActivities.length}</span>
                </div>
              </div>

              {/* Direct Contact Links */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-700 block uppercase text-[10px]">
                  {lang === 'km' ? 'បណ្តាញទំនាក់ទំនងផ្ទាល់' : 'Direct Contact & Channels'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a
                    href={`mailto:${selectedNode.user.email}`}
                    className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center space-x-2 text-slate-700 transition"
                  >
                    <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">{selectedNode.user.email}</span>
                  </a>

                  {selectedNode.user.phone && (
                    <a
                      href={`tel:${selectedNode.user.phone}`}
                      className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center space-x-2 text-slate-700 transition"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{selectedNode.user.phone}</span>
                    </a>
                  )}

                  {selectedNode.user.telegramHandle && (
                    <div className="p-2 rounded-lg border border-slate-200 bg-white flex items-center space-x-2 text-slate-700 col-span-full">
                      <Send className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span>Telegram: <strong>{selectedNode.user.telegramHandle}</strong></span>
                      {selectedNode.user.telegramChatId && (
                        <span className="text-[10px] text-slate-400 font-mono">(ID: {selectedNode.user.telegramChatId})</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition"
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

interface EmployeeCardProps {
  node: EmployeeNodeData;
  lang: Language;
  compact?: boolean;
  onSelect?: () => void;
  onNavigatePlan?: (planId: string) => void;
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({
  node,
  lang,
  compact = false,
  onSelect,
  onNavigatePlan,
}) => {
  const { user, department, hierarchyLevel, hierarchyLabel, responsibilities, ownedPlans, assignedActivities } = node;

  const roleColors: Record<UserRole, { badge: string; border: string }> = {
    'Super Admin': { badge: 'bg-purple-100 text-purple-800 border-purple-300', border: 'border-l-purple-600' },
    'Administrator': { badge: 'bg-indigo-100 text-indigo-800 border-indigo-300', border: 'border-l-indigo-600' },
    'Department Manager': { badge: 'bg-blue-100 text-blue-800 border-blue-300', border: 'border-l-blue-600' },
    'Team Leader': { badge: 'bg-amber-100 text-amber-800 border-amber-300', border: 'border-l-amber-500' },
    'Employee': { badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', border: 'border-l-emerald-500' },
    'Executive / Viewer': { badge: 'bg-slate-100 text-slate-800 border-slate-300', border: 'border-l-slate-400' },
  };

  const style = roleColors[user.role] || roleColors['Employee'];

  if (compact) {
    return (
      <div 
        onClick={onSelect}
        className={`bg-white p-3 rounded-xl border border-slate-200 hover:border-blue-400 shadow-2xs hover:shadow-xs transition cursor-pointer border-l-4 ${style.border}`}
      >
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
            {user.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="overflow-hidden flex-1">
            <div className="font-bold text-slate-900 text-xs truncate">{user.name}</div>
            <div className="text-[10px] text-slate-400 truncate">{user.position || user.role}</div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px]">
          <span className="text-slate-500 font-mono">{user.employeeId || 'EMP'}</span>
          <div className="flex items-center space-x-1">
            {ownedPlans.length > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                {ownedPlans.length} {lang === 'km' ? 'ផែនការ' : 'plans'}
              </span>
            )}
            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
              {assignedActivities.length} {lang === 'km' ? 'កិច្ចការ' : 'tasks'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onSelect}
      className={`bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-400 shadow-xs hover:shadow-md transition cursor-pointer border-l-4 ${style.border} flex flex-col justify-between space-y-3`}
    >
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${style.badge}`}>
            {user.role}
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            {user.employeeId || 'EMP'}
          </span>
        </div>

        {/* User Info */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
            {user.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="overflow-hidden flex-1">
            <h4 className="font-black text-slate-900 text-xs sm:text-sm truncate">{user.name}</h4>
            <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">{user.position || user.role}</p>
            {department && (
              <p className="text-[10px] text-blue-600 font-semibold truncate">{department.name}</p>
            )}
          </div>
        </div>

        {/* Core Responsibilities tags */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">{lang === 'km' ? 'ការទទួលខុសត្រូវ' : 'Responsibilities'}</span>
          <div className="flex flex-wrap gap-1">
            {responsibilities.slice(0, 2).map((r, i) => (
              <span key={i} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium line-clamp-1">
                {r}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
        <div className="flex items-center space-x-1.5 text-slate-500">
          <Layers className="w-3.5 h-3.5 text-blue-500" />
          <span><strong>{ownedPlans.length}</strong> {lang === 'km' ? 'ផែនការ' : 'plans'}</span>
          <span>•</span>
          <span><strong>{assignedActivities.length}</strong> {lang === 'km' ? 'កិច្ចការ' : 'tasks'}</span>
        </div>

        <span className="text-blue-600 font-semibold text-[10px] hover:underline flex items-center space-x-0.5">
          <span>{lang === 'km' ? 'ព័ត៌មានលម្អិត' : 'Details'}</span>
          <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
};
