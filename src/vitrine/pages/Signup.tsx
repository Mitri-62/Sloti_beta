import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { Eye, EyeOff, AlertCircle, CheckCircle, Loader } from "lucide-react";
import logo from "../../assets/Sloti.svg";

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Infos récupérées depuis user_metadata
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [role, setRole] = useState<string>("employee");
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    const verifyInvitation = async () => {
      console.log('🔍 Checking invitation...');
      console.log('📍 URL params:', Object.fromEntries(searchParams));
      console.log('📍 Hash:', window.location.hash);
      
      // Récupérer le token_hash depuis les query params
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');
      
      // Ou depuis le hash fragment (ancien format)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const hashType = hashParams.get('type');
      
      console.log('🔑 Token hash:', tokenHash);
      console.log('🔑 Access token from hash:', accessToken);
      console.log('📝 Type:', type || hashType);

      // Cas 1: token_hash dans les query params (nouveau format)
      if (tokenHash && type === 'invite') {
        console.log('⏳ Verifying token_hash...');
        
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'invite',
        });
        
        if (verifyError) {
          console.error('❌ Verify error:', verifyError);
          setError("Le lien d'invitation est invalide ou a expiré. Demandez une nouvelle invitation.");
          setVerifying(false);
          return;
        }
        
        if (data.session && data.user) {
          console.log('✅ Session created via token_hash');
          await processUser(data.user);
          return;
        }
      }
      
      // Cas 2: Vérifier s'il y a déjà une session active
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('✅ Existing session found');
        await processUser(session.user);
        return;
      }
      
      // Cas 3: access_token dans le hash (format Supabase par défaut)
      if (accessToken && accessToken.length > 10) {
        console.log('⏳ Waiting for Supabase to process hash...');
        
        // Attendre un peu que Supabase traite le hash
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: { session: newSession } } = await supabase.auth.getSession();
        
        if (newSession?.user) {
          console.log('✅ Session created from hash');
          await processUser(newSession.user);
          return;
        }
      }
      
      // Aucune invitation valide trouvée
      console.log('❌ No valid invitation found');
      setError("Aucune invitation valide trouvée. Vérifiez votre lien ou demandez une nouvelle invitation.");
      setVerifying(false);
    };

    const processUser = async (user: any) => {
      console.log('👤 Processing user:', user.email);
      console.log('📦 User metadata:', user.user_metadata);

      const metadata = user.user_metadata || {};
      
      setCompanyId(metadata.company_id || null);
      setRole(metadata.role || 'employee');
      setFullName(metadata.full_name || '');
      setUserEmail(user.email || '');

      // Récupérer le nom de la company
      if (metadata.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('name')
          .eq('id', metadata.company_id)
          .single();
        
        if (company) {
          setCompanyName(company.name);
        }
      }

      setVerifying(false);
    };

    verifyInvitation();
  }, [searchParams]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Le nom complet est requis.");
      return;
    }

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      console.log('🔐 Starting signup process...');
      
      // 1. Récupérer l'utilisateur actuel
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 Current user:', user);
      
      if (!user) {
        throw new Error("Session invalide. Veuillez cliquer à nouveau sur le lien d'invitation.");
      }

      // 2. Mettre à jour le mot de passe
      console.log('📝 Updating password...');
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
        data: {
          full_name: fullName,
        }
      });

      if (updateError) throw updateError;
      console.log('✅ Password updated');

      // 3. Mettre à jour la table users (l'Edge Function a déjà créé l'entrée)
      console.log('💾 Updating users table...');
      const { error: userError } = await supabase
        .from("users")
        .update({
          full_name: fullName,
        })
        .eq('id', user.id);

      if (userError) {
        console.log('⚠️ Update error:', userError);
        // Si pas trouvé, essayer d'insérer
        if (userError.code === 'PGRST116') {
          const { error: insertError } = await supabase.from("users").insert({
            id: user.id,
            email: user.email!,
            company_id: companyId,
            role: role,
            full_name: fullName,
          });
          if (insertError && insertError.code !== '23505') throw insertError;
        }
      }
      
      console.log('✅ User profile updated');

      // 4. Rediriger vers l'app
      console.log('🚀 Redirecting to /app...');
      navigate("/app");
      
    } catch (err: any) {
      console.error("❌ Signup error:", err);
      setError(err.message || "Erreur lors de la création du compte");
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader className="mx-auto animate-spin text-blue-600" size={48} />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Vérification de votre invitation...
          </p>
        </div>
      </div>
    );
  }

  // Si erreur et pas d'email = invitation invalide
  if (error && !userEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 sm:p-10 rounded-2xl shadow-xl text-center">
          <img src={logo} alt="Sloti Logo" className="mx-auto h-16 w-auto mb-6" />
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">{error}</p>
          </div>
          <a 
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 sm:p-10 rounded-2xl shadow-xl">
        {/* Logo + Titre */}
        <div className="text-center mb-8">
          <img src={logo} alt="Sloti Logo" className="mx-auto h-16 w-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            Bienvenue chez Sloti
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {companyName ? (
              <>Finalisez votre inscription pour <span className="font-semibold text-blue-600">{companyName}</span></>
            ) : (
              <>Finalisez votre inscription</>
            )}
          </p>
          {userEmail && (
            <p className="mt-1 text-sm text-gray-500">{userEmail}</p>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSignup} className="space-y-5">
          {/* Nom complet */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nom complet <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex: Jean Dupont"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white"
              required
              autoFocus
            />
          </div>

          {/* Mot de passe */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Choisissez un mot de passe <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
                className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Confirmation */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirmez le mot de passe <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retapez le mot de passe"
                className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:outline-none dark:bg-gray-700 dark:text-white ${
                  confirmPassword && password !== confirmPassword
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle size={12} /> Les mots de passe ne correspondent pas
              </p>
            )}
            {confirmPassword && password === confirmPassword && password.length >= 8 && (
              <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                <CheckCircle size={12} /> Les mots de passe correspondent
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !fullName.trim() || password.length < 8 || password !== confirmPassword}
            className="w-full py-3 rounded-lg text-white font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-green-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader className="animate-spin" size={20} />
                <span>Création...</span>
              </div>
            ) : (
              "Créer mon compte"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
