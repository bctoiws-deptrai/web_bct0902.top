import { 
  MessageSquare, 
  Globe, 
  Send, 
  Music, 
  Tv, 
  Bot, 
  Ghost, 
  Pin, 
  DollarSign, 
  FileText, 
  Image as ImageIcon, 
  Gamepad2,
  Trash2
} from 'lucide-react';

const SocialIcon = ({ name, size = 20, color = 'currentColor' }) => {
  const brandName = name?.toLowerCase() || '';

  // 1. Zalo
  if (brandName.includes('zalo')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <path d="M22.05 10.3c-.05-1.55-1.12-2.85-2.6-3.14-1.63-.33-3.23.51-3.77 2.01-.15.36-.21.78-.18 1.16.06.66.33 1.25.76 1.74-.82 1.62-1.83 3.12-3.03 4.54-1.2-1.42-2.21-2.92-3.03-4.54.43-.49.7-1.08.76-1.74.03-.38-.03-.8-.18-1.16-.54-1.5-2.14-2.34-3.77-2.01-1.48.29-2.55 1.59-2.6 3.14-.02.43.05.86.2 1.27.42 1.13 1.45 1.94 2.67 2.04v2.96c0 .35.28.63.63.63.17 0 .33-.07.45-.19l2.45-2.43c1.37.08 2.76.12 4.14.12 1.38 0 2.77-.04 4.14-.12l2.45 2.43c.12.12.28.19.45.19.35 0 .63-.28.63-.63v-2.96c1.22-.1 2.25-.91 2.67-2.04.15-.41.22-.84.2-1.27z"/>
      </svg>
    );
  }

  if (brandName.includes('facebook')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
      </svg>
    );
  }

  if (brandName.includes('youtube')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.14 1 12 1 12s0 3.86.46 5.58a2.78 2.78 0 0 0 1.94 2c1.72.42 8.6.42 8.6.42s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.86 23 12 23 12s0-3.86-.46-5.58z"></path>
        <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"></polygon>
      </svg>
    );
  }

  if (brandName.includes('tiktok')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path>
      </svg>
    );
  }

  if (brandName.includes('instagram')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
      </svg>
    );
  }

  if (brandName.includes('telegram')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
    );
  }

  if (brandName.includes('linkedin')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
        <rect x="2" y="9" width="4" height="12"></rect>
        <circle cx="4" cy="4" r="2"></circle>
      </svg>
    );
  }

  if (brandName.includes('github')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7a3.37 3.37 0 0 0-.94 2.58V22"></path>
      </svg>
    );
  }

  if (brandName.includes('x') || brandName.includes('twitter')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
        <path d="M4 20l6.768 -6.768m2.464 -2.464l6.768 -6.768" />
      </svg>
    );
  }

  if (brandName.includes('discord')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="12" r="1"></circle>
        <circle cx="15" cy="12" r="1"></circle>
        <path d="M7.5 7.1c2-.7 4.1-.7 6.1 0"></path>
        <path d="M7.1 12.6C6 14 5.6 15 5.6 16.5c0 1.2 5.5 3 6.4 3s6.4-1.8 6.4-3c0-1.5-.4-2.5-1.5-3.9"></path>
        <path d="M11 20c.4.6 1.4.6 1.8 0"></path>
      </svg>
    );
  }

  if (brandName.includes('reddit')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm3 10a1 1 0 1 1-1-1 1 1 0 0 1 1 1zm-6 1a1 1 0 1 1 1-1 1 1 0 0 1-1 1z"></path>
        <path d="M17 17a5 5 0 0 1-10 0"></path>
      </svg>
    );
  }

  if (brandName.includes('threads')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 12c0-3 2.5-5.5 5.5-5.5S23 9 23 12s-2 5.5-5.5 5.5S12 15 12 12z" />
        <path d="M14 12c0-1.1.9-2 2-2s2 .9 2 2-0.9 2-2 2-2-.9-2-2z" />
        <path d="M12 12c0 3-2.5 5.5-5.5 5.5S1 15 1 12s2-5.5 5.5-5.5S12 9 12 12z" />
      </svg>
    );
  }

  if (brandName.includes('twitch')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2H3v16h5v4l4-4h5l4-4V2z"></path>
        <line x1="11" y1="7" x2="11" y2="11"></line>
        <line x1="16" y1="7" x2="16" y2="11"></line>
      </svg>
    );
  }

  if (brandName.includes('spotify')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M8 12c2-1 4-1 8 0"></path>
        <path d="M7 15c3-1 6-1 10 0"></path>
        <path d="M9 9c2-1 3-1 6 0"></path>
      </svg>
    );
  }

  if (brandName.includes('apple')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20.94c1.88 0 3.05-1.35 4.34-1.35 1.25 0 2.11.83 3.49.83 2 0 3.17-2.45 3.17-2.45s-2.09-1.2-2.09-3.41c0-2.34 2.17-3.45 2.17-3.45s-1.87-2.55-4.43-2.55c-1.2 0-2.28.69-3.41.69-1.12 0-2.26-.74-3.5-.74C8.92 8.51 6 10.87 6 15.08c0 4.14 3 8.35 5.5 8.35.53 0 1.34-.14 2-.45"/>
        <path d="M15.07 4c-.11 2.37-2.08 4.29-4.32 4.29M12 4c.26-2.14 2-3.8 4.13-3.8"/>
      </svg>
    );
  }

  if (brandName.includes('snapchat')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2c-.6 0-1.1.2-1.5.5C8.4 4.1 6.8 6.5 6.1 9.1c-.2.7-.3 1.4-.2 2.1l-.8 1.1c-.4.5-.4 1.2-.1 1.7.3.5 1 .7 1.6.5l.8-.2c.4 1.3 1.4 2.4 2.7 3.1-.4.5-.7 1.1-.7 1.8 0 1.2 1 2.2 2.2 2.2s2.2-1 2.2-2.2c0-.7-.3-1.3-.7-1.8 1.3-.7 2.3-1.8 2.7-3.1l.8.2c.6.2 1.3 0 1.6-.5.3-.5.3-1.2-.1-1.7l-.8-1.1c.1-.7.1-1.4-.2-2.1-.7-2.6-2.3-5-4.4-6.6-.4-.3-.9-.5-1.5-.5z"/>
      </svg>
    );
  }

  if (brandName.includes('pinterest')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M11.5 17c.5 1 1 2.5 1 4"></path>
        <path d="M12 8c-3 0-5 2-5 5.5s3.5 4.5 5 2c1.5-2.5 3-5 3-7.5S13.5 8 12 8z"></path>
      </svg>
    );
  }

  if (brandName.includes('patreon')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="14.5" cy="9.5" r="5.5"></circle>
        <rect x="5" y="4" width="3" height="16"></rect>
      </svg>
    );
  }

  if (brandName.includes('medium')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="6" cy="12" rx="4" ry="7"></ellipse>
        <ellipse cx="15" cy="12" rx="2" ry="6"></ellipse>
        <rect x="20" y="7" width="1" height="10"></rect>
      </svg>
    );
  }

  if (brandName.includes('slack')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="13" y="2" width="3" height="8" rx="1.5"></rect>
        <rect x="19" y="9" width="3" height="8" rx="1.5"></rect>
        <rect x="8" y="14" width="3" height="8" rx="1.5"></rect>
        <rect x="2" y="7" width="3" height="8" rx="1.5"></rect>
      </svg>
    );
  }

  if (brandName.includes('messenger')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C6.48 2 2 6.13 2 11.23c0 2.91 1.46 5.51 3.75 7.25V22l3.36-1.85c.91.25 1.88.38 2.89.38 5.52 0 10-4.13 10-9.23S17.52 2 12 2z"></path>
        <path d="m8 13 3-3 3 3 3-3"></path>
      </svg>
    );
  }

  if (brandName.includes('steam')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22.1c-1.3 0-2.4-.7-3.1-1.7l-4.5-1.5c-.7-.2-1.1-.9-.9-1.6.2-.7.9-1.1 1.6-.9l4.5 1.5c.3-.5.9-.8 1.4-.8 1.1 0 2 1 2 2.1s-.9 2.1-2 2.1zm0-3.1c-.5 0-1 .4-1 1s.5 1 1 1 1-.4 1-1-.4-1-1-1zM20 10.6c0 1.9-1.5 3.4-3.4 3.4s-3.4-1.5-3.4-3.4c0-1.9 1.5-3.4 3.4-3.4s3.4 1.5 3.4 3.4zm-3.4-2c-.8 0-1.4.6-1.4 1.4s.6 1.4 1.4 1.4 1.4-.6 1.4-1.4-.6-1.4-1.4-1.4zM4.6 15.6c.7 0 1.4.6 1.4 1.4s-.6 1.4-1.4 1.4-1.4-.6-1.4-1.4.6-1.4 1.4-1.4z"/>
        <path d="M12 12.1c2.1 0 3.8-1.7 3.8-3.8s-1.7-3.8-3.8-3.8-3.8 1.7-3.8 3.8l.1 1.7c-2 1.3-3 3.8-2 6 1.1 2.3 3.7 3.2 6 2l1.7-.1c2.1 0 3.8-1.7 3.8-3.8s-1.7-3.8-3.8-3.8l-1.7.1c-2.1 0-3.8 1.7-3.8 3.8L12 12.1z"/>
      </svg>
    );
  }

  if (brandName.includes('send')) return <Send size={size} color={color} />;
  if (brandName.includes('ghost')) return <Ghost size={size} color={color} />;
  if (brandName.includes('pin')) return <Pin size={size} color={color} />;
  if (brandName.includes('dollar')) return <DollarSign size={size} color={color} />;
  if (brandName.includes('file')) return <FileText size={size} color={color} />;
  if (brandName.includes('image')) return <ImageIcon size={size} color={color} />;
  if (brandName.includes('gamepad')) return <Gamepad2 size={size} color={color} />;
  
  return <Globe size={size} color={color} />;
};

export default SocialIcon;
