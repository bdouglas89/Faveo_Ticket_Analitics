import React from 'react';
import { LayoutDashboard, UploadCloud, AlertTriangle, Table, Database, CheckCircle2, ShieldAlert, Users, LogOut, User as UserIcon, Shield, Eye } from 'lucide-react';
import { formatSpanishMonthName } from '../utils/dateParser';
import { User, UserRole } from '../types';

interface HeaderProps {
  activeTab: 'dashboard' | 'upload' | 'special' | 'all' | 'admin' | 'users';
  setActiveTab: (tab: 'dashboard' | 'upload' | 'special' | 'all' | 'admin' | 'users') => void;
  isLoading: boolean;
  ticketCount: number;
  specialCount: number;
  selectedMonth: number;
  selectedYear: number;
  currentUser: User | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isLoading,
  ticketCount,
  specialCount,
  selectedMonth,
  selectedYear,
  currentUser,
  onLogout
}) => {
  const monthName = formatSpanishMonthName(selectedMonth);

  const role = currentUser?.role || 'visor';
  const isAdmin = role === 'administrator';
  const isGestor = role === 'gestor';
  const isVisor = role === 'visor';

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'administrator':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Shield className="w-3 h-3 mr-1" /> Administrator
          </span>
        );
      case 'gestor':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <UploadCloud className="w-3 h-3 mr-1" /> Gestor
          </span>
        );
      case 'visor':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30">
            <Eye className="w-3 h-3 mr-1" /> Visor
          </span>
        );
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-4">
          
          {/* Logo and App Title */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Database className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-white">
                   <span className="text-blue-400 font-normal">FAVEO</span> Ticket Analytics
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> BD Conectada
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Alimentación desde Excel, discriminación mensual y control de plazos
              </p>
            </div>
          </div>

          {/* User Profile & Actions */}
          {currentUser && (
            <div className="flex items-center space-x-3 bg-slate-950/80 border border-slate-800 rounded-xl p-2 px-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 border border-slate-700">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-white">{currentUser.name || currentUser.username}</span>
                    {getRoleBadge(currentUser.role)}
                  </div>
                  <span className="text-[10px] text-slate-400">@{currentUser.username}</span>
                </div>
              </div>

              <div className="h-6 w-px bg-slate-800 mx-1" />

              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer flex items-center space-x-1 text-xs"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 overflow-x-auto border-t border-slate-800/80 pt-2 pb-1 no-scrollbar">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard Analítico</span>
            {ticketCount > 0 && (
              <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'dashboard' ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-300'
              }`}>
                {ticketCount}
              </span>
            )}
          </button>

          {/* Subir Excel (gestor & administrator only) */}
          {!isVisor && (
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Subir Excel</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('special')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'special'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-300" />
            <span>Control de Plazos y Pendientes</span>
            {specialCount > 0 && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-slate-950">
                {specialCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Todos los Tickets {monthName} {selectedYear}</span>
          </button>

          {/* Gestión de Datos (administrator only) */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Gestión de Datos</span>
            </button>
          )}

          {/* Gestión de Usuarios (administrator only) */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4 text-purple-300" />
              <span>Usuarios</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

