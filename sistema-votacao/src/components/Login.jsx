import React, { useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const emailRef = useRef();
  const passwordRef = useRef();
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError("");
      setLoading(true);
      await login(emailRef.current.value, passwordRef.current.value);
    } catch {
      setError("Falha ao fazer login. Verifique suas credenciais.");
    }
    setLoading(false);
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h2 style={{textAlign: 'center', marginBottom: '1.5rem', color: '#1e293b'}}>Sistema de Votação</h2>
        {error && <div style={{background: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '0.9rem'}}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <label style={{display:'block', marginBottom:'5px', fontWeight:'500'}}>Email</label>
          <input type="email" ref={emailRef} required placeholder="admin@exemplo.com" />
          
          <label style={{display:'block', marginBottom:'5px', fontWeight:'500'}}>Senha</label>
          <input type="password" ref={passwordRef} required placeholder="******" />
          
          <button disabled={loading} type="submit" className="btn btn-primary" style={{width: '100%', marginTop: '10px'}}>
            {loading ? 'Entrando...' : 'Acessar Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}