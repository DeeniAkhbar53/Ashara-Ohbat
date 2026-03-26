'use client'

import { useState, useEffect } from 'react'
import { db } from '../../lib/firebase'
import { collection, onSnapshot, query, addDoc, updateDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, deleteDoc, orderBy } from 'firebase/firestore'

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [activeTab, setActiveTab] = useState('miqaat')
  const [miqaats, setMiqaats] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([]) 
  const [loading, setLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [selectedMiqaats, setSelectedMiqaats] = useState<string[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  const [newMiqaat, setNewMiqaat] = useState({ 
    title: '', 
    servers: [{ label: 'PRIMARY SERVER', source: '', type: 'youtube' }],
    adSource: '',
    isAdActive: false,
    preRollDuration: 15,
    midRollDuration: 30,
    startTime: '',
    endTime: ''
  })

  // Auth check
  useEffect(() => {
    setIsMounted(true)
    const cookiesArr = document.cookie.split('; ').filter(row => row.indexOf('=') !== -1)
    const cookieMap = cookiesArr.reduce((acc: any, row) => {
      const [key, ...values] = row.split('=')
      acc[key.trim()] = values.join('=')
      return acc
    }, {})
    
    const userId = cookieMap.user_id
    if (userId) {
       setIsAuthenticated(true)
       getDoc(doc(db, 'users', userId)).then(snapshot => {
         if (snapshot.exists()) {
           setIsAdmin(!!snapshot.data().isAdmin)
         } else {
           setIsAdmin(false)
         }
       }).catch(err => {
         console.error("Admin check failed:", err)
         setIsAdmin(false)
       })
    } else {
       setIsAuthenticated(false)
       setIsAdmin(false)
    }
  }, [])

  // Fetch data
  useEffect(() => {
    const fetchAll = async () => {
      const collections = ['miqaats', 'miqaat', 'sessions'];
      for (const colName of collections) {
         const snap = await getDocs(collection(db, colName));
         if (snap.size > 0) {
            console.log(`Found ${snap.size} docs in ${colName}`);
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            list.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setMiqaats(list);
            return; // Stop if we found data
         }
      }
    };

    const unsubMiqaat = onSnapshot(query(collection(db, 'miqaats')), (snapshot) => {
      if (snapshot.empty) {
         fetchAll(); // Try other collections if miqaats is empty
      } else {
         const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
         list.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
         setMiqaats(list);
      }
    }, (error) => {
      console.error("Firestore Error:", error);
      alert(`Firestore Connection Error: ${error.message} (${error.code})`);
      fetchAll(); 
    })
    const unsubUsers = onSnapshot(query(collection(db, 'users')), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    })
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000)
    return () => { unsubMiqaat(); unsubUsers(); clearInterval(timer); }
  }, [])

  const handleCreateMiqaat = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data: any = {
        title: newMiqaat.title,
        servers: newMiqaat.servers,
        adSource: newMiqaat.adSource || '',
        preRollDuration: newMiqaat.preRollDuration || 15,
        midRollDuration: newMiqaat.midRollDuration || 30,
        startTime: newMiqaat.startTime ? new Date(newMiqaat.startTime) : null,
        endTime: newMiqaat.endTime ? new Date(newMiqaat.endTime) : null,
        updatedAt: serverTimestamp()
      }
      if (editingId) {
        await updateDoc(doc(db, 'miqaats', editingId), data)
        setEditingId(null)
      } else {
        await addDoc(collection(db, 'miqaats'), { ...data, active: false, createdAt: serverTimestamp() })
      }
      setNewMiqaat({ title: '', servers: [{ label: 'PRIMARY SERVER', source: '', type: 'youtube' }], adSource: '', isAdActive: false, preRollDuration: 15, midRollDuration: 30, startTime: '', endTime: '' })
      setShowModal(false)
    } catch (e: any) {
        alert("Update Failed: " + (e.message || "Unknown Error"));
    } finally { setLoading(false) }
  }

  const editMiqaat = (m: any) => {
    let servers = m.servers;
    // Migrate legacy data if necessary
    if (!servers || servers.length === 0) {
      servers = [];
      if (m.serverA_source) servers.push({ label: 'SERVER A', source: m.serverA_source, type: m.serverA_type || 'youtube' });
      if (m.serverB_source) servers.push({ label: 'SERVER B', source: m.serverB_source, type: m.serverB_type || 'youtube' });
      if (servers.length === 0) servers = [{ label: 'PRIMARY SERVER', source: '', type: 'youtube' }];
    }

    setNewMiqaat({
      title: m.title,
      servers: servers,
      adSource: m.adSource || '',
      isAdActive: m.isAdActive || false,
      preRollDuration: m.preRollDuration || 15,
      midRollDuration: m.midRollDuration || 30,
      startTime: m.startTime ? new Date(m.startTime.seconds * 1000).toISOString().slice(0, 16) : '',
      endTime: m.endTime ? new Date(m.endTime.seconds * 1000).toISOString().slice(0, 16) : ''
    })
    setEditingId(m.id)
    setShowModal(true)
  }


  const resetForm = () => {
    setNewMiqaat({
      title: '',
      servers: [{ label: 'PRIMARY SERVER', source: '', type: 'youtube' }],
      adSource: '',
      isAdActive: false,
      preRollDuration: 15,
      midRollDuration: 30,
      startTime: '',
      endTime: ''
    })
    setEditingId(null)
    setShowModal(false)
  }

  const addServerField = () => {
    setNewMiqaat({ ...newMiqaat, servers: [...newMiqaat.servers, { label: `SERVER ${newMiqaat.servers.length + 1}`, source: '', type: 'youtube' }] })
  }

  const removeServerField = (index: number) => {
    if (newMiqaat.servers.length > 1) {
      const ns = [...newMiqaat.servers];
      ns.splice(index, 1);
      setNewMiqaat({ ...newMiqaat, servers: ns });
    }
  }

  const deleteMiqaat = async (id: string) => {
    if (confirm("Delete this session configuration?")) {
      await deleteDoc(doc(db, 'miqaats', id))
      setSelectedMiqaats(prev => prev.filter(mid => mid !== id))
    }
  }

  const deleteUser = async (id: string) => {
    if (confirm("Delete this user?")) {
       await deleteDoc(doc(db, 'users', id))
       setSelectedUsers(prev => prev.filter(uid => uid !== id))
    }
  }

  const bulkDeleteMiqaats = async () => {
    if (confirm(`Delete ${selectedMiqaats.length} selected sessions?`)) {
       setLoading(true)
       for (const id of selectedMiqaats) await deleteDoc(doc(db, 'miqaats', id))
       setSelectedMiqaats([])
       setLoading(false)
    }
  }

  const bulkDeleteUsers = async () => {
    if (confirm(`Delete ${selectedUsers.length} selected users?`)) {
       setLoading(true)
       for (const id of selectedUsers) await deleteDoc(doc(db, 'users', id))
       setSelectedUsers([])
       setLoading(false)
    }
  }

  const checkIsLive = (m: any) => {
    if (m.active) return true;
    if (!m.startTime || !m.endTime) return false;
    const now = currentTime / 1000;
    return now >= m.startTime.seconds && now <= m.endTime.seconds;
  }

  const toggleActive = async (id: string, current: boolean) => {
    if (!current) {
      // Deactivate others
      for(const m of miqaats) {
          if(m.active && m.id !== id) await updateDoc(doc(db, 'miqaats', m.id), { active: false })
      }
    }
    await updateDoc(doc(db, 'miqaats', id), { active: !current })
  }

  const toggleAd = async (id: string, current: boolean) => {
    await updateDoc(doc(db, 'miqaats', id), { isAdActive: !current })
  }

  const triggerTimedAd = async (m: any) => {
    if (!m.adSource) return alert("Please configure an ad source first.")
    setLoading(true)
    await updateDoc(doc(db, 'miqaats', m.id), { isAdActive: true })
    setTimeout(async () => {
      await updateDoc(doc(db, 'miqaats', m.id), { isAdActive: false })
      setLoading(false)
    }, (m.midRollDuration || 30) * 1000)
  }

  const exportUsersToCSV = () => {
    const headers = ["NAME", "EMAIL", "ITS", "ROLE", "LAST_SEEN"];
    const rows = users.map(u => [
      u.firstName?.replace(/,/g, '') || 'N/A',
      u.email || 'N/A',
      u.its || 'N/A',
      u.isAdmin ? 'ADMIN' : 'USER',
      u.lastSeen ? new Date(u.lastSeen.seconds * 1000).toLocaleString() : 'N/A'
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ashara_users_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  if (!isMounted || isAdmin === null) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f6f8' }}>Validating administrator session...</div>

  if (isAdmin === false) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a2e1c', color: '#fff' }}>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <img src="/ashara logo.png" style={{ width: '80px', marginBottom: '20px' }} />
            <h2 style={{ fontFamily: 'Poppins' }}>ACCESS RESTRICTED</h2>
            <p>Administrative privileges required for this dashboard.</p>
            <button onClick={() => window.location.href = '/'} style={{ padding: '12px 24px', background: '#daaf1d', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 700, marginTop: '20px', color: '#000' }}>BACK TO HOME</button>
          </div>
      </div>
    )
  }

  return (
    <div className="mantis-wrapper">
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800&family=Poppins:wght@600;700&display=swap');
        
        :root { 
          --ashara-green: #0a2e1c; 
          --ashara-gold: #daaf1d; 
          --mantis-bg: #f8fafb;
          --sidebar-width: 280px;
        }

        body { 
          background: var(--mantis-bg) !important; 
          color: #1e293b !important; 
          margin: 0; 
          font-family: 'Public Sans', sans-serif; 
          overflow-x: hidden;
        }

        .admin-layout { display: flex; min-height: 100vh; }

        .sidebar { 
          width: var(--sidebar-width); 
          background: linear-gradient(180deg, #0a2e1c 0%, #05160e 100%); 
          position: fixed; 
          height: 100vh; 
          padding: 30px 20px; 
          z-index: 1100; 
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); 
          box-shadow: 10px 0 40px rgba(0,0,0,0.1); 
        }

        @media (max-width: 992px) { 
          .sidebar { transform: translateX(${isSidebarOpen ? '0' : '-100%'}); } 
        }

        .brand { 
          display: flex; 
          align-items: center; 
          gap: 15px; 
          padding-bottom: 35px; 
          border-bottom: 1px solid rgba(255,255,255,0.08); 
          margin-bottom: 30px; 
        }

        .brand-name { 
          font-weight: 800; 
          color: #fff; 
          font-size: 1.2rem; 
          letter-spacing: 1px; 
          font-family: 'Poppins', sans-serif; 
        }

        .nav-menu { list-style: none; padding: 0; margin: 0; }

        .nav-item { 
          padding: 14px 18px; 
          border-radius: 14px; 
          cursor: pointer; 
          color: rgba(255,255,255,0.6); 
          display: flex; 
          align-items: center; 
          gap: 16px; 
          margin-bottom: 10px; 
          transition: all 0.3s ease; 
          font-size: 0.95rem; 
        }

        .nav-item:hover { 
          background: rgba(255,255,255,0.05); 
          color: #fff; 
          transform: translateX(5px);
        }

        .nav-item.active { 
          background: var(--ashara-gold); 
          color: #000; 
          font-weight: 700; 
          box-shadow: 0 10px 20px rgba(218, 175, 29, 0.2);
        }

        .main-content { 
          flex: 1; 
          margin-left: var(--sidebar-width); 
          padding: 40px; 
          transition: margin-left 0.4s ease;
          min-width: 0;
        }

        @media (max-width: 992px) { 
          .main-content { margin-left: 0; padding: 20px; } 
        }

        .mobile-header { 
          display: none; 
          background: #fff; 
          padding: 15px 25px; 
          border-radius: 20px; 
          margin-bottom: 30px; 
          box-shadow: 0 10px 30px rgba(0,0,0,0.04); 
          align-items: center; 
          justify-content: space-between; 
          position: sticky; 
          top: 15px; 
          z-index: 1000; 
          border: 1px solid #f1f5f9;
        }

        @media (max-width: 992px) { .mobile-header { display: flex; } }

        .stats-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); 
          gap: 25px; 
          margin-bottom: 40px; 
        }

        .stat-card { 
          background: #fff; 
          padding: 30px; 
          border-radius: 24px; 
          border: 1px solid #f1f5f9; 
          box-shadow: 0 15px 35px rgba(0,0,0,0.02); 
          display: flex; 
          flex-direction: column; 
          transition: transform 0.3s ease;
        }

        .stat-card:hover { transform: translateY(-5px); }

        .stat-label { 
          font-size: 0.85rem; 
          color: #64748b; 
          font-weight: 700; 
          margin-bottom: 12px; 
          text-transform: uppercase; 
          letter-spacing: 0.5px;
        }

        .stat-value { 
          font-size: 2.5rem; 
          font-weight: 800; 
          color: var(--ashara-green); 
          line-height: 1;
        }

        .content-card { 
          background: #fff; 
          border-radius: 28px; 
          border: 1px solid #f1f5f9; 
          overflow: hidden; 
          box-shadow: 0 20px 50px rgba(0,0,0,0.03); 
          margin-bottom: 40px; 
        }

        .card-header { 
          padding: 30px 35px; 
          border-bottom: 1px solid #f1f5f9; 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          background: #fafbfc; 
        }

        .card-header h3 { 
          margin: 0; 
          font-size: 1.25rem; 
          color: #1e293b; 
          font-weight: 800; 
        }

        .table-responsive { width: 100%; overflow-x: auto; }

        .mantis-table { width: 100%; border-collapse: collapse; min-width: 900px; }

        .mantis-table th { 
          padding: 22px 35px; 
          background: #f8fafc; 
          text-align: left; 
          font-size: 0.75rem; 
          color: #64748b; 
          font-weight: 800; 
          border-bottom: 2px solid #f1f5f9; 
          text-transform: uppercase; 
          letter-spacing: 1px; 
        }

        .mantis-table td { 
          padding: 22px 35px; 
          border-bottom: 1px solid #f1f5f9; 
          font-size: 0.95rem; 
          color: #334155; 
        }

        .mantis-btn { 
          display: inline-flex; 
          align-items: center; 
          justify-content: center; 
          min-width: 44px; 
          padding: 0 12px; 
          height: 44px; 
          border-radius: 14px; 
          border: 1px solid #e2e8f0; 
          background: #fff; 
          cursor: pointer; 
          transition: all 0.2s ease; 
          font-size: 0.8rem; 
          font-weight: 800; 
          color: #475569;
          gap: 8px;
        }

        @media (max-width: 600px) { 
          .mantis-btn { padding: 0; min-width: 40px; height: 40px; border-radius: 10px; } 
          .btn-text { display: none; }
          .mantis-btn .material-icons { margin: 0 !important; font-size: 1.2rem; }
        }

        .mantis-btn:hover { 
          background: #f8fafc; 
          border-color: #cbd5e1; 
          color: #000;
          transform: translateY(-2px);
        }

        .mantis-btn-primary { 
          padding: 14px 32px; 
          border-radius: 16px; 
          background: var(--ashara-green); 
          color: #fff; 
          border: none; 
          font-weight: 700; 
          cursor: pointer; 
          transition: all 0.3s ease; 
          font-size: 0.95rem; 
          box-shadow: 0 10px 20px rgba(10, 46, 28, 0.15);
        }

        .mantis-btn-primary:hover { 
          opacity: 0.9; 
          transform: translateY(-2px); 
          box-shadow: 0 15px 30px rgba(10, 46, 28, 0.2);
        }

        .badge { 
          padding: 8px 16px; 
          border-radius: 14px; 
          font-size: 0.75rem; 
          font-weight: 800; 
          display: inline-block; 
          letter-spacing: 0.5px;
        }

        .badge-live { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        .badge-offline { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }

        .modal-overlay { 
          position: fixed; 
          top: 0; left: 0; right: 0; bottom: 0; 
          background: rgba(15, 23, 42, 0.6); 
          backdrop-filter: blur(8px); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          z-index: 2000; 
          padding: 24px; 
        }

        .modal-content { 
          background: #fff; 
          padding: 45px; 
          border-radius: 32px; 
          width: 100%; 
          max-width: 680px; 
          max-height: 90vh; 
          overflow-y: auto; 
          box-shadow: 0 30px 60px -12px rgba(0,0,0,0.3); 
        }

        .mantis-input { 
          width: 100%; 
          padding: 16px 22px; 
          border-radius: 16px; 
          border: 1px solid #e2e8f0; 
          outline: none; 
          box-sizing: border-box; 
          font-size: 1rem; 
          transition: all 0.2s ease; 
          background: #fcfdfe; 
          color: #1e293b;
        }

        .mantis-input:focus { 
          border-color: var(--ashara-gold); 
          box-shadow: 0 0 0 4px rgba(218, 175, 29, 0.15); 
          background: #fff;
        }

        .form-label { 
          font-size: 0.85rem; 
          font-weight: 700; 
          color: #64748b; 
          display: block; 
          margin-bottom: 10px; 
          text-transform: uppercase; 
          letter-spacing: 0.5px;
        }
      `}</style>

      <div className="admin-layout">
        <aside className="sidebar">
          <div className="brand">
            <img src="/ashara logo.png" alt="Logo" style={{ width: '36px' }} />
            <div className="brand-name">ADMIN PORTAL</div>
          </div>
          <ul className="nav-menu">
            <li className={`nav-item ${activeTab === 'miqaat' ? 'active' : ''}`} onClick={() => { setActiveTab('miqaat'); setIsSidebarOpen(false); }}>
              <span className="material-icons">dashboard</span> Dashboard
            </li>
            <li className={`nav-item ${activeTab === 'add_miqaat' ? 'active' : ''}`} onClick={() => { setActiveTab('add_miqaat'); setIsSidebarOpen(false); }}>
              <span className="material-icons">settings</span> Settings
            </li>
            <li className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }}>
              <span className="material-icons">people</span> Directory
            </li>
            <li className="nav-item" onClick={() => (window.location.href = '/')}>
              <span className="material-icons">tv</span> Live Site
            </li>
          </ul>
        </aside>

        <main className="main-content">
          <header className="mobile-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
               <img src="/ashara logo.png" style={{ width: '32px' }} />
               <span style={{ fontWeight: 800 }}>ASHARA ADMIN</span>
            </div>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #eee', background: '#fff' }}>
              {isSidebarOpen ? '✕' : '☰'}
            </button>
          </header>

          {activeTab === 'miqaat' && (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-label">Total Registered</span>
                  <span className="stat-value">{users.length}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Realtime Viewers</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="stat-value">{users.filter(u => u.lastSeen && (currentTime/1000 - u.lastSeen.seconds) < 15).length}</span>
                    <span style={{ color: '#ef4444', animation: 'pulse 1.5s infinite', fontWeight: 800, fontSize: '0.8rem' }}>● LIVE</span>
                  </div>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Active Sessions</span>
                  <span className="stat-value">{miqaats.filter(checkIsLive).length}</span>
                </div>
              </div>

              <div className="content-card">
                <div className="card-header">
                  <h3>Live Relay Control</h3>
                </div>
                <div className="table-responsive">
                  <div style={{ padding: '15px 35px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '15px', alignItems: 'center', background: '#fffbeb' }}>
                      <input type="checkbox" checked={selectedMiqaats.length === miqaats.length && miqaats.length > 0} onChange={() => setSelectedMiqaats(selectedMiqaats.length === miqaats.length ? [] : miqaats.map(m => m.id))} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#b45309' }}>SELECT ALL SESSIONS</span>
                      {selectedMiqaats.length > 0 && (
                        <button className="mantis-btn" onClick={bulkDeleteMiqaats} style={{ background: '#ef4444', color: '#fff', border: 'none', marginLeft: 'auto', padding: '0 20px' }}>
                           DELETE ({selectedMiqaats.length})
                        </button>
                      )}
                  </div>
                  <table className="mantis-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}></th>
                        <th>Miqaat Name</th>
                        <th>Status</th>
                        <th>Ad Active</th>
                        <th>Quick Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {miqaats.map(m => (
                        <tr key={m.id} style={{ background: selectedMiqaats.includes(m.id) ? '#fffbeb' : 'transparent' }}>
                          <td>
                             <input type="checkbox" checked={selectedMiqaats.includes(m.id)} onChange={() => setSelectedMiqaats(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])} style={{ cursor: 'pointer' }} />
                          </td>
                          <td>
                             <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>{m.title}</div>
                             <small style={{ color: '#94a3b8' }}>ID: {m.id.substring(0,8)}</small>
                          </td>
                          <td>
                            {checkIsLive(m) ? <span className="badge badge-live">LIVE NOW</span> : <span className="badge badge-offline">OFFLINE</span>}
                            {m.startTime && !checkIsLive(m) && (
                               <div style={{ fontSize: '0.6rem', color: '#64748b', marginTop: '4px' }}>
                                 SCHEDULED: {new Date(m.startTime.seconds * 1000).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                               </div>
                            )}
                          </td>
                          <td>
                            {m.isAdActive ? <span style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.75rem' }}>● AD ON</span> : <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>AUTO / OFF</span>}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                               <button className="mantis-btn" title="Toggle Live" onClick={() => toggleActive(m.id, m.active)} style={{ background: m.active ? 'var(--ashara-green)' : '#fff', color: m.active ? '#fff' : '#000' }}>
                                 <span className="material-icons">{m.active ? 'stop' : 'play_arrow'}</span>
                                 <span className="btn-text">{m.active ? 'STOP' : 'START'}</span>
                               </button>
                               <button className="mantis-btn" title="Manual AD Toggle" onClick={() => toggleAd(m.id, m.isAdActive)} style={{ background: m.isAdActive ? '#ef4444' : '#fff', color: m.isAdActive ? '#fff' : '#ef4444' }}>
                                 <span className="material-icons">campaign</span>
                                 <span className="btn-text">AD</span>
                               </button>
                               <button className="mantis-btn" title="Edit" onClick={() => editMiqaat(m)}>
                                 <span className="material-icons">edit</span>
                               </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {miqaats.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>No active relay configurations. Use the Settings tab to initialize.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'add_miqaat' && (
             <div className="content-card">
                <div className="card-header">
                  <h3>Session Configurations</h3>
                  <button className="mantis-btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>+ Create Miqaat</button>
                </div>
                <div className="table-responsive">
                  <div style={{ padding: '15px 28px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '15px', alignItems: 'center', background: '#fffbeb' }}>
                      <input type="checkbox" checked={selectedMiqaats.length === miqaats.length && miqaats.length > 0} onChange={() => setSelectedMiqaats(selectedMiqaats.length === miqaats.length ? [] : miqaats.map(m => m.id))} style={{ width: '18px', height: '18px' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>SELECT ALL</span>
                      {selectedMiqaats.length > 0 && (
                        <button className="mantis-btn" onClick={bulkDeleteMiqaats} style={{ background: '#ef4444', color: '#fff', border: 'none', marginLeft: 'auto' }}>
                           DELETE SELECTED ({selectedMiqaats.length})
                        </button>
                      )}
                  </div>
                  <table className="mantis-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}></th>
                        <th>Miqaat Title</th>
                        <th>Server Details</th>
                        <th>Custom Ad</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {miqaats.map(m => (
                        <tr key={m.id} style={{ background: selectedMiqaats.includes(m.id) ? '#fffbeb' : 'transparent' }}>
                          <td>
                             <input type="checkbox" checked={selectedMiqaats.includes(m.id)} onChange={() => setSelectedMiqaats(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])} />
                          </td>
                          <td><strong>{m.title}</strong></td>
                          <td>
                            <div style={{ fontSize: '0.8rem' }}>
                               {!m.servers && (m.serverA_source || m.serverB_source) ? (
                                  <>
                                    Legacy Config Detected
                                    <div style={{ marginTop: '4px', display: 'flex', gap: '4px' }}>
                                       {m.serverA_source && <span style={{ padding: '2px 6px', background: '#ffeef0', borderRadius: '4px', fontSize: '0.65rem', border: '1px solid #ffccc7' }}>SERVER A</span>}
                                       {m.serverB_source && <span style={{ padding: '2px 6px', background: '#ffeef0', borderRadius: '4px', fontSize: '0.65rem', border: '1px solid #ffccc7' }}>SERVER B</span>}
                                    </div>
                                    <small style={{ display: 'block', marginTop: '4px', color: '#ff4d4f' }}>Please click Edit to migrate to new system.</small>
                                  </>
                               ) : (
                                  <>
                                    {m.servers?.length || 0} Configured Servers
                                    <div style={{ marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                       {m.servers?.map((s:any, i:number) => <span key={i} style={{ padding: '2px 6px', background: '#f1f5f9', borderRadius: '4px', fontSize: '0.65rem', border: '1px solid #e2e8f0' }}>{s.label}</span>)}
                                    </div>
                                  </>
                               )}
                            </div>
                          </td>
                          <td>{m.adSource ? <span style={{ color: '#059669' }}>✓ Configured</span> : <span style={{ color: '#cbd5e1' }}>None</span>}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                               <button className="mantis-btn" title="Start/Stop Live" onClick={() => toggleActive(m.id, m.active)} style={{ background: m.active ? '#0a2e1c' : '#fff', color: m.active ? '#fff' : '#000' }}>
                                 {m.active ? 'STOP' : 'START'}
                               </button>
                               <button className="mantis-btn" title="Manual AD Break" onClick={() => toggleAd(m.id, m.isAdActive)} style={{ background: m.isAdActive ? '#ef4444' : '#fff', color: m.isAdActive ? '#fff' : '#ef4444', fontSize: '0.6rem', fontWeight: 900 }}>
                                 MAN
                               </button>
                               <button className="mantis-btn" title={`Start ${m.midRollDuration || 30}s Auto Break`} onClick={() => triggerTimedAd(m)} style={{ background: '#722ed1', color: '#fff', fontSize: '0.6rem', fontWeight: 900 }}>
                                 AUTO
                               </button>
                               <button className="mantis-btn" onClick={() => editMiqaat(m)}>✎</button>
                               <button className="mantis-btn" style={{ color: '#ef4444' }} onClick={() => deleteMiqaat(m.id)}>🗑</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
          )}

          {activeTab === 'users' && (
             <div className="content-card">
                <div className="card-header">
                  <h3>Mumineen Directory</h3>
                  <button className="mantis-btn-primary" onClick={exportUsersToCSV}>📥 Export CSV</button>
                </div>
                <div className="table-responsive">
                  <div style={{ padding: '15px 35px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '15px', alignItems: 'center', background: '#f8fafc' }}>
                      <input type="checkbox" checked={selectedUsers.length === users.length && users.length > 0} onChange={() => setSelectedUsers(selectedUsers.length === users.length ? [] : users.map(u => u.id))} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b' }}>SELECT ALL MUMINEEN</span>
                      {selectedUsers.length > 0 && (
                        <button className="mantis-btn" onClick={bulkDeleteUsers} style={{ background: '#ef4444', color: '#fff', border: 'none', marginLeft: 'auto', padding: '0 20px' }}>
                           DELETE ({selectedUsers.length})
                        </button>
                      )}
                  </div>
                  <table className="mantis-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}></th>
                        <th>Name & Details</th>
                        <th>Role</th>
                        <th>Last Seen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.sort((a,b) => (b.lastSeen?.seconds || 0) - (a.lastSeen?.seconds || 0)).map(u => (
                        <tr key={u.id} style={{ background: selectedUsers.includes(u.id) ? '#f8fafc' : 'transparent' }}>
                          <td>
                             <input type="checkbox" checked={selectedUsers.includes(u.id)} onChange={() => setSelectedUsers(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])} style={{ cursor: 'pointer' }} />
                          </td>
                          <td>
                             <div style={{ fontWeight: 800, color: '#1e293b' }}>{u.firstName || 'Unknown'}</div>
                             <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{u.email} • ITS: {u.its || 'N/A'}</div>
                          </td>
                          <td>
                            {u.isAdmin ? <span className="badge" style={{ background: '#fef3c7', color: '#b45309' }}>ADMIN</span> : <span className="badge" style={{ background: '#f1f5f9', color: '#64748b' }}>MUMIN</span>}
                          </td>
                          <td style={{ fontSize: '0.85rem' }}>
                            {u.lastSeen ? new Date(u.lastSeen.seconds * 1000).toLocaleString() : 'Never'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
          )}

          {showModal && (
            <div className="modal-overlay">
               <div className="modal-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <h3 style={{ margin: 0 }}>{editingId ? 'Update Miqaat Session' : 'Create New Miqaat'}</h3>
                    <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                  </div>
                  <form onSubmit={handleCreateMiqaat}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                           <label className="form-label">Relay Title</label>
                           <input className="mantis-input" value={newMiqaat.title} onChange={e => setNewMiqaat({...newMiqaat, title: e.target.value})} placeholder="e.g. 10mi Raat (Majlis)" required />
                        </div>
                        <div>
                           <label className="form-label">IST START TIME</label>
                           <input type="datetime-local" className="mantis-input" value={newMiqaat.startTime} onChange={e => setNewMiqaat({...newMiqaat, startTime: e.target.value})} />
                        </div>
                        <div>
                           <label className="form-label">IST STOP TIME</label>
                           <input type="datetime-local" className="mantis-input" value={newMiqaat.endTime} onChange={e => setNewMiqaat({...newMiqaat, endTime: e.target.value})} />
                        </div>
                      </div>

                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', padding: '24px', background: '#fffbeb', borderRadius: '18px', marginBottom: '24px', border: '1px solid #fef3c7' }}>
                        <div style={{ gridColumn: '1 / span 2' }}>
                           <label className="form-label" style={{ color: '#b45309' }}>AdSense / HTML Ad Integration</label>
                           <textarea className="mantis-input" value={newMiqaat.adSource} onChange={e => setNewMiqaat({...newMiqaat, adSource: e.target.value})} placeholder="Paste your <ins> or <script> tags here..." style={{ minHeight: '80px', marginTop: '10px' }} />
                        </div>
                        <div>
                           <label className="form-label" style={{ color: '#b45309' }}>Pre-roll (sec)</label>
                           <input type="number" className="mantis-input" value={newMiqaat.preRollDuration} onChange={e => setNewMiqaat({...newMiqaat, preRollDuration: parseInt(e.target.value)})} />
                        </div>
                        <div>
                           <label className="form-label" style={{ color: '#b45309' }}>Mid-roll (sec)</label>
                           <input type="number" className="mantis-input" value={newMiqaat.midRollDuration} onChange={e => setNewMiqaat({...newMiqaat, midRollDuration: parseInt(e.target.value)})} />
                        </div>
                        <p style={{ gridColumn: '1 / span 2', margin: '4px 0 0 0', fontSize: '0.7rem', color: '#b45309' }}>Pre-roll shows for 1st-time viewers. Mid-roll is for scheduled breaks.</p>
                     </div>

                     <div style={{ marginBottom: '12px' }}>
                        <label className="form-label">Streaming Servers</label>
                     </div>
                     {newMiqaat.servers.map((s, idx) => (
                        <div key={idx} style={{ padding: '20px', border: '1px solid #f1f5f9', borderRadius: '18px', marginBottom: '16px', background: '#f8fafc' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                              <input style={{ fontWeight: 700, border: 'none', background: 'none', fontSize: '0.85rem', width: '70%' }} value={s.label} onChange={e => {
                                 let ns = [...newMiqaat.servers]; ns[idx].label = e.target.value; setNewMiqaat({...newMiqaat, servers: ns})
                              }} />
                              {newMiqaat.servers.length > 1 && <button type="button" onClick={() => removeServerField(idx)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}>Remove</button>}
                           </div>
                           <input className="mantis-input" value={s.source} onChange={e => {
                              let ns = [...newMiqaat.servers]; ns[idx].source = e.target.value; setNewMiqaat({...newMiqaat, servers: ns})
                           }} placeholder="YouTube Link, HLS .m3u8, or Iframe Embed" style={{ marginBottom: '12px' }} />
                           <select className="mantis-input" value={s.type} onChange={e => {
                              let ns = [...newMiqaat.servers]; ns[idx].type = e.target.value; setNewMiqaat({...newMiqaat, servers: ns})
                           }}>
                               <option value="youtube">YouTube (Video)</option>
                               <option value="hls">HLS Stream (.m3u8)</option>
                               <option value="audio">Direct Audio (.mp3 / HLS Audio)</option>
                               <option value="iframe">Direct Iframe Embed</option>
                           </select>
                        </div>
                     ))}
                     
                     <button type="button" className="mantis-btn" onClick={addServerField} style={{ width: '100%', marginBottom: '24px', borderStyle: 'dashed', borderRadius: '18px', gap: '8px', fontSize: '0.9rem' }}>
                       <span>+</span> Add Another Server Option
                     </button>

                     <div style={{ display: 'flex', gap: '15px' }}>
                        <button type="button" className="mantis-btn-primary" style={{ background: '#f1f5f9', color: '#1e293b', flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="mantis-btn-primary" style={{ flex: 2 }} disabled={loading}>{loading ? 'Saving Miqaat...' : 'Save Configuration'}</button>
                     </div>
                  </form>
               </div>
            </div>
          )}
        </main>
      </div>
      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
