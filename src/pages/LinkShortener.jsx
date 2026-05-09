import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Link2, Copy, Check, RotateCcw, ExternalLink, Globe, Zap,
  ShieldCheck, Trash2, Edit3, Clock, Lock, Unlock, User, Info, X, Save,
  QrCode, Download
} from 'lucide-react';
import { db } from '../firebase';
import { 
  doc, setDoc, getDoc, collection, query, where, getDocs, 
  deleteDoc, updateDoc, orderBy, onSnapshot 
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { QRCodeCanvas } from 'qrcode.react';
import './LinkShortener.css';

const LinkShortener = () => {
  const { currentUser, isAdmin } = useAuth();
  const [longUrl, setLongUrl] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  
  // UI States
  const [showPopup, setShowPopup] = useState(false);
  const [userLinks, setUserLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [editingLink, setEditingLink] = useState(null);
  const [editForm, setEditForm] = useState({ longUrl: '', slug: '' });
  const [qrModalLink, setQrModalLink] = useState(null);

  // Initial Popup Logic
  useEffect(() => {
    const hasSeenPopup = sessionStorage.getItem('bct_shortener_popup');
    if (!hasSeenPopup) {
      setShowPopup(true);
      sessionStorage.setItem('bct_shortener_popup', 'true');
    }
  }, []);

  // Fetch Links Logic
  useEffect(() => {
    let unsubscribe;
    
    const fetchLinks = () => {
      setLoadingLinks(true);
      let q;
      if (isAdmin) {
        // Admins see everything
        q = query(collection(db, 'short_links'), orderBy('createdAt', 'desc'));
      } else if (currentUser) {
        // Users see their own links
        q = query(collection(db, 'short_links'), where('createdBy', '==', currentUser.uid), orderBy('createdAt', 'desc'));
      } else {
        // Guests see nothing (or maybe local storage links? user didn't ask for it, just said login to manage)
        setLoadingLinks(false);
        setUserLinks([]);
        return;
      }

      unsubscribe = onSnapshot(q, (snapshot) => {
        const links = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUserLinks(links);
        setLoadingLinks(false);
      }, (err) => {
        console.error("Fetch links error:", err);
        setLoadingLinks(false);
      });
    };

    fetchLinks();
    return () => unsubscribe && unsubscribe();
  }, [currentUser, isAdmin]);

  const generateRandomSlug = async () => {
    try {
      const q = query(collection(db, 'short_links'));
      const snapshot = await getDocs(q);
      const count = snapshot.size + 1;
      
      // Pattern: vn + number padded to 3 digits, or alphanumeric if larger
      let xxx = count.toString().padStart(3, '0');
      if (count > 999) {
        xxx = count.toString(36).toUpperCase();
      }
      
      let slug = `vn${xxx}`;
      
      // Final collision check
      const checkDoc = await getDoc(doc(db, 'short_links', slug));
      if (checkDoc.exists()) {
        return `vn${Math.random().toString(36).substring(2, 6)}`;
      }
      return slug;
    } catch (err) {
      return `vn${Math.random().toString(36).substring(2, 6)}`;
    }
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
      let slug = customSlug.trim() || await generateRandomSlug();
      
      const docRef = doc(db, 'short_links', slug);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists() && customSlug) {
        setError('Mã định danh này đã tồn tại. Vui lòng chọn mã khác.');
        setLoading(false);
        return;
      }

      if (docSnap.exists()) {
        slug = await generateRandomSlug();
      }

      const expirationDate = currentUser ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const linkData = {
        longUrl,
        slug,
        createdBy: currentUser?.uid || 'guest',
        creatorName: currentUser?.displayName || 'Khách',
        createdAt: new Date(),
        expiresAt: expirationDate,
        clicks: 0
      };

      await setDoc(doc(db, 'short_links', slug), linkData);

      const domain = window.location.origin.replace('www.', '');
      setShortUrl(`${domain}/${slug}`);
    } catch (err) {
      console.error(err);
      setError('Đã xảy ra lỗi khi tạo liên kết: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (slug) => {
    if (!window.confirm('Ngài có chắc chắn muốn xóa liên kết này vĩnh viễn?')) return;
    try {
      await deleteDoc(doc(db, 'short_links', slug));
    } catch (err) {
      alert("Lỗi khi xóa: " + err.message);
    }
  };

  const startEdit = (link) => {
    setEditingLink(link);
    setEditForm({ longUrl: link.longUrl, slug: link.slug });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!validateUrl(editForm.longUrl)) {
       alert("URL không hợp lệ!");
       return;
    }

    try {
      const docRef = doc(db, 'short_links', editingLink.slug);
      
      // If slug changed, we need to create new doc and delete old one
      if (editForm.slug !== editingLink.slug) {
         const newRef = doc(db, 'short_links', editForm.slug);
         const checkSnap = await getDoc(newRef);
         if (checkSnap.exists()) {
            alert("Mã định danh mới đã tồn tại!");
            return;
         }
         
         await setDoc(newRef, {
            ...editingLink,
            longUrl: editForm.longUrl,
            slug: editForm.slug,
            updatedAt: new Date()
         });
         await deleteDoc(docRef);
      } else {
         await updateDoc(docRef, {
            longUrl: editForm.longUrl,
            updatedAt: new Date()
         });
      }
      
      setEditingLink(null);
      alert("Cập nhật thành công!");
    } catch (err) {
      alert("Lỗi cập nhật: " + err.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQRCode = (canvasId, slug) => {
    const originalCanvas = document.getElementById(canvasId);
    if (!originalCanvas) return;
    
    // To ensure high quality, we'll try to get the highest possible quality
    const pngUrl = originalCanvas.toDataURL("image/png", 1.0);
    let downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `bct_qr_${slug || 'short'}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div className="shortener-page-wrapper">
      <div className="background-decor">
         <div className="glow-sphere sphere-1"></div>
         <div className="glow-sphere sphere-2"></div>
      </div>

      <div className="shortener-layout container">
        {/* LEFT COLUMN: SHORTEN FORM */}
        <div className="shortener-main-col">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="shortener-card glass-panel"
          >
            <div className="card-header">
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

              <div className="input-group">
                <label><Globe size={16} /> MÃ ĐỊNH DANH TÙY CHỈNH (SLUG)</label>
                <div className="input-row">
                  <div className="slug-input-wrapper flex-2">
                    <span className="domain-prefix">bct0902.top/</span>
                    <input 
                      type="text" 
                      placeholder="ví dụ: vietnam (tùy chọn)" 
                      value={customSlug}
                      onChange={(e) => setCustomSlug(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                      className="slug-input"
                    />
                  </div>
                  
                  <button type="submit" className="btn-primary shorten-btn" disabled={loading}>
                    {loading ? <Zap className="spinning" size={20} /> : <Zap size={20} />}
                    <span>RÚT GỌN NGAY</span>
                  </button>
                </div>
                <small className="hint">Để trống để hệ thống tự tạo mã ngẫu nhiên.</small>
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
                    <button onClick={() => setShortUrl('')} className="reset-btn"><RotateCcw size={14} /> LÀM MỚI</button>
                  </div>
                  
                  <div className="result-main">
                    <div className="qr-container">
                      <QRCodeCanvas
                        id="qr-gen"
                        value={shortUrl}
                        size={1024} // Render very large for download quality
                        style={{ width: '120px', height: '120px' }} // UI display size
                        bgColor={"transparent"}
                        fgColor={"#00f0ff"}
                        level={"H"}
                        includeMargin={true}
                        imageSettings={{
                          src: "/logobct.png",
                          height: 128,
                          width: 128,
                          excavate: true,
                        }}
                      />
                      <button onClick={() => downloadQRCode('qr-gen', customSlug || 'short')} className="qr-download-btn">
                        TẢI MÃ QR
                      </button>
                    </div>

                    <div className="url-display-wrapper">
                      <div className="url-display">
                        <span className="generated-url">{shortUrl}</span>
                        <div className="action-buttons">
                          <button onClick={() => copyToClipboard(shortUrl)} className={`action-btn copy-btn ${copied ? 'success' : ''}`}>
                            {copied ? <Check size={18} /> : <Copy size={18} />}
                            <span>{copied ? 'ĐÃ SAO CHÉP' : 'SAO CHÉP'}</span>
                          </button>
                          <a href={shortUrl} target="_blank" rel="noreferrer" className="action-btn open-btn">
                            <ExternalLink size={18} />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* RIGHT COLUMN: MANAGEMENT PANEL */}
        <div className="shortener-side-col">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="management-panel glass-panel"
          >
            <div className="panel-header">
              <h3><ShieldCheck size={20} /> QUẢN LÝ LIÊN KẾT</h3>
              {isAdmin && <span className="admin-badge">ADMIN_ACCESS</span>}
            </div>

            <div className="links-list-container custom-scrollbar">
              {!currentUser && !isAdmin ? (
                <div className="login-prompt-empty">
                  <User size={40} />
                  <p>Hãy đăng nhập để quản lý và lưu trữ liên kết của ngài vĩnh viễn.</p>
                  <button onClick={() => window.location.href='/login'} className="btn-secondary">ĐĂNG NHẬP NGAY</button>
                </div>
              ) : loadingLinks ? (
                <div className="loading-links">Đang tải dữ liệu...</div>
              ) : userLinks.length === 0 ? (
                <div className="no-links">Chưa có liên kết nào được tạo.</div>
              ) : (
                <div className="links-list">
                  {userLinks.map(link => (
                    <motion.div layout key={link.id} className="link-item">
                      <div className="link-info">
                        <div className="link-slug-row">
                           <span className="link-slug">/{link.slug}</span>
                           <span className="link-clicks">{link.clicks} clicks</span>
                        </div>
                        <div className="link-url-row" title={link.longUrl}>
                           {link.longUrl}
                        </div>
                        <div className="link-meta">
                           <span className="expiry">
                              {link.expiresAt ? (
                                <>Hết hạn: {new Date(link.expiresAt.seconds * 1000).toLocaleDateString('vi-VN')}</>
                              ) : (
                                <><Unlock size={12} /> Vĩnh viễn</>
                              )}
                           </span>
                           {isAdmin && <span className="owner">@{link.creatorName}</span>}
                        </div>
                      </div>
                      
                      <div className="link-actions">
                         <button onClick={() => startEdit(link)} className="action-icon edit" title="Sửa"><Edit3 size={16} /></button>
                         <button onClick={() => handleDelete(link.slug)} className="action-icon delete" title="Xóa"><Trash2 size={16} /></button>
                         <button onClick={() => setQrModalLink(link)} className="action-icon qr" title="Xem QR"><QrCode size={16} /></button>
                         <button onClick={() => copyToClipboard(`${window.location.origin.replace('www.', '')}/${link.slug}`)} className="action-icon copy" title="Sao chép"><Copy size={16} /></button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* POPUP MODAL */}
      <AnimatePresence>
        {showPopup && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="info-popup glass-panel shadow-glow"
            >
              <button className="close-popup" onClick={() => setShowPopup(false)}><X size={20} /></button>
              <div className="popup-icon">
                 <Info size={40} className="text-glow" />
              </div>
              <h2>THÔNG BÁO HỆ THỐNG</h2>
              <div className="popup-content">
                <p>Chào mừng ngài đến với trình rút gọn liên kết <strong>BCT IRIS</strong>.</p>
                <ul>
                  <li><strong>Tài khoản khách:</strong> Liên kết sẽ tự động hết hạn sau <strong>30 ngày</strong>.</li>
                  <li><strong>Tài khoản thành viên:</strong> Lưu trữ <strong>vĩnh viễn</strong> và có quyền quản lý, chỉnh sửa liên kết.</li>
                </ul>
                <p className="highlight">Hãy đăng nhập để có quyền kiểm soát tối đa!</p>
              </div>
              <div className="popup-actions">
                 {!currentUser && <button onClick={() => window.location.href='/login'} className="btn-primary">ĐĂNG NHẬP NGAY</button>}
                 <button onClick={() => setShowPopup(false)} className="btn-secondary">TÔI ĐÃ HIỂU</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* EDIT MODAL */}
        {editingLink && (
           <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="modal-overlay"
          >
            <motion.div 
              className="edit-popup glass-panel shadow-glow"
            >
              <h3><Edit3 size={20} /> CHỈNH SỬA LIÊN KẾT</h3>
              <form onSubmit={handleUpdate} className="edit-form">
                 <div className="edit-input-group">
                    <label>ĐƯỜNG DẪN GỐC</label>
                    <input 
                      type="text" 
                      value={editForm.longUrl} 
                      onChange={(e) => setEditForm({...editForm, longUrl: e.target.value})}
                    />
                 </div>
                 <div className="edit-input-group">
                    <label>MÃ ĐỊNH DANH (SLUG)</label>
                    <input 
                      type="text" 
                      value={editForm.slug} 
                      onChange={(e) => setEditForm({...editForm, slug: e.target.value})}
                    />
                    <small>* Thay đổi slug sẽ làm link cũ không hoạt động.</small>
                 </div>
                 <div className="edit-actions">
                    <button type="button" onClick={() => setEditingLink(null)} className="btn-secondary">HỦY</button>
                    <button type="submit" className="btn-primary"><Save size={16} /> LƯU THAY ĐỔI</button>
                 </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* QR MODAL */}
        {qrModalLink && (
           <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="modal-overlay"
          >
            <motion.div 
              className="edit-popup glass-panel shadow-glow"
              style={{ maxWidth: '400px', textAlign: 'center' }}
            >
              <button className="close-popup" onClick={() => setQrModalLink(null)}><X size={20} /></button>
              <h3 style={{ fontFamily: 'var(--font-tech)', marginBottom: '1.5rem', color: 'var(--accent-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <QrCode size={24} /> MÃ QR CHI TIẾT
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ background: '#fff', padding: '1rem', borderRadius: '12px' }}>
                  <QRCodeCanvas
                    id="qr-modal-gen"
                    value={`${window.location.origin.replace('www.', '')}/${qrModalLink.slug}`}
                    size={2048} // Ultra high-res
                    style={{ width: '250px', height: '250px' }} // UI scale
                    bgColor={"#FFFFFF"}
                    fgColor={"#000000"}
                    level={"H"}
                    includeMargin={true}
                    imageSettings={{
                      src: "/logobct.png",
                      height: 256,
                      width: 256,
                      excavate: true,
                    }}
                  />
                </div>
                
                <div className="qr-link-info">
                   <p style={{ color: 'var(--accent-main)', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '0.5rem' }}>/{qrModalLink.slug}</p>
                   <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '100%', wordBreak: 'break-all', opacity: 0.8 }}>{qrModalLink.longUrl}</p>
                </div>

                <button 
                  onClick={() => downloadQRCode('qr-modal-gen', qrModalLink.slug)} 
                  className="btn-primary"
                  style={{ width: '100%', height: '50px', fontSize: '0.9rem' }}
                >
                  <Download size={18} style={{ marginRight: '0.5rem' }} /> TẢI QR CHẤT LƯỢNG CAO
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LinkShortener;
