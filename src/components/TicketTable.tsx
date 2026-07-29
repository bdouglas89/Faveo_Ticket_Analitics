import React, { useState } from 'react';
import { Search, Filter, Download, ArrowUpDown, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { Ticket } from '../types';
import { formatDateToDDMMYYYY } from '../utils/dateParser';
import * as xlsx from 'xlsx';

interface TicketTableProps {
  tickets: Ticket[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const TicketTable: React.FC<TicketTableProps> = ({ tickets, isLoading, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Distinct departments & statuses for filters
  const departments = Array.from(new Set(tickets.map((t) => t.department))).filter(Boolean);
  const statuses = Array.from(new Set(tickets.map((t) => t.status))).filter(Boolean);

  // Filtered dataset
  const filtered = tickets.filter((t) => {
    const matchesSearch =
      !searchTerm.trim() ||
      t.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.assigned_agent.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = departmentFilter === 'ALL' || t.department === departmentFilter;
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedTickets = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportAllToExcel = () => {
    if (filtered.length === 0) return;
    const exportData = filtered.map(t => ({
      "Ticket Number": t.ticket_number,
      "Asunto": t.subject,
      "Estado": t.status,
      "Departamento": t.department,
      "Tipo": t.type,
      "Agente Asignado": t.assigned_agent,
      "Compra > $2000": t.is_purchase_over_2000,
      "Created At": formatDateToDDMMYYYY(t.created_at),
      "Fecha Límite": t.deadline_date ? formatDateToDDMMYYYY(t.deadline_date) : "Sin Fecha",
      "Fecha Finalizada": t.finished_date ? formatDateToDDMMYYYY(t.finished_date) : "NO FINALIZADO",
      "Fecha Pend. Verificación": t.pending_verification_date ? formatDateToDDMMYYYY(t.pending_verification_date) : "N/A",
      "Fecha de Cierre": t.closed_at ? formatDateToDDMMYYYY(t.closed_at) : "Sin Fecha Cierre"
    }));
    const worksheet = xlsx.utils.json_to_sheet(exportData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Todos_Los_Tickets");
    xlsx.writeFile(workbook, `Tickets_SQLite_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      
      {/* Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por ticket, asunto..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => {
              setDepartmentFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">🏢 Todos los Departamentos</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">📌 Todos los Estados</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Items Per Page Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <span className="text-slate-400 font-medium">Mostrar:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-transparent font-bold text-white focus:outline-none cursor-pointer"
            >
              <option value={10} className="bg-slate-900 text-white">10 filas</option>
              <option value={50} className="bg-slate-900 text-white">50 filas</option>
              <option value={100} className="bg-slate-900 text-white">100 filas</option>
            </select>
          </div>
        </div>

        <button
          onClick={exportAllToExcel}
          disabled={filtered.length === 0}
          className="inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold shadow-md transition-all disabled:opacity-50 whitespace-nowrap self-start md:self-center"
        >
          <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
          Exportar a Excel ({filtered.length})
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-300 font-semibold border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">Asunto</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Departamento</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Agente Asignado</th>
                <th className="px-4 py-3">&gt; $2000</th>
                <th className="px-4 py-3">Created At</th>
                <th className="px-4 py-3">Fecha Límite</th>
                <th className="px-4 py-3">fecha_finalizada</th>
                <th className="px-4 py-3">Fecha Pend. Verificación</th>
                <th className="px-4 py-3">Fecha de Cierre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {paginatedTickets.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-slate-500 italic">
                    No hay tickets almacenados en la base de datos SQLite.
                  </td>
                </tr>
              ) : (
                paginatedTickets.map((t) => {
                  const isOverdue = t.is_overdue || (t.finished_date && t.deadline_date && t.finished_date > t.deadline_date);
                  const isUncompleted = !t.finished_date || t.finished_date.trim() === '';

                  return (
                    <tr key={t.ticket_number} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-blue-400 font-bold">{t.ticket_number}</td>
                      <td className="px-4 py-3 text-white font-medium max-w-xs truncate" title={t.subject}>
                        {t.subject}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          t.status === 'Cerrado'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                            : t.status === 'Abierto'
                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{t.department}</td>
                      <td className="px-4 py-3 text-slate-400">{t.type}</td>
                      <td className="px-4 py-3">{t.assigned_agent}</td>
                      <td className="px-4 py-3 font-mono font-bold">
                        {t.is_purchase_over_2000 === 'Si' || t.is_purchase_over_2000 === 'SI' ? (
                          <span className="text-indigo-400">Sí</span>
                        ) : (
                          <span className="text-slate-500">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400">{formatDateToDDMMYYYY(t.created_at)}</td>
                      <td className="px-4 py-3 font-mono text-amber-300">{t.deadline_date ? formatDateToDDMMYYYY(t.deadline_date) : 'Sin Fecha'}</td>
                      <td className="px-4 py-3 font-mono font-semibold">
                        {t.finished_date ? (
                          <span className={isOverdue ? 'text-rose-400 underline font-bold' : 'text-emerald-400'}>
                            {formatDateToDDMMYYYY(t.finished_date)}
                          </span>
                        ) : (
                          <span className="text-amber-400/80 italic">Pendiente</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400">
                        {t.pending_verification_date ? (
                          <span>{formatDateToDDMMYYYY(t.pending_verification_date)}</span>
                        ) : (
                          <span className="text-slate-500 italic">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400">
                        {t.closed_at ? (
                          <span>{formatDateToDDMMYYYY(t.closed_at)}</span>
                        ) : (
                          <span className="text-slate-500 italic">Sin Cierre</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              Mostrando página <strong className="text-white">{currentPage}</strong> de <strong className="text-white">{totalPages}</strong> ({filtered.length} tickets en total)
            </span>
            <div className="flex items-center space-x-1.5 ml-2 border-l border-slate-800 pl-3">
              <span className="text-slate-400">Por página:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
