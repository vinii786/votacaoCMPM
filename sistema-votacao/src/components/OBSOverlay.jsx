import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export default function OBSOverlay() {
  const [pauta, setPauta] = useState(null);
  const [sessaoAtiva, setSessaoAtiva] = useState(null);

  // 1. Busca Sessão
  useEffect(() => {
    const q = query(collection(db, "sessions"), where("status", "==", "aberta"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setSessaoAtiva(snap.empty ? null : snap.docs[0].id);
      if(snap.empty) setPauta(null);
    });
    return () => unsubscribe();
  }, []);

  // 2. Busca Pauta Ativa
  useEffect(() => {
    if (!sessaoAtiva) return;
    const q = query(collection(db, "pautas"), where("sessionId", "==", sessaoAtiva), where("status", "==", "ativa"));
    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setPauta({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setPauta(null);
      }
    });
    return () => unsubscribe();
  }, [sessaoAtiva]);

  if (!pauta) return null; // Retorna vazio para o OBS ficar transparente se não tiver pauta

  // Junta todos os votos em uma lista única para exibir os cards
  const todosVotos = [
    ...(pauta.votos.sim || []).map(v => ({ ...v, tipo: 'SIM' })),
    ...(pauta.votos.nao || []).map(v => ({ ...v, tipo: 'NÃO' })),
    ...(pauta.votos.abstencao || []).map(v => ({ ...v, tipo: 'ABSTENÇÃO' }))
  ];

  // Contadores
  const countSim = pauta.votos.sim?.length || 0;
  const countNao = pauta.votos.nao?.length || 0;

  return (
    <div className="obs-container">
      {/* HEADER SUPERIOR (Igual a imagem) */}
      <div className="obs-header">
        
        {/* BLOCO ESQUERDO: PLACAR */}
        <div className="placar-box">
          <span className="numero red">{countNao}</span>
          <span className="texto-votacao">VOTAÇÃO</span>
          <span className="numero green">{countSim}</span>
        </div>

        {/* BLOCO DIREITO: TÍTULO E AUTOR */}
        <div className="info-box">
          <div className="titulo-faixa">
            Nº: {pauta.titulo}
          </div>
          <div className="autor-faixa">
            Autor(es): {pauta.autor || "Mesa Diretora"}
          </div>
        </div>
      </div>

      {/* GRID DE VEREADORES (Igual a imagem) */}
      <div className="vereadores-grid">
        {todosVotos.map((voto, index) => (
          <div key={index} className="vereador-card">
            {/* Ícone de Avatar */}
            <div className="avatar-circle">
              <svg viewBox="0 0 24 24" fill="#000" width="24px" height="24px">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            
            <div className="vereador-nome">
              {/* Tenta pegar só o primeiro nome ou email */}
              {voto.email.split('@')[0]}
            </div>

            {/* Barra lateral colorida baseada no voto */}
            <div className={`status-bar status-${voto.tipo}`}></div>
          </div>
        ))}
      </div>
    </div>
  );
}