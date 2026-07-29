import React, { useState } from 'react';
import {
  AlertTriangle, CalendarX, Search, Filter,
  CheckCircle, User, Building, ChevronRight, X, Download, ShieldAlert, Eye
} from 'lucide-react';
import { Ticket, SpecialTicketsResponse } from '../types';
import { formatDateToDDMMYYYY } from '../utils/dateParser';
import * as xlsx from 'xlsx';

interface SpecialTicketsListProps {
  specialData: SpecialTicketsResponse | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const SpecialTicketsList: React.FC<SpecialTicketsListProps> = ({
  specialData,
  isLoading = false
}) => {
  const [filterType, setFilterType] = useState<'all' | 'overdue' | 'uncompleted'>('overdue');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const overdueTickets = specialData?.overdue_tickets || [];
  const uncompletedTickets = specialData?.uncompleted_tickets || [];

  let displayedTickets: Ticket[] = [];
  if (filterType === 'overdue') {
    displayedTickets = overdueTickets;
  } else if (filterType === 'uncompleted') {
    displayedTickets = uncompletedTickets;
  } else {
    // deduplicate by ticket_number
    const map = new Map<string, Ticket>();
    overdueTickets.forEach(t => map.set(t.ticket_number, t));
    uncompletedTickets.forEach(t => map.set(t.ticket_number, t));
    displayedTickets = Array.from(map.values());
  }

  // Filter by search term
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    displayedTickets = displayedTickets.filter(
      (t) =>
        t.ticket_number.toLowerCase().includes(term) ||
        t.subject.toLowerCase().includes(term) ||
        t.department.toLowerCase().includes(term) ||
        t.owner.toLowerCase().includes(term) ||
        t.assigned_agent.toLowerCase().includes(term)
    );
  }

