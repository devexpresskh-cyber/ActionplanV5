export type UserRole = 
  | 'Super Admin'
  | 'Administrator'
  | 'Department Manager'
  | 'Team Leader'
  | 'Employee'
  | 'Executive / Viewer';

export type PriorityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type PlanStatus = 
  | 'Draft'
  | 'Submitted'
  | 'In Review'
  | 'Approved'
  | 'In Progress'
  | 'Submitted for Completion'
  | 'Completed'
  | 'Rejected'
  | 'On Hold';

export type ActivityStatus = 
  | 'Not Started'
  | 'In Progress'
  | 'On Hold'
  | 'Completed'
  | 'Cancelled'
  | 'Under Review'
  | 'Delayed'
  | 'Blocked';

export type ApprovalActionType = 
  | 'Submit for Approval'
  | 'Approve'
  | 'Reject'
  | 'Request Revision'
  | 'Resubmit'
  | 'Submit for Completion'
  | 'Final Approve Completion';

export interface User {
  id: string;
  employeeId?: string;
  name: string;
  nameKhmer?: string;
  email: string;
  password?: string;
  phone?: string;
  departmentId?: string;
  position?: string;
  role: UserRole;
  status?: 'Active' | 'Inactive';
  isActive?: boolean;
  avatar?: string;
  createdAt: string;
  // Telegram Bot integration fields
  telegramChatId?: string;
  telegramHandle?: string;
  telegramNotificationsEnabled?: boolean;
}

export interface TelegramNotificationConfig {
  botToken: string;
  botUsername?: string;
  defaultChatId?: string;
  groupChannelChatId?: string; // Group / Channel Chat ID (e.g. -1001234567890 or @channel_name)
  isEnabled: boolean;
  gracePeriodMinutes: number; // e.g. 15 minutes after shift start
  reminderTiming: 'before_shift' | 'at_shift_start' | 'grace_period_expired' | 'both' | 'all';
  // Advance Pre-Shift Alert Settings
  beforeShiftAlertEnabled: boolean; // Auto alert to telegram before shift time
  beforeShiftMinutes: number; // e.g. 15, 30, 45, 60 minutes before shift time
  beforeShiftTarget: 'both' | 'group_channel' | 'direct_employee';
  autoSchedulerEnabled: boolean; // Auto-scans in background on interval
  lastPreShiftScanTime?: string;
  dispatchedShiftAlertKeys?: string[]; // Keys like "2026-09-23_Morning_preshift"
  // Policy & supervisor settings
  notifySupervisorOnAbsence: boolean;
  supervisorChatId?: string;
  includeDirectLink: boolean;
  customMessageTemplateEn?: string;
  customMessageTemplateKm?: string;
  lastScanTime?: string;
}

export interface TelegramNotificationLog {
  id: string;
  timestamp: string;
  recipientUserId: string;
  recipientName: string;
  recipientChatId: string;
  type: 'pre_shift_alert' | 'checkin_reminder' | 'overdue_checkin_alert' | 'checkout_reminder' | 'test_ping' | 'supervisor_digest';
  messageText: string;
  status: 'SENT' | 'SIMULATED' | 'FAILED';
  errorDetails?: string;
  deliveredAt?: string;
}

export interface TelegramScanResult {
  timestamp: string;
  scannedCount: number;
  clockedInCount: number;
  unclockedCount: number;
  notifiedCount: number;
  skippedCount: number;
  alertsDispatched: {
    userId: string;
    userName: string;
    chatId: string;
    shift: string;
    overdueMinutes: number;
    status: 'SENT' | 'SIMULATED' | 'FAILED';
    error?: string;
  }[];
}

export type Employee = User;

export interface Department {
  id: string;
  code: string;
  name: string;
  nameKhmer?: string;
  description: string;
  managerId?: string;
  headOfDepartmentId?: string;
  status?: 'Active' | 'Inactive';
  createdAt: string;
}

export interface Objective {
  id: string;
  code: string;
  title: string;
  description: string;
  strategicGoal?: string;
  departmentId?: string;
  ownerId: string;
  kpi?: string;
  targetValue: number;
  currentValue?: number;
  measurementUnit?: string;
  targetUnit?: string;
  period?: string;
  startDate?: string;
  endDate?: string;
  category?: 'Operational' | 'Financial' | 'Customer' | 'Growth' | 'Technology';
  status?: 'Not Started' | 'In Progress' | 'Achieved' | 'Behind' | 'Cancelled';
  isActive?: boolean;
  createdAt: string;
}

