'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getCurrentUserRoleAction, getFeedbacksAction } from '@/app/actions';
import { SupportFeedback, UserRole } from '@/lib/types';
import { FeedbackForm } from '@/components/soporte/FeedbackForm';
import { UserFeedbackHistory } from '@/components/soporte/UserFeedbackHistory';
import { AdminFeedbackPanel } from '@/components/soporte/AdminFeedbackPanel';
import { 
  LifeBuoy, 
  Send, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw,
  User,
  Shield
} from 'lucide-react';

export default function SoportePage() {
  const [role, setRole] = useState<UserRole>('user');
  const [feedbacks, setFeedbacks] = useState<SupportFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'history' | 'admin'>('form');

  const loadData = useCallback(async () => {
    try {
      const [roleRes, feedbackRes] = await Promise.all([
        getCurrentUserRoleAction(),
        getFeedbacksAction(),
      ]);
      setRole(roleRes.role);
      setFeedbacks(feedbackRes.feedbacks);
    } catch (err) {
      console.error('Error loading soporte data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleFeedbackSubmitted = async () => {
    await loadData();
    setActiveTab('history');
  };

  const pendingCount = feedbacks.filter((f) => f.status === 'pending').length;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-pulse pb-16">
        <div className="h-10 bg-zinc-900 rounded-xl w-1/3" />
        <div className="h-28 bg-zinc-900 rounded-2xl" />
        <div className="h-96 bg-zinc-900 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-widest mb-1.5">
            <LifeBuoy className="w-4 h-4" /> Centro de Soporte & Feedback
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            ¿Cómo podemos mejorar tu experiencia?
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Tu opinión da forma a las próximas funcionalidades de Focus. Comparte sugerencias, mejoras o reportes.
          </p>
        </div>

        {/* User Role Badge & Refresh */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
              role === 'admin'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-zinc-800/80 border-white/10 text-zinc-300'
            }`}
          >
            {role === 'admin' ? (
              <>
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Rol: 👑 Administrador</span>
              </>
            ) : (
              <>
                <User className="w-3.5 h-3.5 text-zinc-400" />
                <span>Rol: Usuario</span>
              </>
            )}
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-[#141414] hover:bg-[#1f1f1f] text-zinc-400 hover:text-zinc-200 border border-white/5 rounded-full transition-colors disabled:opacity-50"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Segmented Tab Navigation */}
      <div className="flex p-1 bg-[#141414] border border-white/5 rounded-2xl max-w-xl">
        <button
          onClick={() => setActiveTab('form')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'form'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Enviar Feedback</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'history'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Mis Solicitudes</span>
          {feedbacks.length > 0 && (
            <span className="px-1.5 py-0.2 bg-white/10 text-zinc-300 rounded-full text-[10px] font-semibold">
              {feedbacks.length}
            </span>
          )}
        </button>

        {role === 'admin' && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'admin'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-amber-400/70 hover:text-amber-300'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Panel Admin</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-black font-bold rounded-full text-[10px]">
                {pendingCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Tab Contents */}
      <div>
        {activeTab === 'form' && (
          <div className="space-y-6">
            <div className="p-4 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-transparent border border-blue-500/10 rounded-2xl flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-zinc-200">
                  ¿Tenés una idea para Focus o encontraste un comportamiento raro?
                </p>
                <p className="text-zinc-400 leading-relaxed">
                  Completa el formulario a continuación indicando si es una sugerencia, mejora visual, duda o reporte de bug. Si tienes rol de Administrador, también puedes responder y cambiar estados de cada feedback en la pestaña correspondiente.
                </p>
              </div>
            </div>

            <FeedbackForm onSuccess={handleFeedbackSubmitted} />
          </div>
        )}

        {activeTab === 'history' && (
          <UserFeedbackHistory feedbacks={feedbacks} />
        )}

        {activeTab === 'admin' && role === 'admin' && (
          <AdminFeedbackPanel feedbacks={feedbacks} onRefresh={loadData} />
        )}
      </div>
    </div>
  );
}
