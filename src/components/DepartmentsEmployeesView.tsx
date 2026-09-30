import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  Plus, 
  Edit3, 
  Trash2, 
  Mail, 
  Phone, 
  Shield, 
  User as UserIcon,
  X,
  AlertTriangle,
  Search,
  Filter,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  Check,
  Copy,
  Lock,
  BadgeCheck,
  Network
} from 'lucide-react';
import { Department, Employee, Language, User as UserType, UserRole } from '../types';
import { translations } from '../services/i18n';
import { db } from '../services/db';
import { OrganizationalTreeview } from './OrganizationalTreeview';

interface DepartmentsEmployeesViewProps {
  viewMode: 'departments' | 'employees' | 'treeview';
  currentUser: UserType;
  lang: Language;
  onNavigatePlan?: (planId: string) => void;
  onNavigateTab?: (tab: any) => void;
}

export const DepartmentsEmployeesView: React.FC<DepartmentsEmployeesViewProps> = ({
  viewMode,
  currentUser,
  lang,
  onNavigatePlan,
  onNavigateTab,
}) => {
  const t = translations[lang];

  const [activeSubTab, setActiveSubTab] = useState<'departments' | 'employees' | 'treeview'>(viewMode);

  React.useEffect(() => {
    setActiveSubTab(viewMode);
  }, [viewMode]);

  const [departments, setDepartments] = useState<Department[]>(() => db.getDepartments());
  const [users, setUsers] = useState<UserType[]>(() => db.getUsers());
  const [employees, setEmployees] = useState<Employee[]>(() => db.getEmployees());

  // Department Modal State
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [deptHeadId, setDeptHeadId] = useState('');
  const [deptError, setDeptError] = useState('');

  // Employee Modal State
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<UserType | null>(null);
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empEmployeeId, setEmpEmployeeId] = useState('');
  const [empRole, setEmpRole] = useState<UserRole>('Employee');
  const [empDeptId, setEmpDeptId] = useState('');
  const [empPosition, setEmpPosition] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empStatus, setEmpStatus] = useState<'Active' | 'Inactive'>('Active');
  const [empPassword, setEmpPassword] = useState('');
  const [showEmpPassword, setShowEmpPassword] = useState(false);
  const [empError, setEmpError] = useState('');

  // Standalone Quick Password Reset Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<UserType | null>(null);
  const [targetNewPassword, setTargetNewPassword] = useState('');
  const [targetConfirmPassword, setTargetConfirmPassword] = useState('');
  const [showTargetPassword, setShowTargetPassword] = useState(false);
  const [passwordModalError, setPasswordModalError] = useState('');
  const [passwordModalSuccess, setPasswordModalSuccess] = useState('');
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  // Delete confirmation modals & alert states
  const [deptToDelete, setDeptToDelete] = useState<Department | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserType | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const refreshData = () => {
    setDepartments(db.getDepartments());
    setUsers(db.getUsers());
    setEmployees(db.getEmployees());
  };

  const handleOpenCreateDept = () => {
    setEditingDept(null);
    setDeptName('');
    setDeptCode('');
    setDeptDesc('');
    setDeptHeadId('');
    setDeptError('');
    setShowDeptModal(true);
  };

  const handleOpenEditDept = (d: Department) => {
    setEditingDept(d);
    setDeptName(d.name);
    setDeptCode(d.code);
    setDeptDesc(d.description);
    setDeptHeadId(d.headOfDepartmentId || '');
    setDeptError('');
    setShowDeptModal(true);
  };

  const handleSaveDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !deptCode.trim()) {
      setDeptError(lang === 'km' ? 'សូមបញ្ចូលឈ្មោះ និងលេខកូដនាយកដ្ឋាន។' : 'Department name and code are required.');
      return;
    }

    try {
      db.saveDepartment({
        id: editingDept?.id,
        name: deptName,
        code: deptCode.toUpperCase(),
        description: deptDesc,
        headOfDepartmentId: deptHeadId || undefined,
      });
      setShowDeptModal(false);
      refreshData();
    } catch (err: any) {
      setDeptError(err.message || (lang === 'km' ? 'មិនអាចរក្សាទុកនាយកដ្ឋានបានទេ។' : 'Failed to save department.'));
    }
  };

  const handleDeleteDept = (d: Department) => {
    setDeptToDelete(d);
    setDeleteErrorMessage(null);
  };

  const handleConfirmDeleteDept = () => {
    if (!deptToDelete) return;
    try {
      db.deleteDepartment(deptToDelete.id);
      refreshData();
      setToastMessage(lang === 'km' ? `បានលុបនាយកដ្ឋាន "${deptToDelete.name}" ដោយជោគជ័យ` : `Deleted department "${deptToDelete.name}" successfully`);
      setTimeout(() => setToastMessage(null), 3500);
      setDeptToDelete(null);
    } catch (err: any) {
      setDeleteErrorMessage(err.message || (lang === 'km' ? 'មិនអាចលុបនាយកដ្ឋានបានទេ។' : 'Failed to delete department.'));
    }
  };

  const handleOpenCreateEmp = () => {
    setEditingEmp(null);
    setEmpName('');
    setEmpEmail('');
    setEmpEmployeeId(`EMP-${Math.floor(1000 + Math.random() * 9000)}`);
    setEmpRole('Employee');
    setEmpDeptId(currentUser.role === 'Department Manager' ? (currentUser.departmentId || departments[0]?.id || '') : (departments[0]?.id || ''));
    setEmpPosition('');
    setEmpPhone('');
    setEmpStatus('Active');
    setEmpPassword('');
    setShowEmpPassword(false);
    setEmpError('');
    setShowEmpModal(true);
  };

  const handleOpenEditEmp = (u: UserType) => {
    setEditingEmp(u);
    setEmpName(u.name);
    setEmpEmail(u.email);
    setEmpEmployeeId(u.employeeId || '');
    setEmpRole(u.role);
    setEmpDeptId(u.departmentId || '');
    setEmpPosition(u.position || '');
    setEmpPhone(u.phone || '');
    setEmpStatus(u.status || (u.isActive !== false ? 'Active' : 'Inactive'));
    setEmpPassword('');
    setShowEmpPassword(false);
    setEmpError('');
    setShowEmpModal(true);
  };

  const handleDeleteEmp = (u: UserType) => {
    if (u.id === currentUser.id) {
      setDeleteErrorMessage(lang === 'km' ? 'អ្នកមិនអាចលុបគណនីដែលកំពុងដំណើរការបច្ចុប្បន្នរបស់ខ្លួនឯងបានទេ។' : 'You cannot delete your own active session account.');
      setTimeout(() => setDeleteErrorMessage(null), 4000);
      return;
    }
    setUserToDelete(u);
    setDeleteErrorMessage(null);
  };

  const handleConfirmDeleteEmp = () => {
    if (!userToDelete) return;
    try {
      db.deleteUser(userToDelete.id);
      refreshData();
      setToastMessage(lang === 'km' ? `បានលុបបុគ្គលិក "${userToDelete.name}" ដោយជោគជ័យ` : `Removed employee "${userToDelete.name}" successfully`);
      setTimeout(() => setToastMessage(null), 3500);
      setUserToDelete(null);
    } catch (err: any) {
      setDeleteErrorMessage(err.message || (lang === 'km' ? 'មិនអាចលុបបុគ្គលិកបានទេ។' : 'Failed to delete user.'));
    }
  };

  const handleSaveEmp = (e: React.FormEvent) => {
    e.preventDefault();
    setEmpError('');
    if (!empName.trim() || !empEmail.trim()) {
      setEmpError(lang === 'km' ? 'សូមបញ្ចូលឈ្មោះ និងអ៊ីមែល។' : 'Name and email are required.');
      return;
    }

    if (empPassword.trim() && empPassword.trim().length < 6) {
      setEmpError(lang === 'km' ? 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៦ តួអក្សរ។' : 'Password must contain at least 6 characters.');
      return;
    }

    try {
      db.saveUser({
        id: editingEmp?.id,
        name: empName.trim(),
        email: empEmail.trim(),
        employeeId: empEmployeeId.trim() || undefined,
        role: empRole,
        departmentId: empDeptId,
        position: empPosition.trim(),
        phone: empPhone.trim(),
        status: empStatus,
        isActive: empStatus === 'Active',
        ...(empPassword.trim() ? { password: empPassword.trim() } : {}),
      });
      setShowEmpModal(false);
      refreshData();
    } catch (err: any) {
      setEmpError(err.message || (lang === 'km' ? 'មិនអាចរក្សាទុកព័ត៌មានបុគ្គលិកបានទេ។' : 'Failed to save employee profile.'));
    }
  };

  // Quick Change / Reset Password Handlers
  const handleOpenChangePassword = (u: UserType) => {
    setPasswordTargetUser(u);
    setTargetNewPassword('');
    setTargetConfirmPassword('');
    setShowTargetPassword(false);
    setPasswordModalError('');
    setPasswordModalSuccess('');
    setCopiedNotice(false);
    setShowPasswordModal(true);
  };

  const handleGenerateTargetPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let pass = 'Pass#';
    for (let i = 0; i < 7; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTargetNewPassword(pass);
    setTargetConfirmPassword(pass);
    setShowTargetPassword(true);
  };

  const handleCopyTargetPassword = () => {
    if (!targetNewPassword) return;
    navigator.clipboard.writeText(targetNewPassword);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2000);
  };

  const handleSavePasswordModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetUser) return;
    setPasswordModalError('');
    setPasswordModalSuccess('');

    if (!targetNewPassword) {
      setPasswordModalError(lang === 'km' ? 'សូមបញ្ចូលពាក្យសម្ងាត់ថ្មី។' : 'Please enter a new password.');
      return;
    }
    if (targetNewPassword.length < 6) {
      setPasswordModalError(lang === 'km' ? 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៦ តួអក្សរ។' : 'Password must contain at least 6 characters.');
      return;
    }
    if (targetNewPassword !== targetConfirmPassword) {
      setPasswordModalError(lang === 'km' ? 'ពាក្យសម្ងាត់ទាំងពីរមិនដូចគ្នាទេ។' : 'Passwords do not match.');
      return;
    }

    const res = db.adminSetUserPassword(passwordTargetUser.id, targetNewPassword);
    if (res.success) {
      setPasswordModalSuccess(
        lang === 'km' 
          ? `ពាក្យសម្ងាត់សម្រាប់ ${passwordTargetUser.name} ត្រូវបានធ្វើបច្ចុប្បន្នភាពដោយជោគជ័យ!` 
          : `Password for ${passwordTargetUser.name} successfully updated!`
      );
      setTimeout(() => {
        setShowPasswordModal(false);
        refreshData();
      }, 1000);
    } else {
      setPasswordModalError(res.error || (lang === 'km' ? 'មិនអាចធ្វើបច្ចុប្បន្នភាពពាក្យសម្ងាត់បានទេ។' : 'Failed to update password.'));
    }
  };

  const isSuperAdminOrAdmin = ['Super Admin', 'Administrator'].includes(currentUser.role);
  const canAddEmployee = isSuperAdminOrAdmin || currentUser.role === 'Department Manager';

  const getRoleLabel = (role: UserRole | string) => {
    if (lang !== 'km') return role;
    switch (role) {
      case 'Super Admin': return 'អ្នកគ្រប់គ្រងជាន់ខ្ពស់ (Super Admin)';
      case 'Administrator': return 'អ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin)';
      case 'Department Manager': return 'ប្រធាននាយកដ្ឋាន (Manager)';
      case 'Team Leader': return 'ប្រធានក្រុម (Team Leader)';
      case 'Employee': return 'បុគ្គលិកប្រតិបត្តិ (Employee)';
      case 'Executive / Viewer': return 'ថ្នាក់ដឹកនាំ / អ្នកមើល (Viewer)';
      default: return role;
    }
  };

  const canManageEmployee = (u: UserType) => {
    if (isSuperAdminOrAdmin) return true;
    if (currentUser.role === 'Department Manager' && currentUser.departmentId && currentUser.departmentId === u.departmentId) return true;
    if (currentUser.id === u.id) return true;
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Toast / Error Banner */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-600 px-1">✕</button>
        </div>
      )}
      {deleteErrorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{deleteErrorMessage}</span>
          </div>
          <button onClick={() => setDeleteErrorMessage(null)} className="text-slate-400 hover:text-slate-600 px-1">✕</button>
        </div>
      )}

      {/* Header & Sub-Tabs */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <span>
                {activeSubTab === 'departments' 
                  ? t.departments 
                  : activeSubTab === 'employees' 
                  ? t.employees 
                  : (lang === 'km' ? 'មែកធាងឋានានុក្រម និងផែនការការងារ' : 'Organizational Treeview Plan')}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeSubTab === 'departments' 
                ? (lang === 'km' ? 'រៀបចំរចនាសម្ព័ន្ធអង្គភាព លេខកូដ និងការចាត់តាំងប្រធាននាយកដ្ឋាន។' : 'Organize organizational units, codes, and department head assignments.') 
                : activeSubTab === 'employees'
                ? (lang === 'km' ? 'បញ្ជីឈ្មោះបុគ្គលិកស្ថាប័ន ការកំណត់តួនាទី RBAC និងបុគ្គលិកតាមនាយកដ្ឋាន។' : 'Enterprise directory, RBAC role assignments, and departmental staff.')
                : (lang === 'km' ? 'មើលឃើញច្បាស់នូវរចនាសម្ព័ន្ធឋានានុក្រម តួនាទីភារកិច្ច ការទទួលខុសត្រូវលើផែនការ និងបណ្តាញទំនាក់ទំនង។' : 'Visualize institutional hierarchy, responsibilities, plan ownership, and contact escalation channels.')}
            </p>
          </div>

          {activeSubTab !== 'treeview' && (activeSubTab === 'departments' ? isSuperAdminOrAdmin : canAddEmployee) && (
            <button
              onClick={activeSubTab === 'departments' ? handleOpenCreateDept : handleOpenCreateEmp}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition self-start md:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>
                {activeSubTab === 'departments' 
                  ? (lang === 'km' ? 'បន្ថែមនាយកដ្ឋាន' : 'Add Department') 
                  : (lang === 'km' ? 'បន្ថែមបុគ្គលិក' : 'Add Employee')}
              </span>
            </button>
          )}
        </div>

        {/* View Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-100">
          <button
            onClick={() => setActiveSubTab('departments')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeSubTab === 'departments'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{t.departments}</span>
            <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
              activeSubTab === 'departments' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {departments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('employees')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeSubTab === 'employees'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t.employees}</span>
            <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
              activeSubTab === 'employees' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('treeview')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeSubTab === 'treeview'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'មែកធាងឋានានុក្រម និងផែនការការងារ' : 'Hierarchy Treeview Plan'}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeSubTab === 'treeview' ? 'bg-amber-400 text-amber-950' : 'bg-amber-100 text-amber-800'
            }`}>
              Visual
            </span>
          </button>
        </div>
      </div>

      {/* TREEVIEW VIEW */}
      {activeSubTab === 'treeview' && (
        <OrganizationalTreeview 
          currentUser={currentUser}
          lang={lang}
          onNavigatePlan={onNavigatePlan}
        />
      )}

      {/* DEPARTMENTS VIEW */}
      {activeSubTab === 'departments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map(dept => {
            const head = users.find(u => u.id === dept.headOfDepartmentId);
            const deptUsers = users.filter(u => u.departmentId === dept.id);
            const deptPlans = db.getPlans().filter(p => p.departmentId === dept.id);

            return (
              <div key={dept.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                      {dept.code}
                    </span>
                    {isSuperAdminOrAdmin && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenEditDept(dept)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDept(dept);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                          title={lang === 'km' ? 'លុបនាយកដ្ឋាន' : 'Delete Department'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="font-bold text-sm text-slate-900">{dept.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {dept.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 text-xs space-y-1.5 text-slate-600">
                    <div className="flex items-center space-x-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {lang === 'km' ? 'ប្រធាន៖ ' : 'Head: '}
                        <strong className="text-slate-800">
                          {head?.name || (lang === 'km' ? 'មិនទាន់ចាត់តាំង' : 'Unassigned')}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {lang === 'km' ? 'ចំនួនបុគ្គលិក៖ ' : 'Staff Count: '}
                        <strong className="text-slate-800">
                          {lang === 'km' ? `${deptUsers.length} នាក់` : `${deptUsers.length} members`}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    {lang === 'km' ? `${deptPlans.length} ផែនការសកម្មភាព` : `${deptPlans.length} Action Plans`}
                  </span>
                  <span className="text-emerald-600 font-semibold">
                    {lang === 'km' ? 'សកម្ម' : 'Active'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EMPLOYEES VIEW */}
      {activeSubTab === 'employees' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={lang === 'km' ? 'ស្វែងរកបុគ្គលិកតាមឈ្មោះ អ៊ីមែល តួនាទី...' : 'Search employees by name, email, job title...'}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto">
              <div className="flex items-center space-x-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-semibold text-slate-500">
                  {lang === 'km' ? 'តួនាទី៖' : 'Role:'}
                </span>
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="bg-transparent text-xs font-medium text-slate-700 focus:outline-hidden"
                >
                  <option value="all">{lang === 'km' ? 'គ្រប់តួនាទីទាំងអស់' : 'All Roles'}</option>
                  <option value="Super Admin">{getRoleLabel('Super Admin')}</option>
                  <option value="Administrator">{getRoleLabel('Administrator')}</option>
                  <option value="Department Manager">{getRoleLabel('Department Manager')}</option>
                  <option value="Team Leader">{getRoleLabel('Team Leader')}</option>
                  <option value="Employee">{getRoleLabel('Employee')}</option>
                  <option value="Executive / Viewer">{getRoleLabel('Executive / Viewer')}</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                <span className="text-[11px] font-semibold text-slate-500">
                  {lang === 'km' ? 'នាយកដ្ឋាន៖' : 'Dept:'}
                </span>
                <select
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                  className="bg-transparent text-xs font-medium text-slate-700 focus:outline-hidden max-w-[140px]"
                >
                  <option value="all">{lang === 'km' ? 'គ្រប់នាយកដ្ឋាន' : 'All Depts'}</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">{lang === 'km' ? 'បុគ្គលិក' : 'Employee'}</th>
                    <th className="py-3 px-4">{lang === 'km' ? 'តួនាទី' : 'Role'}</th>
                    <th className="py-3 px-4">{lang === 'km' ? 'នាយកដ្ឋាន' : 'Department'}</th>
                    <th className="py-3 px-4">{lang === 'km' ? 'ទំនាក់ទំនង' : 'Contact'}</th>
                    <th className="py-3 px-4">{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                    <th className="py-3 px-4 text-right">{lang === 'km' ? 'សកម្មភាព' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users
                    .filter(u => {
                      const matchesSearch = 
                        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.employeeId && u.employeeId.toLowerCase().includes(searchTerm.toLowerCase())) ||
                        (u.position && u.position.toLowerCase().includes(searchTerm.toLowerCase()));
                      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
                      const matchesDept = deptFilter === 'all' || u.departmentId === deptFilter;
                      return matchesSearch && matchesRole && matchesDept;
                    })
                    .map(u => {
                    const dept = departments.find(d => d.id === u.departmentId);
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                              {u.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <p className="font-bold text-slate-900">{u.name}</p>
                                {u.employeeId && (
                                  <span className="font-mono text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded font-semibold">
                                    {u.employeeId}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500">
                                {u.position || (lang === 'km' ? 'បុគ្គលិក' : 'Staff Member')}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded font-semibold text-[11px] bg-slate-100 text-slate-800 border border-slate-200">
                            {getRoleLabel(u.role)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-800">
                            {dept?.name || (lang === 'km' ? 'មិនទាន់ចាត់តាំង' : 'Unassigned')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <div className="flex items-center space-x-1 text-[11px]">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{u.email}</span>
                          </div>
                          {u.phone && (
                            <div className="flex items-center space-x-1 text-[10px] text-slate-400 mt-0.5">
                              <Phone className="w-3 h-3" />
                              <span>{u.phone}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {u.status === 'Inactive' || u.isActive === false ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              {lang === 'km' ? 'អសកម្ម' : 'Inactive'}
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              {lang === 'km' ? 'សកម្ម' : 'Active'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {canManageEmployee(u) && (
                              <>
                                <button
                                  onClick={() => handleOpenEditEmp(u)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                                  title={lang === 'km' ? 'កែប្រែប្រវត្តិរូប និងព័ត៌មានបុគ្គលិក' : 'Edit Employee Profile & Details'}
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenChangePassword(u)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition"
                                  title={lang === 'km' ? 'ផ្លាស់ប្តូរ / កំណត់ពាក្យសម្ងាត់បុគ្គលិកឡើងវិញ' : 'Change / Reset Employee Password'}
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            {isSuperAdminOrAdmin && u.id !== currentUser.id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteEmp(u);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                                title={lang === 'km' ? 'លុបបុគ្គលិកចេញ' : 'Delete Employee'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DEPARTMENT MODAL */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-sm text-slate-900">
                {editingDept 
                  ? (lang === 'km' ? 'កែប្រែនាយកដ្ឋាន' : 'Edit Department') 
                  : (lang === 'km' ? 'បង្កើតនាយកដ្ឋានថ្មី' : 'Create Department')}
              </h3>
              <button onClick={() => setShowDeptModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {deptError && (
              <div className="p-2.5 rounded bg-rose-50 text-rose-700 text-xs mb-3 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{deptError}</span>
              </div>
            )}

            <form onSubmit={handleSaveDept} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'km' ? 'ឈ្មោះនាយកដ្ឋាន *' : 'Department Name *'}
                </label>
                <input
                  type="text"
                  value={deptName}
                  onChange={e => setDeptName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'km' ? 'លេខកូដនាយកដ្ឋាន *' : 'Department Code *'}
                </label>
                <input
                  type="text"
                  value={deptCode}
                  onChange={e => setDeptCode(e.target.value)}
                  placeholder="e.g. IT, FIN, MKT"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'km' ? 'ការពិពណ៌នា' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  value={deptDesc}
                  onChange={e => setDeptDesc(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'km' ? 'ប្រធាននាយកដ្ឋាន' : 'Department Head'}
                </label>
                <select
                  value={deptHeadId}
                  onChange={e => setDeptHeadId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="">{lang === 'km' ? 'មិនទាន់ចាត់តាំង' : 'Unassigned'}</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({getRoleLabel(u.role)})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
                >
                  {lang === 'km' ? 'បោះបង់' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
                >
                  {lang === 'km' ? 'រក្សាទុក' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMPLOYEE MODAL */}
      {showEmpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {editingEmp 
                    ? (lang === 'km' ? 'កែប្រែព័ត៌មានបុគ្គលិក' : 'Edit Employee Details') 
                    : (lang === 'km' ? 'ចុះឈ្មោះបុគ្គលិកថ្មី' : 'Onboard New Employee')}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingEmp 
                    ? (lang === 'km' ? `ធ្វើបច្ចុប្បន្នភាពកំណត់ត្រាប្រវត្តិរូប និងព័ត៌មានសម្ងាត់សម្រាប់ ${editingEmp.name}` : `Update profile records and credentials for ${editingEmp.name}`) 
                    : (lang === 'km' ? 'បង្កើតគណនីបុគ្គលិក និងកំណត់សិទ្ធិចូលប្រើប្រព័ន្ធ។' : 'Create employee account and configure system access.')}
                </p>
              </div>
              <button onClick={() => setShowEmpModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {empError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs mb-4 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{empError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEmp} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'km' ? 'ឈ្មោះពេញ *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    value={empName}
                    onChange={e => setEmpName(e.target.value)}
                    placeholder="e.g. Sopheap Chan"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'km' ? 'អ៊ីមែលស្ថាប័ន *' : 'Corporate Email *'}
                  </label>
                  <input
                    type="email"
                    value={empEmail}
                    onChange={e => setEmpEmail(e.target.value)}
                    placeholder="sopheap@enterprise.com"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'km' ? 'លេខកូដសម្គាល់បុគ្គលិក' : 'Employee ID'}
                  </label>
                  <input
                    type="text"
                    value={empEmployeeId}
                    onChange={e => setEmpEmployeeId(e.target.value)}
                    placeholder="e.g. EMP-2041"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'km' ? 'តួនាទីប្រព័ន្ធ (RBAC) *' : 'System Role (RBAC) *'}
                  </label>
                  <select
                    value={empRole}
                    disabled={!isSuperAdminOrAdmin && editingEmp?.id !== currentUser.id}
                    onChange={e => setEmpRole(e.target.value as UserRole)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="Super Admin">{getRoleLabel('Super Admin')}</option>
                    <option value="Administrator">{getRoleLabel('Administrator')}</option>
                    <option value="Department Manager">{getRoleLabel('Department Manager')}</option>
                    <option value="Team Leader">{getRoleLabel('Team Leader')}</option>
                    <option value="Employee">{getRoleLabel('Employee')}</option>
                    <option value="Executive / Viewer">{getRoleLabel('Executive / Viewer')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'km' ? 'នាយកដ្ឋាន' : 'Department'}
                  </label>
                  <select
                    value={empDeptId}
                    onChange={e => setEmpDeptId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'km' ? 'មុខតំណែង / ភារកិច្ច' : 'Job Title / Position'}
                  </label>
                  <input
                    type="text"
                    value={empPosition}
                    onChange={e => setEmpPosition(e.target.value)}
                    placeholder="e.g. Senior Systems Analyst"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'km' ? 'លេខទូរស័ព្ទ' : 'Phone Number'}
                  </label>
                  <input
                    type="text"
                    value={empPhone}
                    onChange={e => setEmpPhone(e.target.value)}
                    placeholder="+855 12 345 678"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'km' ? 'ស្ថានភាពគណនី' : 'Account Status'}
                  </label>
                  <select
                    value={empStatus}
                    onChange={e => setEmpStatus(e.target.value as 'Active' | 'Inactive')}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="Active">{lang === 'km' ? 'គណនីសកម្ម' : 'Active Account'}</option>
                    <option value="Inactive">{lang === 'km' ? 'អសកម្ម / ផ្អាកបណ្តោះអាសន្ន' : 'Inactive / Suspended'}</option>
                  </select>
                </div>
              </div>

              {/* Password Section */}
              <div className="mt-4 pt-3 border-t border-slate-200 bg-slate-50 p-3.5 rounded-xl border">
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <label className="font-semibold text-slate-800 flex items-center space-x-1.5">
                      <Lock className="w-3.5 h-3.5 text-blue-600" />
                      <span>
                        {editingEmp 
                          ? (lang === 'km' ? 'ផ្លាស់ប្តូរពាក្យសម្ងាត់គណនី' : 'Change Account Password') 
                          : (lang === 'km' ? 'ពាក្យសម្ងាត់ដំបូង' : 'Initial Password')}
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {editingEmp 
                        ? (lang === 'km' ? 'ទុកឱ្យនៅទំនេរដើម្បីរក្សាពាក្យសម្ងាត់បច្ចុប្បន្ន ឬបញ្ចូលពាក្យសម្ងាត់ថ្មីដើម្បីកំណត់ឡើងវិញ។' : 'Leave blank to preserve current password, or enter a new one to reset it.') 
                        : (lang === 'km' ? 'ពាក្យសម្ងាត់លំនាំដើមគឺ Password@123 ប្រសិនបើទុកឱ្យនៅទំនេរ។' : 'Default password is Password@123 if left blank.')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => {
                        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
                        let pass = 'Pass#';
                        for (let i = 0; i < 7; i++) {
                          pass += chars.charAt(Math.floor(Math.random() * chars.length));
                        }
                        setEmpPassword(pass);
                        setShowEmpPassword(true);
                      }}
                      className="flex items-center space-x-1 text-[11px] text-blue-600 hover:text-blue-800 bg-white px-2 py-1 rounded border border-slate-200 font-semibold shadow-2xs"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{lang === 'km' ? 'បង្កើតស្វ័យប្រវត្តិ' : 'Generate'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmpPassword('Password@123');
                        setShowEmpPassword(true);
                      }}
                      className="text-[11px] text-slate-600 hover:text-slate-800 bg-white px-2 py-1 rounded border border-slate-200 font-semibold shadow-2xs"
                    >
                      {lang === 'km' ? 'លំនាំដើម' : 'Default'}
                    </button>
                  </div>
                </div>

                <div className="relative mt-2">
                  <input
                    type={showEmpPassword ? 'text' : 'password'}
                    value={empPassword}
                    onChange={e => setEmpPassword(e.target.value)}
                    placeholder={editingEmp 
                      ? (lang === 'km' ? 'ទុកទំនេរដើម្បីរក្សាពាក្យសម្ងាត់បច្ចុប្បន្ន' : 'Leave empty to keep existing password') 
                      : (lang === 'km' ? 'បញ្ចូលពាក្យសម្ងាត់ ឬទុកទំនេរសម្រាប់ Password@123' : 'Enter password or leave blank for Password@123')}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 pr-9 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmpPassword(!showEmpPassword)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showEmpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEmpModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
                >
                  {lang === 'km' ? 'បោះបង់' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
                >
                  {editingEmp 
                    ? (lang === 'km' ? 'រក្សាទុកការកែប្រែ' : 'Save Employee Changes') 
                    : (lang === 'km' ? 'បង្កើតគណនីបុគ្គលិក' : 'Create Employee Account')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK RESET / CHANGE PASSWORD MODAL */}
      {showPasswordModal && passwordTargetUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {lang === 'km' ? 'កំណត់ពាក្យសម្ងាត់បុគ្គលិកឡើងវិញ' : 'Reset Employee Password'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {lang === 'km' ? 'សុវត្ថិភាពស្ថាប័ន និងការធ្វើបច្ចុប្បន្នភាពព័ត៌មានសម្ងាត់' : 'Institutional security and credential update'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target User Info Banner */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                  {passwordTargetUser.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-xs">{passwordTargetUser.name}</p>
                  <p className="text-[11px] text-slate-500">{passwordTargetUser.email}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-2 py-0.5 rounded font-mono font-semibold text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                  {passwordTargetUser.employeeId || 'EMP'}
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">{getRoleLabel(passwordTargetUser.role)}</p>
              </div>
            </div>

            {passwordModalError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs mb-3 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{passwordModalError}</span>
              </div>
            )}

            {passwordModalSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs mb-3 flex items-center space-x-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{passwordModalSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSavePasswordModal} className="space-y-3.5 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">
                    {lang === 'km' ? 'ពាក្យសម្ងាត់ថ្មី (យ៉ាងតិច ៦ តួអក្សរ) *' : 'New Password (min 6 characters) *'}
                  </label>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={handleGenerateTargetPassword}
                      className="flex items-center space-x-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{lang === 'km' ? 'បង្កើតស្វ័យប្រវត្តិ' : 'Generate'}</span>
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetNewPassword('Password@123');
                        setTargetConfirmPassword('Password@123');
                        setShowTargetPassword(true);
                      }}
                      className="text-[11px] text-slate-600 hover:text-slate-800 font-semibold"
                    >
                      {lang === 'km' ? 'លំនាំដើម' : 'Default'}
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type={showTargetPassword ? 'text' : 'password'}
                    required
                    value={targetNewPassword}
                    onChange={e => setTargetNewPassword(e.target.value)}
                    placeholder={lang === 'km' ? 'បញ្ចូលពាក្យសម្ងាត់ថ្មី' : 'Enter new password'}
                    className="w-full rounded-lg border border-slate-300 p-2 pr-16 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <div className="absolute right-2 top-2 flex items-center space-x-1">
                    {targetNewPassword && (
                      <button
                        type="button"
                        onClick={handleCopyTargetPassword}
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                        title={lang === 'km' ? 'ចម្លងពាក្យសម្ងាត់' : 'Copy Password'}
                      >
                        {copiedNotice ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowTargetPassword(!showTargetPassword)}
                      className="text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      {showTargetPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                {copiedNotice && (
                  <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">
                    {lang === 'km' ? 'បានចម្លងពាក្យសម្ងាត់ទៅក្ដារតម្បៀតខ្ទាស់!' : 'Password copied to clipboard!'}
                  </span>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'km' ? 'ផ្ទៀងផ្ទាត់ពាក្យសម្ងាត់ថ្មី *' : 'Confirm New Password *'}
                </label>
                <div className="relative">
                  <input
                    type={showTargetPassword ? 'text' : 'password'}
                    required
                    value={targetConfirmPassword}
                    onChange={e => setTargetConfirmPassword(e.target.value)}
                    placeholder={lang === 'km' ? 'បញ្ចូលពាក្យសម្ងាត់ថ្មីម្តងទៀត' : 'Repeat new password'}
                    className="w-full rounded-lg border border-slate-300 p-2 pr-9 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-amber-800 text-[11px] flex items-start space-x-2">
                <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  {lang === 'km' 
                    ? 'បុគ្គលិកនឹងអាចចូលប្រើប្រព័ន្ធបានភ្លាមៗដោយប្រើពាក្យសម្ងាត់ថ្មីនេះនៅគ្រប់ផ្នែកទាំងអស់។' 
                    : 'The employee will immediately be able to sign in using this new password across all active enterprise portals.'}
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
                >
                  {lang === 'km' ? 'បោះបង់' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
                >
                  {lang === 'km' ? 'ធ្វើបច្ចុប្បន្នភាពពាក្យសម្ងាត់' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DEPARTMENT MODAL */}
      {deptToDelete && (
        <div 
          id="confirm-delete-dept-modal"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {lang === 'km' ? 'បញ្ជាក់ការលុបនាយកដ្ឋាន' : 'Confirm Delete Department'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'km' ? 'លុបនាយកដ្ឋានចេញពីរចនាសម្ព័ន្ធ' : 'Remove organizational unit'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4 text-xs space-y-2">
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {deptToDelete.code}
                </span>
                <span className="font-semibold text-slate-900">{deptToDelete.name}</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                {lang === 'km'
                  ? `តើអ្នកពិតជាចង់លុបនាយកដ្ឋាន "${deptToDelete.name}" (${deptToDelete.code}) មែនទេ? ប្រសិនបើមានបុគ្គលិក ឬផែនការដែលពាក់ព័ន្ធ សូមប្រាកដថាបានផ្លាស់ប្តូររួចរាល់។`
                  : `Are you sure you want to delete department "${deptToDelete.name}" (${deptToDelete.code})?`}
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDeptToDelete(null);
                  setDeleteErrorMessage(null);
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition"
              >
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteDept}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition flex items-center space-x-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{lang === 'km' ? 'យល់ព្រមលុប' : 'Yes, Delete Department'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE EMPLOYEE MODAL */}
      {userToDelete && (
        <div 
          id="confirm-delete-user-modal"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {lang === 'km' ? 'បញ្ជាក់ការលុបបុគ្គលិក' : 'Confirm Delete Employee'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'km' ? 'ដកគណនីបុគ្គលិកចេញពីប្រព័ន្ធ' : 'Remove user account from enterprise system'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4 text-xs space-y-2">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-900">{userToDelete.name}</span>
                <span className="text-slate-500">({userToDelete.email})</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                {lang === 'km'
                  ? `តើអ្នកពិតជាចង់លុបបុគ្គលិក "${userToDelete.name}" (${getRoleLabel(userToDelete.role)}) មែនទេ? សកម្មភាពនេះនឹងដកសិទ្ធិចូលប្រព័ន្ធរបស់បុគ្គលិកនេះ។`
                  : `Are you sure you want to remove user "${userToDelete.name}" (${userToDelete.role})? This user will no longer be able to sign in.`}
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setUserToDelete(null);
                  setDeleteErrorMessage(null);
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition"
              >
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteEmp}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition flex items-center space-x-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{lang === 'km' ? 'យល់ព្រមលុប' : 'Yes, Delete Employee'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
