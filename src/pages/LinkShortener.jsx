import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Copy, Check, Scissors, RotateCcw, ExternalLink, Globe, Zap, ShieldCheck } from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import './LinkShortener.css';

const LinkShortener = () => {
  const { currentUser } = useAuth();
  const [longUrl, setLongUrl] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const generateRandomSlug = (length = 6) => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const validateUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleShorten = async (e) => {
    e.preventDefault();
    setError('');
    setShortUrl('');
    
    if (!longUrl) {
      setError('Vui lòng nhập đường dẫn gốc cần rút gọn.');
      return;
    }

    if (!validateUrl(longUrl)) {
      setError('Định dạng URL không hợp lệ (Ví dụ: https://google.com).');
      return;
    }

    setLoading(true);

    try {
      let slug = customSlug.trim() || generateRandomSlug();
      
      // Check if slug exists
      const docRef = doc(db, 'short_links', slug);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists() && customSlug) {
        setError('Mã định danh này đã tồn tại. Vui lòng chọn mã khác.');
        setLoading(false);
        return;
      }

      // If it exists but it was random, try one more time or just fail
      if (docSnap.exists()) {
        slug = generateRandomSlug(7);
      }

      const linkData = {
        longUrl,
        slug,
        createdBy: currentUser?.uid || 'anonymous',
        createdAt: new Date(),
        clicks: 0
      };

      await setDoc(doc(db, 'short_links', slug), linkData);

      const domain = window.location.origin;
      setShortUrl(`${domain}/${slug}`);
    } catch (err) {
      console.error(err);
      setError('Đã xảy ra lỗi khi tạo liên kết: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setLongUrl('');
    setCustomSlug('');
    setShortUrl('');
    setError('');
  };

  return (
    <div className="shortener-container">
      <div className="background-decor">
         <div className="glow-sphere sphere-1"></div>
         <div className="glow-sphere sphere-2"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="shortener-card glass-panel"
      >
        <div className="card-header">
          <div className="icon-wrapper shadow-glow">
            <Scissors size={28} className="text-glow" />
          </div>
          <h1 className="text-gradient">BCT_LINK_SHORTENER</h1>
          <p className="subtitle">HỆ THỐNG RÚT GỌN LIÊN KẾT THÔNG MINH - IRIS ECOSYSTEM</p>
        </div>

        <form onSubmit={handleShorten} className="shortener-form">
          <div className="input-group">
            <label><Link2 size={16} /> ĐƯỜNG DẪN GỐC (LONG URL)</label>
            <input 
              type="text" 
              placeholder="Dán link dài tại đây (https://...)" 
              value={longUrl}
              onChange={(e) => setLongUrl(e.target.value)}
              className="main-input"
            />
          </div>

          <div className="input-row">
            <div className="input-group flex-2">
              <label><Globe size={16} /> MÃ ĐỊNH DANH TÙY CHỈNH (SLUG)</label>
              <div className="slug-input-wrapper">
                <span className="domain-prefix">bct0902.top/</span>
                <input 
                  type="text" 
                  placeholder="ví dụ: facebook (tùy chọn)" 
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                  className="slug-input"
                />
              </div>
              <small className="hint">Để trống để hệ thống tự tạo mã ngẫu nhiên.</small>
            </div>
            
            <button type="submit" className="btn-primary shorten-btn" disabled={loading}>
              {loading ? <Zap className="spinning" size={20} /> : <Zap size={20} />}
              <span>RÚT GỌN NGAY</span>
            </button>
          </div>
        </form>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="error-message"
            >
              <ShieldCheck size={16} /> {error}
            </motion.div>
          )}

          {shortUrl && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="result-box shadow-glow"
            >
              <div className="result-header">
                <span>KẾT QUẢ RÚT GỌN</span>
                <button onClick={resetForm} className="reset-btn"><RotateCcw size={14} /> LÀM MỚI</button>
              </div>
              
              <div className="url-display">
                <span className="generated-url">{shortUrl}</span>
                <div className="action-buttons">
                  <button onClick={copyToClipboard} className={`action-btn copy-btn ${copied ? 'success' : ''}`}>
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                    <span>{copied ? 'ĐÃ SAO CHÉP' : 'SAO CHÉP'}</span>
                  </button>
                  <a href={shortUrl} target="_blank" rel="noreferrer" className="action-btn open-btn">
                    <ExternalLink size={18} />
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="card-footer">
          <div className="stat-item">
            <span className="stat-value">UNLIMITED</span>
            <span className="stat-label">LINKS</span>
          </div>
          <div className="divider-v"></div>
          <div className="stat-item">
            <span className="stat-value">SECURE</span>
            <span className="stat-label">ENCRYPTION</span>
          </div>
          <div className="divider-v"></div>
          <div className="stat-item">
            <span className="stat-value">REALTIME</span>
            <span className="stat-label">TRACKING</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LinkShortener;
