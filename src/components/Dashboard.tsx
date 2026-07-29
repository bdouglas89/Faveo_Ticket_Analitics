import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, RadialBarChart, RadialBar
} from 'recharts';
import {
  Calendar, CheckCircle2, AlertTriangle, Clock, Layers, DollarSign,
  TrendingUp, Users, Building2, HelpCircle, FileText, ArrowUpRight
} from 'lucide-react';
import { StatsResponse, SpecialTicketsResponse } from '../types';
import { formatSpanishMonthName } from '../utils/dateParser';
import { SpecialTicketsList } from './SpecialTicketsList';

interface DashboardProps {
  stats: StatsResponse | null;
  specialData: SpecialTicketsResponse | null;
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  isLoading: boolean;
  onNavigateToSpecial: () => void;
}

const COLORS = {
  open: '#3b82f6', // blue-500
  closed: '#10b981', // emerald-500
  payment: '#f59e0b', // amber-500
  overdue: '#ef4444', // red-500
  uncompleted: '#eab308', // yellow-500
  deptColors: ['#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#6366f1']
};

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  specialData,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  isLoading,
  onNavigateToSpecial
}) => {
  const monthsList = [
    { num: 1, name: 'Enero' },
    { num: 2, name: 'Febrero' },
    { num: 3, name: 'Marzo' },
    { num: 4, name: 'Abril' },
    { num: 5, name: 'Mayo' },
    { num: 6, name: 'Junio' },
    { num: 7, name: 'Julio' },
    { num: 8, name: 'Agosto' },
    { num: 9, name: 'Septiembre' },
    { num: 10, name: 'Octubre' },
    { num: 11, name: 'Noviembre' },
    { num: 12, name: 'Diciembre' }
  ];

  const yearsList = [2024, 2025, 2026, 2027, 2028, 2029];

  if (isLoading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm">Cargando métricas de la base de datos SQLite...</p>
      </div>
    );
  }

  // Data formatting for charts
  const statusPieData = stats ? [
    { name: 'Abiertos', value: stats.open_tickets, color: COLORS.open },
    { name: 'Cerrados', value: stats.closed_tickets, color: COLORS.closed },
    { name: 'En Proceso Pago', value: stats.in_payment_tickets, color: COLORS.payment }
  ].filter(d => d.value > 0) : [];

  const complianceData = stats ? [
    { name: 'A Tiempo', value: stats.on_time_compliance.on_time, color: COLORS.closed },
    { name: 'Fuera de Plazo', value: stats.on_time_compliance.late, color: COLORS.overdue },
    { name: 'Sin Fecha Finalizada', value: stats.on_time_compliance.pending_no_date, color: COLORS.uncompleted }
  ].filter(d => d.value > 0) : [];

  const over2000Data = stats ? [
    { name: '> $2000 USD', value: stats.over_2000_tickets, color: '#8b5cf6' },
    { name: '≤ $2000 USD', value: stats.under_2000_tickets, color: '#38bdf8' }
  ].filter(d => d.value > 0) : [];

  // Compliance percentage
  const total = stats?.total_tickets || 1;
  const onTimePercentage = stats ? Math.round((stats.on_time_compliance.on_time / total) * 100) : 0;

  const hasData = stats && stats.total_tickets > 0;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Control Bar: Month & Year Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-slate-200 font-bold text-lg">
            <Calendar className="w-5 h-5 text-blue-400" />
            <h2>Visualización Dashboard Analítico</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Estadísticas filtradas para el mes de: <span className="text-blue-400 font-semibold">{formatSpanishMonthName(selectedMonth)} {selectedYear}</span> ({stats?.total_tickets || 0} tickets registrados)
          </p>
        </div>

        {/* Month and Year Filter Dropdowns */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <label className="text-xs font-semibold text-slate-400">Seleccionar Mes:</label>
            <select
              value={selectedMonth}
              onChange={(e) => onMonthChange(parseInt(e.target.value, 10))}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-1.5 text-xs text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
            >
              {monthsList.map((m) => (
                <option key={m.num} value={m.num}>
                  {m.num}. {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-xs font-semibold text-slate-400">Año:</label>
            <select
              value={selectedYear}
              onChange={(e) => onYearChange(parseInt(e.target.value, 10))}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-1.5 text-xs text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
            >
              {yearsList.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-4 max-w-2xl mx-auto my-8 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">No hay datos de tickets para {formatSpanishMonthName(selectedMonth)} {selectedYear}</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Seleccione otro mes en el selector superior o cargue un nuevo archivo Excel en la sección <strong className="text-slate-200">"Subir Excel"</strong>.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Key Performance Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Tickets */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Tickets</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white font-mono">{stats.total_tickets}</span>
            <span className="text-xs text-slate-400">registros</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2">
            En SQLite para {selectedMonth ? formatSpanishMonthName(selectedMonth) : 'el periodo'}
          </p>
        </div>

        {/* Card 2: Abiertos vs Cerrados */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Estado Tickets</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <span className="text-2xl font-extrabold text-emerald-400 font-mono">{stats.closed_tickets}</span>
              <span className="text-xs text-slate-400 ml-1">Cerrados</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold text-blue-400 font-mono">{stats.open_tickets}</span>
              <span className="text-xs text-slate-400 ml-1">Abiertos</span>
            </div>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden flex">
            <div style={{ width: `${(stats.closed_tickets / total) * 100}%` }} className="bg-emerald-500 h-full" />
            <div style={{ width: `${(stats.open_tickets / total) * 100}%` }} className="bg-blue-500 h-full" />
            <div style={{ width: `${(stats.in_payment_tickets / total) * 100}%` }} className="bg-amber-500 h-full" />
          </div>
        </div>

        {/* Card 3: Fuera de Plazo & Sin Finalizar */}
        <div
          onClick={onNavigateToSpecial}
          className="bg-slate-900 border border-amber-500/30 hover:border-amber-500/60 transition-all cursor-pointer rounded-2xl p-5 shadow-lg relative overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Incumplimiento & Sin Fecha</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <span className="text-2xl font-extrabold text-rose-400 font-mono">{stats.overdue_tickets}</span>
              <span className="text-xs text-rose-300 block">Fuera de Plazo</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold text-amber-400 font-mono">{stats.uncompleted_tickets}</span>
              <span className="text-xs text-amber-300 block">Sin Finalizar</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-amber-400 font-medium">
            <span>Ver detalle de tickets</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card 4: Compras > $2000 USD */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Compras &gt; $2000 USD</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-indigo-300 font-mono">{stats.over_2000_tickets}</span>
            <span className="text-xs text-slate-400">tickets</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2">
            Representan el {Math.round((stats.over_2000_tickets / total) * 100)}% de los requerimientos
          </p>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* CHART 1: Tickets por Departamento (Requerimiento explícito) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              <h3 className="text-base font-bold text-white">Cantidad de Tickets por Departamento</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono bg-slate-950 px-2 py-1 rounded">Gráfico de Barras</span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.by_department} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                <XAxis
                  dataKey="department"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
                  cursor={{ fill: 'rgba(51, 65, 85, 0.3)' }}
                />
                <Bar dataKey="count" name="Total Tickets" radius={[8, 8, 0, 0]}>
                  {stats.by_department.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS.deptColors[index % COLORS.deptColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Cantidad de Tickets Cerrados vs Abiertos (Requerimiento explícito) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Distribución por Estado (Abiertos vs Cerrados)</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono bg-slate-950 px-2 py-1 rounded">Gráfico Circular</span>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-status-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 3: Control de Cumplimiento Oportuno (Plazos) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">Cumplimiento de Fecha Límite de Compra</h3>
            </div>
            <span className="text-xs text-amber-400 font-mono bg-amber-950/40 px-2 py-1 rounded border border-amber-800/40">Control de SLA</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={complianceData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, value }) => `${name} (${value})`}
                >
                  {complianceData.map((entry, index) => (
                    <Cell key={`cell-comp-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 4: Tickets por Tipo de Solicitud (Sugerencia Pertinente 1) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Tickets por Tipo de Solicitud</h3>
            </div>
            <span className="text-xs text-indigo-400 font-mono bg-indigo-950/40 px-2 py-1 rounded">Sugerido</span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={stats.by_type} margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <XAxis type="number" stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                <YAxis dataKey="type" type="category" stroke="#94a3b8" fontSize={10} width={130} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
                />
                <Bar dataKey="count" name="Cantidad" fill="#6366f1" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
        </div>
      )}

      {/* Control de Plazos y Pendientes (Auditoría de Fechas y SLAs) */}
      <div className="pt-2">
        <SpecialTicketsList
          specialData={specialData}
          isLoading={isLoading}
        />
      </div>

    </div>
  );
};
