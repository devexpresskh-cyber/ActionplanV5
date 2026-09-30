import { UserRole, NavTab, Language } from '../types';

export interface RoleMetadata {
  role: UserRole;
  level: number;
  badgeColor: string;
  badgeBg: string;
  description: string;
  accessTier: 'Root System Admin' | 'System Administration' | 'Department Governance' | 'Team Operations' | 'Individual Contributor' | 'Strategic Oversight';
  iconColor: string;
}

export const ROLE_DEFINITIONS: Record<UserRole, RoleMetadata> = {
  'Super Admin': {
    role: 'Super Admin',
    level: 6,
    badgeColor: 'text-purple-700 border-purple-200 bg-purple-50',
    badgeBg: 'bg-purple-600 text-white',
    description: 'Full root authority across all enterprise modules, security audit trails, and system settings.',
    accessTier: 'Root System Admin',
    iconColor: 'text-purple-500',
  },
  'Administrator': {
    role: 'Administrator',
    level: 5,
    badgeColor: 'text-blue-700 border-blue-200 bg-blue-50',
    badgeBg: 'bg-blue-600 text-white',
    description: 'System-wide governance over action plans, workflows, user accounts, and security logs.',
    accessTier: 'System Administration',
    iconColor: 'text-blue-500',
  },
  'Department Manager': {
    role: 'Department Manager',
    level: 4,
    badgeColor: 'text-emerald-700 border-emerald-200 bg-emerald-50',
    badgeBg: 'bg-emerald-600 text-white',
    description: 'Departmental leadership overseeing team plans, stage approvals, employee attendance, and reports.',
    accessTier: 'Department Governance',
    iconColor: 'text-emerald-500',
  },
  'Team Leader': {
    role: 'Team Leader',
    level: 3,
    badgeColor: 'text-amber-700 border-amber-200 bg-amber-50',
    badgeBg: 'bg-amber-600 text-white',
    description: 'Operational team supervisor guiding milestones, reviewing tasks, and tracking team shifts.',
    accessTier: 'Team Operations',
    iconColor: 'text-amber-500',
  },
  'Employee': {
    role: 'Employee',
    level: 2,
    badgeColor: 'text-cyan-700 border-cyan-200 bg-cyan-50',
    badgeBg: 'bg-cyan-600 text-white',
    description: 'Individual contributor focused on personal tasks, shifts, attendance, and feedback via Employee Hub.',
    accessTier: 'Individual Contributor',
    iconColor: 'text-cyan-500',
  },
  'Executive / Viewer': {
    role: 'Executive / Viewer',
    level: 1,
    badgeColor: 'text-slate-700 border-slate-200 bg-slate-100',
    badgeBg: 'bg-slate-700 text-white',
    description: 'Read-only strategic oversight over executive KPIs, timelines, progress charts, and enterprise reports.',
    accessTier: 'Strategic Oversight',
    iconColor: 'text-slate-500',
  },
};

export interface MenuTabRBACRule {
  tab: NavTab;
  title: string;
  category: 'Personal' | 'Operational' | 'Management' | 'Administration';
  allowedRoles: UserRole[];
  description: string;
  minimumLevel: number;
}

