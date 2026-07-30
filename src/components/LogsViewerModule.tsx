import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Terminal, 
  Search, 
  Download, 
  Trash2, 
  RefreshCw, 
  AlertOctagon, 
  AlertTriangle, 
  Info, 
  Copy, 
  Bug, 
  Shield, 
  CheckCircle2, 
  PlusCircle, 
  Filter,
  Calendar,
  HardDrive
} from 'lucide-react';
import { LogFile, LogEntry } from '../types';
import { formatSpanishMonthName } from '../utils/dateParser';

interface LogsViewerModuleProps {
  token: string | null;
}

export const LogsViewerModule: React.FC<LogsViewerModuleProps> = ({ token }) => {
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [rawContent, setRawContent] = useState<string>('');
  
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [isLoadingEntries, setIsLoadingEntries] = useState<boolean>(false);
  
  const [viewMode, setViewMode] = useState<'parsed' | 'raw'>('parsed');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');

  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [showTestModal, setShowTestModal] = useState<boolean>(false);
  const [testMessage, setTestMessage] = useState<string>('');
  const [testScope, setTestScope] = useState<string>('SISTEMA_TICKETS');
  const [testLevel, setTestLevel] = useState<'ERROR' | 'WARN' | 'INFO'>('ERROR');
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);

  // Fetch list of monthly log files
  const fetchLogFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const res = await fetch('/api/admin/logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLogFiles(data.files || []);
        if (data.files && data.files.length > 0 && !selectedFile) {
          setSelectedFile(data.files[0].filename);
        }
      } else {
        setNotification({ type: 'error', message: data.message || 'Error al cargar lista de logs' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Error de conexión al servidor' });
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Fetch content of selected log file
  const fetchLogContent = async (filename: string) => {
    setIsLoadingEntries(true);
    try {
      const res = await fetch(`/api/admin/logs/${filename}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setEntries(data.entries || []);
        setRawContent(data.rawContent || '');
      } else {
        setNotification({ type: 'error', message: data.message || 'Error al leer el archivo de log' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Error al comunicarse con el servidor' });
    } finally {
      setIsLoadingEntries(false);
    }
  };

  useEffect(() => {
    fetchLogFiles();
  }, [token]);

  useEffect(() => {
    if (selectedFile) {
      fetchLogContent(selectedFile);
    }
  }, [selectedFile, token]);

  // Handle Clear / Reset Log File
  const handleClearLog = async (filename: string) => {
    if (!window.confirm(`¿Estás seguro de limpiar el contenido del log de ${filename}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/logs/${filename}?action=clear`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: `Contenido de ${filename} limpiado correctamente.` });
        fetchLogFiles();
        if (selectedFile === filename) {
          fetchLogContent(filename);
        }
      } else {
        setNotification({ type: 'error', message: data.message || 'Error al limpiar archivo' });
      }
    } catch {
      setNotification({ type: 'error', message: 'Error al realizar petición al servidor' });
    }
  };

  // Handle Generate Test Error Log
  const handleGenerateTestLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingTest(true);
    try {
      const res = await fetch('/api/admin/logs/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          level: testLevel,
          scope: testScope || 'ADMIN_TEST',
          message: testMessage || 'Prueba manual de registro de error generada por el administrador.'
        })
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: 'Log de prueba generado con éxito.' });
        setShowTestModal(false);
        setTestMessage('');
        fetchLogFiles();
        if (selectedFile) {
          fetchLogContent(selectedFile);
        }
      } else {
        setNotification({ type: 'error', message: data.message || 'Error al generar log' });
      }
    } catch {
      setNotification({ type: 'error', message: 'Error en la solicitud' });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Handle Copy Raw Content
  const handleCopy = () => {
    navigator.clipboard.writeText(rawContent);
    setNotification({ type: 'info', message: 'Contenido del log copiado al portapapeles.' });
  };

  // Format bytes helper
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Filter entries
  const filteredEntries = entries.filter(entry => {
    const matchesQuery = searchQuery === '' || 
      entry.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.scope.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.user && entry.user.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesLevel = selectedLevel === 'ALL' || entry.level.toUpperCase() === selectedLevel.toUpperCase();

    return matchesQuery && matchesLevel;
  });

  const selectedLogMeta = logFiles.find(f => f.filename === selectedFile);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Bug className="w-64 h-64 text-rose-500" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Log de Errores del Sistema
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Exclusivo Administradores
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Registro mensual de excepciones, fallos en la BD y auditoría almacenados en el directorio <code className="text-rose-300 bg-slate-950 px-1.5 py-0.5 rounded">/logs</code>.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTestModal(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>Generar Log de Prueba</span>
            </button>

            <button
              onClick={fetchLogFiles}
              disabled={isLoadingFiles}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingFiles ? 'animate-spin' : ''}`} />
              <span>Actualizar Logs</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
          notification.type === 'success' ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200' :
          notification.type === 'error' ? 'bg-rose-950/80 border-rose-800 text-rose-200' :
          'bg-blue-950/80 border-blue-800 text-blue-200'
        }`}>
          <div className="flex items-center space-x-2 text-sm">
            {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {notification.type === 'error' && <AlertOctagon className="w-5 h-5 text-rose-400" />}
            {notification.type === 'info' && <Info className="w-5 h-5 text-blue-400" />}
            <span>{notification.message}</span>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-xs opacity-70 hover:opacity-100 cursor-pointer px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Sidebar: Monthly Files List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-500" />
              Archivos Mensuales
            </h3>
            <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-300 font-medium">
              {logFiles.length} {logFiles.length === 1 ? 'archivo' : 'archivos'}
            </span>
          </div>

          {isLoadingFiles ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
              <RefreshCw className="w-6 h-6 text-blue-400 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400">Buscando logs en /logs...</p>
            </div>
          ) : logFiles.length === 0 ? (
            <div className="p-6 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
              <FileText className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs font-semibold text-slate-300">Sin logs registrados</p>
              <p className="text-[11px] text-slate-500">
                Aún no hay archivos de error generados en el directorio <code className="text-rose-400">/logs</code>.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 no-scrollbar">
              {logFiles.map((file) => {
                const isSelected = selectedFile === file.filename;
                const monthName = formatSpanishMonthName(file.month);

                return (
                  <button
                    key={file.filename}
                    onClick={() => setSelectedFile(file.filename)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                      isSelected
                        ? 'bg-blue-950/60 border-blue-500/60 shadow-md shadow-blue-900/20'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                        <span className="text-sm font-bold text-white capitalize">
                          {monthName} {file.year}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatBytes(file.sizeBytes)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                        {file.errorCount} ERR
                      </span>
                      {file.warnCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                          {file.warnCount} WARN
                        </span>
                      )}
                      <span className="text-slate-400 ml-auto font-mono text-[10px]">
                        {file.totalLines} líneas
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Main Content Area: Log Entries & Terminal View */}
        <div className="lg:col-span-3 space-y-4">
          
          {selectedFile ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              
              {/* Top Controls & File Meta */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-rose-400 font-mono">
                      {selectedFile}
                    </span>
                    {selectedLogMeta && (
                      <span className="text-xs text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                        {formatBytes(selectedLogMeta.sizeBytes)} • {selectedLogMeta.totalLines} entradas
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Última modificación: {selectedLogMeta?.lastModified ? new Date(selectedLogMeta.lastModified).toLocaleString('es-ES') : 'Reciente'}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* View Mode Toggle */}
                  <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center space-x-1">
                    <button
                      onClick={() => setViewMode('parsed')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
                        viewMode === 'parsed'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Filter className="w-3.5 h-3.5" />
                      <span>Estructurada</span>
                    </button>
                    <button
                      onClick={() => setViewMode('raw')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
                        viewMode === 'raw'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Plano (.log)</span>
                    </button>
                  </div>

                  {/* Actions */}
                  <a
                    href={`/api/admin/logs/${selectedFile}?download=true`}
                    download
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-all cursor-pointer"
                    title="Descargar archivo .log"
                  >
                    <Download className="w-4 h-4" />
                  </a>

                  <button
                    onClick={handleCopy}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-all cursor-pointer"
                    title="Copiar contenido al portapapeles"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleClearLog(selectedFile)}
                    className="p-2 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 rounded-xl border border-rose-800/80 transition-all cursor-pointer"
                    title="Limpiar log del mes"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Bar (Only for parsed view) */}
              {viewMode === 'parsed' && (
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por mensaje, módulo o usuario..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
                    {['ALL', 'ERROR', 'WARN', 'INFO'].map((level) => (
                      <button
                        key={level}
                        onClick={() => setSelectedLevel(level)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex-1 sm:flex-initial text-center ${
                          selectedLevel === level
                            ? level === 'ERROR' ? 'bg-rose-600 text-white' :
                              level === 'WARN' ? 'bg-amber-600 text-white' :
                              level === 'INFO' ? 'bg-blue-600 text-white' :
                              'bg-slate-700 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {level === 'ALL' ? 'Todos' : level}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* View Content */}
              {isLoadingEntries ? (
                <div className="p-12 text-center">
                  <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Cargando registros de {selectedFile}...</p>
                </div>
              ) : viewMode === 'raw' ? (
                /* RAW TERMINAL VIEW */
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-[500px] leading-relaxed select-all">
                  {rawContent ? (
                    <pre className="whitespace-pre-wrap break-all">{rawContent}</pre>
                  ) : (
                    <span className="text-slate-600 italic">El archivo de log está vacío.</span>
                  )}
                </div>
              ) : (
                /* PARSED STRUCTURED VIEW */
                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {filteredEntries.length === 0 ? (
                    <div className="p-12 text-center border border-slate-800 rounded-xl bg-slate-950">
                      <Search className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-300">No se encontraron líneas de log</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Intenta ajustar los filtros de búsqueda o nivel de gravedad.
                      </p>
                    </div>
                  ) : (
                    filteredEntries.map((entry) => {
                      const isError = entry.level.toUpperCase() === 'ERROR';
                      const isWarn = entry.level.toUpperCase() === 'WARN';
                      const isInfo = entry.level.toUpperCase() === 'INFO';

                      return (
                        <div
                          key={entry.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            isError ? 'bg-rose-950/20 border-rose-900/40 hover:border-rose-700/60' :
                            isWarn ? 'bg-amber-950/20 border-amber-900/40 hover:border-amber-700/60' :
                            'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center space-x-2">
                              {/* Level Badge */}
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                                isError ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                                isWarn ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                                'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              }`}>
                                {entry.level}
                              </span>

                              {/* Scope */}
                              <span className="text-[11px] font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                                {entry.scope}
                              </span>

                              {/* User if present */}
                              {entry.user && (
                                <span className="text-[11px] font-medium text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/50">
                                  @{entry.user}
                                </span>
                              )}
                            </div>

                            {/* Timestamp */}
                            <span className="text-[11px] font-mono text-slate-500">
                              {entry.timestamp}
                            </span>
                          </div>

                          {/* Message */}
                          <div className="text-xs font-mono text-slate-200 leading-relaxed break-words pl-1">
                            {entry.message}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <FileText className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">Selecciona un archivo de log</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Elige un mes de la columna izquierda para visualizar los errores y eventos registrados por el servidor.
              </p>
            </div>
          )}

        </div>

      </div>

      {/* MODAL: Generate Test Error Log */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Bug className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">Generar Log de Prueba</h3>
              </div>
              <button
                onClick={() => setShowTestModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateTestLog} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nivel de Gravedad
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ERROR', 'WARN', 'INFO'] as const).map((lvl) => (
                    <button
                      type="button"
                      key={lvl}
                      onClick={() => setTestLevel(lvl)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        testLevel === lvl
                          ? lvl === 'ERROR' ? 'bg-rose-600 text-white border-rose-500' :
                            lvl === 'WARN' ? 'bg-amber-600 text-white border-amber-500' :
                            'bg-blue-600 text-white border-blue-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Módulo / Ámbito (Scope)
                </label>
                <input
                  type="text"
                  value={testScope}
                  onChange={(e) => setTestScope(e.target.value)}
                  placeholder="ej. BASE_DE_DATOS, LOGIN, EXCEL_UPLOAD"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mensaje del Evento
                </label>
                <textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  rows={3}
                  placeholder="Escribe la descripción del error de prueba..."
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  {isSendingTest && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Registrar en /logs</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
