import React from 'react';
import { motion } from 'framer-motion';

const FlipCard = ({ char, delay }) => {
  return (
    <div style={{
      position: 'relative',
      display: 'inline-block',
      width: char === ' ' ? '1rem' : 'clamp(2rem, 6vw, 4rem)',
      height: 'clamp(3rem, 8vw, 6rem)',
      margin: '0 2px',
      perspective: '1000px',
    }}>
      {char !== ' ' && (
        <motion.div
          initial={{ rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          transition={{ 
            duration: 0.8, 
            delay: delay,
            ease: "backOut"
          }}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--bg-glass)',
            border: '1px solid var(--bg-glass-border)',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            transformStyle: 'preserve-3d',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            backfaceVisibility: 'hidden'
          }}
        >
          <span style={{ 
            fontSize: 'clamp(2rem, 6vw, 4rem)', 
            fontWeight: 800,
            fontFamily: 'var(--font-heading)',
            background: 'linear-gradient(180deg, #fff 0%, var(--accent-main) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {char}
          </span>
          
          {}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: '1px',
            background: 'rgba(255,255,255,0.1)',
            zIndex: 1
          }} />
        </motion.div>
      )}
    </div>
  );
};

const FlipClockText = ({ text }) => {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
      {text.split('').map((char, index) => (
        <FlipCard key={index} char={char} delay={index * 0.1} />
      ))}
    </div>
  );
};

export default FlipClockText;
