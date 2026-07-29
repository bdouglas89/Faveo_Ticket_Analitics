import React, { useState, useEffect, useRef } from 'react';
import { Database, Trash2, AlertTriangle, RefreshCw, CheckCircle2, ShieldAlert, KeyRound, Calendar, Layers, Download, UploadCloud, HardDrive, FileUp, X } from 'lucide-react';
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
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [selectedDbFile, setSelectedDbFile] = useState<File | null>(null);
  const [showConfirmImportModal, setShowConfirmImportModal] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Handle DB Export (Download)
  const handleDownloadDb = async () => {
    setIsDownloading(true);
    setAlertMessage(null);
    try {
      const token = localStorage.getItem('fav_token');
      const res = await fetch('/api/db/export', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Error al descargar la base de datos.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `faveo_tickets_backup_${new Date().toISOString().slice(0, 10)}.db`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setAlertMessage({
        type: 'success',
        text: 'Copia de seguridad de la base de datos (.db) descargada correctamente.'
      });
    } catch (err: any) {
      setAlertMessage({
        type: 'error',
        text: err.message || 'Error de conexión al exportar la base de datos.'
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle DB Import Trigger
  const handleImportDbTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDbFile) {
      setAlertMessage({
        type: 'error',
        text: 'Por favor, seleccione un archivo de base de datos (.db) antes de restaurar.'
      });
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
      return;
    }

    // Open in-app React modal for confirmation (avoids iframe confirm() issues)
    setShowConfirmImportModal(true);
  };

  // Perform actual DB restore
  const confirmExecuteImport = async () => {
    if (!selectedDbFile) return;

    setShowConfirmImportModal(false);
    setIsImporting(true);
    setAlertMessage(null);

    try {
      const formData = new FormData();
      formData.append('db_file', selectedDbFile);

      const token = localStorage.getItem('fav_token');
      const res = await fetch('/api/db/import', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });

      const data = await res.json();

      if (data.success) {
        setAlertMessage({
          type: 'success',
          text: data.message || 'Base de datos restaurada e importada correctamente.'
        });
        setSelectedDbFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        onDataCleared();
      } else {
        throw new Error(data.message || 'Error al importar la base de datos.');
      }
    } catch (err: any) {
      setAlertMessage({
        type: 'error',
        text: err.message || 'Error de conexión al importar la base de datos.'
      });
    } finally {
      setIsImporting(false);
    }
  };

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

      {/* Backup and Restore Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Copia de Seguridad e Importación de Base de Datos
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Descargue una copia completa de su base de datos SQLite (.db) o restaure un archivo de respaldo guardado previamente.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Export / Download DB */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center space-x-2 text-blue-400 font-bold text-sm mb-2">
                <Download className="w-4 h-4" />
                <span>Exportar y Descargar Base de Datos</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Genera un archivo ejecutable SQLite con <strong>todos los tickets, métricas y usuarios</strong>. Guarde este archivo en su equipo como respaldo antes de realizar cambios significativos.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadDb}
              disabled={isDownloading || externalLoading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {isDownloading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generando descarga...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Descargar Base de Datos (.db)</span>
                </>
              )}
            </button>
          </div>

          {/* Card 2: Import / Restore DB */}
          <form onSubmit={handleImportDbTrigger} className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center space-x-2 text-purple-400 font-bold text-sm mb-2">
                <UploadCloud className="w-4 h-4" />
                <span>Importar y Restaurar Base de Datos</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                Seleccione un archivo de base de datos SQLite (<strong>.db</strong>) respaldado anteriormente para reemplazar el estado del sistema.
              </p>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".db,.sqlite,.sqlite3"
                  onChange={(e) => setSelectedDbFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-950/80 file:text-purple-300 hover:file:bg-purple-900 cursor-pointer"
                />
                {selectedDbFile && (
                  <div className="mt-2 text-[11px] text-amber-300 bg-amber-950/40 border border-amber-900/50 rounded-lg p-2 flex items-center justify-between">
                    <div className="flex items-center space-x-2 truncate">
                      <FileUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">Listo: <strong>{selectedDbFile.name}</strong> ({(selectedDbFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDbFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-slate-400 hover:text-white ml-2 p-1"
                      title="Quitar archivo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isImporting || externalLoading}
              className={`w-full py-2.5 px-4 font-semibold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                selectedDbFile
                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Restaurando Base de Datos...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>{selectedDbFile ? 'Importar y Restaurar Base de Datos' : 'Seleccionar o Cargar Archivo .db'}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

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

      {/* Modal: Confirm DB Import / Restore */}
      {showConfirmImportModal && selectedDbFile && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-white space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Confirmar Restauración de Base de Datos
                </h3>
                <p className="text-xs text-slate-400">
                  Esta acción es irreversible y reemplazará la información activa.
                </p>
              </div>
            </div>

            <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl p-3.5 space-y-2 text-xs text-amber-200">
              <p className="font-semibold flex items-center gap-1.5 text-amber-400">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>¡ATENCIÓN! REEMPLAZO DE DATOS</span>
              </p>
              <p className="text-slate-300 leading-relaxed">
                Al continuar, se <strong>sobrescribirán y reemplazarán</strong> todos los tickets, configuraciones y usuarios actuales del sistema por los contenidos en el archivo:
              </p>
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 font-mono text-[11px] text-purple-300 break-all">
                📄 {selectedDbFile.name} ({(selectedDbFile.size / 1024).toFixed(1)} KB)
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmImportModal(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmExecuteImport}
                disabled={isImporting}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-600/30 cursor-pointer flex items-center space-x-2 transition-all"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Restaurando...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Sí, Restaurar Base de Datos</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
