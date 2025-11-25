import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";

export default function VotingPanel() {
  const [pautas, setPautas] = useState([]);
  const [sessaoAtiva, setSessaoAtiva] = useState(null);
  const { currentUser } = useAuth();

  // 1. Monitora se há sessão aberta
  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, "sessions"), where("status", "==", "aberta")), (snap) => {
      setSessaoAtiva(snap.empty ? null : snap.docs[0].id);
      if(snap.empty) setPautas([]);
    });
    return () => unsubscribe();
  }, []);

  // 2. Monitora pautas ativas da sessão atual
  useEffect(() => {
    if (!sessaoAtiva) return;
    const q = query(collection(db, "pautas"), where("sessionId", "==", sessaoAtiva), where("status", "==", "ativa"));
    const unsubscribe = onSnapshot(q, (snap) => setPautas(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsubscribe();
  }, [sessaoAtiva]);

  const handleVote = async (pautaId, tipo) => {
    try {
      await updateDoc(doc(db, "pautas", pautaId), { 
        [`votos.${tipo}`]: arrayUnion({ uid: currentUser.uid, email: currentUser.email }) 
      });
    } catch (e) { alert("Erro ao registrar voto."); }
  };

  const checkJaVotou = (pauta) => {
    const uid = currentUser.uid;
    const check = (arr) => arr && arr.some(v => v.uid === uid);
    return check(pauta.votos.sim) || check(pauta.votos.nao) || check(pauta.votos.abstencao);
  };

  if (!sessaoAtiva) {
    return (
      <div className="card" style={{textAlign: 'center', padding: '50px 20px', color: '#64748b'}}>
        <h3>Aguardando Sessão</h3>
        <p>O painel será liberado quando a presidência iniciar a sessão.</p>
      </div>
    );
  }

  return (
    <div style={{maxWidth: '1200px', margin: '0 auto'}}>
       {pautas.length === 0 && (
         <div className="card" style={{padding: '40px', textAlign:'center', color:'#64748b'}}>
           <h3>Aguardando Liberação</h3>
           <p>Nenhuma pauta em votação no momento.</p>
         </div>
       )}
       
       {pautas.map(pauta => {
         const jaVotou = checkJaVotou(pauta);
         return (
           <div key={pauta.id} style={{
             background: 'white', 
             borderRadius: '8px', 
             boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
             marginBottom: '2rem',
             overflow: 'hidden',
             border: '1px solid #e5e7eb'
           }}>
             
             {/* CABEÇALHO DA PAUTA */}
             <div style={{backgroundColor: '#ecfdf5', padding: '20px 25px', borderBottom: '1px solid #d1fae5'}}>
                <div style={{fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '5px'}}>
                  PAUTA EM VOTAÇÃO
                </div>
                
                <h2 style={{margin: '0 0 10px 0', color: '#1e293b', fontSize: '1.5rem', lineHeight: '1.2'}}>
                  {pauta.titulo}
                </h2>

                {/* AUTOR DA PAUTA (NOVO) */}
                <div style={{
                    color: '#0f172a', 
                    fontSize: '1rem', 
                    fontWeight: '700', 
                    marginBottom: '10px',
                    paddingBottom: '10px',
                    borderBottom: '1px solid rgba(0,0,0,0.05)'
                }}>
                  Autoria: {pauta.autor || "Não informado"}
                </div>

                <div style={{color: '#475569', fontSize: '1rem', marginBottom: '20px', fontStyle: 'italic'}}>
                  {pauta.descricao}
                </div>

                {/* TAG DE TIPO DE VOTAÇÃO */}
                <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                  <span style={{
                     backgroundColor: '#475569',
                     color: 'white',
                     padding: '6px 16px',
                     borderRadius: '6px',
                     fontSize: '0.85rem',
                     fontWeight: '600',
                     boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                  }}>
                    {pauta.tipoVotacao || "Turno Único"}
                  </span>
                </div>
             </div>
             
             {/* BOTÕES DE VOTO */}
             <div style={{padding: '25px'}}>
               {jaVotou ? (
                 <div style={{background:'#f0fdf4', color:'#15803d', padding:'30px', borderRadius:'8px', textAlign:'center', border:'2px solid #bbf7d0', fontWeight: 'bold', fontSize: '1.2rem'}}>
                   VOTO REGISTRADO COM SUCESSO
                 </div>
               ) : (
                 <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'20px'}}>
                   <button onClick={() => handleVote(pauta.id, 'sim')} style={{...styles.bigButton, backgroundColor: '#10b981'}}>SIM</button>
                   <button onClick={() => handleVote(pauta.id, 'nao')} style={{...styles.bigButton, backgroundColor: '#ef4444'}}>NÃO</button>
                   <button onClick={() => handleVote(pauta.id, 'abstencao')} style={{...styles.bigButton, backgroundColor: '#4b5563'}}>NULO</button>
                 </div>
               )}
             </div>
           </div>
         )
       })}
    </div>
  );
}

const styles = {
  bigButton: {
    border: 'none',
    color: 'white',
    padding: '25px 10px',
    borderRadius: '6px',
    fontSize: '1.8rem',
    fontWeight: '700',
    cursor: 'pointer',
    textTransform: 'uppercase',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    transition: 'transform 0.1s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
};