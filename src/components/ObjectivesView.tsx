import React, { useState } from 'react';
import { Target, Plus, Edit3, Trash2, Layers, CheckCircle2, TrendingUp, X } from 'lucide-react';
import { Objective, Language, User as UserType } from '../types';
import { translations } from '../services/i18n';
import { db } from '../services/db';

interface ObjectivesViewProps {
  currentUser: UserType;
  lang: Language;
  onNavigatePlan: (planId: string) => void;
}

export const ObjectivesView: React.FC<ObjectivesViewProps> = ({
  currentUser,
  lang,
  onNavigatePlan,
}) => {
  const t = translations[lang];
  const [objectives, setObjectives] = useState<Objective[]>(() => db.getObjectives());
  const plans = db.getPlans();
  const users = db.getUsers();

  const [showModal, setShowModal] = useState(false);
  const [editingObj, setEditingObj] = useState<Objective | null>(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState<'Operational' | 'Financial' | 'Customer' | 'Growth' | 'Technology'>('Operational');
  const [targetValue, setTargetValue] = useState(100);
  const [targetUnit, setTargetUnit] = useState('%');
  const [period, setPeriod] = useState('2026');
  const [ownerId, setOwnerId] = useState(currentUser.id);
  const [error, setError] = useState('');

  const refreshData = () => {
    setObjectives(db.getObjectives());
  };

  const handleOpenCreate = () => {
    setEditingObj(null);
    setTitle('');
    setDesc('');
    setCategory('Operational');
    setTargetValue(100);
    setTargetUnit('%');
    setPeriod('2026');
    setOwnerId(currentUser.id);
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (obj: Objective) => {
    setEditingObj(obj);
    setTitle(obj.title);
    setDesc(obj.description);
    setCategory(obj.category || 'Operational');
    setTargetValue(obj.targetValue);
    setTargetUnit(obj.targetUnit || obj.measurementUnit || '%');
    setPeriod(obj.period || '2026');
    setOwnerId(obj.ownerId);
    setError('');
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    try {
      db.saveObjective({
        id: editingObj?.id,
        title,
        description: desc,
        category,
        targetValue: Number(targetValue),
        targetUnit,
        period,
        ownerId,
        isActive: true,
      });
      setShowModal(false);
      refreshData();
    } catch (err: any) {
      setError(err.message || 'Failed to save objective.');
    }
  };

  const isSuperAdminOrAdmin = ['Super Admin', 'Administrator', 'Executive / Viewer'].includes(currentUser.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {t.objectives} (Strategic Alignment)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organizational goals linked with measurable target KPIs and departmental action plans.
          </p>
        </div>

        {['Super Admin', 'Administrator'].includes(currentUser.role) && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Strategic Objective</span>
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {objectives.map(obj => {
          const owner = users.find(u => u.id === obj.ownerId);
          const linkedPlans = plans.filter(p => p.objectiveId === obj.id);
          const avgCompletion = linkedPlans.length > 0 
            ? Math.round(linkedPlans.reduce((sum, p) => sum + p.completionPercentage, 0) / linkedPlans.length)
            : 0;

          return (
            <div key={obj.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                      {obj.code}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {obj.category}
                    </span>
                  </div>
                  {['Super Admin', 'Administrator'].includes(currentUser.role) && (
                    <button
                      onClick={() => handleOpenEdit(obj)}
                      className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <h3 className="font-bold text-sm text-slate-900 leading-snug">{obj.title}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {obj.description}
                </p>

                {/* Progress bar toward objective */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-medium text-slate-600">Goal Target: {obj.targetValue} {obj.targetUnit}</span>
                    <span className="font-mono font-bold text-blue-700">{avgCompletion}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${avgCompletion}%` }}
                    ></div>
                  </div>
                </div>

                {/* Linked Action Plans Count */}
                <div className="mt-3 text-xs text-slate-600 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Period: {obj.period}</span>
                    <span className="text-slate-400 text-[11px]">Owner: {owner?.name}</span>
                  </div>
                </div>
              </div>

              {/* Linked plans pill list */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-[11px] font-semibold text-slate-700 mb-1.5 flex items-center space-x-1">
                  <Layers className="w-3 h-3 text-blue-600" />
                  <span>Linked Action Plans ({linkedPlans.length}):</span>
                </p>
                <div className="flex flex-wrap gap-1">
                  {linkedPlans.length === 0 ? (
                    <span className="text-[10px] text-slate-400 italic">No action plans linked</span>
                  ) : (
                    linkedPlans.map(lp => (
                      <span
                        key={lp.id}
                        onClick={() => onNavigatePlan(lp.id)}
                        className="font-mono text-[10px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 px-1.5 py-0.5 rounded cursor-pointer border border-slate-200 transition"
                      >
                        {lp.planNumber}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-sm text-slate-900">
                {editingObj ? 'Edit Strategic Objective' : 'New Strategic Objective'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-2.5 rounded bg-rose-50 text-rose-700 text-xs mb-3">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Objective Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Modernize Core Architecture & Cloud Security"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="Operational">Operational</option>
                    <option value="Financial">Financial</option>
                    <option value="Customer">Customer</option>
                    <option value="Growth">Growth</option>
                    <option value="Technology">Technology</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Period</label>
                  <input
                    type="text"
                    value={period}
                    onChange={e => setPeriod(e.target.value)}
                    placeholder="2026"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Value</label>
                  <input
                    type="number"
                    value={targetValue}
                    onChange={e => setTargetValue(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={targetUnit}
                    onChange={e => setTargetUnit(e.target.value)}
                    placeholder="%, $, Customers"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Owner</label>
                <select
                  value={ownerId}
                  onChange={e => setOwnerId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
                >
                  Save Objective
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
