import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, 
  serverTimestamp, query, orderBy, onSnapshot, where, getDocs, arrayUnion 
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";

// Configurações de Tipos de Votação (Para o Modal de Início)
const OPCOES_TIPO = [
  "Turno único",
  "1º Turno",
  "Quebra de interstício",
  "2º Turno",
  "Redação"
];

export default function AdminPanel() {
  const [sessaoAtiva, setSessaoAtiva] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('dashboard'); 
  const { currentUser } = useAuth();

  // 1. Monitoramento da Sessão Ativa
  useEffect(() => {
    const q = query(collection(db, "sessions"), where("status", "==", "aberta"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0];
        setSessaoAtiva({ id: docData.id, ...docData.data() });
        setViewMode('dashboard');
      } else {
        setSessaoAtiva(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Ações de Sessão
  const handleIniciarSessao = async () => {
    if(!window.confirm("Confirma a abertura de uma nova Sessão de Votação?")) return;
    try {
      await addDoc(collection(db, "sessions"), {
        status: "aberta",
        dataInicio: serverTimestamp(),
        nome: `Sessão Ordinária - ${new Date().toLocaleDateString('pt-BR')}`
      });
    } catch (e) { alert("Erro ao iniciar sessão."); }
  };

  const handleEncerrarSessao = async () => {
    if(!window.confirm("Confirma o encerramento da sessão atual? Todas as pautas serão arquivadas.")) return;
    try {
      if (sessaoAtiva) {
        await updateDoc(doc(db, "sessions", sessaoAtiva.id), {
          status: "fechada",
          dataFim: serverTimestamp()
        });
      }
    } catch (e) { alert("Erro ao encerrar sessão."); }
  };

  if (loading) return <div style={{padding: 20}}>Carregando sistema...</div>;

  return (
    <div>
      {/* CABEÇALHO DO PAINEL */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{margin: 0, fontWeight: 600, color: '#0f172a'}}>Painel da Presidência</h2>
          <div style={{marginTop: '5px', display: 'flex', alignItems: 'center', fontSize: '0.9rem', color: '#64748b'}}>
            <span style={{
              height: '10px', width: '10px', borderRadius: '50%', 
              backgroundColor: sessaoAtiva ? '#16a34a' : '#94a3b8', 
              display: 'inline-block', marginRight: '8px'
            }}></span>
            {sessaoAtiva ? `Sessão Ativa: ${sessaoAtiva.nome}` : "Nenhuma sessão ativa"}
          </div>
        </div>

        {sessaoAtiva ? (
          <button onClick={handleEncerrarSessao} className="btn btn-outline" style={{color: '#991b1b', borderColor: '#fee2e2'}}>
            Encerrar Sessão
          </button>
        ) : (
          <div className="btn-group">
            <button onClick={() => setViewMode('dashboard')} className={`btn ${viewMode === 'dashboard' ? 'btn-primary' : 'btn-outline'}`}>
              Início
            </button>
            <button onClick={() => setViewMode('historico')} className={`btn ${viewMode === 'historico' ? 'btn-primary' : 'btn-outline'}`}>
              Histórico
            </button>
          </div>
        )}
      </div>

      {sessaoAtiva && <GerenciadorPautas sessaoId={sessaoAtiva.id} currentUser={currentUser} />}

      {!sessaoAtiva && viewMode === 'dashboard' && (
        <div className="card" style={{textAlign: 'center', padding: '60px 20px', borderStyle: 'dashed', borderColor: '#cbd5e1'}}>
          <h3 style={{color: '#475569'}}>Sistema Aguardando</h3>
          <p style={{marginBottom: '30px', color: '#64748b'}}>Inicie uma nova sessão para habilitar o cadastro de pautas e votações.</p>
          <button onClick={handleIniciarSessao} className="btn btn-primary" style={{padding: '12px 24px'}}>
            Iniciar Nova Sessão
          </button>
        </div>
      )}

      {!sessaoAtiva && viewMode === 'historico' && <HistoricoSessoes />}
    </div>
  );
}

// --- SUB-COMPONENTE: GERENCIADOR DE PAUTAS ---
function GerenciadorPautas({ sessaoId, currentUser }) {
  // Estados do Formulário
  const [titulo, setTitulo] = useState("");
  const [autor, setAutor] = useState(""); // <--- NOVO CAMPO
  const [descricao, setDescricao] = useState("");
  
  const [pautas, setPautas] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('gerenciar');

  // Estados do Modal de Início
  const [modalOpen, setModalOpen] = useState(false);
  const [pautaParaIniciar, setPautaParaIniciar] = useState(null);
  const [tipoSelecionado, setTipoSelecionado] = useState(OPCOES_TIPO[0]);

  // Monitora pautas da sessão atual
  useEffect(() => {
    if (!sessaoId) return;
    const q = query(collection(db, "pautas"), where("sessionId", "==", sessaoId), orderBy("criadoEm", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => setPautas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    return () => unsubscribe();
  }, [sessaoId]);

  // Salvar Pauta (Create/Update)
  const handleSave = async (e) => {
    e.preventDefault();
    if (!titulo) return;
    try {
      const dadosComuns = { titulo, autor, descricao }; // <--- INCLUI AUTOR

      if (editingId) {
        await updateDoc(doc(db, "pautas", editingId), dadosComuns);
        setEditingId(null);
      } else {
        await addDoc(collection(db, "pautas"), {
          ...dadosComuns,
          criadoEm: serverTimestamp(),
          status: "aguardando",
          sessionId: sessaoId,
          votos: { sim: [], nao: [], abstencao: [] }
        });
      }
      setTitulo(""); setAutor(""); setDescricao("");
    } catch (e) { alert("Erro ao processar pauta."); }
  };

  const handleEdit = (p) => { 
    setTitulo(p.titulo); 
    setAutor(p.autor || ""); // <--- CARREGA AUTOR
    setDescricao(p.descricao); 
    setEditingId(p.id); 
    setActiveTab('gerenciar'); 
    window.scrollTo(0,0); 
  };

  const handleDelete = async (id) => { if(window.confirm("Excluir pauta permanentemente?")) await deleteDoc(doc(db, "pautas", id)); };

  // --- LÓGICA DO MODAL DE INÍCIO ---
  const abrirModalInicio = (pauta) => {
    setPautaParaIniciar(pauta);
    setTipoSelecionado(OPCOES_TIPO[0]); 
    setModalOpen(true);
  };

  const confirmarInicioVotacao = async () => {
    if (!pautaParaIniciar) return;
    try {
      await updateDoc(doc(db, "pautas", pautaParaIniciar.id), {
        status: "ativa",
        tipoVotacao: tipoSelecionado
      });
      setModalOpen(false);
      setPautaParaIniciar(null);
    } catch (e) { alert("Erro ao iniciar votação."); }
  };

  const setStatusDireto = async (id, s) => { await updateDoc(doc(db, "pautas", id), { status: s }); };


  return (
    <div>
      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'gerenciar' ? 'active' : ''}`} onClick={() => setActiveTab('gerenciar')}>Gerenciamento de Pautas</button>
        <button className={`tab-btn ${activeTab === 'resultados' ? 'active' : ''}`} onClick={() => setActiveTab('resultados')}>Resultados em Tempo Real</button>
      </div>

      {activeTab === 'gerenciar' && (
        <>
          {/* FORMULÁRIO */}
          <div className="card">
            <h4 style={{marginBottom: '15px', color: editingId ? '#b45309' : '#0f172a'}}>
              {editingId ? "Editando Pauta" : "Cadastrar Nova Pauta"}
            </h4>
            <form onSubmit={handleSave}>
              
              <div style={{marginBottom: '15px'}}>
                <label style={{display:'block', marginBottom:'5px', fontSize:'0.85rem', fontWeight:'600', color: '#475569'}}>Título da Pauta:</label>
                <input type="text" placeholder="Ex: Projeto de Lei nº 123/2025" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
              </div>

              {/* NOVO CAMPO: AUTOR */}
              <div style={{marginBottom: '15px'}}>
                <label style={{display:'block', marginBottom:'5px', fontSize:'0.85rem', fontWeight:'600', color: '#475569'}}>Autor(a) da Pauta:</label>
                <input type="text" placeholder="Ex: Ver. João da Silva" value={autor} onChange={(e) => setAutor(e.target.value)} />
              </div>

              <div style={{marginBottom: '15px'}}>
                <label style={{display:'block', marginBottom:'5px', fontSize:'0.85rem', fontWeight:'600', color: '#475569'}}>Descrição / Resumo:</label>
                <textarea placeholder="Detalhes adicionais sobre o projeto..." value={descricao} onChange={(e) => setDescricao(e.target.value)} style={{height: "80px"}} />
              </div>
              
              <div className="btn-group">
                <button type="submit" className={editingId ? 'btn btn-outline' : 'btn btn-primary'}>
                  {editingId ? "Salvar Alterações" : "Cadastrar Pauta"}
                </button>
                {editingId && <button type="button" onClick={() => {setEditingId(null); setTitulo(""); setAutor(""); setDescricao("")}} className="btn btn-outline">Cancelar</button>}
              </div>
            </form>
          </div>

          {/* LISTA DE PAUTAS */}
          {pautas.map(pauta => (
            <div key={pauta.id} className="card" style={{borderLeft: pauta.status === 'ativa' ? '4px solid #16a34a' : '1px solid #e2e8f0'}}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                <div>
                  {pauta.tipoVotacao && (
                    <span style={{
                      background: '#475569', color: 'white', padding: '2px 8px', borderRadius: '4px', 
                      fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', marginRight: '8px'
                    }}>
                      {pauta.tipoVotacao}
                    </span>
                  )}
                  <h4 style={{margin:'5px 0 0 0', display:'inline-block'}}>{pauta.titulo}</h4>
                  
                  {/* EXIBIÇÃO DO AUTOR */}
                  <div style={{color: '#0f172a', fontWeight: '600', fontSize: '0.9rem', marginTop: '5px'}}>
                    Autoria: {pauta.autor || "Não informado"}
                  </div>
                  
                  <div style={{color:'#64748b', fontSize:'0.9rem', marginTop:'2px'}}>{pauta.descricao}</div>
                </div>
                <span className={`badge badge-${pauta.status}`}>{pauta.status}</span>
              </div>

              {pauta.status === 'ativa' && (
                <div style={{background: '#f8fafc', padding: '20px', borderRadius: '6px', margin: '20px 0', border: '1px solid #e2e8f0'}}>
                  <p style={{fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '10px', textTransform: 'uppercase'}}>
                    Área de Voto da Presidência
                  </p>
                  <AreaDeVotoAdmin pauta={pauta} currentUser={currentUser} />
                </div>
              )}

              <div style={{borderTop:'1px solid #f1f5f9', paddingTop:'15px', display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                <div className="btn-group">
                   {pauta.status === 'aguardando' && (
                     <button onClick={() => abrirModalInicio(pauta)} className="btn btn-success btn-sm">
                       ▶ Iniciar Votação...
                     </button>
                   )}
                   {pauta.status === 'ativa' && <button onClick={() => setStatusDireto(pauta.id, 'encerrada')} className="btn btn-danger btn-sm">⏹ Encerrar Votação</button>}
                   {pauta.status === 'encerrada' && <button onClick={() => setStatusDireto(pauta.id, 'ativa')} className="btn btn-outline btn-sm">Reabrir Votação</button>}
                </div>
                <div className="btn-group">
                   <button onClick={() => handleEdit(pauta)} className="btn btn-outline btn-sm">Editar</button>
                   <button onClick={() => handleDelete(pauta.id)} className="btn btn-outline btn-sm" style={{color:'#ef4444', borderColor:'#fee2e2'}}>Excluir</button>
                </div>
              </div>
            </div>
          ))}
          {pautas.length === 0 && <p style={{textAlign:'center', color:'#94a3b8', fontStyle:'italic'}}>Nenhuma pauta cadastrada nesta sessão.</p>}
        </>
      )}

      {activeTab === 'resultados' && <ListaResultados pautas={pautas} />}

      {/* --- MODAL DE SELEÇÃO DE TIPO (OVERLAY) --- */}
      {modalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
        }}>
          <div style={{background: 'white', padding: '30px', borderRadius: '8px', width: '400px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'}}>
            <h3 style={{marginTop: 0, color: '#0f172a'}}>Iniciar Votação</h3>
            <p style={{color: '#64748b'}}>Selecione a fase/tipo desta votação para liberar o painel:</p>
            
            <div style={{marginBottom: '20px'}}>
              <label style={{display:'block', marginBottom:'8px', fontWeight:'600', fontSize:'0.9rem'}}>Tipo de Votação:</label>
              <select 
                value={tipoSelecionado} 
                onChange={(e) => setTipoSelecionado(e.target.value)}
                style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem', background: 'white'}}
              >
                {OPCOES_TIPO.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
              <button onClick={() => setModalOpen(false)} className="btn btn-outline">Cancelar</button>
              <button onClick={confirmarInicioVotacao} className="btn btn-success">Confirmar e Iniciar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --- SUB-COMPONENTE: ÁREA DE VOTO DO ADMIN ---
function AreaDeVotoAdmin({ pauta, currentUser }) {
  const checkJaVotou = () => {
    const uid = currentUser.uid;
    const check = (arr) => arr && arr.some(v => v.uid === uid);
    return check(pauta.votos.sim) || check(pauta.votos.nao) || check(pauta.votos.abstencao);
  };

  const handleVote = async (tipo) => {
    try {
      await updateDoc(doc(db, "pautas", pauta.id), { 
        [`votos.${tipo}`]: arrayUnion({ uid: currentUser.uid, email: currentUser.email }) 
      });
    } catch (e) { alert("Erro ao registrar voto."); }
  };

  if (checkJaVotou()) {
    return (
      <div style={{
        background:'#f0fdf4', color:'#166534', padding:'10px', borderRadius:'6px', 
        border:'1px solid #bbf7d0', fontWeight: 600, fontSize: '0.9rem'
      }}>
        Voto registrado com sucesso.
      </div>
    );
  }

  const btnStyle = { flex: 1, padding: '10px', fontSize: '0.9rem', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white' };
  return (
    <div style={{display: 'flex', gap: '10px'}}>
      <button onClick={() => handleVote('sim')} style={{...btnStyle, background: '#10b981'}}>SIM</button>
      <button onClick={() => handleVote('nao')} style={{...btnStyle, background: '#ef4444'}}>NÃO</button>
      <button onClick={() => handleVote('abstencao')} style={{...btnStyle, background: '#4b5563'}}>NULO</button>
    </div>
  );
}

// --- SUB-COMPONENTE: HISTÓRICO ---
function HistoricoSessoes() {
  const [sessoes, setSessoes] = useState([]);
  const [selecionada, setSelecionada] = useState(null);
  const [dadosHistorico, setDadosHistorico] = useState([]);

  useEffect(() => {
    getDocs(query(collection(db, "sessions"), where("status", "==", "fechada"), orderBy("dataInicio", "desc")))
      .then(s => setSessoes(s.docs.map(d => ({id: d.id, ...d.data()}))));
  }, []);

  const verDetalhes = async (id) => {
    if (selecionada === id) { setSelecionada(null); return; }
    setSelecionada(id);
    const snap = await getDocs(query(collection(db, "pautas"), where("sessionId", "==", id)));
    setDadosHistorico(snap.docs.map(d => ({id: d.id, ...d.data()})));
  };

  return (
    <div>
      <h3 style={{marginBottom:'20px'}}>Arquivo de Sessões Anteriores</h3>
      {sessoes.map(sessao => (
        <div key={sessao.id} className="card">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer'}} onClick={() => verDetalhes(sessao.id)}>
            <div>
              <h4 style={{margin:0}}>{sessao.nome}</h4>
              <small style={{color:'#64748b'}}>{sessao.dataInicio?.seconds ? new Date(sessao.dataInicio.seconds*1000).toLocaleDateString('pt-BR') : '-'}</small>
            </div>
            <button className="btn btn-outline btn-sm">{selecionada === sessao.id ? "Ocultar" : "Ver Detalhes"}</button>
          </div>
          {selecionada === sessao.id && (
            <div style={{marginTop:'15px', paddingTop:'15px', borderTop:'1px solid #f1f5f9'}}>
              <ListaResultados pautas={dadosHistorico} />
            </div>
          )}
        </div>
      ))}
      {sessoes.length === 0 && <p style={{color:'#94a3b8'}}>Nenhuma sessão encerrada no histórico.</p>}
    </div>
  );
}

// --- SUB-COMPONENTE: LISTA DE RESULTADOS ---
function ListaResultados({ pautas }) {
  if (pautas.length === 0) return <p style={{color:'#94a3b8'}}>Sem dados para exibir.</p>;
  return (
    <div>
      {pautas.map(p => (
        <div key={p.id} className="card" style={{borderLeft:'4px solid #cbd5e1'}}>
          <div style={{marginBottom: '10px'}}>
             <span style={{background: '#475569', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', marginRight: '8px'}}>
                {p.tipoVotacao || "Geral"}
             </span>
             <h4 style={{display:'inline'}}>{p.titulo}</h4>
          </div>
          
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginTop: '15px'}}>
            <VotoCard label="SIM" lista={p.votos?.sim || []} color="#166534" bg="#f0fdf4" />
            <VotoCard label="NÃO" lista={p.votos?.nao || []} color="#991b1b" bg="#fef2f2" />
            <VotoCard label="NULO" lista={p.votos?.abstencao || []} color="#334155" bg="#f8fafc" />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- SUB-COMPONENTE: CARD DE VOTO EXPANSÍVEL ---
function VotoCard({ label, lista, bg, color }) {
  const [open, setOpen] = useState(false);
  return (
    <div onClick={() => setOpen(!open)} style={{background: bg, color: color, padding: '12px', borderRadius: '6px', cursor: 'pointer', border: `1px solid ${color}20`}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <span style={{fontWeight:600, fontSize:'0.8rem'}}>{label}</span>
        <span style={{fontWeight:700, fontSize:'1.2rem'}}>{lista.length}</span>
      </div>
      {open && (
        <ul style={{marginTop:'10px', paddingTop:'10px', borderTop:`1px solid ${color}20`, listStyle:'none', paddingLeft:0, fontSize:'0.8rem'}}>
          {lista.map((v, i) => <li key={i} style={{marginBottom:'4px'}}>{v.email || v.uid}</li>)}
          {lista.length === 0 && <li style={{opacity:0.6}}>Nenhum voto registrado.</li>}
        </ul>
      )}
    </div>
  );
}