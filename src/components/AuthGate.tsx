import { useUser, SignIn, SignUp } from '@clerk/clerk-react'
import { Crown, Swords, Zap } from 'lucide-react'
import { useState } from 'react'

type AuthView = 'sign-in' | 'sign-up'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUser()
  const [view, setView] = useState<AuthView>('sign-in')

  if (!isLoaded) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-inner">
          <Crown size={48} className="auth-crown" />
          <div className="auth-loader-ring" />
        </div>
      </div>
    )
  }

  if (isSignedIn) {
    return <>{children}</>
  }

  return (
    <div className="auth-shell">
      <div className="auth-bg-particles" aria-hidden="true" />
      <div className="auth-card">
        <div className="auth-header">
          <Crown size={36} className="auth-crown-icon" />
          <h1>POCKEMY</h1>
          <p>Card Battle Online</p>
        </div>

        <div className="auth-features">
          <div className="auth-feature">
            <Swords size={18} />
            <span>Real-time PvP battles</span>
          </div>
          <div className="auth-feature">
            <Zap size={18} />
            <span>Pulse Chain combo system</span>
          </div>
          <div className="auth-feature">
            <Crown size={18} />
            <span>Competitive ranked ladder</span>
          </div>
        </div>

        {view === 'sign-in' ? (
          <SignIn
            appearance={{
              elements: {
                rootBox: { width: '100%' },
                card: {
                  backgroundColor: 'transparent',
                  boxShadow: 'none',
                  width: '100%',
                },
                headerTitle: { color: '#fff', fontSize: '22px' },
                headerSubtitle: { color: '#a7b5bd' },
                socialButtonsBlockButton: {
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderColor: 'rgba(255,255,255,0.16)',
                  color: '#e9f1f4',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.12)',
                  },
                },
                formButtonPrimary: {
                  background: 'linear-gradient(180deg, #fff2a9 0%, #ffd35f 52%, #ffad35 100%)',
                  color: '#1a1608',
                  fontWeight: 850,
                  '&:hover': { filter: 'brightness(1.1)' },
                },
                formFieldInput: {
                  backgroundColor: 'rgba(255,255,255,0.065)',
                  borderColor: 'rgba(255,255,255,0.14)',
                  color: '#e9f1f4',
                  borderRadius: '8px',
                },
                formFieldLabel: { color: '#c9d8df' },
                footerActionLink: { color: '#ffd977' },
                dividerLine: { backgroundColor: 'rgba(255,255,255,0.1)' },
                dividerText: { color: '#a7b5bd' },
                identityPreviewEditButton: { color: '#ffd977' },
              },
            }}
          />
        ) : (
          <SignUp
            appearance={{
              elements: {
                rootBox: { width: '100%' },
                card: {
                  backgroundColor: 'transparent',
                  boxShadow: 'none',
                  width: '100%',
                },
                headerTitle: { color: '#fff', fontSize: '22px' },
                headerSubtitle: { color: '#a7b5bd' },
                socialButtonsBlockButton: {
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderColor: 'rgba(255,255,255,0.16)',
                  color: '#e9f1f4',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.12)',
                  },
                },
                formButtonPrimary: {
                  background: 'linear-gradient(180deg, #fff2a9 0%, #ffd35f 52%, #ffad35 100%)',
                  color: '#1a1608',
                  fontWeight: 850,
                  '&:hover': { filter: 'brightness(1.1)' },
                },
                formFieldInput: {
                  backgroundColor: 'rgba(255,255,255,0.065)',
                  borderColor: 'rgba(255,255,255,0.14)',
                  color: '#e9f1f4',
                  borderRadius: '8px',
                },
                formFieldLabel: { color: '#c9d8df' },
                footerActionLink: { color: '#ffd977' },
                dividerLine: { backgroundColor: 'rgba(255,255,255,0.1)' },
                dividerText: { color: '#a7b5bd' },
              },
            }}
          />
        )}

        <div className="auth-toggle">
          {view === 'sign-in' ? (
            <p>
              Don't have an account?{' '}
              <button onClick={() => setView('sign-up')}>Sign up</button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button onClick={() => setView('sign-in')}>Sign in</button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
