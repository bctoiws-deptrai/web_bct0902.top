import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LoadingScreen = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 200);
          return 100;
        }
        return prev + 5;
      });
    }, 40);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#07070b',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {}
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          filter: [
            'drop-shadow(0 0 10px var(--accent-main))',
            'drop-shadow(0 0 30px var(--accent-main))',
            'drop-shadow(0 0 10px var(--accent-main))'
          ]
        }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ marginBottom: '2rem' }}
      >
        <img 
          src="/logobct.png" 
          alt="BCT" 
          style={{ width: '120px', height: '120px', objectFit: 'contain' }} 
        />
      </motion.div>

      {}
      <div style={{
        width: '200px',
        height: '4px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '2px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {}
        <motion.div
          animate={{ width: `${progress}%` }}
          style={{
            height: '100%',
            backgroundColor: 'var(--accent-main)',
            boxShadow: '0 0 10px var(--accent-main)',
          }}
        />
      </div>

      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          marginTop: '1rem',
          color: 'var(--accent-main)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          letterSpacing: '2px'
        }}
      >
        INITIALIZING CORE... {progress}%
      </motion.span>
    </motion.div>
  );
};

export default LoadingScreen;
