'use client';

import React, { useState, useTransition } from 'react';
import { SupportFeedback, SupportFeedbackStatus, SupportFeedbackType } from '@/lib/types';
import { updateFeedbackStatusAction, deleteFeedbackAction } from '@/app/actions';
import { 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  MessageSquare, 
  Trash2, 
  Send, 
  Search,
  Sparkles,
  Bug,
  HelpCircle,
  Lightbulb,
  Star,
  User,
  ChevronDown,
  AlertCircle
} from 'lucide-react';

interface AdminFeedbackPanelProps {
  feedbacks: SupportFeedback[];
  onRefresh: () => void | Promise<void>;
}

const TYPE_CONFIG: Record<SupportFeedbackType, { label: string; icon: React.ReactNode; color: string }> = {
  suggestion: {
    label: 'Sugerencia',
    icon: <Lightbulb className="w-3.5 h-3.5" />,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  improvement: {
    label: 'Mejora UI/UX',
    icon: <Sparkles className="w-3.5 h-3.5" />,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  },
  bug: {
    label: 'Reporte de Bug',
    icon: <Bug className="w-3.5 h-3.5" />,
    color: 'text-red-400 bg-red-500/10 border-red-500/20',
  },
  question: {
    label: 'Duda / Soporte',
    icon: <HelpCircle className="w-3.5 h-3.5" />,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  },
  other: {
    label: 'Otro',
    icon: <MessageSquare className="w-3.5 h-3.5" />,
    color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
  },
};

const STATUS_CONFIG: Record<SupportFeedbackStatus, { label: string; color: string }> = {
  pending: {
    label: 'Pendiente',
    color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  },
  in_review: {
    label: 'En Revisión',
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  },
  resolved: {
    label: 'Resuelto',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  dismissed: {
    label: 'Descartado',
    color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
  },
};

export function AdminFeedbackPanel({ feedbacks, onRefresh }: AdminFeedbackPanelProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [responseInputs, setResponseInputs] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Metrics
  const totalTickets = feedbacks.length;
  const pendingTickets = feedbacks.filter((f) => f.status === 'pending').length;
  const inReviewTickets = feedbacks.filter((f) => f.status === 'in_review').length;
  const resolvedTickets = feedbacks.filter((f) => f.status === 'resolved').length;

  // Filtered feedbacks
  const filteredFeedbacks = feedbacks.filter((item) => {
    if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
    if (selectedType !== 'all' && item.type !== selectedType) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchEmail = (item.userEmail || '').toLowerCase().includes(q);
      const matchName = (item.userName || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchEmail && !matchName) return false;
    }
    return true;
  });

  const handleStatusChange = async (id: string, newStatus: SupportFeedbackStatus) => {
    startTransition(async () => {
      const res = await updateFeedbackStatusAction(id, newStatus, responseInputs[id] || undefined);
      if (res.success) {
        setFeedbackMessage('Estado actualizado correctamente');
        setTimeout(() => setFeedbackMessage(null), 3000);
        await onRefresh();
      }
    });
  };

  const handleSendResponse = async (id: string, currentStatus: SupportFeedbackStatus) => {
    const reply = responseInputs[id];
    if (!reply || !reply.trim()) return;

    startTransition(async () => {
      // If status was pending, auto transition to in_review
      const nextStatus = currentStatus === 'pending' ? 'in_review' : currentStatus;
      const res = await updateFeedbackStatusAction(id, nextStatus, reply.trim());
      if (res.success) {
        setFeedbackMessage('Respuesta enviada y registrada');
        setTimeout(() => setFeedbackMessage(null), 3000);
        await onRefresh();
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este feedback permanentemente?')) return;

    startTransition(async () => {
      const res = await deleteFeedbackAction(id);
      if (res.success) {
        setFeedbackMessage('Ticket eliminado');
        setTimeout(() => setFeedbackMessage(null), 3000);
        await onRefresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {feedbackMessage && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-medium text-center animate-in fade-in duration-200">
          {feedbackMessage}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 bg-[#141414]/90 border border-white/5 rounded-2xl flex flex-col">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total</span>
            <MessageSquare className="w-4 h-4 text-zinc-500" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">{totalTickets}</span>
          <span className="text-[11px] text-zinc-500 mt-1">Tickets recibidos</span>
        </div>

        <div className="p-4 bg-[#141414]/90 border border-yellow-500/10 rounded-2xl flex flex-col">
          <div className="flex items-center justify-between text-yellow-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Pendientes</span>
            <Clock className="w-4 h-4 text-yellow-500" />
          </div>
          <span className="text-2xl font-bold text-yellow-300 tracking-tight">{pendingTickets}</span>
          <span className="text-[11px] text-zinc-500 mt-1">Requieren atención</span>
        </div>

        <div className="p-4 bg-[#141414]/90 border border-blue-500/10 rounded-2xl flex flex-col">
          <div className="flex items-center justify-between text-blue-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">En Revisión</span>
            <AlertTriangle className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-2xl font-bold text-blue-300 tracking-tight">{inReviewTickets}</span>
          <span className="text-[11px] text-zinc-500 mt-1">En curso</span>
        </div>

        <div className="p-4 bg-[#141414]/90 border border-emerald-500/10 rounded-2xl flex flex-col">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Resueltos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-bold text-emerald-300 tracking-tight">{resolvedTickets}</span>
          <span className="text-[11px] text-zinc-500 mt-1">Completados</span>
        </div>
      </div>

      {/* Control bar: Filters & Search */}
      <div className="p-4 bg-[#141414]/80 border border-white/5 rounded-2xl flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por título, contenido o usuario..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1c1c1e] text-zinc-200 text-xs pl-9 pr-4 py-2.5 rounded-xl border border-white/5 focus:border-white/20 focus:outline-none placeholder-zinc-500 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Status filter */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="appearance-none bg-[#1c1c1e] text-zinc-300 text-xs pl-3 pr-8 py-2.5 rounded-xl border border-white/5 focus:border-white/20 focus:outline-none transition-colors cursor-pointer"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="in_review">En Revisión</option>
              <option value="resolved">Resueltos</option>
              <option value="dismissed">Descartados</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Type filter */}
          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="appearance-none bg-[#1c1c1e] text-zinc-300 text-xs pl-3 pr-8 py-2.5 rounded-xl border border-white/5 focus:border-white/20 focus:outline-none transition-colors cursor-pointer"
            >
              <option value="all">Todas las categorías</option>
              <option value="suggestion">Sugerencias</option>
              <option value="improvement">Mejoras</option>
              <option value="bug">Bugs</option>
              <option value="question">Dudas</option>
              <option value="other">Otros</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Tickets List */}
      {filteredFeedbacks.length === 0 ? (
        <div className="p-12 text-center bg-[#141414]/50 border border-white/5 rounded-2xl">
          <ShieldCheck className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-300 text-sm font-medium">No se encontraron tickets</p>
          <p className="text-zinc-500 text-xs mt-1">Prueba ajustando los filtros o el término de búsqueda.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFeedbacks.map((item) => {
            const typeConf = TYPE_CONFIG[item.type] || TYPE_CONFIG.suggestion;
            const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
            const createdFormatted = new Date(item.createdAt).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={item.id}
                className="p-5 bg-[#141414]/90 border border-white/5 rounded-2xl space-y-4 hover:border-white/10 transition-all shadow-sm"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${typeConf.color}`}>
                      {typeConf.icon}
                      {typeConf.label}
                    </span>

                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusConf.color}`}>
                      {statusConf.label}
                    </span>

                    {item.priority && (
                      <span className="text-[11px] text-zinc-500 uppercase tracking-wider px-2 py-0.5 bg-white/5 rounded-md">
                        Prioridad: {item.priority}
                      </span>
                    )}

                    {item.rating && item.rating > 0 && (
                      <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full text-amber-300 text-xs">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{item.rating}/5</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status updater dropdown */}
                    <div className="relative">
                      <select
                        disabled={isPending}
                        value={item.status}
                        onChange={(e) => handleStatusChange(item.id, e.target.value as SupportFeedbackStatus)}
                        className="appearance-none bg-[#1c1c1e] text-xs text-zinc-200 pl-3 pr-7 py-1.5 rounded-lg border border-white/10 hover:border-white/20 focus:outline-none transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <option value="pending">Marcar Pendiente</option>
                        <option value="in_review">Marcar En Revisión</option>
                        <option value="resolved">Marcar Resuelto</option>
                        <option value="dismissed">Marcar Descartado</option>
                      </select>
                      <ChevronDown className="w-3 h-3 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Eliminar ticket"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div>
                  <h4 className="text-sm font-semibold text-white tracking-tight">{item.title}</h4>
                  <p className="text-xs text-zinc-300 mt-1.5 whitespace-pre-wrap leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Meta info: User & Date */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-white/5 gap-2">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3 text-zinc-400" />
                    <span className="text-zinc-400 font-mono">{item.userName ? `${item.userName} (${item.userEmail})` : (item.userEmail || 'Usuario anónimo')}</span>
                  </div>
                  <span>Enviado el {createdFormatted}</span>
                </div>

                {/* Existing Admin Response */}
                {item.adminResponse && (
                  <div className="p-3.5 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-blue-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Respuesta Oficial del Administrador
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                      {item.adminResponse}
                    </p>
                  </div>
                )}

                {/* Admin reply textarea */}
                <div className="space-y-2 pt-1">
                  <label className="text-[11px] font-medium text-zinc-400">
                    {item.adminResponse ? 'Editar o añadir a la respuesta:' : 'Responder al usuario:'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Escribe una respuesta para el usuario..."
                      value={responseInputs[item.id] ?? (item.adminResponse || '')}
                      onChange={(e) =>
                        setResponseInputs((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      className="flex-1 bg-[#1c1c1e] text-zinc-200 text-xs px-3.5 py-2 rounded-xl border border-white/10 focus:border-blue-500/50 focus:outline-none placeholder-zinc-500 transition-colors"
                    />
                    <button
                      type="button"
                      disabled={isPending || !responseInputs[item.id]?.trim()}
                      onClick={() => handleSendResponse(item.id, item.status)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Responder
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminFeedbackPanel;
