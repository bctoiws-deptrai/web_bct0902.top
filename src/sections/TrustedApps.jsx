import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useConfig } from '../context/ConfigContext';

const apps = [
  { name: "Antigravity", color: "#00d2ff", icon: (props) => (
    <svg viewBox="0 0 100 100" fill="none" {...props}>
      <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2" strokeDasharray="10 5" opacity="0.5" />
      <path d="M50 20L25 75h10L50 40l15 35h10L50 20z" fill="currentColor" />
      <circle cx="50" cy="50" r="10" fill="currentColor" />
    </svg>
  )},
  { name: "Github", color: "#ffffff", icon: (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
    </svg>
  )},
  { name: "Brave", color: "#fb542b", icon: (props) => (
    <img src="/brave.svg" alt="Brave" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
  )},
  { name: "Vercel", color: "#ffffff", icon: (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M24 22.525H0L12 1.475L24 22.525Z"/>
    </svg>
  )},
  { name: "iNet", color: "#F26522", icon: (props) => (
    <svg viewBox="0 0 300 100" {...props}>
      <path fill="#005BAB" d="M35.2 28.5h11.4v43H35.2zM56.8 28.5L78 57.2V28.5h11V71.5H77.5L56.4 42.8v28.7h-11V28.5h11.4zM99.6 28.5h27.2v9h-16.2v8.5h14.5v9h-14.5v8h17.2v8.5H99.6zM135.5 37.5h-9.8v-9h31.2v9h-10v34h-11.4z"/>
      <circle fill="#F26522" cx="180" cy="50" r="15"/>
    </svg>
  )},
  { name: "Apple", color: "#ffffff", icon: (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.67-1.48 3.671-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.605 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.82-.78.897-1.467 2.338-1.284 3.71.1.01.196.013.303.013 1.104 0 2.438-.7 3.268-1.713z"/>
    </svg>
  )},
  { name: "Canva", color: "#00c4cc", icon: (props) => (
    <img src="/Canva.svg" alt="Canva" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
  )},
  { name: "Microsoft", color: "#F25022", icon: (props) => (
    <svg viewBox="0 0 23 23" {...props}>
      <path fill="#f25022" d="M0 0h11v11H0z"/><path fill="#7fba00" d="M12 0h11v11H12z"/><path fill="#00a4ef" d="M0 12h11v11H0z"/><path fill="#ffb900" d="M12 12h11v11H12z"/>
    </svg>
  )},
  { name: "Office 365", color: "#D83B01", icon: (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22.083 4.25l-10.25-3.083c-.342-.1-.667.158-.667.508v20.667c0 .35.325.608.667.508l10.25-3.083c.25-.075.417-.3.417-.558V4.808c0-.258-.167-.483-.417-.558zM1.917 19.75l10.25 3.083c.342.1.667-.158.667-.508V1.675c0-.35-.325-.608-.667-.508L1.917 4.25c-.25.075-.417.3-.417.558v14.384c0 .258.167.483.417.558z" fill="#D83B01"/>
    </svg>
  )},
  { name: "Photoshop", color: "#31A8FF", icon: (props) => (
    <svg viewBox="0 0 1024 1024" {...props}>
      <rect width="1024" height="1024" rx="180" fill="#001e36"/>
      <path d="M266 312h170c90 0 148 45 148 132s-58 132-148 132h-74v136H266V312zm96 79v106h74c42 0 54-20 54-53s-12-53-54-53h-74z" fill="#31a8ff"/>
      <path d="M664 473c-45 0-72 25-72 58 0 32 24 50 64 62 42 12 58 20 60 40 2 18-12 28-36 28-28 0-48-12-54-34l-82 22c12 54 58 88 136 88 78 0 128-40 128-100s-40-84-104-100c-40-10-52-18-52-32s12-25 32-25c24 0 44 10 52 28l80-32c-12-42-54-65-110-65z" fill="#31a8ff"/>
    </svg>
  )},
  { name: "Linux", color: "#fcc624", icon: (props) => (
    <img src="/Linux.svg" alt="Linux" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
  )},
  { name: "Centos", color: "#22ad2c", icon: (props) => (
    <svg viewBox="0 0 200 200" {...props}>
      <path fill="#932279" d="M100 13.5v86.5H13.5z"/>
      <path fill="#214497" d="M186.5 100H100V13.5z"/>
      <path fill="#118833" d="M100 186.5V100h86.5z"/>
      <path fill="#EF9200" d="M13.5 100H100v86.5z"/>
      <path fill="#FFD400" d="M100 50l15 15-15 15-15-15z"/>
      <path fill="#FFFFFF" d="M100 70l10 10-10 10-10-10z"/>
    </svg>
  )},
  { name: "VS Code", color: "#007ACC", icon: (props) => (
    <svg viewBox="0 0 24 24" fill="#007ACC" {...props}>
      <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .327 8.71l4.263 3.291-4.263 3.291a1 1 0 0 0 0 1.45l1.322 1.154a1 1 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.86L10.822 12l7.182-5.447v10.894z"/>
    </svg>
  )},
  { name: "OBS", color: "#ffffff", icon: (props) => (
    <img src="/obs.svg" alt="OBS" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
  )},
  { name: "VM Ware", color: "#607078", icon: (props) => (
    <img src="/vmware.svg" alt="VMware" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
  )}
];

