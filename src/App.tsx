import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { UploadSection } from './components/UploadSection';
import { Dashboard } from './components/Dashboard';
import { SpecialTicketsList } from './components/SpecialTicketsList';
import { TicketTable } from './components/TicketTable';
import { DataAdminModule } from './components/DataAdminModule';
import { UserManagementModule } from './components/UserManagementModule';
import { LoginModal } from './components/LoginModal';
import { StatsResponse, Ticket, SpecialTicketsResponse, UploadResult, User } from './types';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('fav_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('fav_token') || null;
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'upload' | 'special' | 'all' | 'admin' | 'users'>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<number>(4); // Default April
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [specialData, setSpecialData] = useState<SpecialTicketsResponse | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Verify stored session on boot
  useEffect(() => {
    if (token) {
      fetch('/api/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.user) {
            setCurrentUser(data.user);
            localStorage.setItem('fav_user', JSON.stringify(data.user));
          } else {
            handleLogout();
          }
        })
        .catch(() => {
          // If server error or restart, keep local user if available or soft retry
        });
    }
  }, []);

  // Handle Login
  const handleLoginSuccess = (user: User, userToken: string) => {
    setCurrentUser(user);
    setToken(userToken);
    localStorage.setItem('fav_user', JSON.stringify(user));
    localStorage.setItem('fav_token', userToken);
    setNotification({
      type: 'success',
      message: `¡Bienvenido ${user.name || user.username}! Sesión iniciada con rol ${user.role}.`
    });
  };

  // Handle Logout
  const handleLogout = () => {
    if (token) {
      fetch('/api/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => {});
    }
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('fav_user');
    localStorage.removeItem('fav_token');
    setActiveTab('dashboard');
  };

  // Restrict tabs based on active role
  useEffect(() => {
    if (!currentUser) return;
    const role = currentUser.role;

    if (role === 'visor') {
      if (activeTab === 'upload' || activeTab === 'admin' || activeTab === 'users') {
        setActiveTab('dashboard');
      }
    } else if (role === 'gestor') {
      if (activeTab === 'admin' || activeTab === 'users') {
        setActiveTab('dashboard');
      }
    }
  }, [currentUser, activeTab]);

  // Fetch all dashboard data from SQLite backend
  const refreshData = async () => {
    setIsLoading(true);
    try {
      const authHeaders: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};

      // 1. Fetch Stats
      const queryParams = new URLSearchParams();
      queryParams.append('month', String(selectedMonth));
      queryParams.append('year', String(selectedYear));

      const parseJsonResponse = async (res: Response) => {
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const text = await res.text();
          throw new Error(`Respuesta no válida del servidor (${res.status}): ${text.slice(0, 80)}...`);
        }
        return await res.json();
      };

      const statsRes = await fetch(`/api/stats?${queryParams.toString()}`, { headers: authHeaders });
      if (statsRes.ok) {
        const statsJson = await parseJsonResponse(statsRes);
        if (statsJson.success) {
          setStats(statsJson.stats);
        }
      }

      // 2. Fetch Special Tickets (Overdue & Uncompleted)
      const specialRes = await fetch(`/api/special-tickets?${queryParams.toString()}`, { headers: authHeaders });
      if (specialRes.ok) {
        const specialJson = await parseJsonResponse(specialRes);
        if (specialJson.success) {
          setSpecialData(specialJson);
        }
      }

      // 3. Fetch All Tickets
      const ticketsRes = await fetch(`/api/tickets?${queryParams.toString()}`, { headers: authHeaders });
      if (ticketsRes.ok) {
        const ticketsJson = await parseJsonResponse(ticketsRes);
        if (ticketsJson.success) {
          setTickets(ticketsJson.tickets);
        }
      }
    } catch (err) {
      console.error('Error fetching SQLite data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      refreshData();
    }
  }, [selectedMonth, selectedYear, currentUser]);

  const handleUploadSuccess = async (result: UploadResult) => {
    setNotification({
      type: 'success',
      message: `Carga exitosa: ${result.imported_count} tickets importados en SQLite para ${result.target_month}/${result.target_year}. (${result.discriminated_count} filas fuera del periodo fueron discriminadas).`
    });
    setSelectedMonth(result.target_month);
    setSelectedYear(result.target_year);
    await refreshData();
  };

  // Auto-hide notification after 6s
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-blue-500 selection:text-white pb-16">
      
      {/* Login Modal if unauthenticated */}
      {(!currentUser || !token) && (
        <LoginModal onLoginSuccess={handleLoginSuccess} />
      )}

      {/* Header Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isLoading={isLoading}
        ticketCount={stats?.total_tickets || 0}
        specialCount={specialData?.all_special_count || 0}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* Notification Toast */}
        {notification && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between shadow-xl animate-fade-in ${
              notification.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                : notification.type === 'error'
                ? 'bg-rose-950/80 border-rose-500/40 text-rose-200'
                : 'bg-blue-950/80 border-blue-500/40 text-blue-200'
            }`}
          >
            <div className="flex items-center space-x-3 text-xs sm:text-sm font-medium">
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Dynamic Views */}
        {activeTab === 'dashboard' && (
          <Dashboard
            stats={stats}
            specialData={specialData}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
            isLoading={isLoading}
            onNavigateToSpecial={() => setActiveTab('special')}
          />
        )}

        {activeTab === 'upload' && currentUser?.role !== 'visor' && (
          <UploadSection
            onUploadSuccess={handleUploadSuccess}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'special' && (
          <SpecialTicketsList
            specialData={specialData}
            isLoading={isLoading}
            onRefresh={refreshData}
          />
        )}

        {activeTab === 'all' && (
          <TicketTable
            tickets={tickets}
            isLoading={isLoading}
            onRefresh={refreshData}
          />
        )}

        {activeTab === 'admin' && currentUser?.role === 'administrator' && (
          <DataAdminModule
            monthsAvailable={stats?.months_available || []}
            onDataCleared={refreshData}
            isLoading={isLoading}
            totalTickets={stats?.db_total_tickets ?? stats?.total_tickets ?? 0}
          />
        )}

        {activeTab === 'users' && currentUser?.role === 'administrator' && token && (
          <UserManagementModule
            currentUser={currentUser}
            token={token}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-900 py-6 text-center text-xs text-slate-500 font-mono">
        <p>Sistema de Gestión de Tickets & Analytics — Base de Datos SQLite On-Disk — Google AI Studio Build</p>
      </footer>
    </div>
  );
}
