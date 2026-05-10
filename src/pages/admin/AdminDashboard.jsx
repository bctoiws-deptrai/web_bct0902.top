import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  Globe, 
  Palette, 
  Key, 
  FileText, 
  Layout, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle,
  ExternalLink,
  Bot,
  Users,
  Home,
  Activity,
  Edit,
  X,
  Upload,
  Image as ImageIcon,
  Zap,
  MessageSquare,
  ChevronDown,
  Brain,
  Sparkles,
  Crop,
  Mail,
  BarChart3,
  Lock,
  Unlock,
  TrendingUp,
  Smartphone,
  Monitor,
  Eye,
  Clock
} from 'lucide-react';
import { db } from '../../firebase';
import { doc, setDoc, updateDoc, collection, getDocs, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { useConfig } from '../../context/ConfigContext';
import SocialIcon from '../../components/SocialIcon';
import { GoogleGenerativeAI } from '@google/generative-ai';
import './AdminDashboard.css';

const SOCIAL_PLATFORMS = [
  { name: 'Facebook', color: '#1877F2', icon: 'Facebook' },
  { name: 'YouTube', color: '#FF0000', icon: 'YouTube' },
  { name: 'GitHub', color: '#181717', icon: 'GitHub' },
  { name: 'TikTok', color: '#000000', icon: 'TikTok' },
  { name: 'Telegram', color: '#26A5E4', icon: 'Telegram' },
  { name: 'X (Twitter)', color: '#000000', icon: 'X' },
  { name: 'Instagram', color: '#E4405F', icon: 'Instagram' },
  { name: 'Discord', color: '#5865F2', icon: 'Discord' },
  { name: 'Zalo', color: '#0068FF', icon: 'Zalo' },
  { name: 'Reddit', color: '#FF4500', icon: 'Reddit' },
  { name: 'Threads', color: '#000000', icon: 'Threads' },
  { name: 'Website', color: '#4B5563', icon: 'Globe' }
];

const AdminDashboard = () => {
  const { config, loading } = useConfig();
  const [activeTab, setActiveTab] = useState('general');
  const [localConfig, setLocalConfig] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [adjustmentModal, setAdjustmentModal] = useState({ isOpen: false, src: '', callback: null, aspect: 2 });
  const [activeIconPickerIdx, setActiveIconPickerIdx] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  
  // Users state
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userModal, setUserModal] = useState({ isOpen: false, mode: 'add', data: {} });

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // API Test states
  const [apiTestStatus, setApiTestStatus] = useState({ gemini: '', groq: '', tavily: '' });
  
  // Newsletter Logic
  const [newsletterContent, setNewsletterContent] = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [isSyncingNews, setIsSyncingNews] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  // Blog State
  const [blogPosts, setBlogPosts] = useState([]);
  const [loadingBlog, setLoadingBlog] = useState(false);
  const [seedingProgress, setSeedingProgress] = useState('');

  useEffect(() => {
    if (config) {
      setLocalConfig(JSON.parse(JSON.stringify(config)));
    }
  }, [config]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'analytics') {
      fetchAnalytics();
    } else if (activeTab === 'blog') {
      fetchBlogPosts();
    }
  }, [activeTab]);

  const fetchBlogPosts = async () => {
    setLoadingBlog(true);
    try {
      const q = query(collection(db, 'blog_posts'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      setBlogPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBlog(false);
    }
  };

  const deleteBlogPost = async (id) => {
    if (!window.confirm('Ngài có chắc chắn muốn xoá bài viết này không?')) return;
    try {
      await deleteDoc(doc(db, 'blog_posts', id));
      setBlogPosts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert("Lỗi xoá bài: " + err.message);
    }
  };

  const seedBlogPosts = async () => {
    const integrations = localConfig?.integrations || {};
    const geminiEnabled = integrations.geminiEnabled !== false;
    const geminiKey = (geminiEnabled && integrations.geminiKey) || null;

    if (!geminiKey) {
      alert("Chưa bật hoặc chưa cấu hình Gemini Node (Bắt buộc cho Blog Seeder)!");
      return;
    }

    if (!window.confirm('Hệ thống sẽ thực hiện tạo 5 BÀI VIẾT mồi chuẩn SEO cùng lúc qua IRIS Gemini Core. Quá trình này mất khoảng 20-30 giây. Ngài đồng ý chứ?')) return;

    setSeedingProgress('Đang khởi động IRIS Content Factory...');
    setIsSyncingNews(true);

    try {
      const prompt = `Bạn là chuyên gia biên tập nội dung. Hãy tạo 5 bài viết blog CHẤT LƯỢNG CAO bằng Tiếng Việt về 5 chủ đề công nghệ khác nhau (AI, Web, Cybersecurity, Hardware, Future Tech).
      Mỗi bài viết cần: Title, Excerpt (mô tả hấp dẫn), Content (Markdown dài, tối ưu SEO với H2, H3), Category.
      Trả về JSON mảng 5 đối tượng:
      [ { "title": "...", "excerpt": "...", "content": "...", "category": "...", "slug": "tieu-de-khong-dau" } ]
      Lưu ý: Chỉ trả về JSON nguyên bản.`;

      setSeedingProgress(`--- ĐANG DÙNG IRIS GEMINI CORE ---`);
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const postsArray = JSON.parse(jsonMatch ? jsonMatch[0] : text);

      setSeedingProgress(`Đã tạo nội dung 5 bài viết. Đang minh họa & lưu trữ...`);

      for (const [idx, post] of postsArray.entries()) {
        const seed = Math.floor(Math.random() * 1000000);
        const thumbnailUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(post.title)}?width=1280&height=720&nologo=true&seed=${seed}`;
        
        const docId = `seed-${Date.now()}-${idx}`;
        await setDoc(doc(db, 'blog_posts', docId), {
          ...post,
          date: new Date().toLocaleDateString('vi-VN'),
          author: 'IRIS Core Seeder',
          thumbnail: thumbnailUrl,
          published: true,
          timestamp: new Date()
        });
      }

      setSeedingProgress('✅ ĐÃ TẠO 5 BÀI VIẾT MỒI THÀNH CÔNG!');
      fetchBlogPosts();
    } catch (err) {
      setSeedingProgress('❌ LỖI SEEDING: ' + err.message);
    } finally {
      setIsSyncingNews(false);
      setTimeout(() => setSeedingProgress(''), 5000);
    }
  };

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      // Tăng giới hạn lên 1000 hoặc xóa limit để lấy "tất cả" từ trước đến nay
      const q = query(collection(db, "system_analytics"), orderBy('timestamp', 'desc'), limit(1000));
      const snapshot = await getDocs(q);
      setAnalyticsData(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const generateNewsletter = async () => {
    setNewsletterLoading(true);
    const groqEnabled = localConfig?.integrations?.groqEnabled !== false;
    const groqKey = localConfig?.integrations?.groqKey;
    if (!groqEnabled || !groqKey) {
      alert("Chức năng Newsletter đang bị khoá (Groq Node chưa được bật hoặc chưa có Key)!");
      setNewsletterLoading(false);
      return;
    }

    try {
      const response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { 
              role: "system", 
              content: "Bạn là chuyên gia viết Newsletter chuyên nghiệp cho IRIS AI Ecosystem. Hãy viết một bản tin ngắn gọn, lôi cuốn về các cập nhật mới nhất (Dark Mode, i18n, Chef AI) bằng tiếng Việt và Anh." 
            },
            { role: "user", content: "Hãy tạo một bản tin gửi khách hàng tuần này." }
          ]
        })
      });
      const data = await response.json();
      setNewsletterContent(data.choices[0].message.content);
    } catch (err) {
      alert("Lỗi generation: " + err.message);
    } finally {
      setNewsletterLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersData = [];
      querySnapshot.forEach((docSnap) => {
        usersData.push({ id: docSnap.id, ...docSnap.data() });
      });
      setUsersList(usersData);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const deleteUserRecord = async (userId) => {
    if (!window.confirm('Ngài có chắc chắn muốn xoá hồ sơ này khỏi Database?')) return;
    try {
      await deleteDoc(doc(db, "users", userId));
      setUsersList(prev => prev.filter(u => u.id !== userId));
      alert("Đã xoá hồ sơ thành công!");
    } catch (err) {
      alert("Lỗi khi xoá: " + err.message);
    }
  };
  
  const saveUserRecord = async (e) => {
    e.preventDefault();
    const { id, email, username, firstName, lastName, role, displayName, photoURL } = userModal.data;
    
    const finalPhotoURL = photoURL || `https://api.dicebear.com/7.x/shapes/svg?seed=${email || Math.random()}`;
    const finalDisplayName = displayName || (firstName ? `${lastName || ''} ${firstName}`.trim() : 'Người Dùng');
    
    const docData = {
       email: email || '',
       username: username || '',
       firstName: firstName || '',
       lastName: lastName || '',
       displayName: finalDisplayName,
       role: role || 'user',
       photoURL: finalPhotoURL,
       updatedAt: new Date()
    };
    
    try {
       const targetId = id || `manual_${Date.now()}`;
       await setDoc(doc(db, "users", targetId), docData, { merge: true });
       setUserModal({ isOpen: false, mode: 'add', data: {} });
       fetchUsers();
    } catch (err) {
       alert("Lỗi khi lưu: " + err.message);
    }
  };

 
  const triggerAINewsSync = async () => {
    const key = localConfig?.integrations?.geminiKey;
    if (!key) {
        setSyncStatus('⚠️ Lỗi: Thiếu API Key!');
        return;
    }

    setIsSyncingNews(true);
    setSyncStatus('🔍 Đang thu thập tin tức công nghệ mới nhất...');

    try {
        const prompt = `Bạn là biên tập viên tin tức công nghệ. Hãy tìm và tổng hợp 3 tin tức công nghệ mới nhất (tháng 4/2026) tại Việt Nam và Thế giới. 
        Mỗi tin tức cần: Tiêu đề lôi cuốn, Tóm tắt ngắn gọn, Nội dung chi tiết (khoảng 200 chữ), Danh mục (AI, Web, Hardware, hoặc Software), và từ khóa.
        Trả về kết quả dưới dạng JSON mảng các đối tượng: 
        [ { "title": "...", "excerpt": "...", "content": "...", "category": "...", "keywords": ["..."] } ] 
        Lưu ý: Chỉ trả về JSON, không kèm văn bản khác.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text) throw new Error('Không nhận được phản hồi từ AI');
        
        // Extract JSON from potential code blocks
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        const newsArray = JSON.parse(jsonMatch ? jsonMatch[0] : text);

        setSyncStatus('🚀 Đang đăng bài lên Bảng tin...');

        for (const news of newsArray) {
            const docId = `ai-news-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const blogRef = doc(db, 'blog_posts', docId);
            await setDoc(blogRef, {
                ...news,
                date: new Date().toLocaleDateString('vi-VN'),
                author: 'IRIS Intelligence AI',
                thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800', 
                published: true
            });
        }

        setSyncStatus('✅ THÀNH CÔNG! Đã cập nhật 3 bản tin mới.');
        setTimeout(() => setSyncStatus(''), 5000);
    } catch (err) {
        console.error(err);
        setSyncStatus(`❌ THẤT BẠI: ${err.message}`);
    } finally {
        setIsSyncingNews(false);
    }
  };



  const compressImage = (base64) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Max dimension for thumbnail quality
        const MAX_DIM = 1200;
        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        // Compressed to 0.7 quality
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  const handleReAdjust = (imageUrl, callback, aspect = 1.5) => {
    setAdjustmentModal({ isOpen: true, src: imageUrl, callback, aspect });
    setZoom(1);
    setDragPos({ x: 0, y: 0 });
  };

  const handleFileUpload = (e, callback, aspect = 1.5) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        alert('Tệp quá lớn! Giới hạn tối đa là 50MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result;
        // If it's an image, open adjuster
        if (typeof result === 'string' && result.startsWith('data:image')) {
           handleReAdjust(result, callback, aspect);
        } else {
           callback(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const getCroppedImage = async () => {
    const img = new Image();
    img.src = adjustmentModal.src;
    await new Promise(r => img.onload = r);

    const canvas = document.createElement('canvas');
    const targetWidth = 1200;
    const targetHeight = targetWidth / adjustmentModal.aspect;
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');

    // Math for cropping
    // We want to fill the canvas with the image at current zoom and offset
    const containerWidth = 600; // Modal display width
    const containerHeight = containerWidth / adjustmentModal.aspect;
    
    // Scale factor between display and real canvas
    const displayToReal = targetWidth / containerWidth;

    // Draw
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    
    const drawWidth = img.width * (targetHeight / img.height) * zoom;
    const drawHeight = targetHeight * zoom;
    
    const x = (targetWidth - drawWidth) / 2 + (dragPos.x * displayToReal);
    const y = (targetHeight - drawHeight) / 2 + (dragPos.y * displayToReal);

    ctx.drawImage(img, x, y, drawWidth, drawHeight);
    
    const result = canvas.toDataURL('image/jpeg', 0.85);
    adjustmentModal.callback(result);
    setAdjustmentModal({ isOpen: false, src: '', callback: null, aspect: 1.5 });
  };

  const updateNested = (category, field, value) => {
    setLocalConfig(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatus('SAVING...');
    try {
      // Deep sanitize to prevent Firebase: Property content contains an invalid nested entity
      const sanitize = (obj) => {
        return JSON.parse(JSON.stringify(obj, (key, value) => {
          if (value === undefined) return null;
          if (value && typeof value === 'object' && value.$$typeof) return null;
          return value;
        }));
      };

      const cleanConfig = sanitize(localConfig);
      
      // Split into 3 documents + Memories Collection to avoid 1MB limit
      const { content, ...rest } = cleanConfig;
      const { quotes, filmStripImages, ...contentRest } = content || {};

      // 1. Save General Config
      await setDoc(doc(db, 'system', 'config'), rest);
      
      // 2. Save Specific Content (Quotes etc)
      await setDoc(doc(db, 'system', 'content'), { ...contentRest, quotes });
      
      // 3. Save Memories to COLLECTION (The robust way)
      if (filmStripImages) {
        // First delete old memories to ensure clean sync (simple sync for small data)
        const oldMems = await getDocs(collection(db, 'memories'));
        for (const m of oldMems.docs) {
          await deleteDoc(doc(db, 'memories', m.id));
        }
        
        // Write new ones
        for (let i = 0; i < filmStripImages.length; i++) {
           if (filmStripImages[i]) {
              await setDoc(doc(db, 'memories', `mem_${i}`), {
                url: filmStripImages[i],
                order: i,
                updatedAt: new Date().toISOString()
              });
           }
        }

        // Also save a small list of pointers to legacy doc for safety
        await setDoc(doc(db, 'system', 'memories'), { 
          lastUpdated: new Date().toISOString(),
          count: filmStripImages.length
        });
      }

      setStatus('CONFIG_UPDATED_SUCCESSFULLY');
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      console.error(err);
      setStatus('ERROR_SAVING_CONFIG');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'CÀI ĐẶT CHUNG', icon: <Globe size={18} /> },
    { id: 'appearance', label: 'GIAO DIỆN', icon: <Palette size={18} /> },
    { id: 'filmstrip', label: 'KỸ THUẬT SỐ & KÝ ỨC', icon: <ImageIcon size={18} /> },
    { id: 'apps', label: 'ỨNG DỤNG TIN DÙNG', icon: <Zap size={18} /> },
    { id: 'content', label: 'NỘI DUNG KHÁC', icon: <FileText size={18} /> },
        { id: 'maintenance', label: 'QUẢN LÝ TRẠNG THÁI TRANG', icon: <Lock size={18} /> },
        { id: 'analytics', label: 'THỐNG KÊ TRAFFIC', icon: <BarChart3 size={18} /> },
    { id: 'blog', label: 'QUẢN LÝ BLOG', icon: <FileText size={18} /> },
    { id: 'users', label: 'QUẢN LÝ TÀI KHOẢN', icon: <Users size={18} /> },
    { id: 'integrations', label: 'DỊCH VỤ & API', icon: <Key size={18} /> }
  ];

  if (loading || !localConfig) {
    return <div className="admin-loading">INITIALIZING SYSTEM_ADMIN...</div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-sidebar shadow-glow">
        <div className="admin-brand">
          <Bot className="text-glow" />
          <span>BCT_ADMIN_SHELL</span>
        </div>
        
        <nav className="admin-nav">
          <Link to="/" className="nav-item-link home-link-top">
            <Home size={18} />
            <span>VỀ TRANG CHỦ</span>
          </Link>

          <div className="admin-divider" style={{ margin: '0.5rem 0 1rem 0' }}></div>

          <div className="admin-nav-scroll">
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
          </div>
        </nav>

        <div className="admin-footer-btn">
          <button className="save-btn" onClick={handleSave} disabled={isSaving}>
            <Save size={18} />
            <span>{isSaving ? 'ĐANG LƯU...' : 'LƯU CẤU HÌNH'}</span>
          </button>
          {status && <div className="status-toast">{status}</div>}
        </div>
      </div>

      <main className="admin-content">
        <header className="admin-header">
          <div className="admin-header-main">
            <h1>{tabs.find(t => t.id === activeTab)?.label}</h1>
            <p>Thiết lập hệ thống BCT0902 - Core Console.</p>
          </div>
          
          <div className="admin-header-actions">
            <button className="save-btn-top shadow-glow" onClick={handleSave} disabled={isSaving}>
              <Save size={18} />
              <span>{isSaving ? 'ĐANG LƯU...' : 'LƯU CẤU HÌNH'}</span>
            </button>
          </div>
        </header>

        <div className="admin-frame glass-panel">
          <AnimatePresence mode="wait">
            {activeTab === 'general' && (
              <motion.div key="general" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="config-section">
                <div className="input-group">
                  <label>LOGO WEBSITE (Bất kỳ dung lượng)</label>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                     <input 
                       type="text" 
                       value={localConfig.appearance.logoUrl} 
                       onChange={(e) => updateNested('appearance', 'logoUrl', e.target.value)}
                       placeholder="URL Logo hoặc tải lên..."
                       style={{ flex: 1 }}
                     />
                     <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <label className="btn-secondary" style={{ cursor: 'pointer', padding: '0.8rem 1.2rem', whiteSpace: 'nowrap', background: 'var(--accent-main)', color: '#fff', borderRadius: '4px', fontSize: '0.8rem' }}>
                           TẢI LÊN
                           <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, (res) => updateNested('appearance', 'logoUrl', res), 1)} />
                        </label>
                        {localConfig.appearance.logoUrl && (
                           <button className="btn-secondary" style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px', border: 'none', cursor: 'pointer' }} onClick={() => handleReAdjust(localConfig.appearance.logoUrl, (res) => updateNested('appearance', 'logoUrl', res), 1)}>
                              <Crop size={18} />
                           </button>
                        )}
                     </div>
                  </div>
                </div>

                <div className="admin-divider" style={{ margin: '2rem 0' }}></div>

                <div className="manager-header">
                  <label>QUẢN LÝ MẠNG XÃ HỘI (SOCIALS)</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="add-btn" onClick={() => {
                        const newSocials = [...(localConfig.social_links || [])];
                        newSocials.push({ name: 'Mới', icon: 'Globe', url: '', color: '#0084FF', isVisible: true });
                        setLocalConfig(prev => ({ ...prev, social_links: newSocials }));
                    }}>
                        <Plus size={14} /> THÊM MXH
                    </button>
                    {(localConfig.social_links || []).length > 0 && (
                        <button className="add-btn" style={{ background: '#ef4444' }} onClick={() => {
                            if (window.confirm("Ngài chắc chắn muốn xóa TẤT CẢ mạng xã hội này chứ? Thao tác này không thể hoàn tác.")) {
                                setLocalConfig(prev => ({ ...prev, social_links: [] }));
                            }
                        }}>
                            <Trash2 size={14} /> XÓA TẤT CẢ
                        </button>
                    )}
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(localConfig.social_links || []).map((social, idx) => (
                    <div key={idx} className="app-edit-row" style={{ display: 'grid', gridTemplateColumns: 'auto 150px 180px 1fr 150px auto auto', gap: '0.8rem', padding: '1.2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <input type="checkbox" checked={social.isVisible !== false} onChange={(e) => {
                        const newSocials = [...localConfig.social_links];
                        newSocials[idx].isVisible = e.target.checked;
                        setLocalConfig(prev => ({ ...prev, social_links: newSocials }));
                      }} />
                      
                      <input type="text" placeholder="Tên" value={social.name} onChange={(e) => {
                        const newSocials = [...localConfig.social_links];
                        newSocials[idx].name = e.target.value;
                        setLocalConfig(prev => ({ ...prev, social_links: newSocials }));
                      }} />

                      <div className="social-icon-library-wrapper" style={{ position: 'relative' }}>
                        <button 
                          className="btn-select-icon"
                          style={{
                            width: '45px',
                            height: '45px',
                            borderRadius: '12px',
                            background: social.color || 'rgba(255,255,255,0.05)',
                            border: '2px solid rgba(255,255,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#fff',
                            transition: 'all 0.3s'
                          }}
                          onClick={() => setActiveIconPickerIdx(activeIconPickerIdx === idx ? null : idx)}
                        >
                          {social.icon && (
                             <SocialIcon name={social.icon} size={20} color="#fff" />
                          )}
                          {!social.icon && <ImageIcon size={18} />}
                        </button>
                        
                        <AnimatePresence>
                          {activeIconPickerIdx === idx && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: 10 }}
                              style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                zIndex: 1000,
                                background: '#1a1a1f',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '16px',
                                padding: '1rem',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                                width: '320px',
                                marginTop: '10px'
                              }}
                            >
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(4, 1fr)',
                                gap: '0.8rem',
                                maxHeight: '300px',
                                overflowY: 'auto',
                                paddingRight: '5px'
                              }} className="custom-scrollbar">
                                {SOCIAL_PLATFORMS.map((platform, pIdx) => (
                                  <button
                                    key={pIdx}
                                    style={{
                                      width: '60px',
                                      height: '60px',
                                      borderRadius: '12px',
                                      background: platform.color + '22',
                                      border: `1px solid ${platform.color}44`,
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '5px',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                      position: 'relative'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = platform.color + '44'}
                                    onMouseOut={(e) => e.currentTarget.style.background = platform.color + '22'}
                                    onClick={() => {
                                      const newSocials = [...localConfig.social_links];
                                      newSocials[idx] = { 
                                          ...newSocials[idx], 
                                          name: platform.name, 
                                          color: platform.color,
                                          icon: platform.icon,
                                          iconUrl: '' 
                                      };
                                      setLocalConfig(prev => ({ ...prev, social_links: newSocials }));
                                      setActiveIconPickerIdx(null);
                                    }}
                                    title={platform.name}
                                  >
                                    <div style={{ color: platform.color, marginBottom: '2px' }}>
                                      <SocialIcon name={platform.icon} size={22} color={platform.color} />
                                    </div>
                                    <div style={{ color: platform.color, fontSize: '0.6rem', fontWeight: 'bold', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {platform.name}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '30px', height: '30px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           {social.iconUrl ? <img src={social.iconUrl} alt="icon" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <ImageIcon size={14} />}
                        </div>
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          <label style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.1)', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer' }}>
                            <Upload size={14} />
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, (res) => {
                               const newSocials = [...localConfig.social_links];
                               newSocials[idx].iconUrl = res;
                               setLocalConfig(prev => ({ ...prev, social_links: newSocials }));
                            }, 1)} />
                          </label>
                          {social.iconUrl && (
                            <button style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', padding: '0.3rem 0.5rem', borderRadius: '4px', border: 'none', cursor: 'pointer' }} onClick={() => handleReAdjust(social.iconUrl, (res) => {
                               const newSocials = [...localConfig.social_links];
                               newSocials[idx].iconUrl = res;
                               setLocalConfig(prev => ({ ...prev, social_links: newSocials }));
                            }, 1)}>
                               <Crop size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      <input type="text" placeholder="Link liên kết URL" value={social.url} onChange={(e) => {
                        const newSocials = [...localConfig.social_links];
                        newSocials[idx].url = e.target.value;
                        setLocalConfig(prev => ({ ...prev, social_links: newSocials }));
                      }} />

                      <div className="color-input-wrapper">
                        <input type="color" value={social.color} onChange={(e) => {
                          const newSocials = [...localConfig.social_links];
                          newSocials[idx].color = e.target.value;
                          setLocalConfig(prev => ({ ...prev, social_links: newSocials }));
                        }} />
                        <code style={{ fontSize: '0.7rem' }}>{social.color}</code>
                      </div>

                      <button className="delete-row-btn" onClick={() => {
                        const newSocials = localConfig.social_links.filter((_, i) => i !== idx);
                        setLocalConfig(prev => ({ ...prev, social_links: newSocials }));
                      }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'filmstrip' && (
              <motion.div key="filmstrip" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="config-section">
                <div className="input-group">
                   <label>TỐC ĐỘ CUỘN PHIM (GIÂY)</label>
                   <input type="number" value={localConfig.content.filmStripSpeed || 45} onChange={(e) => updateNested('content', 'filmStripSpeed', Number(e.target.value))} min="10" max="120" />
                </div>
                <div className="manager-header" style={{ marginTop: '2rem' }}>
                  <label>HÌNH ẢNH DẢI PHIM (FILM STRIP)</label>
                  <button className="add-btn" onClick={() => {
                     const newFilms = [...(localConfig.content.filmStripImages || [])];
                     newFilms.push('');
                     updateNested('content', 'filmStripImages', newFilms);
                  }}>
                    <Plus size={14} /> THÊM ẢNH/VIDEO
                  </button>
                </div>
                <div className="film-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  {(localConfig.content.filmStripImages || []).map((imgUrl, idx) => {
                    const isVideo = imgUrl?.match(/\.(mp4|webm|ogg|mov)$|^data:video/i);
                    return (
                      <div key={idx} className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                         <div style={{ height: '140px', background: '#000', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {isVideo ? (
                              <video src={imgUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} autoPlay muted loop />
                            ) : (
                              <img src={imgUrl} alt="strip" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.src = '/placeholder.png'} />
                            )}
                         </div>
                         <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="text" placeholder="URL hoặc Base64" value={imgUrl} style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} onChange={(e) => {
                               const newFilms = [...localConfig.content.filmStripImages];
                               newFilms[idx] = e.target.value;
                               updateNested('content', 'filmStripImages', newFilms);
                            }} />
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                               <label style={{ background: 'var(--accent-main)', color: '#fff', padding: '0.6rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                  <Upload size={14} />
                                  <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, (res) => {
                                     const newFilms = [...localConfig.content.filmStripImages];
                                     newFilms[idx] = res;
                                     updateNested('content', 'filmStripImages', newFilms);
                                  }, 1.77)} />
                               </label>
                               {!isVideo && imgUrl && (
                                  <button style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '0.6rem', borderRadius: '8px', border: 'none', cursor: 'pointer' }} onClick={() => handleReAdjust(imgUrl, (res) => {
                                     const newFilms = [...localConfig.content.filmStripImages];
                                     newFilms[idx] = res;
                                     updateNested('content', 'filmStripImages', newFilms);
                                  }, 1.77)}>
                                     <Crop size={14} />
                                  </button>
                               )}
                            </div>
                            <button style={{ background: 'var(--danger)', color: '#fff', padding: '0.6rem', borderRadius: '8px', border: 'none', cursor: 'pointer' }} onClick={() => {
                               const newFilms = localConfig.content.filmStripImages.filter((_, i) => i !== idx);
                               updateNested('content', 'filmStripImages', newFilms);
                            }}><Trash2 size={14} /></button>
                         </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {activeTab === 'apps' && (
              <motion.div key="apps" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="config-section">
                <div className="manager-header">
                  <label>HỆ SINH THÁI ỨNG DỤNG (TRUSTED APPS)</label>
                  <button className="add-btn" onClick={() => {
                     const newApps = [...(localConfig.apps || [])];
                     newApps.push({ name: 'App Mới', color: '#ffffff', iconUrl: '' });
                     setLocalConfig(prev => ({ ...prev, apps: newApps }));
                  }}>
                    <Plus size={14} /> THÊM ỨNG DỤNG
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(localConfig.apps || []).map((app, idx) => (
                    <div key={idx} className="app-edit-row" style={{ display: 'grid', gridTemplateColumns: '1fr 150px 200px 100px auto', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                      <input type="text" placeholder="Tên App" value={app.name} onChange={(e) => {
                        const newApps = [...localConfig.apps];
                        newApps[idx].name = e.target.value;
                        setLocalConfig(prev => ({ ...prev, apps: newApps }));
                      }} />
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                         <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', overflow: 'hidden' }}>
                            <img src={app.iconUrl || '/placeholder.png'} alt="app-icon" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                         </div>
                         <div style={{ display: 'flex', gap: '0.3rem' }}>
                            <label style={{ cursor: 'pointer', fontSize: '0.7rem', background: 'rgba(255,255,255,0.1)', padding: '0.3rem 0.5rem', borderRadius: '4px' }}>
                               <Upload size={14} />
                               <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, (res) => {
                                  const newApps = [...localConfig.apps];
                                  newApps[idx].iconUrl = res;
                                  setLocalConfig(prev => ({ ...prev, apps: newApps }));
                               }, 1)} />
                            </label>
                            {app.iconUrl && (
                              <button style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', padding: '0.3rem 0.5rem', borderRadius: '4px', border: 'none', cursor: 'pointer' }} onClick={() => handleReAdjust(app.iconUrl, (res) => {
                                 const newApps = [...localConfig.apps];
                                 newApps[idx].iconUrl = res;
                                 setLocalConfig(prev => ({ ...prev, apps: newApps }));
                              }, 1)}>
                                 <Crop size={14} />
                              </button>
                            )}
                         </div>
                      </div>

                      <input type="text" placeholder="Hoặc dán URL Icon" value={app.iconUrl} onChange={(e) => {
                        const newApps = [...localConfig.apps];
                        newApps[idx].iconUrl = e.target.value;
                        setLocalConfig(prev => ({ ...prev, apps: newApps }));
                      }} />

                      <input type="color" value={app.color} onChange={(e) => {
                        const newApps = [...localConfig.apps];
                        newApps[idx].color = e.target.value;
                        setLocalConfig(prev => ({ ...prev, apps: newApps }));
                      }} />
                      
                      <button className="delete-row-btn" onClick={() => {
                        const newApps = localConfig.apps.filter((_, i) => i !== idx);
                        setLocalConfig(prev => ({ ...prev, apps: newApps }));
                      }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'content' && (
              <motion.div key="content" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="config-section">
                <div className="quotes-manager-glass">
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--accent-main)' }}>
                         <MessageSquare size={20} /> QUẢN LÝ DANH NGÔN TÙY CHỈNH
                      </h3>
                      <button className="add-btn" onClick={() => {
                        const newQuotes = [...(localConfig.content.quotes || [])];
                        newQuotes.push('Danh ngôn mới...');
                        updateNested('content', 'quotes', newQuotes);
                      }}>+ THÊM CÂU MỚI</button>
                   </div>

                   <div className="quotes-modern-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', maxHeight: '60vh', overflowY: 'auto', paddingRight: '1rem' }}>
                      {(localConfig.content.quotes || []).map((quote, idx) => (
                        <div key={idx} className="quote-row-modern" style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                           <span style={{ minWidth: '30px', fontWeight: 800, color: 'var(--accent-secondary)' }}>{String(idx + 1).padStart(2, '0')}</span>
                           <textarea 
                             value={quote} 
                             style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: '0.95rem', resize: 'none', padding: '0.5rem' }}
                             onChange={(e) => {
                               const newQuotes = [...localConfig.content.quotes];
                               newQuotes[idx] = e.target.value;
                               updateNested('content', 'quotes', newQuotes);
                             }} 
                             rows={2} 
                           />
                           <button style={{ color: 'var(--danger)', opacity: 0.6, cursor: 'pointer' }} onClick={() => {
                               const newQuotes = localConfig.content.quotes.filter((_, i) => i !== idx);
                               updateNested('content', 'quotes', newQuotes);
                           }}><Trash2 size={18} /></button>
                        </div>
                      ))}
                   </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'appearance' && (
              <motion.div key="appearance" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="config-section">
                <div className="color-config-card">
                  <h3>THEME COLOR ENGINE</h3>
                  <div className="color-picker-grid">
                    <div className="input-group">
                      <label>CHẾ ĐỘ SÁNG / TỐI</label>
                      <select 
                        value={localConfig.appearance.theme || 'dark'} 
                        onChange={(e) => updateNested('appearance', 'theme', e.target.value)}
                        style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontFamily: 'var(--font-mono)' }}
                      >
                         <option value="dark">Tối (Dark Mode)</option>
                         <option value="light">Sáng (Light Mode)</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>MÀU CHỦ ĐẠO</label>
                      <div className="color-input-wrapper">
                        <input type="color" value={localConfig.appearance.primaryColor} onChange={(e) => updateNested('appearance', 'primaryColor', e.target.value)} />
                        <code>{localConfig.appearance.primaryColor}</code>
                      </div>
                    </div>
                    <div className="input-group">
                      <label>MÀU NHẤN MẠNH</label>
                      <div className="color-input-wrapper">
                        <input type="color" value={localConfig.appearance.accentColor} onChange={(e) => updateNested('appearance', 'accentColor', e.target.value)} />
                        <code>{localConfig.appearance.accentColor}</code>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="color-config-card" style={{ marginTop: '2rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ImageIcon size={18} /> CẤU HÌNH NỀN TIỆN ÍCH (AI CHAT / CHEF / YT)
                  </h3>
                  <div className="input-group">
                    <label>HÌNH NỀN CHỦ ĐẠO (PNG / GIF)</label>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                       <input type="text" value={localConfig.appearance.utilityBackground || ''} onChange={(e) => updateNested('appearance', 'utilityBackground', e.target.value)} placeholder="Dán URL hoặc Upload..." style={{ flex: 1 }} />
                       <label className="add-btn" style={{ cursor: 'pointer' }}>
                          <Upload size={16} /> UPLOAD
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, (res) => updateNested('appearance', 'utilityBackground', res))} />
                       </label>
                    </div>
                  </div>
                  <div className="input-group" style={{ marginTop: '1.5rem' }}>
                    <label>ĐỘ MỜ KÍNH (BLUR: {localConfig.appearance.utilityGlassBlur || 15}px)</label>
                    <input 
                      type="range" 
                      min="0" max="40" 
                      value={localConfig.appearance.utilityGlassBlur || 15} 
                      onChange={(e) => updateNested('appearance', 'utilityGlassBlur', Number(e.target.value))} 
                      style={{ width: '100%', accentColor: 'var(--accent-main)' }}
                    />
                  </div>
                </div>
              </motion.div>
            )}



            {activeTab === 'analytics' && (
              <motion.div key="analytics" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="config-section">
                {/* Stats Cards Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #00d2ff', background: 'linear-gradient(135deg, rgba(0, 210, 255, 0.05), transparent)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.6, fontSize: '0.8rem', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                       <span>TỔNG LƯỢT TRUY CẬP</span>
                       <Eye size={14} />
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#00d2ff', textShadow: '0 0 15px rgba(0, 210, 255, 0.3)' }}>
                      {analyticsData.length}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Dữ liệu thời gian thực</div>
                  </div>
                  
                  <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-main)', background: 'linear-gradient(135deg, rgba(var(--accent-rgb), 0.05), transparent)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.6, fontSize: '0.8rem', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                       <span>TRANG PHỔ BIẾN NHẤT</span>
                       <TrendingUp size={14} />
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--accent-main)' }}>
                      {(() => {
                        const counts = {};
                        analyticsData.forEach(d => counts[d.path] = (counts[d.path] || 0) + 1);
                        const top = Object.entries(counts).sort((a,b) => b[1]-a[1])[0];
                        return top ? top[0] : 'N/A';
                      })()}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Dựa trên {analyticsData.length} mẫu</div>
                  </div>

                  <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), transparent)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.6, fontSize: '0.8rem', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                       <span>MOBILE VS DESKTOP</span>
                       <Smartphone size={14} />
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#10b981' }}>
                      {(() => {
                        let mob = 0;
                        analyticsData.forEach(d => { if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(d.userAgent)) mob++; });
                        const mobPerc = analyticsData.length ? Math.round((mob/analyticsData.length)*100) : 0;
                        return `${mobPerc}% / ${100-mobPerc}%`;
                      })()}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Phân bổ loại thiết bị</div>
                  </div>
                </div>

                {/* Visual Charts Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                   <div className="glass-panel" style={{ padding: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8, fontFamily: 'var(--font-mono)' }}>PHÂN BỔ TRANG TRUY CẬP (TOP 5)</h4>
                        <BarChart3 size={16} opacity={0.5} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                         {(() => {
                            const counts = {};
                            analyticsData.forEach(d => counts[d.path] = (counts[d.path] || 0) + 1);
                            const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 5);
                            const max = sorted[0]?.[1] || 1;
                            return sorted.map(([path, count], idx) => (
                               <div key={idx} style={{ position: 'relative' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                                     <span style={{ opacity: 0.8 }}>{path}</span>
                                     <span style={{ fontWeight: 600 }}>{count} views</span>
                                  </div>
                                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                                     <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(count/max)*100}%` }}
                                        transition={{ duration: 1.2, delay: idx*0.1, ease: "circOut" }}
                                        style={{ height: '100%', background: `linear-gradient(90deg, var(--accent-main), #ffb000)`, boxShadow: '0 0 10px var(--accent-glow)' }}
                                     />
                                  </div>
                               </div>
                            ));
                         })()}
                         {analyticsData.length === 0 && <p style={{ textAlign: 'center', opacity: 0.4, fontSize: '0.8rem' }}>Chưa có dữ liệu đồ thị...</p>}
                      </div>
                   </div>

                   <div className="glass-panel" style={{ padding: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8, fontFamily: 'var(--font-mono)' }}>TRÌNH DUYỆT SỬ DỤNG</h4>
                        <Globe size={16} opacity={0.5} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        {(() => {
                           const browsers = { Chrome: 0, Safari: 0, Firefox: 0, Edge: 0, Other: 0 };
                           analyticsData.forEach(d => {
                              if (d.userAgent.includes('Chrome')) browsers.Chrome++;
                              else if (d.userAgent.includes('Safari')) browsers.Safari++;
                              else if (d.userAgent.includes('Firefox')) browsers.Firefox++;
                              else if (d.userAgent.includes('Edg')) browsers.Edge++;
                              else browsers.Other++;
                           });
                           return Object.entries(browsers).filter(b => b[1] > 0).map(([name, count], idx) => (
                              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                 <div style={{ width: '50px', fontSize: '0.7rem', opacity: 0.6 }}>{name}</div>
                                 <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <motion.div 
                                       initial={{ width: 0 }}
                                       animate={{ width: `${(count/analyticsData.length)*100}%` }}
                                       transition={{ duration: 1, delay: idx*0.05 }}
                                       style={{ height: '100%', background: name === 'Chrome' ? '#4285F4' : name === 'Safari' ? '#007AFF' : 'var(--accent-main)' }}
                                    />
                                 </div>
                                 <div style={{ fontSize: '0.7rem', fontWeight: 600, width: '30px', textAlign: 'right' }}>{Math.round((count/analyticsData.length)*100)}%</div>
                              </div>
                           ));
                        })()}
                        {analyticsData.length === 0 && <p style={{ textAlign: 'center', opacity: 0.4, fontSize: '0.8rem' }}>Chưa có dữ liệu đồ thị...</p>}
                      </div>
                   </div>
                </div>

                <div className="manager-header" style={{ marginBottom: '1rem' }}>
                   <label>TRAFFIC & EVENT STREAM (MỚI NHẤT)</label>
                   <button className="add-btn" onClick={fetchAnalytics} disabled={loadingAnalytics}>
                     <Activity size={14} className={loadingAnalytics ? "spin" : ""} /> 
                     {loadingAnalytics ? 'ĐANG TẢI...' : 'LÀM MỚI'}
                   </button>
                </div>

                <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                   <table className="admin-table">
                     <thead>
                       <tr>
                         <th>Sự kiện</th>
                         <th>Đường dẫn</th>
                         <th>Thời gian</th>
                         <th>Thiết bị / UserAgent</th>
                       </tr>
                     </thead>
                     <tbody>
                       {analyticsData.map(log => (
                         <tr key={log.id}>
                           <td>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                               <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: log.event === 'PAGE_VIEW' ? '#00d2ff' : 'var(--accent-main)', boxShadow: `0 0 8px ${log.event === 'PAGE_VIEW' ? '#00d2ff' : 'var(--accent-main)'}` }} />
                               <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.8rem' }}>{log.event}</span>
                             </div>
                           </td>
                           <td><code style={{ fontSize: '0.75rem', color: 'var(--accent-main)' }}>{log.path}</code></td>
                           <td style={{ fontSize: '0.8rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: 0.8 }}>
                                 <Clock size={12} />
                                 {log.timestamp?.toDate?.()?.toLocaleString() || 'Vừa xong'}
                              </div>
                           </td>
                           <td style={{ fontSize: '0.7rem', opacity: 0.6, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                             {/Android|iPhone/i.test(log.userAgent) ? <Smartphone size={12} style={{marginRight:'4px'}} /> : <Monitor size={12} style={{marginRight:'4px'}} />}
                             {log.userAgent}
                           </td>
                         </tr>
                       ))}
                       {analyticsData.length === 0 && (
                         <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>Chưa có dữ liệu thống kê...</td></tr>
                       )}
                     </tbody>
                   </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'blog' && (
              <motion.div key="blog" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="config-section">
                <div className="manager-header">
                   <div style={{ display: 'flex', gap: '0.8rem', color: 'var(--accent-main)', alignItems: 'center' }}>
                      <FileText size={24} /> <h3>QUẢN LÝ BÀI VIẾT & BLOG</h3>
                   </div>
                   <div style={{ display: 'flex', gap: '1rem' }}>
                      <Link to="/admin/cms/new" className="add-btn" style={{ background: 'var(--accent-main)', border: 'none', color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Edit size={14} /> VIẾT BÀI MỚI (CMS)
                      </Link>
                      <button className="add-btn" onClick={fetchBlogPosts}><Activity size={14} /> REFRESH</button>
                   </div>
                </div>

                {seedingProgress && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', borderLeft: '4px solid var(--accent-main)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Zap className={isSyncingNews ? "spin" : ""} size={16} color="var(--accent-main)" /> {seedingProgress}
                  </motion.div>
                )}

                <div className="glass-panel" style={{ padding: 0 }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>BÀI VIẾT</th>
                        <th>DANH MỤC</th>
                        <th>NGÀY ĐĂNG</th>
                        <th style={{ textAlign: 'right' }}>THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingBlog ? (
                        <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Đang tải danh sách bài viết...</td></tr>
                      ) : blogPosts.length === 0 ? (
                        <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>Chưa có bài viết nào. Hãy thử nhấn nút VIẾT BÀI MỚI (CMS) ở trên!</td></tr>
                      ) : blogPosts.map(post => (
                        <tr key={post.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <img src={post.thumbnail} style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} alt="tn" />
                              <div style={{ fontWeight: 600, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</div>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span className="role-badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--accent-main)', border: '1px solid var(--accent-main)' }}>{post.category?.toUpperCase() || 'TECH'}</span>
                              <span className="role-badge" style={{ background: post.published ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: post.published ? '#10b981' : '#f59e0b', border: `1px solid ${post.published ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}` }}>
                                {post.published ? 'PUBLIC' : 'DRAFT'}
                              </span>
                            </div>
                          </td>
                          <td style={{ fontSize: '0.8rem', opacity: 0.7 }}>{post.date}</td>
                          <td style={{ textAlign: 'right' }}>
                            <Link to={`/admin/cms/${post.id}`} className="icon-btn" style={{ background: 'rgba(255, 154, 61, 0.1)', color: 'var(--accent-main)', borderColor: 'rgba(255, 154, 61, 0.2)' }}><Edit size={14} /></Link>
                            <Link to={`/blog/${post.id}`} target="_blank" className="icon-btn"><ExternalLink size={14} /></Link>
                            <button className="icon-btn danger" onClick={() => deleteBlogPost(post.id)}><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'users' && (
              <motion.div key="users" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="config-section">
                 <div className="manager-header">
                    <label>DB USERS ({usersList.length})</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                       <button className="add-btn" onClick={() => setUserModal({ isOpen: true, mode: 'add', data: { role: 'user' } })}><Plus size={14} /> THÊM MỚI</button>
                       <button className="add-btn" onClick={fetchUsers}><Activity size={14} /> REFRESH</button>
                    </div>
                 </div>
                 <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="admin-table">
                       <thead>
                          <tr>
                             <th>Bản sắc</th>
                             <th>Liên hệ</th>
                             <th>Vai trò</th>
                             <th style={{ textAlign: 'right' }}>Thao tác</th>
                          </tr>
                       </thead>
                       <tbody>
                          {usersList.map(user => (
                             <tr key={user.id}>
                                <td>
                                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <img src={user.photoURL || `https://api.dicebear.com/7.x/shapes/svg?seed=${user.email}`} style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#fff' }} alt="u" />
                                      <div>
                                         <div style={{ fontWeight: 'bold' }}>{user.displayName || 'Unnamed'}</div>
                                         <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>@{user.username || 'n/a'}</div>
                                      </div>
                                   </div>
                                </td>
                                <td>{user.email}</td>
                                <td><span className={`role-badge ${user.role}`}>{user.role?.toUpperCase()}</span></td>
                                <td style={{ textAlign: 'right' }}>
                                   <button className="icon-btn" onClick={() => setUserModal({ isOpen: true, mode: 'edit', data: user })}><Edit size={14} /></button>
                                   <button className="icon-btn danger" onClick={() => deleteUserRecord(user.id)}><Trash2 size={14} /></button>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </motion.div>
            )}

            {activeTab === 'integrations' && (
              <motion.div key="integrations" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="config-section">
                <div className="manager-header" style={{ marginBottom: '2rem' }}>
                   <div style={{ display: 'flex', gap: '0.8rem', color: 'var(--accent-main)', alignItems: 'center' }}>
                      <Key size={24} /> <h3>KẾT NỐI DỊCH VỤ NGOÀI (API & SERVICES)</h3>
                   </div>
                   <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Quản lý các kết nối API để gửi Email và các dịch vụ AI cho Iris.</p>
                </div>

                <div className="glass-panel" style={{ padding: '2rem', borderRadius: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    
                    {/* EMAILJS SECTION */}
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '2rem' }}>
                      <h4 style={{ color: 'var(--accent-main)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Mail size={18} /> EMAILJS (Hệ thống gửi thư liên hệ)
                      </h4>
                      <div className="input-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="input-group">
                          <label>SERVICE ID</label>
                          <input 
                            type="text" 
                            value={localConfig.integrations?.emailjsServiceId || ''} 
                            onChange={(e) => updateNested('integrations', 'emailjsServiceId', e.target.value)} 
                            placeholder="service_..." 
                          />
                        </div>
                        <div className="input-group">
                          <label>TEMPLATE ID</label>
                          <input 
                            type="text" 
                            value={localConfig.integrations?.emailjsTemplateId || ''} 
                            onChange={(e) => updateNested('integrations', 'emailjsTemplateId', e.target.value)} 
                            placeholder="template_..." 
                          />
                        </div>
                        <div className="input-group" style={{ gridColumn: 'span 2' }}>
                          <label>PUBLIC KEY (USER ID)</label>
                          <input 
                            type="text" 
                            value={localConfig.integrations?.emailjsPublicKey || ''} 
                            onChange={(e) => updateNested('integrations', 'emailjsPublicKey', e.target.value)} 
                            placeholder="Mã khóa công khai..." 
                          />
                        </div>
                      </div>
                    </div>

                    {/* AI SECTION */}
                    <div>
                      <h4 style={{ color: 'var(--accent-main)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Brain size={18} /> GOOGLE GEMINI AI
                      </h4>
                      <div className="input-group">
                        <label>GEMINI API KEY</label>
                        <div style={{ position: 'relative' }}>
                          <input 
                            type="password" 
                            value={localConfig.integrations?.geminiKey || ''} 
                            onChange={(e) => updateNested('integrations', 'geminiKey', e.target.value)} 
                            placeholder="Dán API Key vào đây..."
                            style={{ paddingRight: '3rem' }}
                          />
                          <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                            <Lock size={16} />
                          </div>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                          Key này được dùng cho các tính năng Seeding Blog và Chat AI (nếu được bật).
                        </p>
                      </div>
                    </div>

                  </div>
                </div>

                <div className="api-config-alert" style={{ marginTop: '2rem', background: 'rgba(255, 154, 61, 0.1)', color: 'var(--accent-main)', padding: '1rem', borderRadius: '12px', borderLeft: '4px solid var(--accent-main)' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>
                    <strong>LƯU Ý:</strong> Sau khi thay đổi các thông tin này, Ngài nhớ nhấn nút <strong>LƯU CẤU HÌNH</strong> ở thanh bên trái để áp dụng thay đổi vĩnh viễn.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'maintenance' && (
              <motion.div key="maintenance" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="config-section">
                <div className="manager-header" style={{ marginBottom: '2.5rem' }}>
                   <div style={{ display: 'flex', gap: '0.8rem', color: 'var(--accent-main)', alignItems: 'center' }}>
                      <Lock size={24} /> <h3>QUẢN LÝ TRẠNG THÁI TRANG (LOCK SYSTEM)</h3>
                   </div>
                   <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Bật "Bảo trì" để tạm thời khóa quyền truy cập của khách vào các trang cụ thể.</p>
                </div>

                <div className="glass-panel" style={{ padding: '2rem', background: 'rgba(10,10,10,0.4)', borderRadius: '24px' }}>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                    gap: '1.5rem',
                    color: '#fff' 
                  }}>
                    {[
                      'blog', 'chronicles', 'about', 'skills'
                    ].map(key => (
                      <div key={key} style={{ 
                        background: 'rgba(255,255,255,0.03)', 
                        padding: '1.5rem', 
                        borderRadius: '20px', 
                        border: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.2rem',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ 
                            fontWeight: '700', 
                            textTransform: 'uppercase', 
                            fontSize: '0.85rem', 
                            letterSpacing: '1.5px',
                            color: 'var(--accent-main)'
                          }}>
                            {key === 'blog' ? 'BLOG SYSTEM' : 
                             key === 'chronicles' ? 'PERSONAL CHRONICLES' : 
                             key.toUpperCase()}
                          </span>
                          {(localConfig.maintenance && localConfig.maintenance[key]) ? <Lock size={18} color="#ff4d4d" /> : <Unlock size={18} color="#00ffcc" />}
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <button 
                            onClick={() => {
                              const currentVal = (localConfig.maintenance && localConfig.maintenance[key]) || false;
                              updateNested('maintenance', key, !currentVal);
                            }}
                            style={{ 
                              flex: 1,
                              padding: '1rem',
                              borderRadius: '14px',
                              background: (localConfig.maintenance && localConfig.maintenance[key]) ? 'rgba(255, 77, 77, 0.15)' : 'rgba(0, 255, 204, 0.1)',
                              color: (localConfig.maintenance && localConfig.maintenance[key]) ? '#ff4d4d' : '#00ffcc',
                              border: `1px solid ${(localConfig.maintenance && localConfig.maintenance[key]) ? 'rgba(255, 77, 77, 0.3)' : 'rgba(0, 255, 204, 0.2)'}`,
                              fontWeight: '800',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              textShadow: (localConfig.maintenance && localConfig.maintenance[key]) ? '0 0 10px rgba(255,77,77,0.3)' : 'none'
                            }}
                          >
                            {(localConfig.maintenance && localConfig.maintenance[key]) ? 'Hệ thống đang Khóa' : 'Đang Công khai'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="admin-divider" style={{ margin: '3rem 0' }}></div>

                  <div className="manager-header" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.8rem', color: 'var(--accent-main)', alignItems: 'center' }}>
                      <Smartphone size={24} /> <h3>KHÓA TRUY CẬP ĐIỆN THOẠI (MOBILE ACCESS CONTROL)</h3>
                    </div>
                  </div>

                  <div className="glass-panel" style={{ padding: '2rem', borderRadius: '24px', background: 'rgba(10,10,10,0.2)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                      Chọn nhanh các trang muốn chặn trên Mobile hoặc nhập đường dẫn tùy chỉnh ở phía dưới.
                    </p>

                    {/* GUI QUICK TOGGLE */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
                      gap: '1rem',
                      marginBottom: '3rem'
                    }}>
                      {[
                        { label: 'BLOG SYSTEM', path: '/blog', icon: <FileText size={16} /> },
                        { label: 'CHRONICLES', path: '/chronicles', icon: <Activity size={16} /> },
                        { label: 'ABOUT ME', path: '/about', icon: <Home size={16} /> },
                        { label: 'SKILLS & TECH', path: '/skills', icon: <Zap size={16} /> },
                        { label: 'MEMORIES', path: '/memories', icon: <ImageIcon size={16} /> },
                        { label: 'CONTACT', path: '/contact', icon: <Mail size={16} /> },
                      ].map(item => {
                        const isBlocked = (localConfig.maintenance?.mobileBlockedPaths || []).includes(item.path);
                        return (
                          <button
                            key={item.path}
                            onClick={() => {
                              const current = localConfig.maintenance?.mobileBlockedPaths || [];
                              if (isBlocked) {
                                updateNested('maintenance', 'mobileBlockedPaths', current.filter(p => p !== item.path));
                              } else {
                                updateNested('maintenance', 'mobileBlockedPaths', [...current, item.path]);
                              }
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.8rem',
                              padding: '1rem',
                              borderRadius: '12px',
                              background: isBlocked ? 'rgba(255, 77, 77, 0.15)' : 'rgba(255,255,255,0.03)',
                              color: isBlocked ? '#ff4d4d' : 'var(--text-muted)',
                              border: `1px solid ${isBlocked ? 'rgba(255, 77, 77, 0.3)' : 'rgba(255,255,255,0.08)'}`,
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {item.icon}
                            {item.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="admin-divider" style={{ margin: '2rem 0', opacity: 0.1 }}></div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-main)', marginBottom: '1rem', display: 'block' }}>NHẬP ĐƯỜNG DẪN TÙY CHỈNH (ADVANCED)</label>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                       <input 
                         type="text" 
                         id="new-mobile-path"
                         placeholder="VD: /secret-page ..." 
                         style={{ flex: 1, padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                         onKeyDown={(e) => {
                           if (e.key === 'Enter') {
                             const val = e.target.value.trim();
                             if (val) {
                               const current = localConfig.maintenance?.mobileBlockedPaths || [];
                               if (!current.includes(val)) {
                                 updateNested('maintenance', 'mobileBlockedPaths', [...current, val]);
                               }
                               e.target.value = '';
                             }
                           }
                         }}
                       />
                       <button className="add-btn" onClick={() => {
                          const input = document.getElementById('new-mobile-path');
                          const val = input.value.trim();
                          if (val) {
                            const current = localConfig.maintenance?.mobileBlockedPaths || [];
                            if (!current.includes(val)) {
                              updateNested('maintenance', 'mobileBlockedPaths', [...current, val]);
                            }
                            input.value = '';
                          }
                       }}>THÊM VÀO DANH SÁCH</button>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                      {(localConfig.maintenance?.mobileBlockedPaths || []).map(path => (
                        <div key={path} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d', padding: '0.8rem 1.2rem', borderRadius: '12px', border: '1px solid rgba(255, 77, 77, 0.2)' }}>
                          <Lock size={14} />
                          <span style={{ fontWeight: 600 }}>{path}</span>
                          <X size={16} style={{ cursor: 'pointer', opacity: 0.6 }} onClick={() => {
                            const current = localConfig.maintenance.mobileBlockedPaths.filter(p => p !== path);
                            updateNested('maintenance', 'mobileBlockedPaths', current);
                          }} />
                        </div>
                      ))}
                      {(localConfig.maintenance?.mobileBlockedPaths || []).length === 0 && (
                        <div style={{ opacity: 0.4, fontStyle: 'italic', padding: '1rem' }}>Chưa có đường dẫn nào bị chặn. Điện thoại có thể truy cập toàn bộ trang web.</div>
                      )}
                    </div>
                  </div>

                <div className="api-config-alert" style={{ marginTop: '2rem', borderLeft: '4px solid var(--accent-main)' }}>
                  <strong>LƯU Ý:</strong> Admin (là ngài) vẫn có thể truy cập các trang bị khóa để kiểm tra. Khách vãng lai sẽ thấy trang thông báo bảo trì.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* MODAL USER CRUD */}
      {userModal.isOpen && (
        <div className="admin-modal-overlay">
           <div className="admin-modal-card">
              <button className="modal-close" onClick={() => setUserModal({ isOpen: false, mode: 'add', data: {} })}><X size={20} /></button>
              <h2>{userModal.mode === 'add' ? 'KHỞI TẠO' : 'HIỆU CHỈNH'} HỒ SƠ</h2>
              <form onSubmit={saveUserRecord} className="modal-form">
                 <div className="form-row">
                    <div className="field">
                       <label>TÊN HIỂN THỊ</label>
                       <input type="text" value={userModal.data.displayName || ''} onChange={(e) => setUserModal({ ...userModal, data: { ...userModal.data, displayName: e.target.value } })} required />
                    </div>
                    <div className="field" style={{ width: '120px' }}>
                       <label>QUYỀN HẠN</label>
                       <select value={userModal.data.role || 'user'} onChange={(e) => setUserModal({ ...userModal, data: { ...userModal.data, role: e.target.value } })}>
                          <option value="user">USER</option>
                          <option value="admin">ADMIN</option>
                       </select>
                    </div>
                 </div>
                 <div className="field">
                    <label>EMAIL HỆ THỐNG</label>
                    <input type="email" value={userModal.data.email || ''} onChange={(e) => setUserModal({ ...userModal, data: { ...userModal.data, email: e.target.value } })} required />
                 </div>
                 <div className="field">
                    <label>USERNAME @</label>
                    <input type="text" value={userModal.data.username || ''} onChange={(e) => setUserModal({ ...userModal, data: { ...userModal.data, username: e.target.value } })} />
                 </div>
                 <div className="field">
                    <label>URL AVATAR</label>
                    <input type="text" value={userModal.data.photoURL || ''} onChange={(e) => setUserModal({ ...userModal, data: { ...userModal.data, photoURL: e.target.value } })} />
                 </div>
                 <button type="submit" className="save-btn"><Save size={18}/> LƯU DỮ LIỆU</button>
              </form>
           </div>
        </div>
      )}

      {/* MODAL IMAGE ADJUSTER */}
      <AnimatePresence>
        {adjustmentModal.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="admin-modal-overlay"
          >
             <motion.div 
               initial={{ scale: 0.9, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               className="admin-modal-card" 
               style={{ maxWidth: '700px', width: '90%' }}
             >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                   <h2 style={{ margin: 0 }}>CĂN CHỈNH VÙNG HIỂN THỊ</h2>
                   <button className="modal-close" onClick={() => setAdjustmentModal({ ...adjustmentModal, isOpen: false })}><X size={20} /></button>
                </div>

                <div className="adjuster-viewport-wrapper" style={{ 
                  width: '100%', 
                  aspectRatio: adjustmentModal.aspect, 
                  background: '#0a0a0a', 
                  borderRadius: '12px', 
                  overflow: 'hidden', 
                  position: 'relative',
                  border: '2px solid var(--accent-main)',
                  boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)'
                }}>
                   <motion.img 
                     src={adjustmentModal.src}
                     drag
                     dragConstraints={{ left: -1000, right: 1000, top: -1000, bottom: 1000 }} // Soft constraints, math will fix crop
                     onDragEnd={(e, info) => setDragPos(prev => ({ x: prev.x + info.offset.x, y: prev.y + info.offset.y }))}
                     style={{ 
                        position: 'absolute', 
                        top: '50%', 
                        left: '50%',
                        x: '-50%',
                        y: '-50%',
                        cursor: 'move',
                        scale: zoom,
                        maxHeight: '100%'
                     }} 
                   />
                   
                   {/* Centering guide lines */}
                   <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', border: '1px dashed rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <div style={{ width: '1px', height: '100%', background: 'rgba(255,255,255,0.1)' }} />
                      <div style={{ position: 'absolute', width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                   </div>
                </div>

                <div style={{ marginTop: '2rem' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', opacity: 0.7 }}>
                      <span>MỨC PHÓNG ĐẠI: {Math.round(zoom * 100)}%</span>
                      <span>KÉO ẢNH ĐỂ CĂN GIỮA KHUÔN MẶT</span>
                   </div>
                   <input 
                     type="range" 
                     min="1" max="3" step="0.01" 
                     value={zoom} 
                     onChange={(e) => setZoom(parseFloat(e.target.value))}
                     style={{ width: '100%', height: '6px', appearance: 'none', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', cursor: 'pointer' }}
                   />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                   <button className="add-btn" style={{ flex: 1, padding: '1rem' }} onClick={getCroppedImage}>
                      <CheckCircle size={18} /> HOÀN TẤT CĂN CHỈNH
                   </button>
                   <button className="modal-close" style={{ position: 'relative', top: 0, right: 0, padding: '1rem', background: 'rgba(255,255,255,0.05)' }} onClick={() => setAdjustmentModal({ ...adjustmentModal, isOpen: false })}>
                      HỦY
                   </button>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
