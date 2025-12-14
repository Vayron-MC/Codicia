import { useState } from 'react';
import { supabase } from './supabaseClient'; 

export default function Login({ setSession }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) alert("Error: Usuario o contraseña incorrectos.");
    else setSession(data.session);

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
        <h2 className="text-3xl font-bold text-white mb-2 text-center">CODICIA ERP</h2>
        <p className="text-gray-400 text-center mb-6">Acceso Restringido</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" placeholder="Correo Corporativo" className="w-full p-3 rounded bg-gray-700 text-white" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Contraseña" className="w-full p-3 rounded bg-gray-700 text-white" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded">
            {loading ? 'Verificando...' : 'INGRESAR'}
          </button>
        </form>
      </div>
    </div>
  );
}