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
  Menu,
  ChevronDown
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
    <header className="h-16 bg-[#16181f] border-b border-slate-800 px-2 sm:px-4 lg:px-6 flex items-center justify-between shrink-0 shadow-sm gap-1.5 sm:gap-3">
      {/* Left: Mobile Toggle, Fiscal Year Switcher & Cash Badge */}
      <div className="flex items-center space-x-1.5 sm:space-x-2.5 min-w-0">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden p-1.5 sm:p-2 -ml-0.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            title="Ouvrir le menu de navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Exercice selector */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 bg-slate-900 px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-800 min-w-0">
          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C8102E] shrink-0" />
          <span className="hidden xl:inline text-xs text-slate-400 font-medium">Exercice :</span>
          <select
            value={currentFiscalYear.id}
            onChange={(e) => onSelectFiscalYear(e.target.value)}
            className="bg-transparent text-xs sm:text-sm font-bold text-white focus:outline-none cursor-pointer pr-1 truncate max-w-[105px] xs:max-w-[130px] sm:max-w-[160px] md:max-w-[180px] lg:max-w-[210px]"
          >
            {fiscalYears.map((fy) => (
              <option key={fy.id} value={fy.id} className="bg-slate-900 text-white">
                {fy.label} {fy.isCurrent ? '(En cours)' : ''}
              </option>
            ))}
          </select>
          <button
            onClick={onAddNewFiscalYear}
            title="Créer un nouvel exercice budgétaire"
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-400 transition-colors shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
          </button>
        </div>

        {/* Cash Quick Badge */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 bg-slate-900/90 px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-800/80 shrink-0">
          <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
          <span className="hidden xl:inline text-xs text-slate-400">Trésorerie :</span>
          <span className="text-xs font-bold text-emerald-400 font-mono">
            {totalCashAvailable.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
          </span>
        </div>
      </div>

      {/* Right: Actions, Export & Save */}
      <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
        {/* Direct Dedicated Export Buttons (Visible on desktop >= xl to avoid any overlap on smaller screens) */}
        <div className="hidden xl:flex items-center space-x-2">
          <button
            onClick={onExportPdf}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#C8102E] hover:bg-[#a50d26] text-white text-xs font-bold rounded-lg shadow-sm transition-all shadow-red-950/40 active:scale-95 shrink-0"
            title="Exporter le rapport d'AG & Bilan au format PDF A4"
          >
            <FileDown className="w-3.5 h-3.5 shrink-0" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={onExportExcel}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all shadow-emerald-950/40 active:scale-95 shrink-0"
            title="Exporter le classeur Excel multi-onglets complet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
            <span>Export Excel</span>
          </button>
        </div>

        {/* Primary Action: Save Button (Always prominently visible, responsive label) */}
        <button
          onClick={onSaveData}
          disabled={isSaving}
          className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 ${
            saveSuccess
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-900/40'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
          }`}
          title="Enregistrer les modifications sur le serveur"
        >
          {saveSuccess ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
          ) : (
            <Save className="w-4 h-4 text-slate-300 shrink-0" />
          )}
          <span className="hidden lg:inline">
            {saveSuccess ? 'Enregistré !' : isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </span>
        </button>

        {/* Actions & Data Dropdown Menu */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowFileMenu(!showFileMenu)}
            className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 text-xs font-semibold transition-colors"
            title="Actions, exports et gestion des fichiers"
          >
            <span className="xl:hidden flex items-center gap-1">
              <FileDown className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Actions</span>
            </span>
            <span className="hidden xl:inline">Données</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Backdrop for click outside (Closes reliably on mobile tap or desktop click) */}
          {showFileMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowFileMenu(false)}
              />
              <div
                className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 text-xs text-slate-200 divide-y divide-slate-800"
              >
                {/* Mobile / Tablet Exports (Available here when screen is < xl) */}
                <div className="xl:hidden py-1">
                  <div className="px-3 py-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Exports Officiels
                  </div>
                  <button
                    onClick={() => {
                      onExportPdf();
                      setShowFileMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                  >
                    <FileDown className="w-4 h-4 text-red-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white">Exporter en PDF</div>
                      <div className="text-[10px] text-slate-400">Rapport d'AG & Compte de résultat A4</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      onExportExcel();
                      setShowFileMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white">Exporter en Excel (.xlsx)</div>
                      <div className="text-[10px] text-slate-400">Classeur complet multi-onglets</div>
                    </div>
                  </button>
                </div>

                {/* Backups & Restore */}
                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Sauvegarde & Restauration
                  </div>
                  <button
                    onClick={() => {
                      onExportJson();
                      setShowFileMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                  >
                    <HardDriveDownload className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white">Sauvegarde JSON</div>
                      <div className="text-[10px] text-slate-400">Télécharger une copie intégrale</div>
                    </div>
                  </button>
                  <label className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white">Restaurer un fichier JSON</div>
                      <div className="text-[10px] text-slate-400">Importer des données existantes</div>
                    </div>
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
                </div>

                {lastSavedAt && (
                  <div className="px-3 py-2 text-[10px] text-slate-400 bg-slate-950/40">
                    Dernier enregistrement serveur :<br />
                    <span className="font-mono text-emerald-400 font-bold">
                      {new Date(lastSavedAt).toLocaleTimeString('fr-FR')}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
