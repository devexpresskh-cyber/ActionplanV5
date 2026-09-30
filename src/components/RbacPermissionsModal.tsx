import React, { useState } from 'react';
import { 
  Shield, 
  X, 
  Check, 
  Lock, 
  AlertTriangle, 
  Search, 
  Users, 
  Sliders, 
  LockKeyhole, 
  FileText, 
  Smartphone, 
  Eye,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { User, UserRole, NavTab, Language } from '../types';
import { 
  ROLE_DEFINITIONS, 
  MENU_RBAC_POLICY, 
  canRoleAccessTab, 
  getAllowedTabsForRole,
  getMenuTitle,
  getMenuDescription,
  getRoleDescription,
  getRoleAccessTier,
  getRoleTitle
} from '../services/rbac';
import { db } from '../services/db';

interface RbacPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSwitchUser?: (newUser: User) => void;
  lang?: Language;
}

const ALL_ROLES: UserRole[] = [
  'Super Admin',
  'Administrator',
  'Department Manager',
  'Team Leader',
  'Employee',
  'Executive / Viewer'
];

export const RbacPermissionsModal: React.FC<RbacPermissionsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSwitchUser,
  lang: propLang = 'en',
}) => {
  const lang: Language = (propLang as Language) || 'en';
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentUser.role);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStrategyTab, setActiveStrategyTab] = useState<'matrix' | 'strategies'>('matrix');

  if (!isOpen) return null;

  const usersList = db.getUsers();
  const menuKeys = Object.keys(MENU_RBAC_POLICY) as NavTab[];
  const roleMeta = ROLE_DEFINITIONS[selectedRole];
  const allowedTabs = getAllowedTabsForRole(selectedRole);

  const filteredMenuKeys = menuKeys.filter(tab => {
    const item = MENU_RBAC_POLICY[tab];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
  });

  const handleRoleQuickSwitch = (role: UserRole) => {
    setSelectedRole(role);
    if (onSwitchUser) {
      const match = usersList.find(u => u.role === role);
      if (match) {
        const switched = db.switchUser(match.id);
        onSwitchUser(switched);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {lang === 'km' ? 'រចនាសម្ព័ន្ធគ្រប់គ្រងសិទ្ធិតាមតួនាទី (RBAC)' : 'Role-Based Access Control (RBAC) Architecture'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-400/30">
                  {lang === 'km' ? 'ប្រព័ន្ធការពារសុវត្ថិភាពសកម្ម' : 'Security Guard Active'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {lang === 'km'
                  ? 'ការអនុវត្តសិទ្ធិច្រើនកម្រិត ការបង្ហាញម៉ឺនុយបែបថាមវន្ត និងការផ្ទៀងផ្ទាត់សុវត្ថិភាពទាំងពីរផ្នែក។'
                  : 'Multi-tier permission enforcement, dynamic navigation rendering, and double-sided validation.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher & Quick Role Selector */}
        <div className="bg-slate-50 p-3 sm:px-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveStrategyTab('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                activeStrategyTab === 'matrix' 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>
                {lang === 'km' 
                  ? `តារាងសិទ្ធិអនុញ្ញាត (${allowedTabs.length}/13 អាចចូលបាន)` 
                  : `Permission Matrix (${allowedTabs.length}/13 Accessible)`}
              </span>
            </button>
            <button
              onClick={() => setActiveStrategyTab('strategies')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                activeStrategyTab === 'strategies' 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? 'យុទ្ធសាស្ត្រសុវត្ថិភាពទាំង ៦' : '6 Security Strategies'}</span>
            </button>
          </div>

          {/* Quick Role Simulation Selector */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500 font-semibold hidden sm:inline">
              {lang === 'km' ? 'តួនាទីសាកល្បង៖' : 'Active Test Role:'}
            </span>
            <select
              value={selectedRole}
              onChange={e => handleRoleQuickSwitch(e.target.value as UserRole)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 text-xs shadow-xs"
            >
              {ALL_ROLES.map(r => (
                <option key={r} value={r}>
                  {getRoleTitle(r, lang)} {r === currentUser.role ? (lang === 'km' ? '(បច្ចុប្បន្ន)' : '(Current)') : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {activeStrategyTab === 'matrix' ? (
            <>
              {/* Active Role Summary Card */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-extrabold ${roleMeta?.badgeBg || 'bg-blue-600 text-white'}`}>
                      {getRoleTitle(selectedRole, lang)}
                    </span>
                    <span className="text-xs text-slate-300 font-medium">
                      {lang === 'km' ? 'កម្រិតសិទ្ធិ៖' : 'Tier Level:'}{' '}
                      <strong className="text-white">
                        {roleMeta?.level} {lang === 'km' ? 'នៃ' : 'of'} 6
                      </strong>{' '}
                      ({getRoleAccessTier(selectedRole, lang) || roleMeta?.accessTier})
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 max-w-2xl leading-relaxed">
                    {getRoleDescription(selectedRole, lang) || roleMeta?.description}
                  </p>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <div className="bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-700 text-center">
                    <div className="text-base font-black text-emerald-400 font-mono">
                      {allowedTabs.length}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                      {lang === 'km' ? 'អាចចូលបាន' : 'Accessible'}
                    </div>
                  </div>
                  <div className="bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-700 text-center">
                    <div className="text-base font-black text-rose-400 font-mono">
                      {13 - allowedTabs.length}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                      {lang === 'km' ? 'ត្រូវបានកម្រិត' : 'Restricted'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Search Bar for Matrix */}
              <div className="flex items-center justify-between gap-3 text-xs">
                <div className="relative w-full max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={lang === 'km' ? 'ស្វែងរកម៉ូឌុលម៉ឺនុយ (ឧ. វត្តមាន, សវនកម្ម, ការអនុម័ត)...' : 'Filter menu modules (e.g. attendance, audit, approvals)...'}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>
                <div className="text-slate-500 font-medium hidden sm:block">
                  {lang === 'km' ? (
                    <>កំពុងបង្ហាញ <strong className="text-slate-900">{filteredMenuKeys.length}</strong> ម៉ូឌុល</>
                  ) : (
                    <>Showing <strong className="text-slate-900">{filteredMenuKeys.length}</strong> modules</>
                  )}
                </div>
              </div>

              {/* Permissions Matrix Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4 min-w-[200px]">{lang === 'km' ? 'ម៉ូឌុលរុករក' : 'Navigation Module'}</th>
                        <th className="py-3 px-3 text-center min-w-[100px]">{lang === 'km' ? 'ប្រភេទ' : 'Category'}</th>
                        <th className="py-3 px-3 text-center min-w-[120px] bg-blue-50/70 text-blue-900 border-x border-blue-200">
                          {selectedRole} ({lang === 'km' ? 'សកម្ម' : 'Active'})
                        </th>
                        {ALL_ROLES.filter(r => r !== selectedRole).map(role => (
                          <th key={role} className="py-3 px-3 text-center min-w-[100px] text-slate-500 font-medium">
                            {role}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMenuKeys.map(tab => {
                        const rule = MENU_RBAC_POLICY[tab];
                        const isAccessible = canRoleAccessTab(selectedRole, tab);
                        const categoryLabel = lang === 'km' ? (
                          rule.category === 'Administration' ? 'រដ្ឋបាល' :
                          rule.category === 'Management' ? 'ការគ្រប់គ្រង' :
                          rule.category === 'Operational' ? 'ប្រតិបត្តិការ' :
                          'ការវិភាគ'
                        ) : rule.category;

                        return (
                          <tr key={tab} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{getMenuTitle(tab, lang)}</div>
                              <div className="text-[11px] text-slate-500 line-clamp-1">{getMenuDescription(tab, lang)}</div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                rule.category === 'Administration' ? 'bg-purple-100 text-purple-800' :
                                rule.category === 'Management' ? 'bg-blue-100 text-blue-800' :
                                rule.category === 'Operational' ? 'bg-amber-100 text-amber-800' :
                                'bg-cyan-100 text-cyan-800'
                              }`}>
                                {categoryLabel}
                              </span>
                            </td>

                            {/* Active Role Cell */}
                            <td className={`py-3 px-3 text-center border-x border-blue-200 font-bold ${
                              isAccessible ? 'bg-emerald-50/50' : 'bg-rose-50/50'
                            }`}>
                              {isAccessible ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px]">
                                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                                  <span>{lang === 'km' ? 'អនុញ្ញាត' : 'Allowed'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[11px]">
                                  <Lock className="w-3.5 h-3.5 text-rose-600" />
                                  <span>{lang === 'km' ? 'កម្រិត' : 'Restricted'}</span>
                                </span>
                              )}
                            </td>

                            {/* Other Roles Cells */}
                            {ALL_ROLES.filter(r => r !== selectedRole).map(role => {
                              const allowed = canRoleAccessTab(role, tab);
                              return (
                                <td key={role} className="py-3 px-3 text-center">
                                  {allowed ? (
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-700" title={lang === 'km' ? 'អនុញ្ញាត' : 'Allowed'}>
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400" title={lang === 'km' ? 'កម្រិត' : 'Restricted'}>
                                      <Lock className="w-3 h-3 text-slate-400" />
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            /* 6 Architectural Strategies Breakdown */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. RBAC */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
                  <div className="flex items-center space-x-2 text-blue-600 font-black text-sm">
                    <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">1</div>
                    <h3>{lang === 'km' ? 'ការគ្រប់គ្រងសិទ្ធិតាមតួនាទី (RBAC)' : 'Role-Based Access Control (RBAC)'}</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {lang === 'km'
                      ? 'តួនាទីទាំង ៦ ត្រូវបានបែងចែកយ៉ាងច្បាស់លាស់ (Super Admin, Administrator, Department Manager, Team Leader, Employee, Executive / Viewer) ភ្ជាប់ជាមួយសិទ្ធិលម្អិតសម្រាប់ម៉ឺនុយ ការអនុម័ត និងកំណត់ត្រាទិន្នន័យ។'
                      : '6 clearly classified roles (Super Admin, Administrator, Department Manager, Team Leader, Employee, Executive / Viewer) mapped to granular permissions dictating menu items, approvals, and data records.'}
                  </p>
                </div>

                {/* 2. Dynamic Menu Rendering */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-600 font-black text-sm">
                    <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold">2</div>
                    <h3>{lang === 'km' ? 'ការបង្ហាញម៉ឺនុយបែបថាមវន្ត (Dynamic Menu Rendering)' : 'Dynamic Menu Rendering'}</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {lang === 'km'
                      ? 'ផ្ទាំងម៉ឺនុយនៅរបារចំហៀង កម្មវិធីទូរស័ព្ទ និងរបាររុករកខាងក្រោម ត្រូវបានវាយតម្លៃតាមតួនាទីអ្នកប្រើភ្លាមៗក្នុងពេលជាក់ស្តែង។ ផ្ទាំងដែលគ្មានសិទ្ធិនឹងត្រូវលាក់ ឬបង្ហាញសញ្ញាចាក់សោតាមការជ្រើសរើសរបស់អ្នកប្រើ។'
                      : 'Navigation menus in the desktop sidebar, mobile drawer, and bottom navigation bar dynamically evaluate the user role in real time. Items without permission are either hidden or visibly flagged with lock states according to user preference.'}
                  </p>
                </div>

                {/* 3. User Authentication */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
                  <div className="flex items-center space-x-2 text-indigo-600 font-black text-sm">
                    <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold">3</div>
                    <h3>{lang === 'km' ? 'ការផ្ទៀងផ្ទាត់អត្តសញ្ញាណអ្នកប្រើប្រាស់ (User Authentication)' : 'User Authentication Verification'}</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {lang === 'km'
                      ? 'ទំព័រផ្ទៀងផ្ទាត់អត្តសញ្ញាណ (AuthPortal) ផ្ទៀងផ្ទាត់ព័ត៌មានសម្ងាត់ ពាក្យសម្ងាត់ ស្ថានភាពគណនី និងសញ្ញាសម្ងាត់សម័យការងារមុនពេលបង្ហាញកន្លែងការងារ ឬសមាសភាគម៉ឺនុយណាមួយ។'
                      : 'Mandatory authentication portal (AuthPortal) verifies credentials, passwords, active account status, and session tokens before rendering any application workspace or menu component.'}
                  </p>
                </div>

                {/* 4. Frontend & Backend Validation */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
                  <div className="flex items-center space-x-2 text-rose-600 font-black text-sm">
                    <div className="w-6 h-6 rounded-md bg-rose-100 flex items-center justify-center text-rose-700 text-xs font-bold">4</div>
                    <h3>{lang === 'km' ? 'ការការពារផ្លូវរុករកទាំងផ្នែកមុខ និងផ្នែកក្រោយ (Route Guards)' : 'Frontend & Backend Route Guards'}</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {lang === 'km'
                      ? 'ប្រព័ន្ធការពារសុវត្ថិភាពនៅ App.tsx និង db.ts ចាប់យកការប៉ុនប៉ងកែប្រែ URL hash ដោយផ្ទាល់ (ឧ. បុគ្គលិកវាយបញ្ចូល /#audit-logs)។ សំណើគ្មានសិទ្ធិនឹងបង្កកភ្លាមៗទៅអេក្រង់ 403 Forbidden និងរារាំងទិន្នន័យ។'
                      : 'Tamper-proof route guard in App.tsx and db.ts catches direct URL hash manipulation (e.g. an employee typing /#audit-logs). Unpermitted requests trigger an immediate 403 Forbidden screen and block data retrieval.'}
                  </p>
                </div>

                {/* 5. Audit and Logging */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
                  <div className="flex items-center space-x-2 text-amber-600 font-black text-sm">
                    <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-bold">5</div>
                    <h3>{lang === 'km' ? 'កំណត់ហេតុសវនកម្ម និងការតាមដានការប៉ុនប៉ងចូលប្រើ (Audit Trail)' : 'Audit Trail & Tampering Logging'}</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {lang === 'km'
                      ? 'រាល់ការរុករកម៉ឺនុយ និងការប៉ុនប៉ងចូលប្រើដោយគ្មានសិទ្ធិ ត្រូវបានកត់ត្រាដោយស្វ័យប្រវត្តិទៅក្នុងកំណត់ហេតុសវនកម្ម (ActivityLog) ជាមួយនឹងលេខសម្គាល់អ្នកប្រើ តួនាទី ម៉ូឌុល និង IP សម្រាប់ត្រួតពិនិត្យសុវត្ថិភាព។'
                      : 'Every menu navigation and unauthorized access attempt is automatically written to the immutable system audit log (ActivityLog) with user ID, role, attempted module, and client IP for security auditing.'}
                  </p>
                </div>

                {/* 6. User Interface Design */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
                  <div className="flex items-center space-x-2 text-cyan-600 font-black text-sm">
                    <div className="w-6 h-6 rounded-md bg-cyan-100 flex items-center justify-center text-cyan-700 text-xs font-bold">6</div>
                    <h3>{lang === 'km' ? 'តម្លាភាពនៃចំណុចប្រទាក់អ្នកប្រើ (UI Transparency)' : 'User Interface Transparency'}</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {lang === 'km'
                      ? 'ម៉ឺនុយមានផ្លាកសញ្ញាតួនាទីសកម្ម ចំនួនរាប់សិទ្ធិ និងសញ្ញាចាក់សោច្បាស់លាស់ ដូច្នេះអ្នកប្រើប្រាស់តែងតែដឹងអំពីដែនកំណត់របស់ពួកគេ។ នៅក្នុងផ្ទាំងបញ្ជា (Ctrl+K) ផ្លូវកាត់ត្រូវបានច្រោះសម្រាប់តែធាតុដែលមានសិទ្ធិប៉ុណ្ណោះ។'
                      : 'Menus feature active role badges, permission counters, and lock indicators so users always understand their boundaries. In the Command Palette (Ctrl+K), shortcuts are filtered to only permitted items.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <span>APMS Enterprise Security Layer • RBAC Engine v1.0</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition shadow-xs"
          >
            {lang === 'km' ? 'រួចរាល់' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
