import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, LogIn, Loader2, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code === 'auth/invalid-credential') {
        setError('E-mail ou senha incorretos.');
      } else if (firebaseError.code === 'auth/too-many-requests') {
        setError('Muitas tentativas. Aguarde alguns minutos.');
      } else {
        setError('Erro ao fazer login. Tente novamente.');
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4">
      <div className="w-full max-w-[440px]">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#1b365d] shadow-sm mb-4">
            <Shield className="w-10 h-10 text-orange-400" strokeWidth={1.8} />
          </div>
          <h1 className="text-[26px] font-bold text-[#111827] tracking-tight">Guarda Mirim de Mauá</h1>
          <p className="text-[15px] text-gray-500 font-medium">Painel Administrativo</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-100 p-8 space-y-6"
        >
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="guardamirimdemaua@hotmail.com"
              required
              className="w-full px-4 py-3 border border-slate-200 bg-[#e8f0fe] rounded-lg focus:bg-white focus:border-[#1b365d] outline-none text-base text-gray-800 transition-all shadow-inner"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              required
              className="w-full px-4 py-3 border border-slate-200 bg-[#e8f0fe] rounded-lg focus:bg-white focus:border-[#1b365d] outline-none text-base text-gray-800 transition-all shadow-inner"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#1b365d] text-white font-semibold rounded-lg hover:bg-[#142947] focus:ring-2 focus:ring-[#1b365d]/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-base shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Entrar
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
