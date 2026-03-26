'use client'

import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import { collection, onSnapshot } from 'firebase/firestore'
import VideoPlayer from './VideoPlayer'
import Tracker from './Tracker'
import ActionBar from './ActionBar'

export default function UserHome({ userName, userId }: { userName: string, userId: string }) {
  const [activeMiqaat, setActiveMiqaat] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'pick' | 'dash'>('pick')
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(Date.now() / 1000)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'miqaats'), (snapshot) => {
      const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const now = Date.now() / 1000;
      
      const found = all.find((m: any) => {
        if (m.active) return true;
        if (m.startTime && m.endTime) {
          return now >= m.startTime.seconds && now <= m.endTime.seconds;
        }
        return false;
      });
      
      setActiveMiqaat(found || null);
      setLoading(false);
    });

    const timer = setInterval(() => setCurrentTime(Date.now() / 1000), 10000);
    return () => { unsub(); clearInterval(timer); }
  }, [])

  if (loading) {
    return (
      <div style={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loader"></div>
      </div>
    )
  }

  if (viewMode === 'pick' || !activeMiqaat) {
    return (
      <div className="selection-view" style={{ minHeight: '100%' }}>
        <div className="dashboard-top-bar" suppressHydrationWarning>
          <div className="top-bar-logo">
            <img src="/ashara logo.png" alt="Ashara Ohbat 1448H" className="top-bar-logo-img" />
          </div>
          <div className="dashboard-actions">
            <div className="user-info">
              User : <span className="user-name">{userName}</span>
            </div>
            <ActionBar userId={userId} />
          </div>
        </div>

        <div className="selection-overlay" style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <style jsx>{`
            .miqaat-card {
              background: linear-gradient(145deg, #05160e 0%, #0a2e1c 100%);
              border-radius: 30px;
              padding: 50px 40px;
              width: 100%;
              max-width: 500px;
              text-align: center;
              box-shadow: 0 40px 100px rgba(0,0,0,0.6);
              border: 1px solid rgba(218, 175, 29, 0.2);
              transition: transform 0.3s ease;
            }
            .miqaat-card:hover { transform: translateY(-10px); }
            .ashara-card-logo { width: 120px; margin-bottom: 30px; }
            .enter-btn {
              background: #daaf1d;
              color: #000;
              border: none;
              padding: 18px 45px;
              border-radius: 50px;
              font-family: 'Poppins', sans-serif;
              font-weight: 800;
              font-size: 1.1rem;
              cursor: pointer;
              margin-top: 25px;
              box-shadow: 0 10px 30px rgba(218, 175, 29, 0.4);
              transition: all 0.3s ease;
            }
            .enter-btn:hover { background: #fff; transform: scale(1.05); }
            .disabled-card { cursor: default; }
          `}</style>
          
          <div className={`miqaat-card ${!activeMiqaat ? 'disabled-card' : ''}`}>
            <img src="/ashara logo.png" className="ashara-card-logo" alt="Ashara logo" />
            
            {activeMiqaat ? (
              <>
                <h2 style={{ color: '#daaf1d', fontSize: '1.8rem', marginBottom: '10px' }}>{activeMiqaat.title}</h2>
                <p style={{ color: '#fff', opacity: 0.8, marginBottom: '20px' }}>
                  Join the live relay now for {activeMiqaat.title}.
                </p>
                <button className="enter-btn" onClick={() => setViewMode('dash')}>
                   ENTER LIVE RELAY
                </button>
              </>
            ) : (
              <>
                <h2 style={{ color: '#daaf1d', fontSize: '1.8rem', marginBottom: '10px' }}>NO CURRENT MIQAAT</h2>
                <p style={{ color: '#fff', opacity: 0.8, marginBottom: '20px' }}>
                  Please stay tuned. The next relay will appear here automatically when scheduled.
                </p>
                <button className="enter-btn" disabled style={{ background: '#334155', color: '#64748b', opacity: 0.5 }}>
                   REMAINING OFFLINE
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-view" suppressHydrationWarning>
      <style jsx>{`
        .back-nav {
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          color: #daaf1d;
          font-weight: 700;
          font-size: 0.9rem;
        }
      `}</style>
      
      <div className="dashboard-top-bar" suppressHydrationWarning>
        <div className="top-bar-logo" onClick={() => setViewMode('pick')} style={{ cursor: 'pointer' }}>
          <img src="/ashara logo.png" alt="Ashara Ohbat 1448H" className="top-bar-logo-img" />
        </div>

        <div className="dashboard-actions">
          <div className="user-info">
            User : <span className="user-name">{userName}</span>
          </div>
          <ActionBar userId={userId} onHomeClick={viewMode === 'dash' ? () => setViewMode('pick') : undefined} />
        </div>
      </div>

      <div className="dashboard-content" suppressHydrationWarning>
        <div className="mobile-logo-only" onClick={() => setViewMode('pick')}>
           <img src="/ashara logo.png" alt="Ashara Ohbat 1448H" className="header-logo-img" />
        </div>

        <VideoPlayer />
        <Tracker userId={userId} />
      </div>
    </div>
  )
}
