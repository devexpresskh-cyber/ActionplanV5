import React, { useState, useMemo } from 'react';
import { 
  BadgeDollarSign, 
  Target, 
  Building2, 
  Layers, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  Award, 
  DollarSign, 
  UserCheck, 
  ChevronRight, 
  FileText, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  Sparkles, 
  ShieldCheck, 
  RefreshCw,
  Home,
  Check,
  X,
  Phone,
  User as UserIcon,
  Percent,
  Calendar,
  Eye,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { 
  User, 
  Language, 
  RealEstateProperty, 
  SalesTarget, 
  RealEstateDeal, 
  CommissionTierConfig, 
  RealEstatePropertyType, 
  RealEstatePropertyStatus, 
  RealEstateDealStage, 
  CommissionPayoutStatus 
} from '../types';
import { db } from '../services/db';

interface RealEstateSalesViewProps {
  currentUser: User;
  lang: Language;
  onNavigateTab?: (tab: any) => void;
}

const PROPERTY_TYPES: RealEstatePropertyType[] = [
  'Luxury Villa',
  'Twin Villa',
  'Link Villa',
  'Condominium',
  'Shophouse',
  'Townhouse',
  'Land Plot',
  'Commercial Office'
];

const DEAL_STAGES: RealEstateDealStage[] = [
  'Inquiry',
  'Site Tour',
  'Booking Deposit',
  'Contract Signed',
  'Down Payment Cleared',
  'Handover / Closed'
];

export const RealEstateSalesView: React.FC<RealEstateSalesViewProps> = ({
  currentUser,
  lang,
  onNavigateTab
}) => {
  const isKhmer = lang === 'km';
  const isManagerOrAdmin = currentUser.role === 'Super Admin' || currentUser.role === 'Administrator' || currentUser.role === 'Department Manager';

  // Sub-tabs: 'targets' | 'deals' | 'commissions' | 'properties'
  const [activeTab, setActiveTab] = useState<'targets' | 'deals' | 'commissions' | 'properties'>('targets');
  const [refreshKey, setRefreshKey] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Data fetching
  const properties = useMemo(() => db.getProperties(), [refreshKey]);
  const salesTargets = useMemo(() => db.getSalesTargets(), [refreshKey]);
  const deals = useMemo(() => db.getRealEstateDeals(), [refreshKey]);
  const commissionTiers = useMemo(() => db.getCommissionTiers(), [refreshKey]);
  const allUsers = useMemo(() => db.getUsers(), [refreshKey]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('All');
  const [selectedPropertyStatus, setSelectedPropertyStatus] = useState<string>('All');
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>('All');
  const [selectedDealStage, setSelectedDealStage] = useState<string>('All');
  const [selectedCommissionStatus, setSelectedCommissionStatus] = useState<string>('All');

  // Modals state
  const [isAddTargetModalOpen, setIsAddTargetModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<SalesTarget | null>(null);
  const [isAddPropertyModalOpen, setIsAddPropertyModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<RealEstateProperty | null>(null);
  const [isAddDealModalOpen, setIsAddDealModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<RealEstateDeal | null>(null);
  const [selectedDealForVoucher, setSelectedDealForVoucher] = useState<RealEstateDeal | null>(null);

  // Overall Statistics
  const totalClosedSalesUSD = useMemo(() => {
    return deals
      .filter(d => d.stage === 'Contract Signed' || d.stage === 'Down Payment Cleared' || d.stage === 'Handover / Closed')
      .reduce((sum, d) => sum + d.salePriceUSD, 0);
  }, [deals]);

  const totalPipelineUSD = useMemo(() => {
    return deals.reduce((sum, d) => sum + d.salePriceUSD, 0);
  }, [deals]);

  const totalCommissionsPaidUSD = useMemo(() => {
    return deals
      .filter(d => d.commissionPayoutStatus === 'Paid Out')
      .reduce((sum, d) => sum + d.agentCommissionUSD, 0);
  }, [deals]);

  const totalCommissionsPendingUSD = useMemo(() => {
    return deals
      .filter(d => d.commissionPayoutStatus === 'Pending Approval' || d.commissionPayoutStatus === 'Approved')
      .reduce((sum, d) => sum + d.agentCommissionUSD, 0);
  }, [deals]);

  // User's own target if agent/employee
  const myTarget = useMemo(() => {
    return salesTargets.find(t => t.employeeId === currentUser.id);
  }, [salesTargets, currentUser.id]);

  const myDeals = useMemo(() => {
    return deals.filter(d => d.agentId === currentUser.id);
  }, [deals, currentUser.id]);

  // Stage advancement helper
  const handleAdvanceDealStage = (deal: RealEstateDeal) => {
    const currentIdx = DEAL_STAGES.indexOf(deal.stage);
    if (currentIdx < DEAL_STAGES.length - 1) {
      const nextStage = DEAL_STAGES[currentIdx + 1];
      let commissionStatus = deal.commissionPayoutStatus;
      if (nextStage === 'Contract Signed' && deal.commissionPayoutStatus === 'Pending Contract') {
        commissionStatus = 'Pending Approval';
      }
      db.updateRealEstateDeal(deal.id, {
        stage: nextStage,
        commissionPayoutStatus: commissionStatus
      });
      setRefreshKey(k => k + 1);
      showToast(isKhmer ? `បានដំឡើងដំណាក់កាលកិច្ចព្រមព្រៀងទៅជា "${nextStage}"` : `Advanced deal ${deal.dealCode} to "${nextStage}"`);
    }
  };

  // Commission status updater
  const handleUpdateCommissionStatus = (dealId: string, status: CommissionPayoutStatus) => {
    db.updateDealCommissionStatus(dealId, status, currentUser.id, currentUser.name);
    setRefreshKey(k => k + 1);
    showToast(isKhmer ? `បានផ្លាស់ប្តូរស្ថានភាពកម្រៃជើងសារទៅជា "${status}"` : `Commission status updated to "${status}"`);
  };

  // Sync all targets helper
  const handleSyncAllTargets = () => {
    salesTargets.forEach(t => {
      db.syncSalesTargetWithDeals(t.employeeId);
    });
    setRefreshKey(k => k + 1);
    showToast(isKhmer ? 'បានធ្វើសមកាលកម្មគោលដៅលក់ទាំងអស់ដោយជោគជ័យ' : 'All sales quotas synced with verified closed deals');
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-20 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-800 flex items-center space-x-2 text-xs font-semibold animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-2xl p-4 sm:p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md font-bold">
                <BadgeDollarSign className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>{isKhmer ? 'ការគ្រប់គ្រងការលក់អចលនទ្រព្យ & កម្រៃជើងសារ' : 'Real Estate Sales & Quota Management'}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-semibold">
                    Live CRM
                  </span>
                </h1>
                <p className="text-xs text-slate-300 mt-0.5">
                  {isKhmer 
                    ? 'គ្រប់គ្រងគោលដៅលក់បុគ្គលិក បំពង់ការលក់កិច្ចព្រមព្រៀង និងការអនុម័តទូទាត់ប្រាក់កម្រៃជើងសារ' 
                    : 'Control sales quotas, track Cambodian property deals pipeline, and approve commission vouchers'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSyncAllTargets}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition active:scale-95 shadow-xs"
              title="Recalculate all employee quota achievements based on closed deals"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">{isKhmer ? 'ធ្វើសមកាលកម្ម' : 'Sync Quotas'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingDeal(null);
                setIsAddDealModalOpen(true);
              }}
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-sm flex items-center space-x-1.5 transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isKhmer ? 'កិច្ចសន្យាថ្មី' : 'New Deal'}</span>
            </button>

            {isManagerOrAdmin && (
              <button
                type="button"
                onClick={() => {
                  setEditingTarget(null);
                  setIsAddTargetModalOpen(true);
                }}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-sm flex items-center space-x-1.5 transition active:scale-95"
              >
                <Target className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isKhmer ? 'កំណត់គោលដៅលក់' : 'Set Sales Quota'}</span>
              </button>
            )}

            {isManagerOrAdmin && (
              <button
                type="button"
                onClick={() => {
                  setEditingProperty(null);
                  setIsAddPropertyModalOpen(true);
                }}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-sm flex items-center space-x-1.5 transition active:scale-95"
              >
                <Building2 className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isKhmer ? 'បន្ថែមអចលនទ្រព្យ' : 'Add Property'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Top 4 KPI Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mt-4 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/60">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{isKhmer ? 'ការលក់សម្រេចបាន' : 'Closed Sales (USD)'}</span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-base sm:text-lg font-bold text-emerald-400 mt-1">
              ${totalClosedSalesUSD.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              Pipeline: ${totalPipelineUSD.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/60">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{isKhmer ? 'កម្រៃបានទូទាត់' : 'Paid Commissions'}</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-base sm:text-lg font-bold text-blue-400 mt-1">
              ${totalCommissionsPaidUSD.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              Pending: ${totalCommissionsPendingUSD.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/60">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{isKhmer ? 'កិច្ចព្រមព្រៀងសរុប' : 'Total Deals Tracked'}</span>
              <FileText className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-base sm:text-lg font-bold text-white mt-1">
              {deals.length} {isKhmer ? 'កិច្ចសន្យា' : 'Deals'}
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              {deals.filter(d => d.stage === 'Handover / Closed').length} Closed Handover
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/60">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{isKhmer ? 'អចលនទ្រព្យក្នុងស្តុក' : 'Listed Properties'}</span>
              <Home className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-base sm:text-lg font-bold text-white mt-1">
              {properties.length} {isKhmer ? 'យូនីត' : 'Units'}
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              {properties.filter(p => p.status === 'Available').length} Available Now
            </div>
          </div>
        </div>

        {/* Current Employee Personal Quota Spotlight (If Employee / Agent has a target) */}
        {myTarget && (
          <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-emerald-300 truncate flex items-center gap-1.5">
                  <span>{isKhmer ? 'គោលដៅលក់ផ្ទាល់ខ្លួនរបស់អ្នក' : 'Your Personal Sales Quota'}</span>
                  <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.2 rounded font-mono">
                    {myTarget.period}
                  </span>
                </div>
                <div className="text-slate-300 text-[11px]">
                  Achieved: <span className="font-bold text-white">${myTarget.achievedVolumeUSD.toLocaleString()}</span> of ${myTarget.targetVolumeUSD.toLocaleString()} ({Math.round((myTarget.achievedVolumeUSD / myTarget.targetVolumeUSD) * 100)}%) • Base Rate: {myTarget.baseCommissionRate}% (+{myTarget.acceleratorBonusRate}% bonus)
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                myTarget.status === 'Exceeded' ? 'bg-purple-500/30 text-purple-200 border-purple-400/40' :
                myTarget.status === 'Achieved' ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/40' :
                myTarget.status === 'Behind' ? 'bg-rose-500/30 text-rose-200 border-rose-400/40' :
                'bg-blue-500/30 text-blue-200 border-blue-400/40'
              }`}>
                {myTarget.status}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl text-xs font-semibold overflow-x-auto no-scrollbar shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('targets')}
          className={`flex items-center space-x-1.5 py-2 px-3 sm:px-4 rounded-lg transition whitespace-nowrap ${
            activeTab === 'targets'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Target className="w-4 h-4 text-emerald-600" />
          <span>{isKhmer ? 'គោលដៅលក់បុគ្គលិក' : 'Employee Sales Targets & Quotas'}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-mono">
            {salesTargets.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('deals')}
          className={`flex items-center space-x-1.5 py-2 px-3 sm:px-4 rounded-lg transition whitespace-nowrap ${
            activeTab === 'deals'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <span>{isKhmer ? 'បំពង់ការលក់កិច្ចព្រមព្រៀង' : 'Deals Pipeline'}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-mono">
            {deals.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('commissions')}
          className={`flex items-center space-x-1.5 py-2 px-3 sm:px-4 rounded-lg transition whitespace-nowrap ${
            activeTab === 'commissions'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-4 h-4 text-amber-600" />
          <span>{isKhmer ? 'កម្រៃជើងសារ & ការទូទាត់' : 'Commissions & Payouts'}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold">
            {deals.filter(d => d.commissionPayoutStatus === 'Pending Approval').length > 0
              ? `${deals.filter(d => d.commissionPayoutStatus === 'Pending Approval').length} Pending`
              : 'OK'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('properties')}
          className={`flex items-center space-x-1.5 py-2 px-3 sm:px-4 rounded-lg transition whitespace-nowrap ${
            activeTab === 'properties'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4 text-indigo-600" />
          <span>{isKhmer ? 'កាតាឡុកអចលនទ្រព្យ' : 'Property Inventory'}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-mono">
            {properties.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EMPLOYEE SALES TARGETS & QUOTAS CONTROL */}
      {/* ========================================================================= */}
      {activeTab === 'targets' && (
        <div className="space-y-4">
          {/* Controls & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isKhmer ? 'ស្វែងរកតាមឈ្មោះបុគ្គលិក ឬតំណែង...' : 'Search by agent name, position, or notes...'}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50/60"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={selectedPeriod}
                onChange={e => setSelectedPeriod(e.target.value)}
                className="py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
              >
                <option value="All">{isKhmer ? 'គ្រប់ត្រីមាស/ខែ' : 'All Quarters'}</option>
                <option value="Q4 2026">Q4 2026</option>
                <option value="Q3 2026">Q3 2026</option>
                <option value="October 2026">October 2026</option>
              </select>

              {isManagerOrAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTarget(null);
                    setIsAddTargetModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{isKhmer ? 'កំណត់គោលដៅ' : 'Set Quota'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Targets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {salesTargets
              .filter(t => {
                if (selectedPeriod !== 'All' && t.period !== selectedPeriod) return false;
                if (searchQuery.trim()) {
                  const q = searchQuery.toLowerCase();
                  return t.employeeName.toLowerCase().includes(q) || (t.employeePosition && t.employeePosition.toLowerCase().includes(q));
                }
                return true;
              })
              .map(target => {
                const pct = Math.round((target.achievedVolumeUSD / target.targetVolumeUSD) * 100);
                const isExceeded = target.achievedVolumeUSD > target.targetVolumeUSD;
                const bonusRate = isExceeded ? target.acceleratorBonusRate : 0;
                const effectiveRate = target.baseCommissionRate + bonusRate;
                const earnedCommissionUSD = (target.achievedVolumeUSD * effectiveRate) / 100;

                return (
                  <div 
                    key={target.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition flex flex-col justify-between p-4 space-y-3"
                  >
                    <div>
                      {/* Top row: Avatar & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            {target.employeeName.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-slate-900 truncate">
                              {target.employeeName}
                            </h3>
                            <p className="text-[11px] text-slate-500 truncate">
                              {target.employeePosition || 'Sales Executive'}
                            </p>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          target.status === 'Exceeded' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                          target.status === 'Achieved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                          target.status === 'Behind' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                          'bg-blue-100 text-blue-800 border-blue-300'
                        }`}>
                          {target.status}
                        </span>
                      </div>

                      {/* Period Badge */}
                      <div className="mt-2.5 flex items-center space-x-1.5 text-[11px] text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Quota Period: <strong className="text-slate-800">{target.period}</strong></span>
                      </div>

                      {/* Quota Progress Bar */}
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-600">{isKhmer ? 'សម្រេចបាន' : 'Volume Progress'}</span>
                          <span className={`${pct >= 100 ? 'text-emerald-600' : 'text-blue-600'}`}>
                            ${target.achievedVolumeUSD.toLocaleString()} / ${target.targetVolumeUSD.toLocaleString()} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 rounded-full ${
                              pct >= 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-blue-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Units Progress */}
                      <div className="mt-2 text-[11px] flex items-center justify-between text-slate-500">
                        <span>Units Sold: <strong>{target.achievedUnits} / {target.targetUnits} units</strong></span>
                        <span>Rate: <strong>{target.baseCommissionRate}%</strong> {isExceeded && `(+${target.acceleratorBonusRate}% bonus)`}</span>
                      </div>

                      {/* Financial Earnings Card */}
                      <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                        <div className="text-[11px] text-slate-500">
                          Estimated Commission:
                        </div>
                        <div className="text-xs font-bold text-emerald-700">
                          ${Math.round(earnedCommissionUSD).toLocaleString()}
                        </div>
                      </div>

                      {target.notes && (
                        <p className="mt-2 text-[10px] text-slate-400 italic line-clamp-1">
                          "{target.notes}"
                        </p>
                      )}
                    </div>

                    {/* Bottom Card Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          db.syncSalesTargetWithDeals(target.employeeId);
                          setRefreshKey(k => k + 1);
                          showToast(isKhmer ? 'បានធ្វើបច្ចុប្បន្នភាពគោលដៅលក់' : `Recalculated quotas for ${target.employeeName}`);
                        }}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>{isKhmer ? 'ធ្វើសមកាលកម្ម' : 'Recalculate'}</span>
                      </button>

                      {isManagerOrAdmin && (
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTarget(target);
                              setIsAddTargetModalOpen(true);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                            title="Edit Sales Target"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete sales target quota for ${target.employeeName}?`)) {
                                db.deleteSalesTarget(target.id);
                                setRefreshKey(k => k + 1);
                                showToast('Sales quota removed');
                              }
                            }}
                            className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete Target"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DEALS PIPELINE */}
      {/* ========================================================================= */}
      {activeTab === 'deals' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isKhmer ? 'ស្វែងរកតាមលេខកូដកិច្ចសន្យា ឈ្មោះអតិថិជន ឬភ្នាក់ងារ...' : 'Search deals by code, buyer name, or agent...'}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50/60"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={selectedDealStage}
                onChange={e => setSelectedDealStage(e.target.value)}
                className="py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
              >
                <option value="All">{isKhmer ? 'គ្រប់ដំណាក់កាល' : 'All Deal Stages'}</option>
                {DEAL_STAGES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  setEditingDeal(null);
                  setIsAddDealModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isKhmer ? 'បង្កើតកិច្ចសន្យា' : 'New Deal'}</span>
              </button>
            </div>
          </div>

          {/* Deals Table & Card View */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3.5">Deal Code</th>
                    <th className="py-3 px-3.5">Property & Unit</th>
                    <th className="py-3 px-3.5">Buyer / Client</th>
                    <th className="py-3 px-3.5">Sales Agent</th>
                    <th className="py-3 px-3.5">Sale Price</th>
                    <th className="py-3 px-3.5">Agent Commission</th>
                    <th className="py-3 px-3.5">Deal Stage</th>
                    <th className="py-3 px-3.5">Payout Status</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deals
                    .filter(d => {
                      if (selectedDealStage !== 'All' && d.stage !== selectedDealStage) return false;
                      if (searchQuery.trim()) {
                        const q = searchQuery.toLowerCase();
                        return (
                          d.dealCode.toLowerCase().includes(q) ||
                          d.clientName.toLowerCase().includes(q) ||
                          d.agentName.toLowerCase().includes(q) ||
                          d.propertyTitle.toLowerCase().includes(q)
                        );
                      }
                      return true;
                    })
                    .map(deal => (
                      <tr key={deal.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3.5 font-bold font-mono text-blue-700">
                          {deal.dealCode}
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-slate-900 truncate max-w-[180px]">
                            {deal.propertyTitle}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {deal.unitNumber} • {deal.projectName}
                          </div>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="font-medium text-slate-800">{deal.clientName}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5" />
                            <span>{deal.clientPhone}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="flex items-center space-x-1.5">
                            <div className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[9px] font-bold">
                              {deal.agentName.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span className="font-medium text-slate-800">{deal.agentName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 font-bold text-slate-900">
                          ${deal.salePriceUSD.toLocaleString()}
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-emerald-700">
                            ${deal.agentCommissionUSD.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {deal.commissionPercentage}% gross
                          </div>
                        </td>
                        <td className="py-3 px-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            deal.stage === 'Handover / Closed' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                            deal.stage === 'Contract Signed' || deal.stage === 'Down Payment Cleared' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                            deal.stage === 'Booking Deposit' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {deal.stage}
                          </span>
                        </td>
                        <td className="py-3 px-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            deal.commissionPayoutStatus === 'Paid Out' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                            deal.commissionPayoutStatus === 'Approved' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                            deal.commissionPayoutStatus === 'Pending Approval' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {deal.commissionPayoutStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {deal.stage !== 'Handover / Closed' && (
                              <button
                                type="button"
                                onClick={() => handleAdvanceDealStage(deal)}
                                className="px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-[11px] flex items-center space-x-0.5"
                                title="Advance Deal to Next Stage"
                              >
                                <span>Advance</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedDealForVoucher(deal)}
                              className="p-1 rounded text-slate-600 hover:text-indigo-600 hover:bg-slate-100"
                              title="View Commission Voucher"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingDeal(deal);
                                setIsAddDealModalOpen(true);
                              }}
                              className="p-1 rounded text-slate-600 hover:text-blue-600 hover:bg-slate-100"
                              title="Edit Deal"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {isManagerOrAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Delete deal ${deal.dealCode}?`)) {
                                    db.deleteRealEstateDeal(deal.id);
                                    setRefreshKey(k => k + 1);
                                    showToast('Deal deleted');
                                  }
                                }}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                title="Delete Deal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: COMMISSIONS & PAYOUTS MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'commissions' && (
        <div className="space-y-4">
          {/* Commission Tier Preview Banner */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  {isKhmer ? 'កម្រិតកម្រៃជើងសារ & ប្រាក់រង្វាន់លើកទឹកចិត្ត' : 'Commission Tiers & Accelerator Incentives'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Progressive commission tiers reward top producers with higher commission percentages and cash bonuses.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {commissionTiers.map(tier => (
                <div key={tier.id} className={`p-3 rounded-xl border ${tier.badgeColor} flex flex-col justify-between`}>
                  <div>
                    <div className="font-bold text-xs">{tier.tierName}</div>
                    <div className="text-[10px] mt-0.5 opacity-80">
                      Volume: ${tier.minVolumeUSD.toLocaleString()} - {tier.maxVolumeUSD > 9999999 ? 'Above' : `$${tier.maxVolumeUSD.toLocaleString()}`}
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-current/20 flex items-center justify-between text-xs font-bold">
                    <span>{tier.commissionRatePercent}% Rate</span>
                    {tier.bonusAmountUSD > 0 && (
                      <span className="text-[10px] bg-white/80 px-1.5 py-0.2 rounded text-slate-900">
                        +${tier.bonusAmountUSD.toLocaleString()} Bonus
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Approval Vouchers for Managers */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>{isKhmer ? 'ការអនុម័តប័ណ្ណទូទាត់ប្រាក់កម្រៃជើងសារ' : 'Commission Payout Approvals & Ledger'}</span>
                </h3>
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={selectedCommissionStatus}
                  onChange={e => setSelectedCommissionStatus(e.target.value)}
                  className="py-1 px-2 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
                >
                  <option value="All">{isKhmer ? 'គ្រប់ស្ថានភាពទូទាត់' : 'All Statuses'}</option>
                  <option value="Pending Approval">Pending Approval</option>
                  <option value="Approved">Approved</option>
                  <option value="Paid Out">Paid Out</option>
                  <option value="Pending Contract">Pending Contract</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3.5">Deal & Property</th>
                    <th className="py-2.5 px-3.5">Sales Agent</th>
                    <th className="py-2.5 px-3.5">Sale Value</th>
                    <th className="py-2.5 px-3.5">Commission Rate</th>
                    <th className="py-2.5 px-3.5">Net Agent Share</th>
                    <th className="py-2.5 px-3.5">Agency Cut</th>
                    <th className="py-2.5 px-3.5">Status</th>
                    <th className="py-2.5 px-3.5 text-right">Approval Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deals
                    .filter(d => {
                      if (selectedCommissionStatus !== 'All' && d.commissionPayoutStatus !== selectedCommissionStatus) return false;
                      return true;
                    })
                    .map(deal => (
                      <tr key={deal.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-slate-900">{deal.dealCode}</div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[180px]">
                            {deal.propertyTitle} ({deal.unitNumber})
                          </div>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-slate-800">{deal.agentName}</div>
                          <div className="text-[10px] text-slate-400">Agent ID: {deal.agentId}</div>
                        </td>
                        <td className="py-3 px-3.5 font-bold text-slate-900">
                          ${deal.salePriceUSD.toLocaleString()}
                        </td>
                        <td className="py-3 px-3.5 text-slate-600 font-medium">
                          {deal.commissionPercentage}%
                        </td>
                        <td className="py-3 px-3.5 font-bold text-emerald-700">
                          ${deal.agentCommissionUSD.toLocaleString()}
                        </td>
                        <td className="py-3 px-3.5 text-slate-500 font-medium">
                          ${deal.agencyCutUSD.toLocaleString()}
                        </td>
                        <td className="py-3 px-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            deal.commissionPayoutStatus === 'Paid Out' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                            deal.commissionPayoutStatus === 'Approved' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                            deal.commissionPayoutStatus === 'Pending Approval' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                            deal.commissionPayoutStatus === 'Rejected' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {deal.commissionPayoutStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* View Voucher */}
                            <button
                              type="button"
                              onClick={() => setSelectedDealForVoucher(deal)}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center space-x-1"
                            >
                              <FileText className="w-3 h-3 text-slate-500" />
                              <span>Voucher</span>
                            </button>

                            {/* Manager/Admin Approvals */}
                            {isManagerOrAdmin && deal.commissionPayoutStatus === 'Pending Approval' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateCommissionStatus(deal.id, 'Approved')}
                                className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center space-x-0.5 shadow-2xs"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                            )}

                            {isManagerOrAdmin && deal.commissionPayoutStatus === 'Approved' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateCommissionStatus(deal.id, 'Paid Out')}
                                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center space-x-0.5 shadow-2xs"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Pay Out</span>
                              </button>
                            )}

                            {isManagerOrAdmin && deal.commissionPayoutStatus === 'Pending Approval' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateCommissionStatus(deal.id, 'Rejected')}
                                className="px-1.5 py-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 text-[11px] font-semibold"
                                title="Reject Commission Claim"
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PROPERTY INVENTORY CATALOG */}
      {/* ========================================================================= */}
      {activeTab === 'properties' && (
        <div className="space-y-4">
          {/* Property Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isKhmer ? 'ស្វែងរកតាមគម្រោង ឬលេខកូដអចលនទ្រព្យ...' : 'Search properties by project, code, or location...'}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50/60"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={selectedPropertyType}
                onChange={e => setSelectedPropertyType(e.target.value)}
                className="py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
              >
                <option value="All">{isKhmer ? 'គ្រប់ប្រភេទអចលនទ្រព្យ' : 'All Types'}</option>
                {PROPERTY_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <select
                value={selectedPropertyStatus}
                onChange={e => setSelectedPropertyStatus(e.target.value)}
                className="py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
              >
                <option value="All">{isKhmer ? 'គ្រប់ស្ថានភាព' : 'All Statuses'}</option>
                <option value="Available">Available</option>
                <option value="Reserved">Reserved</option>
                <option value="Under Contract">Under Contract</option>
                <option value="Sold">Sold</option>
              </select>

              {isManagerOrAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingProperty(null);
                    setIsAddPropertyModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{isKhmer ? 'បន្ថែម' : 'Add Property'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Properties Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {properties
              .filter(p => {
                if (selectedPropertyType !== 'All' && p.propertyType !== selectedPropertyType) return false;
                if (selectedPropertyStatus !== 'All' && p.status !== selectedPropertyStatus) return false;
                if (searchQuery.trim()) {
                  const q = searchQuery.toLowerCase();
                  return (
                    p.propertyCode.toLowerCase().includes(q) ||
                    p.title.toLowerCase().includes(q) ||
                    p.projectName.toLowerCase().includes(q) ||
                    p.location.toLowerCase().includes(q)
                  );
                }
                return true;
              })
              .map(prop => (
                <div 
                  key={prop.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {/* Image / Header Banner */}
                    <div className="relative h-40 bg-slate-100 overflow-hidden">
                      {prop.imageUrl ? (
                        <img 
                          src={prop.imageUrl} 
                          alt={prop.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">
                          <Building2 className="w-10 h-10" />
                        </div>
                      )}

                      <div className="absolute top-2.5 left-2.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-mono font-bold">
                          {prop.propertyCode}
                        </span>
                      </div>

                      <div className="absolute top-2.5 right-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-xs ${
                          prop.status === 'Available' ? 'bg-emerald-500 text-white border-emerald-400' :
                          prop.status === 'Reserved' ? 'bg-amber-500 text-white border-amber-400' :
                          prop.status === 'Under Contract' ? 'bg-blue-600 text-white border-blue-500' :
                          'bg-slate-700 text-white border-slate-600'
                        }`}>
                          {prop.status}
                        </span>
                      </div>

                      <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-white drop-shadow-md">
                        <span className="text-xs font-semibold bg-slate-900/60 px-2 py-0.5 rounded backdrop-blur-xs">
                          {prop.propertyType}
                        </span>
                        <span className="text-sm font-extrabold bg-emerald-700/85 px-2 py-0.5 rounded backdrop-blur-xs">
                          ${prop.priceUSD.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Property Meta */}
                    <div className="p-3.5 space-y-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 truncate">
                          {prop.title}
                        </h4>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {prop.projectName} • {prop.location}
                        </div>
                      </div>

                      {/* Specs pills */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-600 pt-1">
                        <span className="bg-slate-100 px-2 py-0.5 rounded">
                          {prop.bedrooms} Bed
                        </span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded">
                          {prop.bathrooms} Bath
                        </span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded font-mono">
                          {prop.sizeSqM} m²
                        </span>
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold ml-auto">
                          {prop.commissionRatePercent}% Commission
                        </span>
                      </div>

                      {prop.assignedAgentName && (
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 pt-1">
                          <UserIcon className="w-3 h-3 text-slate-400" />
                          <span>Assigned Agent: <strong>{prop.assignedAgentName}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDeal({
                          id: '',
                          dealCode: '',
                          propertyId: prop.id,
                          propertyCode: prop.propertyCode,
                          propertyTitle: prop.title,
                          projectName: prop.projectName,
                          propertyType: prop.propertyType,
                          unitNumber: prop.unitNumber,
                          clientName: '',
                          clientPhone: '',
                          agentId: prop.assignedAgentId || currentUser.id,
                          agentName: prop.assignedAgentName || currentUser.name,
                          salePriceUSD: prop.priceUSD,
                          commissionPercentage: prop.commissionRatePercent,
                          grossCommissionUSD: Math.round((prop.priceUSD * prop.commissionRatePercent) / 100),
                          agentCommissionUSD: Math.round(((prop.priceUSD * prop.commissionRatePercent) / 100) * 0.7),
                          agencyCutUSD: Math.round(((prop.priceUSD * prop.commissionRatePercent) / 100) * 0.3),
                          dealDate: new Date().toISOString().split('T')[0],
                          stage: 'Inquiry',
                          paymentMethod: 'Bank Loan (70%)',
                          commissionPayoutStatus: 'Pending Contract',
                          createdAt: '',
                          updatedAt: ''
                        });
                        setIsAddDealModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition flex items-center space-x-1"
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                      <span>Start Deal</span>
                    </button>

                    {isManagerOrAdmin && (
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProperty(prop);
                            setIsAddPropertyModalOpen(true);
                          }}
                          className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-200"
                          title="Edit Property"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete property ${prop.propertyCode}?`)) {
                              db.deleteProperty(prop.id);
                              setRefreshKey(k => k + 1);
                              showToast('Property deleted');
                            }
                          }}
                          className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                          title="Delete Property"
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
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT SALES TARGET QUOTA */}
      {/* ========================================================================= */}
      {isAddTargetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">
                  {editingTarget ? 'Edit Sales Quota' : 'Assign Employee Sales Quota'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddTargetModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                const form = e.currentTarget;
                const employeeId = (form.elements.namedItem('employeeId') as HTMLSelectElement).value;
                const empUser = allUsers.find(u => u.id === employeeId);
                const period = (form.elements.namedItem('period') as HTMLInputElement).value;
                const targetVolumeUSD = parseFloat((form.elements.namedItem('targetVolumeUSD') as HTMLInputElement).value) || 500000;
                const targetUnits = parseInt((form.elements.namedItem('targetUnits') as HTMLInputElement).value) || 3;
                const baseCommissionRate = parseFloat((form.elements.namedItem('baseCommissionRate') as HTMLInputElement).value) || 3.0;
                const acceleratorBonusRate = parseFloat((form.elements.namedItem('acceleratorBonusRate') as HTMLInputElement).value) || 1.0;
                const notes = (form.elements.namedItem('notes') as HTMLTextAreaElement).value;

                if (editingTarget) {
                  db.updateSalesTarget(editingTarget.id, {
                    period,
                    targetVolumeUSD,
                    targetUnits,
                    baseCommissionRate,
                    acceleratorBonusRate,
                    notes
                  });
                  showToast('Sales quota updated');
                } else {
                  db.addSalesTarget({
                    employeeId,
                    employeeName: empUser?.name || 'Sales Agent',
                    employeePosition: empUser?.role || 'Sales Executive',
                    period,
                    targetVolumeUSD,
                    targetUnits,
                    achievedVolumeUSD: 0,
                    achievedUnits: 0,
                    baseCommissionRate,
                    acceleratorBonusRate,
                    status: 'Active',
                    notes
                  });
                  db.syncSalesTargetWithDeals(employeeId);
                  showToast('Sales quota assigned successfully');
                }

                setIsAddTargetModalOpen(false);
                setRefreshKey(k => k + 1);
              }}
              className="p-4 space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Employee / Sales Agent
                </label>
                <select
                  name="employeeId"
                  defaultValue={editingTarget?.employeeId || allUsers[0]?.id}
                  disabled={!!editingTarget}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                >
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Quota Period
                  </label>
                  <input
                    type="text"
                    name="period"
                    defaultValue={editingTarget?.period || 'Q4 2026'}
                    required
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Target Volume (USD)
                  </label>
                  <input
                    type="number"
                    name="targetVolumeUSD"
                    defaultValue={editingTarget?.targetVolumeUSD || 500000}
                    required
                    min={10000}
                    step={10000}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Target Units
                  </label>
                  <input
                    type="number"
                    name="targetUnits"
                    defaultValue={editingTarget?.targetUnits || 3}
                    min={1}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Base Rate %
                  </label>
                  <input
                    type="number"
                    name="baseCommissionRate"
                    defaultValue={editingTarget?.baseCommissionRate || 3.0}
                    step={0.1}
                    min={0.5}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Bonus Rate %
                  </label>
                  <input
                    type="number"
                    name="acceleratorBonusRate"
                    defaultValue={editingTarget?.acceleratorBonusRate || 1.0}
                    step={0.1}
                    min={0}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Notes & Strategy Focus
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editingTarget?.notes || ''}
                  placeholder="e.g. Focus on Borey Peng Huoth Luxury Villas..."
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddTargetModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  {editingTarget ? 'Save Changes' : 'Assign Quota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD / EDIT REAL ESTATE PROPERTY */}
      {/* ========================================================================= */}
      {isAddPropertyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">
                  {editingProperty ? 'Edit Property Listing' : 'Register New Property'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPropertyModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                const form = e.currentTarget;
                const propertyCode = (form.elements.namedItem('propertyCode') as HTMLInputElement).value;
                const title = (form.elements.namedItem('title') as HTMLInputElement).value;
                const projectName = (form.elements.namedItem('projectName') as HTMLInputElement).value;
                const developer = (form.elements.namedItem('developer') as HTMLInputElement).value;
                const propertyType = (form.elements.namedItem('propertyType') as HTMLSelectElement).value as RealEstatePropertyType;
                const unitNumber = (form.elements.namedItem('unitNumber') as HTMLInputElement).value;
                const location = (form.elements.namedItem('location') as HTMLInputElement).value;
                const bedrooms = parseInt((form.elements.namedItem('bedrooms') as HTMLInputElement).value) || 3;
                const bathrooms = parseInt((form.elements.namedItem('bathrooms') as HTMLInputElement).value) || 3;
                const sizeSqM = parseFloat((form.elements.namedItem('sizeSqM') as HTMLInputElement).value) || 120;
                const priceUSD = parseFloat((form.elements.namedItem('priceUSD') as HTMLInputElement).value) || 200000;
                const commissionRatePercent = parseFloat((form.elements.namedItem('commissionRatePercent') as HTMLInputElement).value) || 3.0;
                const status = (form.elements.namedItem('status') as HTMLSelectElement).value as RealEstatePropertyStatus;
                const imageUrl = (form.elements.namedItem('imageUrl') as HTMLInputElement).value;
                const assignedAgentId = (form.elements.namedItem('assignedAgentId') as HTMLSelectElement).value;
                const agentUser = allUsers.find(u => u.id === assignedAgentId);

                if (editingProperty) {
                  db.updateProperty(editingProperty.id, {
                    propertyCode,
                    title,
                    projectName,
                    developer,
                    propertyType,
                    unitNumber,
                    location,
                    bedrooms,
                    bathrooms,
                    sizeSqM,
                    priceUSD,
                    commissionRatePercent,
                    status,
                    imageUrl,
                    assignedAgentId,
                    assignedAgentName: agentUser?.name
                  });
                  showToast('Property updated');
                } else {
                  db.addProperty({
                    propertyCode,
                    title,
                    projectName,
                    developer,
                    propertyType,
                    unitNumber,
                    location,
                    bedrooms,
                    bathrooms,
                    sizeSqM,
                    priceUSD,
                    commissionRatePercent,
                    status,
                    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
                    assignedAgentId,
                    assignedAgentName: agentUser?.name
                  });
                  showToast('Property registered successfully');
                }

                setIsAddPropertyModalOpen(false);
                setRefreshKey(k => k + 1);
              }}
              className="p-4 space-y-3 overflow-y-auto text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Property Code
                  </label>
                  <input
                    type="text"
                    name="propertyCode"
                    defaultValue={editingProperty?.propertyCode || `PROP-${Math.floor(100 + Math.random() * 900)}`}
                    required
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Property Type
                  </label>
                  <select
                    name="propertyType"
                    defaultValue={editingProperty?.propertyType || 'Luxury Villa'}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                  >
                    {PROPERTY_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  defaultValue={editingProperty?.title || ''}
                  required
                  placeholder="e.g. Modern Queen Villa with Private Garden"
                  className="w-full p-2 border border-slate-200 rounded-lg font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Project Name
                  </label>
                  <input
                    type="text"
                    name="projectName"
                    defaultValue={editingProperty?.projectName || 'Borey Peng Huoth Grand Star'}
                    required
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Unit Number
                  </label>
                  <input
                    type="text"
                    name="unitNumber"
                    defaultValue={editingProperty?.unitNumber || 'Villa Queen A-01'}
                    required
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Developer
                  </label>
                  <input
                    type="text"
                    name="developer"
                    defaultValue={editingProperty?.developer || 'Peng Huoth Group'}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    defaultValue={editingProperty?.location || 'Phnom Penh'}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Bedrooms
                  </label>
                  <input
                    type="number"
                    name="bedrooms"
                    defaultValue={editingProperty?.bedrooms || 4}
                    min={1}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Bathrooms
                  </label>
                  <input
                    type="number"
                    name="bathrooms"
                    defaultValue={editingProperty?.bathrooms || 5}
                    min={1}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Size (m²)
                  </label>
                  <input
                    type="number"
                    name="sizeSqM"
                    defaultValue={editingProperty?.sizeSqM || 280}
                    min={10}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Price (USD)
                  </label>
                  <input
                    type="number"
                    name="priceUSD"
                    defaultValue={editingProperty?.priceUSD || 250000}
                    required
                    min={1000}
                    step={1000}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Commission %
                  </label>
                  <input
                    type="number"
                    name="commissionRatePercent"
                    defaultValue={editingProperty?.commissionRatePercent || 3.0}
                    step={0.1}
                    min={0.5}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    defaultValue={editingProperty?.status || 'Available'}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Available">Available</option>
                    <option value="Reserved">Reserved</option>
                    <option value="Under Contract">Under Contract</option>
                    <option value="Sold">Sold</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Assigned Sales Agent
                </label>
                <select
                  name="assignedAgentId"
                  defaultValue={editingProperty?.assignedAgentId || allUsers[0]?.id}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                >
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  name="imageUrl"
                  defaultValue={editingProperty?.imageUrl || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80'}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddPropertyModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  {editingProperty ? 'Save Changes' : 'Register Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADD / EDIT REAL ESTATE DEAL */}
      {/* ========================================================================= */}
      {isAddDealModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">
                  {editingDeal?.id ? 'Edit Deal & Commission' : 'Register New Real Estate Deal'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddDealModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                const form = e.currentTarget;
                const propertyId = (form.elements.namedItem('propertyId') as HTMLSelectElement).value;
                const prop = properties.find(p => p.id === propertyId);
                const clientName = (form.elements.namedItem('clientName') as HTMLInputElement).value;
                const clientPhone = (form.elements.namedItem('clientPhone') as HTMLInputElement).value;
                const agentId = (form.elements.namedItem('agentId') as HTMLSelectElement).value;
                const agentUser = allUsers.find(u => u.id === agentId);
                const salePriceUSD = parseFloat((form.elements.namedItem('salePriceUSD') as HTMLInputElement).value) || 200000;
                const commissionPercentage = parseFloat((form.elements.namedItem('commissionPercentage') as HTMLInputElement).value) || 3.0;
                const agentSharePct = parseFloat((form.elements.namedItem('agentSharePct') as HTMLInputElement).value) || 70;
                const stage = (form.elements.namedItem('stage') as HTMLSelectElement).value as RealEstateDealStage;
                const paymentMethod = (form.elements.namedItem('paymentMethod') as HTMLSelectElement).value as any;
                const commissionPayoutStatus = (form.elements.namedItem('commissionPayoutStatus') as HTMLSelectElement).value as CommissionPayoutStatus;
                const notes = (form.elements.namedItem('notes') as HTMLTextAreaElement).value;

                const grossCommissionUSD = Math.round((salePriceUSD * commissionPercentage) / 100);
                const agentCommissionUSD = Math.round((grossCommissionUSD * agentSharePct) / 100);
                const agencyCutUSD = grossCommissionUSD - agentCommissionUSD;

                if (editingDeal?.id) {
                  db.updateRealEstateDeal(editingDeal.id, {
                    propertyId,
                    propertyCode: prop?.propertyCode || editingDeal.propertyCode,
                    propertyTitle: prop?.title || editingDeal.propertyTitle,
                    projectName: prop?.projectName || editingDeal.projectName,
                    propertyType: prop?.propertyType || editingDeal.propertyType,
                    unitNumber: prop?.unitNumber || editingDeal.unitNumber,
                    clientName,
                    clientPhone,
                    agentId,
                    agentName: agentUser?.name || editingDeal.agentName,
                    salePriceUSD,
                    commissionPercentage,
                    grossCommissionUSD,
                    agentCommissionUSD,
                    agencyCutUSD,
                    stage,
                    paymentMethod,
                    commissionPayoutStatus,
                    notes
                  });
                  showToast('Deal record updated');
                } else {
                  db.addRealEstateDeal({
                    propertyId: prop?.id || '',
                    propertyCode: prop?.propertyCode || 'PROP-CUSTOM',
                    propertyTitle: prop?.title || 'Selected Property',
                    projectName: prop?.projectName || 'Prime Project',
                    propertyType: prop?.propertyType || 'Luxury Villa',
                    unitNumber: prop?.unitNumber || 'Unit 01',
                    clientName,
                    clientPhone,
                    agentId,
                    agentName: agentUser?.name || 'Sales Agent',
                    salePriceUSD,
                    commissionPercentage,
                    grossCommissionUSD,
                    agentCommissionUSD,
                    agencyCutUSD,
                    dealDate: new Date().toISOString().split('T')[0],
                    stage,
                    paymentMethod,
                    commissionPayoutStatus,
                    notes
                  });
                  showToast('Deal registered successfully and quota synced!');
                }

                setIsAddDealModalOpen(false);
                setRefreshKey(k => k + 1);
              }}
              className="p-4 space-y-3 overflow-y-auto text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Property
                </label>
                <select
                  name="propertyId"
                  defaultValue={editingDeal?.propertyId || properties[0]?.id}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                >
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.propertyCode} - {p.title} (${p.priceUSD.toLocaleString()} • {p.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Buyer / Client Name
                  </label>
                  <input
                    type="text"
                    name="clientName"
                    defaultValue={editingDeal?.clientName || ''}
                    required
                    placeholder="e.g. Oknha Sovann Vuthy"
                    className="w-full p-2 border border-slate-200 rounded-lg font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Buyer Phone Number
                  </label>
                  <input
                    type="text"
                    name="clientPhone"
                    defaultValue={editingDeal?.clientPhone || '012 345 678'}
                    required
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Closing Sales Agent
                </label>
                <select
                  name="agentId"
                  defaultValue={editingDeal?.agentId || currentUser.id}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                >
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Agreed Sale Price ($)
                  </label>
                  <input
                    type="number"
                    name="salePriceUSD"
                    defaultValue={editingDeal?.salePriceUSD || 250000}
                    required
                    step={1000}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Gross Rate %
                  </label>
                  <input
                    type="number"
                    name="commissionPercentage"
                    defaultValue={editingDeal?.commissionPercentage || 3.0}
                    step={0.1}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Agent Split %
                  </label>
                  <input
                    type="number"
                    name="agentSharePct"
                    defaultValue={70}
                    step={1}
                    min={10}
                    max={100}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    title="Percentage of gross commission paid to agent (e.g. 70%)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Deal Stage
                  </label>
                  <select
                    name="stage"
                    defaultValue={editingDeal?.stage || 'Booking Deposit'}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white font-medium"
                  >
                    {DEAL_STAGES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    name="paymentMethod"
                    defaultValue={editingDeal?.paymentMethod || 'Bank Loan (70%)'}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Full Cash">Full Cash</option>
                    <option value="Bank Loan (70%)">Bank Loan (70%)</option>
                    <option value="Developer Installment (24-Mo)">Developer Installment (24-Mo)</option>
                    <option value="Progressive Payment">Progressive Payment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Commission Payout Status
                </label>
                <select
                  name="commissionPayoutStatus"
                  defaultValue={editingDeal?.commissionPayoutStatus || 'Pending Contract'}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white font-medium"
                >
                  <option value="Pending Contract">Pending Contract</option>
                  <option value="Pending Approval">Pending Approval</option>
                  <option value="Approved">Approved</option>
                  <option value="Paid Out">Paid Out</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Notes & Terms
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editingDeal?.notes || ''}
                  placeholder="Booking deposit amount, bank pre-approval status, or contract notes..."
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddDealModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  {editingDeal?.id ? 'Save Deal' : 'Register Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: COMMISSION VOUCHER PREVIEW & PRINT RECEIPT */}
      {/* ========================================================================= */}
      {selectedDealForVoucher && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">
                  Commission Payout Voucher
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDealForVoucher(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-sans">
              {/* Header Info */}
              <div className="text-center border-b border-slate-200 pb-3">
                <div className="text-xs uppercase tracking-widest text-slate-500 font-bold">
                  Official Brokerage Disbursement
                </div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">
                  VOUCHER #{selectedDealForVoucher.dealCode}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Issued on: {new Date(selectedDealForVoucher.dealDate || selectedDealForVoucher.createdAt).toLocaleDateString()}
                </div>
              </div>

              {/* Deal Breakdown */}
              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Property:</span>
                  <span className="font-bold text-slate-800 text-right">{selectedDealForVoucher.propertyTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Unit Number:</span>
                  <span className="font-medium text-slate-800">{selectedDealForVoucher.unitNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Client / Buyer:</span>
                  <span className="font-medium text-slate-800">{selectedDealForVoucher.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Beneficiary Agent:</span>
                  <span className="font-bold text-blue-700">{selectedDealForVoucher.agentName}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200/80 pt-2">
                  <span className="text-slate-500">Agreed Sale Price:</span>
                  <span className="font-bold text-slate-900">${selectedDealForVoucher.salePriceUSD.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gross Brokerage Rate:</span>
                  <span className="font-medium text-slate-800">{selectedDealForVoucher.commissionPercentage}% (${selectedDealForVoucher.grossCommissionUSD.toLocaleString()})</span>
                </div>
                <div className="flex justify-between border-t border-slate-200/80 pt-2 font-bold text-sm text-emerald-700">
                  <span>Net Agent Payout:</span>
                  <span>${selectedDealForVoucher.agentCommissionUSD.toLocaleString()}</span>
                </div>
              </div>

              {/* Payout & Approval Details */}
              <div className="p-3 rounded-xl border border-dashed border-slate-200 text-[11px] space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span>Voucher Status:</span>
                  <span className="font-bold text-slate-900 uppercase">{selectedDealForVoucher.commissionPayoutStatus}</span>
                </div>
                {selectedDealForVoucher.payoutApprovedByName && (
                  <div className="flex justify-between">
                    <span>Approved By:</span>
                    <span className="font-semibold text-slate-800">{selectedDealForVoucher.payoutApprovedByName}</span>
                  </div>
                )}
                {selectedDealForVoucher.payoutDate && (
                  <div className="flex justify-between">
                    <span>Payout Date:</span>
                    <span className="font-semibold text-slate-800">{selectedDealForVoucher.payoutDate}</span>
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDealForVoucher(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Close
                </button>

                <div className="flex items-center space-x-2">
                  {isManagerOrAdmin && selectedDealForVoucher.commissionPayoutStatus === 'Pending Approval' && (
                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateCommissionStatus(selectedDealForVoucher.id, 'Approved');
                        setSelectedDealForVoucher(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold"
                    >
                      Approve Voucher
                    </button>
                  )}

                  {isManagerOrAdmin && selectedDealForVoucher.commissionPayoutStatus === 'Approved' && (
                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateCommissionStatus(selectedDealForVoucher.id, 'Paid Out');
                        setSelectedDealForVoucher(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                    >
                      Mark as Paid Out
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      window.print();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold"
                  >
                    Print Voucher
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
