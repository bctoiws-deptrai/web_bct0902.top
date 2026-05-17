import React from 'react';
import { motion } from 'framer-motion';

const OrbRing = ({ size, rotateX, rotateY, color, width, duration, invert = false, innerSvg, borderStyle = 'solid' }) => (
  <motion.div
    animate={{ rotateX: rotateX + 360, rotateY: rotateY + (invert ? -360 : 360) }}
    transition={{ duration, repeat: Infinity, ease: "easeInOut", repeatType: "mirror" }}
    style={{
      position: 'absolute',
      width: size,
      height: size,
      border: `${width}px ${borderStyle} ${color}`,
      borderRadius: '50%',
      boxShadow: width > 2 ? `inset 0 0 20px rgba(0,0,0,0.5), 0 0 15px ${color}44` : `0 0 10px ${color}44`,
      transformStyle: 'preserve-3d',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {innerSvg && innerSvg}
  </motion.div>
);

const TechSphere = () => {
  return (
    <div style={{
      position: 'absolute',
      right: '2%',
      top: '10%',
      width: '600px',
      height: '600px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      perspective: '1200px',
      zIndex: -1,
      pointerEvents: 'none'
    }}>
      {}
      <div style={{
        position: 'absolute',
        top: '-200px',
        width: '400px',
        height: '800px',
        background: 'linear-gradient(180deg, rgba(212, 175, 55, 0.15) 0%, transparent 80%)',
        filter: 'blur(50px)',
        transform: 'rotate(-25deg)',
      }} />

      {}
      <div style={{
        position: 'absolute',
        width: '450px',
        height: '450px',
        background: 'radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, transparent 60%)',
        filter: 'blur(30px)',
      }} />

      {}
      {}
      <OrbRing size="550px" rotateX={0} rotateY={0} color="var(--accent-gold)" width={1} duration={80} borderStyle="dashed" />
      
      {}
      <OrbRing size="480px" rotateX={70} rotateY={20} color="rgba(212, 175, 55, 0.4)" width={18} duration={40} invert />
      
      {}
      <OrbRing size="440px" rotateX={-20} rotateY={60} color="var(--accent-gold)" width={2} duration={50} />
      
      {}
      <motion.div
        animate={{ rotateX: 360, rotateZ: 360 }}
        transition={{ duration: 70, repeat: Infinity, ease: "linear" }}
        style={{
          position: 'absolute',
          width: '360px',
          height: '360px',
          border: '10px double rgba(180, 140, 40, 0.6)',
          borderRadius: '50%',
          boxShadow: 'inset 0 0 25px rgba(0,0,0,0.8), 0 0 20px rgba(212, 175, 55, 0.2)',
        }}
      >
        {}
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, opacity: 0.4 }}>
           {Array.from({length: 48}).map((_, i) => (
             <line key={i} x1="50" y1="0.5" x2="50" y2={i % 4 === 0 ? "8" : "4"} transform={`rotate(${i * 7.5} 50 50)`} stroke="var(--accent-gold)" strokeWidth={i % 4 === 0 ? "0.8" : "0.3"} />
           ))}
        </svg>
      </motion.div>

      {}
      <motion.div
        animate={{ rotateY: -360, rotateZ: 180 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        style={{
          position: 'absolute',
          width: '280px',
          height: '280px',
          border: '2px solid rgba(212, 175, 55, 0.4)',
          borderRadius: '50%',
        }}
      />

      {}
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: '100px',
          height: '100px',
          background: 'radial-gradient(circle, #ffeaa7 0%, rgba(212, 175, 55, 0.8) 50%, transparent 80%)',
          borderRadius: '50%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: 0.9,
          boxShadow: '0 0 60px rgba(212, 175, 55, 0.3), inset -10px -10px 20px rgba(0,0,0,0.5)'         }}
      >
        <motion.div 
           animate={{ rotate: 360 }}
           transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
           style={{ width: '60px', height: '60px', borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.5)' }} 
        />
      </motion.div>

      {}
      {Array.from({ length: 15 }).map((_, i) => {
        const radius = 150 + Math.random() * 120; 
        const angle = Math.random() * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const duration = 20 + Math.random() * 30; 
        
        return (
          <motion.div
            key={i}
            animate={{ rotateZ: 360 }}
            transition={{ duration, repeat: Infinity, ease: "linear" }}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
             {}
             <motion.div 
               animate={{ opacity: [0.2, 0.8, 0.2] }}
               transition={{ duration: 5 + Math.random() * 5, repeat: Infinity, ease: "easeInOut" }}
               style={{ 
                 position: 'absolute',
                 transform: `translate(${x}px, ${y}px)`,
                 width: i % 5 === 0 ? '6px' : '3px', 
                 height: i % 5 === 0 ? '6px' : '3px', 
                 background: i % 5 === 0 ? '#fff' : 'var(--accent-gold)', 
                 borderRadius: '50%',
                 boxShadow: `0 0 15px ${i % 5 === 0 ? '#fff' : 'var(--accent-gold)'}`
               }} 
             />
          </motion.div>
        );
      })}
    </div>
  );
};

export default TechSphere;
