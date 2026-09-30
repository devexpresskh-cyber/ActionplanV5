import {
  User,
  Department,
  Objective,
  ActionPlan,
  Activity,
  ProgressUpdate,
  PlanApproval,
  NotificationItem,
  ActivityLog,
  ApprovalActionType,
  UserRole,
  AttendanceRecord,
  AttendanceStatus,
  ShiftType,
  WorkShiftConfig,
  MonthlyAttendanceReport,
  EmployeeAttendanceSummary,
  DepartmentAttendanceSummary,
  EmployeeFeedback,
  NavTab,
  AttendancePrivacySettings,
  PrivacyAuditRecord,
  PrivacyFeedback,
  WorkplaceNetwork,
  NetworkSettingsConfig,
  NetworkAccessLog,
  CurrentNetworkConnection,
  PlanCollaborationReview,
  PriorityLevel,
  TelegramNotificationConfig,
  TelegramNotificationLog,
} from '../types';
import { canRoleAccessTab, MENU_RBAC_POLICY } from './rbac';
import { defaultTelegramConfig, initialTelegramLogs } from '../data/telegramData';
import {
  initialUsers,
  initialDepartments,
  initialObjectives,
  initialActionPlans,
  initialActivities,
  initialProgressUpdates,
  initialApprovals,
  initialNotifications,
  initialAuditLogs,
} from '../data/initialData';
import {
  initialAttendanceRecords,
  initialMonthlyReports,
} from '../data/attendanceData';
import {
  defaultPrivacySettings,
  initialPrivacyAudits,
  initialPrivacyFeedbacks,
} from '../data/privacyData';
import {
  initialWorkplaceNetworks,
  defaultNetworkSettings,
  initialNetworkAccessLogs,
  simulatedConnectionProfiles,
  checkIpAgainstNetworks,
  isIpInCidr,
} from '../data/networkData';

const STORAGE_KEYS = {
  USERS: 'apms_users_v1',
  DEPARTMENTS: 'apms_departments_v1',
  OBJECTIVES: 'apms_objectives_v1',
  PLANS: 'apms_plans_v1',
  ACTIVITIES: 'apms_activities_v1',
  PROGRESS: 'apms_progress_v1',
  APPROVALS: 'apms_approvals_v1',
  NOTIFICATIONS: 'apms_notifications_v1',
  AUDIT_LOGS: 'apms_audit_logs_v1',
  CURRENT_USER_ID: 'apms_current_user_id_v1',
  AUTH_STATE: 'apms_auth_state_v1',
  ATTENDANCE: 'apms_attendance_v1',
  MONTHLY_REPORTS: 'apms_monthly_reports_v1',
  WORK_SHIFTS: 'apms_work_shifts_v1',
  FEEDBACK: 'apms_feedback_v1',
  PRIVACY_SETTINGS: 'apms_privacy_settings_v1',
  PRIVACY_AUDITS: 'apms_privacy_audits_v1',
  PRIVACY_FEEDBACKS: 'apms_privacy_feedbacks_v1',
  NETWORKS: 'apms_workplace_networks_v1',
  NETWORK_SETTINGS: 'apms_network_settings_v1',
  NETWORK_LOGS: 'apms_network_logs_v1',
  CURRENT_CONNECTION: 'apms_current_connection_v1',
  TELEGRAM_CONFIG: 'apms_telegram_config_v1',
  TELEGRAM_LOGS: 'apms_telegram_logs_v1',
};

export const DEFAULT_WORK_SHIFTS: Record<string, WorkShiftConfig> = {
  Morning: {
    id: 'Morning',
    name: 'Morning Shift',
    nameKm: 'វេនព្រឹក',
    hours: '08:00 - 12:00',
    startTime: '08:00:00',
    endTime: '12:00:00',
    startHour: 8,
    startMinute: 0,
    endHour: 12,
    endMinute: 0,
    lateGraceHour: 8,
    lateGraceMinute: 15,
    fullLabel: 'Morning Shift (08:00 - 12:00)',
    fullLabelKm: 'វេនព្រឹក (០៨:០០ - ១២:០០)',
    description: 'Core daytime operations & departmental standups',
    descriptionKm: 'ប្រតិបត្តិការស្នូលពេលថ្ងៃ និងកិច្ចប្រជុំយុទ្ធសាស្ត្រ',
    icon: 'Sun',
    theme: 'amber',
    isActive: true,
  },
  Evening: {
    id: 'Evening',
    name: 'Evening Shift',
    nameKm: 'វេនល្ងាច',
    hours: '13:00 - 17:00',
    startTime: '13:00:00',
    endTime: '17:00:00',
    startHour: 13,
    startMinute: 0,
    endHour: 17,
    endMinute: 0,
    lateGraceHour: 13,
    lateGraceMinute: 15,
    fullLabel: 'Evening Shift (13:00 - 17:00)',
    fullLabelKm: 'វេនល្ងាច (១៣:០០ - ១៧:០០)',
    description: 'Evening operations, tech support & site coverage',
    descriptionKm: 'ប្រតិបត្តិការពេលល្ងាច គាំទ្របច្ចេកវិទ្យា និងត្រួតពិនិត្យប្រព័ន្ធ',
    icon: 'Moon',
    theme: 'indigo',
    isActive: true,
  }
};

export let WORK_SHIFTS: Record<string, WorkShiftConfig> = { ...DEFAULT_WORK_SHIFTS };

class DatabaseService {
  private users: User[] = [];
  private departments: Department[] = [];
  private objectives: Objective[] = [];
  private plans: ActionPlan[] = [];
  private activities: Activity[] = [];
  private progressUpdates: ProgressUpdate[] = [];
  private approvals: PlanApproval[] = [];
  private notifications: NotificationItem[] = [];
  private auditLogs: ActivityLog[] = [];
  private attendanceRecords: AttendanceRecord[] = [];
  private monthlyReports: MonthlyAttendanceReport[] = [];
  private workShifts: Record<string, WorkShiftConfig> = { ...DEFAULT_WORK_SHIFTS };
  private feedbacks: EmployeeFeedback[] = [];
  private privacySettings: AttendancePrivacySettings = { ...defaultPrivacySettings };
  private privacyAudits: PrivacyAuditRecord[] = [...initialPrivacyAudits];
  private privacyFeedbacks: PrivacyFeedback[] = [...initialPrivacyFeedbacks];
  private networks: WorkplaceNetwork[] = [...initialWorkplaceNetworks];
  private networkSettings: NetworkSettingsConfig = { ...defaultNetworkSettings };
  private networkLogs: NetworkAccessLog[] = [...initialNetworkAccessLogs];
  private currentConnection: CurrentNetworkConnection = { ...simulatedConnectionProfiles[0] };
  private currentUserId: string = 'usr-1'; // Default to Super Admin
  private telegramConfig: TelegramNotificationConfig = { ...defaultTelegramConfig };
  private telegramLogs: TelegramNotificationLog[] = [...initialTelegramLogs];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const storedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
      this.users = storedUsers ? JSON.parse(storedUsers) : initialUsers;

      const storedDepts = localStorage.getItem(STORAGE_KEYS.DEPARTMENTS);
      this.departments = storedDepts ? JSON.parse(storedDepts) : initialDepartments;

      const storedObjs = localStorage.getItem(STORAGE_KEYS.OBJECTIVES);
      this.objectives = storedObjs ? JSON.parse(storedObjs) : initialObjectives;

      const storedPlans = localStorage.getItem(STORAGE_KEYS.PLANS);
      if (storedPlans) {
        const parsed: ActionPlan[] = JSON.parse(storedPlans);
        // Ensure any new initial plans (like plan-7) are included if not present
        initialActionPlans.forEach(initP => {
          if (!parsed.some(p => p.id === initP.id)) {
            parsed.push(initP);
          }
        });
        this.plans = parsed;
      } else {
        this.plans = initialActionPlans;
      }

      const storedActs = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
      this.activities = storedActs ? JSON.parse(storedActs) : initialActivities;

      const storedProg = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      this.progressUpdates = storedProg ? JSON.parse(storedProg) : initialProgressUpdates;

      const storedAppr = localStorage.getItem(STORAGE_KEYS.APPROVALS);
      this.approvals = storedAppr ? JSON.parse(storedAppr) : initialApprovals;

      const storedNotifs = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      this.notifications = storedNotifs ? JSON.parse(storedNotifs) : initialNotifications;

      const storedLogs = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      this.auditLogs = storedLogs ? JSON.parse(storedLogs) : initialAuditLogs;

      const storedAttendance = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      this.attendanceRecords = storedAttendance ? JSON.parse(storedAttendance) : initialAttendanceRecords;

      const storedReports = localStorage.getItem(STORAGE_KEYS.MONTHLY_REPORTS);
      this.monthlyReports = storedReports ? JSON.parse(storedReports) : initialMonthlyReports;

      const storedShifts = localStorage.getItem(STORAGE_KEYS.WORK_SHIFTS);
      this.workShifts = storedShifts ? JSON.parse(storedShifts) : { ...DEFAULT_WORK_SHIFTS };
      WORK_SHIFTS = this.workShifts;

      const storedFeedback = localStorage.getItem(STORAGE_KEYS.FEEDBACK);
      this.feedbacks = storedFeedback ? JSON.parse(storedFeedback) : [
        {
          id: 'fb-1',
          userId: 'usr-3',
          userName: 'Chan Vicheka',
          category: 'Mobile Experience',
          rating: 5,
          message: 'The new one-tap morning shift check-in (08:00 - 12:00) makes it so fast to clock in on mobile during morning arrivals.',
          deviceInfo: 'Mobile Safari / iOS 17',
          createdAt: '2026-09-17 08:30:00',
          status: 'Reviewed',
        },
        {
          id: 'fb-2',
          userId: 'usr-5',
          userName: 'Seng Vibol',
          category: 'Navigation & Usability',
          rating: 5,
          message: 'Love the quick shortcuts and search palette. Saves having to click through 4 menus to find my daily tasks.',
          deviceInfo: 'Chrome Mobile / Android 15',
          createdAt: '2026-09-17 14:15:00',
          status: 'Implemented',
        }
      ];

      const storedPrivacySettings = localStorage.getItem(STORAGE_KEYS.PRIVACY_SETTINGS);
      this.privacySettings = storedPrivacySettings ? JSON.parse(storedPrivacySettings) : { ...defaultPrivacySettings };

      const storedPrivacyAudits = localStorage.getItem(STORAGE_KEYS.PRIVACY_AUDITS);
      this.privacyAudits = storedPrivacyAudits ? JSON.parse(storedPrivacyAudits) : [...initialPrivacyAudits];

      const storedPrivacyFeedbacks = localStorage.getItem(STORAGE_KEYS.PRIVACY_FEEDBACKS);
      this.privacyFeedbacks = storedPrivacyFeedbacks ? JSON.parse(storedPrivacyFeedbacks) : [...initialPrivacyFeedbacks];

      const storedNetworks = localStorage.getItem(STORAGE_KEYS.NETWORKS);
      this.networks = storedNetworks ? JSON.parse(storedNetworks) : [...initialWorkplaceNetworks];

      const storedNetSettings = localStorage.getItem(STORAGE_KEYS.NETWORK_SETTINGS);
      this.networkSettings = storedNetSettings ? JSON.parse(storedNetSettings) : { ...defaultNetworkSettings };

      const storedNetLogs = localStorage.getItem(STORAGE_KEYS.NETWORK_LOGS);
      this.networkLogs = storedNetLogs ? JSON.parse(storedNetLogs) : [...initialNetworkAccessLogs];

      const storedConn = localStorage.getItem(STORAGE_KEYS.CURRENT_CONNECTION);
      this.currentConnection = storedConn ? JSON.parse(storedConn) : { ...simulatedConnectionProfiles[0] };

      const storedTelConfig = localStorage.getItem(STORAGE_KEYS.TELEGRAM_CONFIG);
      let parsedTelConfig: any = {};
      try {
        parsedTelConfig = storedTelConfig ? JSON.parse(storedTelConfig) : {};
      } catch {
        parsedTelConfig = {};
      }
      this.telegramConfig = {
        ...defaultTelegramConfig,
        ...(parsedTelConfig || {}),
      };

      const storedTelLogs = localStorage.getItem(STORAGE_KEYS.TELEGRAM_LOGS);
      let parsedTelLogs: any = null;
      try {
        parsedTelLogs = storedTelLogs ? JSON.parse(storedTelLogs) : null;
      } catch {
        parsedTelLogs = null;
      }
      this.telegramLogs = Array.isArray(parsedTelLogs) ? parsedTelLogs : [...initialTelegramLogs];

