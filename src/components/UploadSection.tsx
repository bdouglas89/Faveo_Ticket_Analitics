import React, { useState } from 'react';
import { UploadCloud, FileSpreadsheet, Download, CheckCircle2, AlertCircle, Calendar, ArrowRight, Filter, ShieldCheck, Database } from 'lucide-react';
import * as xlsx from 'xlsx';
import { UploadResult } from '../types';
import { formatSpanishMonthName } from '../utils/dateParser';

interface UploadSectionProps {
  onUploadSuccess: (result: UploadResult) => void;
  isLoading: boolean;
}

export const UploadSection: React.FC<UploadSectionProps> = ({ onUploadSuccess, isLoading }) => {
  const currentDate = new Date();
  const [targetMonth, setTargetMonth] = useState<number>(7); // Default July as in screenshot
  const [targetYear, setTargetYear] = useState<number>(2026); // Default 2026 as in screenshot
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<UploadResult | null>(null);

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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setErrorMsg(null);
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const name = file.name.toLowerCase();
    if (!validExtensions.some(ext => name.endsWith(ext))) {
      setErrorMsg('Por favor selecciona un archivo con formato .xlsx, .xls o .csv');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Selecciona un archivo de Excel para continuar.');
      return;
    }

    setUploading(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('excel_file', selectedFile);
    formData.append('target_month', String(targetMonth));
    formData.append('target_year', String(targetYear));

    try {
      const token = localStorage.getItem('fav_token');
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};

      const res = await fetch('/api/upload-excel', {
        method: 'POST',
        headers,
        body: formData
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(`El servidor devolvió una respuesta no esperada (${res.status}). Intente de nuevo.`);
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al procesar la carga.');
      }

      setLastResult(data);
      onUploadSuccess(data);
      setSelectedFile(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocurrió un error inesperado al subir el archivo.');
    } finally {
      setUploading(false);
    }
  };

  const downloadExcelTemplate = () => {
    const sampleData = [
      {
    "Ticket Number": "INC-BTRX-6142",
    "Subject": "Estanterías modulares para laboratorio",
    "Status": "Abierto",
    "Department": "Laboratorio Clínico",
    "Type": "Solicitud de Cotización",
    "Owner": "María Fernanda Solís Rojas",
    "Assigned Agent": "Carlos Eduardo Vargas Méndez",
    "Creator": "María Fernanda Solís Rojas",
    "¿La compra es mayor a $2000?": "No",
    "Created At": "julio 27, 2026 9:48 AM",
    "Fecha Límite para realizar la compra": "30-08-2026, 12:00 am",
    "fecha_finalizada": "",
    "fecha_pendiente_verificacion": "",
    "Closed At": ""
  },
  {
    "Ticket Number": "INC-QMPL-6087",
    "Subject": "Equipo portátil para analista de datos",
    "Status": "Abierto",
    "Department": "Unidad de Tecnologías de Información",
    "Type": "Solicitud de Cotización",
    "Owner": "Daniel Ortega Jiménez",
    "Assigned Agent": "Laura Patricia Ramírez Castro",
    "Creator": "Daniel Ortega Jiménez",
    "¿La compra es mayor a $2000?": "Si",
    "Created At": "julio 16, 2026 2:14 PM",
    "Fecha Límite para realizar la compra": "01-08-2026, 10:30 am",
    "fecha_finalizada": "",
    "fecha_pendiente_verificacion": "",
    "Closed At": ""
  },
  {
    "Ticket Number": "INC-HZNV-6071",
    "Subject": "Mantenimiento de equipos de laboratorio",
    "Status": "En proceso pago",
    "Department": "Servicios Biomédicos",
    "Type": "Solicitud de pago de servicios/facturas",
    "Owner": "Sofía Herrera Campos",
    "Assigned Agent": "Andrés Molina Cordero",
    "Creator": "Sofía Herrera Campos",
    "¿La compra es mayor a $2000?": "No",
    "Created At": "julio 14, 2026 10:42 PM",
    "Fecha Límite para realizar la compra": "17-07-2026, 12:00 am",
    "fecha_finalizada": "29-07-2026",
    "fecha_pendiente_verificacion": "21-07-2026",
    "Closed At": "julio 29, 2026 8:16 AM"
  }
    ];

    const worksheet = xlsx.utils.json_to_sheet(sampleData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Tickets");
    xlsx.writeFile(workbook, `Plantilla_Tickets_Excel_${targetMonth}_${targetYear}.xlsx`);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
              <Filter className="w-3.5 h-3.5" />
              <span>Alimentación de Datos con Discriminación Temporal</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Carga y Filtrado Automático de Tickets Excel
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              El sistema procesa su archivo de Excel, extrae la columna <code className="text-amber-300 bg-slate-800/80 px-1.5 py-0.5 rounded font-mono">Created At</code>, 
              almacena los tickets correspondientes al <strong>Mes y Año seleccionados</strong> en la base de datos SQLite y discrimina automáticamente los registros fuera de periodo.
            </p>
          </div>

          <button
            onClick={downloadExcelTemplate}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold shadow-md transition-all whitespace-nowrap self-start lg:self-center"
          >
            <Download className="w-4 h-4 mr-2 text-indigo-400" />
            Descargar Plantilla Excel de Ejemplo
          </button>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleUploadSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Step 1: Target Month & Year Selector */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 font-semibold text-sm mb-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">1</div>
              <h3>Selección de Periodo a Cargar</h3>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Indique el mes y año objetivo. Únicamente los tickets creados en este mes se guardarán en SQLite.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mes Creado (Created At)
                </label>
                <div className="relative">
                  <select
                    value={targetMonth}
                    onChange={(e) => setTargetMonth(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value={0}>🗓️ Todos los Meses (Importar Todo)</option>
                    {monthsList.map((m) => (
                      <option key={m.num} value={m.num}>
                        {m.num}. {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Año Creado
                </label>
                <select
                  value={targetYear}
                  onChange={(e) => setTargetYear(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  {yearsList.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-amber-300/90 flex items-start space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-amber-300">Regla de Filtrado:</span>
              {targetMonth === 0 ? (
                <>Se importarán todas las filas válidas del archivo Excel sin filtrar por fecha.</>
              ) : (
                <>Las filas cuyo <code className="text-white">Created At</code> no corresponda a <strong>{formatSpanishMonthName(targetMonth)} {targetYear}</strong> serán discriminadas y contabilizadas en el informe.</>
              )}
            </div>
          </div>
        </div>

        {/* Step 2: Drag & Drop Zone */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 font-semibold text-sm mb-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">2</div>
              <h3>Adjuntar Archivo de Excel</h3>
            </div>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer relative ${
                dragActive
                  ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
                  : selectedFile
                  ? 'border-emerald-500/60 bg-emerald-950/20'
                  : 'border-slate-700 hover:border-slate-500 bg-slate-950/50'
              }`}
            >
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              {selectedFile ? (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-300">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      {(selectedFile.size / 1024).toFixed(1)} KB — Listo para procesar
                    </p>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Archivo Seleccionado
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      Arrastra y suelta tu archivo Excel aquí, o <span className="text-blue-400 underline">haz clic para examinar</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Soporta formatos <span className="font-mono text-slate-300">.xlsx, .xls, .csv</span> con encabezados estándar.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={!selectedFile || uploading || isLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Database className="w-4 h-4 mr-2 animate-spin" />
                  Procesando en SQLite...
                </>
              ) : (
                <>
                  Alimentar Base de Datos ({formatSpanishMonthName(targetMonth)} {targetYear})
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Upload Results & Discrimination Report */}
      {lastResult && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-white">
                Informe de Carga y Discriminación ({formatSpanishMonthName(lastResult.target_month)} {lastResult.target_year})
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
              SQLite Status: Updated
            </span>
          </div>

          {/* Metrics Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-center">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">
                Total Filas en Excel
              </span>
              <span className="text-2xl font-extrabold text-white font-mono">
                {lastResult.total_excel_rows}
              </span>
            </div>

            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4 text-center">
              <span className="text-xs text-emerald-400 uppercase tracking-wider font-semibold block mb-1">
                Tickets Importados ({formatSpanishMonthName(lastResult.target_month)})
              </span>
              <span className="text-2xl font-extrabold text-emerald-300 font-mono">
                {lastResult.imported_count}
              </span>
            </div>

            <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-4 text-center">
              <span className="text-xs text-amber-400 uppercase tracking-wider font-semibold block mb-1">
                Líneas Discriminated / Omitidas
              </span>
              <span className="text-2xl font-extrabold text-amber-300 font-mono">
                {lastResult.discriminated_count}
              </span>
            </div>
          </div>

          {/* Sample Rows Preview */}
          {lastResult.sample_rows && lastResult.sample_rows.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Muestra de Tickets Importados ({lastResult.sample_rows.length} de {lastResult.imported_count}):
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-300 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-2.5">Ticket Number</th>
                      <th className="px-4 py-2.5">Subject</th>
                      <th className="px-4 py-2.5">Department</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Created At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                    {lastResult.sample_rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="px-4 py-2 text-blue-400 font-bold">{row.ticket_number}</td>
                        <td className="px-4 py-2 text-slate-200 font-sans">{row.subject}</td>
                        <td className="px-4 py-2 text-slate-300">{row.department}</td>
                        <td className="px-4 py-2">
                          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-sans">
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-slate-400">{row.created_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
