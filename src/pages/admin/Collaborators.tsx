/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps, @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { db, firebaseConfig } from '../../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import { addAuditLog, type Collaborator } from '../../lib/audit';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  UserPlus,
  Trash2,
  Mail,
  User,
  Key,
  Loader2,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

// Get or initialize secondary auth to avoid duplicate app errors
function getSecondaryAuth() {
  const apps = getApps();
  const existing = apps.find((app) => app.name === 'Secondary');
  const app = existing || initializeApp(firebaseConfig, 'Secondary');
  return getAuth(app);
}

export default function Collaborators() {
  const { user: currentAdmin, userName: currentAdminName } = useAuth();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load collaborators
  const loadCollaborators = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'collaborators'), orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(
        (d) =>
          ({
            id: d.id,
            ...d.data(),
          }) as Collaborator
      );
      setCollaborators(data);
    } catch (err) {
      console.error('Error loading collaborators:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCollaborators();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validations
    if (!name.trim()) return setError('O nome do colaborador é obrigatório.');
    if (!email.trim() || !email.includes('@')) return setError('Envie um e-mail válido.');
    if (password.length < 6) return setError('A senha deve ter no mínimo 6 caracteres.');

    setSubmitting(true);
    try {
      // 1. Criar credenciais no Firebase Auth Secundário (sem deslogar administrador atual)
      const secAuth = getSecondaryAuth();
      const userCredential = await createUserWithEmailAndPassword(secAuth, email, password);
      const newUid = userCredential.user.uid;

      // 2. Gravar o perfil do colaborador no Firestore
      const newCollaborator = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        createdAt: new Date(),
      };
      await setDoc(doc(db, 'collaborators', newUid), newCollaborator);

      // 3. Registrar no log de auditoria
      if (currentAdmin) {
        await addAuditLog({
          userId: currentAdmin.uid,
          userEmail: currentAdmin.email || '',
          userName: currentAdminName,
          action: 'create_collaborator',
          details: `Adicionou o colaborador ${newCollaborator.name} (${newCollaborator.email}) ao sistema administrativo.`
        });
      }

      // Reset form & notify
      setName('');
      setEmail('');
      setPassword('');
      setSuccess('Colaborador adicionado com sucesso!');
      await loadCollaborators();
    } catch (err: any) {
      console.error('Error creating collaborator auth:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está sendo utilizado por outro usuário administrativo.');
      } else {
        setError('Ocorreu um erro ao criar a conta: ' + (err.message || err));
      }
    }
    setSubmitting(false);
  };

  const handleDelete = async (colab: Collaborator) => {
    if (colab.email === currentAdmin?.email) {
      alert('Você não pode remover seu próprio acesso administrativo!');
      return;
    }
    if (!confirm(`Tem certeza de que deseja remover o acesso de ${colab.name}? Ele será desconectado imediatamente.`)) {
      return;
    }

    setActionLoading(colab.id);
    try {
      // Remover documento do Firestore (nosso AuthContext bloqueia logs de quem não está nessa coleção)
      await deleteDoc(doc(db, 'collaborators', colab.id));

      // Registrar logs de auditoria
      if (currentAdmin) {
        await addAuditLog({
          userId: currentAdmin.uid,
          userEmail: currentAdmin.email || '',
          userName: currentAdminName,
          action: 'delete_override', // or custom
          details: `Removeu o acesso administrativo do colaborador ${colab.name} (${colab.email}).`
        });
      }

      setCollaborators((prev) => prev.filter((c) => c.id !== colab.id));
      alert(`Acesso de ${colab.name} revogado com sucesso.`);
    } catch (err) {
      console.error('Error deleting collaborator:', err);
      alert('Erro ao excluir colaborador.');
    }
    setActionLoading(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Colaboradores</h1>
        <p className="text-gray-500 text-sm">
          Gerencie quem tem acesso ao painel para confirmar, cancelar agendamentos ou configurar horários.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 p-5 self-start">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-gray-800 text-base">Novo Colaborador</h2>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-start gap-2 border border-red-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 text-green-700 text-xs rounded-lg flex items-start gap-2 border border-green-200 animate-slide-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-green-500" />
                <span>{success}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                Nome do Colaborador
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Ex: Yasmin"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                E-mail de Acesso
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="Ex: yasmin@gmirim.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                Senha Provisória
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Mínimo de 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 px-4 bg-primary text-white font-medium rounded-lg text-sm hover:bg-primary-light transition-all shadow-sm focus:outline-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando colaborador...
                </>
              ) : (
                'Cadastrar Colaborador'
              )}
            </button>
          </form>
        </div>

        {/* List Column */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 text-base">Controle de Colaboradores</h2>
            <span className="text-xs text-gray-400 font-mono">
              Total: {collaborators.length}
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-sm">Carregando colaboradores...</span>
            </div>
          ) : collaborators.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
              <ShieldAlert className="w-10 h-10 text-gray-300" />
              <span className="text-sm font-medium">Nenhum colaborador adicionado.</span>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 flex-1 overflow-y-auto">
              {collaborators.map((colab) => {
                const dateVal = colab.createdAt ? colab.createdAt.toDate?.() || new Date(colab.createdAt) : new Date();
                const formattedDate = format(dateVal, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

                return (
                  <div
                    key={colab.id}
                    className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition duration-150"
                  >
                    <div className="min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-800 text-sm truncate">
                          {colab.name}
                        </h3>
                        {colab.email === currentAdmin?.email && (
                          <span className="text-[10px] font-bold text-accent px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20">
                            Você
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 font-mono truncate">{colab.email}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Cadastrado em: {formattedDate}
                      </p>
                    </div>

                    {colab.email !== currentAdmin?.email && (
                      <button
                        onClick={() => handleDelete(colab)}
                        disabled={actionLoading === colab.id}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition shrink-0 cursor-pointer disabled:opacity-50"
                        title="Revogar acesso administrativo"
                      >
                        {actionLoading === colab.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