export const MENU_RBAC_POLICY: Record<NavTab, MenuTabRBACRule> = {
  'employee-hub': {
    tab: 'employee-hub',
    title: 'Employee Hub (Mobile)',
    category: 'Personal',
    allowedRoles: ['Super Admin', 'Administrator', 'Department Manager', 'Team Leader', 'Employee'],
    description: 'Daily shift clock-in/out, quick task sliders, leave requests, and feedback.',
    minimumLevel: 2,
  },
  'dashboard': {
    tab: 'dashboard',
    title: 'Executive Dashboard',
    category: 'Management',
    allowedRoles: ['Super Admin', 'Administrator', 'Department Manager', 'Team Leader', 'Executive / Viewer'],
    description: 'High-level business KPIs, quarterly completion rates, and department analytics.',
    minimumLevel: 1,
  },
  'attendance': {
    tab: 'attendance',
    title: 'Attendance & Time',
    category: 'Operational',
    allowedRoles: ['Super Admin', 'Administrator', 'Department Manager', 'Team Leader', 'Employee'],
    description: 'Work shifts, biometric/manual check-in logs, and monthly attendance summaries.',
    minimumLevel: 2,
  },
  'action-plans': {
    tab: 'action-plans',
    title: 'Action Plans Catalog',
    category: 'Operational',
    allowedRoles: ['Super Admin', 'Administrator', 'Department Manager', 'Team Leader', 'Employee', 'Executive / Viewer'],
    description: 'Strategic action plans, milestone weights, and assigned deliverables.',
    minimumLevel: 1,
  },
  'activities': {
    tab: 'activities',
    title: 'Activities & Tasks',
    category: 'Operational',
    allowedRoles: ['Super Admin', 'Administrator', 'Department Manager', 'Team Leader', 'Employee'],
    description: 'Tactical tasks, progress updates, evidence attachments, and team assignments.',
    minimumLevel: 2,
  },
  'progress': {
    tab: 'progress',
    title: 'Progress Tracking',
    category: 'Management',
    allowedRoles: ['Super Admin', 'Administrator', 'Department Manager', 'Team Leader', 'Executive / Viewer'],
    description: 'Weighted progress tracking, deviation indicators, and milestone completion.',
    minimumLevel: 1,
  },
  'approvals': {
    tab: 'approvals',
    title: 'Approval Workflow',
    category: 'Management',
    allowedRoles: ['Super Admin', 'Administrator', 'Department Manager'],
    description: 'Multi-stage plan approval, submission review, rejection, and final sign-off.',
    minimumLevel: 4,
  },
  'objectives': {
    tab: 'objectives',
    title: 'Organizational Objectives',
    category: 'Management',
    allowedRoles: ['Super Admin', 'Administrator', 'Department Manager', 'Executive / Viewer'],
    description: 'Strategic pillar alignment, multi-year objectives, and key performance metrics.',
    minimumLevel: 1,
  },
  'calendar-gantt': {
    tab: 'calendar-gantt',
    title: 'Calendar & Gantt',
    category: 'Operational',
    allowedRoles: ['Super Admin', 'Administrator', 'Department Manager', 'Team Leader', 'Executive / Viewer'],
    description: 'Interactive timeline Gantt visualization, monthly schedule, and deadline radar.',
    minimumLevel: 1,
  },
  'reports': {
    tab: 'reports',
    title: 'Reports & Exports',
    category: 'Management',
    allowedRoles: ['Super Admin', 'Administrator', 'Department Manager', 'Executive / Viewer'],
    description: 'Comprehensive attendance sheets, executive summary exports (PDF/CSV/Excel).',
    minimumLevel: 1,
  },
  'departments': {
    tab: 'departments',
    title: 'Departments & Units',
    category: 'Administration',
    allowedRoles: ['Super Admin', 'Administrator'],
    description: 'Enterprise organizational structure, business departments, and unit managers.',
    minimumLevel: 5,
  },
  'employees': {
    tab: 'employees',
    title: 'Staff Directory',
    category: 'Administration',
    allowedRoles: ['Super Admin', 'Administrator', 'Department Manager'],
    description: 'Employee directory, department assignments, and contact records.',
    minimumLevel: 4,
  },
  'audit-logs': {
    tab: 'audit-logs',
    title: 'Security Audit Logs',
    category: 'Administration',
    allowedRoles: ['Super Admin', 'Administrator'],
    description: 'Immutable system audit trail, security checks, IP tracking, and unauthorized access logs.',
    minimumLevel: 5,
  },
};

/**
 * Check if a specific role is allowed to access a given navigation menu tab.
 */
export function canRoleAccessTab(role: UserRole, tab: NavTab): boolean {
  const rule = MENU_RBAC_POLICY[tab];
  if (!rule) return false;
  return rule.allowedRoles.includes(role);
}

/**
 * Returns all accessible navigation tabs for a role.
 */
export function getAllowedTabsForRole(role: UserRole): NavTab[] {
  return (Object.keys(MENU_RBAC_POLICY) as NavTab[]).filter(tab => canRoleAccessTab(role, tab));
}

/**
 * Returns the default initial landing tab for a given role.
 */
export function getDefaultTabForRole(role: UserRole): NavTab {
  if (role === 'Employee') return 'employee-hub';
  if (role === 'Executive / Viewer') return 'dashboard';
  return 'dashboard';
}

/**
 * Returns list of roles required for a tab to display in access denied states.
 */
export function getRequiredRolesForTab(tab: NavTab): UserRole[] {
  const rule = MENU_RBAC_POLICY[tab];
  return rule ? rule.allowedRoles : ['Super Admin', 'Administrator'];
}

