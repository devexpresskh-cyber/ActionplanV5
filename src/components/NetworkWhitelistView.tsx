import React, { useState } from 'react';
import {
  Globe,
  ShieldCheck,
  Sliders,
  Bell,
  Activity,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Lock,
  Search,
  ExternalLink,
  Laptop,
  Smartphone,
  Info,
  Layers,
  ChevronRight,
  RefreshCw,
  Clock,
  Send,
  Download,
  Filter,
  Trash2,
  Edit2,
  HelpCircle,
  Cpu,
  Server,
  Check,
  X
} from 'lucide-react';
import { db } from '../services/db';
import { translations } from '../services/i18n';
import { WorkplaceNetwork, NetworkSettingsConfig, NetworkAccessLog, CurrentNetworkConnection, UserRole, Language } from '../types';

interface NetworkWhitelistViewProps {
  currentUserRole: UserRole;
  lang?: Language;
  onRefresh?: () => void;
}

export const NetworkWhitelistView: React.FC<NetworkWhitelistViewProps> = ({
  currentUserRole,
  lang = 'en',
  onRefresh,
}) => {
  const language = lang || 'en';
  const t = translations[language];

  const [activeSubTab, setActiveSubTab] = useState<
    'whitelist' | 'network-settings' | 'communication' | 'monitor'
  >('whitelist');

  const [networks, setNetworks] = useState<WorkplaceNetwork[]>(() => db.getWorkplaceNetworks());
  const [networkSettings, setNetworkSettings] = useState<NetworkSettingsConfig>(() => db.getNetworkSettings());
  const [networkLogs, setNetworkLogs] = useState<NetworkAccessLog[]>(() => db.getNetworkAccessLogs());
  const [currentConnection, setCurrentConnection] = useState<CurrentNetworkConnection>(() =>
    db.getCurrentNetworkConnection()
  );

  // Multi Specific IP input states
  const [newSpecificIpInput, setNewSpecificIpInput] = useState('');
  const [specificIpFeedback, setSpecificIpFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Custom simulation IP state
  const [customSimIp, setCustomSimIp] = useState('');

  // Modal and Test States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState<WorkplaceNetwork | null>(null);
  const [testIpInput, setTestIpInput] = useState('192.168.1.45');
  const [testResult, setTestResult] = useState<{ isWhitelisted: boolean; matchedNetwork?: WorkplaceNetwork; matchedIp?: string; reason: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [logFilter, setLogFilter] = useState<string>('all');
  const [announcementStatus, setAnnouncementStatus] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Form State for Adding/Editing Subnet / Network Profile
  const [formData, setFormData] = useState({
    name: '',
    nameKm: '',
    allowedSpecificIps: '',
    ipRanges: '192.168.100.0/24',
    gatewayIp: '192.168.100.1',
    dnsServers: '1.1.1.1, 8.8.8.8',
    locationName: 'Phnom Penh HQ - Innovation Hub',
    securityType: 'Dedicated Static IP Pool' as WorkplaceNetwork['securityType'],
    status: 'Active' as WorkplaceNetwork['status'],
    allowSeamlessCheckIn: true,
    firewallConfigured: true,
    description: '',
  });

  const isSuperOrAdmin = currentUserRole === 'Super Admin' || currentUserRole === 'Administrator';

  const refreshState = () => {
    setNetworks(db.getWorkplaceNetworks());
    setNetworkSettings(db.getNetworkSettings());
    setNetworkLogs(db.getNetworkAccessLogs());
    setCurrentConnection(db.getCurrentNetworkConnection());
    if (onRefresh) onRefresh();
  };

  const handleAddSpecificIps = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isSuperOrAdmin) return;
    const raw = newSpecificIpInput.trim();
    if (!raw) return;

    // Support comma or space separated list of IPs
    const ips = raw.split(/[\s,]+/).map(ip => ip.trim()).filter(Boolean);
    let addedCount = 0;
    ips.forEach(ip => {
      const ok = db.addAllowedSpecificIp(ip);
      if (ok) addedCount++;
    });

    if (addedCount > 0) {
      setSpecificIpFeedback({
        type: 'success',
        message: `Successfully added ${addedCount} authorized IP address${addedCount > 1 ? 'es' : ''} for attendance check-in & checkout.`
      });
      setNewSpecificIpInput('');
      refreshState();
    } else {
      setSpecificIpFeedback({
        type: 'error',
        message: 'The specified IP address(es) are already whitelisted or invalid.'
      });
    }

    setTimeout(() => setSpecificIpFeedback(null), 4000);
  };

  const handleRemoveSpecificIp = (ip: string) => {
    if (!isSuperOrAdmin) return;
    db.removeAllowedSpecificIp(ip);
    setSpecificIpFeedback({
      type: 'success',
      message: `Removed ${ip} from authorized attendance whitelist.`
    });
    setTimeout(() => setSpecificIpFeedback(null), 3000);
    refreshState();
  };

  const handleWhitelistCurrentClientIp = () => {
    if (!isSuperOrAdmin) return;
    const curIp = currentConnection.clientIp;
    if (!curIp) return;
    const ok = db.addAllowedSpecificIp(curIp);
    if (ok) {
      setSpecificIpFeedback({
        type: 'success',
        message: `Your current client IP (${curIp}) has been authorized for check-in & checkout!`
      });
    } else {
      setSpecificIpFeedback({
        type: 'error',
        message: `Your current client IP (${curIp}) is already in the whitelist.`
      });
    }
    setTimeout(() => setSpecificIpFeedback(null), 4000);
    refreshState();
  };

  const handleApplyCustomSimulatedIp = () => {
    const ip = customSimIp.trim();
    if (!ip) return;
    const updated = db.setCustomClientIp(ip);
    setCurrentConnection(updated);
    refreshState();
  };

  const handleTestIp = (ipToTest?: string) => {
    const target = (ipToTest || testIpInput).trim();
    if (!target) return;
    const res = db.testIpAgainstWhitelist(target);
    setTestResult(res);
  };

  const handleSwitchSimulatedNetwork = (networkId: string) => {
    const updated = db.setCurrentNetworkConnection(networkId);
    setCurrentConnection(updated);
    refreshState();
  };

  const handleToggleNetworkStatus = (net: WorkplaceNetwork) => {
    if (!isSuperOrAdmin) return;
    const newStatus: WorkplaceNetwork['status'] = net.status === 'Active' ? 'Disabled' : 'Active';
    db.updateWorkplaceNetwork(net.id, { status: newStatus });
    refreshState();
  };

  const handleDeleteNetwork = (id: string, name: string) => {
    if (!isSuperOrAdmin) return;
    if (window.confirm(`Are you sure you want to remove "${name}" from the workplace whitelist?`)) {
      db.deleteWorkplaceNetwork(id);
      refreshState();
    }
  };

  const handleSaveNetwork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const ranges = formData.ipRanges
      .split(',')
      .map(r => r.trim())
      .filter(Boolean);
    const dns = formData.dnsServers
      .split(',')
      .map(d => d.trim())
      .filter(Boolean);
    const specificIps = formData.allowedSpecificIps
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (editingNetwork) {
      db.updateWorkplaceNetwork(editingNetwork.id, {
        name: formData.name,
        nameKm: formData.nameKm || undefined,
        allowedSpecificIps: specificIps,
        ipRanges: ranges,
        gatewayIp: formData.gatewayIp,
        dnsServers: dns,
        locationName: formData.locationName,
        securityType: formData.securityType,
        status: formData.status,
        allowSeamlessCheckIn: formData.allowSeamlessCheckIn,
        firewallConfigured: formData.firewallConfigured,
        description: formData.description,
      });
    } else {
      db.addWorkplaceNetwork({
        name: formData.name,
        nameKm: formData.nameKm || undefined,
        allowedSpecificIps: specificIps,
        ipRanges: ranges,
        gatewayIp: formData.gatewayIp,
        dnsServers: dns,
        locationName: formData.locationName,
        securityType: formData.securityType,
        status: formData.status,
        allowSeamlessCheckIn: formData.allowSeamlessCheckIn,
        firewallConfigured: formData.firewallConfigured,
        description: formData.description,
      });
    }

    setShowAddModal(false);
    setEditingNetwork(null);
    refreshState();
  };

  const handleOpenAddModal = (netToEdit?: WorkplaceNetwork) => {
    if (netToEdit) {
      setEditingNetwork(netToEdit);
      setFormData({
        name: netToEdit.name,
        nameKm: netToEdit.nameKm || '',
        allowedSpecificIps: (netToEdit.allowedSpecificIps || []).join(', '),
        ipRanges: netToEdit.ipRanges.join(', '),
        gatewayIp: netToEdit.gatewayIp,
        dnsServers: netToEdit.dnsServers.join(', '),
        locationName: netToEdit.locationName,
        securityType: netToEdit.securityType,
        status: netToEdit.status,
        allowSeamlessCheckIn: netToEdit.allowSeamlessCheckIn,
        firewallConfigured: netToEdit.firewallConfigured,
        description: netToEdit.description,
      });
    } else {
      setEditingNetwork(null);
      setFormData({
        name: '',
        nameKm: '',
        allowedSpecificIps: '',
        ipRanges: '192.168.100.0/24',
        gatewayIp: '192.168.100.1',
        dnsServers: '1.1.1.1, 8.8.8.8',
        locationName: 'Phnom Penh HQ - Main Tower',
        securityType: 'Dedicated Static IP Pool',
        status: 'Active',
        allowSeamlessCheckIn: true,
        firewallConfigured: true,
        description: '',
      });
    }
    setShowAddModal(true);
  };

  const handleSaveNetworkSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperOrAdmin) return;
    db.updateNetworkSettings(networkSettings);
    setSaveSuccessMsg('IP whitelist policy and access rules updated successfully.');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
    refreshState();
  };

  const handleBroadcastAnnouncement = () => {
    const curUser = db.getCurrentUser();
    db.logAction(
      curUser.id,
      curUser.name,
      'NETWORK_GUIDE_BROADCAST',
      'Employee Communications',
      'Broadcasted authorized workplace IP access policy to all staff.'
    );
    setAnnouncementStatus('Announcement broadcasted! All employee portals received the authorized IP access policy update.');
    setTimeout(() => setAnnouncementStatus(null), 5000);
  };

  const allowedSpecificIps = networkSettings.allowedSpecificIps || [];
  const activeNetworksCount = networks.filter(n => n.status === 'Active').length;
  const totalConnectedDevices = networks.reduce((acc, n) => acc + (n.connectedDevicesCount || 0), 0);
  const filteredLogs = networkLogs.filter(log => {
    if (logFilter !== 'all' && log.whitelistStatus !== logFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.employeeName.toLowerCase().includes(q) ||
        log.clientIp.includes(q) ||
        (log.matchedNetworkName && log.matchedNetworkName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div id="network-whitelist-manager" className="space-y-6">
      {/* Top Banner & Overview */}
      <div className="bg-gradient-to-r from-teal-900 via-cyan-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-teal-700/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Globe className="w-64 h-64 text-teal-300" />
        </div>

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-400/20 text-teal-200 border border-teal-400/30 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  {language === 'km' ? 'ប្រព័ន្ធគ្រប់គ្រង IP អនុញ្ញាត' : 'Authorized IP Whitelist Engine'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {networkSettings.enforceMode} Policy
                </span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                {language === 'km' ? 'ការគ្រប់គ្រង IP អនុញ្ញាតសម្រាប់កត់ត្រាវត្តមាន' : 'Attendance Specific IP Whitelist & Access Control'}
              </h2>
              <p className="text-teal-100/80 text-sm max-w-2xl leading-relaxed">
                {language === 'km'
                  ? 'អនុញ្ញាតឱ្យបុគ្គលិកកត់ត្រាវត្តមានចូល និងចេញ (Check In / Check Out) តាមរយៈអាសយដ្ឋាន IP ជាក់លាក់ជាច្រើន និងបណ្តាញរងការិយាល័យ ដោយគ្មានការតាមដាន GPS ឡើយ។'
                  : 'Allows employees to seamlessly check in and check out via multiple authorized specific IP addresses and office subnets with full data privacy.'}
              </p>
            </div>

            {/* Live Connection Pill & IP Tester Switcher */}
            <div className="bg-slate-800/90 backdrop-blur-md rounded-xl p-4 border border-teal-500/30 shadow-inner flex flex-col gap-2 min-w-[300px]">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  {language === 'km' ? 'IP ការតភ្ជាប់បច្ចុប្បន្ន' : 'Current Client IP'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    currentConnection.isWhitelisted
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-400/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                  }`}
                >
                  {currentConnection.isWhitelisted
                    ? language === 'km' ? 'IP អនុញ្ញាត' : 'Whitelisted IP'
                    : language === 'km' ? 'IP ក្រៅ' : 'External IP'}
                </span>
              </div>

              <div className="text-sm font-semibold text-white truncate flex items-center gap-2">
                <Globe className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="font-mono text-base font-bold text-teal-300">{currentConnection.clientIp}</span>
              </div>
              <div className="text-xs text-slate-300">
                <span>{currentConnection.networkName || 'Workplace Network'}</span>
              </div>

              {/* Simulation Selector */}
              <div className="pt-2 border-t border-slate-700/60 mt-1 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="test-network-simulator" className="text-[11px] text-slate-400 whitespace-nowrap">
                    {language === 'km' ? 'តេស្តប្តូរ IP:' : 'Simulate IP:'}
                  </label>
                  <select
                    id="test-network-simulator"
                    value={currentConnection.networkId}
                    onChange={e => handleSwitchSimulatedNetwork(e.target.value)}
                    className="text-xs bg-slate-900 text-teal-200 border border-teal-500/40 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-teal-400 cursor-pointer max-w-[200px] truncate"
                  >
                    {db.getSimulatedConnectionProfiles().map(prof => (
                      <option key={prof.networkId} value={prof.networkId}>
                        {prof.clientIp} ({prof.connectionType})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom IP switch */}
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    placeholder="Enter custom IP (e.g. 192.168.1.88)"
                    value={customSimIp}
                    onChange={e => setCustomSimIp(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleApplyCustomSimulatedIp()}
                    className="w-full text-xs font-mono bg-slate-900/90 text-white placeholder-slate-500 border border-slate-700 rounded px-2 py-1 outline-none focus:border-teal-400"
                  />
                  <button
                    onClick={handleApplyCustomSimulatedIp}
                    className="px-2 py-1 bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-semibold rounded whitespace-nowrap"
                  >
                    Set IP
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-teal-700/30">
            <div className="bg-slate-900/40 rounded-xl p-3 border border-teal-500/20">
              <div className="text-xs text-teal-300/80">{language === 'km' ? 'IP ជាក់លាក់អនុញ្ញាត' : 'Allowed Specific IPs'}</div>
              <div className="text-xl font-bold text-white mt-0.5">{allowedSpecificIps.length} Specific IPs</div>
            </div>
            <div className="bg-slate-900/40 rounded-xl p-3 border border-teal-500/20">
              <div className="text-xs text-teal-300/80">{language === 'km' ? 'បណ្តាញរង Subnet' : 'Authorized Subnets'}</div>
              <div className="text-xl font-bold text-white mt-0.5">{activeNetworksCount} Subnets</div>
            </div>
            <div className="bg-slate-900/40 rounded-xl p-3 border border-teal-500/20">
              <div className="text-xs text-teal-300/80">{language === 'km' ? 'ស្ថានភាព Firewall' : 'Firewall Status'}</div>
              <div className="text-xl font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
                <ShieldCheck className="w-5 h-5" /> Active
              </div>
            </div>
            <div className="bg-slate-900/40 rounded-xl p-3 border border-teal-500/20">
              <div className="text-xs text-teal-300/80">{language === 'km' ? 'ភាពរលូននៃការកត់ត្រា' : 'Seamless Check-In'}</div>
              <div className="text-xl font-bold text-cyan-300 mt-0.5">
                {networkSettings.seamlessCheckInEnabled ? 'Enabled (1-Tap)' : 'Disabled'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 sm:space-x-2 overflow-x-auto pb-0.5">
        <button
          id="tab-btn-whitelist"
          onClick={() => setActiveSubTab('whitelist')}
          className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeSubTab === 'whitelist'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>1. {language === 'km' ? 'បញ្ជី IP ជាក់លាក់ & បណ្តាញរង' : 'Allowed Specific IPs & Subnets'}</span>
          <span className="ml-1 px-1.5 py-0.2 text-[11px] font-bold rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300">
            {allowedSpecificIps.length + networks.length}
          </span>
        </button>

        <button
          id="tab-btn-network-settings"
          onClick={() => setActiveSubTab('network-settings')}
          className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeSubTab === 'network-settings'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>2. {language === 'km' ? 'កំណត់រចនាសម្ព័ន្ធគោលការណ៍ IP' : 'Configure IP Policies'}</span>
        </button>

        <button
          id="tab-btn-communication"
          onClick={() => setActiveSubTab('communication')}
          className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeSubTab === 'communication'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>3. {language === 'km' ? 'សេចក្តីជូនដំណឹង និងការណែនាំ' : 'Communicate with Employees'}</span>
        </button>

        <button
          id="tab-btn-monitor"
          onClick={() => setActiveSubTab('monitor')}
          className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeSubTab === 'monitor'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>4. {language === 'km' ? 'ការតាមដាន និងកែសម្រួល' : 'Monitor and Adjust'}</span>
          <span className="ml-1 px-1.5 py-0.2 text-[11px] font-bold rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {networkLogs.length}
          </span>
        </button>
      </div>

      {/* SUB-TAB 1: MULTI SPECIFIC IP WHITELIST & SUBNET PROFILES */}
      {activeSubTab === 'whitelist' && (
        <div className="space-y-6">
          {/* SECTION 1: DEDICATED MULTI-SPECIFIC IP WHITELIST FOR CHECK-IN / CHECKOUT */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-teal-200/80 dark:border-teal-900/60 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
                    <Globe className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {language === 'km'
                      ? 'អនុញ្ញាតអាសយដ្ឋាន IP ជាក់លាក់ជាច្រើនសម្រាប់កត់ត្រាវត្តមាន (Check In / Check Out)'
                      : 'Authorized Specific IP Addresses for Check-In & Check-Out'}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                  {language === 'km'
                    ? 'បញ្ចូលអាសយដ្ឋាន IP ជាក់លាក់មួយ ឬច្រើន (រាយនាមដោយសញ្ញាក្បៀស ,)។ ឧបករណ៍ដែលមាន IP ទាំងនេះអាចកត់ត្រាចូល និងចេញបានភ្លាមៗ។'
                    : 'Specify exact individual IP addresses allowed to check in and check out. Employees or kiosk devices on any of these IPs will be verified automatically.'}
                </p>
              </div>

              {isSuperOrAdmin && (
                <button
                  onClick={handleWhitelistCurrentClientIp}
                  className="px-3 py-2 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900 text-teal-800 dark:text-teal-200 border border-teal-300 dark:border-teal-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>{language === 'km' ? 'បន្ថែម IP បច្ចុប្បន្នរបស់ខ្ញុំ' : 'Whitelist My Current IP'} ({currentConnection.clientIp})</span>
                </button>
              )}
            </div>

            {/* Specific IP Feedback Notification */}
            {specificIpFeedback && (
              <div
                className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                  specificIpFeedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {specificIpFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{specificIpFeedback.message}</span>
              </div>
            )}

            {/* Input Form for adding multiple specific IPs */}
            {isSuperOrAdmin && (
              <form onSubmit={handleAddSpecificIps} className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="input-multi-specific-ips"
                    type="text"
                    placeholder="Enter one or multiple specific IPs (e.g. 192.168.1.45, 192.168.1.88, 203.0.113.10)..."
                    value={newSpecificIpInput}
                    onChange={e => setNewSpecificIpInput(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm font-mono bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-teal-500 text-slate-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition flex items-center justify-center gap-2 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>{language === 'km' ? 'បន្ថែម IP ជាក់លាក់' : 'Add Specific IP(s)'}</span>
                </button>
              </form>
            )}

            {/* List of Allowed Specific IPs */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold uppercase tracking-wider text-[11px]">
                  {language === 'km' ? 'បញ្ជី IP ជាក់លាក់ដែលបានអនុញ្ញាត:' : 'Currently Whitelisted Specific IPs:'}
                </span>
                <span>{allowedSpecificIps.length} active authorized IP address{allowedSpecificIps.length !== 1 ? 'es' : ''}</span>
              </div>

              {allowedSpecificIps.length === 0 ? (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center text-xs text-slate-500 dark:text-slate-400">
                  No specific IP addresses added yet. Enter IP addresses above or click "Whitelist My Current IP".
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {allowedSpecificIps.map(ip => {
                    const isCurrent = currentConnection.clientIp === ip;
                    return (
                      <div
                        key={ip}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition ${
                          isCurrent
                            ? 'bg-teal-50/80 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Globe className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
                          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{ip}</span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded bg-teal-200 dark:bg-teal-900 text-teal-900 dark:text-teal-200 text-[10px] font-bold">
                              Current
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            onClick={() => {
                              const updated = db.setCustomClientIp(ip);
                              setCurrentConnection(updated);
                              refreshState();
                            }}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 hover:bg-teal-600 hover:text-white text-slate-700 dark:text-slate-200 transition"
                            title="Test attendance check-in from this IP"
                          >
                            Simulate
                          </button>
                          {isSuperOrAdmin && (
                            <button
                              onClick={() => handleRemoveSpecificIp(ip)}
                              className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                              title="Remove specific IP from whitelist"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: IP WHITELIST LIVE TESTER & VALIDATOR */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-teal-600" />
                {language === 'km' ? 'ឧបករណ៍សាកល្បងអាសយដ្ឋាន IP សម្រាប់ Check-In' : 'Live IP Validator for Check-In & Check-Out'}
              </h4>
              <span className="text-xs text-slate-500">Supports Specific IPv4 & CIDR Subnets</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="input-test-ip-address"
                  type="text"
                  placeholder="Enter IP to test (e.g. 192.168.1.45, 10.8.0.22, 114.119.130.42)..."
                  value={testIpInput}
                  onChange={e => setTestIpInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleTestIp()}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-teal-500 font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-run-ip-test"
                  onClick={() => handleTestIp()}
                  className="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition flex items-center gap-2 whitespace-nowrap"
                >
                  <Search className="w-4 h-4" />
                  <span>{language === 'km' ? 'ត្រួតពិនិត្យ IP' : 'Validate IP'}</span>
                </button>

                <button
                  onClick={() => {
                    setTestIpInput('192.168.1.45');
                    handleTestIp('192.168.1.45');
                  }}
                  className="px-2.5 py-2 text-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition"
                  title="Test Specific IP"
                >
                  Specific IP
                </button>

                <button
                  onClick={() => {
                    setTestIpInput('10.8.0.34');
                    handleTestIp('10.8.0.34');
                  }}
                  className="px-2.5 py-2 text-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition"
                  title="Test VPN IP"
                >
                  VPN IP
                </button>

                <button
                  onClick={() => {
                    setTestIpInput('114.119.130.42');
                    handleTestIp('114.119.130.42');
                  }}
                  className="px-2.5 py-2 text-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition"
                  title="Test External IP"
                >
                  External IP
                </button>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3.5 rounded-lg text-sm border flex items-start gap-3 transition-all ${
                  testResult.isWhitelisted
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/50'
                    : 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800/50'
                }`}
              >
                {testResult.isWhitelisted ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                )}
                <div className="flex-1">
                  <div className="font-semibold">
                    {testResult.isWhitelisted
                      ? 'IP Whitelisted — Authorized for Check-In & Check-Out'
                      : 'IP Not Authorized — External / Remote IP'}
                  </div>
                  <div className="text-xs mt-0.5 opacity-90">{testResult.reason}</div>
                  {testResult.matchedIp && (
                    <div className="text-xs font-mono mt-1 text-teal-800 dark:text-teal-300">
                      Matched Specific Authorized IP: <strong>{testResult.matchedIp}</strong>
                    </div>
                  )}
                  {testResult.matchedNetwork && (
                    <div className="text-xs font-mono mt-1 text-teal-800 dark:text-teal-300">
                      Matched Network Subnet: {testResult.matchedNetwork.name} • Gateway: {testResult.matchedNetwork.gatewayIp}
                    </div>
                  )}

                  {!testResult.isWhitelisted && isSuperOrAdmin && (
                    <button
                      onClick={() => {
                        db.addAllowedSpecificIp(testIpInput.trim());
                        refreshState();
                        handleTestIp(testIpInput.trim());
                      }}
                      className="mt-2 text-xs font-semibold px-2.5 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 transition inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Whitelist This IP Address ({testIpInput})</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: WORKPLACE SUBNETS & NETWORK BLOCKS */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex-1">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-600" />
                  {language === 'km' ? 'បណ្តាញរង និងច្រកទ្វារ IP ការិយាល័យ' : 'Workplace Subnets & Regional Office Gateways'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {language === 'km'
                    ? 'កំណត់ត្រាបណ្តាញរង IP CIDR និង Gateway ដែលអនុញ្ញាតឱ្យបុគ្គលិកកត់ត្រាវត្តមាន'
                    : 'Registered CIDR IP blocks and branch gateways authorized for frictionless workplace attendance.'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {isSuperOrAdmin && (
                  <button
                    id="btn-add-workplace-network"
                    onClick={() => handleOpenAddModal()}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg shadow-sm hover:shadow transition flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{language === 'km' ? 'បន្ថែមបណ្តាញរង IP' : 'Add IP Subnet'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Subnet Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {networks.map(net => (
                <div
                  key={net.id}
                  id={`network-card-${net.id}`}
                  className={`rounded-xl border transition-all p-5 flex flex-col justify-between bg-white dark:bg-slate-900 ${
                    net.status === 'Active'
                      ? 'border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md'
                      : 'border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50 dark:bg-slate-950'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            net.securityType.includes('VPN')
                              ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400'
                              : 'bg-teal-100 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400'
                          }`}
                        >
                          {net.securityType.includes('VPN') ? (
                            <Lock className="w-5 h-5" />
                          ) : (
                            <Globe className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                            {language === 'km' && net.nameKm ? net.nameKm : net.name}
                          </h4>
                          <div className="text-xs font-mono text-teal-600 dark:text-teal-400 font-medium">
                            Gateway: {net.gatewayIp}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          net.status === 'Active'
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                            : net.status === 'Under Maintenance'
                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {net.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {language === 'km' && net.descriptionKm ? net.descriptionKm : net.description}
                    </p>

                    {/* Network Details */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Whitelisted CIDR Subnets:</span>
                        <span className="font-mono font-medium text-slate-800 dark:text-slate-200 text-right truncate max-w-[180px]">
                          {net.ipRanges.join(', ')}
                        </span>
                      </div>

                      {net.allowedSpecificIps && net.allowedSpecificIps.length > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Specific IPs:</span>
                          <span className="font-mono font-medium text-teal-700 dark:text-teal-300 text-right truncate max-w-[180px]">
                            {net.allowedSpecificIps.join(', ')}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Location / Campus:</span>
                        <span className="text-slate-700 dark:text-slate-300 truncate max-w-[170px]">{net.locationName}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Security Type:</span>
                        <span className="text-slate-700 dark:text-slate-300">{net.securityType}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700/60">
                        <span className="text-slate-500 dark:text-slate-400">Connected Devices:</span>
                        <span className="font-semibold text-teal-600 dark:text-teal-400">
                          {net.connectedDevicesCount} devices active
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Controls */}
                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Seamless 1-Tap</span>
                    </div>

                    {isSuperOrAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleNetworkStatus(net)}
                          className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                        >
                          {net.status === 'Active' ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleOpenAddModal(net)}
                          className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Edit configuration"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteNetwork(net.id, net.name)}
                          className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                          title="Delete from whitelist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: CONFIGURE NETWORK SETTINGS & FIREWALL */}
      {activeSubTab === 'network-settings' && (
        <form onSubmit={handleSaveNetworkSettings} className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-teal-600" />
                {language === 'km' ? 'ការកំណត់រចនាសម្ព័ន្ធគោលការណ៍ IP និង Firewall' : 'Firewall & IP Access Policies'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {language === 'km'
                  ? 'កំណត់ការអនុវត្តគោលការណ៍កត់ត្រាវត្តមាន ច្រកទ្វារ Ports និងការឆ្លងកាត់ការផ្ទៀងផ្ទាត់ IP'
                  : 'Configure IP enforcement rules, authorized ports, captive portal bypass, and attendance security policies.'}
              </p>
            </div>

            {saveSuccessMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 rounded-lg text-sm border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {/* Policy Enforcement Mode */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-900 dark:text-white block">
                {language === 'km' ? 'កម្រិតតឹងរ៉ឹងនៃការអនុវត្តបញ្ជី IP' : 'IP Whitelist Enforcement Policy'}
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  onClick={() => setNetworkSettings(prev => ({ ...prev, enforceMode: 'Flexible' }))}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                    networkSettings.enforceMode === 'Flexible'
                      ? 'border-teal-600 bg-teal-50/50 dark:bg-teal-950/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">Flexible (Recommended)</span>
                    <input
                      type="radio"
                      name="enforceMode"
                      checked={networkSettings.enforceMode === 'Flexible'}
                      onChange={() => {}}
                      className="text-teal-600"
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Authorized specific IPs and subnets enable 1-tap seamless check-in. Remote staff can still self-attest or use Zero-Tracking mode.
                  </p>
                </div>

                <div
                  onClick={() => setNetworkSettings(prev => ({ ...prev, enforceMode: 'Strict' }))}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                    networkSettings.enforceMode === 'Strict'
                      ? 'border-teal-600 bg-teal-50/50 dark:bg-teal-950/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">Strict (Authorized IPs Only)</span>
                    <input
                      type="radio"
                      name="enforceMode"
                      checked={networkSettings.enforceMode === 'Strict'}
                      onChange={() => {}}
                      className="text-teal-600"
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Enforces attendance ONLY from whitelisted specific IP addresses or authorized office subnets. Blocks unrecognized external IPs.
                  </p>
                </div>

                <div
                  onClick={() => setNetworkSettings(prev => ({ ...prev, enforceMode: 'Advisory' }))}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                    networkSettings.enforceMode === 'Advisory'
                      ? 'border-teal-600 bg-teal-50/50 dark:bg-teal-950/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">Advisory / Audit Only</span>
                    <input
                      type="radio"
                      name="enforceMode"
                      checked={networkSettings.enforceMode === 'Advisory'}
                      onChange={() => {}}
                      className="text-teal-600"
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Allows check-ins from any connection, but flags non-whitelisted IPs in access telemetry logs for administrator review.
                  </p>
                </div>
              </div>
            </div>

            {/* Network & Firewall Toggles */}
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                {language === 'km' ? 'ក្បួន Firewall និងច្រកទ្វារសុវត្ថិភាព' : 'Firewall & Network Permission Rules'}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={networkSettings.seamlessCheckInEnabled}
                    onChange={e =>
                      setNetworkSettings(prev => ({ ...prev, seamlessCheckInEnabled: e.target.checked }))
                    }
                    className="mt-1 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-900 dark:text-white block">
                      Enable 1-Tap Seamless Check-In on Whitelisted IPs
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed block mt-0.5">
                      Automatically recognizes employees on authorized specific IPs or subnets and streamlines verification.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={networkSettings.allowVpnFallback}
                    onChange={e =>
                      setNetworkSettings(prev => ({ ...prev, allowVpnFallback: e.target.checked }))
                    }
                    className="mt-1 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-900 dark:text-white block">
                      Corporate VPN Subnet Fallback (10.8.0.0/16)
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed block mt-0.5">
                      Accepts encrypted IPsec and WireGuard tunnels as authorized workplace network endpoints.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={networkSettings.rateLimitExemption}
                    onChange={e =>
                      setNetworkSettings(prev => ({ ...prev, rateLimitExemption: e.target.checked }))
                    }
                    className="mt-1 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-900 dark:text-white block">
                      Morning Clock-In Rate-Limit Exemption
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed block mt-0.5">
                      Exempts authorized workplace IP addresses from burst API throttles during 07:45 - 08:30 peak arrivals.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={networkSettings.sslTlsInspectionBypass}
                    onChange={e =>
                      setNetworkSettings(prev => ({ ...prev, sslTlsInspectionBypass: e.target.checked }))
                    }
                    className="mt-1 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-900 dark:text-white block">
                      SSL/TLS Deep Packet Inspection Bypass
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed block mt-0.5">
                      Prevents certificate pinning conflicts on devices checking in from authorized networks.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Allowed Ports Configuration */}
            <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-800">
              <label className="text-sm font-semibold text-slate-900 dark:text-white block">
                {language === 'km' ? 'ច្រក Port អនុញ្ញាតតាម Firewall' : 'Firewall Authorized Port Numbers'}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {networkSettings.allowedPorts.map(port => (
                  <span
                    key={port}
                    className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-xs rounded-lg border border-slate-300 dark:border-slate-700 flex items-center gap-1.5"
                  >
                    <Server className="w-3.5 h-3.5 text-teal-600" />
                    Port {port} {port === 443 ? '(HTTPS)' : port === 80 ? '(HTTP)' : port === 8443 ? '(App API)' : '(NTP Time)'}
                  </span>
                ))}
              </div>
            </div>

            {/* Save Button */}
            {isSuperOrAdmin && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  id="btn-save-network-settings"
                  type="submit"
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{language === 'km' ? 'រក្សាទុកការកំណត់គោលការណ៍ IP' : 'Save & Apply IP Policies'}</span>
                </button>
              </div>
            )}
          </div>
        </form>
      )}

      {/* SUB-TAB 3: COMMUNICATE WITH EMPLOYEES */}
      {activeSubTab === 'communication' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-teal-600" />
                  {language === 'km' ? 'សេចក្តីណែនាំ និងការជូនដំណឹងដល់បុគ្គលិក' : 'Employee IP Access Guide & Attendance Policy'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {language === 'km'
                    ? 'ផ្តល់ការណែនាំដល់បុគ្គលិកអំពីរបៀបកត់ត្រាវត្តមានតាមរយៈ IP អនុញ្ញាត ដោយគ្មានការតាមដានទីតាំង GPS ឡើយ'
                    : 'Clear guidance and setup details explaining how attendance is verified via authorized workplace IPs without invasive GPS tracking.'}
                </p>
              </div>

              {isSuperOrAdmin && (
                <button
                  id="btn-broadcast-announcement"
                  onClick={handleBroadcastAnnouncement}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  <span>{language === 'km' ? 'ផ្ញើសេចក្តីជូនដំណឹងដល់បុគ្គលិកទាំងអស់' : 'Broadcast Update to Staff'}</span>
                </button>
              )}
            </div>

            {announcementStatus && (
              <div className="p-3 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 rounded-lg text-sm border border-teal-200 dark:border-teal-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>{announcementStatus}</span>
              </div>
            )}
          </div>

          {/* Guide Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step-by-Step Connection Instructions */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Laptop className="w-4 h-4 text-teal-600" />
                <span>How IP Whitelisting Works for Check-In & Check-Out</span>
              </h4>

              <ol className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div>
                    <strong className="text-slate-900 dark:text-white block">Connect from Workplace Static IP or Network</strong>
                    When you are at an authorized company location or using an approved static IP, your device IP is recognized by the portal.
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div>
                    <strong className="text-slate-900 dark:text-white block">Instant Whitelist Verification</strong>
                    The system matches your current connection IP against the administrator-configured list of allowed specific IPs and subnets.
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div>
                    <strong className="text-slate-900 dark:text-white block">1-Tap Seamless Clock-In & Clock-Out</strong>
                    Once recognized as an authorized IP, you can clock in and out with 1 tap, without filling manual exception forms.
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center shrink-0">
                    4
                  </span>
                  <div>
                    <strong className="text-slate-900 dark:text-white block">Remote Work & Dedicated IP Requests</strong>
                    If working from a remote office or dedicated branch line, contact your administrator to whitelist your static public IP address.
                  </div>
                </li>
              </ol>
            </div>

            {/* Privacy Guarantee & Reassurance */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Privacy Reassurance: IP Whitelist vs Location Tracking</span>
              </h4>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="font-semibold text-slate-900 dark:text-white">What IP Whitelisting Does:</div>
                  <p>
                    It only checks the incoming network client IP to confirm presence at an authorized work location. It replaces invasive location tracking completely.
                  </p>
                </div>

                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800/40 space-y-1">
                  <div className="font-semibold text-emerald-900 dark:text-emerald-200">What It NEVER Does:</div>
                  <ul className="list-disc list-inside space-y-1 text-emerald-800 dark:text-emerald-300">
                    <li>Never accesses your device GPS coordinates or precise lat/long.</li>
                    <li>Never scans for neighboring networks or Bluetooth beacons.</li>
                    <li>Never inspects personal browsing traffic, messages, or apps on your device.</li>
                  </ul>
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Audited under Institutional Privacy & Governance Standards</span>
                  <span className="text-teal-600 font-semibold">100% Zero-Tracking Compliant</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: MONITOR AND ADJUST */}
      {activeSubTab === 'monitor' && (
        <div className="space-y-6">
          {/* Real-time Monitoring Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-600" />
                {language === 'km' ? 'កំណត់ត្រាតាមដានការតភ្ជាប់ IP ផ្ទាល់' : 'Real-Time IP Access Telemetry & Attendance Log'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Monitor live clock-in events, IP resolutions, and whitelist compliance. Whitelist specific IPs directly from logs with 1 click.
              </p>
            </div>

            {/* Filter and Search */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search staff, IP..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-teal-500 w-44"
                />
              </div>

              <select
                value={logFilter}
                onChange={e => setLogFilter(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 outline-none text-slate-700 dark:text-slate-300"
              >
                <option value="all">All Statuses</option>
                <option value="Whitelisted (Seamless)">Whitelisted (Seamless)</option>
                <option value="VPN-Secured">VPN-Secured</option>
                <option value="External / Remote">External / Remote</option>
                <option value="Blocked (Non-Whitelisted)">Blocked</option>
              </select>

              <button
                onClick={refreshState}
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Refresh logs"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Timestamp</th>
                    <th className="px-4 py-3 font-semibold">Employee</th>
                    <th className="px-4 py-3 font-semibold">Client IP</th>
                    <th className="px-4 py-3 font-semibold">Matched Network / IP</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                    <th className="px-4 py-3 font-semibold">Latency</th>
                    <th className="px-4 py-3 font-semibold text-right">Adjustment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredLogs.map(log => {
                    const isWhitelisted = log.whitelistStatus.includes('Whitelisted') || log.whitelistStatus.includes('VPN');
                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="px-4 py-3 font-mono text-[11px] whitespace-nowrap text-slate-500">
                          {log.timestamp}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900 dark:text-white">{log.employeeName}</div>
                          <div className="text-[10px] text-slate-400">{log.departmentName}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-800 dark:text-slate-200 font-semibold">
                          {log.clientIp}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {log.matchedNetworkName || 'External IP'}
                          </div>
                          {log.flaggedReason && (
                            <div className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                              {log.flaggedReason}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.whitelistStatus === 'Whitelisted (Seamless)'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                : log.whitelistStatus === 'VPN-Secured'
                                ? 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300'
                                : log.whitelistStatus === 'Blocked (Non-Whitelisted)'
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            }`}
                          >
                            {log.whitelistStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                          {log.action}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500">
                          {log.latencyMs}ms
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!isWhitelisted && isSuperOrAdmin && (
                            <button
                              onClick={() => {
                                db.addAllowedSpecificIp(log.clientIp);
                                refreshState();
                                setSaveSuccessMsg(`Added ${log.clientIp} to authorized specific IPs list!`);
                                setTimeout(() => setSaveSuccessMsg(null), 3500);
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-teal-50 dark:bg-teal-950 hover:bg-teal-100 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 rounded border border-teal-300 dark:border-teal-800 transition whitespace-nowrap inline-flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Whitelist IP</span>
                            </button>
                          )}
                          {isWhitelisted && (
                            <span className="text-[11px] text-emerald-600 font-medium inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Authorized</span>
                            </span>
                          )}
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

      {/* Add / Edit Subnet Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-teal-600" />
                {editingNetwork
                  ? language === 'km'
                    ? 'កែសម្រួលបណ្តាញរង IP'
                    : 'Edit Workplace IP Subnet'
                  : language === 'km'
                  ? 'បន្ថែមបណ្តាញរង IP អនុញ្ញាត'
                  : 'Add Workplace IP Subnet'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNetwork} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Location / Subnet Name (EN) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Phnom Penh HQ - Innovation Hub"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Location Name (Khmer)
                  </label>
                  <input
                    type="text"
                    placeholder="ឈ្មោះទីតាំងជាភាសាខ្មែរ..."
                    value={formData.nameKm}
                    onChange={e => setFormData({ ...formData, nameKm: e.target.value })}
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Gateway IP
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 192.168.1.1"
                    value={formData.gatewayIp}
                    onChange={e => setFormData({ ...formData, gatewayIp: e.target.value })}
                    className="w-full p-2 font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Security / Connection Type
                  </label>
                  <select
                    value={formData.securityType}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        securityType: e.target.value as WorkplaceNetwork['securityType'],
                      })
                    }
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="Dedicated Static IP Pool">Dedicated Static IP Pool</option>
                    <option value="Corporate VPN Tunnel">Corporate VPN Tunnel</option>
                    <option value="Dedicated Lease Line">Dedicated Lease Line</option>
                    <option value="WPA3 Enterprise (802.1X)">Enterprise Subnet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Whitelisted IP Ranges / CIDR (Comma separated) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 192.168.1.0/24, 192.168.2.0/24"
                  value={formData.ipRanges}
                  onChange={e => setFormData({ ...formData, ipRanges: e.target.value })}
                  className="w-full p-2 font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-teal-500"
                />
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Devices with an IP inside these CIDR blocks will be recognized as authorized.
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Specific Static IPs for this Location (Optional, Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 192.168.1.45, 192.168.1.88, 203.0.113.50"
                  value={formData.allowedSpecificIps}
                  onChange={e => setFormData({ ...formData, allowedSpecificIps: e.target.value })}
                  className="w-full p-2 font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Location Name / Campus
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Phnom Penh HQ - Main Tower"
                    value={formData.locationName}
                    onChange={e => setFormData({ ...formData, locationName: e.target.value })}
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    DNS Servers (Comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1.1.1.1, 8.8.8.8"
                    value={formData.dnsServers}
                    onChange={e => setFormData({ ...formData, dnsServers: e.target.value })}
                    className="w-full p-2 font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Description / Subnet Purpose
                </label>
                <textarea
                  rows={2}
                  placeholder="Subnet coverage details, floor information, or department..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allowSeamlessCheckIn}
                    onChange={e => setFormData({ ...formData, allowSeamlessCheckIn: e.target.checked })}
                    className="rounded text-teal-600"
                  />
                  <span className="text-slate-800 dark:text-slate-200">Allow 1-Tap Seamless Check-In</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.status === 'Active'}
                    onChange={e =>
                      setFormData({ ...formData, status: e.target.checked ? 'Active' : 'Disabled' })
                    }
                    className="rounded text-teal-600"
                  />
                  <span className="text-slate-800 dark:text-slate-200">Subnet Active</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg shadow-sm transition"
                >
                  {editingNetwork ? 'Update Subnet' : 'Add to Whitelist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
