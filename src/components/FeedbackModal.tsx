import React, { useState } from 'react';
import { 
  MessageSquare, 
  Star, 
  X, 
  Send, 
  CheckCircle2, 
  Smartphone, 
  ThumbsUp,
  Clock,
  Sparkles
} from 'lucide-react';
import { User, Language, EmployeeFeedback } from '../types';
import { db } from '../services/db';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  lang: Language;
}

const CATEGORIES: Array<EmployeeFeedback['category']> = [
  'Mobile Experience',
  'Navigation & Usability',
  'Attendance & Shifts',
  'Performance & Speed',
  'Feature Request',
  'Bug Report'
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  lang,
}) => {
  const [category, setCategory] = useState<EmployeeFeedback['category']>('Mobile Experience');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [viewTab, setViewTab] = useState<'submit' | 'history'>('submit');

  const allFeedbacks = db.getFeedbacks();
  const myFeedbacks = allFeedbacks.filter(f => f.userId === currentUser.id);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      db.submitFeedback({
        userId: currentUser.id,
        userName: currentUser.name,
        category,
        rating,
        message,
        deviceInfo: `${navigator.platform} • ${navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser'}`,
      });

      setIsSubmitting(false);
      setSubmittedSuccess(true);
      setMessage('');
      setTimeout(() => {
        setSubmittedSuccess(false);
        setViewTab('history');
      }, 1500);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Employee Feedback & Ideas</h3>
              <p className="text-xs text-slate-500">Help us continually optimize the mobile & web experience</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-100 px-5 pt-2 bg-white">
          <button
            onClick={() => setViewTab('submit')}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition ${
              viewTab === 'submit'
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Submit Feedback
          </button>
          <button
            onClick={() => setViewTab('history')}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition ${
              viewTab === 'history'
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            My Submitted Feedback ({myFeedbacks.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1">
          {viewTab === 'submit' ? (
            submittedSuccess ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-800">Thank you for your feedback!</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Your suggestions help us streamline daily employee workflows and interface speed.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Category Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Select Topic
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map(cat => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          category === cat
                            ? 'bg-rose-50 text-rose-700 border border-rose-300 shadow-2xs'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Star Rating */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Overall Experience Rating
                  </label>
                  <div className="flex items-center space-x-1.5">
                    {[1, 2, 3, 4, 5].map(star => {
                      const active = (hoverRating ?? rating) >= star;
                      return (
                        <button
                          type="button"
                          key={star}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(null)}
                          onClick={() => setRating(star)}
                          className="p-1 focus:outline-hidden transition transform hover:scale-110"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              active
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-200 fill-slate-100'
                            }`}
                          />
                        </button>
                      );
                    })}
                    <span className="text-xs font-medium text-slate-500 ml-2">
                      {rating === 5 ? 'Exceptional' : rating === 4 ? 'Great' : rating === 3 ? 'Average' : rating === 2 ? 'Needs Improvement' : 'Poor'}
                    </span>
                  </div>
                </div>

                {/* Message Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Your Feedback & Suggestions
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Tell us what could make your daily tasks faster, easier, or what features you'd like to see..."
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span>Submitting as: <strong className="text-slate-600">{currentUser.name}</strong></span>
                    <span className="flex items-center space-x-1">
                      <Smartphone className="w-3 h-3" />
                      <span>Mobile & Desktop Verified</span>
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !message.trim()}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50 transition"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'Submitting...' : 'Send Feedback to Administration'}</span>
                  </button>
                </div>
              </form>
            )
          ) : (
            /* History view */
            <div className="space-y-3">
              {myFeedbacks.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <ThumbsUp className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-medium">You haven't submitted any feedback yet.</p>
                </div>
              ) : (
                myFeedbacks.map(item => (
                  <div key={item.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= item.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
                            }`}
                          />
                        ))}
                        <span className="text-[11px] font-bold text-slate-700 ml-1.5">{item.category}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'Implemented'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'Reviewed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{item.message}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/40">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{item.createdAt}</span>
                      </span>
                      <span>{item.deviceInfo?.split('•')[0]}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
