import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  X, 
  Layers, 
  CheckSquare, 
  Clock, 
  Users, 
  Building2, 
  ArrowRight, 
  Sparkles, 
  FileText,
  Calendar,
  HelpCircle,
  MessageSquare,
  Sun,
  Moon
} from 'lucide-react';
import { User, Language, ActionPlan, Activity, NavTab } from '../types';
import { db } from '../services/db';
import { canRoleAccessTab } from '../services/rbac';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  lang: Language;
  onNavigateTab: (tab: NavTab) => void;
  onNavigatePlan: (planId: string) => void;
  onOpenFeedback: () => void;
  onOpenHelp: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  lang,
  onNavigateTab,
  onNavigatePlan,
  onOpenFeedback,
  onOpenHelp,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  // Data sources
  const allPlans = useMemo(() => db.getAuthorizedPlans(currentUser), [currentUser]);
  const allActivities = useMemo(() => db.getActivities(), []);
  const allUsers = useMemo(() => db.getUsers(), []);
  const allDepartments = useMemo(() => db.getDepartments(), []);
  const todayAtt = db.getTodayAttendance(currentUser.id);

  // Search categories
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items: Array<{
      id: string;
      category: string;
      title: string;
      subtitle?: string;
      icon: React.ReactNode;
      badge?: string;
      action: () => void;
    }> = [];

    // Navigation Shortcuts
    const navShortcuts: Array<{
      id: string;
      title: string;
      subtitle: string;
      icon: React.ReactNode;
      badge?: string;
      tab?: NavTab;
      action: () => void;
    }> = [
      {
        id: 'nav-hub',
        title: lang === 'km' ? 'មជ្ឈមណ្ឌលបុគ្គលិកចល័ត' : 'Employee Mobile Hub',
        subtitle: lang === 'km' ? 'វេនការងារប្រចាំថ្ងៃ សកម្មភាពរហ័ស និងភារកិច្ច' : 'My daily shift, quick actions & tasks',
        tab: 'employee-hub',
        icon: <Sparkles className="w-4 h-4 text-blue-600" />,
        action: () => { onNavigateTab('employee-hub'); onClose(); },
      },
      {
        id: 'nav-dash',
        title: lang === 'km' ? 'ផ្ទាំងគ្រប់គ្រងប្រតិបត្តិ' : 'Executive Dashboard',
        subtitle: lang === 'km' ? 'សូចនាករ KPI តារាង និងវឌ្ឍនភាពទូទៅ' : 'KPIs, charts & overall progress',
        tab: 'dashboard',
        icon: <Layers className="w-4 h-4 text-slate-600" />,
        action: () => { onNavigateTab('dashboard'); onClose(); },
      },
      {
        id: 'nav-attendance',
        title: lang === 'km' ? 'វត្តមាន និងវេនការងារ' : 'Attendance & Shifts',
        subtitle: lang === 'km' ? 'កត់ត្រាចូល/ចេញ កំណត់ត្រា និងរបាយការណ៍ប្រចាំខែ' : 'Clock in/out, records & monthly reports',
        tab: 'attendance',
        icon: <Clock className="w-4 h-4 text-emerald-600" />,
        badge: todayAtt?.checkInTime ? (lang === 'km' ? 'សកម្ម' : 'Active') : undefined,
        action: () => { onNavigateTab('attendance'); onClose(); },
      },
      {
        id: 'nav-plans',
        title: lang === 'km' ? 'កាតាឡុកផែនការសកម្មភាព' : 'Action Plans Catalog',
        subtitle: lang === 'km' ? 'គំនិតផ្តួចផ្តើមយុទ្ធសាស្ត្រ និងលទ្ធផលដែលរំពឹងទុក' : 'Strategic initiatives & deliverables',
        tab: 'action-plans',
        icon: <Layers className="w-4 h-4 text-indigo-600" />,
        action: () => { onNavigateTab('action-plans'); onClose(); },
      },
      {
        id: 'nav-activities',
        title: lang === 'km' ? 'សកម្មភាព និងភារកិច្ចរបស់ខ្ញុំ' : 'My Activities & Tasks',
        subtitle: lang === 'km' ? 'គោលដៅសំខាន់ៗ និងបញ្ជីភារកិច្ចជាក់ស្តែង' : 'Milestones and tactical task list',
        tab: 'activities',
        icon: <CheckSquare className="w-4 h-4 text-amber-600" />,
        action: () => { onNavigateTab('activities'); onClose(); },
      },
      {
        id: 'nav-approvals',
        title: lang === 'km' ? 'លំហូរការងារអនុម័ត' : 'Approval Workflow',
        subtitle: lang === 'km' ? 'ពិនិត្យមើលការបញ្ជូនផែនការ និងការចុះហត្ថលេខា' : 'Review plan submissions and sign-offs',
        tab: 'approvals',
        icon: <Layers className="w-4 h-4 text-amber-600" />,
        action: () => { onNavigateTab('approvals'); onClose(); },
      },
      {
        id: 'nav-calendar',
        title: lang === 'km' ? 'ប្រតិទិន និងបន្ទាត់ពេលវេលា Gantt' : 'Calendar & Gantt Timeline',
        subtitle: lang === 'km' ? 'កាលវិភាគពេលវេលា និងគោលដៅសំខាន់ៗនៃគម្រោង' : 'Schedule timeline and project milestones',
        tab: 'calendar-gantt',
        icon: <Calendar className="w-4 h-4 text-purple-600" />,
        action: () => { onNavigateTab('calendar-gantt'); onClose(); },
      },
      {
        id: 'nav-reports',
        title: lang === 'km' ? 'របាយការណ៍ និងការវិភាគ' : 'Reports & Analytics',
        subtitle: lang === 'km' ? 'សេចក្តីសង្ខេបវត្តមាន និងការទាញយកទិន្នន័យការងារ' : 'Attendance summaries and performance exports',
        tab: 'reports',
        icon: <FileText className="w-4 h-4 text-emerald-600" />,
        action: () => { onNavigateTab('reports'); onClose(); },
      },
      {
        id: 'nav-audit',
        title: lang === 'km' ? 'កំណត់ហេតុសវនកម្មសុវត្ថិភាពប្រព័ន្ធ' : 'System Security Audit Logs',
        subtitle: lang === 'km' ? 'កំណត់ត្រាសវនកម្ម ការប៉ុនប៉ងចូលប្រើ និងព្រឹត្តិការណ៍សុវត្ថិភាព' : 'Audit trails, access attempts & security events',
        tab: 'audit-logs',
        icon: <Layers className="w-4 h-4 text-rose-600" />,
        action: () => { onNavigateTab('audit-logs'); onClose(); },
      },
      {
        id: 'nav-feedback',
        title: lang === 'km' ? 'ផ្តល់មតិកែលម្អបុគ្គលិក' : 'Give Employee Feedback',
        subtitle: lang === 'km' ? 'ចែករំលែកសំណើកែលម្អ ឬរាយការណ៍បញ្ហា' : 'Share usability suggestions or bug reports',
        icon: <MessageSquare className="w-4 h-4 text-rose-600" />,
        action: () => { onClose(); onOpenFeedback(); },
      },
      {
        id: 'nav-help',
        title: lang === 'km' ? 'មជ្ឈមណ្ឌលជំនួយ និងការណែនាំ' : 'Help Center & Tutorials',
        subtitle: lang === 'km' ? 'សៀវភៅណែនាំសម្រាប់វេនការងារ ភារកិច្ច និងផ្លូវកាត់' : 'Guides for shifts, tasks & shortcuts',
        icon: <HelpCircle className="w-4 h-4 text-cyan-600" />,
        action: () => { onClose(); onOpenHelp(); },
      },
    ];

    navShortcuts.forEach(n => {
      if (n.tab && !canRoleAccessTab(currentUser.role, n.tab)) return;
      if (!q || n.title.toLowerCase().includes(q) || n.subtitle.toLowerCase().includes(q)) {
        items.push({
          ...n,
          category: lang === 'km' ? 'ការរុករករហ័ស' : 'Quick Navigation',
        });
      }
    });

    // Action Plans
    allPlans.forEach(p => {
      if (!q || p.title.toLowerCase().includes(q) || p.planNumber.toLowerCase().includes(q)) {
        items.push({
          id: `plan-${p.id}`,
          category: lang === 'km' ? 'ផែនការសកម្មភាព' : 'Action Plans',
          title: `${p.planNumber}: ${p.title}`,
          subtitle: lang === 'km' 
            ? `ផុតកំណត់ ${p.dueDate} • ${p.status} (${p.completionPercentage}%)`
            : `Due ${p.dueDate} • ${p.status} (${p.completionPercentage}%)`,
          icon: <Layers className="w-4 h-4 text-blue-500" />,
          badge: p.status,
          action: () => {
            onNavigatePlan(p.id);
            onClose();
          },
        });
      }
    });

    // Activities
    allActivities.forEach(a => {
      if (!q || a.title.toLowerCase().includes(q) || a.code.toLowerCase().includes(q)) {
        items.push({
          id: `act-${a.id}`,
          category: lang === 'km' ? 'សកម្មភាព និងភារកិច្ច' : 'Activities & Tasks',
          title: `${a.code}: ${a.title}`,
          subtitle: lang === 'km'
            ? `វឌ្ឍនភាព៖ ${a.progressPercentage}% • ${a.status}`
            : `Progress: ${a.progressPercentage}% • ${a.status}`,
          icon: <CheckSquare className="w-4 h-4 text-amber-500" />,
          badge: `${a.progressPercentage}%`,
          action: () => {
            onNavigatePlan(a.actionPlanId);
            onClose();
          },
        });
      }
    });

    // Colleagues / Team
    const canViewEmployees = canRoleAccessTab(currentUser.role, 'employees');
    allUsers.forEach(u => {
      if (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.position?.toLowerCase().includes(q)) {
        items.push({
          id: `user-${u.id}`,
          category: lang === 'km' ? 'បញ្ជីឈ្មោះក្រុមការងារ' : 'Team Directory',
          title: u.name,
          subtitle: `${u.position || (lang === 'km' ? 'បុគ្គលិក' : 'Staff')} • ${u.role} (${u.email})`,
          icon: <Users className="w-4 h-4 text-emerald-500" />,
          badge: u.role,
          action: () => {
            if (canViewEmployees) {
              onNavigateTab('employees');
            }
            onClose();
          },
        });
      }
    });

    return items.slice(0, 25);
  }, [query, allPlans, allActivities, allUsers, todayAtt, onNavigateTab, onNavigatePlan, onClose, onOpenFeedback, onOpenHelp]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          results[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 sm:pt-20 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={lang === 'km' ? 'ស្វែងរកផែនការ ភារកិច្ច មិត្តរួមការងារ ឬវាយពាក្យបញ្ជា...' : 'Search plans, tasks, teammates, or type a command...'}
            className="flex-1 bg-transparent text-sm sm:text-base text-slate-800 placeholder:text-slate-400 focus:outline-hidden"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 text-xs font-semibold text-slate-500 bg-slate-200/70 hover:bg-slate-200 rounded-md"
          >
            {lang === 'km' ? 'បិទ (Esc)' : 'Esc'}
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100 divide-opacity-60 max-h-[60vh]">
          {results.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium">
                {lang === 'km' ? `រកមិនឃើញលទ្ធផលដែលត្រូវនឹង "${query}"` : `No matches found for "${query}"`}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {lang === 'km' ? 'សាកល្បងស្វែងរកឈ្មោះបុគ្គលិក លេខកូដផែនការ ឬ "វត្តមាន"' : "Try searching for an employee name, plan code, or 'attendance'"}
              </p>
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition ${
                    isSelected ? 'bg-blue-50/80 text-blue-900 shadow-2xs' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      isSelected ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold truncate">{item.title}</span>
                        {item.badge && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.subtitle}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0 ml-2">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold hidden sm:inline">
                      {item.category}
                    </span>
                    <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-600' : 'text-slate-300'}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center space-x-3">
            <span>
              <strong className="font-semibold text-slate-700">↑↓</strong>{' '}
              {lang === 'km' ? 'រុករក' : 'Navigate'}
            </span>
            <span>
              <strong className="font-semibold text-slate-700">↵</strong>{' '}
              {lang === 'km' ? 'ជ្រើសរើស' : 'Select'}
            </span>
            <span>
              <strong className="font-semibold text-slate-700">Esc</strong>{' '}
              {lang === 'km' ? 'បិទ' : 'Close'}
            </span>
          </div>
          <div className="text-[10px] text-slate-400">
            {lang === 'km' ? (
              <>
                ចុច <kbd className="px-1 py-0.5 bg-slate-200 text-slate-700 rounded-sm font-mono text-[9px]">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-slate-200 text-slate-700 rounded-sm font-mono text-[9px]">K</kbd> នៅគ្រប់ទីកន្លែង
              </>
            ) : (
              <>
                Press <kbd className="px-1 py-0.5 bg-slate-200 text-slate-700 rounded-sm font-mono text-[9px]">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-slate-200 text-slate-700 rounded-sm font-mono text-[9px]">K</kbd> anywhere
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
