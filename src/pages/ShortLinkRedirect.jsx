import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

const ShortLinkRedirect = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading, not_found, error

  useEffect(() => {
    const findAndRedirect = async () => {
      try {
        const docRef = doc(db, 'short_links', slug);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          // Increment click counter
          await updateDoc(docRef, {
            clicks: increment(1)
          });
          
          // Redirect to long URL
          window.location.href = data.longUrl;
        } else {
          setStatus('not_found');
        }
      } catch (err) {
        console.error("Redirection error:", err);
        setStatus('error');
      }
    };

    if (slug) {
      findAndRedirect();
    }
  }, [slug]);

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050505', color: '#fff' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{ marginBottom: '1.5rem' }}
        >
          <Loader2 size={48} color="var(--accent-main, #00f0ff)" />
        </motion.div>
        <h2 style={{ fontFamily: 'var(--font-heading)', letterSpacing: '2px' }}>ĐANG CHUYỂN HƯỚNG...</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Vui lòng chờ trong giây lát.</p>
      </div>
    );
  }

  if (status === 'not_found' || status === 'error') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050505', color: '#fff', padding: '2rem', textAlign: 'center' }}>
        <AlertCircle size={64} color="#ef4444" style={{ marginBottom: '1.5rem' }} />
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', marginBottom: '1rem' }}>LIÊN KẾT KHÔNG TỒN TẠI</h1>
        <p style={{ color: 'var(--text-muted)', maxWidth: '500px', lineHeight: 1.6, marginBottom: '2.5rem' }}>
          {status === 'not_found' 
            ? "Đường dẫn rút gọn này không tồn tại trong hệ thống BCT0902 hoặc đã bị gỡ bỏ." 
            : "Đã xảy ra lỗi hệ thống khi cố gắng xử lý yêu cầu chuyển hướng của bạn."}
        </p>
        <button 
          onClick={() => navigate('/')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '1rem 2rem', 
            background: 'var(--accent-main)', 
            color: '#000', 
            borderRadius: '8px', 
            fontWeight: 'bold',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={18} /> QUAY LẠI TRANG CHỦ
        </button>
      </div>
    );
  }

  return null;
};

export default ShortLinkRedirect;
