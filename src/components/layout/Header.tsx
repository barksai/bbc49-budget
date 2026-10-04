import React, { useState } from 'react';
import {
  FileDown,
  FileSpreadsheet,
  Save,
  PlusCircle,
  HardDriveDownload,
  Upload,
  CheckCircle2,
  Calendar,
  Wallet,
  Menu
} from 'lucide-react';
import { FiscalYear } from '../../types/budget';

interface HeaderProps {
  fiscalYears: FiscalYear[];
  currentFiscalYear: FiscalYear;
  onSelectFiscalYear: (id: string) => void;
  onAddNewFiscalYear: () => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
  onSaveData: () => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  totalCashAvailable: number;
  lastSavedAt?: string;
  isSaving: boolean;
  saveSuccess: boolean;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  fiscalYears,
  currentFiscalYear,
  onSelectFiscalYear,
  onAddNewFiscalYear,
  onExportPdf,
  onExportExcel,
  onSaveData,
  onExportJson,
  onImportJson,
  totalCashAvailable,
  lastSavedAt,
  isSaving,
  saveSuccess,
  onToggleMobileMenu,
}) => {
  const [showFileMenu, setShowFileMenu] = useState(false);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportJson(e.target.files[0]);
    }
  };

  return (
    <header className="h-16 bg-[#16181f] border-b border-slate-800 px-3 sm:px-6 flex items-center justify-between shrink-0 shadow-sm gap-2">
      {/* Left: Mobile Toggle, Fiscal Year Switcher & Cash Badge */}
      <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 -ml-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            title="Ouvrir le menu de navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center space-x-1.5 sm:space-x-2 bg-slate-900 px-2 sm:px-3 py-1.5 rounded-lg border border-slate-800 min-w-0">
          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C8102E] shrink-0" />
          <span className="hidden md:inline text-xs text-slate-400 font-medium">Exercice :</span>
          <select
            value={currentFiscalYear.id}
            onChange={(e) => onSelectFiscalYear(e.target.value)}
            className="bg-transparent text-xs sm:text-sm font-bold text-white focus:outline-none cursor-pointer pr-1 truncate max-w-[140px] sm:max-w-[200px]"
          >
            {fiscalYears.map((fy) => (
              <option key={fy.id} value={fy.id} className="bg-slate-900 text-white">
                {fy.label} {fy.isCurrent ? '(En cours)' : ''}
              </option>
            ))}
          </select>
          <button
            onClick={onAddNewFiscalYear}
            title="Créer un nouvel exercice"
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
          </button>
        </div>

        {/* Cash quick badge */}
        <div className="flex items-center space-x-1.5 bg-slate-900/80 px-2 sm:px-3 py-1.5 rounded-lg border border-slate-800/80 shrink-0">
          <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
          <span className="hidden lg:inline text-xs text-slate-400">Trésorerie :</span>
          <span className="text-xs font-bold text-emerald-400 font-mono">
            {totalCashAvailable.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
          </span>
        </div>
      </div>

      {/* Right: Actions, Export & Save */}
      <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
        {/* Export PDF Button */}
        <button
          onClick={onExportPdf}
          className="flex items-center space-x-1.5 px-2 sm:px-3 py-1.5 bg-[#C8102E] hover:bg-[#a50d26] text-white text-xs font-bold rounded-lg shadow-sm transition-all shadow-red-950/40 active:scale-95"
          title="Exporter le rapport d'AG & Bilan au format PDF A4"
        >
          <FileDown className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Export PDF</span>
        </button>

        {/* Export Excel Button */}
        <button
          onClick={onExportExcel}
          className="flex items-center space-x-1.5 px-2 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all shadow-emerald-950/40 active:scale-95"
          title="Exporter le classeur Excel multi-onglets complet"
        >
          <FileSpreadsheet className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Export Excel</span>
        </button>

        {/* Save button */}
        <button
          onClick={onSaveData}
          disabled={isSaving}
          className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            saveSuccess
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
          }`}
          title="Enregistrer les modifications sur le serveur"
        >
          {saveSuccess ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
          ) : (
            <Save className="w-4 h-4 text-slate-300 shrink-0" />
          )}
          <span className="hidden xs:inline sm:inline">{saveSuccess ? 'Enregistré !' : isSaving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
        </button>

        {/* Data menu dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowFileMenu(!showFileMenu)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 text-xs font-medium"
            title="Gestion des sauvegardes & Fichiers"
          >
            Données ▼
          </button>

          {showFileMenu && (
            <div
              className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-2 z-50 text-xs text-slate-200 space-y-1"
              onMouseLeave={() => setShowFileMenu(false)}
            >
              <div className="px-3 py-1 text-[11px] font-bold text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                Sauvegarde & Fichiers
              </div>
              <button
                onClick={() => {
                  onExportJson();
                  setShowFileMenu(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2"
              >
                <HardDriveDownload className="w-3.5 h-3.5 text-blue-400" />
                <span>Télécharger copie JSON (.json)</span>
              </button>
              <label className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Restaurer depuis fichier JSON</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    handleFileInput(e);
                    setShowFileMenu(false);
                  }}
                />
              </label>
              {lastSavedAt && (
                <div className="px-3 py-1.5 text-[10px] text-slate-500 border-t border-slate-800">
                  Dernier enregistrement :<br />
                  <span className="font-mono text-slate-400">
                    {new Date(lastSavedAt).toLocaleTimeString('fr-FR')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
