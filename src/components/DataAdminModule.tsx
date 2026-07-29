import React, { useState, useEffect } from 'react';
import { Database, Trash2, AlertTriangle, RefreshCw, CheckCircle2, ShieldAlert, KeyRound, Calendar, Layers } from 'lucide-react';
import { formatSpanishMonthName } from '../utils/dateParser';

interface DataAdminModuleProps {
  monthsAvailable?: { month: number; year: number; count: number }[];
  onDataCleared: () => void;
  isLoading: boolean;
  totalTickets: number;
}

export const DataAdminModule: React.FC<DataAdminModuleProps> = ({
  monthsAvailable = [],
  onDataCleared,
  isLoading: externalLoading,
  totalTickets
}) => {
  const [deleteType, setDeleteType] = useState<'month' | 'all'>('month');
  const [selectedMonth, setSelectedMonth] = useState<number>(4); // April default
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  
  const [confirmCode, setConfirmCode] = useState<string>('');
  const [userInputCode, setUserInputCode] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Generate a random 6-character code (A-Z, 0-9)
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous chars like 0, O, 1, I
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setConfirmCode(result);
    setUserInputCode('');
  };

  useEffect(() => {
    generateRandomCode();
  }, [deleteType, selectedMonth, selectedYear]);

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

  const yearsList = [2025, 2026, 2027, 2028, 2029];

  // Check if typed code matches generated code
  const isCodeValid = userInputCode.trim().toUpperCase() === confirmCode;

  // Handle execution of deletion
  const handleDelete = async () => {
    if (!isCodeValid) return;

    setIsDeleting(true);
    setAlertMessage(null);

    try {
      let url = '/api/tickets/reset';
      if (deleteType === 'month') {
        url += `?month=${selectedMonth}&year=${selectedYear}`;
      }

      const token = localStorage.getItem('fav_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      const res = await fetch(url, {
        method: 'DELETE',
        headers
      });

      const data = await res.json();

      if (data.success) {
        setAlertMessage({
          type: 'success',
          text: data.message || `Operación completada exitosamente. Se eliminaron ${data.deleted_count ?? 0} registros.`
        });
        generateRandomCode();
        onDataCleared();
      } else {
        setAlertMessage({
          type: 'error',
          text: data.message || 'Error al procesar la solicitud de eliminación.'
        });
      }
    } catch (err: any) {
      setAlertMessage({
        type: 'error',
        text: 'Error de red o servidor al intentar eliminar datos.'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Find record count for selected month/year if available
  const currentMonthData = monthsAvailable.find(
    (m) => m.month === selectedMonth && m.year === selectedYear
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Title Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Módulo de Administración y Depuración de Datos
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Gestión segura para eliminar estadísticas mensuales o realizar un vaciado completo de la base de datos SQLite.
            </p>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 flex items-center space-x-3 shrink-0">
          <Database className="w-5 h-5 text-blue-400" />
          <div>
            <span className="text-xs text-slate-400 block font-medium">Total en Base de Datos</span>
            <span className="text-base font-extrabold text-white">{totalTickets} tickets</span>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {alertMessage && (
        <div className={`p-4 rounded-xl border flex items-start space-x-3 ${
          alertMessage.type === 'success' 
            ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
            : 'bg-rose-950/40 border-rose-800 text-rose-200'
        }`}>
          {alertMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="text-sm font-medium">{alertMessage.text}</div>
        </div>
      )}

      {/* Main Admin Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        
        {/* Step 1: Select Scope */}
        <div>
          <label className="text-sm font-bold text-slate-200 uppercase tracking-wider block mb-3">
            1. Seleccione la Acción de Eliminación
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Option A: Delete specific month */}
            <div
              onClick={() => setDeleteType('month')}
              className={`p-5 rounded-xl border cursor-pointer transition-all ${
                deleteType === 'month'
                  ? 'bg-amber-950/20 border-amber-500/50 ring-2 ring-amber-500/30'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Calendar className={`w-5 h-5 ${deleteType === 'month' ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span className="font-bold text-white text-sm">Limpiar Estadísticas por Mes</span>
                </div>
                <input
                  type="radio"
                  name="deleteType"
                  checked={deleteType === 'month'}
                  onChange={() => setDeleteType('month')}
                  className="accent-amber-500 w-4 h-4"
                />
              </div>
              <p className="text-xs text-slate-400">
                Elimina únicamente los tickets registrados en un mes y año específicos. Ideal para actualizar reportes mensuales.
              </p>
            </div>

            {/* Option B: Delete ALL data */}
            <div
              onClick={() => setDeleteType('all')}
              className={`p-5 rounded-xl border cursor-pointer transition-all ${
                deleteType === 'all'
                  ? 'bg-rose-950/20 border-rose-500/50 ring-2 ring-rose-500/30'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Trash2 className={`w-5 h-5 ${deleteType === 'all' ? 'text-rose-400' : 'text-slate-400'}`} />
                  <span className="font-bold text-white text-sm">Vaciar Base de Datos Completa</span>
                </div>
                <input
                  type="radio"
                  name="deleteType"
                  checked={deleteType === 'all'}
                  onChange={() => setDeleteType('all')}
                  className="accent-rose-500 w-4 h-4"
                />
              </div>
              <p className="text-xs text-slate-400">
                Elimina permanentemente <strong>TODOS</strong> los tickets almacenados en la base de datos SQLite.
              </p>
            </div>

          </div>
        </div>

        {/* Step 2: Select Month and Year if deleteType === 'month' */}
        {deleteType === 'month' && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Seleccione el Mes y Año a Eliminar:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Mes:</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {monthsList.map((m) => (
                    <option key={m.num} value={m.num}>
                      {m.num}. {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Año:</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {yearsList.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-xs text-amber-300/90 bg-amber-950/30 border border-amber-800/40 rounded-lg p-3 flex items-center justify-between">
              <span>
                Objetivo seleccionado: <strong>{formatSpanishMonthName(selectedMonth)} {selectedYear}</strong>
              </span>
              {currentMonthData ? (
                <span className="font-bold text-amber-200 bg-amber-900/60 px-2.5 py-1 rounded-md">
                  {currentMonthData.count} tickets detectados
                </span>
              ) : (
                <span className="text-slate-400 italic">Sin datos registrados para este mes</span>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Security Code Confirmation Requirement */}
        <div className="border-t border-slate-800 pt-5 space-y-4">
          <label className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span>2. Confirmación de Seguridad Requerida</span>
          </label>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
            <p className="text-xs text-slate-300">
              Para evitar eliminaciones accidentales, reescriba el siguiente código de confirmación de <strong>6 caracteres aleatorios</strong>:
            </p>

            {/* Code display box */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <span className="text-xs text-slate-400 font-medium">Código Generado:</span>
                <span className="font-mono text-2xl font-extrabold tracking-widest text-amber-400 bg-amber-950/60 px-4 py-1.5 rounded-lg border border-amber-500/40 select-all">
                  {confirmCode}
                </span>
              </div>

              <button
                type="button"
                onClick={generateRandomCode}
                className="inline-flex items-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-all"
                title="Generar un nuevo código aleatorio"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Regenerar Código
              </button>
            </div>

            {/* Input field */}
            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1.5">
                Escriba el código de 6 caracteres exactamente igual:
              </label>
              <input
                type="text"
                value={userInputCode}
                onChange={(e) => setUserInputCode(e.target.value.toUpperCase())}
                placeholder="Ingrese los 6 caracteres aquí..."
                maxLength={6}
                className={`w-full bg-slate-900 border rounded-xl px-4 py-3 text-base font-mono font-bold tracking-widest text-white focus:outline-none transition-all ${
                  userInputCode.length === 0
                    ? 'border-slate-700 focus:border-blue-500'
                    : isCodeValid
                    ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                    : 'border-rose-500 ring-2 ring-rose-500/30'
                }`}
              />

              {/* Real-time status text */}
              <div className="mt-2 text-xs font-medium">
                {userInputCode.length === 0 ? (
                  <span className="text-slate-500">
                    Ingrese los 6 caracteres del código superior para habilitar el botón de eliminación.
                  </span>
                ) : isCodeValid ? (
                  <span className="text-emerald-400 flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Código verificado correctamente. Puede proceder.
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" /> El código ingresado no coincide con "{confirmCode}".
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            disabled={!isCodeValid || isDeleting || externalLoading}
            onClick={handleDelete}
            className={`inline-flex items-center px-6 py-3 rounded-xl font-bold text-sm text-white shadow-lg transition-all ${
              !isCodeValid || isDeleting || externalLoading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60 border border-slate-700'
                : deleteType === 'all'
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30 cursor-pointer'
                : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30 cursor-pointer'
            }`}
          >
            {isDeleting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Eliminando Registros...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                {deleteType === 'all'
                  ? 'Confirmar y Eliminar TODOS los Datos'
                  : `Confirmar y Eliminar Datos de ${formatSpanishMonthName(selectedMonth)} ${selectedYear}`}
              </>
            )}
          </button>
        </div>

      </div>

    </div>
  );
};
