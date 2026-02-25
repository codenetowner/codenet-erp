import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const tiltRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Add external scripts and styles if needed
    const fontAwesomeLink = document.createElement('link')
    fontAwesomeLink.rel = 'stylesheet'
    fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
    document.head.appendChild(fontAwesomeLink)

    // Vanilla Tilt Script loading approach
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/vanilla-tilt/1.8.0/vanilla-tilt.min.js'
    script.async = true
    document.body.appendChild(script)

    script.onload = () => {
      if (tiltRef.current && (window as any).VanillaTilt) {
        (window as any).VanillaTilt.init(tiltRef.current, {
          max: 8,
          speed: 400,
          glare: true,
          "max-glare": 0.15,
        })
      }
    }

    return () => {
      document.head.removeChild(fontAwesomeLink)
      // Cleanup script & tilt instance if needed
      if (tiltRef.current && (tiltRef.current as any).vanillaTilt) {
        (tiltRef.current as any).vanillaTilt.destroy()
      }
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(username, password)
      // Force page reload to ensure auth state is picked up
      window.location.href = '/'
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center overflow-hidden font-sans relative">
      <style>{`
        /* Magic Floating Blob Animations */
        @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
            animation: blob 7s infinite;
        }
        .animation-delay-2000 {
            animation-delay: 2s;
        }
        .animation-delay-4000 {
            animation-delay: 4s;
        }
        
        /* 3D Glassmorphism Effect */
        .glass-panel {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }
        
        /* Magical Inputs */
        .input-glass {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: white;
        }
        .input-glass:focus {
            background: rgba(255, 255, 255, 0.1);
            border-color: #06b6d4; /* Cyan */
            box-shadow: 0 0 20px rgba(6, 182, 212, 0.3);
        }
      `}</style>
      
      {/* Magic Animated Background */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none z-0">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-600 rounded-full mix-blend-screen filter blur-[100px] opacity-60 animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-cyan-500 rounded-full mix-blend-screen filter blur-[100px] opacity-60 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-pink-600 rounded-full mix-blend-screen filter blur-[100px] opacity-60 animate-blob animation-delay-4000"></div>
      </div>

      {/* 3D Glassmorphism Login Card */}
      <div ref={tiltRef} className="relative z-10 w-full max-w-md p-8 sm:p-10 glass-panel rounded-3xl mx-4">
          
          {/* Header */}
          <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 mb-6 shadow-[0_0_30px_rgba(139,92,246,0.5)] transform transition hover:scale-110 duration-300">
                  <i className="fa-solid fa-bolt text-white text-2xl"></i>
              </div>
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-wider mb-2 drop-shadow-lg">erp-codenet</h1>
              <p className="text-slate-400 font-medium tracking-wide text-sm uppercase">Secure Portal Access</p>
          </div>

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-500/20 text-red-400 p-3 rounded-xl text-sm border border-red-500/30 text-center backdrop-blur-sm">
                  {error}
                </div>
              )}
              
              {/* Username Input */}
              <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <i className="fa-solid fa-user text-slate-400 group-focus-within:text-cyan-400 transition-colors duration-300"></i>
                  </div>
                  <input 
                    type="text" 
                    id="username" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl input-glass focus:outline-none transition-all duration-300 placeholder-slate-500" 
                    placeholder="Username" 
                    required 
                  />
              </div>

              {/* Password Input */}
              <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <i className="fa-solid fa-lock text-slate-400 group-focus-within:text-purple-400 transition-colors duration-300"></i>
                  </div>
                  <input 
                    type="password" 
                    id="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl input-glass focus:outline-none transition-all duration-300 placeholder-slate-500" 
                    placeholder="Password" 
                    required 
                  />
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={loading}
                className="w-full mt-4 py-4 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 text-white font-bold text-lg tracking-wider hover:from-cyan-400 hover:via-blue-400 hover:to-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/50 transform hover:-translate-y-1 transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_40px_rgba(139,92,246,0.6)] disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed"
              >
                  {loading ? 'SIGNING IN...' : 'LOGIN'}
              </button>
          </form>

          {/* Support Section */}
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
              <div className="inline-flex items-center justify-center gap-3 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors duration-300">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/20">
                      <i className="fa-solid fa-phone text-cyan-400 text-xs"></i>
                  </div>
                  <span className="text-slate-400 text-sm">Company Number:</span>
                  <a href="tel:81900874" className="font-bold text-white hover:text-cyan-400 transition-colors drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">81900874</a>
              </div>
          </div>

      </div>

    </div>
  )
}
