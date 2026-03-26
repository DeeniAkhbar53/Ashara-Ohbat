'use client'

import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import { doc, onSnapshot } from 'firebase/firestore'
import { logout } from './actions'

export default function ActionBar({ userId, onHomeClick }: { userId: string, onHomeClick?: () => void }) {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!userId) return
    const unsub = onSnapshot(doc(db, 'users', userId), (docSnap) => {
      if (docSnap.exists()) {
        setIsAdmin(!!docSnap.data().isAdmin)
      }
    })
    return () => unsub()
  }, [userId])

  return (
    <div className="action-buttons">
      {onHomeClick && (
        <button type="button" className="btn" onClick={onHomeClick} style={{ background: 'transparent', color: '#daaf1d', border: '1px solid #daaf1d', fontWeight: 600 }}>
          HOME
        </button>
      )}
      <form action={logout} className="action-form">
        <button type="submit" className="btn btn-logout">
          LOGOUT
        </button>
      </form>
      {isAdmin && (
        <button 
          type="button" 
          className="btn btn-report" 
          onClick={() => window.location.href = '/admin'}
          style={{ background: '#daaf1d', color: '#000', border: 'none', fontWeight: 600 }}
        >
          ADMIN PANEL
        </button>
      )}
    </div>
  )
}