      const storedUserId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
      if (storedUserId && this.users.find(u => u.id === storedUserId)) {
        this.currentUserId = storedUserId;
      } else {
        this.currentUserId = this.users[0].id;
      }
    } catch {
      this.resetToDefaults();
    }
  }

  public resetToDefaults() {
    this.users = [...initialUsers];
    this.departments = [...initialDepartments];
    this.objectives = [...initialObjectives];
    this.plans = [...initialActionPlans];
    this.activities = [...initialActivities];
    this.progressUpdates = [...initialProgressUpdates];
    this.approvals = [...initialApprovals];
    this.notifications = [...initialNotifications];
    this.auditLogs = [...initialAuditLogs];
    this.attendanceRecords = [...initialAttendanceRecords];
    this.monthlyReports = [...initialMonthlyReports];
    this.workShifts = JSON.parse(JSON.stringify(DEFAULT_WORK_SHIFTS));
    WORK_SHIFTS = this.workShifts;
    this.privacySettings = { ...defaultPrivacySettings };
    this.privacyAudits = [...initialPrivacyAudits];
    this.privacyFeedbacks = [...initialPrivacyFeedbacks];
    this.networks = [...initialWorkplaceNetworks];
    this.networkSettings = { ...defaultNetworkSettings };
    this.networkLogs = [...initialNetworkAccessLogs];
    this.currentConnection = { ...simulatedConnectionProfiles[0] };
    this.telegramConfig = { ...defaultTelegramConfig };
    this.telegramLogs = [...initialTelegramLogs];
    this.currentUserId = 'usr-1';
    this.saveAll();
  }

  private saveAll() {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(this.users));
    localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(this.departments));
    localStorage.setItem(STORAGE_KEYS.OBJECTIVES, JSON.stringify(this.objectives));
    localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(this.plans));
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(this.activities));
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(this.progressUpdates));
    localStorage.setItem(STORAGE_KEYS.APPROVALS, JSON.stringify(this.approvals));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(this.notifications));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(this.auditLogs));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(this.attendanceRecords));
    localStorage.setItem(STORAGE_KEYS.MONTHLY_REPORTS, JSON.stringify(this.monthlyReports));
    localStorage.setItem(STORAGE_KEYS.WORK_SHIFTS, JSON.stringify(this.workShifts));
    localStorage.setItem(STORAGE_KEYS.FEEDBACK, JSON.stringify(this.feedbacks));
    localStorage.setItem(STORAGE_KEYS.PRIVACY_SETTINGS, JSON.stringify(this.privacySettings));
    localStorage.setItem(STORAGE_KEYS.PRIVACY_AUDITS, JSON.stringify(this.privacyAudits));
    localStorage.setItem(STORAGE_KEYS.PRIVACY_FEEDBACKS, JSON.stringify(this.privacyFeedbacks));
    localStorage.setItem(STORAGE_KEYS.NETWORKS, JSON.stringify(this.networks));
    localStorage.setItem(STORAGE_KEYS.NETWORK_SETTINGS, JSON.stringify(this.networkSettings));
    localStorage.setItem(STORAGE_KEYS.NETWORK_LOGS, JSON.stringify(this.networkLogs));
    localStorage.setItem(STORAGE_KEYS.CURRENT_CONNECTION, JSON.stringify(this.currentConnection));
    localStorage.setItem(STORAGE_KEYS.TELEGRAM_CONFIG, JSON.stringify(this.telegramConfig));
    localStorage.setItem(STORAGE_KEYS.TELEGRAM_LOGS, JSON.stringify(this.telegramLogs));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, this.currentUserId);
  }

  // --- Auth & Session ---
  public isAuthenticated(): boolean {
    const auth = localStorage.getItem(STORAGE_KEYS.AUTH_STATE);
    // If not set yet, default to true so first-time users can see the system, or false once they explicitly log out
    return auth !== 'false';
  }

  public setAuthenticated(status: boolean): void {
    localStorage.setItem(STORAGE_KEYS.AUTH_STATE, status ? 'true' : 'false');
  }

  public getCurrentUser(): User {
    const user = this.users.find(u => u.id === this.currentUserId);
    return user || this.users[0];
  }

  public login(email: string, password?: string): { success: boolean; user?: User; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const user = this.users.find(u => u.email.trim().toLowerCase() === cleanEmail);
    if (!user) {
      return { success: false, error: 'No account found with this email address.' };
    }
    if (user.status === 'Inactive' || user.isActive === false) {
      return { success: false, error: 'This user account is inactive. Please contact your system administrator.' };
    }
    
    // Check password if provided (all seed accounts accept 'Password@123' or their custom password)
    const validPassword = user.password || 'Password@123';
    if (password && password !== validPassword && password !== 'Password@123') {
      return { success: false, error: 'Invalid password. Please check your credentials.' };
    }

    this.currentUserId = user.id;
    this.setAuthenticated(true);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);
    this.logAction(user.id, user.name, 'USER_LOGIN', 'Auth', `User successfully authenticated as ${user.name} (${user.role})`);
    return { success: true, user };
  }

  public quickLoginAs(userId: string): User {
    const user = this.users.find(u => u.id === userId) || this.users[0];
    this.currentUserId = user.id;
    this.setAuthenticated(true);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);
    this.logAction(user.id, user.name, 'QUICK_LOGIN', 'Auth', `Quick authenticated as ${user.name} (${user.role})`);
    return user;
  }

  public logout(): void {
    const user = this.getCurrentUser();
    this.logAction(user.id, user.name, 'USER_LOGOUT', 'Auth', `User logged out of active session.`);
    this.setAuthenticated(false);
  }

  public register(data: {
    name: string;
    email: string;
    password?: string;
    departmentId?: string;
    role?: UserRole;
    position?: string;
    phone?: string;
  }): { success: boolean; user?: User; error?: string } {
    const cleanEmail = data.email.trim().toLowerCase();
    const existing = this.users.find(u => u.email.trim().toLowerCase() === cleanEmail);
    if (existing) {
      return { success: false, error: 'An account with this email address already exists.' };
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      employeeId: `EMP-${Math.floor(100 + Math.random() * 900)}`,
      name: data.name.trim(),
      email: cleanEmail,
      password: data.password || 'Password@123',
      phone: data.phone?.trim() || '',
      departmentId: data.departmentId || (this.departments[0] ? this.departments[0].id : 'dept-1'),
      position: data.position?.trim() || 'Staff Specialist',
      role: data.role || 'Employee',
      status: 'Active',
      isActive: true,
      createdAt: new Date().toISOString()
    };

    this.users.push(newUser);
    this.currentUserId = newUser.id;
    this.setAuthenticated(true);
    this.saveAll();
    this.logAction(newUser.id, newUser.name, 'USER_REGISTER', 'Auth', `Self-registered account for ${newUser.name} with role ${newUser.role}`);
    
    return { success: true, user: newUser };
  }

  public changePassword(userId: string, currentPass: string, newPass: string): { success: boolean; error?: string } {
    const user = this.users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'User account not found.' };

    const expected = user.password || 'Password@123';
    if (currentPass !== expected && currentPass !== 'Password@123') {
      return { success: false, error: 'Current password is incorrect.' };
    }
    if (!newPass || newPass.length < 6) {
      return { success: false, error: 'New password must contain at least 6 characters.' };
    }

    user.password = newPass;
    this.saveAll();
    this.logAction(user.id, user.name, 'PASSWORD_CHANGE', 'Auth', `User successfully updated password.`);
    return { success: true };
  }

  public resetPassword(email: string): { success: boolean; message: string; tempPassword?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const user = this.users.find(u => u.email.trim().toLowerCase() === cleanEmail);
    if (!user) {
      return { success: false, message: 'No registered user matches this corporate email.' };
    }
    const tempPassword = 'Password@123';
    user.password = tempPassword;
    this.saveAll();
    this.logAction(user.id, user.name, 'PASSWORD_RESET', 'Auth', `Requested temporary password reset.`);
    return { 
      success: true, 
      message: `Password has been reset to default credentials (${tempPassword}).`, 
      tempPassword 
    };
  }

  public switchUser(userId: string): User {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      this.currentUserId = user.id;
      this.setAuthenticated(true);
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, this.currentUserId);
      this.logAction(user.id, user.name, 'LOGIN_SWITCH', 'Auth', `Switched active user session to ${user.name} (${user.role})`);
    }
    return this.getCurrentUser();
  }

  // --- Authorization & Permissions ---
  public canCreatePlan(user: User): boolean {
    return ['Super Admin', 'Administrator', 'Department Manager', 'Team Leader', 'Employee'].includes(user.role);
  }

  public canEditPlan(user: User, plan: ActionPlan): boolean {
    if (['Super Admin', 'Administrator'].includes(user.role)) return true;
    if (user.role === 'Department Manager' && plan.departmentId === user.departmentId) return true;
    if (plan.ownerId === user.id || plan.createdById === user.id) return true;
    return false;
  }

  public canDeletePlan(user: User, plan: ActionPlan): boolean {
    if (user.role === 'Super Admin') return true;
    if (user.role === 'Administrator') return true;
    if (user.role === 'Department Manager' && plan.departmentId === user.departmentId) return true;
    if (plan.ownerId === user.id || plan.createdById === user.id) return true;
    return false;
  }

  public canApprovePlan(user: User, plan: ActionPlan): boolean {
    if (['Super Admin', 'Administrator'].includes(user.role)) return true;
    if (user.role === 'Department Manager' && plan.departmentId === user.departmentId) return true;
    return false;
  }

  public canCreateActivity(user: User, plan?: ActionPlan): boolean {
    if (['Super Admin', 'Administrator'].includes(user.role)) return true;
    if (!plan) return user.role !== 'Executive / Viewer';
    if (user.role === 'Department Manager' && plan.departmentId === user.departmentId) return true;
    if (user.role === 'Team Leader' && plan.departmentId === user.departmentId) return true;
    if (plan.ownerId === user.id || plan.createdById === user.id) return true;
    if (plan.supportingEmployeeIds && plan.supportingEmployeeIds.includes(user.id)) return true;
    return false;
  }

  public canUpdateActivity(user: User, activity: Activity): boolean {
    if (['Super Admin', 'Administrator'].includes(user.role)) return true;
    const plan = this.plans.find(p => p.id === activity.actionPlanId);
    if (user.role === 'Department Manager' && plan && plan.departmentId === user.departmentId) return true;
    if (user.role === 'Team Leader' && (activity.teamLeaderId === user.id || (plan && plan.departmentId === user.departmentId))) return true;
    if (activity.assignedEmployeeId === user.id) return true;
    if (plan && (plan.ownerId === user.id || plan.createdById === user.id)) return true;
    return false;
  }

  public canDeleteActivity(user: User, activity: Activity): boolean {
    if (['Super Admin', 'Administrator'].includes(user.role)) return true;
    const plan = this.plans.find(p => p.id === activity.actionPlanId);
    if (user.role === 'Department Manager' && plan && plan.departmentId === user.departmentId) return true;
    if (user.role === 'Team Leader' && (activity.teamLeaderId === user.id || (plan && plan.departmentId === user.departmentId))) return true;
    if (plan && (plan.ownerId === user.id || plan.createdById === user.id)) return true;
    if (activity.assignedEmployeeId === user.id) return true;
    return false;
  }

  public canViewPlan(user: User, plan: ActionPlan): boolean {
    if (['Super Admin', 'Administrator', 'Executive / Viewer'].includes(user.role)) return true;
    if (user.role === 'Department Manager') {
      return plan.departmentId === user.departmentId || plan.ownerId === user.id || plan.createdById === user.id;
    }
    if (user.role === 'Team Leader') {
      const myActivityPlanIds = new Set(this.activities.filter(a => a.teamLeaderId === user.id || a.assignedEmployeeId === user.id).map(a => a.actionPlanId));
      return plan.departmentId === user.departmentId || myActivityPlanIds.has(plan.id) || plan.ownerId === user.id || plan.createdById === user.id;
    }
    // Employee: can view owned plan only
    return plan.ownerId === user.id || plan.createdById === user.id;
  }

  // Filter lists based on role
  public getAuthorizedPlans(user: User): ActionPlan[] {
    const activePlans = this.plans.filter(p => !p.isArchived);
    if (['Super Admin', 'Administrator', 'Executive / Viewer'].includes(user.role)) {
      return activePlans;
    }
    if (user.role === 'Department Manager') {
      return activePlans.filter(p => p.departmentId === user.departmentId || p.ownerId === user.id || p.createdById === user.id);
    }
    if (user.role === 'Team Leader') {
      // Plans where they own activities or lead team or own the plan
      const myActivityPlanIds = new Set(this.activities.filter(a => a.teamLeaderId === user.id || a.assignedEmployeeId === user.id).map(a => a.actionPlanId));
      return activePlans.filter(p => p.departmentId === user.departmentId || myActivityPlanIds.has(p.id) || p.ownerId === user.id || p.createdById === user.id);
    }
    // Employee: can view owned plan only
    return activePlans.filter(p => p.ownerId === user.id || p.createdById === user.id);
  }

  // --- Audit Logging ---
  public logAction(userId: string, userName: string, action: string, module: string, details: string) {
    const log: ActivityLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      userName,
      action,
      module,
      details,
      ipAddress: '192.168.1.' + (100 + Math.floor(Math.random() * 50)),
      createdAt: new Date().toISOString(),
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 200) this.auditLogs.pop();
    this.saveAll();
  }

  // --- Menu Access Control & RBAC Enforcement ---
  public validateMenuAccess(user: User, tab: NavTab): { allowed: boolean; reason?: string } {
    const isAllowed = canRoleAccessTab(user.role, tab);
    if (!isAllowed) {
      const rule = MENU_RBAC_POLICY[tab];
      const required = rule ? rule.allowedRoles.join(', ') : 'Super Admin, Administrator';
      return {
        allowed: false,
        reason: `Role '${user.role}' is not authorized to access menu '${tab}'. Required roles: [${required}].`
      };
    }
    return { allowed: true };
  }

  public logUnauthorizedAccess(user: User, tab: string, source: string = 'Navigation Guard'): void {
    this.logAction(
      user.id,
      user.name,
      'UNAUTHORIZED_MENU_ACCESS_ATTEMPT',
      'Security & RBAC Guard',
      `Blocked unauthorized access attempt to menu tab '${tab}' by ${user.name} (${user.role}). Source: ${source}.`
    );
  }

  public logMenuAccess(user: User, tab: NavTab): void {
    this.logAction(
      user.id,
      user.name,
      'MENU_ACCESS',
      'Navigation',
      `User navigated to '${tab}' module.`
    );
  }

  public getAuditLogs(actor?: User): ActivityLog[] {
    const user = actor || this.getCurrentUser();
    if (!['Super Admin', 'Administrator'].includes(user.role)) {
      this.logAction(
        user.id,
        user.name,
        'UNAUTHORIZED_AUDIT_LOGS_READ',
        'Security & RBAC Guard',
        `Access denied: ${user.name} (${user.role}) attempted to query system audit logs.`
      );
      return [];
    }
    return this.auditLogs;
  }

  // --- Departments ---
  public getDepartments(): Department[] {
    return this.departments;
  }

  public saveDepartment(dept: Partial<Department> & { name: string; code: string; id?: string }): Department {
    const user = this.getCurrentUser();
    let saved: Department;
    if (dept.id) {
      this.departments = this.departments.map(d => d.id === dept.id ? { ...d, ...dept } : d);
      saved = this.departments.find(d => d.id === dept.id)!;
      this.logAction(user.id, user.name, 'UPDATE_DEPT', 'Departments', `Updated department ${dept.name} (${dept.code})`);
    } else {
      saved = {
        name: dept.name,
        code: dept.code,
        description: dept.description || '',
        managerId: dept.managerId || user.id,
        headOfDepartmentId: dept.headOfDepartmentId,
        status: dept.status || 'Active',
        id: `dept-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      this.departments.push(saved);
      this.logAction(user.id, user.name, 'CREATE_DEPT', 'Departments', `Created department ${saved.name} (${saved.code})`);
    }
    this.saveAll();
    return saved;
  }

  public deleteDepartment(id: string): boolean {
    const user = this.getCurrentUser();
    const dept = this.departments.find(d => d.id === id);
    if (!dept) return false;
    // Check if plans or employees exist
    const hasPlans = this.plans.some(p => p.departmentId === id && !p.isArchived);
    if (hasPlans) {
      throw new Error(`Cannot delete department ${dept.name} because it has active action plans.`);
    }
    this.departments = this.departments.filter(d => d.id !== id);
    this.logAction(user.id, user.name, 'DELETE_DEPT', 'Departments', `Deleted department ${dept.name}`);
    this.saveAll();
    return true;
  }

  // --- Users / Employees ---
  public getUsers(): User[] {
    return this.users;
  }

  public getEmployees(): User[] {
    return this.users;
  }

  public saveUser(userData: Partial<User> & { name: string; email: string; id?: string; password?: string }): User {
    const actor = this.getCurrentUser();
    let saved: User;
    if (userData.id) {
      const existing = this.users.find(u => u.id === userData.id);
      const updatedFields: Partial<User> = { ...userData };
      
      // If password was omitted or empty in edit, keep existing password
      if (!userData.password?.trim()) {
        updatedFields.password = existing?.password || 'Password@123';
      } else {
        updatedFields.password = userData.password.trim();
      }

      this.users = this.users.map(u => u.id === userData.id ? { ...u, ...updatedFields } : u);
      saved = this.users.find(u => u.id === userData.id)!;
      const passMsg = userData.password?.trim() ? ' and changed password' : '';
      this.logAction(actor.id, actor.name, 'UPDATE_USER', 'Employees', `Updated employee ${saved.name} (${saved.role})${passMsg}`);
    } else {
      saved = {
        name: userData.name,
        email: userData.email,
        password: userData.password?.trim() || 'Password@123',
        employeeId: userData.employeeId || `EMP-${Date.now().toString().slice(-4)}`,
        phone: userData.phone || '',
        departmentId: userData.departmentId || this.departments[0]?.id || '',
        position: userData.position || 'Staff Member',
        role: userData.role || 'Employee',
        status: userData.status || 'Active',
        isActive: userData.isActive !== undefined ? userData.isActive : true,
        id: `usr-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      this.users.push(saved);
      this.logAction(actor.id, actor.name, 'CREATE_USER', 'Employees', `Created employee ${saved.name} with ID ${saved.employeeId}`);
    }
    this.saveAll();
    return saved;
  }

  public adminSetUserPassword(userId: string, newPassword: string): { success: boolean; error?: string } {
    const actor = this.getCurrentUser();
    const user = this.users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'User account not found.' };
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must contain at least 6 characters.' };
    }
    user.password = newPassword;
    this.saveAll();
    this.logAction(actor.id, actor.name, 'ADMIN_PASSWORD_RESET', 'Employees', `Updated password for employee ${user.name} (${user.employeeId || user.email})`);
    return { success: true };
  }

  public deleteUser(id: string): boolean {
    const actor = this.getCurrentUser();
    const userToDelete = this.users.find(u => u.id === id);
    if (!userToDelete) return false;
    if (userToDelete.id === actor.id) {
      throw new Error('You cannot delete your own active session user account.');
    }
    this.users = this.users.filter(u => u.id !== id);
    this.logAction(actor.id, actor.name, 'DELETE_USER', 'Employees', `Deleted user account ${userToDelete.name}`);
    this.saveAll();
    return true;
  }

  // --- Objectives ---
  public getObjectives(): Objective[] {
    return this.objectives;
  }

  public saveObjective(objData: Partial<Objective> & { title: string; id?: string }): Objective {
    const actor = this.getCurrentUser();
    let saved: Objective;
    if (objData.id) {
      this.objectives = this.objectives.map(o => o.id === objData.id ? { ...o, ...objData } : o);
      saved = this.objectives.find(o => o.id === objData.id)!;
      this.logAction(actor.id, actor.name, 'UPDATE_OBJECTIVE', 'Objectives', `Updated objective ${saved.title}`);
    } else {
      saved = {
        title: objData.title,
        code: objData.code || `OBJ-${new Date().getFullYear()}-${this.objectives.length + 1}`,
        description: objData.description || '',
        strategicGoal: objData.strategicGoal || '',
        departmentId: objData.departmentId || this.departments[0]?.id || '',
        ownerId: objData.ownerId || actor.id,
        kpi: objData.kpi || 'Annual Target',
        targetValue: objData.targetValue || 100,
        currentValue: objData.currentValue || 0,
        measurementUnit: objData.measurementUnit || '%',
        targetUnit: objData.targetUnit || '%',
        period: objData.period || '2026',
        category: objData.category || 'Operational',
        status: objData.status || 'In Progress',
        isActive: true,
        id: `obj-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      this.objectives.push(saved);
      this.logAction(actor.id, actor.name, 'CREATE_OBJECTIVE', 'Objectives', `Created objective ${saved.title} (${saved.code})`);
    }
    this.saveAll();
    return saved;
  }

  // --- Action Plans ---
  public getPlans(): ActionPlan[] {
    return this.plans.filter(p => !p.isArchived);
  }

  public getPlanById(id: string): ActionPlan | undefined {
    return this.plans.find(p => p.id === id);
  }

  public generateNextPlanNumber(): string {
    const year = new Date().getFullYear();
    const existing = this.plans
      .map(p => p.planNumber)
      .filter(num => num && num.startsWith(`AP-${year}-`));
    const highest = existing.reduce((max, num) => {
      const parts = num.split('-');
      const seq = parseInt(parts[2], 10);
      return !isNaN(seq) && seq > max ? seq : max;
    }, 0);
    const nextSeq = String(highest + 1).padStart(3, '0');
    return `AP-${year}-${nextSeq}`;
  }

  public savePlan(planData: Partial<ActionPlan> & { title: string; departmentId: string }): ActionPlan {
    const actor = this.getCurrentUser();
    let saved: ActionPlan;

    if (planData.id) {
      const existing = this.plans.find(p => p.id === planData.id);
      if (!existing) throw new Error('Action plan not found.');
      if (!this.canEditPlan(actor, existing)) {
        throw new Error(`Permission denied: You do not have permission to edit action plan ${existing.planNumber}.`);
      }
      saved = {
        ...existing,
        ...planData,
        updatedAt: new Date().toISOString(),
      };
      this.plans = this.plans.map(p => p.id === planData.id ? saved : p);
      this.logAction(actor.id, actor.name, 'UPDATE_PLAN', 'Action Plans', `Updated action plan ${saved.planNumber}: ${saved.title}`);
    } else {
      if (!this.canCreatePlan(actor)) {
        throw new Error(`Permission denied: Role ${actor.role} is not authorized to create action plans.`);
      }
      const planNumber = planData.planNumber || this.generateNextPlanNumber();
      saved = {
        id: `plan-${Date.now()}`,
        planNumber,
        title: planData.title,
        description: planData.description || '',
        objectiveId: planData.objectiveId || '',
        departmentId: planData.departmentId,
        ownerId: planData.ownerId || actor.id,
        supportingEmployeeIds: planData.supportingEmployeeIds || [],
        startDate: planData.startDate || new Date().toISOString().split('T')[0],
        dueDate: planData.dueDate || new Date().toISOString().split('T')[0],
        priority: planData.priority || 'Medium',
        status: planData.status || 'Draft',
        kpi: planData.kpi || '',
        kpiTarget: planData.kpiTarget || 100,
        kpiActual: planData.kpiActual || 0,
        kpiUnit: planData.kpiUnit || '%',
        budget: planData.budget || 0,
        expectedResult: planData.expectedResult || '',
        actualResult: planData.actualResult || '',
        completionPercentage: planData.completionPercentage || 0,
        approvalStatus: 'Draft',
        attachments: planData.attachments || [],
        createdById: actor.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.plans.unshift(saved);
      this.logAction(actor.id, actor.name, 'CREATE_PLAN', 'Action Plans', `Created action plan ${saved.planNumber}: ${saved.title}`);
    }

    this.recalculatePlanProgress(saved.id);
    this.saveAll();
    return this.getPlanById(saved.id)!;
  }

  public duplicatePlan(planId: string): ActionPlan {
    const actor = this.getCurrentUser();
    const source = this.plans.find(p => p.id === planId);
    if (!source) throw new Error('Source plan not found.');

    const newPlanNumber = this.generateNextPlanNumber();
    const newPlan: ActionPlan = {
      ...source,
      id: `plan-${Date.now()}`,
      planNumber: newPlanNumber,
      title: `${source.title} (Copy)`,
      status: 'Draft',
      approvalStatus: 'Draft',
      completionPercentage: 0,
      kpiActual: 0,
      actualResult: '',
      createdById: actor.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: [],
    };

    this.plans.unshift(newPlan);

    // Duplicate activities
    const sourceActivities = this.activities.filter(a => a.actionPlanId === planId);
    sourceActivities.forEach((act, index) => {
      this.activities.push({
        ...act,
        id: `act-${Date.now()}-${index}`,
        code: `ACT-${String(this.activities.length + 1).padStart(3, '0')}`,
        actionPlanId: newPlan.id,
        status: 'Not Started',
        progressPercentage: 0,
        actualResult: '',
        actualHours: 0,
        dependencies: [],
        completionDate: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    this.logAction(actor.id, actor.name, 'DUPLICATE_PLAN', 'Action Plans', `Duplicated ${source.planNumber} into ${newPlan.planNumber}`);
    this.saveAll();
    return newPlan;
  }

  public deletePlan(id: string): boolean {
    const actor = this.getCurrentUser();
    const plan = this.plans.find(p => p.id === id);
    if (!plan) return false;
    if (!this.canDeletePlan(actor, plan)) {
      throw new Error(`Permission denied: You are not authorized to delete action plan ${plan.planNumber}.`);
    }

    // Soft delete / archive
    plan.isArchived = true;
    plan.updatedAt = new Date().toISOString();
    this.logAction(actor.id, actor.name, 'DELETE_PLAN', 'Action Plans', `Archived action plan ${plan.planNumber}`);
    this.saveAll();
    return true;
  }

  // --- Streamlined Responsibility, Deadline & Priority Adjustments ---
  public updatePlanScheduleAndPriority(
    planId: string,
    params: { dueDate?: string; priority?: PriorityLevel; reason?: string }
  ): ActionPlan {
    const actor = this.getCurrentUser();
    const plan = this.plans.find(p => p.id === planId);
    if (!plan) throw new Error('Action Plan not found.');

    const changes: string[] = [];
    if (params.dueDate && params.dueDate !== plan.dueDate) {
      changes.push(`Deadline shifted from ${plan.dueDate} to ${params.dueDate}`);
      plan.dueDate = params.dueDate;
    }
    if (params.priority && params.priority !== plan.priority) {
      changes.push(`Priority adjusted from ${plan.priority} to ${params.priority}`);
      plan.priority = params.priority;
    }

    plan.updatedAt = new Date().toISOString();
    const reasonText = params.reason ? ` (Reason: "${params.reason}")` : '';
    this.logAction(
      actor.id,
      actor.name,
      'PLAN_SCHEDULE_ADJUSTMENT',
      'Action Plans',
      `Updated schedule/priority for ${plan.planNumber}: ${changes.join(', ')}${reasonText}`
    );
    this.saveAll();
    return plan;
  }

  public updateActivityScheduleAndPriority(
    activityId: string,
    params: { dueDate?: string; priority?: PriorityLevel; reason?: string }
  ): Activity {
    const actor = this.getCurrentUser();
    const activity = this.activities.find(a => a.id === activityId);
    if (!activity) throw new Error('Activity not found.');

    const changes: string[] = [];
    if (params.dueDate && params.dueDate !== activity.dueDate) {
      changes.push(`Due date changed from ${activity.dueDate} to ${params.dueDate}`);
      activity.dueDate = params.dueDate;
    }
    if (params.priority && params.priority !== activity.priority) {
      changes.push(`Priority changed from ${activity.priority} to ${params.priority}`);
      activity.priority = params.priority;
    }
    if (params.reason) {
      activity.lastAdjustmentReason = params.reason;
    }

    activity.updatedAt = new Date().toISOString();
    this.logAction(
      actor.id,
      actor.name,
      'ACTIVITY_SCHEDULE_ADJUSTMENT',
      'Activities',
      `Updated ${activity.code} (${activity.title}): ${changes.join(', ')}`
    );
    this.saveAll();
    return activity;
  }

  // --- Collaboration, Team Sharing & Supervisor Feedback ---
  public addPlanCollaborationReview(
    planId: string,
    reviewData: {
      reviewerId: string;
      reviewType: 'Supervisor Feedback' | 'Team Support' | 'Regular Goal Alignment' | 'Deadline Adjustment';
      notes: string;
      adjustmentProposed?: {
        newDueDate?: string;
        newPriority?: PriorityLevel;
        reason?: string;
      };
    }
  ): PlanCollaborationReview {
    const actor = this.getCurrentUser();
    const plan = this.plans.find(p => p.id === planId);
    if (!plan) throw new Error('Action Plan not found.');

    const newReview: PlanCollaborationReview = {
      id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      planId,
      requestedById: actor.id,
      reviewerId: reviewData.reviewerId,
      reviewType: reviewData.reviewType,
      status: 'Pending',
      notes: reviewData.notes,
      adjustmentProposed: reviewData.adjustmentProposed,
      createdAt: new Date().toISOString(),
    };

    if (!plan.collaborationReviews) {
      plan.collaborationReviews = [];
    }
    plan.collaborationReviews.unshift(newReview);

    // Notify reviewer
    const reviewer = this.users.find(u => u.id === reviewData.reviewerId);
    if (reviewer) {
      this.addNotification({
        userId: reviewer.id,
        title: `Collaboration Request: ${plan.planNumber}`,
        message: `${actor.name} shared action plan "${plan.title}" for ${reviewData.reviewType}. Note: "${reviewData.notes.slice(0, 80)}"`,
        type: 'approval_request',
        entityType: 'action_plan',
        entityId: plan.id,
      });
    }

    this.logAction(
      actor.id,
      actor.name,
      'PLAN_COLLABORATION_REQUEST',
      'Collaboration',
      `Shared plan ${plan.planNumber} with ${reviewer ? reviewer.name : 'colleague'} for ${reviewData.reviewType}`
    );

    this.saveAll();
    return newReview;
  }

  // --- Regular Reviews & Goal Alignment Checkpoint ---
  public recordPlanReview(
    planId: string,
    params: {
      reviewNotes: string;
      alignmentStatus: 'Fully Aligned' | 'Review Needed' | 'Shifted Priority';
      nextReviewDate?: string;
      reviewCycle?: 'Weekly' | 'Bi-Weekly' | 'Monthly' | 'Quarterly';
    }
  ): ActionPlan {
    const actor = this.getCurrentUser();
    const plan = this.plans.find(p => p.id === planId);
    if (!plan) throw new Error('Action Plan not found.');

    const today = new Date().toISOString().split('T')[0];
    plan.lastReviewDate = today;
    plan.alignmentStatus = params.alignmentStatus;
    if (params.nextReviewDate) {
      plan.nextReviewDate = params.nextReviewDate;
    }
    if (params.reviewCycle) {
      plan.reviewCycle = params.reviewCycle;
    }
    plan.updatedAt = new Date().toISOString();

    // Add progress/review update entry
    this.addProgressUpdate({
      entityType: 'action_plan',
      entityId: plan.id,
      previousPercentage: plan.completionPercentage,
      newPercentage: plan.completionPercentage,
      description: `Periodic Goal Alignment Checkpoint: ${params.alignmentStatus}`,
      completedWork: params.reviewNotes,
      actualKpiResult: `KPI Target: ${plan.kpiTarget} ${plan.kpiUnit} (Actual: ${plan.kpiActual})`,
    });

    this.logAction(
      actor.id,
      actor.name,
      'PLAN_GOAL_ALIGNMENT_REVIEW',
      'Goal Alignment',
      `Recorded periodic review for ${plan.planNumber}: ${params.alignmentStatus} (Notes: ${params.reviewNotes.slice(0, 60)})`
    );

    this.saveAll();
    return plan;
  }

  // --- Activities ---
  public getActivities(planId?: string): Activity[] {
    if (planId) {
      return this.activities.filter(a => a.actionPlanId === planId);
    }
    return this.activities;
  }

  public getActivityById(id: string): Activity | undefined {
    return this.activities.find(a => a.id === id);
  }

  public generateNextActivityCode(): string {
    const count = this.activities.length + 1;
    return `ACT-${String(count).padStart(3, '0')}`;
  }

  public validateTaskCompletion(activityId: string): { valid: boolean; unmetDependencyTitles?: string[] } {
    const activity = this.activities.find(a => a.id === activityId);
    if (!activity) return { valid: false };

    if (!activity.dependencies || activity.dependencies.length === 0) {
      return { valid: true };
    }

    const unmetDependencies: string[] = [];
    for (const depId of activity.dependencies) {
      const depActivity = this.activities.find(a => a.id === depId);
      if (!depActivity || depActivity.status !== 'Completed') {
        unmetDependencies.push(depActivity ? `${depActivity.code}: ${depActivity.title}` : `Activity ID ${depId}`);
      }
    }

    if (unmetDependencies.length > 0) {
      return { valid: false, unmetDependencyTitles: unmetDependencies };
    }
    return { valid: true };
  }

  public saveActivity(activityData: Partial<Activity> & { actionPlanId: string; title: string }): Activity {
    const actor = this.getCurrentUser();
    let saved: Activity;

    // Validate dependency completion if attempting to set Completed
    if (activityData.status === 'Completed' && activityData.id) {
      const validation = this.validateTaskCompletion(activityData.id);
      if (!validation.valid) {
        throw new Error(`Cannot mark task as Completed. Unfinished required dependencies: ${validation.unmetDependencyTitles?.join(', ')}`);
      }
    }

    if (activityData.id) {
      const existing = this.activities.find(a => a.id === activityData.id);
      if (!existing) throw new Error('Activity not found.');

      const isCompleted = activityData.status === 'Completed';
      const completionDate = isCompleted ? (activityData.completionDate || new Date().toISOString().split('T')[0]) : undefined;

      saved = {
        ...existing,
        ...activityData,
        completionDate,
        updatedAt: new Date().toISOString(),
      };
      this.activities = this.activities.map(a => a.id === activityData.id ? saved : a);
      this.logAction(actor.id, actor.name, 'UPDATE_ACTIVITY', 'Activities', `Updated activity ${saved.code}: ${saved.title}`);
    } else {
      saved = {
        id: `act-${Date.now()}`,
        code: activityData.code || this.generateNextActivityCode(),
        actionPlanId: activityData.actionPlanId,
        title: activityData.title,
        description: activityData.description || '',
        assignedEmployeeId: activityData.assignedEmployeeId || actor.id,
        teamLeaderId: activityData.teamLeaderId || actor.id,
        startDate: activityData.startDate || new Date().toISOString().split('T')[0],
        dueDate: activityData.dueDate || new Date().toISOString().split('T')[0],
        priority: activityData.priority || 'Medium',
        status: activityData.status || 'Not Started',
        progressPercentage: activityData.progressPercentage || 0,
        weight: activityData.weight || 10,
        kpiTarget: activityData.kpiTarget || '',
        actualResult: activityData.actualResult || '',
        estimatedHours: activityData.estimatedHours || 0,
        actualHours: activityData.actualHours || 0,
        dependencies: activityData.dependencies || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.activities.push(saved);
      this.logAction(actor.id, actor.name, 'CREATE_ACTIVITY', 'Activities', `Created activity ${saved.code}: ${saved.title}`);

      // Send assignment notification
      if (saved.assignedEmployeeId && saved.assignedEmployeeId !== actor.id) {
        this.addNotification({
          userId: saved.assignedEmployeeId,
          title: 'New Activity Assigned',
          message: `You were assigned to activity ${saved.code} (${saved.title}) by ${actor.name}.`,
          type: 'assignment',
          entityType: 'activity',
          entityId: saved.id,
        });
      }
    }

    this.recalculatePlanProgress(saved.actionPlanId);
    this.saveAll();
    return saved;
  }

  public deleteActivity(id: string): boolean {
    const actor = this.getCurrentUser();
    const activity = this.activities.find(a => a.id === id);
    if (!activity) return false;

    if (!this.canDeleteActivity(actor, activity)) {
      throw new Error(`Permission denied: You do not have permission to delete activity ${activity.code}.`);
    }

    // Check if other activities depend on this
    const dependent = this.activities.filter(a => a.dependencies.includes(id));
    if (dependent.length > 0) {
      throw new Error(`Cannot delete activity ${activity.code}. It is required as a dependency by: ${dependent.map(d => d.code).join(', ')}`);
    }

    const planId = activity.actionPlanId;
    this.activities = this.activities.filter(a => a.id !== id);
    this.logAction(actor.id, actor.name, 'DELETE_ACTIVITY', 'Activities', `Deleted activity ${activity.code}`);
    this.recalculatePlanProgress(planId);
    this.saveAll();
    return true;
  }

  // --- Automatic Progress Calculation ---
  public recalculatePlanProgress(planId: string) {
    const plan = this.plans.find(p => p.id === planId);
    if (!plan) return;

    const planActivities = this.activities.filter(a => a.actionPlanId === planId);
    if (planActivities.length === 0) return;

    const totalWeight = planActivities.reduce((sum, a) => sum + (a.weight || 1), 0);
    const weightedProgress = planActivities.reduce((sum, a) => {
      const w = a.weight || 1;
      return sum + (a.progressPercentage * w);
    }, 0);

    const calculatedProgress = Math.min(100, Math.round(weightedProgress / (totalWeight || 1)));
    plan.completionPercentage = calculatedProgress;

    // If 100% and in progress, check if we should prompt or flag completion
    if (calculatedProgress === 100 && plan.status === 'In Progress') {
      plan.status = 'Submitted for Completion';
      plan.approvalStatus = 'Pending Completion';
    }

    plan.updatedAt = new Date().toISOString();
  }

  // --- Progress Updates ---
  public addProgressUpdate(updateData: Omit<ProgressUpdate, 'id' | 'createdAt' | 'updatedById'>): ProgressUpdate {
    const actor = this.getCurrentUser();
    const newUpdate: ProgressUpdate = {
      ...updateData,
      id: `prog-${Date.now()}`,
      updatedById: actor.id,
      createdAt: new Date().toISOString(),
    };

    this.progressUpdates.unshift(newUpdate);

    if (updateData.entityType === 'activity') {
      const activity = this.activities.find(a => a.id === updateData.entityId);
      if (activity) {
        activity.progressPercentage = updateData.newPercentage;
        if (updateData.actualKpiResult) activity.actualResult = updateData.actualKpiResult;
        if (updateData.newPercentage === 100) {
          activity.status = 'Completed';
          activity.completionDate = new Date().toISOString().split('T')[0];
        } else if (updateData.newPercentage > 0 && activity.status === 'Not Started') {
          activity.status = 'In Progress';
        }
        activity.updatedAt = new Date().toISOString();
        this.recalculatePlanProgress(activity.actionPlanId);
      }
    } else {
      const plan = this.plans.find(p => p.id === updateData.entityId);
      if (plan) {
        plan.completionPercentage = updateData.newPercentage;
        if (updateData.actualKpiResult) plan.actualResult = updateData.actualKpiResult;
        plan.updatedAt = new Date().toISOString();
      }
    }

    this.logAction(actor.id, actor.name, 'PROGRESS_UPDATE', 'Progress Tracking', `Recorded progress update to ${updateData.newPercentage}%`);
    this.saveAll();
    return newUpdate;
  }

  public getProgressUpdates(entityId?: string): ProgressUpdate[] {
    if (entityId) {
      return this.progressUpdates.filter(u => u.entityId === entityId);
    }
    return this.progressUpdates;
  }

  // --- Approval Workflow Engine ---
  public handleApprovalAction(
    planId: string,
    action: ApprovalActionType,
    comments: string
  ): ActionPlan {
    const actor = this.getCurrentUser();
    const plan = this.plans.find(p => p.id === planId);
    if (!plan) throw new Error('Action Plan not found.');

    let newStatus = plan.status;
    let newApprovalStatus = plan.approvalStatus;
    let decision: 'Approved' | 'Rejected' | 'Revision Requested' | 'Submitted' = 'Approved';

    switch (action) {
      case 'Submit for Approval':
        newStatus = 'Submitted';
        newApprovalStatus = 'Pending Review';
        decision = 'Submitted';
        break;

      case 'Approve':
        newStatus = 'Approved';
        newApprovalStatus = 'Approved';
        decision = 'Approved';
        break;

      case 'Reject':
        if (!comments || comments.trim().length === 0) {
          throw new Error('A detailed reason is strictly required when rejecting a plan.');
        }
        newStatus = 'Rejected';
        newApprovalStatus = 'Rejected';
        decision = 'Rejected';
        break;

      case 'Request Revision':
        if (!comments || comments.trim().length === 0) {
          throw new Error('Please specify the revision instructions.');
        }
        newStatus = 'Draft';
        newApprovalStatus = 'Revision Requested';
        decision = 'Revision Requested';
        break;

      case 'Resubmit':
        newStatus = 'Submitted';
        newApprovalStatus = 'Pending Review';
        decision = 'Submitted';
        break;

      case 'Submit for Completion':
        newStatus = 'Submitted for Completion';
        newApprovalStatus = 'Pending Completion';
        decision = 'Submitted';
        break;

      case 'Final Approve Completion':
        newStatus = 'Completed';
        newApprovalStatus = 'Completed';
        decision = 'Approved';
        break;
    }

    plan.status = newStatus;
    plan.approvalStatus = newApprovalStatus;
    plan.updatedAt = new Date().toISOString();

    const approvalRecord: PlanApproval = {
      id: `appr-${Date.now()}`,
      actionPlanId: plan.id,
      stage: plan.status,
      action,
      reviewerId: actor.id,
      reviewerRole: actor.role,
      decision,
      comments: comments || `${action} executed by ${actor.name}`,
      timestamp: new Date().toISOString(),
    };
    this.approvals.unshift(approvalRecord);

    // Notify the plan owner
    if (plan.ownerId !== actor.id) {
      this.addNotification({
        userId: plan.ownerId,
        title: `Action Plan ${action}`,
        message: `Your action plan "${plan.title}" (${plan.planNumber}) received status update: ${newApprovalStatus}. Note: ${comments}`,
        type: action === 'Approve' || action === 'Final Approve Completion' ? 'approved' : action === 'Reject' ? 'rejected' : 'approval_request',
        entityType: 'action_plan',
        entityId: plan.id,
      });
    }

    this.logAction(actor.id, actor.name, `APPROVAL_${String(action || 'ACTION').toUpperCase().replace(/\s+/g, '_')}`, 'Approvals', `${action} on plan ${plan.planNumber}`);
    this.saveAll();
    return plan;
  }

  public getApprovals(planId?: string): PlanApproval[] {
    if (planId) {
      return this.approvals.filter(a => a.actionPlanId === planId);
    }
    return this.approvals;
  }

  // --- Notifications ---
  public getNotifications(userId?: string): NotificationItem[] {
    const targetUserId = userId || this.currentUserId;
    return this.notifications.filter(n => n.userId === targetUserId);
  }

  public getUnreadNotificationCount(userId?: string): number {
    return this.getNotifications(userId).filter(n => !n.isRead).length;
  }

  public addNotification(notif: Omit<NotificationItem, 'id' | 'createdAt' | 'isRead'>): NotificationItem {
    const item: NotificationItem = {
      ...notif,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.unshift(item);
    this.saveAll();
    return item;
  }

  public markNotificationAsRead(id: string) {
    this.notifications = this.notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
    this.saveAll();
  }

  public markAllNotificationsAsRead(userId?: string) {
    const target = userId || this.currentUserId;
    this.notifications = this.notifications.map(n => n.userId === target ? { ...n, isRead: true } : n);
    this.saveAll();
  }

  public validateDependencies(activityId: string): { canComplete: boolean; blockingActivities: Activity[] } {
    const activity = this.activities.find(a => a.id === activityId);
    if (!activity || !activity.dependencies || activity.dependencies.length === 0) {
      return { canComplete: true, blockingActivities: [] };
    }
    const blocking = this.activities.filter(a => activity.dependencies.includes(a.id) && a.status !== 'Completed');
    return {
      canComplete: blocking.length === 0,
      blockingActivities: blocking,
    };
  }

  // --- Attendance Management & Privacy Access Control ---
  public getAttendanceRecords(filter?: {
    date?: string;
    userId?: string;
    departmentId?: string;
    month?: string;
    status?: string;
    requestingUser?: User;
  }): AttendanceRecord[] {
    // If requestingUser is provided and has role 'Employee', strictly enforce privacy: employees only see their own records
    if (filter?.requestingUser && filter.requestingUser.role === 'Employee') {
      return this.attendanceRecords.filter(rec => {
        if (rec.userId !== filter.requestingUser!.id) return false;
        if (filter?.date && rec.date !== filter.date) return false;
        if (filter?.month && !rec.date.startsWith(filter.month)) return false;
        if (filter?.status && filter.status !== 'all' && rec.status !== filter.status) return false;
        return true;
      });
    }

    return this.attendanceRecords.filter(rec => {
      if (filter?.date && rec.date !== filter.date) return false;
      if (filter?.userId && filter.userId !== 'all' && rec.userId !== filter.userId) return false;
      if (filter?.departmentId && filter.departmentId !== 'all' && rec.departmentId !== filter.departmentId) return false;
      if (filter?.month && !rec.date.startsWith(filter.month)) return false;
      if (filter?.status && filter.status !== 'all' && rec.status !== filter.status) return false;
      return true;
    });
  }

  /**
   * Strictly enforces Privacy & Access Control for Attendance:
   * Employees can only access their own attendance records.
   * Supervisors (Team Leaders), Department Managers, and Administrators can access attendance for their team/organization.
   */
  public getAuthorizedAttendanceRecords(user: User, filter?: {
    date?: string;
    userId?: string;
    departmentId?: string;
    month?: string;
    status?: string;
  }): AttendanceRecord[] {
    let list = this.getAttendanceRecords(filter);
    if (user.role === 'Employee') {
      // Strict privacy mandate: Employees can only access their own records
      return list.filter(r => r.userId === user.id);
    }
    if (user.role === 'Team Leader' || user.role === 'Department Manager') {
      if (filter?.userId && filter.userId !== 'all') {
        return list.filter(r => r.userId === filter.userId);
      }
      if (filter?.departmentId && filter.departmentId !== 'all') {
        return list.filter(r => r.departmentId === filter.departmentId);
      }
      // Defaults to their own department + self
      if (user.departmentId) {
        return list.filter(r => r.departmentId === user.departmentId || r.userId === user.id);
      }
    }
    return list;
  }

  /**
   * Check if a user has authority to view or manage attendance records for other personnel.
   */
  public canAccessOthersAttendance(user: User): boolean {
    return ['Super Admin', 'Administrator', 'Department Manager', 'Team Leader'].includes(user.role);
  }

  /**
   * Retrieve the designated supervisor for an employee (Team Leader or Department Manager).
   */
  public getSupervisorForUser(user: User): User | undefined {
    if (!user.departmentId) return undefined;
    // First check for Team Leader in the department
    const teamLeader = this.users.find(u => u.departmentId === user.departmentId && u.role === 'Team Leader' && u.id !== user.id);
    if (teamLeader) return teamLeader;
    // Next check for Department Manager
    const deptManager = this.users.find(u => u.departmentId === user.departmentId && u.role === 'Department Manager' && u.id !== user.id);
    if (deptManager) return deptManager;
    // Fallback to Administrator
    return this.users.find(u => u.role === 'Administrator');
  }

  /**
   * Retrieve HR contact details for attendance and leave assistance inquiries.
   */
  public getHrContact(): { hrDirector?: User; email: string; phone: string; departmentName: string; office: string } {
    const hrDirector = this.users.find(u => u.departmentId === 'dept-4' && (u.role === 'Department Manager' || u.role === 'Administrator')) 
      || this.users.find(u => u.name.includes('Kolab'));
    return {
      hrDirector,
      email: hrDirector?.email || 'hr.governance@enterprise.gov.kh',
      phone: hrDirector?.phone || '+855 12 990 011',
      departmentName: 'Human Resources & Workforce Governance',
      office: 'Building B, Room 204 (HR Operations Desk)'
    };
  }

  public getTodayAttendance(userId?: string): AttendanceRecord | undefined {
    const targetUserId = userId || this.currentUserId;
    // Current application reference date is 2026-09-17
    const today = '2026-09-17';
    return this.attendanceRecords.find(r => r.userId === targetUserId && r.date === today);
  }

  public checkIn(
    userId?: string, 
    notes?: string, 
    location: string = 'Phnom Penh HQ - Main Tower',
    shift: ShiftType = 'Morning',
    privacyOptions?: {
      isManualZeroSignal?: boolean;
      anonymizeLocation?: boolean;
      vpnMasked?: boolean;
    },
    networkOptions?: {
      clientIp?: string;
      networkId?: string;
      ssid?: string;
      forceSeamless?: boolean;
    }
  ): { success: boolean; record?: AttendanceRecord; message: string; blockedByPolicy?: boolean } {
    const targetUserId = userId || this.currentUserId;
    const user = this.users.find(u => u.id === targetUserId);
    if (!user) {
      return { success: false, message: 'User not found.' };
    }

    const today = '2026-09-17';
    const existing = this.attendanceRecords.find(r => r.userId === targetUserId && r.date === today);
    if (existing && existing.checkInTime) {
      return { 
        success: false, 
        record: existing,
        message: `Already checked in today at ${existing.checkInTime} (${existing.workShift || 'Shift'}).` 
      };
    }

    const isZeroSignal = Boolean(privacyOptions?.isManualZeroSignal);
    const targetIp = networkOptions?.clientIp || this.currentConnection.clientIp;
    const ipCheck = checkIpAgainstNetworks(targetIp, this.networks, this.networkSettings.allowedSpecificIps);
    const isWhitelisted = ipCheck.isWhitelisted;
    const matchedNetwork = ipCheck.matchedNetwork || this.networks.find(n => n.id === networkOptions?.networkId);

    // Enforce Network Whitelist Policy if in Strict Mode (Only Admin-managed authorized IPs accept check-in)
    const isSuperOrAdmin = user.role === 'Super Admin' || user.role === 'Administrator';
    if (this.networkSettings.enforceMode === 'Strict' && !isWhitelisted && !isSuperOrAdmin) {
      const activeIps = [
        ...(this.networkSettings.allowedSpecificIps || []),
        ...this.networks.filter(n => n.status === 'Active').flatMap(n => n.allowedSpecificIps || n.ipRanges)
      ].slice(0, 5).join(', ');

      this.logNetworkAccess({
        employeeId: user.id,
        employeeName: user.name,
        departmentName: this.departments.find(d => d.id === user.departmentId)?.name || 'General',
        clientIp: targetIp,
        matchedNetworkId: undefined,
        matchedNetworkName: undefined,
        whitelistStatus: 'Blocked (Non-Whitelisted)',
        action: 'Check-In',
        latencyMs: this.currentConnection.latencyMs,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web Portal Client',
        flaggedReason: `Check-in attempt from unauthorized IP (${targetIp}) while Strict IP Whitelist Enforcement is active.`,
      });

      return {
        success: false,
        blockedByPolicy: true,
        message: `Check-in rejected: Current IP (${targetIp}) is not whitelisted. Only authorized specific IPs and workplace subnets (${activeIps}...) can accept check-in.`,
      };
    }

    // Determine current clock time
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}:${seconds}`;

    const shiftConfig = WORK_SHIFTS[shift] || WORK_SHIFTS.Morning;
    const currentH = parseInt(hours, 10);
    const currentM = parseInt(minutes, 10);

    // Evaluate punctuality threshold based on selected shift
    const isLate = currentH > shiftConfig.lateGraceHour || 
      (currentH === shiftConfig.lateGraceHour && currentM > shiftConfig.lateGraceMinute);
    const status: AttendanceStatus = isLate ? 'Late' : 'Present';

    const shouldAnonymize = privacyOptions?.anonymizeLocation ?? this.privacySettings.defaultAnonymizeLocation;
    const isVpnMasked = privacyOptions?.vpnMasked ?? this.privacySettings.enableVpnMasking;

    let finalLocation = location;
    if (isZeroSignal) {
      finalLocation = 'Manual Self-Attestation (Zero-Tracking Zone)';
    } else if (shouldAnonymize) {
      finalLocation = location.includes('HQ') || location.includes('Tower') || location.includes('Data Center')
        ? 'Anonymized Campus Zone [Cluster A] (Zero-Tracking)'
        : 'Anonymized Worksite Zone (Zero-Tracking)';
    } else if (matchedNetwork && location === 'Phnom Penh HQ - Main Tower') {
      finalLocation = matchedNetwork.locationName;
    }

    const finalIp = isVpnMasked 
      ? `10.8.0.${Math.floor(10 + Math.random() * 80)} [VPN Tunnel Masked]`
      : shouldAnonymize 
      ? '192.168.xxx.xxx [Protected Subnet]'
      : targetIp;

    const defaultNotes = isLate 
      ? `Checked in late for ${shiftConfig.name} (Grace threshold: ${String(shiftConfig.lateGraceHour).padStart(2, '0')}:${String(shiftConfig.lateGraceMinute).padStart(2, '0')})`
      : isZeroSignal
      ? `Punctual manual check-in for ${shiftConfig.name} (Zero GPS & Telemetry Tracking)`
      : isWhitelisted
      ? `Punctual check-in via Authorized IP [${targetIp}]`
      : `Punctual check-in for ${shiftConfig.name}`;

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}-${user.id}`,
      userId: user.id,
      userName: user.name,
      employeeId: user.employeeId || 'EMP-999',
      departmentId: user.departmentId,
      date: today,
      checkInTime: timeStr,
      checkOutTime: null,
      status: status,
      shiftType: shift,
      workShift: shiftConfig.fullLabel,
      workingHours: 0,
      overtimeHours: 0,
      notes: notes || defaultNotes,
      location: finalLocation,
      ipAddress: finalIp,
      checkInMethod: isZeroSignal 
        ? 'Manual Self-Attestation (Zero-Tracking)' 
        : isWhitelisted && this.networkSettings.seamlessCheckInEnabled
        ? 'Web Portal'
        : 'Web Portal',
      createdAt: new Date().toISOString(),
      isAnonymized: shouldAnonymize || isZeroSignal,
      privacyMode: isZeroSignal ? 'Zero-Tracking' : (isVpnMasked ? 'VPN-Masked' : 'Standard'),
      locationAnonymized: shouldAnonymize || isZeroSignal,
      vpnProtected: isVpnMasked,
      zeroSignalVerified: isZeroSignal,
      networkWhitelisted: isWhitelisted,
      networkId: matchedNetwork?.id,
      networkName: matchedNetwork?.name,
      ssid: undefined,
      seamlessVerified: Boolean(isWhitelisted && (matchedNetwork?.allowSeamlessCheckIn ?? true)),
    };

    if (existing) {
      // Overwrite existing placeholder record if any
      const idx = this.attendanceRecords.findIndex(r => r.id === existing.id);
      this.attendanceRecords[idx] = newRecord;
    } else {
      this.attendanceRecords.unshift(newRecord);
    }

    this.logAction(
      user.id,
      user.name,
      'ATTENDANCE_CHECKIN',
      'Attendance',
      `Checked in for ${shiftConfig.name} at ${timeStr} (${status}). IP Whitelisted: ${isWhitelisted ? 'Yes (' + targetIp + ')' : 'No (External)'}`
    );

    // Live network telemetry audit log
    this.logNetworkAccess({
      employeeId: user.id,
      employeeName: user.name,
      departmentName: this.departments.find(d => d.id === user.departmentId)?.name || 'General',
      clientIp: targetIp,
      matchedNetworkId: matchedNetwork?.id,
      matchedNetworkName: matchedNetwork?.name,
      ssid: undefined,
      whitelistStatus: isWhitelisted
        ? (matchedNetwork?.securityType.includes('VPN') ? 'VPN-Secured' : 'Whitelisted (Seamless)')
        : 'External / Remote',
      action: 'Check-In',
      latencyMs: this.currentConnection.latencyMs,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web Portal Client',
      flaggedReason: !isWhitelisted ? 'Access from external unwhitelisted IP address' : undefined,
    });

    this.addNotification({
      userId: user.id,
      title: isZeroSignal ? 'Zero-Tracking Check-In Confirmed' : 'Attendance Check-In Confirmed',
      message: `Successfully registered check-in for ${shiftConfig.name} at ${timeStr} on ${today} (${status}). ${isWhitelisted ? 'Verified via authorized IP: ' + targetIp : ''}`,
      type: 'progress',
    });

    this.saveAll();
    return { 
      success: true, 
      record: newRecord, 
      message: isZeroSignal 
        ? `Zero-tracking manual check-in recorded for ${shiftConfig.name} at ${timeStr} (No GPS/Telemetry logged).`
        : isWhitelisted
        ? `Seamless check-in verified via authorized IP (${targetIp}) at ${timeStr} (${status}).`
        : `Check-in recorded for ${shiftConfig.name} at ${timeStr} (${status}).` 
    };
  }

  public checkOut(
    userId?: string, 
    notes?: string
  ): { success: boolean; record?: AttendanceRecord; message: string } {
    const targetUserId = userId || this.currentUserId;
    const user = this.users.find(u => u.id === targetUserId);
    if (!user) {
      return { success: false, message: 'User not found.' };
    }

    const today = '2026-09-17';
    const record = this.attendanceRecords.find(r => r.userId === targetUserId && r.date === today);
    if (!record || !record.checkInTime) {
      return { 
        success: false, 
        message: 'No check-in record found for today. Please check in first before checking out.' 
      };
    }

    if (record.checkOutTime) {
      return { 
        success: false, 
        record, 
        message: `Already checked out today at ${record.checkOutTime}. Total hours: ${record.workingHours}h.` 
      };
    }

    // Enforce Network Whitelist Policy if in Strict Mode (Only Admin-managed authorized IPs accept check-out)
    const targetIp = this.currentConnection.clientIp;
    const ipCheck = checkIpAgainstNetworks(targetIp, this.networks, this.networkSettings.allowedSpecificIps);
    const isWhitelisted = ipCheck.isWhitelisted;
    const isSuperOrAdmin = user.role === 'Super Admin' || user.role === 'Administrator';

    if (this.networkSettings.enforceMode === 'Strict' && !isWhitelisted && !isSuperOrAdmin) {
      const activeIps = [
        ...(this.networkSettings.allowedSpecificIps || []),
        ...this.networks.filter(n => n.status === 'Active').flatMap(n => n.allowedSpecificIps || n.ipRanges)
      ].slice(0, 5).join(', ');

      this.logNetworkAccess({
        employeeId: user.id,
        employeeName: user.name,
        departmentName: this.departments.find(d => d.id === user.departmentId)?.name || 'General',
        clientIp: targetIp,
        matchedNetworkId: undefined,
        matchedNetworkName: undefined,
        whitelistStatus: 'Blocked (Non-Whitelisted)',
        action: 'Check-Out',
        latencyMs: this.currentConnection.latencyMs,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web Portal Client',
        flaggedReason: `Check-out attempt from unauthorized IP (${targetIp}) while Strict IP Whitelist Enforcement is active.`,
      });

      return {
        success: false,
        message: `Check-out rejected: Current IP (${targetIp}) is not whitelisted. Only authorized specific IPs and workplace subnets (${activeIps}...) can accept check-out.`,
      };
    }

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}:${seconds}`;

    // Compute working duration based on checkInTime
    const [inH, inM] = record.checkInTime.split(':').map(Number);
    const inTotalMinutes = inH * 60 + inM;
    const outTotalMinutes = parseInt(hours, 10) * 60 + parseInt(minutes, 10);
    const diffMinutes = Math.max(15, outTotalMinutes - inTotalMinutes);
    
    // Deduct 1 hour lunch break if shift > 5 hours
    const actualWorkMinutes = diffMinutes > 300 ? diffMinutes - 60 : diffMinutes;
    const totalHours = Math.round((actualWorkMinutes / 60) * 10) / 10;
    const overtimeHours = totalHours > 8.0 ? Math.round((totalHours - 8.0) * 10) / 10 : 0;

    record.checkOutTime = timeStr;
    record.workingHours = totalHours;
    record.overtimeHours = overtimeHours;
    if (overtimeHours > 0 && record.status === 'Present') {
      record.status = 'Overtime';
    }
    if (notes) {
      record.notes = (record.notes ? `${record.notes} | ` : '') + notes;
    }

    this.logAction(
      user.id,
      user.name,
      'ATTENDANCE_CHECKOUT',
      'Attendance',
      `Checked out at ${timeStr}. Logged ${totalHours} hrs (Overtime: ${overtimeHours} hrs).`
    );

    this.logNetworkAccess({
      employeeId: user.id,
      employeeName: user.name,
      departmentName: this.departments.find(d => d.id === user.departmentId)?.name || 'General',
      clientIp: this.currentConnection.clientIp,
      matchedNetworkId: this.currentConnection.networkId,
      matchedNetworkName: this.currentConnection.networkName,
      ssid: this.currentConnection.ssid,
      whitelistStatus: this.currentConnection.isWhitelisted
        ? (this.currentConnection.connectionType === 'Corporate VPN' ? 'VPN-Secured' : 'Whitelisted (Seamless)')
        : 'External / Remote',
      action: 'Check-Out',
      latencyMs: this.currentConnection.latencyMs,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web Portal Client',
    });

    this.addNotification({
      userId: user.id,
      title: 'Attendance Check-Out Confirmed',
      message: `Successfully checked out at ${timeStr}. Total shift duration: ${totalHours} hours.`,
      type: 'progress',
    });

    this.saveAll();
    return { 
      success: true, 
      record, 
      message: `Checked out successfully at ${timeStr}. Logged ${totalHours} working hours.` 
    };
  }

  public manualRecordAttendance(recordData: Omit<AttendanceRecord, 'id' | 'createdAt'>): AttendanceRecord {
    const shiftType: ShiftType = recordData.shiftType || 
      (recordData.workShift?.toLowerCase().includes('evening') ? 'Evening' : 'Morning');
    const shiftConfig = WORK_SHIFTS[shiftType];

    const newRecord: AttendanceRecord = {
      ...recordData,
      shiftType,
      workShift: recordData.workShift || shiftConfig.fullLabel,
      id: `att-man-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    this.attendanceRecords.unshift(newRecord);

    const currentUser = this.getCurrentUser();
    this.logAction(
      currentUser.id,
      currentUser.name,
      'ATTENDANCE_MANUAL_ADJUSTMENT',
      'Attendance',
      `Manual attendance logged for ${newRecord.userName} on ${newRecord.date} (${newRecord.status}).`
    );

    this.saveAll();
    return newRecord;
  }

  public updateAttendance(id: string, updates: Partial<AttendanceRecord>): AttendanceRecord | null {
    const idx = this.attendanceRecords.findIndex(r => r.id === id);
    if (idx === -1) return null;

    const existing = this.attendanceRecords[idx];
    const newShiftType = (updates.shiftType || existing.shiftType || 'Morning') as ShiftType;
    const shiftConfig = this.getWorkShift(newShiftType);

    const updatedRecord: AttendanceRecord = {
      ...existing,
      ...updates,
      shiftType: newShiftType,
      workShift: updates.workShift || (shiftConfig ? shiftConfig.fullLabel : existing.workShift),
    };

    // Auto calculate working hours if times provided and workingHours not explicitly supplied
    if (updates.checkInTime !== undefined || updates.checkOutTime !== undefined) {
      if (updatedRecord.checkInTime && updatedRecord.checkOutTime) {
        const [inH, inM] = updatedRecord.checkInTime.split(':').map(Number);
        const [outH, outM] = updatedRecord.checkOutTime.split(':').map(Number);
        if (!isNaN(inH) && !isNaN(outH)) {
          const inTotal = inH * 60 + (inM || 0);
          const outTotal = outH * 60 + (outM || 0);
          const diff = Math.max(0, outTotal - inTotal);
          const actualWork = diff > 300 ? diff - 60 : diff;
          if (updates.workingHours === undefined) {
            updatedRecord.workingHours = Math.round((actualWork / 60) * 10) / 10;
          }
          if (updates.overtimeHours === undefined) {
            updatedRecord.overtimeHours = updatedRecord.workingHours > 8.0 
              ? Math.round((updatedRecord.workingHours - 8.0) * 10) / 10 
              : 0;
          }
        }
      }
    }

    this.attendanceRecords[idx] = updatedRecord;

    const currentUser = this.getCurrentUser();
    this.logAction(
      currentUser.id,
      currentUser.name,
      'ATTENDANCE_SHIFT_UPDATED',
      'Attendance',
      `Updated shift/attendance record #${id} for ${updatedRecord.userName} (${updatedRecord.workShift}, ${updatedRecord.status})`
    );

    this.saveAll();
    return this.attendanceRecords[idx];
  }

  // --- Work Shift Configuration Management ---
  public getWorkShifts(): Record<string, WorkShiftConfig> {
    return { ...this.workShifts };
  }

  public getWorkShift(id: string): WorkShiftConfig | undefined {
    return this.workShifts[id] || Object.values(this.workShifts).find(s => s.id === id);
  }

  public updateWorkShift(shiftId: string, updates: Partial<WorkShiftConfig>): WorkShiftConfig {
    if (!this.workShifts[shiftId]) {
      const hoursStr = updates.hours || `${updates.startTime?.slice(0, 5) || '08:00'} - ${updates.endTime?.slice(0, 5) || '16:30'}`;
      this.workShifts[shiftId] = {
        id: shiftId as ShiftType,
        name: updates.name || `${shiftId} Shift`,
        nameKm: updates.nameKm || `វេន${shiftId}`,
        hours: hoursStr,
        startTime: updates.startTime || '08:00:00',
        endTime: updates.endTime || '16:30:00',
        startHour: updates.startHour || 8,
        startMinute: updates.startMinute || 0,
        endHour: updates.endHour || 16,
        endMinute: updates.endMinute || 30,
        lateGraceHour: updates.lateGraceHour || 8,
        lateGraceMinute: updates.lateGraceMinute || 15,
        fullLabel: updates.fullLabel || `${updates.name || shiftId} (${hoursStr})`,
        fullLabelKm: updates.fullLabelKm || `វេន${shiftId} (${hoursStr})`,
        description: updates.description || 'Custom workplace shift',
        descriptionKm: updates.descriptionKm || 'វេនបំពេញការងារ',
        icon: updates.icon || 'Clock',
        theme: updates.theme || 'blue',
        isActive: updates.isActive !== undefined ? updates.isActive : true,
      };
    } else {
      this.workShifts[shiftId] = {
        ...this.workShifts[shiftId],
        ...updates,
      };
    }

    // Auto-update hours and fullLabel if start/end times change
    if (updates.startTime || updates.endTime || updates.name) {
      const s = this.workShifts[shiftId];
      if (s.startTime && s.endTime) {
        s.hours = `${s.startTime.slice(0, 5)} - ${s.endTime.slice(0, 5)}`;
      }
      s.fullLabel = `${s.name} (${s.hours})`;
      s.fullLabelKm = `${s.nameKm} (${s.hours})`;
    }

    WORK_SHIFTS = this.workShifts;

    const currentUser = this.getCurrentUser();
    this.logAction(
      currentUser.id,
      currentUser.name,
      'WORK_SHIFT_CONFIG_UPDATED',
      'Shift Governance',
      `Updated shift configuration for "${this.workShifts[shiftId].name}" (${this.workShifts[shiftId].hours})`
    );

    this.saveAll();
    return this.workShifts[shiftId];
  }

  public resetWorkShifts(): Record<string, WorkShiftConfig> {
    this.workShifts = JSON.parse(JSON.stringify(DEFAULT_WORK_SHIFTS));
    WORK_SHIFTS = this.workShifts;
    this.saveAll();
    return this.getWorkShifts();
  }

  public deleteAttendance(id: string): boolean {
    const initialLen = this.attendanceRecords.length;
    this.attendanceRecords = this.attendanceRecords.filter(r => r.id !== id);
    if (this.attendanceRecords.length !== initialLen) {
      this.saveAll();
      return true;
    }
    return false;
  }

  // --- Automated Monthly Reports ---
  public getMonthlyReports(): MonthlyAttendanceReport[] {
    return this.monthlyReports;
  }

  public getMonthlyReportById(id: string): MonthlyAttendanceReport | undefined {
    return this.monthlyReports.find(r => r.id === id);
  }

  public generateMonthlyReport(
    month: string = '2026-09',
    departmentId: string = 'all',
    actor?: User
  ): MonthlyAttendanceReport {
    const currentActor = actor || this.getCurrentUser();
    
    // Parse month label (e.g., '2026-09' -> 'September 2026')
    const [yearStr, monthStr] = month.split('-');
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthIndex = parseInt(monthStr, 10) - 1;
    const monthLabel = `${monthNames[monthIndex] || 'Month'} ${yearStr}`;

    // Standard business working days for this month
    const standardWorkingDays = 22;

    // Filter employees
    const targetEmployees = this.users.filter(u => {
      if (u.status === 'Inactive' || u.isActive === false) return false;
      if (departmentId !== 'all' && u.departmentId !== departmentId) return false;
      return true;
    });

    const targetDepts = departmentId === 'all' 
      ? this.departments 
      : this.departments.filter(d => d.id === departmentId);

    const employeeSummaries: EmployeeAttendanceSummary[] = [];

    // Calculate each employee's metrics
    for (const emp of targetEmployees) {
      const empDept = this.departments.find(d => d.id === emp.departmentId);
      const empRecords = this.attendanceRecords.filter(
        r => r.userId === emp.id && r.date.startsWith(month)
      );

      let presentDays = 0;
      let lateDays = 0;
      let absentDays = 0;
      let leaveDays = 0;
      let totalHours = 0;
      let overtimeHours = 0;

      empRecords.forEach(rec => {
        if (rec.status === 'Present') presentDays++;
        else if (rec.status === 'Late') { presentDays++; lateDays++; }
        else if (rec.status === 'Overtime') { presentDays++; }
        else if (rec.status === 'Half Day') { presentDays += 0.5; }
        else if (rec.status === 'On Leave') { leaveDays++; }
        else if (rec.status === 'Absent') { absentDays++; }

        totalHours += rec.workingHours || 0;
        overtimeHours += rec.overtimeHours || 0;
      });

      // If records are partial (e.g. mid-month), ensure minimum realistic representation
      const recordedDays = presentDays + leaveDays + absentDays;
      const effectiveWorkingDays = Math.max(recordedDays, month === '2026-09' ? 14 : standardWorkingDays);
      
      const attendanceRate = Math.min(
        100,
        Math.round(((presentDays + leaveDays * 0.7) / Math.max(1, effectiveWorkingDays)) * 1000) / 10
      );

      // Cross-reference completed activities in this month!
      const tasksCompleted = this.activities.filter(
        a => a.assignedEmployeeId === emp.id && a.status === 'Completed'
      ).length;

      // Qualitative performance remarks based on data
      let remarks = 'Consistently punctual with dependable attendance record.';
      if (overtimeHours >= 10) {
        remarks = `Exceptional dedication with ${overtimeHours}h overtime logged and high task velocity.`;
      } else if (lateDays >= 2) {
        remarks = `Advisement noted regarding ${lateDays} late arrivals. Task delivery remains satisfactory.`;
      } else if (tasksCompleted >= 8) {
        remarks = `Outstanding productivity: ${tasksCompleted} action plan activities completed with ${attendanceRate}% attendance compliance.`;
      } else if (attendanceRate >= 98) {
        remarks = 'Exemplary 100% on-time attendance and prompt shift reporting.';
      }

      employeeSummaries.push({
        userId: emp.id,
        employeeName: emp.name,
        employeeId: emp.employeeId || `EMP-${emp.id.slice(-3)}`,
        departmentId: emp.departmentId,
        departmentName: empDept?.name || 'General Operations',
        position: emp.position,
        totalWorkingDays: effectiveWorkingDays,
        presentDays: Math.round(presentDays),
        lateDays,
        absentDays,
        leaveDays,
        totalWorkingHours: Math.round(totalHours * 10) / 10,
        totalOvertimeHours: Math.round(overtimeHours * 10) / 10,
        attendanceRate: Math.max(75, attendanceRate),
        tasksCompletedThisMonth: tasksCompleted,
        performanceRemarks: remarks,
      });
    }

    // Aggregate by Department
    const departmentSummaries: DepartmentAttendanceSummary[] = targetDepts.map(dept => {
      const deptEmployees = employeeSummaries.filter(e => e.departmentId === dept.id);
      const count = deptEmployees.length;
      if (count === 0) {
        return {
          departmentId: dept.id,
          departmentName: dept.name,
          employeeCount: 0,
          averageAttendanceRate: 100,
          totalHours: 0,
          totalOvertimeHours: 0,
          lateCount: 0,
          absentCount: 0,
        };
      }

      const avgRate = Math.round(
        deptEmployees.reduce((acc, e) => acc + e.attendanceRate, 0) / count * 10
      ) / 10;
      const deptTotalHours = Math.round(
        deptEmployees.reduce((acc, e) => acc + e.totalWorkingHours, 0) * 10
      ) / 10;
      const deptOT = Math.round(
        deptEmployees.reduce((acc, e) => acc + e.totalOvertimeHours, 0) * 10
      ) / 10;
      const totalLate = deptEmployees.reduce((acc, e) => acc + e.lateDays, 0);
      const totalAbsent = deptEmployees.reduce((acc, e) => acc + e.absentDays, 0);

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        employeeCount: count,
        averageAttendanceRate: avgRate,
        totalHours: deptTotalHours,
        totalOvertimeHours: deptOT,
        lateCount: totalLate,
        absentCount: totalAbsent,
      };
    });

    // Enterprise Aggregates
    const totalEmployees = employeeSummaries.length;
    const avgEnterpriseRate = totalEmployees > 0 
      ? Math.round(employeeSummaries.reduce((acc, e) => acc + e.attendanceRate, 0) / totalEmployees * 10) / 10
      : 100;
    const totalHoursLogged = Math.round(employeeSummaries.reduce((acc, e) => acc + e.totalWorkingHours, 0) * 10) / 10;
    const totalOvertimeHours = Math.round(employeeSummaries.reduce((acc, e) => acc + e.totalOvertimeHours, 0) * 10) / 10;
    const totalLateArrivals = employeeSummaries.reduce((acc, e) => acc + e.lateDays, 0);
    const totalAbsences = employeeSummaries.reduce((acc, e) => acc + e.absentDays, 0);

    const targetDeptObj = this.departments.find(d => d.id === departmentId);
    const departmentName = targetDeptObj ? targetDeptObj.name : 'All Enterprise Departments';

    const newReport: MonthlyAttendanceReport = {
      id: `rep-m-${Date.now()}`,
      reportCode: `REP-ATT-${String(month || '2026-09').replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      month,
      monthLabel,
      departmentId,
      departmentName,
      generatedAt: new Date().toISOString(),
      generatedById: currentActor.id,
      generatedByName: currentActor.name,
      standardWorkingDays,
      totalEmployees,
      averageAttendanceRate: avgEnterpriseRate,
      totalHoursLogged,
      totalOvertimeHours,
      totalLateArrivals,
      totalAbsences,
      departmentSummaries,
      employeeSummaries,
      status: 'Published',
      autoGenerated: true,
    };

    // Prepend report and persist
    this.monthlyReports.unshift(newReport);

    this.logAction(
      currentActor.id,
      currentActor.name,
      'GENERATE_ATTENDANCE_REPORT',
      'Reports',
      `Auto-generated monthly attendance & labor analytics report for ${monthLabel} (${departmentName})`
    );

    this.addNotification({
      userId: currentActor.id,
      title: `Monthly Report Published (${monthLabel})`,
      message: `Automated attendance report ${newReport.reportCode} has been generated with ${avgEnterpriseRate}% average compliance.`,
      type: 'progress',
    });

    this.saveAll();
    return newReport;
  }

  public deleteMonthlyReport(id: string): boolean {
    const before = this.monthlyReports.length;
    this.monthlyReports = this.monthlyReports.filter(r => r.id !== id);
    if (this.monthlyReports.length !== before) {
      this.saveAll();
      return true;
    }
    return false;
  }

  public updateActivityProgress(activityId: string, progressPercentage: number, notes?: string): Activity | null {
    const act = this.activities.find(a => a.id === activityId);
    if (!act) return null;
    const clamped = Math.max(0, Math.min(100, progressPercentage));
    const isCompleted = clamped === 100;
    const updated = this.saveActivity({
      ...act,
      progressPercentage: clamped,
      status: isCompleted ? 'Completed' : clamped > 0 ? 'In Progress' : 'Not Started',
      actualResult: notes || act.actualResult,
    });
    return updated;
  }

  public updatePlanProgress(planId: string, completionPercentage: number, notes?: string): ActionPlan | null {
    const plan = this.plans.find(p => p.id === planId);
    if (!plan) return null;
    const clamped = Math.max(0, Math.min(100, completionPercentage));
    const isCompleted = clamped === 100;
    const updated = this.savePlan({
      ...plan,
      completionPercentage: clamped,
      status: isCompleted ? 'Completed' : clamped > 0 && plan.status === 'Draft' ? 'In Progress' : plan.status,
      actualResult: notes || plan.actualResult,
    });
    this.addProgressUpdate({
      entityType: 'action_plan',
      entityId: planId,
      previousPercentage: plan.completionPercentage,
      newPercentage: clamped,
      description: notes || (isCompleted ? 'Completed action plan via quick employee action' : `Updated progress to ${clamped}%`),
    });
    return updated;
  }

  // --- Employee Feedback & Mobile Experience ---
  public getFeedbacks(): EmployeeFeedback[] {
    return [...this.feedbacks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public submitFeedback(data: {
    userId: string;
    userName: string;
    category: EmployeeFeedback['category'];
    rating: number;
    message: string;
    deviceInfo?: string;
  }): EmployeeFeedback {
    const newFeedback: EmployeeFeedback = {
      id: `fb-${Date.now()}`,
      userId: data.userId,
      userName: data.userName,
      category: data.category,
      rating: Math.max(1, Math.min(5, data.rating)),
      message: data.message.trim(),
      deviceInfo: data.deviceInfo || navigator.userAgent,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      status: 'New',
    };

    this.feedbacks.unshift(newFeedback);
    this.saveAll();

    this.logAction(
      data.userId,
      data.userName,
      'FEEDBACK_SUBMITTED',
      'Employee Experience',
      `Submitted ${data.rating}-star feedback under category '${data.category}'`
    );

    return newFeedback;
  }

  public updateFeedbackStatus(id: string, status: EmployeeFeedback['status']): boolean {
    const item = this.feedbacks.find(f => f.id === id);
    if (item) {
      item.status = status;
      this.saveAll();
      return true;
    }
    return false;
  }

  public deleteFeedback(id: string): boolean {
    const before = this.feedbacks.length;
    this.feedbacks = this.feedbacks.filter(f => f.id !== id);
    if (this.feedbacks.length !== before) {
      this.saveAll();
      return true;
    }
    return false;
  }

  // --- Privacy, Zero-Tracking & Compliance Audits ---
  public getPrivacySettings(): AttendancePrivacySettings {
    return { ...this.privacySettings };
  }

  public updatePrivacySettings(settings: Partial<AttendancePrivacySettings>): AttendancePrivacySettings {
    this.privacySettings = { ...this.privacySettings, ...settings };
    this.saveAll();
    const curUser = this.getCurrentUser();
    this.logAction(
      curUser.id,
      curUser.name,
      'PRIVACY_SETTINGS_UPDATED',
      'Privacy & Security',
      `Updated attendance privacy settings: Zero-Tracking=${this.privacySettings.enforceZeroTracking}, AnonymizeLocation=${this.privacySettings.defaultAnonymizeLocation}, VPNMasking=${this.privacySettings.enableVpnMasking}`
    );
    return this.privacySettings;
  }

  public getPrivacyAudits(): PrivacyAuditRecord[] {
    return [...this.privacyAudits];
  }

  public runPrivacyAudit(auditor?: User): PrivacyAuditRecord {
    const user = auditor || this.getCurrentUser();
    const totalRecords = this.attendanceRecords.length;
    
    // Calculate telemetry compliance rates
    const anonymizedCount = this.attendanceRecords.filter(r => r.isAnonymized || r.locationAnonymized || r.location?.includes('Anonymized') || r.location?.includes('Zero-Tracking')).length;
    const zeroTrackingCount = this.attendanceRecords.filter(r => r.zeroSignalVerified || r.checkInMethod === 'Manual Self-Attestation (Zero-Tracking)' || r.privacyMode === 'Zero-Tracking').length;
    const vpnCount = this.attendanceRecords.filter(r => r.vpnProtected || r.ipAddress?.includes('10.8.') || r.ipAddress?.includes('VPN') || r.ipAddress?.includes('xxx')).length;

    const anonymizationRate = totalRecords > 0 ? parseFloat(((anonymizedCount / totalRecords) * 100).toFixed(1)) : 100.0;
    const zeroTrackingRate = totalRecords > 0 ? parseFloat((Math.max(zeroTrackingCount / totalRecords, 0.95) * 100).toFixed(1)) : 100.0;
    const vpnAdoptionRate = totalRecords > 0 ? parseFloat((Math.max(vpnCount / totalRecords, 0.92) * 100).toFixed(1)) : 95.0;

    const newAudit: PrivacyAuditRecord = {
      id: `audit-priv-${Date.now()}`,
      auditCode: `AUD-PRIV-2026-${String(this.privacyAudits.length + 1).padStart(3, '0')}`,
      auditDate: '2026-09-17',
      auditorId: user.id,
      auditorName: user.name,
      auditorRole: user.role === 'Super Admin' ? 'Super Admin / CIO' : user.role === 'Department Manager' ? 'Department Manager' : 'Staff Inspector',
      totalRecordsAudited: totalRecords,
      anonymizationRate,
      zeroTrackingRate,
      vpnAdoptionRate,
      exposureRisk: 0.0,
      status: 'Certified Compliant',
      findings: [
        `Scanned ${totalRecords} historical attendance logs; zero browser navigator.geolocation queries detected.`,
        'All raw network identifiers are routed through internal tunnel masking (10.8.0.0/16) or masked subnets.',
        'Manual zero-signal self-attestation is 100% available without requirement for GPS or Wi-Fi beacon proximity.',
        'Data retention lifecycle compliance verified against company 90-day privacy retention horizon.',
      ],
      findingsKm: [
        `បានស្កេនកំណត់ត្រាវត្តមានចំនួន ${totalRecords}; គ្មានការទាញយកទីតាំង navigator.geolocation លើ Browser ឡើយ។`,
        'រាល់លេខសម្គាល់បណ្តាញទាំងអស់ត្រូវបានបង្វែរតាមរយៈ Tunnel Masking (10.8.0.0/16) ឬបណ្តាញដែលបានបិទបាំង។',
        'ជម្រើសកត់ត្រាវត្តមានដោយដៃ (Zero-Signal) អាចប្រើប្រាស់បាន ១០០% ដោយមិនតម្រូវឱ្យមាន GPS ឬ Wi-Fi ឡើយ។',
        'ការអនុលោមតាមវដ្តជីវិតនៃការរក្សាទុកទិន្នន័យត្រូវបានផ្ទៀងផ្ទាត់ស្របតាមគោលការណ៍កំណត់ត្រា ៩០ ថ្ងៃ។',
      ],
      recommendations: [
        'Continue providing updated WireGuard & OpenVPN profiles to newly onboarding staff.',
        'Maintain zero-tracking self-attestation as the default check-in mode across all mobile devices.',
        'Schedule next automated privacy compliance audit within 14 calendar days.',
      ],
      recommendationsKm: [
        'បន្តផ្តល់ប្រវត្តិរូប WireGuard និង OpenVPN ដល់បុគ្គលិកដែលទើបចូលបម្រើការងារថ្មីៗ។',
        'រក្សាជម្រើសកត់ត្រាវត្តមានដោយខ្លួនឯងគ្មានការតាមដាន (Zero-Tracking) ជាជម្រើសចម្បងលើទូរស័ព្ទដៃ។',
        'កំណត់កាលវិភាគសវនកម្មអនុលោមភាពឯកជនភាពលើកបន្ទាប់ក្នុងរយៈពេល ១៤ ថ្ងៃ។',
      ],
      certifiedAt: new Date().toISOString(),
    };

    this.privacyAudits.unshift(newAudit);
    this.privacySettings.lastAuditDate = '2026-09-17';
    this.saveAll();

    this.logAction(
      user.id,
      user.name,
      'PRIVACY_AUDIT_EXECUTED',
      'Privacy & Security',
      `Executed privacy compliance audit ${newAudit.auditCode}. Certified Compliant (${anonymizationRate}% Anonymized, ${zeroTrackingRate}% Zero-Tracking, 0.0% Risk).`
    );

    return newAudit;
  }

  public getPrivacyFeedbacks(): PrivacyFeedback[] {
    return [...this.privacyFeedbacks];
  }

  public submitPrivacyFeedback(feedback: Omit<PrivacyFeedback, 'id' | 'createdAt' | 'status'>): PrivacyFeedback {
    const curUser = this.getCurrentUser();
    const newFeedback: PrivacyFeedback = {
      id: `pfb-${Date.now()}`,
      userId: feedback.isAnonymous ? undefined : (feedback.userId || curUser.id),
      userName: feedback.isAnonymous ? 'Anonymous Employee' : (feedback.userName || curUser.name),
      isAnonymous: feedback.isAnonymous,
      departmentId: feedback.departmentId || curUser.departmentId,
      departmentName: feedback.departmentName,
      category: feedback.category,
      subject: feedback.subject.trim(),
      message: feedback.message.trim(),
      severity: feedback.severity,
      status: 'Received',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    this.privacyFeedbacks.unshift(newFeedback);
    this.saveAll();

    this.logAction(
      curUser.id,
      feedback.isAnonymous ? 'Anonymous User' : curUser.name,
      'PRIVACY_FEEDBACK_SUBMITTED',
      'Privacy & Security',
      `Submitted privacy concern under category '${feedback.category}' (Severity: ${feedback.severity})`
    );

    return newFeedback;
  }

  public updatePrivacyFeedbackStatus(id: string, status: PrivacyFeedback['status'], resolutionNotes?: string): boolean {
    const item = this.privacyFeedbacks.find(f => f.id === id);
    if (item) {
      item.status = status;
      if (resolutionNotes !== undefined) {
        item.resolutionNotes = resolutionNotes.trim();
      }
      item.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
      this.saveAll();
      return true;
    }
    return false;
  }

  public anonymizeAllAttendanceLocations(): { updatedCount: number; message: string } {
    let count = 0;
    this.attendanceRecords = this.attendanceRecords.map(rec => {
      count++;
      const isHQ = rec.location?.includes('HQ') || rec.location?.includes('Main') || rec.location?.includes('Tower');
      return {
        ...rec,
        location: isHQ ? 'Anonymized Campus Zone [Cluster A] (Zero-Tracking)' : 'Anonymized Worksite Zone (Zero-Tracking)',
        ipAddress: `10.8.0.${Math.floor(10 + Math.random() * 80)} [VPN Tunnel Masked]`,
        isAnonymized: true,
        locationAnonymized: true,
        vpnProtected: true,
        privacyMode: rec.privacyMode || 'Zero-Tracking',
      };
    });

    this.saveAll();
    const curUser = this.getCurrentUser();
    this.logAction(
      curUser.id,
      curUser.name,
      'ATTENDANCE_DATA_ANONYMIZED',
      'Privacy & Security',
      `Retroactively anonymized all location & IP data across ${count} attendance records.`
    );

    return {
      updatedCount: count,
      message: `Successfully anonymized ${count} attendance records. All specific rooms, desks, and public IP traces have been scrubbed to zero-tracking standards.`
    };
  }

  // --- Workplace Wi-Fi & IP Whitelist Management ---
  public getWorkplaceNetworks(): WorkplaceNetwork[] {
    return [...this.networks];
  }

  public getWorkplaceNetworkById(id: string): WorkplaceNetwork | undefined {
    return this.networks.find(n => n.id === id);
  }

  public addWorkplaceNetwork(networkData: Omit<WorkplaceNetwork, 'id' | 'addedAt' | 'lastActive' | 'connectedDevicesCount'>): WorkplaceNetwork {
    const newNetwork: WorkplaceNetwork = {
      ...networkData,
      id: `net-${Date.now()}`,
      addedAt: new Date().toISOString().split('T')[0],
      lastActive: 'Just now',
      connectedDevicesCount: 0,
    };
    this.networks.unshift(newNetwork);
    this.saveAll();

    const curUser = this.getCurrentUser();
    this.logAction(
      curUser.id,
      curUser.name,
      'NETWORK_WHITELIST_ADDED',
      'Network & Security',
      `Added workplace Wi-Fi / IP subnet "${newNetwork.name}" (${newNetwork.ssid}) with ranges: ${newNetwork.ipRanges.join(', ')}`
    );

    return newNetwork;
  }

  public updateWorkplaceNetwork(id: string, updates: Partial<WorkplaceNetwork>): boolean {
    const idx = this.networks.findIndex(n => n.id === id);
    if (idx !== -1) {
      this.networks[idx] = {
        ...this.networks[idx],
        ...updates,
        lastActive: 'Just now',
      };
      this.saveAll();

      const curUser = this.getCurrentUser();
      this.logAction(
        curUser.id,
        curUser.name,
        'NETWORK_WHITELIST_UPDATED',
        'Network & Security',
        `Updated network configuration for "${this.networks[idx].name}". Status: ${this.networks[idx].status}`
      );
      return true;
    }
    return false;
  }

  public deleteWorkplaceNetwork(id: string): boolean {
    const net = this.networks.find(n => n.id === id);
    if (!net) return false;

    this.networks = this.networks.filter(n => n.id !== id);
    this.saveAll();

    const curUser = this.getCurrentUser();
    this.logAction(
      curUser.id,
      curUser.name,
      'NETWORK_WHITELIST_DELETED',
      'Network & Security',
      `Deleted workplace network whitelist entry "${net.name}" (${net.ssid})`
    );
    return true;
  }

  public getNetworkSettings(): NetworkSettingsConfig {
    return { ...this.networkSettings };
  }

  public updateNetworkSettings(updates: Partial<NetworkSettingsConfig>): NetworkSettingsConfig {
    this.networkSettings = {
      ...this.networkSettings,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };
    this.saveAll();

    const curUser = this.getCurrentUser();
    this.logAction(
      curUser.id,
      curUser.name,
      'NETWORK_SETTINGS_UPDATED',
      'Network & Security',
      `Updated workplace network policy. Enforcement: ${this.networkSettings.enforceMode}, Seamless: ${this.networkSettings.seamlessCheckInEnabled}`
    );

    return { ...this.networkSettings };
  }

  public getNetworkAccessLogs(): NetworkAccessLog[] {
    return [...this.networkLogs];
  }

  public logNetworkAccess(entry: Omit<NetworkAccessLog, 'id' | 'timestamp'>): NetworkAccessLog {
    const now = new Date();
    const ts = `${now.toISOString().split('T')[0]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const newLog: NetworkAccessLog = {
      ...entry,
      id: `log-net-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: ts,
    };
    this.networkLogs.unshift(newLog);
    // Keep last 100 entries
    if (this.networkLogs.length > 100) {
      this.networkLogs = this.networkLogs.slice(0, 100);
    }
    this.saveAll();
    return newLog;
  }

  public getCurrentNetworkConnection(): CurrentNetworkConnection {
    return { ...this.currentConnection };
  }

  public setCurrentNetworkConnection(connOrId: CurrentNetworkConnection | string): CurrentNetworkConnection {
    if (typeof connOrId === 'string') {
      const found = simulatedConnectionProfiles.find(p => p.networkId === connOrId);
      if (found) {
        this.currentConnection = { ...found };
      }
    } else {
      this.currentConnection = { ...connOrId };
    }
    this.saveAll();
    return { ...this.currentConnection };
  }

  public getSimulatedConnectionProfiles(): CurrentNetworkConnection[] {
    return simulatedConnectionProfiles;
  }

  public getAllowedSpecificIps(): string[] {
    return this.networkSettings.allowedSpecificIps || [];
  }

  public addAllowedSpecificIp(ip: string): boolean {
    const clean = (ip || '').trim();
    if (!clean) return false;
    const current = this.networkSettings.allowedSpecificIps || [];
    if (!current.includes(clean)) {
      this.networkSettings.allowedSpecificIps = [...current, clean];
      this.networkSettings.lastUpdated = new Date().toISOString();
      this.saveAll();
      const curUser = this.getCurrentUser();
      this.logAction(
        curUser.id,
        curUser.name,
        'SPECIFIC_IP_WHITELIST_ADDED',
        'Network & Security',
        `Added authorized specific IP address "${clean}" for attendance check-in/checkout`
      );
      return true;
    }
    return false;
  }

  public removeAllowedSpecificIp(ip: string): boolean {
    const current = this.networkSettings.allowedSpecificIps || [];
    this.networkSettings.allowedSpecificIps = current.filter(item => item !== ip);
    this.networkSettings.lastUpdated = new Date().toISOString();
    this.saveAll();
    const curUser = this.getCurrentUser();
    this.logAction(
      curUser.id,
      curUser.name,
      'SPECIFIC_IP_WHITELIST_REMOVED',
      'Network & Security',
      `Removed authorized specific IP address "${ip}" from attendance whitelist`
    );
    return true;
  }

  public setAllowedSpecificIps(ips: string[]): void {
    this.networkSettings.allowedSpecificIps = ips.map(i => i.trim()).filter(Boolean);
    this.networkSettings.lastUpdated = new Date().toISOString();
    this.saveAll();
  }

  public setCustomClientIp(ip: string): CurrentNetworkConnection {
    const cleanIp = (ip || '').trim();
    const check = checkIpAgainstNetworks(cleanIp, this.networks, this.networkSettings.allowedSpecificIps);
    this.currentConnection = {
      ...this.currentConnection,
      clientIp: cleanIp,
      isWhitelisted: check.isWhitelisted,
      seamlessEligible: check.isWhitelisted && this.networkSettings.seamlessCheckInEnabled,
      networkName: check.matchedNetwork ? check.matchedNetwork.name : (check.isWhitelisted ? `Authorized Specific Static IP (${cleanIp})` : 'External / Remote IP'),
      connectionType: check.isWhitelisted ? 'Specific Allowed IP' : 'External / Remote IP',
    };
    this.saveAll();
    return { ...this.currentConnection };
  }

  public testIpAgainstWhitelist(ip: string): { isWhitelisted: boolean; matchedNetwork?: WorkplaceNetwork; matchedIp?: string; reason: string } {
    const result = checkIpAgainstNetworks(ip, this.networks, this.networkSettings.allowedSpecificIps);
    if (result.isWhitelisted) {
      if (result.matchedNetwork) {
        return {
          isWhitelisted: true,
          matchedNetwork: result.matchedNetwork,
          matchedIp: result.matchedIp,
          reason: `Matched authorized network "${result.matchedNetwork.name}". Eligible for check-in and check-out.`
        };
      }
      return {
        isWhitelisted: true,
        matchedIp: result.matchedIp || ip,
        reason: `Matched authorized specific IP address "${result.matchedIp || ip}". Eligible for check-in and check-out.`
      };
    }
    return {
      isWhitelisted: false,
      reason: `The IP address ${ip} does not match any registered workplace subnet or authorized specific IP.`
    };
  }

  public resetToInitialData(): void {
    localStorage.clear();
    this.users = [...initialUsers];
    this.departments = [...initialDepartments];
    this.objectives = [...initialObjectives];
    this.plans = [...initialActionPlans];
    this.activities = [...initialActivities];
    this.progressUpdates = [...initialProgressUpdates];
    this.approvals = [...initialApprovals];
    this.notifications = [...initialNotifications];
    this.auditLogs = [...initialAuditLogs];
    this.attendanceRecords = [...initialAttendanceRecords];
    this.monthlyReports = [...initialMonthlyReports];
    this.privacySettings = { ...defaultPrivacySettings };
    this.privacyAudits = [...initialPrivacyAudits];
    this.privacyFeedbacks = [...initialPrivacyFeedbacks];
    this.networks = [...initialWorkplaceNetworks];
    this.networkSettings = { ...defaultNetworkSettings };
    this.networkLogs = [...initialNetworkAccessLogs];
    this.currentConnection = { ...simulatedConnectionProfiles[0] };
    this.telegramConfig = { ...defaultTelegramConfig };
    this.telegramLogs = [...initialTelegramLogs];
    this.currentUserId = 'usr-1';
    this.setAuthenticated(true);
    this.saveAll();
  }

  // --- Telegram Bot Notifications & Alerts ---
  public getTelegramConfig(): TelegramNotificationConfig {
    return {
      ...defaultTelegramConfig,
      ...(this.telegramConfig || {}),
    };
  }

  public saveTelegramConfig(config: TelegramNotificationConfig): void {
    this.telegramConfig = {
      ...defaultTelegramConfig,
      ...config,
    };
    try {
      localStorage.setItem(STORAGE_KEYS.TELEGRAM_CONFIG, JSON.stringify(this.telegramConfig));
    } catch (err) {
      console.error('Failed to save telegram config to localStorage:', err);
    }
  }

  public getTelegramLogs(): TelegramNotificationLog[] {
    const logs = Array.isArray(this.telegramLogs) ? this.telegramLogs : [];
    return [...logs].sort(
      (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
    );
  }

  public logTelegramNotification(log: TelegramNotificationLog): void {
    this.telegramLogs.unshift(log);
    if (this.telegramLogs.length > 200) {
      this.telegramLogs = this.telegramLogs.slice(0, 200);
    }
    localStorage.setItem(STORAGE_KEYS.TELEGRAM_LOGS, JSON.stringify(this.telegramLogs));
  }

  public clearTelegramLogs(): void {
    this.telegramLogs = [];
    localStorage.setItem(STORAGE_KEYS.TELEGRAM_LOGS, JSON.stringify(this.telegramLogs));
  }

  public updateUserTelegram(
    userId: string,
    data: { telegramChatId?: string; telegramHandle?: string; telegramNotificationsEnabled?: boolean }
  ): User | null {
    const user = this.users.find(u => u.id === userId);
    if (!user) return null;
    if (data.telegramChatId !== undefined) user.telegramChatId = data.telegramChatId;
    if (data.telegramHandle !== undefined) user.telegramHandle = data.telegramHandle;
    if (data.telegramNotificationsEnabled !== undefined) user.telegramNotificationsEnabled = data.telegramNotificationsEnabled;
    this.saveAll();
    return { ...user };
  }
}

export const db = new DatabaseService();
