import React, { useState, useEffect } from 'react';
import { Lock, User as UserIcon, ShieldCheck, ArrowRight, Eye, EyeOff, AlertCircle, Sparkles } from 'lucide-react';
import { authService } from '../../services/auth';
import { User } from '../../types/auth';
import { BasketballGame } from './BasketballGame';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isFirstSetup, setIsFirstSetup] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await authService.getSetupStatus();
        setIsFirstSetup(!status.initialized);
      } catch {
        setIsFirstSetup(false);
      }
    };
    checkStatus();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError('Veuillez renseigner votre identifiant et votre mot de passe.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.login({ username: username.trim(), password });
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError(res.error || 'Identifiant ou mot de passe incorrect.');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la connexion.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('Veuillez renseigner un identifiant et un mot de passe.');
      return;
    }
    if (password.length < 4) {
      setError('Le mot de passe doit comporter au moins 4 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.setupAdmin({
        username: username.trim(),
        password,
        name: fullName.trim() || 'Administrateur',
      });
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError(res.error || "Erreur lors de l'initialisation de l'administrateur.");
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0f14] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/20 via-[#0d0f14] to-[#090a0d] flex items-center justify-center p-3 sm:p-6 text-slate-100">
      <div className="w-full max-w-lg space-y-4">
        {/* Card Principale */}
        <div className="bg-[#161821] border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          {/* Lueur supérieure */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-[#C8102E] to-transparent opacity-80" />

          {/* 1. Logo tout en haut centré */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative group mb-3">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-[#C8102E] shadow-2xl shadow-red-950/80 bg-black flex items-center justify-center transition-transform group-hover:scale-105 duration-300">
                <img
                  src="./logo.jpg"
                  alt="Bouchemaine Basket Club"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 w-5 h-5 rounded-full border-2 border-[#161821] shadow flex items-center justify-center text-[10px]" title="Serveur opérationnel">
                ✓
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Bouchemaine Basket Club
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Plateforme de Gestion & Suivi Budgétaire (BBC49)
            </p>
          </div>

          {/* Message d'erreur */}
          {error && (
            <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-200 flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode Premier Accès (Setup Admin) vs Mode Login Standard */}
          {isFirstSetup ? (
            /* FORMULAIRE DE CRÉATION DU PREMIER COMPTE ADMIN */
            <form onSubmit={handleSetupAdmin} className="space-y-3.5">
              <div className="p-3 bg-purple-950/40 border border-purple-800/60 rounded-xl text-xs text-purple-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                <span>
                  <strong>Premier accès :</strong> Créez le compte Super-Administrateur de votre association.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nom complet / Fonction
                </label>
                <input
                  type="text"
                  placeholder="ex: Pierre - Trésorier BBC49"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C8102E] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Identifiant de connexion *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="ex: admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C8102E] transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Mot de passe *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-9 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C8102E] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Confirmation *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C8102E] transition-colors"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 bg-[#C8102E] hover:bg-[#a50d26] disabled:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-950/60 flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                {isLoading ? (
                  <span>Initialisation en cours...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Créer le compte Administrateur & Entrer</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* FORMULAIRE DE CONNEXION STANDARD */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nom d'utilisateur
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Nom d'utilisateur"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C8102E] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-9 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C8102E] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300"
                    title={showPassword ? 'Masquer' : 'Afficher'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#C8102E] hover:bg-[#a50d26] disabled:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-950/60 flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                {isLoading ? (
                  <span>Connexion en cours...</span>
                ) : (
                  <>
                    <span>Accéder à l'application</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* 2. Mini-jeu de basket Angry Birds SOUS les champs login et mdp */}
          <BasketballGame />
        </div>

        {/* Footer d'information de sécurité */}
        <div className="text-center text-[11px] text-slate-400 space-y-1">
          <p className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Accès sécurisé pour reverse proxy &bull; Session persistante</span>
          </p>
          <p className="text-slate-400">
            &copy; {new Date().getFullYear()} Bouchemaine Basket Club &bull; Tous droits réservés
          </p>
        </div>
      </div>
    </div>
  );
};
