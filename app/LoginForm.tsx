'use client'

import { useState } from 'react'
import { auth, googleProvider, db } from '../lib/firebase'
import { signInWithPopup } from 'firebase/auth'
import { collection, addDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore'
import { login } from './actions'

export default function LoginForm() {
  const [step, setStep] = useState(1) // 1: Google Login, 2: Persons Attendance
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [attendees, setAttendees] = useState('')

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      if (result.user) {
        setUser(result.user)
        setStep(2) // Move to attendance step
      }
    } catch (error) {
      console.error('Google Sign-In Error:', error)
      alert("Registration failed or window closed.")
    } finally {
      setLoading(false)
    }
  }

  const handleAttendanceSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    
    // Use Gmail display name if available, fallback to email prefix
    const firstName = (user.displayName || user.email?.split('@')[0] || 'USER').toUpperCase()
    
    try {
      // 1. Save User Profile to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        firstName: firstName,
        lastLogin: serverTimestamp(),
        attendance_count: attendees
      }, { merge: true })

      // 2. Log attendance trip
      await addDoc(collection(db, 'attendances'), {
        uid: user.uid,
        email: user.email,
        count: attendees,
        timestamp: serverTimestamp()
      })

      // 3. Finalize Session via Cookies
      const formData = new FormData()
      formData.append('firstName', firstName)
      formData.append('userId', user.uid)
      await login(formData)
      window.location.reload()
    } catch (err) {
      console.error('Firestore Error:', err)
      alert("Error saving your profile. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-panel">
      {step === 1 ? (
        <button 
          onClick={handleGoogleLogin} 
          className="login-button" 
          disabled={loading}
        >
          {loading ? 'CONNECTING...' : 'LOGIN WITH GMAIL'}
        </button>
      ) : (
        <form onSubmit={handleAttendanceSubmit} className="login-form">
          <p style={{ marginBottom: '15px' }}>Logged in as: <strong>{user?.displayName || user?.email}</strong></p>
          <input
            type="number"
            name="attendance_count"
            placeholder="No. of Persons attending Majlis"
            required
            className="input-field"
            min="1"
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
          />
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'FINISHING...' : 'LOGIN'}
          </button>
        </form>
      )}
    </div>
  )
}
