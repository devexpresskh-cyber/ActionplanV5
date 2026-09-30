import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Globe, 
  Laptop, 
  Database, 
  ChevronDown,
  Lock,
  ShieldCheck,
  AlertTriangle,
  Compass
} from 'lucide-react';
import { AuditLog, Language, User as UserType } from '../types';
import { translations } from '../services/i18n';
import { db } from '../services/db';

interface AuditLogsViewProps {
  currentUser: UserType;
  lang: Language;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ currentUser, lang }) => {
  const t = translations[lang];
  const logs = db.getAuditLogs();
  const users = db.getUsers();

  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const securityIncidentsCount = useMemo(() => {
    return logs.filter(l => l.action.toLowerCase().includes('unauthorized') || l.action.toLowerCase().includes('denied')).length;
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (filterAction === 'security') {
        if (!l.action.toLowerCase().includes('unauthorized') && !l.action.toLowerCase().includes('denied') && !l.module?.toLowerCase().includes('security')) {
          return false;
        }
      } else if (filterAction === 'navigation') {
        if (!l.action.toLowerCase().includes('menu') && !l.module?.toLowerCase().includes('navigation')) {
          return false;
        }
      } else if (filterAction !== 'all' && !l.action.toLowerCase().includes(filterAction.toLowerCase())) {
        return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          l.action.toLowerCase().includes(q) ||
          (l.module && l.module.toLowerCase().includes(q)) ||
          (l.details && l.details.toLowerCase().includes(q)) ||
          (l.userName && l.userName.toLowerCase().includes(q)) ||
          (l.ipAddress && l.ipAddress.includes(q))
        );
      }
      return true;
    });
  }, [logs, filterAction, search]);

  const formatActionLabel = (action: string) => {
    if (lang !== 'km') return action;
    if (action === 'MENU_ACCESS') return 'ចូលប្រើម៉ឺនុយ';
    if (action.includes('UNAUTHORIZED') || action.includes('DENIED')) return 'បានរារាំងការចូលប្រើគ្មានសិទ្ធិ';
    if (action === 'Created Action Plan') return 'បានបង្កើតផែនការសកម្មភាព';
    if (action === 'Updated Action Plan') return 'បានកែប្រែផែនការសកម្មភាព';
    if (action === 'Approved Action Plan') return 'បានអនុម័តផែនការសកម្មភាព';
    if (action === 'Rejected Action Plan') return 'បានបដិសេធផែនការសកម្មភាព';
    if (action === 'Deleted Action Plan') return 'បានលុបផែនការសកម្មភាព';
    if (action === 'Created Activity') return 'បានបង្កើតសកម្មភាព';
    if (action === 'Updated Activity') return 'បានកែប្រែសកម្មភាព';
    if (action === 'Deleted Activity') return 'បានលុបសកម្មភាព';
    if (action.includes('Progress Update')) return 'កត់ត្រាវឌ្ឍនភាព';
    if (action.includes('Approved')) return 'បានអនុម័ត';
    if (action.includes('Rejected')) return 'បានបដិសេធ';
    return action;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {t.auditLogs} {lang === 'km' ? '(សុវត្ថិភាពប្រព័ន្ធ និងកំណត់ត្រាចូលប្រើ)' : '(System Security & Access Trail)'}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
              {lang === 'km' ? 'សវនកម្ម RBAC' : 'RBAC Audited'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === 'km'
              ? 'ការតាមដានមិនអាចកែប្រែបាននៃការចូលប្រើម៉ឺនុយ ការអនុញ្ញាតផ្លូវរុករក ការផ្លាស់ប្តូរស្ថានភាព ការអនុម័ត និងការប៉ុនប៉ងកែប្រែដោយគ្មានការអនុញ្ញាត។'
              : 'Immutable tracking of menu access, route authorizations, state changes, approvals, and unauthorized tampering attempts.'}
          </p>
        </div>

        {/* Security Metrics Pill */}
        <div className="flex items-center space-x-3 text-xs shrink-0">
          <div className={`p-2.5 px-3.5 rounded-xl border flex items-center space-x-2 ${
            securityIncidentsCount > 0 
              ? 'bg-rose-50 border-rose-200 text-rose-800' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            {securityIncidentsCount > 0 ? (
              <ShieldAlert className="w-4 h-4 text-rose-600 animate-pulse" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            )}
            <span className="font-bold">
              {lang === 'km' 
                ? `បានរារាំងការរំលោភសិទ្ធិ ${securityIncidentsCount} លើក`
                : `${securityIncidentsCount} Access Violation${securityIncidentsCount === 1 ? '' : 's'} Intercepted`}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative w-full max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={lang === 'km' ? 'ស្វែងរកសកម្មភាព អ្នកប្រើប្រាស់ ម៉ូឌុល ឬព័ត៌មានលម្អិត...' : 'Search action, user, module or details...'}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-slate-500 font-medium">
            {lang === 'km' ? 'ប្រភេទតម្រង៖' : 'Filter Category:'}
          </span>
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-700 focus:outline-hidden text-xs"
          >
            <option value="all">
              {lang === 'km' ? `កំណត់ហេតុទាំងអស់ (${logs.length})` : `All Logs (${logs.length})`}
            </option>
            <option value="security">
              {lang === 'km' ? `សុវត្ថិភាព & ការបំពានការចូលប្រើ (${securityIncidentsCount})` : `Security & Access Violations (${securityIncidentsCount})`}
            </option>
            <option value="navigation">
              {lang === 'km' ? 'ការរុករកម៉ឺនុយ' : 'Menu Navigations'}
            </option>
            <option value="created">
              {lang === 'km' ? 'កំណត់ត្រាដែលបានបង្កើត' : 'Created Records'}
            </option>
            <option value="updated">
              {lang === 'km' ? 'កំណត់ត្រាដែលបានកែប្រែ' : 'Updated Records'}
            </option>
            <option value="approved">
              {lang === 'km' ? 'លំហូរការងារដែលបានអនុម័ត' : 'Approved Workflows'}
            </option>
            <option value="rejected">
              {lang === 'km' ? 'លំហូរការងារដែលបានបដិសេធ' : 'Rejected Workflows'}
            </option>
            <option value="deleted">
              {lang === 'km' ? 'កំណត់ត្រាដែលបានលុប' : 'Deleted Records'}
            </option>
          </select>
        </div>
      </div>

      {/* Log list */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">{lang === 'km' ? 'កាលបរិច្ឆេទ & ម៉ោង' : 'Timestamp'}</th>
                <th className="py-3 px-4">{lang === 'km' ? 'អ្នកប្រើប្រាស់ & តួនាទី' : 'User & Role'}</th>
                <th className="py-3 px-4">{lang === 'km' ? 'សកម្មភាព' : 'Action'}</th>
                <th className="py-3 px-4">{lang === 'km' ? 'ធាតុ / ម៉ូឌុល' : 'Entity / Module'}</th>
                <th className="py-3 px-4">{lang === 'km' ? 'IP ម៉ាស៊ីនភ្ញៀវ' : 'Client IP'}</th>
                <th className="py-3 px-4 text-right">{lang === 'km' ? 'ព័ត៌មានលម្អិត' : 'Details'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    {lang === 'km' ? 'មិនមានកំណត់ត្រាសវនកម្មត្រូវគ្នានឹងតម្រងបច្ចុប្បន្នទេ។' : 'No audit log records match the current filter.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const user = users.find(u => u.id === log.userId);
                  const isExpanded = expandedLogId === log.id;
                  const isSecurityViolation = log.action.toLowerCase().includes('unauthorized') || log.action.toLowerCase().includes('denied');
                  const isMenuNav = log.action === 'MENU_ACCESS';

                  return (
                    <React.Fragment key={log.id}>
                      <tr 
                        className={`hover:bg-slate-50 transition cursor-pointer ${
                          isSecurityViolation ? 'bg-rose-50/30' : ''
                        }`} 
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      >
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 flex items-center space-x-1.5">
                            <span>{log.userName || user?.name || (lang === 'km' ? 'អ្នកប្រើប្រាស់ប្រព័ន្ធ' : 'System User')}</span>
                            {user && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                {user.role}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {isSecurityViolation ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded font-bold text-[10px] bg-rose-100 text-rose-800 border border-rose-200">
                              <Lock className="w-3 h-3 text-rose-600" />
                              <span>{formatActionLabel(log.action)}</span>
                            </span>
                          ) : isMenuNav ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded font-bold text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                              <Compass className="w-3 h-3 text-blue-500" />
                              <span>{formatActionLabel(log.action)}</span>
                            </span>
                          ) : (
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              log.action.includes('Approved') ? 'bg-emerald-100 text-emerald-800' :
                              log.action.includes('Rejected') ? 'bg-amber-100 text-amber-800' :
                              log.action.includes('Created') ? 'bg-blue-100 text-blue-800' :
                              log.action.includes('Deleted') ? 'bg-rose-100 text-rose-800' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {formatActionLabel(log.action)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                          {log.module || log.entityType || (lang === 'km' ? 'ទូទៅ' : 'General')} {log.entityId ? `#${log.entityId.slice(0, 8)}` : ''}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                          <div className="flex items-center space-x-1">
                            <Globe className="w-3 h-3 text-slate-400" />
                            <span>{log.ipAddress}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400">
                          <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </td>
                      </tr>

                      {/* Expanded details diff */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={6} className="p-4 border-t border-slate-100">
                            {log.details && (
                              <div className="mb-3 text-xs bg-white p-3 rounded-lg border border-slate-200 text-slate-700 leading-relaxed font-sans">
                                <strong className="text-slate-900 font-bold block mb-1">
                                  {lang === 'km' ? 'ព័ត៌មានលម្អិតសវនកម្ម៖' : 'Audit Details:'}
                                </strong>
                                {log.details}
                              </div>
                            )}

                            {(log.oldValues || log.newValues) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[11px]">
                                <div className="p-3 rounded-lg bg-white border border-slate-200">
                                  <span className="text-slate-500 font-bold block mb-1">
                                    {lang === 'km' ? 'ស្ថានភាពចាស់' : 'Old State'}
                                  </span>
                                  <pre className="text-rose-600 overflow-x-auto whitespace-pre-wrap">
                                    {log.oldValues ? JSON.stringify(log.oldValues, null, 2) : (lang === 'km' ? 'គ្មាន (កំណត់ត្រាថ្មី)' : 'None (New Record)')}
                                  </pre>
                                </div>
                                <div className="p-3 rounded-lg bg-white border border-slate-200">
                                  <span className="text-slate-500 font-bold block mb-1">
                                    {lang === 'km' ? 'ស្ថានភាពថ្មី' : 'New State'}
                                  </span>
                                  <pre className="text-emerald-700 overflow-x-auto whitespace-pre-wrap">
                                    {log.newValues ? JSON.stringify(log.newValues, null, 2) : (lang === 'km' ? 'គ្មាន (បានលុប)' : 'None (Deleted)')}
                                  </pre>
                                </div>
                              </div>
                            )}
                            <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                              <span>
                                {lang === 'km' ? 'ភ្នាក់ងារម៉ាស៊ីនភ្ញៀវ៖' : 'Client Agent:'} {log.userAgent || 'Enterprise Web Client'}
                              </span>
                              <span className="font-mono">
                                {lang === 'km' ? 'លេខកូដកំណត់ហេតុ៖' : 'Log ID:'} {log.id}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