export const ROLE_DEFINITIONS_KM: Record<UserRole, { description: string; accessTier: string }> = {
  'Super Admin': {
    description: 'សិទ្ធិជា root ពេញលេញលើគ្រប់ម៉ូឌុលស្ថាប័ន កំណត់ហេតុសវនកម្មសុវត្ថិភាព និងការកំណត់ប្រព័ន្ធ។',
    accessTier: 'អ្នកគ្រប់គ្រងប្រព័ន្ធជាន់ខ្ពស់បំផុត (Root)',
  },
  'Administrator': {
    description: 'អភិបាលកិច្ចទូទាំងប្រព័ន្ធលើផែនការសកម្មភាព លំហូរការងារ គណនីអ្នកប្រើប្រាស់ និងកំណត់ហេតុសុវត្ថិភាព។',
    accessTier: 'ការគ្រប់គ្រងប្រព័ន្ធ',
  },
  'Department Manager': {
    description: 'ថ្នាក់ដឹកនាំនាយកដ្ឋានត្រួតពិនិត្យផែនការក្រុម ការអនុម័តដំណាក់កាល វត្តមានបុគ្គលិក និងរបាយការណ៍។',
    accessTier: 'អភិបាលកិច្ចនាយកដ្ឋាន',
  },
  'Team Leader': {
    description: 'អ្នកត្រួតពិនិត្យប្រតិបត្តិការក្រុម ណែនាំដំណាក់កាលការងារ ត្រួតពិនិត្យភារកិច្ច និងតាមដានវេនការងារក្រុម។',
    accessTier: 'ប្រតិបត្តិការក្រុម',
  },
  'Employee': {
    description: 'បុគ្គលិកប្រតិបត្តិផ្តោតលើភារកិច្ចផ្ទាល់ខ្លួន វេនការងារ វត្តមាន និងការផ្តល់មតិកែលម្អតាមរយៈមជ្ឈមណ្ឌលបុគ្គលិក។',
    accessTier: 'បុគ្គលិកប្រតិបត្តិ',
  },
  'Executive / Viewer': {
    description: 'សិទ្ធិអានយ៉ាងទូលំទូលាយលើសូចនាករ KPI យុទ្ធសាស្ត្រ បន្ទាត់ពេលវេលា គំនូសតាងវឌ្ឍនភាព និងរបាយការណ៍សហគ្រាស។',
    accessTier: 'ការត្រួតពិនិត្យយុទ្ធសាស្ត្រ',
  },
};

export const MENU_RBAC_POLICY_KM: Record<NavTab, { title: string; category: string; description: string }> = {
  'employee-hub': {
    title: 'មជ្ឈមណ្ឌលបុគ្គលិក (ទូរស័ព្ទ)',
    category: 'ផ្ទាល់ខ្លួន',
    description: 'កត់ត្រាម៉ោងចូល/ចេញប្រចាំថ្ងៃ របារកែប្រែភារកិច្ចរហ័ស ស្នើសុំច្បាប់ និងផ្តល់មតិកែលម្អ។',
  },
  'dashboard': {
    title: 'ផ្ទាំងព័ត៌មានទូទៅថ្នាក់ដឹកនាំ',
    category: 'ការគ្រប់គ្រង',
    description: 'សូចនាករ KPI អាជីវកម្មកម្រិតខ្ពស់ អត្រាសម្រេចប្រចាំត្រីមាស និងការវិភាគតាមនាយកដ្ឋាន។',
  },
  'attendance': {
    title: 'វត្តមាន និងម៉ោងធ្វើការ',
    category: 'ប្រតិបត្តិការ',
    description: 'វេនការងារ កំណត់ត្រាវត្តមានស្វ័យប្រវត្តិ/ដោយផ្ទាល់ និងរបាយការណ៍សង្ខេបប្រចាំខែ។',
  },
  'action-plans': {
    title: 'បញ្ជីផែនការសកម្មភាព',
    category: 'ប្រតិបត្តិការ',
    description: 'ផែនការសកម្មភាពយុទ្ធសាស្ត្រ ទម្ងន់នៃដំណាក់កាល និងលទ្ធផលការងារដែលបានចាត់តាំង។',
  },
  'activities': {
    title: 'សកម្មភាព និងភារកិច្ច',
    category: 'ប្រតិបត្តិការ',
    description: 'ភារកិច្ចយុទ្ធសាស្ត្រ ការធ្វើបច្ចុប្បន្នភាពវឌ្ឍនភាព ឯកសារភស្តុតាង និងការចាត់តាំងក្រុម។',
  },
  'progress': {
    title: 'ការតាមដានវឌ្ឍនភាព',
    category: 'ការគ្រប់គ្រង',
    description: 'ការតាមដានវឌ្ឍនភាពតាមទម្ងន់ សូចនាករគម្លាត និងការបញ្ចប់ដំណាក់កាលនីមួយៗ។',
  },
  'approvals': {
    title: 'ដំណើរការអនុម័ត',
    category: 'ការគ្រប់គ្រង',
    description: 'ការអនុម័តផែនការច្រើនដំណាក់កាល ការត្រួតពិនិត្យសំណើ ការបដិសេធ និងការចុះហត្ថលេខាបញ្ចប់។',
  },
  'objectives': {
    title: 'គោលបំណងស្ថាប័ន',
    category: 'ការគ្រប់គ្រង',
    description: 'ការតម្រឹមតាមសរសរស្ដម្ភយុទ្ធសាស្ត្រ គោលដៅពហុឆ្នាំ និងសូចនាករគន្លឹះវាស់វែងលទ្ធផល។',
  },
  'calendar-gantt': {
    title: 'ប្រតិទិន និងគំនូសតាង Gantt',
    category: 'ប្រតិបត្តិការ',
    description: 'គំនូសតាង Gantt អន្តរកម្មតាមពេលវេលា កាលវិភាគប្រចាំខែ និងរ៉ាដាកាលកំណត់។',
  },
  'reports': {
    title: 'របាយការណ៍ និងការទាញយក',
    category: 'ការគ្រប់គ្រង',
    description: 'តារាងវត្តមានលម្អិត ការទាញយករបាយការណ៍សង្ខេបសម្រាប់ថ្នាក់ដឹកនាំ (PDF/CSV/Excel)។',
  },
  'departments': {
    title: 'នាយកដ្ឋាន និងផ្នែក',
    category: 'រដ្ឋបាលប្រព័ន្ធ',
    description: 'រចនាសម្ព័ន្ធស្ថាប័នសហគ្រាស នាយកដ្ឋានអាជីវកម្ម និងប្រធានគ្រប់គ្រងអង្គភាព។',
  },
  'employees': {
    title: 'បញ្ជីឈ្មោះបុគ្គលិក',
    category: 'រដ្ឋបាលប្រព័ន្ធ',
    description: 'បញ្ជីឈ្មោះបុគ្គលិក ការចាត់តាំងនាយកដ្ឋាន និងព័ត៌មានទំនាក់ទំនង។',
  },
  'audit-logs': {
    title: 'កំណត់ហេតុសវនកម្មសុវត្ថិភាព',
    category: 'រដ្ឋបាលប្រព័ន្ធ',
    description: 'ប្រវត្តិសវនកម្មប្រព័ន្ធដែលមិនអាចកែប្រែបាន ការត្រួតពិនិត្យសុវត្ថិភាព ការតាមដាន IP និងកំណត់ហេតុចូលប្រើដោយគ្មានសិទ្ធិ។',
  },
};

