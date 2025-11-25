import React from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./components/Login";
import AdminPanel from "./components/AdminPanel";
import VotingPanel from "./components/VotingPanel";
import ResultsPanel from "./components/ResultsPanel";
import OBSOverlay from "./components/OBSOverlay"; 

function AppContent() {
  const { currentUser, userRole, logout } = useAuth();

  // --- LÓGICA DE ROTA DO OBS ---
  const isObsRoute = window.location.pathname === '/obs';

  if (isObsRoute) {
    return <OBSOverlay />;
  }

  // --- LÓGICA DO SISTEMA PADRÃO ---
  if (!currentUser) {
    return <Login />;
  }

  return (
    <div>
      {/* CABEÇALHO GERAL */}
      <header className="app-header">
        <div style={{display:'flex', alignItems:'center'}}>
          {/* Ícone/Logo */}
          <div style={{
            width:'32px', height:'32px', borderRadius:'4px', 
            background:'#0f172a', marginRight:'10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 'bold'
          }}>
            V
          </div>
          
          <div>
             <div style={{fontSize:'0.9rem', fontWeight:'700', color:'#0f172a', lineHeight: '1.1'}}>
               Sistema de Votação
             </div>
             <div style={{fontSize:'0.75rem', color:'#64748b'}}>
               {currentUser.email} • <span style={{textTransform: 'uppercase'}}>{userRole || 'Usuário'}</span>
             </div>
          </div>
        </div>
        
        {/* ÁREA DE BOTÕES DO TOPO */}
        <div style={{display: 'flex', gap: '10px'}}>
          
          {/* Botão OBS (Só aparece para Admin) */}
          {userRole === 'admin' && (
            <button 
              onClick={() => window.open('/obs', '_blank')} 
              className="btn btn-primary btn-sm"
              style={{display: 'flex', alignItems: 'center', gap: '5px'}}
              title="Abrir painel de transmissão em nova aba"
            >
              LowerThird
            </button>
          )}

          <button 
            onClick={logout} 
            className="btn btn-outline btn-sm"
            style={{borderColor: '#cbd5e1', color: '#64748b'}}
          >
            Sair
          </button>
        </div>
      </header>

      {/* ÁREA DE CONTEÚDO */}
      <main style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem' }}>
        
        {userRole === 'admin' && <AdminPanel />}
        
        {userRole === 'voter' && <VotingPanel />}
        
        {userRole === 'observer' && <ResultsPanel />}

        {!['admin', 'voter', 'observer'].includes(userRole) && (
          <div className="card" style={{textAlign: 'center', color: '#ef4444'}}>
            <h3>Erro de Permissão</h3>
            <p>Seu usuário não possui um perfil válido definido.</p>
          </div>
        )}

      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}