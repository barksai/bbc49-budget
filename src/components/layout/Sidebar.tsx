import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  CalendarRange,
  Landmark,
  Presentation,
  FileSpreadsheet,
  TrendingUp,
  FolderOpen,
  ShieldCheck,
  Lock,
  Unlock,
  AlertCircle,
  Server,
  X,
  Users,
  LogOut,
  Sparkles
} from 'lucide-react';
import { StorageStatus } from '../../services/storage';
import { User } from '../../types/auth';

export type TabKey =
  | 'dashboard'
  | 'transactions'
  | 'monthly'
  | 'accounts'
  | 'general_assembly'
  | 'income_statement'
  | 'forecast'
  | 'admin_users';

interface SidebarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  storageStatus: StorageStatus;
  currentUser: User | null;
  onLogout: () => void;
  onOpenDataFolder: () => void;
  onForceUnlock: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  storageStatus,
  currentUser,
  onLogout,
  onOpenDataFolder,
  onForceUnlock,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const navItems: { id: TabKey; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'dashboard',
      label: 'Tableau de Bord',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'transactions',
      label: 'Saisie des Données',
      icon: <Receipt className="w-5 h-5" />,
    },
    {
      id: 'monthly',
      label: 'Réalisation Mensuelle',
      icon: <CalendarRange className="w-5 h-5" />,
    },
    {
      id: 'accounts',
      label: 'Comptes Bancaires',
      icon: <Landmark className="w-5 h-5" />,
    },
    {
      id: 'general_assembly',
      label: 'Synthèse AG',
      icon: <Presentation className="w-5 h-5" />,
      badge: 'Mode AG',
    },
    {
      id: 'income_statement',
      label: 'Compte de Résultat',
      icon: <FileSpreadsheet className="w-5 h-5" />,
    },
    {
      id: 'forecast',
      label: 'Budget Prévisionnel',
      icon: <TrendingUp className="w-5 h-5" />,
      badge: 'Scénarios',
    },
  ];

  if (currentUser?.role === 'admin') {
    navItems.push({
      id: 'admin_users',
      label: 'Administration',
      icon: <Users className="w-5 h-5" />,
      badge: 'Admin',
    });
  }

  return (
    <aside
      className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#111317] border-r border-slate-800 flex flex-col justify-between shrink-0 select-none shadow-2xl md:shadow-xl transition-transform duration-300 ease-in-out ${
        isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
    >
      {/* Club Branding Header & Navigation */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-gradient-to-b from-slate-900 to-[#111317]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3.5">
              <div className="relative group">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-[#C8102E] shadow-md shadow-red-900/30 flex items-center justify-center bg-black">
                  <img
                    src="./logo.jpg"
                    alt="Bouchemaine Basket Club"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" title="Application Active" />
              </div>
              <div>
                <h1 className="font-extrabold text-sm tracking-wide text-white uppercase leading-tight font-sans">
                  Bouchemaine
                </h1>
                <span className="text-xs font-black tracking-wider text-[#C8102E] uppercase block">
                  Basket Club
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                  Pilotage Budgétaire
                </p>
              </div>
            </div>

            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="md:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                title="Fermer le menu"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1.5 mt-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile?.();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#C8102E] text-white shadow-md shadow-red-900/40 translate-x-0.5'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className={isActive ? 'text-white' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      isActive
                        ? 'bg-black/30 text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Card & Logout Button directly under the tabs */}
        {currentUser && (
          <div className="px-3 pt-2 mt-2 border-t border-slate-800/80">
            <div className="bg-slate-900/80 rounded-xl p-2.5 border border-slate-800/90 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#C8102E] to-red-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate leading-tight">
                      {currentUser.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">
                      @{currentUser.username}
                    </p>
                  </div>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 border ${
                  currentUser.role === 'admin'
                    ? 'bg-purple-950/60 text-purple-300 border-purple-800/50'
                    : currentUser.role === 'editor'
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50'
                    : 'bg-amber-950/60 text-amber-300 border-amber-800/50'
                }`}>
                  {currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'editor' ? 'Éditeur' : 'Lecture'}
                </span>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="w-full flex items-center justify-center space-x-2 px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/50 text-red-300 hover:text-white border border-red-900/50 text-xs font-medium transition-colors"
                title="Se déconnecter"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Se déconnecter</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cloud & Local Portability Footer + Version Medallion */}
      <div className="p-3.5 border-t border-slate-800/80 bg-[#0d0e12] space-y-2.5 shrink-0">
        {/* Drive & Lock Status */}
        <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              {storageStatus.isServer ? (
                <>
                  <Server className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Serveur Portainer</span>
                </>
              ) : storageStatus.isElectron ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Standalone PC</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mode Web Navigateur</span>
                </>
              )}
            </span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
              storageStatus.isServer
                ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/50'
                : 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
            }`}>
              {storageStatus.isServer ? 'DOCKER' : 'STANDALONE'}
            </span>
          </div>

          {storageStatus.isLockedByOther ? (
            <div className="bg-amber-950/40 border border-amber-800/50 rounded p-1.5 text-[11px] text-amber-300 space-y-1">
              <div className="flex items-center gap-1 text-amber-400 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                Fichier verrouillé
              </div>
              <p className="text-[10px] text-amber-300/80 leading-tight">
                Ouvert par {storageStatus.lockDetails?.user || 'autre PC'} sur Drive. Mode lecture seule actif.
              </p>
              <button
                onClick={onForceUnlock}
                className="w-full mt-1 py-1 px-1.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 text-[10px] rounded flex items-center justify-center gap-1"
              >
                <Unlock className="w-3 h-3" /> Forcer déverrouillage
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Verrouillage automatique actif</span>
            </div>
          )}

          {storageStatus.isElectron && (
            <button
              onClick={onOpenDataFolder}
              className="w-full mt-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
              <span>Ouvrir dossier /data</span>
            </button>
          )}
        </div>

        {/* Application Version Medallion (Bas à gauche) */}
        <div className="flex items-center justify-between pt-1 text-left">
          <div className="flex items-center space-x-2">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/70 shadow-inner group">
              <Sparkles className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] font-black tracking-wider text-white uppercase font-mono">BBC49</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#C8102E]/20 text-[#ff5c7c] border border-[#C8102E]/40 font-mono">
                  v2.4.0
                </span>
              </div>
              <p className="text-[9px] text-slate-400 font-medium">Bouchemaine Basket</p>
            </div>
          </div>
          <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
            Prod
          </span>
        </div>
      </div>
    </aside>
  );
};
