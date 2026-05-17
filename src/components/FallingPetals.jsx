import React from 'react';
import { motion } from 'framer-motion';

const Petal = ({ delay }) => {
  const randomXInit = Math.random() * 100;
  const randomDuration = 10 + Math.random() * 20;
  const randomScale = 0.5 + Math.random() * 1;
  const petalsColors = [
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', 
    'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)', 
    'linear-gradient(135deg, #ff9a3d 0%, #ffb000 100%)', 
    'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)', 
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', 
    'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)', 
    'linear-gradient(135deg, var(--accent-main), var(--accent-secondary))' 
  ];
  const randomColor = petalsColors[Math.floor(Math.random() * petalsColors.length)];

  return (
    <motion.div
      initial={{ 
        top: '-10%', 
        left: `${randomXInit}%`, 
        opacity: 0, 
        rotate: 0,
        scale: randomScale 
      }}
      animate={{ 
        top: '110%', 
        left: [`${randomXInit}%`, `${randomXInit + (Math.random() > 0.5 ? 10 : -10)}%`, `${randomXInit}%`],
        opacity: [0, 0.6, 0.6, 0],
        rotate: [0, 180, 360, 540, 720],
      }}
      transition={{ 
        duration: randomDuration, 
        repeat: Infinity, 
        delay: delay,
        ease: "linear"
      }}
      style={{
        position: 'absolute',
        width: '15px',
        height: '20px',
        background: randomColor,
        borderRadius: '50% 0 50% 50%',
        filter: 'blur(1px)',
        zIndex: -1,
        pointerEvents: 'none'
      }}
    />
  );
};

const FallingPetals = () => {
  const petalCount = 25;
  const petals = Array.from({ length: petalCount });

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: -1,
      overflow: 'hidden'
    }}>
      {petals.map((_, i) => (
        <Petal key={i} delay={i * 1.5} />
      ))}
    </div>
  );
};

export default FallingPetals;