const TrustedApps = () => {
  const { t } = useTranslation();
  const { config } = useConfig();

  const displayApps = config?.apps?.length > 0 ? config.apps.map(app => ({
    ...app,
    
    icon: (props) => {
      if (app.iconUrl) return <img src={app.iconUrl} alt={app.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
      const found = apps.find(a => a.name === app.name);
      return found ? <found.icon {...props} /> : <img src="/logobct.png" style={{ width: '100%' }} />;
    }
  })) : apps;

  const marqueeApps = [...displayApps, ...displayApps];

  return (
    <section id="trusted-apps" style={{ padding: '1rem 0', overflow: 'hidden', position: 'relative' }}>
      <div className="container" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{ 
            fontSize: '2.5rem', 
            marginBottom: '1.5rem',
            fontFamily: "'Chakra Petch', sans-serif"
          }}
          className="text-gradient"
        >
          {t('trusted.title')}
        </motion.h2>
        <div style={{ width: '60px', height: '4px', background: 'var(--accent-main)', margin: '0 auto' }} />
      </div>

      <div style={{ position: 'relative', width: '100%', display: 'flex' }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '150px', height: '100%',
          background: 'linear-gradient(to right, var(--bg-main), transparent)',
          zIndex: 2, pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', top: 0, right: 0, width: '150px', height: '100%',
          background: 'linear-gradient(to left, var(--bg-main), transparent)',
          zIndex: 2, pointerEvents: 'none'
        }} />

        <motion.div 
          style={{ 
            display: 'flex', 
            gap: '3rem',
            padding: '2rem 0',
          }}
          animate={{ x: [0, -1920] }} 
          transition={{ 
            duration: 40, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        >
          {marqueeApps.map((app, idx) => (
            <div 
              key={idx}
              className="glass-panel"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                minWidth: '160px',
                height: '140px',
                padding: '1.5rem',
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                opacity: 0.4,
                cursor: 'pointer'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'scale(1.1) translateY(-10px)';
                e.currentTarget.style.borderColor = app.color;
                e.currentTarget.style.boxShadow = `0 15px 30px -10px ${app.color}44`;
                const svg = e.currentTarget.querySelector('svg');
                if (svg) svg.style.filter = 'drop-shadow(0 0 8px ' + app.color + '44)';
                e.currentTarget.querySelector('span').style.color = app.color;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.opacity = '0.4';
                e.currentTarget.style.transform = 'scale(1) translateY(0)';
                e.currentTarget.style.borderColor = 'var(--bg-glass-border)';
                e.currentTarget.style.boxShadow = 'none';
                const svg = e.currentTarget.querySelector('svg');
                if (svg) svg.style.filter = 'none';
                e.currentTarget.querySelector('span').style.color = 'var(--text-muted)';
              }}
            >
              <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <app.icon width="100%" height="100%" />
              </div>
              <span style={{ 
                fontSize: '0.8rem', 
                fontWeight: 600, 
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                transition: 'color 0.3s'
              }}>
                {app.name}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default TrustedApps;
