import React, { useState } from 'react';
import { Plus, X, Calendar, Copy } from 'lucide-react';
import { FiscalYear } from '../../types/budget';

interface NewFiscalYearModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingYears: FiscalYear[];
  onCreate: (newYear: FiscalYear, copyBudgetId?: string) => void;
}

export const NewFiscalYearModal: React.FC<NewFiscalYearModalProps> = ({
  isOpen,
  onClose,
  existingYears,
  onCreate,
}) => {
  const [label, setLabel] = useState('Saison 2026-2027');
  const [startDate, setStartDate] = useState('2026-09-01');
  const [endDate, setEndDate] = useState('2027-08-31');
  const [copyBudgetId, setCopyBudgetId] = useState<string>(existingYears[0]?.id || '');
  const [isCurrent, setIsCurrent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label) return;

    const id = `fy-${Date.now()}`;
    const newYear: FiscalYear = {
      id,
      label,
      startDate,
      endDate,
      isCurrent,
      treasurerNotes: '',
      scenarios: {
        optimistic: { revenuePercent: 8, expensePercent: -3 },
        neutral: { revenuePercent: 0, expensePercent: 0 },
        pessimistic: { revenuePercent: -8, expensePercent: 6 },
      },
    };

    onCreate(newYear, copyBudgetId || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#181a22] border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-slate-900 to-[#181a22] border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#C8102E]" />
            Créer un Nouvel Exercice Budgétaire
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Libellé de l'exercice *
            </label>
            <input
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ex: Saison 2026-2027"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Date de début *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Date de fin *
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Reconduire le budget prévisionnel depuis :
            </label>
            <select
              value={copyBudgetId}
              onChange={(e) => setCopyBudgetId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
            >
              <option value="">-- Démarrer avec un budget vierge (0 €) --</option>
              {existingYears.map((fy) => (
                <option key={fy.id} value={fy.id}>
                  Copier les montants prévus de : {fy.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="isCurrentYear"
              checked={isCurrent}
              onChange={(e) => setIsCurrent(e.target.checked)}
              className="rounded border-slate-700 text-[#C8102E]"
            />
            <label htmlFor="isCurrentYear" className="text-xs text-slate-300">
              Définir comme exercice actif par défaut
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#C8102E] text-white text-xs font-bold rounded-lg shadow-md"
            >
              Créer l'exercice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
