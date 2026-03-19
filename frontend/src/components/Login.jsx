import { useState } from 'react'
import { api } from '../api'

const DEMO_USERS = [
  { username: 'sarah.chen',    password: 'legal123',       role: 'Legal Counsel',        initials: 'SC' },
  { username: 'marcus.webb',   password: 'procurement123', role: 'Procurement Manager',  initials: 'MW' },
  { username: 'jennifer.park', password: 'coo123',         role: 'Chief Operating Officer', initials: 'JP' },
]

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const data = await api.login(username.trim(), password)
      localStorage.setItem('clause_token', data.token)
      onLogin(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function fillDemo(u) {
    setUsername(u.username)
    setPassword(u.password)
    setError(null)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-mark">
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
              <path d="M2 2h8l4 4v8H2V2z" fill="#07080D" />
              <path d="M10 2v4h4" stroke="#07080D" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M4 8h8M4 11h5" stroke="#C9A84C" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="login-logo-name">Clause</div>
            <div className="login-logo-sub">Contract Intelligence</div>
          </div>
        </div>

        <h2 className="login-title">Welcome back</h2>
        <p className="login-subtitle">Sign in to your workspace</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label className="login-label">Username</label>
            <input
              className="login-input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="username"
              autoComplete="username"
              required
            />
          </div>
          <div className="login-field">
            <label className="login-label">Password</label>
            <input
              className="login-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Demo accounts */}
        <div className="login-demo">
          <div className="login-demo-label">Demo accounts</div>
          <div className="login-demo-list">
            {DEMO_USERS.map(u => (
              <button key={u.username} className="login-demo-item" onClick={() => fillDemo(u)}>
                <div className="login-demo-avatar">{u.initials}</div>
                <div>
                  <div className="login-demo-name">{u.username}</div>
                  <div className="login-demo-role">{u.role}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
