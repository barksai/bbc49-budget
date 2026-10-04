import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Edit,
  Trash2,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Clock
} from 'lucide-react';
import { User, UserRole } from '../../types/auth';
import { authService } from '../../services/auth';

interface AdminUsersTabProps {
  currentUser: User;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal creation
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('editor');

  // Modal reset password
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await authService.getUsers();
      setUsers(data);
    } catch {
      setMessage({ type: 'error', text: 'Impossible de charger la liste des utilisateurs.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      showNotification('error', 'Identifiant et mot de passe requis.');
      return;
    }
    if (newPassword.trim().length < 4) {
      showNotification('error', 'Le mot de passe doit comporter au moins 4 caractères.');
      return;
    }

    const res = await authService.createUser({
      username: newUsername.trim(),
      name: newName.trim() || newUsername.trim(),
      password: newPassword.trim(),
      role: newRole,
    });

    if (res.success && res.user) {
      setUsers([...users, res.user]);
      setIsCreateModalOpen(false);
      setNewUsername('');
      setNewName('');
      setNewPassword('');
      setNewRole('editor');
      showNotification('success', `Utilisateur "${res.user.username}" créé avec succès.`);
    } else {
      showNotification('error', res.error || "Erreur lors de la création de l'utilisateur.");
    }
  };

  const handleRoleChange = async (user: User, newRole: UserRole) => {
    if (user.role === newRole) return;
    if (user.role === 'admin' && users.filter((u) => u.role === 'admin').length <= 1) {
      showNotification('error', "Impossible de modifier le rôle du dernier administrateur de l'application.");
      return;
    }

    const res = await authService.updateUser(user.id, { role: newRole });
    if (res.success && res.user) {
      setUsers(users.map((u) => (u.id === user.id ? res.user! : u)));
      showNotification('success', `Rôle mis à jour pour ${user.username} : ${newRole}`);
    } else {
      showNotification('error', res.error || 'Erreur lors de la modification du rôle.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !resetPasswordValue.trim() || resetPasswordValue.trim().length < 4) {
      showNotification('error', 'Le mot de passe doit comporter au moins 4 caractères.');
      return;
    }

    const res = await authService.updateUser(editingUser.id, { password: resetPasswordValue.trim() });
    if (res.success) {
      setEditingUser(null);
      setResetPasswordValue('');
      showNotification('success', `Mot de passe réinitialisé pour ${editingUser.username}.`);
    } else {
      showNotification('error', res.error || 'Erreur lors de la réinitialisation du mot de passe.');
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (user.id === currentUser.id) {
      showNotification('error', 'Vous ne pouvez pas supprimer votre propre compte.');
      return;
    }
    if (user.role === 'admin' && users.filter((u) => u.role === 'admin').length <= 1) {
      showNotification('error', "Impossible de supprimer le dernier administrateur de l'application.");
      return;
    }

    if (!window.confirm(`Confirmez-vous la suppression définitive du compte de "${user.name}" (${user.username}) ?`)) {
      return;
    }

    const res = await authService.deleteUser(user.id);
    if (res.success) {
      setUsers(users.filter((u) => u.id !== user.id));
      showNotification('success', `Utilisateur "${user.username}" supprimé.`);
    } else {
      showNotification('error', res.error || 'Erreur lors de la suppression.');
    }
  };

  const adminCount = users.filter((u) => u.role === 'admin').length;
  const editorCount = users.filter((u) => u.role === 'editor').length;
  const viewerCount = users.filter((u) => u.role === 'viewer').length;

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto h-full text-slate-100">
      {/* En-tête & Action principale */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#181a22] to-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-red-950/80 text-red-400 border border-red-800/40">
              Sécurité & Accès
            </span>
            <span className="text-xs text-slate-400">Reverse Proxy &bull; Gestion des droits</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
            Administration des Utilisateurs
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Gérez les comptes, définissez les rôles (Lecture Seule vs Lecture/Écriture) et sécurisez les accès.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2.5 bg-[#C8102E] hover:bg-[#a50d26] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-950/40 transition-all active:scale-95 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nouvel Utilisateur</span>
        </button>
      </div>

      {/* Notifications */}
      {message && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs animate-fade-in ${
            message.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
              : 'bg-red-950/60 border-red-800 text-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* 3 Cartes de Répartition des Rôles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Administrateurs */}
        <div className="p-4 bg-[#171922] border border-red-900/30 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-red-400">Administrateurs</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {adminCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Accès total + gestion des utilisateurs et droits
          </p>
        </div>

        {/* Éditeurs (Lecture / Écriture) */}
        <div className="p-4 bg-[#171922] border border-blue-900/30 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Lecture / Écriture</span>
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {editorCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Saisie d'écritures, rapprochements et modifications de budget
          </p>
        </div>

        {/* Lecteurs (Lecture Seule) */}
        <div className="p-4 bg-[#171922] border border-emerald-900/30 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Lecture Seule</span>
            <Eye className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {viewerCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Consultation des tableaux de bord et exports PDF/Excel
          </p>
        </div>
      </div>

      {/* Tableau des Utilisateurs */}
      <div className="bg-[#171922] border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#C8102E]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Comptes Utilisateurs Actifs ({users.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Connecté en tant que <strong>{currentUser.username}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[650px]">
            <thead className="bg-[#0f1116] border-b border-slate-800 text-slate-400 font-bold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Utilisateur</th>
                <th className="py-3 px-4">Identifiant</th>
                <th className="py-3 px-4">Rôle & Permissions</th>
                <th className="py-3 px-4">Créé le</th>
                <th className="py-3 px-4">Dernier accès</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {users.map((user) => {
                const isMe = user.id === currentUser.id;
                return (
                  <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Nom */}
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-300 font-bold uppercase">
                        {user.name.charAt(0) || user.username.charAt(0)}
                      </div>
                      <div>
                        <span>{user.name}</span>
                        {isMe && (
                          <span className="ml-2 text-[10px] bg-red-950 text-red-300 border border-red-800 px-1.5 py-0.2 rounded font-semibold">
                            Vous
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Identifiant */}
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {user.username}
                    </td>

                    {/* Rôle Sélecteur direct */}
                    <td className="py-3 px-4">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user, e.target.value as UserRole)}
                        className={`text-xs font-bold rounded-lg px-2.5 py-1 border focus:outline-none cursor-pointer ${
                          user.role === 'admin'
                            ? 'bg-red-950/80 border-red-800 text-red-300'
                            : user.role === 'editor'
                            ? 'bg-blue-950/80 border-blue-800 text-blue-300'
                            : 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                        }`}
                        title="Changer le rôle de l'utilisateur"
                      >
                        <option value="admin" className="bg-slate-900 text-white">👑 Administrateur</option>
                        <option value="editor" className="bg-slate-900 text-white">✍️ Lecture & Écriture</option>
                        <option value="viewer" className="bg-slate-900 text-white">👁️ Lecture Seule</option>
                      </select>
                    </td>

                    {/* Date de création */}
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                    </td>

                    {/* Dernier accès */}
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {user.lastLoginAt ? (
                        new Date(user.lastLoginAt).toLocaleString('fr-FR')
                      ) : (
                        <span className="text-slate-600 italic">Jamais connecté</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUser(user);
                            setResetPasswordValue('');
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700"
                          title={`Changer le mot de passe de ${user.username}`}
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        </button>

                        <button
                          type="button"
                          disabled={isMe}
                          onClick={() => handleDeleteUser(user)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isMe
                              ? 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed'
                              : 'bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-200 border-red-900/60'
                          }`}
                          title={isMe ? 'Impossible de supprimer votre propre compte' : `Supprimer ${user.username}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CRÉATION NOUVEL UTILISATEUR */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181a22] border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-4 bg-gradient-to-r from-slate-900 to-[#181a22] border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#C8102E]" />
                Créer un Nouvel Utilisateur
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nom complet / Fonction *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Jean Dupont - Vice-Président"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C8102E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Identifiant de connexion *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: jdupont"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C8102E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mot de passe provisoire *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 4 caractères"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C8102E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Rôle & Droits d'Accès *
                </label>
                <div className="space-y-2 mt-1.5">
                  <label className="flex items-start gap-2.5 p-2.5 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                    <input
                      type="radio"
                      name="role"
                      value="editor"
                      checked={newRole === 'editor'}
                      onChange={() => setNewRole('editor')}
                      className="mt-0.5 text-blue-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                        Lecture & Écriture (Recommandé)
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Peut saisir des écritures, pointer des opérations et modifier les budgets.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                    <input
                      type="radio"
                      name="role"
                      value="viewer"
                      checked={newRole === 'viewer'}
                      onChange={() => setNewRole('viewer')}
                      className="mt-0.5 text-emerald-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        Lecture Seule
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Consulte les bilans, graphiques et télécharge les rapports sans droit de modification.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                    <input
                      type="radio"
                      name="role"
                      value="admin"
                      checked={newRole === 'admin'}
                      onChange={() => setNewRole('admin')}
                      className="mt-0.5 text-red-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                        Administrateur
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Accès complet y compris l'administration des utilisateurs et la sécurité.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#C8102E] hover:bg-[#a50d26] text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
                >
                  Créer l'utilisateur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RÉINITIALISATION MOT DE PASSE */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181a22] border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-4 bg-gradient-to-r from-slate-900 to-[#181a22] border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                Changer le Mot de Passe
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-5 space-y-4">
              <p className="text-xs text-slate-400">
                Définissez un nouveau mot de passe pour <strong>{editingUser.name}</strong> ({editingUser.username}) :
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nouveau mot de passe *
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Minimum 4 caractères"
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C8102E]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
                >
                  Valider le mot de passe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
