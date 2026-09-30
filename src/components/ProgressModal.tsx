import React, { useState } from 'react';
import { X, TrendingUp, AlertCircle, History, Check } from 'lucide-react';
import { ActionPlan, Activity, Language, User } from '../types';
import { translations } from '../services/i18n';
import { db } from '../services/db';

interface ProgressModalProps {
  entityType: 'action_plan' | 'activity';
  item: ActionPlan | Activity;
  currentUser: User;
  lang: Language;
  onClose: () => void;
  onSuccess: () => void;
}

export const ProgressModal: React.FC<ProgressModalProps> = ({
  entityType,
  item,
  currentUser,
  lang,
  onClose,
  onSuccess,
}) => {
  const t = translations[lang];
  const initialPct = entityType === 'action_plan' 
    ? (item as ActionPlan).completionPercentage 
    : (item as Activity).progressPercentage;

  const [newPercentage, setNewPercentage] = useState<number>(initialPct);
  const [description, setDescription] = useState<string>('');
  const [error, setError] = useState<string>('');

  const history = db.getProgressUpdates(item.id);
  const users = db.getUsers();

  const handleQuickComplete = () => {
    try {
      const defaultDesc = lang === 'km' 
        ? 'បានបញ្ចប់ និងផ្ទៀងផ្ទាត់រួចរាល់' 
        : 'Completed and verified';

      db.addProgressUpdate({
        entityType,
        entityId: item.id,
        previousPercentage: initialPct,
        newPercentage: 100,
        description: description.trim() || defaultDesc,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || (lang === 'km' ? 'មិនអាចបញ្ចប់បានទេ។' : 'Failed to complete.'));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalDescription = description.trim() || (
      newPercentage === 100 
        ? (lang === 'km' ? 'បានបញ្ចប់ និងផ្ទៀងផ្ទាត់រួចរាល់' : 'Completed and verified')
        : (lang === 'km' ? `បានធ្វើបច្ចុប្បន្នភាពវឌ្ឍនភាពទៅ ${newPercentage}%` : `Updated progress to ${newPercentage}%`)
    );

    try {
      db.addProgressUpdate({
        entityType,
        entityId: item.id,
        previousPercentage: initialPct,
        newPercentage: Number(newPercentage),
        description: finalDescription,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || (lang === 'km' ? 'មិនអាចកត់ត្រាវឌ្ឍនភាពបានទេ។' : 'Failed to record progress update.'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {t.updateProgress}
              </h3>
              <p className="text-xs text-slate-500">
                {'planNumber' in item ? item.planNumber : item.code}: {item.title}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form id="progress-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Quick Complete Banner */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-900">
                  <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                  <span>{lang === 'km' ? 'បញ្ចប់កិច្ចការភ្លាមៗ' : 'Quick Complete in 1 Click'}</span>
                </div>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  {lang === 'km' 
                    ? 'កំណត់វឌ្ឍនភាព ១០០% និងសម្គាល់ថាបានបញ្ចប់ដោយមិនបាច់បំពេញព័ត៌មានបន្ថែម។' 
                    : 'Set progress to 100% and finish instantly without typing any extra fields.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleQuickComplete}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition shrink-0 flex items-center space-x-1"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>{lang === 'km' ? 'បញ្ចប់ ១០០%' : '100% Complete'}</span>
              </button>
            </div>

            {/* Slider / Percentage */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-800">
                  {t.completionPct}: <span className="text-blue-600 font-mono text-sm font-bold">{newPercentage}%</span>
                </label>
                <span className="text-[11px] text-slate-500">
                  {lang === 'km' ? `មុន៖ ${initialPct}%` : `Previous: ${initialPct}%`}
                </span>
              </div>
              <input 
                type="range"
                min="0"
                max="100"
                step="5"
                value={newPercentage}
                onChange={e => setNewPercentage(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
              />
              
              {/* Quick Percentage Preset Buttons */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">
                  {lang === 'km' ? 'កម្រិតរហ័ស៖' : 'Presets:'}
                </span>
                {[25, 50, 75, 100].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setNewPercentage(val)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                      newPercentage === val 
                        ? 'bg-blue-600 text-white shadow-2xs' 
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {val === 100 ? (lang === 'km' ? '✓ ១០០% (បញ្ចប់)' : '✓ 100% (Done)') : `${val}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* Single Optional Note - All other unnecessary fills removed */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  {lang === 'km' ? 'កំណត់ចំណាំវឌ្ឍនភាព (ស្រេចចិត្ត)' : 'Progress Note (Optional)'}
                </label>
                <span className="text-[10px] text-slate-400">
                  {lang === 'km' ? 'អាចទុកទទេរបាន' : 'Leave blank for auto-summary'}
                </span>
              </div>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={
                  newPercentage === 100
                    ? (lang === 'km' ? 'ឧ. បានបញ្ចប់កិច្ចការ និងបញ្ជាក់លទ្ធផលរួចរាល់' : 'e.g. Completed all deliverables and verified output')
                    : (lang === 'km' ? 'ឧ. បានបញ្ចប់ដំណាក់កាលទី ១ បន្តជំហានបន្ទាប់' : 'e.g. Finished milestone phase, continuing to next steps')
                }
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </form>

          {/* Historical Log */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center space-x-1.5 mb-3 text-xs font-bold text-slate-800">
              <History className="w-4 h-4 text-slate-500" />
              <span>
                {lang === 'km' ? `${t.progressHistory} (${history.length} កំណត់ត្រា)` : `${t.progressHistory} (${history.length} logged entries)`}
              </span>
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                {lang === 'km' ? 'មិនទាន់មានកំណត់ត្រាវឌ្ឍនភាពកន្លងមកទេ។' : 'No historical updates recorded yet.'}
              </p>
            ) : (
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {history.map(item => {
                  const author = users.find(u => u.id === item.updatedById);
                  return (
                    <div key={item.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1">
                        <span className="font-semibold text-slate-700">{author?.name || (lang === 'km' ? 'បុគ្គលិក' : 'Staff')}</span>
                        <span>{new Date(item.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center space-x-2 mb-1.5">
                        <span className="font-bold text-blue-700 font-mono">{item.previousPercentage}% &rarr; {item.newPercentage}%</span>
                        {item.actualKpiResult && (
                          <span className="text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            KPI: {item.actualKpiResult}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-700 font-medium">{item.description}</p>
                      {item.completedWork && (
                        <p className="text-slate-600 text-[11px] mt-1"><span className="font-semibold">{lang === 'km' ? 'ការងារ៖' : 'Work:'}</span> {item.completedWork}</p>
                      )}
                      {item.problemsObstacles && (
                        <p className="text-amber-700 text-[11px] mt-0.5"><span className="font-semibold">{lang === 'km' ? 'ឧបសគ្គ៖' : 'Obstacles:'}</span> {item.problemsObstacles}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between space-x-2 rounded-b-2xl">
          <div>
            {newPercentage !== 100 && (
              <button
                type="button"
                onClick={handleQuickComplete}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 transition flex items-center space-x-1"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>{lang === 'km' ? 'បញ្ចប់ ១០០% ភ្លាមៗ' : 'Instant 100% Complete'}</span>
              </button>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
            >
              {t.cancel}
            </button>
            <button
              form="progress-form"
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition flex items-center space-x-1"
            >
              <span>{lang === 'km' ? 'រក្សាទុកវឌ្ឍនភាព' : `${t.save} Progress`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
