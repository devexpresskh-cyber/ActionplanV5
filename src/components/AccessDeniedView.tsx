import React from 'react';
import { ShieldAlert, Lock, ArrowLeft, Eye, ShieldCheck, AlertOctagon } from 'lucide-react';
import { User, NavTab, Language } from '../types';
import { 
  MENU_RBAC_POLICY, 
  ROLE_DEFINITIONS, 
  getDefaultTabForRole,
  getMenuTitle,
  getMenuDescription,
  getRoleAccessTier,
  getRoleTitle
} from '../services/rbac';

interface AccessDeniedViewProps {
  currentUser: User;
  attemptedTab: NavTab;
  lang: Language;
  onNavigateHome: (tab: NavTab) => void;
  onOpenRbacMatrix: () => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  currentUser,
  attemptedTab,
  lang,
  onNavigateHome,
  onOpenRbacMatrix,
}) => {
  const rule = MENU_RBAC_POLICY[attemptedTab];
  const roleMeta = ROLE_DEFINITIONS[currentUser.role];
  const homeTab = getDefaultTabForRole(currentUser.role);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="bg-white rounded-2xl border border-rose-200 shadow-xl overflow-hidden">
        {/* Security Warning Banner */}
        <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 text-white p-6 sm:p-8">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-white/15 rounded-2xl backdrop-blur-xs shrink-0 border border-white/20">
              <ShieldAlert className="w-8 h-8 sm:w-10 sm:h-10 text-rose-100" />
            </div>
            <div className="flex-1">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-rose-900/60 border border-rose-400/40 text-[11px] font-bold tracking-wider uppercase text-rose-200 mb-2">
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>{lang === 'km' ? 'សេចក្តីជូនដំណឹងសុវត្ថិភាព៖ 403 ត្រូវបានហាមឃាត់' : 'Security Notice: 403 Forbidden'}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {lang === 'km' ? 'បដិសេធការចូលប្រើ៖ ម៉ូឌុលត្រូវបានកម្រិត' : 'Access Denied: Restricted Module'}
              </h1>
              <p className="text-rose-100 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                {lang === 'km'
                  ? 'តួនាទីបច្ចុប្បន្នរបស់អ្នកមិនមានសិទ្ធិអនុញ្ញាតដើម្បីមើល ឬកែប្រែផ្ទាំងម៉ឺនុយដែលបានស្នើសុំទេ។ ការកម្រិតសុវត្ថិភាពនេះត្រូវបានអនុវត្តដោយផ្អែកលើគោលការណ៍គ្រប់គ្រងសិទ្ធិតាមតួនាទី (RBAC) របស់ស្ថាប័ន។'
                  : 'Your current role does not have authorization to view or manipulate the requested menu tab. This security restriction is enforced by enterprise Role-Based Access Control (RBAC) policies.'}
              </p>
            </div>
          </div>
        </div>

        {/* Security Diagnostics & Reason */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                {lang === 'km' ? 'ម៉ូឌុលដែលបានស្នើសុំ' : 'Requested Module'}
              </div>
              <div className="text-base font-black text-slate-900 flex items-center space-x-2">
                <Lock className="w-4 h-4 text-rose-500" />
                <span>{getMenuTitle(attemptedTab, lang)}</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {getMenuDescription(attemptedTab, lang) || (lang === 'km' ? 'ម៉ូឌុលប្រព័ន្ធត្រូវបានការពារ' : 'Protected system module')}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                {lang === 'km' ? 'សម័យការងារសកម្មរបស់អ្នក' : 'Your Active Session'}
              </div>
              <div className="text-base font-black text-slate-900 flex items-center space-x-2">
                <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${roleMeta?.badgeBg || 'bg-slate-700 text-white'}`}>
                  {getRoleTitle(currentUser.role, lang)}
                </span>
                <span className="text-xs text-slate-500 truncate max-w-[140px]">({currentUser.name})</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {getRoleAccessTier(currentUser.role, lang) || roleMeta?.accessTier || 'Assigned Access Tier'}
              </p>
            </div>
          </div>

          {/* Detailed Policy Comparison */}
          <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 text-xs space-y-2">
            <div className="font-bold text-rose-900 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{lang === 'km' ? 'លក្ខខណ្ឌតម្រូវនៃសិទ្ធិអនុញ្ញាត៖' : 'Authorization Requirement:'}</span>
            </div>
            <p className="text-rose-800 leading-relaxed pl-6">
              {lang === 'km'
                ? 'ម៉ូឌុលនេះត្រូវបានកម្រិតយ៉ាងតឹងរ៉ឹងសម្រាប់តែអ្នកប្រើប្រាស់ដែលមានតួនាទីដូចខាងក្រោមប៉ុណ្ណោះ៖ '
                : 'This module is strictly restricted to users with the following roles: '}
              <strong className="font-bold text-rose-950">
                {rule ? rule.allowedRoles.map(r => getRoleTitle(r, lang)).join(', ') : 'Super Admin, Administrator'}
              </strong>
              .
            </p>
            <div className="pl-6 text-[11px] text-rose-700 font-mono">
              {lang === 'km' ? (
                <>ព្រឹត្តិការណ៍ត្រូវបានកត់ត្រា៖ <span className="font-bold">UNAUTHORIZED_MENU_ACCESS_ATTEMPT</span> • IP ប្រព័ន្ធ៖ 192.168.1.100 • បានធ្វើសវនកម្ម</>
              ) : (
                <>Event logged: <span className="font-bold">UNAUTHORIZED_MENU_ACCESS_ATTEMPT</span> • System IP: 192.168.1.100 • Audited</>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => onNavigateHome(homeTab)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs flex items-center justify-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{lang === 'km' ? 'ត្រឡប់ទៅកន្លែងការងារដែលមានសិទ្ធិ' : 'Return to My Authorized Workspace'}</span>
            </button>

            {currentUser.role !== 'Employee' && (
              <button
                onClick={onOpenRbacMatrix}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center space-x-2"
              >
                <Eye className="w-4 h-4 text-slate-500" />
                <span>{lang === 'km' ? 'ពិនិត្យតារាងសិទ្ធិអនុញ្ញាតតាមតួនាទី' : 'Inspect Role Permissions Matrix'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
