import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, KeyRound, Shield, CheckCircle2, AlertCircle, RefreshCw, Eye, UploadCloud, ShieldAlert } from 'lucide-react';
import { User, UserRole } from '../types';

interface UserManagementModuleProps {
  currentUser: User;
  token: string;
}

export const UserManagementModule: React.FC<UserManagementModuleProps> = ({ currentUser, token }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State for New User
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [newRole, setNewRole] = useState<UserRole>('visor');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form State for Password Reset
  const [selectedUserForReset, setSelectedUserForReset] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState<string>('');

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al cargar los usuarios.');
      }
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message || 'Error de conexión.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim() || !newName.trim()) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          name: newName.trim(),
          password: newPassword.trim(),
          role: newRole
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al crear usuario.');
      }

      setSuccessMsg(`Usuario ${newUsername} creado exitosamente con rol ${newRole}.`);
      setShowAddModal(false);
      setNewUsername('');
      setNewName('');
      setNewPassword('');
      setNewRole('visor');
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Error al crear el usuario.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userToDelete: User) => {
    if (userToDelete.id === currentUser.id) {
      alert('No puedes eliminar tu propia cuenta en sesión activa.');
      return;
    }

    if (!confirm(`¿Está seguro de eliminar el usuario "${userToDelete.username}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al eliminar usuario.');
      }

      setSuccessMsg(`Usuario ${userToDelete.username} eliminado correctamente.`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'No se pudo eliminar el usuario.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForReset || !resetPassword.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/users/${selectedUserForReset.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: resetPassword.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al restablecer contraseña.');
      }

      setSuccessMsg(`Contraseña actualizada para el usuario ${selectedUserForReset.username}.`);
      setSelectedUserForReset(null);
      setResetPassword('');
    } catch (err: any) {
      setError(err.message || 'Error al actualizar contraseña.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'administrator':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Shield className="w-3 h-3 mr-1" /> administrator
          </span>
        );
      case 'gestor':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <UploadCloud className="w-3 h-3 mr-1" /> gestor
          </span>
        );
      case 'visor':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-300 border border-slate-500/20">
            <Eye className="w-3 h-3 mr-1" /> visor
          </span>
        );
      default:
        return <span className="text-xs text-slate-400">{role}</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-purple-600/20 border border-purple-500/30 rounded-xl text-purple-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Gestión de Usuarios y Permisos
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Administre las cuentas de usuario y asigne roles de acceso al sistema (administrator, gestor, visor)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchUsers}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors border border-slate-700 flex items-center cursor-pointer"
            title="Actualizar lista"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center space-x-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Crear Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {/* Role explanation cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-purple-900/40 rounded-xl p-4">
          <div className="flex items-center space-x-2 text-purple-400 font-semibold text-xs mb-1">
            <Shield className="w-4 h-4" />
            <span>administrator</span>
          </div>
          <p className="text-xs text-slate-300">
            Acceso total al sistema: Dashboard, Subir Excel, Control de Plazos, Todos los Tickets, Gestión de Datos y Administración de Usuarios.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-blue-900/40 rounded-xl p-4">
          <div className="flex items-center space-x-2 text-blue-400 font-semibold text-xs mb-1">
            <UploadCloud className="w-4 h-4" />
            <span>gestor</span>
          </div>
          <p className="text-xs text-slate-300">
            Puede subir archivos de Excel, discriminar meses y consultar información. No tiene acceso a Gestión de Datos ni Usuarios.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center space-x-2 text-slate-300 font-semibold text-xs mb-1">
            <Eye className="w-4 h-4 text-slate-400" />
            <span>visor</span>
          </div>
          <p className="text-xs text-slate-300">
            Únicamente puede visualizar los tableros y consultar los tickets. No puede subir Excel ni modificar datos.
          </p>
        </div>
      </div>

      {/* Feedback Messages */}
      {error && (
        <div className="bg-rose-950/50 border border-rose-800/80 rounded-xl p-4 flex items-center space-x-3 text-xs text-rose-300">
          <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-950/50 border border-emerald-800/80 rounded-xl p-4 flex items-center space-x-3 text-xs text-emerald-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            Usuarios Registrados ({users.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Cargando usuarios...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No hay usuarios registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-medium">
                  <th className="py-3 px-6">Usuario</th>
                  <th className="py-3 px-6">Nombre Completo</th>
                  <th className="py-3 px-6">Rol de Acceso</th>
                  <th className="py-3 px-6">Fecha Registro</th>
                  <th className="py-3 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {users.map((u) => {
                  const isCurrent = u.id === currentUser.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-6 font-bold text-white flex items-center space-x-2">
                        <span>{u.username}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            Tú
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6">{u.name || '-'}</td>
                      <td className="py-3.5 px-6">{getRoleBadge(u.role)}</td>
                      <td className="py-3.5 px-6 text-slate-400">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3.5 px-6 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUserForReset(u);
                            setResetPassword('');
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors border border-slate-700 inline-flex items-center space-x-1 cursor-pointer"
                          title="Restablecer contraseña"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                          <span>Contraseña</span>
                        </button>

                        <button
                          onClick={() => handleDeleteUser(u)}
                          disabled={isCurrent}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 rounded-lg text-xs transition-colors border border-slate-700 hover:border-rose-900/50 inline-flex items-center space-x-1 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title={isCurrent ? "No puedes eliminar tu propia cuenta activa" : "Eliminar usuario"}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span>Eliminar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add User */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-white space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2 border-b border-slate-800 pb-3">
              <UserPlus className="w-5 h-5 text-purple-400" />
              <span>Crear Nuevo Usuario</span>
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nombre de Usuario (Login) *
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="ej. juan.perez"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ej. Juan Pérez"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Contraseña *
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Rol de Acceso *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="administrator">administrator - Acceso total + Gestión</option>
                  <option value="gestor">gestor - Subir Excel + Visualizar</option>
                  <option value="visor">visor - Únicamente visualizar</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-purple-600/30 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reset Password */}
      {selectedUserForReset && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-white space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2 border-b border-slate-800 pb-3">
              <KeyRound className="w-5 h-5 text-amber-400" />
              <span>Cambiar Contraseña</span>
            </h3>

            <p className="text-xs text-slate-400">
              Usuario: <strong className="text-white">{selectedUserForReset.username}</strong> ({selectedUserForReset.name})
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nueva Contraseña *
                </label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedUserForReset(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-amber-600/30 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Actualizando...' : 'Actualizar Contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