export function getMenuTitle(tab: NavTab, lang: Language = 'en'): string {
  if (lang === 'km' && MENU_RBAC_POLICY_KM[tab]) {
    return MENU_RBAC_POLICY_KM[tab].title;
  }
  return MENU_RBAC_POLICY[tab]?.title || tab;
}

export function getMenuDescription(tab: NavTab, lang: Language = 'en'): string {
  if (lang === 'km' && MENU_RBAC_POLICY_KM[tab]) {
    return MENU_RBAC_POLICY_KM[tab].description;
  }
  return MENU_RBAC_POLICY[tab]?.description || '';
}

export function getMenuCategory(category: string, lang: Language = 'en'): string {
  if (lang === 'km') {
    switch (category) {
      case 'Personal': return 'ផ្ទាល់ខ្លួន';
      case 'Operational': return 'ប្រតិបត្តិការ';
      case 'Management': return 'ការគ្រប់គ្រង';
      case 'Administration': return 'រដ្ឋបាលប្រព័ន្ធ';
      default: return category;
    }
  }
  return category;
}

export function getRoleTitle(role: UserRole, lang: Language = 'en'): string {
  if (lang === 'km') {
    switch (role) {
      case 'Super Admin': return 'អ្នកគ្រប់គ្រងជាន់ខ្ពស់ (Super Admin)';
      case 'Administrator': return 'អ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin)';
      case 'Department Manager': return 'ប្រធាននាយកដ្ឋាន (Manager)';
      case 'Team Leader': return 'ប្រធានក្រុម (Team Leader)';
      case 'Employee': return 'បុគ្គលិកប្រតិបត្តិ (Employee)';
      case 'Executive / Viewer': return 'ថ្នាក់ដឹកនាំ / អ្នកមើល (Viewer)';
      default: return role;
    }
  }
  return role;
}

export function getRoleDescription(role: UserRole, lang: Language = 'en'): string {
  if (lang === 'km' && ROLE_DEFINITIONS_KM[role]) {
    return ROLE_DEFINITIONS_KM[role].description;
  }
  return ROLE_DEFINITIONS[role]?.description || '';
}

export function getRoleAccessTier(role: UserRole, lang: Language = 'en'): string {
  if (lang === 'km' && ROLE_DEFINITIONS_KM[role]) {
    return ROLE_DEFINITIONS_KM[role].accessTier;
  }
  return ROLE_DEFINITIONS[role]?.accessTier || '';
}
