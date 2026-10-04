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
  Server
} from 'lucide-react';
import { StorageStatus } from '../../services/storage';

export type TabKey =
  | 'dashboard'
  | 'transactions'
  | 'monthly'
  | 'accounts'
  | 'general_assembly'
  | 'income_statement'
  | 'forecast';

interface SidebarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  storageStatus: StorageStatus;
  onOpenDataFolder: () => void;
  onForceUnlock: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  storageStatus,
  onOpenDataFolder,
  onForceUnlock,
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

  return (
    <aside className="w-64 bg-[#111317] border-r border-slate-800 flex flex-col justify-between shrink-0 select-none shadow-xl">
      {/* Club Branding Header */}
      <div>
        <div className="p-5 border-b border-slate-800/80 bg-gradient-to-b from-slate-900 to-[#111317]">
          <div className="flex items-center space-x-3.5">
            <div className="relative group">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#C8102E] shadow-md shadow-red-900/30 flex items-center justify-center bg-black">
                <img
                  src="./logo.jpg"
                  alt="Bouchemaine Basket Club"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to text initials if image path fails
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" title="Application Standalone Active" />
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
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1.5 mt-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
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
      </div>

      {/* Cloud & Local Portability Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-[#0d0e12] space-y-3">
        {/* Drive & Lock Status */}
        <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              {storageStatus.isServer ? (
                <>
                  <Server className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Serveur Debian (Portainer)</span>
                </>
              ) : storageStatus.isElectron ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Standalone PC / Drive</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mode Local Navigateur</span>
                </>
              )}
            </span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
              storageStatus.isServer
                ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/50'
                : 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
            }`}>
              {storageStatus.isServer ? 'DOCKER' : 'v1.0'}
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
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Verrou d'accès exclusif actif</span>
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
      </div>
    </aside>
  );
};