export interface ActionPlan {
  id: string;
  planNumber: string; // e.g. AP-2026-001
  title: string;
  description: string;
  objectiveId: string;
  departmentId: string;
  ownerId: string;
  supportingEmployeeIds: string[];
  startDate: string;
  dueDate: string;
  priority: PriorityLevel;
  status: PlanStatus;
  kpi: string;
  kpiTarget: number;
  kpiActual: number;
  kpiUnit: string;
  budget: number;
  expectedResult: string;
  actualResult: string;
  completionPercentage: number;
  approvalStatus: 'Draft' | 'Pending Review' | 'Approved' | 'Revision Requested' | 'Rejected' | 'Pending Completion' | 'Completed';
  attachments: Attachment[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
  isArchived?: boolean;
  lastReviewDate?: string;
  nextReviewDate?: string;
  reviewCycle?: 'Weekly' | 'Bi-Weekly' | 'Monthly' | 'Quarterly';
  alignmentStatus?: 'Fully Aligned' | 'Review Needed' | 'Shifted Priority';
  collaborationReviews?: PlanCollaborationReview[];
}

export interface PlanCollaborationReview {
  id: string;
  planId: string;
  requestedById: string;
  reviewerId: string;
  reviewType: 'Supervisor Feedback' | 'Team Support' | 'Regular Goal Alignment' | 'Deadline Adjustment';
  status: 'Pending' | 'Feedback Provided' | 'Acknowledged';
  notes: string;
  feedback?: string;
  adjustmentProposed?: {
    newDueDate?: string;
    newPriority?: PriorityLevel;
    reason?: string;
  };
  createdAt: string;
  respondedAt?: string;
}

export interface SubTask {
  id: string;
  code: string;
  title: string;
  status: 'To Do' | 'In Progress' | 'Done';
  assignedEmployeeId?: string;
  dueDate?: string;
  progressPercentage?: number;
}

export interface Activity {
  id: string;
  code: string; // e.g. ACT-001
  actionPlanId: string;
  parentActivityId?: string;
  subtasks?: SubTask[];
  title: string;
  description: string;
  assignedEmployeeId: string;
  teamLeaderId?: string;
  startDate: string;
  dueDate: string;
  priority: PriorityLevel;
  status: ActivityStatus;
  progressPercentage: number;
  weight: number; // For weighted progress calculation
  weightPercentage?: number;
  isMilestone?: boolean;
  deliverableOutput?: string;
  kpiTarget?: string;
  lastAdjustmentReason?: string;
  actualResult?: string;
  estimatedHours?: number;
  actualHours?: number;
  dependencies: string[]; // Activity IDs that must be completed first
  completionDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressUpdate {
  id: string;
  entityType: 'action_plan' | 'activity';
  entityId: string;
  previousPercentage: number;
  newPercentage: number;
  description: string;
  completedWork?: string;
  problemsObstacles?: string;
  nextActions?: string;
  actualKpiResult?: string;
  supportingEvidence?: string;
  updatedById: string;
  createdAt: string;
}

export interface PlanApproval {
  id: string;
  actionPlanId: string;
  stage: string;
  action: ApprovalActionType;
  reviewerId: string;
  reviewerRole: string;
  decision: 'Approved' | 'Rejected' | 'Revision Requested' | 'Submitted';
  comments: string;
  timestamp: string;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  uploadedById: string;
  uploadedAt: string;
  url?: string;
}

export interface Comment {
  id: string;
  entityType: 'action_plan' | 'activity';
  entityId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'assignment' | 'approval_request' | 'approved' | 'rejected' | 'progress' | 'deadline' | 'mention';
  entityType?: 'action_plan' | 'activity';
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details: string;
  entityType?: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress: string;
  userAgent?: string;
  createdAt: string;
}

export type AuditLog = ActivityLog;

export interface EmployeeFeedback {
  id: string;
  userId: string;
  userName: string;
  category: 'Navigation & Usability' | 'Mobile Experience' | 'Attendance & Shifts' | 'Performance & Speed' | 'Bug Report' | 'Feature Request';
  rating: number; // 1 to 5
  message: string;
  deviceInfo?: string;
  createdAt: string;
  status: 'New' | 'Reviewed' | 'Implemented';
}

export type Language = 'en' | 'km';

export type ShiftType = 'Morning' | 'Evening' | 'Night' | 'Custom';

export interface WorkShiftConfig {
  id: ShiftType;
  name: string;
  nameKm: string;
  hours: string;
  startTime: string; // '08:00:00'
  endTime: string; // '16:30:00'
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  lateGraceHour: number;
  lateGraceMinute: number;
  fullLabel: string;
  fullLabelKm: string;
  description: string;
  descriptionKm: string;
  icon?: string;
  theme?: string;
  isActive?: boolean;
}

export type AttendanceStatus = 'Present' | 'Late' | 'Half Day' | 'On Leave' | 'Absent' | 'Overtime';

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  employeeId?: string;
  departmentId: string;
  date: string; // YYYY-MM-DD
  checkInTime: string | null; // e.g., '08:05:00' or ISO
  checkOutTime: string | null; // e.g., '17:15:00' or ISO
  status: AttendanceStatus;
  shiftType?: ShiftType;
  workShift?: string;
  workingHours: number; // e.g. 8.2
  overtimeHours: number; // e.g. 1.0
  notes?: string;
  location?: string;
  ipAddress?: string;
  checkInMethod: 'Web Portal' | 'Biometric Sync' | 'QR Code' | 'Manual Adjustment' | 'Manual Self-Attestation (Zero-Tracking)';
  verifiedBy?: string;
  createdAt: string;
  // Privacy & Tracking Prevention Attributes
  isAnonymized?: boolean;
  privacyMode?: 'Zero-Tracking' | 'Standard' | 'VPN-Masked' | 'Manual-Protected';
  locationAnonymized?: boolean;
  vpnProtected?: boolean;
  zeroSignalVerified?: boolean;
  // Workplace Wi-Fi & IP Whitelist Verification
  networkWhitelisted?: boolean;
  networkId?: string;
  networkName?: string;
  ssid?: string;
  seamlessVerified?: boolean;
}

export interface WorkplaceNetwork {
  id: string;
  name: string; // e.g., 'Phnom Penh HQ - Main Office Network'
  nameKm?: string;
  ssid?: string; // Optional identifier
  bssidPrefix?: string; // Optional
  ipRanges: string[]; // e.g., ['192.168.1.0/24', '192.168.2.0/24']
  allowedSpecificIps?: string[]; // Multiple specific authorized IPs for check-in / check-out
  gatewayIp: string; // e.g., '192.168.1.1'
  dnsServers: string[]; // e.g., ['192.168.1.2', '1.1.1.1']
  locationName: string; // e.g., 'Phnom Penh HQ - Main Tower'
  departmentId?: string; // 'all' or specific department ID
  securityType: 'Enterprise Static IP' | 'Corporate VPN Tunnel' | 'Dedicated Lease Line' | 'Office Subnet' | 'Cloud Edge IP' | string;
  status: 'Active' | 'Under Maintenance' | 'Disabled';
  allowSeamlessCheckIn: boolean; // Enables 1-click frictionless clock in/out
  firewallConfigured: boolean; // True if port 443, captive portal bypass, etc. active
  connectedDevicesCount: number;
  description: string;
  descriptionKm?: string;
  addedAt: string;
  lastActive: string;
}

export interface NetworkSettingsConfig {
  enforceMode: 'Flexible' | 'Strict' | 'Advisory'; // Flexible: allow remote with badge; Strict: block non-whitelisted; Advisory: log only
  seamlessCheckInEnabled: boolean; // 1-click instant check-in when on whitelisted IP
  allowedSpecificIps?: string[]; // Global multiple specific allowed IPs for check-in / check-out
  allowVpnFallback: boolean; // Accept enterprise VPN subnet (10.8.0.0/16) as whitelisted
  allowedPorts: number[]; // [80, 443, 8443, 123]
  sslTlsInspectionBypass: boolean; // Bypass deep packet SSL inspection for biometric/auth endpoints
  captivePortalAutoBypass: boolean; // Whitelist attendance portal URL in captive portal walled garden
  rateLimitExemption: boolean; // Exempt workplace IP subnets from burst rate-limits at morning clock-in peak
  mDnsDiscovery: boolean; // Local subnet device discovery
  sessionTimeoutMinutes: number; // 480 (8 hours)
  lastUpdated?: string;
}

export interface NetworkAccessLog {
  id: string;
  timestamp: string;
  employeeId: string;
  employeeName: string;
  departmentName: string;
  clientIp: string;
  matchedNetworkId?: string;
  matchedNetworkName?: string;
  ssid?: string;
  whitelistStatus: 'Whitelisted (Seamless)' | 'External / Remote' | 'Blocked (Non-Whitelisted)' | 'VPN-Secured';
  action: 'Check-In' | 'Check-Out' | 'Heartbeat / Ping' | 'Portal Access';
  latencyMs: number;
  userAgent: string;
  flaggedReason?: string;
}

export interface CurrentNetworkConnection {
  networkId: string;
  networkName: string;
  ssid?: string;
  clientIp: string;
  gatewayIp: string;
  isWhitelisted: boolean;
  seamlessEligible: boolean;
  latencyMs: number;
  connectionType: 'Authorized Workplace IP' | 'Corporate VPN' | 'Specific Allowed IP' | 'External / Remote IP' | string;
}

export interface PrivacyAuditRecord {
  id: string;
  auditCode: string;
  auditDate: string; // YYYY-MM-DD
  auditorId: string;
  auditorName: string;
  auditorRole: string;
  totalRecordsAudited: number;
  anonymizationRate: number; // e.g. 98.5
  zeroTrackingRate: number; // e.g. 96.0
  vpnAdoptionRate: number; // e.g. 94.2
  exposureRisk: number; // 0.0%
  status: 'Certified Compliant' | 'Needs Review' | 'Action Required';
  findings: string[];
  findingsKm: string[];
  recommendations: string[];
  recommendationsKm: string[];
  certifiedAt: string;
}

export interface PrivacyFeedback {
  id: string;
  userId?: string;
  userName?: string;
  isAnonymous: boolean;
  departmentId?: string;
  departmentName?: string;
  category: 
    | 'GPS / Geolocation Concern' 
    | 'Wi-Fi Probing / Network Tracking' 
    | 'VPN Masking & Configuration' 
    | 'Data Anonymization Request' 
    | 'Policy Clarification' 
    | 'General Privacy Suggestion';
  subject: string;
  message: string;
  severity: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Received' | 'Under Review' | 'Addressed' | 'Resolved';
  resolutionNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AttendancePrivacySettings {
  enforceZeroTracking: boolean;
  defaultAnonymizeLocation: boolean;
  enableVpnMasking: boolean;
  allowManualCheckIn: boolean;
  dataRetentionDays: number;
  autoAuditFrequencyDays: number;
  lastAuditDate?: string;
}

export interface EmployeeAttendanceSummary {
  userId: string;
  employeeName: string;
  employeeId: string;
  departmentId: string;
  departmentName: string;
  position: string;
  totalWorkingDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  leaveDays: number;
  totalWorkingHours: number;
  totalOvertimeHours: number;
  attendanceRate: number; // percentage (e.g. 95.5)
  tasksCompletedThisMonth: number;
  performanceRemarks: string;
}

export interface DepartmentAttendanceSummary {
  departmentId: string;
  departmentName: string;
  employeeCount: number;
  averageAttendanceRate: number;
  totalHours: number;
  totalOvertimeHours: number;
  lateCount: number;
  absentCount: number;
}

export interface MonthlyAttendanceReport {
  id: string;
  reportCode: string;
  month: string; // YYYY-MM
  monthLabel: string; // e.g. September 2026
  departmentId: string; // 'all' or specific department
  departmentName: string;
  generatedAt: string;
  generatedById: string;
  generatedByName: string;
  standardWorkingDays: number;
  totalEmployees: number;
  averageAttendanceRate: number;
  totalHoursLogged: number;
  totalOvertimeHours: number;
  totalLateArrivals: number;
  totalAbsences: number;
  departmentSummaries: DepartmentAttendanceSummary[];
  employeeSummaries: EmployeeAttendanceSummary[];
  status: 'Published' | 'Draft';
  autoGenerated: boolean;
}

export type NavTab = 
  | 'employee-hub'
  | 'dashboard'
  | 'attendance'
  | 'action-plans'
  | 'activities'
  | 'progress'
  | 'approvals'
  | 'real-estate'
  | 'objectives'
  | 'departments'
  | 'employees'
  | 'calendar-gantt'
  | 'reports'
  | 'audit-logs';

// ==========================================
// REAL ESTATE SALES & COMMISSION MANAGEMENT
// ==========================================

export type RealEstatePropertyType = 
  | 'Luxury Villa'
  | 'Twin Villa'
  | 'Link Villa'
  | 'Condominium'
  | 'Shophouse'
  | 'Townhouse'
  | 'Land Plot'
  | 'Commercial Office';

export type RealEstatePropertyStatus = 
  | 'Available'
  | 'Reserved'
  | 'Under Contract'
  | 'Sold';

export type RealEstateDealStage = 
  | 'Inquiry'
  | 'Site Tour'
  | 'Booking Deposit'
  | 'Contract Signed'
  | 'Down Payment Cleared'
  | 'Handover / Closed';

export type CommissionPayoutStatus = 
  | 'Pending Contract'
  | 'Pending Approval'
  | 'Approved'
  | 'Paid Out'
  | 'Rejected';

export interface RealEstateProperty {
  id: string;
  propertyCode: string; // e.g. "VIL-PENG-042"
  projectName: string; // e.g. "Borey Peng Huoth Grand Star"
  developer: string; // e.g. "Peng Huoth Group"
  propertyType: RealEstatePropertyType;
  unitNumber: string; // e.g. "Villa Queen A-14"
  title: string;
  location: string;
  bedrooms: number;
  bathrooms: number;
  sizeSqM: number;
  landSizeSqM?: number;
  priceUSD: number;
  commissionRatePercent: number; // e.g. 3.0
  status: RealEstatePropertyStatus;
  imageUrl?: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  createdAt: string;
  description?: string;
}

export interface SalesTarget {
  id: string;
  employeeId: string;
  employeeName: string;
  employeePosition?: string;
  employeeAvatar?: string;
  period: string; // e.g. "Q4 2026", "October 2026"
  targetVolumeUSD: number; // e.g. 500000
  targetUnits: number; // e.g. 3
  achievedVolumeUSD: number;
  achievedUnits: number;
  baseCommissionRate: number; // e.g. 3.0%
  acceleratorBonusRate: number; // e.g. 1.0% when exceeding 100% quota
  status: 'Active' | 'Achieved' | 'Exceeded' | 'Behind' | 'Closed';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RealEstateDeal {
  id: string;
  dealCode: string; // e.g. "DEAL-2026-081"
  propertyId: string;
  propertyCode: string;
  propertyTitle: string;
  projectName: string;
  propertyType: RealEstatePropertyType;
  unitNumber: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  agentId: string;
  agentName: string;
  salePriceUSD: number;
  commissionPercentage: number;
  grossCommissionUSD: number;
  agentCommissionUSD: number; // Net share to agent
  agencyCutUSD: number; // Brokerage / Agency share
  dealDate: string; // YYYY-MM-DD
  stage: RealEstateDealStage;
  paymentMethod: 'Full Cash' | 'Bank Loan (70%)' | 'Developer Installment (24-Mo)' | 'Progressive Payment';
  commissionPayoutStatus: CommissionPayoutStatus;
  payoutApprovedById?: string;
  payoutApprovedByName?: string;
  payoutDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionTierConfig {
  id: string;
  tierName: string;
  minVolumeUSD: number;
  maxVolumeUSD: number;
  commissionRatePercent: number;
  bonusAmountUSD: number;
  badgeColor: string;
}

export interface RolePermissionRule {
  allowedRoles: UserRole[];
  description: string;
  category: 'Personal' | 'Operational' | 'Management' | 'Administration';
  minimumRoleLevel: number;
}

export type VoiceCommandIntent = 
  | 'CREATE_PLAN'
  | 'UPDATE_PLAN'
  | 'DELETE_PLAN'
  | 'SEARCH_PLAN'
  | 'QUERY_STATUS'
  | 'CREATE_ACTIVITY'
  | 'UPDATE_ACTIVITY'
  | 'DELETE_ACTIVITY'
  | 'SEARCH_ACTIVITY'
  | 'MY_TASKS'
  | 'MY_ATTENDANCE'
  | 'MY_PLANS'
  | 'MY_SALES_TARGET'
  | 'MY_COMMISSIONS'
  | 'CLOCK_IN'
  | 'CLOCK_OUT'
  | 'NAVIGATE'
  | 'HELP'
  | 'AUTHENTICATE'
  | 'UNKNOWN';

export interface ParsedVoiceCommand {
  intent: VoiceCommandIntent;
  planName?: string;
  planNumber?: string;
  activityTitle?: string;
  activityCode?: string;
  assignedTo?: string;
  details?: string;
  departmentName?: string;
  progressPercentage?: number;
  status?: PlanStatus | ActivityStatus;
  priority?: PriorityLevel;
  budget?: number;
  weight?: number;
  dueDate?: string;
  pinCode?: string;
  rawTranscript: string;
  confidence?: number;
}

export interface VoiceCommandExecutionResult {
  success: boolean;
  intent: VoiceCommandIntent;
  spokenFeedback: string;
  displayMessage: string;
  planId?: string;
  planTitle?: string;
  planNumber?: string;
  activityId?: string;
  activityCode?: string;
  activityTitle?: string;
  timestamp: string;
  requiresPin?: boolean;
  requiresConfirmation?: boolean;
  details?: Record<string, any>;
  error?: string;
}

export interface VoiceSessionHistoryItem {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  transcript: string;
  intent: VoiceCommandIntent;
  success: boolean;
  spokenFeedback: string;
  planId?: string;
  planTitle?: string;
  activityId?: string;
  activityCode?: string;
  activityTitle?: string;
}
