import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Smartphone, Hammer, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useConfig } from '../context/ConfigContext';

const MobileBlocker = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { config } = useConfig();
  const [isMobile, setIsMobile] = useState(false);

  // Default allowed paths (always accessible on mobile)
  const alwaysAllowed = ['/quiz', '/quiz-maker', '/shortener', '/login'];
  
  // Logic to determine if blocked
  const isBlocked = () => {
      // If it's in alwaysAllowed, it's never blocked by the global blocker
      if (alwaysAllowed.some(path => location.pathname.startsWith(path))) return false;
      
      // Check against dynamic blocked list from admin
      const blockedPaths = config?.maintenance?.mobileBlockedPaths || [];
      return blockedPaths.some(path => {
          if (path === '/') return location.pathname === '/';
          return location.pathname.startsWith(path);
      });
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Admin and root (/) might have specific logic
  // If the user is on mobile and the current path is in the blocked list
  const shouldShowBlocker = isMobile && isBlocked();

  return (
    <AnimatePresence>
      {shouldShowBlocker && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            backgroundColor: '#07070b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            color: '#fff',
            overflow: 'hidden'
          }}
        >
          {/* Animated Background Artifacts */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none' }}>
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -100, 0],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 5 + i * 2,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{
                  position: 'absolute',
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  width: '2px',
                  height: '100px',
                  background: 'linear-gradient(to bottom, transparent, var(--accent-main), transparent)'
                }}
              />
            ))}
          </div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 20 }}
            className="glass-panel"
            style={{
              maxWidth: '500px',
              padding: '3rem 2rem',
              border: '1px solid var(--bg-glass-border)',
              borderRadius: '24px',
              backgroundColor: 'rgba(15, 15, 20, 0.9)',
              backdropFilter: 'blur(20px)',
              position: 'relative',
              zIndex: 1
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Hammer size={48} color="var(--accent-main)" />
              </motion.div>
              <Monitor size={48} color="var(--accent-secondary)" />
            </div>

            <h1 style={{ 
              fontSize: '1.8rem', 
              fontFamily: 'Chakra Petch', 
              marginBottom: '1.5rem',
              letterSpacing: '2px',
              color: 'var(--accent-main)' 
            }}>
              {t('mobile.notice_title', 'EXHIBIT UNDER MAINTENANCE')}
            </h1>

            <p style={{ 
              fontSize: '1.1rem', 
              lineHeight: '1.8', 
              color: 'var(--text-secondary)',
              marginBottom: '2.5rem',
              fontFamily: 'Inter'
            }}>
              {t('mobile.notice_desc', 'Hiện tại dự án chỉ sẵn sàng cho trải nghiệm hoàn hảo trên máy tính. Vui lòng truy cập bằng máy tính và chờ đợi phiên bản tốt nhất cho mobile.')}
            </p>

            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.8rem',
              color: 'var(--accent-secondary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.9rem'
            }}>
              <Clock size={16} />
              <span>ESTIMATED COMPLETION: Q3 2026</span>
            </div>

            <div style={{ marginTop: '3rem', opacity: 0.5, fontSize: '0.8rem', letterSpacing: '3px' }}>
              PROTOCOL: PC_ONLY_ACCESS
            </div>
          </motion.div>

          {/* Device Icons Hint */}
          <div style={{ 
            position: 'absolute', 
            bottom: '2rem', 
            left: '50%', 
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            opacity: 0.3
          }}>
            <Smartphone size={24} style={{ color: 'red' }} />
            <div style={{ width: '40px', height: '1px', background: '#fff' }} />
            <Monitor size={24} style={{ color: 'var(--success)' }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileBlocker;
