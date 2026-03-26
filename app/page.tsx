import { cookies } from 'next/headers'
import LoginForm from './LoginForm'
import UserHome from './UserHome'

export default async function Page() {
  const cookieStore = await cookies()
  const isAuthorized = cookieStore.get('ashara_session')?.value === 'true'
  const userName = cookieStore.get('user_name')?.value?.toUpperCase() || ''
  const userId = cookieStore.get('user_id')?.value || ''

  return (
    <div className="main-container" suppressHydrationWarning>
      {/* Top Border */}
      <div className="border-tile top-border" />

      {!isAuthorized ? (
        <div className="page-wrapper">
          {/* --- LOGIN VIEW --- */}
          <div className="login-section">
            <div className="header-logo">
              <img src="/ashara logo.png" alt="Ashara Ohbat 1448H" className="header-logo-img" />
            </div>

            <h3 className="page-title">LOGIN FOR LIVE RELAY</h3>

            <LoginForm />

            <div className="support-section">
              For Audio / Video related queries please contact on <br />
              <a href="mailto:contact@deeniakhbar53.in" className="support-link">support</a> between 8:00 PM to 11:00 PM
            </div>
          </div>

          <div className="visual-section">
            <img
              src="/login image.png"
              alt="Ashara 1448H Calligraphy"
              className="calligraphy-img"
            />
          </div>
        </div>
      ) : (
        <UserHome userName={userName} userId={userId} />
      )}

      {/* Bottom Border */}
      <div className="border-tile bottom-border" />
    </div>
  )
}
