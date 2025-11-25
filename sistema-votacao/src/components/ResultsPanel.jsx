import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

export default function ResultsPanel() {
  const [pautas, setPautas] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "pautas"), orderBy("criadoEm", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pautasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPautas(pautasData);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Resultados (Tempo Real)</h2>
      {pautas.map(pauta => (
        <div key={pauta.id} style={{ border: "1px solid #eee", padding: "15px", marginBottom: "10px", backgroundColor: "#f9f9f9" }}>
          <h3>{pauta.titulo} <small>({pauta.status})</small></h3>
          
          <div style={{ display: "flex", gap: "20px", marginTop: "10px" }}>
            <div>
              <strong>SIM:</strong> {pauta.votos.sim.length}
            </div>
            <div>
              <strong>NÃO:</strong> {pauta.votos.nao.length}
            </div>
            <div>
              <strong>ABSTENÇÕES:</strong> {pauta.votos.abstencao.length}
            </div>
          </div>
          <p style={{fontSize: '0.8em', color: '#666'}}>Total de votos: {pauta.votos.sim.length + pauta.votos.nao.length + pauta.votos.abstencao.length}</p>
        </div>
      ))}
    </div>
  );
}