  const exportSpecialToExcel = () => {
    if (displayedTickets.length === 0) return;
    const exportData = displayedTickets.map(t => ({
      "Ticket Number": t.ticket_number,
      "Asunto": t.subject,
      "Estado": t.status,
      "Departamento": t.department,
      "Tipo": t.type,
      "Agente Asignado": t.assigned_agent,
      "Creado El": formatDateToDDMMYYYY(t.created_at),
      "Fecha Límite": t.deadline_date ? formatDateToDDMMYYYY(t.deadline_date) : "Sin Fecha",
      "Fecha Finalizada": t.finished_date ? formatDateToDDMMYYYY(t.finished_date) : "NO FINALIZADO",
      "Fecha Pend. Verificación": t.pending_verification_date ? formatDateToDDMMYYYY(t.pending_verification_date) : "N/A",
      "Fecha de Cierre": t.closed_at ? formatDateToDDMMYYYY(t.closed_at) : "Sin Fecha Cierre",
      "Categoría": t.finished_date ? "Entregado Fuera de Plazo" : "Sin Fecha Finalizada"
    }));

    const worksheet = xlsx.utils.json_to_sheet(exportData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Control_Plazos_Pendientes");
    xlsx.writeFile(workbook, `Reporte_Control_Plazos_${filterType}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">

      {/* Title Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Auditoría de SLAs y Fechas de Entrega</span>
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">
            Control de Plazos y Tickets Pendientes
          </h3>
          <p className="text-xs text-slate-400">
            Muestra requerimientos cuya fecha finalizada superó la fecha límite o compras pendientes sin fecha de cierre.
          </p>
        </div>

        <button
          onClick={exportSpecialToExcel}
          disabled={displayedTickets.length === 0}
          className="inline-flex items-center justify-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 mr-2" />
          Exportar Excel ({displayedTickets.length})
        </button>
      </div>

      {/* Navigation Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800">
        <div className="flex space-x-1.5 overflow-x-auto">
          <button
            onClick={() => setFilterType('overdue')}
            className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filterType === 'overdue'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-300" />
            <span>Fuera de Plazo</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-950 text-rose-200 font-mono">
              {overdueTickets.length}
            </span>
          </button>

          <button
            onClick={() => setFilterType('uncompleted')}
            className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filterType === 'uncompleted'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
          >
            <CalendarX className="w-3.5 h-3.5 text-amber-300" />
            <span>Sin Fecha Final</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-950 text-amber-200 font-mono">
              {uncompletedTickets.length}
            </span>
          </button>

          <button
            onClick={() => setFilterType('all')}
            className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filterType === 'all'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Todos</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-200 font-mono">
              {overdueTickets.length + uncompletedTickets.length}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por ticket, asunto, agente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
          />
        </div>
      </div>

      {/* COMPACT TABLE VIEW */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          Cargando tickets de control de plazos...
        </div>
      ) : displayedTickets.length === 0 ? (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center space-y-2">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
          <h4 className="text-sm font-bold text-white">Sin tickets en esta categoría para este periodo</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Todos los tickets cumplen con sus fechas límite o no coinciden con los términos de búsqueda.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Ticket</th>
                <th className="py-3 px-3">Categoría / Indicador</th>
                <th className="py-3 px-3 min-w-[180px]">Asunto</th>
                <th className="py-3 px-3">Departamento / Agente</th>
                <th className="py-3 px-3">Estado</th>
                <th className="py-3 px-3 text-center">Fecha Límite</th>
                <th className="py-3 px-3 text-center">Fecha Finalizada</th>
                <th className="py-3 px-3 text-center">Fecha Pend. Verificación</th>
                <th className="py-3 px-3 text-center">Fecha de Cierre</th>
                <th className="py-3 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {displayedTickets.map((ticket) => {
                const isOverdue = ticket.is_overdue || (ticket.finished_date && ticket.deadline_date && ticket.finished_date > ticket.deadline_date);

                return (
                  <tr
                    key={ticket.ticket_number}
                    className="hover:bg-slate-900/80 transition-colors group"
                  >
                    {/* Ticket Number */}
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-400 whitespace-nowrap">
                      {ticket.ticket_number}
                    </td>

                    {/* Indicator Badge */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                          isOverdue
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {isOverdue ? '⚠️ Entregado Tarde' : '⏳ Sin Fecha Final'}
                      </span>
                    </td>

                    {/* Subject */}
                    <td className="py-2.5 px-3 text-slate-100 font-medium max-w-xs truncate" title={ticket.subject}>
                      {ticket.subject}
                    </td>

                    {/* Department & Agent */}
                    <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                      <div className="font-semibold text-slate-200">{ticket.department}</div>
                      <div className="text-[11px] text-slate-400">Agente: {ticket.assigned_agent}</div>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="text-slate-300 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-[11px]">
                        {ticket.status}
                      </span>
                    </td>

                    {/* Deadline Date */}
                    <td className="py-2.5 px-3 text-center font-mono text-amber-300 font-semibold whitespace-nowrap">
                      {ticket.deadline_date ? formatDateToDDMMYYYY(ticket.deadline_date) : 'Sin Fecha'}
                    </td>

                    {/* Finished Date */}
                    <td className="py-2.5 px-3 text-center font-mono whitespace-nowrap">
                      {isOverdue ? (
                        <span className="text-rose-400 font-bold underline">
                          {formatDateToDDMMYYYY(ticket.finished_date)}
                        </span>
                      ) : (
                        <span className="text-amber-400/80 italic text-[11px]">
                          NO FINALIZADO
                        </span>
                      )}
                    </td>

                    {/* Pending Verification Date */}
                    <td className="py-2.5 px-3 text-center font-mono text-slate-300 text-[11px] whitespace-nowrap">
                      {ticket.pending_verification_date ? (
                        <span>{formatDateToDDMMYYYY(ticket.pending_verification_date)}</span>
                      ) : (
                        <span className="text-slate-500 italic">N/A</span>
                      )}
                    </td>

                    {/* Closed At Date */}
                    <td className="py-2.5 px-3 text-center font-mono text-slate-300 text-[11px] whitespace-nowrap">
                      {ticket.closed_at ? (
                        <span>{formatDateToDDMMYYYY(ticket.closed_at)}</span>
                      ) : (
                        <span className="text-slate-500 italic">Sin Cierre</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedTicket(ticket)}
                        className="inline-flex items-center px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white rounded-lg text-xs font-semibold transition-all border border-slate-700 cursor-pointer"
                        title="Ver detalle completo"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Ticket Full Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-fade-in relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedTicket(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950 px-2.5 py-1 rounded border border-blue-800/40">
                {selectedTicket.ticket_number}
              </span>
              <h3 className="text-lg font-bold text-white pt-2">{selectedTicket.subject}</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400 block">Departamento:</span>
                <span className="text-slate-200 font-semibold">{selectedTicket.department}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Estado:</span>
                <span className="text-blue-400 font-semibold">{selectedTicket.status}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Tipo:</span>
                <span className="text-slate-200 font-semibold">{selectedTicket.type}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Compra &gt; $2000 USD:</span>
                <span className="text-slate-200 font-semibold">{selectedTicket.is_purchase_over_2000}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Propietario:</span>
                <span className="text-slate-200 font-semibold">{selectedTicket.owner}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Agente Asignado:</span>
                <span className="text-slate-200 font-semibold">{selectedTicket.assigned_agent}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold uppercase text-amber-400 tracking-wider">Historial de Fechas Auditadas</h4>
              <div className="space-y-1.5 text-xs font-mono bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-400">Created At:</span>
                  <span className="text-slate-200">{formatDateToDDMMYYYY(selectedTicket.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Fecha Límite para realizar la compra:</span>
                  <span className="text-amber-300 font-bold">{selectedTicket.deadline_date ? formatDateToDDMMYYYY(selectedTicket.deadline_date) : 'Sin Fecha'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">fecha_finalizada:</span>
                  <span className={selectedTicket.finished_date ? "text-rose-400 font-bold" : "text-amber-400 italic"}>
                    {selectedTicket.finished_date ? formatDateToDDMMYYYY(selectedTicket.finished_date) : "NO REGISTRADA (PENDIENTE)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">fecha_pendiente_verificacion:</span>
                  <span className="text-slate-300">{selectedTicket.pending_verification_date ? formatDateToDDMMYYYY(selectedTicket.pending_verification_date) : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Closed At:</span>
                  <span className="text-slate-300">{selectedTicket.closed_at ? formatDateToDDMMYYYY(selectedTicket.closed_at) : 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
