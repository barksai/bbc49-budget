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
  ChevronDown,
  Eye
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
  isReadOnly?: boolean;
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
  isReadOnly = false,
}) => {
  const [showFileMenu, setShowFileMenu] = useState(false);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportJson(e.target.files[0]);
    }
  };

  return (
    <header className="bg-[#16181f] border-b border-slate-800 shrink-0 shadow-sm z-30">
      {/* ========================================================================= */}
      {/* 1. VERSION MOBILE (< md, écrans smartphones) : 2 Rangées SÉPARÉES & NETTES */}
      {/* ========================================================================= */}
      <div className="flex md:hidden flex-col">
        {/* Rangée 1 Mobile : Navigation, Trésorerie & Actions principales */}
        <div className="h-12 px-3 flex items-center justify-between gap-2 border-b border-slate-800/70 bg-[#16181f]">
          {/* Gauche : Hamburger + Badge Trésorerie */}
          <div className="flex items-center gap-2 min-w-0">
            {onToggleMobileMenu && (
              <button
                type="button"
                onClick={onToggleMobileMenu}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-900 border border-slate-800 active:scale-95 transition-all shrink-0"
                title="Ouvrir le menu de navigation"
              >
                <Menu className="w-4 h-4 text-slate-200" />
              </button>
            )}

            <div className="flex items-center gap-1.5 bg-slate-900/90 px-2 py-1 rounded-lg border border-slate-800 shrink-0">
              <Wallet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] text-slate-400">Tréso :</span>
              <span className="text-xs font-bold text-emerald-400 font-mono">
                {totalCashAvailable.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
              </span>
            </div>
          </div>

          {/* Droite : Sauvegarder + Menu Actions/Exports */}
          {!isReadOnly ? (
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Bouton Sauvegarder */}
              <button
                onClick={onSaveData}
                disabled={isSaving}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border active:scale-95 ${
                  saveSuccess
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-950'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                }`}
                title="Enregistrer les modifications sur le serveur"
              >
                {saveSuccess ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
                ) : (
                  <Save className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                )}
                <span>{saveSuccess ? 'OK !' : isSaving ? '...' : 'Sauver'}</span>
              </button>

              {/* Menu Actions / Exports Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowFileMenu(!showFileMenu)}
                  className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 text-xs font-semibold active:scale-95 transition-colors"
                  title="Actions, exports et fichiers"
                >
                  <FileDown className="w-3.5 h-3.5 text-blue-400" />
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {/* Menu déroulant Mobile */}
                {showFileMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowFileMenu(false)}
                    />
                    <div
                      className="absolute right-0 top-full mt-1.5 w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 text-xs text-slate-200 divide-y divide-slate-800"
                    >
                      <div className="py-1">
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
                            <div className="text-[10px] text-slate-400">Rapport AG & Bilan A4</div>
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
                            <div className="text-[10px] text-slate-400">Classeur multi-onglets</div>
                          </div>
                        </button>
                      </div>

                      <div className="py-1">
                        <div className="px-3 py-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                          Sauvegarde & Données
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
                            <div className="text-[10px] text-slate-400">Télécharger copie intégrale</div>
                          </div>
                        </button>
                        <label className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer transition-colors">
                          <Upload className="w-4 h-4 text-amber-400 shrink-0" />
                          <div>
                            <div className="font-bold text-white">Restaurer un fichier JSON</div>
                            <div className="text-[10px] text-slate-400">Importer une sauvegarde</div>
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
                        <div className="px-3 py-1.5 text-[10px] text-slate-400 bg-slate-950/40">
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
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-semibold shrink-0">
              <Eye className="w-3.5 h-3.5" />
              <span>Lecture seule</span>
            </div>
          )}
        </div>

        {/* Rangée 2 Mobile : Sélecteur d'exercice & Bouton + Nouveau */}
        <div className="h-10 px-3 flex items-center justify-between gap-2 bg-[#12141a]">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <Calendar className="w-3.5 h-3.5 text-[#C8102E] shrink-0" />
            <span className="text-[11px] text-slate-400 font-medium shrink-0">Exercice :</span>
            <select
              value={currentFiscalYear.id}
              onChange={(e) => onSelectFiscalYear(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-white text-xs font-bold rounded-lg px-2 py-1 flex-1 min-w-0 focus:outline-none focus:border-[#C8102E] truncate"
            >
              {fiscalYears.map((fy) => (
                <option key={fy.id} value={fy.id} className="bg-slate-900 text-white">
                  {fy.label} {fy.isCurrent ? '(En cours)' : ''}
                </option>
              ))}
            </select>
          </div>

          {!isReadOnly && (
            <button
              onClick={onAddNewFiscalYear}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-800 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors"
              title="Créer un nouvel exercice budgétaire"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Nouveau</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. VERSION DESKTOP & TABLETTE (>= md) : 1 SEULE LIGNE HORIZONTALE AÉRÉE   */}
      {/* ========================================================================= */}
      <div className="hidden md:flex items-center justify-between h-16 px-4 lg:px-6 gap-3">
        {/* Gauche : Sélecteur d'exercice & Badge de trésorerie */}
        <div className="flex items-center space-x-3 min-w-0">
          {/* Sélecteur d'exercice */}
          <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 min-w-0">
            <Calendar className="w-4 h-4 text-[#C8102E] shrink-0" />
            <span className="hidden xl:inline text-xs text-slate-400 font-medium">Exercice :</span>
            <select
              value={currentFiscalYear.id}
              onChange={(e) => onSelectFiscalYear(e.target.value)}
              className="bg-transparent text-xs sm:text-sm font-bold text-white focus:outline-none cursor-pointer pr-1 truncate max-w-[150px] lg:max-w-[220px]"
            >
              {fiscalYears.map((fy) => (
                <option key={fy.id} value={fy.id} className="bg-slate-900 text-white">
                  {fy.label} {fy.isCurrent ? '(En cours)' : ''}
                </option>
              ))}
            </select>
            {!isReadOnly && (
              <button
                onClick={onAddNewFiscalYear}
                title="Créer un nouvel exercice budgétaire"
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-400 transition-colors shrink-0"
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" />
              </button>
            )}
          </div>

          {/* Badge Trésorerie */}
          <div className="flex items-center space-x-2 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800/80 shrink-0">
            <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="hidden xl:inline text-xs text-slate-400">Trésorerie :</span>
            <span className="text-xs font-bold text-emerald-400 font-mono">
              {totalCashAvailable.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
            </span>
          </div>
        </div>

        {/* Droite : Boutons d'action, Sauvegarde & Exports */}
        {isReadOnly ? (
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-semibold shrink-0">
            <Eye className="w-4 h-4" />
            <span>Mode Lecture Seule</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2 shrink-0">
          {/* Boutons directs Export PDF & Excel (sur grands écrans >= xl) */}
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

          {/* Bouton Sauvegarder principal */}
          <button
            onClick={onSaveData}
            disabled={isSaving}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 ${
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
            <span>
              {saveSuccess ? 'Enregistré !' : isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
            </span>
          </button>

          {/* Menu Données & Fichiers */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowFileMenu(!showFileMenu)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 text-xs font-semibold transition-colors"
              title="Actions, exports et gestion des fichiers"
            >
              <span className="xl:hidden flex items-center gap-1">
                <FileDown className="w-3.5 h-3.5 text-blue-400" />
                <span>Actions</span>
              </span>
              <span className="hidden xl:inline">Données</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Dropdown Desktop avec Backdrop */}
            {showFileMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowFileMenu(false)}
                />
                <div
                  className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 text-xs text-slate-200 divide-y divide-slate-800"
                >
                  {/* Sur tablettes < xl, proposer aussi PDF et Excel ici */}
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
                        <div className="text-[10px] text-slate-400">Rapport d'AG & Bilan A4</div>
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
                        <div className="text-[10px] text-slate-400">Importer des données</div>
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
      )}
      </div>
    </header>
  );
};
