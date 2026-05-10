import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, User, Lock, Mail, Globe, Monitor, Smartphone, 
  Activity, Save, LogOut, ChevronRight, Plus, Trash2, Edit, 
  ExternalLink, CheckCircle, Clock, Eye, TrendingUp, BarChart3,
  MessageSquare, Image as ImageIcon, Upload, Key, Brain, Zap,
  X, Unlock, FileText, Crop, Trophy, Play, Download, Search
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { signOut } from 'firebase/auth';
import { 
  collection, doc, getDoc, updateDoc, getDocs, 
  query, where, deleteDoc, setDoc, orderBy, limit 
} from 'firebase/firestore';
import { useConfig } from '../../context/ConfigContext';
import './AdminDashboard.css';

// --- SUB-COMPONENTS ---

const MaintenanceTab = ({ localConfig, updateNested }) => {
  return (
    <motion.div key="maintenance" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="config-section">
      <div className="manager-header" style={{ marginBottom: '2.5rem' }}>
         <div style={{ display: 'flex', gap: '0.8rem', color: 'var(--accent-main)', alignItems: 'center' }}>
            <Lock size={24} /> <h3>QUẢN LÝ TRẠNG THÁI TRANG</h3>
         </div>
         <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Bật "Bảo trì" để tạm thời khóa quyền truy cập của khách vào các trang cụ thể.</p>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', background: 'rgba(10,10,10,0.4)', borderRadius: '24px', marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', color: '#fff' }}>
          {['blog', 'chronicles', 'about', 'skills'].map((key) => (
            <div key={key} style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '700', textTransform: 'uppercase', fontSize: '0.85rem', color: 'var(--accent-main)' }}>
                  {key === 'blog' ? 'BLOG' : key === 'chronicles' ? 'CHRONICLES' : key.toUpperCase()}
                </span>
                {localConfig.maintenance?.[key] ? <Lock size={18} color="#ff4d4d" /> : <Unlock size={18} color="#00ffcc" />}
              </div>
              <button 
                className="add-btn"
                style={{ 
                  background: localConfig.maintenance?.[key] ? 'rgba(255, 77, 77, 0.1)' : 'rgba(0, 255, 204, 0.1)',
                  color: localConfig.maintenance?.[key] ? '#ff4d4d' : '#00ffcc',
                  border: '1px solid currentColor'
                }}
                onClick={() => updateNested('maintenance', key, !localConfig.maintenance?.[key])}
              >
                {localConfig.maintenance?.[key] ? 'ĐANG KHÓA' : 'CÔNG KHAI'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="manager-header" style={{ marginBottom: '1.5rem' }}>
         <div style={{ display: 'flex', gap: '0.8rem', color: 'var(--accent-main)', alignItems: 'center' }}>
            <Smartphone size={24} /> <h3>MOBILE ACCESS CONTROL</h3>
         </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', borderRadius: '24px' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <input 
            type="text" 
            id="mobile-path-input" 
            placeholder="Nhập đường dẫn cần chặn (vd: /blog)..." 
            style={{ flex: 1, padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} 
          />
          <button 
            className="add-btn" 
            onClick={() => {
              const input = document.getElementById('mobile-path-input');
              if (input && input.value.trim()) {
                const current = localConfig.maintenance?.mobileBlockedPaths || [];
                if (!current.includes(input.value.trim())) {
                  updateNested('maintenance', 'mobileBlockedPaths', [...current, input.value.trim()]);
                }
                input.value = '';
              }
            }}
          >
            THÊM
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {(localConfig.maintenance?.mobileBlockedPaths || []).map((path) => (
            <div key={path} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d', padding: '0.6rem 1rem', borderRadius: '8px' }}>
              <span>{path}</span>
              <X size={14} style={{ cursor: 'pointer' }} onClick={() => updateNested('maintenance', 'mobileBlockedPaths', (localConfig.maintenance.mobileBlockedPaths || []).filter(p => p !== path))} />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const QuizTab = ({ quizzes, onDelete, onEdit }) => {
  const navigate = useNavigate();
  return (
    <motion.div key="quizzes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="config-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h3>DANH SÁCH BÀI THI (QUIZZES)</h3>
        <button className="add-btn" onClick={() => navigate('/quiz-maker')}>
          <Plus size={18} /> TẠO BÀI THI MỚI
        </button>
      </div>
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <table className="admin-table">
          <thead>
            <tr><th>Tên bài thi</th><th>Mã slug</th><th>Ngày tạo</th><th style={{ textAlign: 'right' }}>Thao tác</th></tr>
          </thead>
          <tbody>
            {quizzes.map(q => (
              <tr key={q.id}>
                <td>
                  <div style={{ fontWeight: '600' }}>{q.title}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{q.questions?.length || 0} câu hỏi</div>
                </td>
                <td><code style={{ background: 'rgba(0,240,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: 'var(--accent-main)' }}>{q.slug}</code></td>
                <td style={{ fontSize: '0.85rem', opacity: 0.6 }}>{q.createdAt?.toDate().toLocaleDateString('vi-VN')}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="icon-btn" title="Chỉnh sửa" onClick={() => navigate(`/quiz-maker`)}><Edit size={14} /></button>
                  <button className="icon-btn danger" title="Xóa" onClick={() => onDelete(q.id)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

const BlogTab = ({ posts, onDelete }) => {
  const navigate = useNavigate();
  return (
    <motion.div key="blog" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="config-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h3>BÀI VIẾT BLOG & CHRONICLES</h3>
        <button className="add-btn" onClick={() => navigate('/admin/cms/new')}>
          <Plus size={18} /> VIẾT BÀI MỚI
        </button>
      </div>
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <table className="admin-table">
          <thead>
            <tr><th>Tiêu đề</th><th>Danh mục</th><th>Trạng thái</th><th style={{ textAlign: 'right' }}>Thao tác</th></tr>
          </thead>
          <tbody>
            {posts.map(p => (
              <tr key={p.id}>
                <td>
                  <div style={{ fontWeight: '600' }}>{p.title}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{p.slug}</div>
                </td>
                <td><span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>{p.category}</span></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: p.published ? '#10b981' : '#f59e0b' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                    {p.published ? 'Công khai' : 'Bản nháp'}
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="icon-btn" onClick={() => navigate(`/admin/cms/${p.id}`)}><Edit size={14} /></button>
                  <button className="icon-btn danger" onClick={() => onDelete(p.id)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

const AdminDashboard = () => {
  const { config, updateConfig } = useConfig();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('analytics');
  const [localConfig, setLocalConfig] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [quizzesList, setQuizzesList] = useState([]);
  const [postsList, setPostsList] = useState([]);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  
  // Modals
  const [userModal, setUserModal] = useState({ isOpen: false, mode: 'add', data: {} });

  useEffect(() => {
    if (config) setLocalConfig(JSON.parse(JSON.stringify(config)));
  }, [config]);

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const q = query(collection(db, 'system_analytics'), orderBy('timestamp', 'desc'), limit(100));
      const snap = await getDocs(q);
      setAnalyticsData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoadingAnalytics(false);
  };

  const fetchData = async () => {
    const uSnap = await getDocs(collection(db, 'users'));
    setUsersList(uSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    const qSnap = await getDocs(collection(db, 'quizzes'));
    setQuizzesList(qSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds));

    const pSnap = await getDocs(collection(db, 'blog_posts'));
    setPostsList(pSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.timestamp?.seconds - a.timestamp?.seconds));
  };

  useEffect(() => {
    fetchAnalytics();
    fetchData();
  }, []);

  const updateNested = (category, field, value) => {
    setLocalConfig(prev => ({
      ...prev,
      [category]: { ...prev[category], [field]: value }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateConfig(localConfig);
      alert('Cập nhật cấu hình thành công!');
    } catch (e) {
      alert('Lỗi: ' + e.message);
    }
    setIsSaving(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const deleteUserRecord = async (uid) => {
    if (window.confirm('Xóa vĩnh viễn tài khoản này?')) {
      await deleteDoc(doc(db, 'users', uid));
      fetchData();
    }
  };

  const deleteQuiz = async (id) => {
    if (window.confirm('Xóa bài thi này?')) {
      await deleteDoc(doc(db, 'quizzes', id));
      fetchData();
    }
  };

  const deletePost = async (id) => {
    if (window.confirm('Xóa bài viết này?')) {
      await deleteDoc(doc(db, 'blog_posts', id));
      fetchData();
    }
  };

  const saveUserRecord = async (e) => {
    e.preventDefault();
    const uid = userModal.data.id || Date.now().toString();
    await setDoc(doc(db, 'users', uid), userModal.data, { merge: true });
    setUserModal({ isOpen: false, mode: 'add', data: {} });
    fetchData();
  };

  if (!localConfig) return <div className="admin-loading">Initializing Engine...</div>;

  const tabs = [
    { id: 'analytics', label: 'THỐNG KÊ TRAFFIC', icon: <Activity size={18} /> },
    { id: 'quizzes', label: 'QUẢN LÝ BÀI THI', icon: <Trophy size={18} /> },
    { id: 'blog', label: 'QUẢN LÝ BLOG', icon: <FileText size={18} /> },
    { id: 'maintenance', label: 'BẢO TRÌ & MOBILE', icon: <Lock size={18} /> },
    { id: 'users', label: 'QUẢN LÝ USER', icon: <User size={18} /> },
    { id: 'integrations', label: 'DỊCH VỤ & API', icon: <Key size={18} /> }
  ];

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="sidebar-header" style={{ padding: '0 2rem', marginBottom: '2rem' }}>
           <img src="/logobct.png" alt="logo" style={{ width: '40px', marginBottom: '1rem' }} />
           <div style={{ color: 'var(--accent-main)', fontWeight: 'bold', fontSize: '0.8rem' }}>BCT SYSTEM V1.0</div>
        </div>

        <nav className="admin-nav">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-footer-btn">
          <button className="save-btn" onClick={handleSave} disabled={isSaving}>
            <Save size={18} /> {isSaving ? 'ĐANG LƯU...' : 'LƯU CẤU HÌNH'}
          </button>
          <button className="logout-btn" style={{ width: '100%', marginTop: '1rem', padding: '0.8rem', background: 'transparent', border: '1px solid #ff4d4d', color: '#ff4d4d', borderRadius: '8px', cursor: 'pointer' }} onClick={handleLogout}>
            <LogOut size={18} /> ĐĂNG XUẤT
          </button>
        </div>
      </aside>

      <main className="admin-content">
        <div className="admin-frame glass-panel">
          <AnimatePresence mode="wait">
            {activeTab === 'analytics' && (
              <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="config-section">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                   <div className="glass-panel" style={{ padding: '1.5rem' }}>
                      <div style={{ opacity: 0.6, fontSize: '0.8rem' }}>TỔNG TRAFFIC</div>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-main)' }}>{analyticsData.length}</div>
                   </div>
                </div>
                
                <div className="glass-panel" style={{ marginTop: '2rem', padding: '1.5rem' }}>
                  <h3>LỊCH SỬ TRUY CẬP GẦN ĐÂY</h3>
                  <div style={{ maxHeight: '400px', overflowY: 'auto', marginTop: '1rem' }}>
                    <table className="admin-table">
                      <thead>
                        <tr><th>Sự kiện</th><th>Đường dẫn</th><th>Thời gian</th></tr>
                      </thead>
                      <tbody>
                        {analyticsData.map(ev => (
                          <tr key={ev.id}>
                            <td>{ev.event}</td>
                            <td>{ev.path}</td>
                            <td style={{ fontSize: '0.8rem', opacity: 0.6 }}>{ev.timestamp?.toDate().toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'quizzes' && (
              <QuizTab quizzes={quizzesList} onDelete={deleteQuiz} />
            )}

            {activeTab === 'blog' && (
              <BlogTab posts={postsList} onDelete={deletePost} />
            )}

            {activeTab === 'maintenance' && (
              <MaintenanceTab localConfig={localConfig} updateNested={updateNested} />
            )}

            {activeTab === 'users' && (
              <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="config-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                  <h3>DANH SÁCH TÀI KHOẢN</h3>
                  <button className="add-btn" onClick={() => setUserModal({ isOpen: true, mode: 'add', data: {} })}>
                    <Plus size={18} /> THÊM USER
                  </button>
                </div>
                <table className="admin-table">
                  <thead>
                    <tr><th>User</th><th>Email</th><th>Role</th><th style={{ textAlign: 'right' }}>Thao tác</th></tr>
                  </thead>
                  <tbody>
                    {usersList.map(u => (
                      <tr key={u.id}>
                        <td>{u.displayName}</td>
                        <td>{u.email}</td>
                        <td><span className={`role-badge ${u.role}`}>{u.role}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="icon-btn" onClick={() => setUserModal({ isOpen: true, mode: 'edit', data: u })}><Edit size={14} /></button>
                          <button className="icon-btn danger" onClick={() => deleteUserRecord(u.id)}><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            )}

            {activeTab === 'integrations' && (
              <motion.div key="integrations" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="config-section">
                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <h3>CẤU HÌNH API</h3>
                  <div className="field" style={{ marginTop: '1.5rem' }}>
                    <label>GEMINI API KEY</label>
                    <input type="password" value={localConfig.integrations?.geminiKey || ''} onChange={e => updateNested('integrations', 'geminiKey', e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', color: '#fff', borderRadius: '8px' }} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* MODAL USER */}
      {userModal.isOpen && (
        <div className="admin-modal-overlay">
           <div className="admin-modal-card">
              <button className="modal-close" onClick={() => setUserModal({ isOpen: false, mode: 'add', data: {} })}><X size={20} /></button>
              <h2>{userModal.mode === 'add' ? 'THÊM' : 'SỬA'} TÀI KHOẢN</h2>
              <form onSubmit={saveUserRecord} className="modal-form">
                 <div className="field">
                    <label>TÊN HIỂN THỊ</label>
                    <input type="text" value={userModal.data.displayName || ''} onChange={e => setUserModal({...userModal, data: {...userModal.data, displayName: e.target.value}})} required />
                 </div>
                 <div className="field">
                    <label>EMAIL</label>
                    <input type="email" value={userModal.data.email || ''} onChange={e => setUserModal({...userModal, data: {...userModal.data, email: e.target.value}})} required />
                 </div>
                 <div className="field">
                    <label>QUYỀN</label>
                    <select value={userModal.data.role || 'user'} onChange={e => setUserModal({...userModal, data: {...userModal.data, role: e.target.value}})}>
                       <option value="user">USER</option>
                       <option value="admin">ADMIN</option>
                    </select>
                 </div>
                 <button type="submit" className="save-btn" style={{ marginTop: '1.5rem' }}>LƯU DỮ LIỆU</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
