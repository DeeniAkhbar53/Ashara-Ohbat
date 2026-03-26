'use client'

import { useEffect } from 'react'
import { db } from '../lib/firebase'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'

export default function Tracker({ userId }: { userId: string }) {
  useEffect(() => {
    if (!userId) return

    const updateStatus = async () => {
      try {
        const userRef = doc(db, 'users', userId) 
        await updateDoc(userRef, { lastSeen: serverTimestamp() })
      } catch (e) {
        // Fallback for case where user doc might not match ID or something
      }
    }

    updateStatus()
    const interval = setInterval(updateStatus, 5000) 
    return () => clearInterval(interval)
  }, [userId])

  return null
}
