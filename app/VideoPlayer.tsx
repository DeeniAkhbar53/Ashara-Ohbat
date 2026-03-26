'use client'

import { useEffect, useState, useRef } from 'react'
import { db } from '../lib/firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import Script from 'next/script'

interface Miqaat {
  id: string;
  title: string;
  adSource?: string;
  isAdActive?: boolean;
  preRollDuration?: number;
  midRollDuration?: number;
  servers?: any[];
  serverA_source?: string;
  serverA_type?: string;
  serverB_source?: string;
  serverB_type?: string;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
    adsbygoogle: any;
  }
}

const AdSenseAd = ({ inPlayer = false }: { inPlayer?: boolean }) => {
    useEffect(() => {
        try {
            ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        } catch(e) {}
    }, []);

    return (
        <div style={{ width: '100%', height: inPlayer ? '100%' : 'auto', minHeight: inPlayer ? 'auto' : '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <ins className="adsbygoogle"
                 style={{ display: 'block', width: '100%', height: inPlayer ? '100%' : 'auto' }}
                 data-ad-client="ca-pub-4478399347291835"
                 data-ad-slot="3828932583"
                 data-ad-format="auto"
                 data-full-width-responsive="true"></ins>
        </div>
    );
};

export default function VideoPlayer() {
  const [isMounted, setIsMounted] = useState(false)
  const [activeMiqaat, setActiveMiqaat] = useState<Miqaat | null>(null)
  const [selectedServer, setSelectedServer] = useState<string | null>(null)
  const [preRollActive, setPreRollActive] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const initialLoadDone = useRef(false)
  const playerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Initialization
  useEffect(() => {
    setIsMounted(true)
    const unsub = onSnapshot(collection(db, 'miqaats'), (snapshot) => {
      const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const findLive = () => {
         const now = Date.now() / 1000;
         return all.find((m: any) => {
            if (m.active) return true;
            if (m.startTime && m.endTime) {
               return now >= m.startTime.seconds && now <= m.endTime.seconds;
            }
            return false;
         });
      };

      const m: any = findLive();
      if (m) {
        if (!activeMiqaat || activeMiqaat.id !== m.id) {
           setActiveMiqaat(m);
           if (!initialLoadDone.current && m.adSource) {
              setPreRollActive(true);
              initialLoadDone.current = true;
              setTimeout(() => setPreRollActive(false), (m.preRollDuration || 15) * 1000);
           }
           if (!selectedServer) {
              if (m.servers && m.servers.length > 0) setSelectedServer('0');
              else if (m.serverA_source) setSelectedServer('A');
           }
        }
      } else {
        setActiveMiqaat(null);
        setSelectedServer(null);
        initialLoadDone.current = false;
      }
    });

    // Re-check every minute to see if a scheduled session started
    const interval = setInterval(() => { if (!activeMiqaat) setIsMounted(v => !v); }, 60000);

    return () => { unsub(); clearInterval(interval); }
  }, [selectedServer, activeMiqaat?.id])

  const currentSource = activeMiqaat && selectedServer ? 
    (activeMiqaat.servers && !isNaN(parseInt(selectedServer)) ? 
      activeMiqaat.servers[parseInt(selectedServer)] : 
      (selectedServer === 'A' ? 
        { source: activeMiqaat.serverA_source, type: activeMiqaat.serverA_type } : 
        { source: activeMiqaat.serverB_source, type: activeMiqaat.serverB_type })) 
    : null;

  const isEmbedType = (src?: string, type?: string) => type === 'embed' || (src && (src.includes('<iframe') || src.includes('<div') || src.includes('<script')));
  const isYTType = (src?: string, type?: string) => type === 'youtube' || (src && (src.includes('youtube.com') || src.includes('youtu.be') || (src.length === 11 && !src.includes('.'))));
  const isAudioType = (src?: string, type?: string) => type === 'audio' || (src && !isYTType(src, type) && !isEmbedType(src, type) && src.includes('.'));

  const isEmbedMode = isEmbedType(currentSource?.source, currentSource?.type);
  const isAudioMode = isAudioType(currentSource?.source, currentSource?.type);
  const isYTMode = isYTType(currentSource?.source, currentSource?.type);

  const isAdVisible = activeMiqaat?.isAdActive || preRollActive;

  // YT API Loader
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, [])

  // Player Setup
  useEffect(() => {
    if (!activeMiqaat || isAdVisible || !selectedServer) return;
    
    const resolve = activeMiqaat.servers && !isNaN(parseInt(selectedServer)) ?
      activeMiqaat.servers[parseInt(selectedServer)] :
      (selectedServer === 'A' ? 
        { source: activeMiqaat.serverA_source, type: activeMiqaat.serverA_type } : 
        { source: activeMiqaat.serverB_source, type: activeMiqaat.serverB_type });

    if (!isYTType(resolve?.source, resolve?.type)) return;

    let videoId = '';
    if (resolve.source.includes('v=')) videoId = resolve.source.split('v=')[1].split('&')[0];
    else if (resolve.source.includes('youtu.be/')) videoId = resolve.source.split('youtu.be/')[1].split('?')[0];
    else videoId = resolve.source;

    const interval = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(interval);
        if (playerRef.current) playerRef.current.destroy();
        
        playerRef.current = new window.YT.Player(`yt-player-${activeMiqaat.id}`, {
          height: '100%',
          width: '100%',
          videoId: videoId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            disablekb: 1,
            fs: 0
          },
          events: {
            onReady: (event: any) => {
              setDuration(event.target.getDuration());
              event.target.playVideo();
            },
            onStateChange: (event: any) => {
              if (event.data === window.YT.PlayerState.PLAYING) setIsPlaying(true);
              else if (event.data === window.YT.PlayerState.PAUSED) setIsPlaying(false);
            }
          }
        });
      }
    }, 100);

    return () => {
      if (playerRef.current) {
         playerRef.current.destroy();
         playerRef.current = null;
      }
      clearInterval(interval);
    }
  }, [activeMiqaat?.id, selectedServer, isAdVisible])

  // Progress Tracker
  useEffect(() => {
    const timer = setInterval(() => {
      if (isYTMode && playerRef.current && playerRef.current.getCurrentTime) {
         setCurrentTime(playerRef.current.getCurrentTime());
         setDuration(playerRef.current.getDuration() || 0);
      } else if (isAudioMode && audioRef.current) {
         setCurrentTime(audioRef.current.currentTime);
         setDuration(audioRef.current.duration || 0);
      }
    }, 500);
    return () => clearInterval(timer);
  }, [currentSource?.type]);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  const togglePlay = () => {
    if (isYTMode && playerRef.current) {
       if (isPlaying) playerRef.current.pauseVideo();
       else playerRef.current.playVideo();
    } else if (isAudioMode && audioRef.current) {
       if (isPlaying) audioRef.current.pause();
       else audioRef.current.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const targetTime = percent * duration;

    if (isYTMode && playerRef.current) {
       playerRef.current.seekTo(targetTime);
    } else if (isAudioMode && audioRef.current) {
       audioRef.current.currentTime = targetTime;
    }
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current.requestFullscreen();
  }

  if (!isMounted || !activeMiqaat) {
    return (
      <div className="player-placeholder" style={{ 
          textAlign: 'center', 
          padding: '40px 20px', 
          width: '100%', 
          minHeight: '400px', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #05160e 0%, #0a2e1c 100%)',
          borderRadius: '24px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          position: 'relative',
          overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.1, background: 'url("/dashboard image.png") center/cover no-repeat' }} />
        <img src="/dashboard image.png" alt="Ya Hussain" style={{ width: 'clamp(100px, 15vw, 180px)', marginBottom: '25px', position: 'relative', zIndex: 1 }} />
        <div className="pulse-loader" style={{ marginBottom: '15px' }}></div>
        <p style={{ color: '#daaf1d', fontFamily: 'Bebas Neue', fontSize: 'clamp(1rem, 4vw, 1.8rem)', letterSpacing: '2px', position: 'relative', zIndex: 1, margin: 0 }}>
           {!isMounted ? 'INITIALIZING PORTAL...' : 'WAITING FOR RELAY...'}
        </p>
        <style jsx>{`
            .pulse-loader {
               width: 40px; height: 40px; border: 3px solid rgba(218, 175, 29, 0.1); border-top-color: #daaf1d; border-radius: 50%;
               animation: spin 1s linear infinite;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    )
  }

  return (
    <div className="video-player-wrapper" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
      <style jsx>{`
        .persistent-player {
          width: 100%;
          max-width: 900px;
          background: #000;
          border-radius: 12px;
          overflow: hidden;
          position: relative;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .video-frame { width: 100%; height: 100%; pointer-events: none; }
        .video-tap-overlay { 
          position: absolute; top: 0; left: 0; width: 100%; height: 100%; 
          z-index: 5; cursor: pointer; 
        }
        .custom-video-controls {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          padding: 15px 20px;
          background: linear-gradient(transparent, rgba(0, 0, 0, 0.85));
          z-index: 10;
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
          box-sizing: border-box;
        }
        .persistent-player:hover .custom-video-controls {
          opacity: 1;
          pointer-events: auto;
        }
        .video-progress-container {
          width: 100%;
          height: 5px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          margin-bottom: 15px;
          cursor: pointer;
          position: relative;
        }
        .video-progress-bar {
          height: 100%;
          background: #093d71;
          border-radius: 2px;
          transition: width 0.1s linear;
        }
        .controls-main {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .controls-left, .controls-right {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .control-btn {
          background: none;
          border: none;
          color: #fff;
          cursor: pointer;
          padding: 5px;
          display: flex;
          align-items: center;
          transition: 0.2s;
        }
        .control-btn:hover { color: #cc8a27; transform: scale(1.1); }
        .control-btn .material-icons { font-size: 24px; }
        .play-pause-icon { width: 32px; height: 32px; filter: drop-shadow(0 0 5px rgba(0,0,0,0.5)); }
        .time-display {
          color: #fff;
          font-family: 'Public Sans', sans-serif;
          font-size: 0.85rem;
          font-weight: 500;
          letter-spacing: 0.5px;
        }
        .server-selector {
           display: flex; gap: 15px; margin-bottom: 15px; flex-wrap: wrap; justify-content: center;
        }
        .server-selector .btn {
           padding: clamp(8px, 2vw, 12px) clamp(15px, 4vw, 35px) !important;
           font-size: clamp(0.75rem, 2.5vw, 0.95rem) !important;
           letter-spacing: 0.5px !important;
           transition: 0.3s;
           border-radius: 50px !important;
           border: 1px solid rgba(255,255,255,0.1) !important;
           white-space: nowrap;
        }
        .server-selector .btn:hover {
           background: #daaf1d !important;
           color: #000 !important;
           transform: translateY(-2px);
        }

        @media (max-width: 600px) {
           .server-selector { gap: 8px !important; }
           .server-selector .btn { padding: 6px 18px !important; }
        }

        .central-graphic {
           width: clamp(160px, 35vw, 350px) !important;
           transition: 0.3s;
           object-fit: contain;
        }
      `}</style>

      <Script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4478399347291835" crossOrigin="anonymous" strategy="afterInteractive" />
      
      <h2 style={{ color: '#fff', fontFamily: 'Poppins', fontWeight: 'bold', fontSize: '1.8rem', textAlign: 'center', marginBottom: '5px' }}>
        {activeMiqaat.title}
      </h2>

      {!isAdVisible && (
        <div className="server-selector">
          {activeMiqaat.servers ? activeMiqaat.servers.map((s: any, idx: number) => (
            <button key={idx} className="btn" onClick={() => setSelectedServer(idx.toString())}
              style={{ borderRadius: '50px', background: selectedServer === idx.toString() ? '#daaf1d' : 'rgba(255,255,255,0.05)', color: selectedServer === idx.toString() ? '#000' : '#fff', padding: '8px 25px', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 700, fontSize: '0.8rem' }}>
              {s.label.toUpperCase()}
            </button>
          )) : (
            <>
              {activeMiqaat.serverA_source && <button className="btn" onClick={() => setSelectedServer('A')} style={{ borderRadius: '50px', background: selectedServer === 'A' ? '#daaf1d' : 'rgba(255,255,255,0.05)', color: selectedServer === 'A' ? '#000' : '#fff', padding: '8px 25px', fontWeight: 700 }}>SERVER A</button>}
              {activeMiqaat.serverB_source && <button className="btn" onClick={() => setSelectedServer('B')} style={{ borderRadius: '50px', background: selectedServer === 'B' ? '#daaf1d' : 'rgba(255,255,255,0.05)', color: selectedServer === 'B' ? '#000' : '#fff', padding: '8px 25px', fontWeight: 700 }}>SERVER B</button>}
            </>
          )}
        </div>
      )}

      <div className="persistent-player" ref={containerRef} onMouseEnter={() => setShowControls(true)} onMouseLeave={() => setShowControls(false)}
        style={{ 
          aspectRatio: currentSource?.type === 'audio' ? 'auto' : '16/9', 
          minHeight: currentSource?.type === 'audio' ? '120px' : 'auto',
          background: currentSource?.type === 'audio' ? 'linear-gradient(45deg, #0a2e1c, #000)' : '#000'
        }}
      >
        {isAdVisible ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                 <AdSenseAd inPlayer={true} />
            </div>
        ) : (
          <>
            <div className="video-frame" id={`yt-player-${activeMiqaat.id}`} style={{ 
               position: !isYTMode ? 'absolute' : 'relative',
               left: !isYTMode ? '-9999px' : '0',
               opacity: !isYTMode ? 0 : 1
            }}>
               {!selectedServer && <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>INITIALIZING...</div>}
            </div>

            {isEmbedMode && currentSource?.source && (
                 <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 6 }}
                    ref={(el) => {
                       if (el && el.innerHTML === '') {
                          const range = document.createRange();
                          const fragment = range.createContextualFragment(currentSource.source);
                          el.appendChild(fragment);
                       }
                    }} 
                 />
            )}

            {isAudioMode && (
                  <div style={{ padding: '0 40px', display: 'flex', alignItems: 'center', gap: '20px', width: '100%', height: '100%', position: 'relative', zIndex: 2 }}>
                     <div style={{ display: 'flex', gap: '4px', height: '40px', alignItems: 'flex-end' }}>
                        {[...Array(8)].map((_, i) => (
                           <div key={i} style={{ width: '4px', background: '#daaf1d', height: isPlaying ? '100%' : '15%', animation: isPlaying ? `pulse 1s infinite ${i * 0.1}s` : 'none', borderRadius: '4px' }} />
                        ))}
                     </div>
                     <div style={{ color: '#fff' }}>
                        <div style={{ fontWeight: 800, color: '#daaf1d', fontSize: '1.2rem', letterSpacing: '1px' }}>LIVE AUDIO STREAM</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{activeMiqaat.title}</div>
                     </div>
                     {currentSource?.source && (
                        <audio autoPlay src={currentSource.source} ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
                     )}
                  </div>
            )}
            
            {!isEmbedMode && <div className="video-tap-overlay" onClick={togglePlay}></div>}

            <div className="custom-video-controls" style={{ opacity: (showControls || isAudioMode) ? 1 : 0, pointerEvents: 'auto', display: isEmbedMode ? 'none' : 'block' }}>
                <div className="video-progress-container" onClick={handleSeek}>
                    <div className="video-progress-bar" style={{ width: `${(currentTime / duration) * 100 || 0}%` }}></div>
                </div>
                <div className="controls-main">
                    <div className="controls-left">
                        <button className="control-btn" onClick={togglePlay}>
                            <svg viewBox="0 0 24 24" className="play-pause-icon" fill="#daaf1d">
                                {isPlaying ? (
                                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                                ) : (
                                    <path d="M8 5v14l11-7z"/>
                                )}
                            </svg>
                        </button>
                        <div className="time-display">
                            <span>{formatTime(currentTime)}</span> / <span>{formatTime(duration)}</span>
                        </div>
                    </div>
                    <div className="controls-right">
                        <button className="control-btn" onClick={() => (playerRef.current as any).setPlaybackQuality('hd1080')} title="Picture in Picture">
                            <span className="material-icons">picture_in_picture_alt</span>
                        </button>
                        <button className="control-btn active" title="Continuous Playback">
                            <span className="material-icons">playlist_play</span>
                        </button>
                        <button className="control-btn" onClick={toggleFullscreen} title="Fullscreen">
                            <span className="material-icons">open_in_full</span>
                        </button>
                        <button className="control-btn" title="Close" onClick={() => setActiveMiqaat(null)}>
                            <span className="material-icons">close</span>
                        </button>
                    </div>
                </div>
            </div>
          </>
        )}
      </div>

      <div style={{ width: '100%', maxWidth: '900px', margin: '20px 0' }}>
         <AdSenseAd />
      </div>

      <img src="/dashboard image.png" alt="Ya Hussain" className="central-graphic" style={{ opacity: selectedServer || isAdVisible ? 0.5 : 0.8 }} />
    </div>
  )
}
