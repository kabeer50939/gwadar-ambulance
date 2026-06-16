import React, { useState, useEffect } from 'react';
import { ArrowDownToLine, X, Share, PlusSquare, Info } from 'lucide-react';
import brandLogo from '../assets/logo.png';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Detect if app is already running in standalone/installed mode
    const isRunningStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true;
    setIsStandalone(isRunningStandalone);

    if (isRunningStandalone) return;

    // 2. Detect iOS platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDetected = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDetected);

    // 3. Listen to beforeinstallprompt event (Chromium browsers)
    const handleBeforeInstallPrompt = (e) => {
      // Prevent browser default prompt
      e.preventDefault();
      // Store event to trigger later
      setDeferredPrompt(e);
      
      // Check if user has previously dismissed the prompt in this session
      const isDismissed = sessionStorage.getItem('gasg_install_prompt_dismissed');
      if (!isDismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Listen to appinstalled event
    const handleAppInstalled = () => {
      console.log('GASG was installed successfully!');
      setShowPrompt(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // For iOS users, show instructions if they visit and haven't dismissed it
    if (iosDetected && !isRunningStandalone) {
      const isDismissed = sessionStorage.getItem('gasg_install_prompt_dismissed');
      if (!isDismissed) {
        // Show after a minor delay for better UX
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Trigger installation prompt
    deferredPrompt.prompt();

    // Check user decision
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User installation choice: ${outcome}`);

    if (outcome === 'accepted') {
      setIsStandalone(true);
    }
    
    // Clear prompt state
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    sessionStorage.setItem('gasg_install_prompt_dismissed', 'true');
    setShowPrompt(false);
  };

  // If already installed or shouldn't show, render nothing
  if (isStandalone || !showPrompt) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '90%',
      maxWidth: '460px',
      background: 'rgba(15, 23, 42, 0.95)', // Slate-900 with high opacity
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(239, 68, 68, 0.25)', // Glowing red border
      borderRadius: '20px',
      padding: '1.25rem',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(239, 68, 68, 0.15)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem',
      color: 'white',
      animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
    }}>
      {/* CSS Animation Keyframe (inlined style block helper) */}
      <style>{`
        @keyframes slideUp {
          from {
            transform: translate(-50%, 100px);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
      `}</style>

      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
            padding: '2px'
          }}>
            <img src={brandLogo} alt="GASG Logo" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.5px' }}>
              INSTALL GASG APP
            </h4>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
              Add emergency shortcut to your home screen
            </p>
          </div>
        </div>
        <button 
          onClick={handleDismiss}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255, 255, 255, 0.7)',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'}
        >
          <X size={14} />
        </button>
      </div>

      {/* Content depending on OS */}
      {isIOS ? (
        // iOS Manual Instructions
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
          background: 'rgba(255, 255, 255, 0.04)',
          padding: '0.75rem',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.8rem', lineHeight: '1.4', color: 'rgba(255, 255, 255, 0.9)' }}>
            <Info size={16} style={{ color: 'var(--primary-blue)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              To add to your iPhone home screen:
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', margin: '0.4rem 0', fontWeight: 'bold' }}>
                1. Tap the Share button <Share size={14} style={{ color: '#007aff' }} /> in Safari.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 'bold' }}>
                2. Select "Add to Home Screen" <PlusSquare size={14} /> from the list.
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Chromium/Android Action Prompt
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            onClick={handleInstallClick}
            disabled={!deferredPrompt}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: 'linear-gradient(135deg, #dc2626, #ef4444)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              transition: 'transform 0.1s'
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <ArrowDownToLine size={16} /> Install App Shortcut
          </button>
          
          <button
            onClick={handleDismiss}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'}
          >
            Not Now
          </button>
        </div>
      )}
    </div>
  );
}
