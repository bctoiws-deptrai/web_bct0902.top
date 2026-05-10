import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, CheckCircle, AlertCircle, Settings, Layout, Image as ImageIcon, Check, Save, X, Trophy, Download, Play, Pause, CircleStop, Trash2, QrCode, Copy } from 'lucide-react';
import mammoth from 'mammoth';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import './QuizMaker.css';

const QuizMaker = () => {
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // States
  const [step, setStep] = useState(0); // 0: Dashboard, 1: Upload, 2: Preview, 3: Config
  const [fileName, setFileName] = useState('');
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [answerFormat, setAnswerFormat] = useState('bold'); // 'bold', 'italic', 'aiken'
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'invalid'
  const [editingQuestion, setEditingQuestion] = useState(null); // stores the question object currently being edited
  const [userQuizzes, setUserQuizzes] = useState([]);
  const [quizId, setQuizId] = useState(null); // ID of the quiz being edited
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);
  
  // Config States
  const [config, setConfig] = useState({
    title: 'Bài thi trắc nghiệm',
    description: '',
    bannerUrl: '',
    backgroundUrl: '',
    timeLimit: 45,
    questionsCount: 40,
    isScored: true,
    hasLeaderboard: true,
    allowRetry: true, // New: Allow retake
    retryLimit: 1,    // New: Number of retakes
    expiryDate: '' // New: Deadline
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [currentLeaderboard, setCurrentLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [activeQuizTitle, setActiveQuizTitle] = useState('');
  const [activeQuizSlug, setActiveQuizSlug] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState(null);

  // --- Dashboard Logic ---
  useEffect(() => {
    if (currentUser || isAdmin) {
      fetchUserQuizzes();
    }
  }, [currentUser, isAdmin]);

  const fetchUserQuizzes = async () => {
    setIsLoadingQuizzes(true);
    try {
      const quizzesRef = collection(db, 'quizzes');
      let q;
      if (isAdmin) {
        q = query(quizzesRef);
      } else {
        q = query(quizzesRef, where('creatorId', '==', currentUser.uid));
      }
      
      const querySnapshot = await getDocs(q);
      const fetched = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
      
      setUserQuizzes(fetched);
    } catch (err) {
      console.error("Error fetching quizzes:", err);
      setError("Không thể tải danh sách bài thi.");
    } finally {
      setIsLoadingQuizzes(false);
    }
  };

  const handleViewLeaderboard = async (slug, title) => {
    setLeaderboardLoading(true);
    setShowLeaderboard(true);
    setActiveQuizTitle(title);
    setActiveQuizSlug(slug);
    try {
      const resultsRef = collection(db, 'quiz_results');
      const q = query(resultsRef, where('quizSlug', '==', slug));
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      results.sort((a, b) => b.score - a.score || a.timeSpent - b.timeSpent);
      setCurrentLeaderboard(results);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      setError("Không thể tải bảng xếp hạng!");
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const quizRef = doc(db, 'quizzes', id);
      await updateDoc(quizRef, { status: newStatus });
      fetchUserQuizzes(); // Refresh list
    } catch (err) {
      console.error("Error updating status:", err);
      setError("Không thể cập nhật trạng thái bài thi!");
    }
  };

  const handleClearResults = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa toàn bộ dữ liệu xếp hạng của bài thi này? Thao tác này không thể hoàn tác!")) return;
    
    setLeaderboardLoading(true);
    try {
      const resultsRef = collection(db, 'quiz_results');
      const q = query(resultsRef, where('quizSlug', '==', activeQuizSlug));
      const snapshot = await getDocs(q);
      
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'quiz_results', d.id)));
      await Promise.all(deletePromises);
      
      setCurrentLeaderboard([]);
      alert("Đã xóa toàn bộ dữ liệu xếp hạng.");
    } catch (err) {
      console.error("Error clearing results:", err);
      setError("Lỗi khi xóa dữ liệu!");
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const exportToExcel = () => {
    if (currentLeaderboard.length === 0) return;

    // Create CSV content with BOM and separator hint for Excel
    let csv = '\uFEFF';
    csv += 'sep=,\n'; // Hint for Excel to use comma as separator
    
    // Headers: Rank, [Custom Fields], Score, Correct, Total, Time, Date
    const customFields = generatedQuiz?.config?.participantFields || [{ label: 'Thí sinh', key: 'userName' }];
    const headers = ['Hạng', ...customFields.map(f => f.label), 'Điểm', 'Số câu đúng', 'Tổng câu', 'Thời gian làm (giây)', 'Ngày nộp'];
    csv += headers.join(',') + '\n';
    
    currentLeaderboard.forEach((res, idx) => {
      const fieldValues = customFields.map(f => {
        const val = res.participantData ? res.participantData[f.key] : (f.key === 'userName' ? res.userName : '');
        return `"${val || ''}"`;
      });
      const row = [idx + 1, ...fieldValues, res.score, res.correctCount, res.totalCount, res.timeSpent, `"${res.submittedAt?.toDate().toLocaleString('vi-VN')}"` ];
      csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Leaderboard_${activeQuizSlug}_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEditQuiz = (quiz) => {
    setQuizId(quiz.id);
    setQuestions(quiz.questions);
    setConfig(quiz.config);
    setStep(3); // Go straight to config
    setError('');
  };

  const handleDeleteQuizRecord = async (id) => {
    if (window.confirm('Ngài có chắc muốn xóa vĩnh viễn bài thi này?')) {
      try {
        await deleteDoc(doc(db, 'quizzes', id));
        setUserQuizzes(userQuizzes.filter(q => q.id !== id));
      } catch (err) {
        console.error("Error deleting quiz:", err);
        alert("Lỗi khi xóa bài thi.");
      }
    }
  };

  const handleCloneQuiz = async (quiz) => {
    const recipientId = window.prompt("Nhập UID hoặc Email của người nhận (Để trống nếu muốn clone cho chính mình):");
    if (recipientId === null) return;

    setIsSaving(true);
    try {
      const newSlug = generateSlug();
      const cloneData = {
        ...quiz,
        slug: newSlug,
        creatorId: recipientId.trim() || quiz.creatorId,
        creatorName: recipientId.trim() ? `Shared_to_${recipientId}` : quiz.creatorName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'active'
      };
      delete cloneData.id; // Remove original ID
      
      await addDoc(collection(db, 'quizzes'), cloneData);
      alert(`Đã sao chép bài thi thành công! Mã tham gia mới: ${newSlug}`);
      fetchUserQuizzes();
    } catch (err) {
      console.error("Error cloning quiz:", err);
      alert("Lỗi khi sao chép bài thi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetAttempt = async (quizSlug, userName, participantData) => {
      if (!window.confirm(`Reset lượt thi cho thí sinh ${userName}?`)) return;
      
      try {
          // Find the attempt record
          const attemptsRef = collection(db, 'quiz_attempts');
          // Logic for finding specific participant (by name or custom ID if exists)
          const q = query(attemptsRef, where('quizSlug', '==', quizSlug), where('userName', '==', userName));
          const snapshot = await getDocs(q);
          
          if (snapshot.empty) {
              alert("Không tìm thấy dữ liệu lượt thi của thí sinh này.");
              return;
          }

          const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'quiz_attempts', d.id)));
          await Promise.all(deletePromises);
          alert("Đã reset lượt thi thành công!");
      } catch (err) {
          console.error("Reset error:", err);
          alert("Lỗi khi reset lượt thi.");
      }
  };

  const startNewQuiz = () => {
    setQuizId(null);
    setQuestions([]);
    setConfig({
      title: 'Bài thi trắc nghiệm',
      description: '',
      bannerUrl: '',
      backgroundUrl: '',
      timeLimit: 45,
      questionsCount: 40,
      isScored: true,
      hasLeaderboard: true,
      allowRetry: true,
      retryLimit: 1,
      expiryDate: '',
      participantFields: [{ label: 'Họ và Tên', key: 'userName', required: true }]
    });
    setStep(1);
    setError('');
  };

  // --- Parsing Logic ---
  const parseHtmlDocx = (htmlString, format) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    // mammoth mostly outputs <p> but sometimes lists <li>
    const elements = Array.from(doc.body.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6'));
    
    const parsedQuestions = [];
    let currentQuestion = null;

    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const text = el.textContent.trim();
        if (!text) continue;
        
        // 1. Match start of question (e.g. "Câu 1:", "Question 1:", "1.")
        if (/^(Câu\s*\d+|Question\s*\d+|\d+)\s*[:.]/i.test(text)) {
            if (currentQuestion && currentQuestion.text) {
                parsedQuestions.push(currentQuestion);
            }
            currentQuestion = {
                id: parsedQuestions.length + 1,
                text: text.replace(/^(Câu\s*\d+|Question\s*\d+|\d+)\s*[:.]\s*/i, ''),
                options: [],
                correctAnswer: ''
            };
        } 
        // 2. Match options (A. B. C. D.)
        else if (/^[A-Z]\s*[\.\)]\s*/i.test(text)) {
            if (currentQuestion) {
                const optText = text.replace(/^[A-Z]\s*[\.\)]\s*/i, '');
                const optLetter = text.match(/^[A-Z]/i)[0].toUpperCase();
                currentQuestion.options.push({ letter: optLetter, text: optText });
                
                // Check format logic
                if (format === 'bold' && (el.querySelector('strong') || el.querySelector('b'))) {
                    currentQuestion.correctAnswer = optLetter;
                } else if (format === 'italic' && (el.querySelector('em') || el.querySelector('i'))) {
                    currentQuestion.correctAnswer = optLetter;
                }
            }
        } 
        // 3. Match answer (ANSWER: X) - Specifically for Aiken format
        else if (format === 'aiken' && /^(ANSWER|ĐÁP ÁN|DAPAN|ĐÁP ÁN ĐÚNG)\s*[:\-]\s*[A-Z]/i.test(text)) {
            if (currentQuestion) {
                const ansMatch = text.match(/[A-Z]$/i);
                if (ansMatch) {
                    currentQuestion.correctAnswer = ansMatch[0].toUpperCase();
                    parsedQuestions.push(currentQuestion);
                    currentQuestion = null;
                }
            }
        } 
        // 4. Multi-line question text or skipped line
        else {
            if (currentQuestion && currentQuestion.options.length === 0) {
                // Still reading question text
                currentQuestion.text += '\n' + text;
            }
        }
    }
    
    // Push the last question
    if (currentQuestion && currentQuestion.text && !parsedQuestions.includes(currentQuestion)) {
        parsedQuestions.push(currentQuestion);
    }
    
    return parsedQuestions;
  };

  const handleManualStart = () => {
    setQuestions([]);
    setConfig(prev => ({ ...prev, questionsCount: 0 }));
    setStep(2);
    setError('');
  };

  const handleAddQuestionManual = () => {
    const newId = questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1;
    const newQ = {
      id: newId,
      text: 'Nội dung câu hỏi mới...',
      options: [
        { letter: 'A', text: 'Lựa chọn 1' },
        { letter: 'B', text: 'Lựa chọn 2' }
      ],
      correctAnswer: 'A'
    };
    setQuestions([...questions, newQ]);
    setEditingQuestion(newQ);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      setError('Vui lòng chỉ tải lên file Word (.docx)');
      return;
    }

    setError('');
    setFileName(file.name);
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      // Use convertToHtml to preserve <strong> and <b> tags for bold answers
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const htmlText = result.value;
      
      const parsed = parseHtmlDocx(htmlText, answerFormat);
      if (parsed.length === 0) {
        setError('Không tìm thấy câu hỏi nào hợp lệ. Vui lòng kiểm tra lại định dạng file Word.');
        setStep(1);
      } else {
        setQuestions(parsed);
        setConfig(prev => ({ ...prev, questionsCount: parsed.length }));
        setStep(2);
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi đọc file Word. Vui lòng thử lại.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const generateSlug = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateQuiz = async () => {
    if (!currentUser && !isAdmin) {
      setError('Vui lòng đăng nhập để lưu bài thi.');
      return;
    }

    // Check invalid questions
    const invalidCount = questions.filter(q => !q.correctAnswer || q.options.length < 2).length;
    if (invalidCount > 0) {
      setError(`Vẫn còn ${invalidCount} câu bị lỗi. Bạn cần sửa hoặc xóa chúng trước khi tạo bài thi.`);
      return;
    }

    // Validate Config
    if (config.questionsCount > questions.length) {
       setError(`Số lượng câu hỏi hiển thị (${config.questionsCount}) không được lớn hơn tổng số câu hỏi trong ngân hàng (${questions.length}).`);
       return;
    }

    setIsSaving(true);
    setError('');

    try {
      const slug = quizId ? userQuizzes.find(q => q.id === quizId).slug : generateSlug();
      const quizData = {
        slug: slug,
        creatorId: isAdmin ? 'admin' : currentUser.uid,
        creatorName: isAdmin ? 'BCT_ADMIN' : (currentUser.displayName || currentUser.email),
        config: config,
        questions: questions,
        updatedAt: serverTimestamp(),
        status: 'active'
      };

      if (quizId) {
        await updateDoc(doc(db, 'quizzes', quizId), quizData);
        setGeneratedQuiz({ id: quizId, ...quizData });
      } else {
        quizData.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, 'quizzes'), quizData);
        setGeneratedQuiz({ id: docRef.id, ...quizData });
      }
      
      setShowSuccessModal(true);
      fetchUserQuizzes();
      
    } catch (err) {
      console.error(err);
      setError('Đã xảy ra lỗi khi lưu bài thi. Vui lòng thử lại sau.');
    } finally {
      setIsSaving(false);
    }
  };

  const downloadQRCode = () => {
    const svg = document.querySelector(".qr-wrapper svg");
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = "white"; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR_${generatedQuiz.slug}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleDeleteQuestion = (id) => {
    if(window.confirm('Ngài có chắc muốn xóa câu hỏi này khỏi danh sách?')) {
        const newQs = questions.filter(q => q.id !== id);
        setQuestions(newQs);
        setConfig(prev => ({ ...prev, questionsCount: Math.min(prev.questionsCount, newQs.length) }));
    }
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    const updatedQs = questions.map(q => q.id === editingQuestion.id ? editingQuestion : q);
    setQuestions(updatedQs);
    setEditingQuestion(null);
  };

  return (
    <div className="quiz-maker-wrapper">
      <div className="container">
        
        <div className="maker-header">
          <h1 className="text-gradient">BCT QUIZ ENGINE</h1>
          <p className="subtitle">Hệ thống tạo bài thi trắc nghiệm tự động bằng AI</p>
          
          <div className="step-indicator">
            <div className={`step ${step === 0 ? 'active' : ''}`} onClick={() => setStep(0)} style={{ cursor: 'pointer' }}>
              <div className="step-num">0</div>
              <span>Quản lý</span>
            </div>
            <div className="step-line"></div>
            <div className={`step ${step >= 1 ? 'active' : ''}`}>
              <div className="step-num">1</div>
              <span>Upload Word</span>
            </div>
            <div className="step-line"></div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>
              <div className="step-num">2</div>
              <span>Kiểm tra & Sửa</span>
            </div>
            <div className="step-line"></div>
            <div className={`step ${step >= 3 ? 'active' : ''}`}>
              <div className="step-num">3</div>
              <span>Cấu hình & Tạo link</span>
            </div>
          </div>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="maker-error">
            <AlertCircle size={18} /> {error}
          </motion.div>
        )}

        {/* STEP 0: DASHBOARD */}
        {step === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-section glass-panel shadow-glow">
            <div className="dashboard-header">
              <h2><Layout size={24} className="text-gradient" /> DANH SÁCH BÀI THI</h2>
              <button onClick={startNewQuiz} className="btn-primary">+ TẠO BÀI THI MỚI</button>
            </div>

            {isLoadingQuizzes ? (
              <div className="loading-state">Đang tải danh sách...</div>
            ) : userQuizzes.length === 0 ? (
              <div className="empty-state">Chưa có bài thi nào. Bấm nút phía trên để bắt đầu!</div>
            ) : (
              <div className="quiz-table-wrapper">
                <table className="quiz-table">
                  <thead>
                    <tr>
                      <th>TIÊU ĐỀ</th>
                      <th>SLUG / LINK</th>
                      <th>NGÀY TẠO</th>
                      <th>TRẠNG THÁI</th>
                      <th>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userQuizzes.map(quiz => (
                      <tr key={quiz.id}>
                        <td>
                          <div className="quiz-title-cell">
                            <strong>{quiz.config.title}</strong>
                            <small>{quiz.questions.length} câu hỏi</small>
                          </div>
                        </td>
                        <td>
                          <div className="quiz-link-cell">
                            <code>{quiz.slug}</code>
                            <button className="copy-btn" onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/quiz/${quiz.slug}`);
                              alert("Đã copy link!");
                            }}><Check size={14}/></button>
                          </div>
                        </td>
                        <td>{quiz.createdAt?.seconds ? new Date(quiz.createdAt.seconds * 1000).toLocaleDateString('vi-VN') : '---'}</td>
                        <td>
                          <span className={`status-badge ${new Date(quiz.config.expiryDate) < new Date() && quiz.config.expiryDate ? 'expired' : 'active'}`}>
                            {new Date(quiz.config.expiryDate) < new Date() && quiz.config.expiryDate ? 'Hết hạn' : 'Đang mở'}
                          </span>
                        </td>
                        <td className="actions-cell">
                          <div className="status-controls">
                            {quiz.status === 'paused' || quiz.status === 'ended' || !quiz.status ? (
                              <button onClick={() => handleUpdateStatus(quiz.id, 'open')} className="btn-icon play" title="Bắt đầu/Tiếp tục"><Play size={16} /></button>
                            ) : (
                              <button onClick={() => handleUpdateStatus(quiz.id, 'paused')} className="btn-icon pause" title="Tạm dừng"><Pause size={16} /></button>
                            )}
                            {quiz.status !== 'ended' && (
                              <button onClick={() => handleUpdateStatus(quiz.id, 'ended')} className="btn-icon stop" title="Kết thúc (Công bố BXH)"><CircleStop size={16} /></button>
                            )}
                          </div>
                          <div className="divider"></div>
                          <button onClick={() => handleCloneQuiz(quiz)} className="btn-icon share" title="Sao chép cho người khác"><Copy size={16} /></button>
                          <button onClick={() => { setGeneratedQuiz(quiz); setShowSuccessModal(true); }} className="btn-icon qrcode" title="Mã QR"><QrCode size={16} /></button>
                          <button onClick={() => handleViewLeaderboard(quiz.slug, quiz.config.title)} className="btn-icon leaderboard" title="Bảng xếp hạng"><Trophy size={16} /></button>
                          <button onClick={() => handleEditQuiz(quiz)} className="btn-icon edit" title="Sửa"><Settings size={16} /></button>
                          <button onClick={() => handleDeleteQuizRecord(quiz.id)} className="btn-icon delete" title="Xóa"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* STEP 1: UPLOAD */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="upload-section glass-panel shadow-glow">
            
            <div className="format-selector" style={{ marginBottom: '2rem', textAlign: 'left', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
               <h3 style={{ marginBottom: '1rem', color: 'var(--accent-main)' }}>1. CHỌN ĐỊNH DẠNG ĐÁP ÁN ĐÚNG TRONG FILE WORD CỦA BẠN</h3>
               <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                 <label className="radio-btn" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '1rem', background: answerFormat === 'bold' ? 'rgba(0, 240, 255, 0.1)' : 'rgba(0,0,0,0.3)', border: `1px solid ${answerFormat === 'bold' ? 'var(--accent-main)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px', cursor: 'pointer' }}>
                   <input type="radio" name="format" value="bold" checked={answerFormat === 'bold'} onChange={(e) => setAnswerFormat(e.target.value)} style={{ width: '18px', height: '18px' }} />
                   <div>
                     <strong style={{ display: 'block' }}>In Đậm (Bold)</strong>
                     <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>VD: <strong>A. Đáp án đúng</strong></span>
                   </div>
                 </label>
                 
                 <label className="radio-btn" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '1rem', background: answerFormat === 'italic' ? 'rgba(0, 240, 255, 0.1)' : 'rgba(0,0,0,0.3)', border: `1px solid ${answerFormat === 'italic' ? 'var(--accent-main)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px', cursor: 'pointer' }}>
                   <input type="radio" name="format" value="italic" checked={answerFormat === 'italic'} onChange={(e) => setAnswerFormat(e.target.value)} style={{ width: '18px', height: '18px' }} />
                   <div>
                     <strong style={{ display: 'block' }}>In Nghiêng (Italic)</strong>
                     <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>VD: <em>B. Đáp án đúng</em></span>
                   </div>
                 </label>

                 <label className="radio-btn" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '1rem', background: answerFormat === 'aiken' ? 'rgba(0, 240, 255, 0.1)' : 'rgba(0,0,0,0.3)', border: `1px solid ${answerFormat === 'aiken' ? 'var(--accent-main)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px', cursor: 'pointer' }}>
                   <input type="radio" name="format" value="aiken" checked={answerFormat === 'aiken'} onChange={(e) => setAnswerFormat(e.target.value)} style={{ width: '18px', height: '18px' }} />
                   <div>
                     <strong style={{ display: 'block' }}>Từ khóa Aiken</strong>
                     <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>VD: ANSWER: C (Ở cuối câu)</span>
                   </div>
                 </label>
               </div>
            </div>

            <div 
              className="upload-dropzone" 
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                accept=".docx" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                style={{ display: 'none' }} 
              />
              {isProcessing ? (
                <div className="processing">
                  <div className="spinner"></div>
                  <p>Đang bóc tách dữ liệu AI...</p>
                </div>
              ) : (
                <>
                  <UploadCloud size={64} className="upload-icon text-gradient" />
                  <h2>2. BẤM HOẶC KÉO THẢ FILE <code>.docx</code> VÀO ĐÂY ĐỂ PHÂN TÍCH</h2>
                </>
              )}
            </div>

            <div className="manual-divider">
               <span>HOẶC</span>
            </div>

            <button onClick={handleManualStart} className="btn-manual-start">
               <FileText size={20} /> TẠO BÀI THI THỦ CÔNG (TỰ NHẬP CÂU HỎI)
            </button>
          </motion.div>
        )}

        {/* STEP 2: PREVIEW */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="preview-section glass-panel shadow-glow">
            <div className="preview-header">
              <div className="preview-stats">
                <h2><FileText size={24} className="text-gradient" /> TỔNG QUAN FILE TÀI LIỆU</h2>
                <div className="stats-row">
                  <span 
                    className={`stat-pill success ${filterMode === 'all' ? 'active' : ''}`} 
                    onClick={() => setFilterMode('all')}
                    style={{ cursor: 'pointer' }}
                  >
                    Tất cả: {questions.length} câu
                  </span>
                  <span 
                    className={`stat-pill warning ${filterMode === 'invalid' ? 'active' : ''}`} 
                    onClick={() => setFilterMode('invalid')}
                    style={{ cursor: 'pointer' }}
                  >
                    Câu lỗi: {questions.filter(q => !q.correctAnswer || q.options.length < 2).length}
                  </span>
                </div>
              </div>
              <div className="preview-actions">
                <button onClick={handleAddQuestionManual} className="btn-secondary" style={{ borderStyle: 'dashed' }}>+ THÊM CÂU HỎI MỚI</button>
                <button onClick={() => setStep(1)} className="btn-secondary">HỦY BỎ</button>
                <button onClick={() => {
                   const invalidCount = questions.filter(q => !q.correctAnswer || q.options.length < 2).length;
                   if (invalidCount > 0) {
                      setError(`Vui lòng sửa hoặc xóa ${invalidCount} câu bị lỗi trước khi tiếp tục!`);
                   } else {
                      setError('');
                      setStep(3);
                   }
                }} className="btn-primary">TIẾP TỤC CẤU HÌNH</button>
              </div>
            </div>

            <div className="questions-list">
              {questions
                .filter(q => {
                   if (filterMode === 'invalid') return (!q.correctAnswer || q.options.length < 2);
                   return true;
                })
                .map((q, idx) => {
                const isValid = q.correctAnswer && q.options.length >= 2;
                
                if (editingQuestion && editingQuestion.id === q.id) {
                    return (
                        <div key={q.id} className="question-card editing glass-panel">
                            <form onSubmit={handleSaveEdit}>
                                <div className="form-group">
                                    <label>Nội dung câu hỏi</label>
                                    <textarea rows="2" value={editingQuestion.text} onChange={e => setEditingQuestion({...editingQuestion, text: e.target.value})} required />
                                </div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Các lựa chọn (Tick vào đáp án đúng)</label>
                                <div className="edit-options-grid">
                                    {editingQuestion.options.map((opt, oIdx) => (
                                        <div key={oIdx} className="edit-option-row">
                                            <input 
                                                type="radio" 
                                                name="correctAnswer" 
                                                checked={editingQuestion.correctAnswer === opt.letter} 
                                                onChange={() => setEditingQuestion({...editingQuestion, correctAnswer: opt.letter})}
                                                required
                                            />
                                            <span className="opt-letter">{opt.letter}.</span>
                                            <input 
                                                type="text" 
                                                value={opt.text} 
                                                onChange={e => {
                                                    const newOpts = [...editingQuestion.options];
                                                    newOpts[oIdx].text = e.target.value;
                                                    setEditingQuestion({...editingQuestion, options: newOpts});
                                                }}
                                                required 
                                            />
                                            <button type="button" className="btn-icon delete" onClick={() => {
                                                const newOpts = editingQuestion.options.filter((_, i) => i !== oIdx);
                                                setEditingQuestion({...editingQuestion, options: newOpts});
                                            }}><X size={16}/></button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => {
                                        const nextLetter = String.fromCharCode(65 + editingQuestion.options.length); // A, B, C...
                                        setEditingQuestion({...editingQuestion, options: [...editingQuestion.options, { letter: nextLetter, text: 'Lựa chọn mới' }]})
                                    }} className="btn-secondary add-opt-btn">+ Thêm lựa chọn</button>
                                </div>
                                <div className="edit-actions" style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                    <button type="button" onClick={() => setEditingQuestion(null)} className="btn-secondary">Hủy</button>
                                    <button type="submit" className="btn-primary">Lưu Câu Hỏi</button>
                                </div>
                            </form>
                        </div>
                    );
                }

                return (
                  <div key={q.id} className={`question-card ${isValid ? '' : 'invalid'}`}>
                    <div className="q-header">
                      <strong>Câu {q.id}:</strong>
                      <div className="q-badges">
                          {!isValid && <span className="error-badge">Thiếu đáp án/lựa chọn</span>}
                          <button onClick={() => setEditingQuestion(q)} className="btn-icon edit">Sửa</button>
                          <button onClick={() => handleDeleteQuestion(q.id)} className="btn-icon delete">Xóa</button>
                      </div>
                    </div>
                    <p className="q-text">{q.text}</p>
                    <div className="q-options">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className={`q-option ${opt.letter === q.correctAnswer ? 'correct' : ''}`}>
                          <span className="opt-letter">{opt.letter}.</span> {opt.text}
                        </div>
                      ))}
                    </div>
                    {q.correctAnswer ? (
                      <div className="q-answer">Đáp án đúng: <strong>{q.correctAnswer}</strong></div>
                    ) : (
                      <div className="q-answer error">Chưa cấu hình đáp án đúng!</div>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* STEP 3: CONFIGURATION */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="config-section glass-panel shadow-glow">
            <div className="config-layout">
              {/* Left Col - Settings */}
              <div className="config-form">
                <h2><Settings size={24} className="text-gradient" /> CẤU HÌNH BÀI THI</h2>
                
                <div className="form-group">
                  <label className="contrast-label">TÊN BÀI THI (Tiêu đề)</label>
                  <input type="text" value={config.title} onChange={e => setConfig({...config, title: e.target.value})} placeholder="Ví dụ: Kiểm tra an toàn thông tin" />
                </div>
                
                <div className="form-group">
                  <label className="contrast-label">MÔ TẢ (Tùy chọn)</label>
                  <textarea rows="3" value={config.description} onChange={e => setConfig({...config, description: e.target.value})} placeholder="Lời nhắn gửi tới người làm bài..."></textarea>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="contrast-label">THỜI GIAN LÀM BÀI (Phút)</label>
                    <input type="number" min="1" value={config.timeLimit} onChange={e => setConfig({...config, timeLimit: parseInt(e.target.value)})} />
                  </div>
                  <div className="form-group">
                    <label className="contrast-label">SỐ CÂU HỎI TRONG 1 ĐỀ</label>
                    <input type="number" min="1" max={questions.length} value={config.questionsCount} onChange={e => setConfig({...config, questionsCount: parseInt(e.target.value)})} />
                    <small>Sẽ lấy ngẫu nhiên {config.questionsCount} câu từ ngân hàng {questions.length} câu.</small>
                  </div>
                </div>

                <div className="switches-container">
                  <label className="switch-wrapper">
                    <div className="switch-info">
                      <strong className="contrast-label">Hiển thị kết quả (Chấm điểm)</strong>
                      <span>Cho phép thí sinh xem câu đúng/sai sau khi nộp</span>
                    </div>
                    <input type="checkbox" checked={config.isScored} onChange={e => setConfig({...config, isScored: e.target.checked})} />
                  </label>
                  
                  <div className="config-card glass-panel">
                    <h3><Trophy size={20} color="var(--accent-main)" /> Bảng xếp hạng & Kết quả</h3>
                    <div className="checkbox-group">
                      <label><input type="checkbox" checked={config.hasLeaderboard} onChange={e => setConfig({...config, hasLeaderboard: e.target.checked})} /> Cho phép lưu kết quả và hiện bảng xếp hạng</label>
                      <label><input type="checkbox" checked={config.allowRetry} onChange={e => setConfig({...config, allowRetry: e.target.checked})} /> Cho phép làm lại bài thi</label>
                    </div>
                     {config.allowRetry && (
                       <div className="retry-limit-config">
                         <label className="contrast-label">SỐ LẦN LÀM LẠI TỐI ĐA</label>
                         <input type="number" min="1" max="100" value={config.retryLimit} onChange={e => setConfig({...config, retryLimit: parseInt(e.target.value)})} />
                       </div>
                     )}
                  </div>

                  {/* CUSTOM PARTICIPANT FIELDS */}
                  <div className="config-card glass-panel" style={{ marginTop: '1.5rem' }}>
                    <h3><User size={20} color="var(--accent-main)" /> Thông tin thí sinh (Phiếu đăng ký)</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Cấu hình các trường dữ liệu mà thí sinh cần điền trước khi vào thi.</p>
                    
                    <div className="participant-fields-list">
                        {(config.participantFields || []).map((f, i) => (
                          <div key={i} className="field-edit-row">
                             <input 
                               type="text" 
                               value={f.label} 
                               onChange={e => {
                                 const next = [...config.participantFields];
                                 next[i].label = e.target.value;
                                 setConfig({...config, participantFields: next});
                               }}
                               placeholder="Tên trường (VD: Năm sinh)"
                             />
                             <label className="req-toggle">
                               <input 
                                 type="checkbox" 
                                 checked={f.required} 
                                 onChange={e => {
                                   const next = [...config.participantFields];
                                   next[i].required = e.target.checked;
                                   setConfig({...config, participantFields: next});
                                 }}
                               /> Bắt buộc
                             </label>
                             <button onClick={() => {
                               const next = config.participantFields.filter((_, idx) => idx !== i);
                               setConfig({...config, participantFields: next});
                             }} className="btn-icon delete"><X size={14} /></button>
                          </div>
                        ))}
                        <button onClick={() => {
                          const newField = { label: 'Trường mới', key: `field_${Date.now()}`, required: true };
                          setConfig({...config, participantFields: [...(config.participantFields || []), newField]});
                        }} className="btn-secondary" style={{ width: '100%', marginTop: '0.5rem', borderStyle: 'dashed' }}>+ THÊM TRƯỜNG THÔNG TIN</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Col - Visuals */}
              <div className="config-visuals">
                <h2><ImageIcon size={24} className="text-gradient" /> HÌNH ẢNH & THỜI HẠN</h2>

                <div className="form-group deadline-group" style={{ marginBottom: '2rem' }}>
                    <label className="contrast-label">HẠN CHÓT NỘP BÀI (DEADLINE)</label>
                    <input 
                      type="datetime-local" 
                      value={config.expiryDate} 
                      onChange={e => setConfig({...config, expiryDate: e.target.value})} 
                      className="deadline-input"
                    />
                    <small className="deadline-tip">Hệ thống sẽ tự động đóng bài thi sau thời gian này.</small>
                </div>
                
                <div className="form-group">
                  <label className="contrast-label">BANNER (Logo/Hình ngang)</label>
                  <input type="text" value={config.bannerUrl} onChange={e => setConfig({...config, bannerUrl: e.target.value})} placeholder="Link ảnh Banner (PNG/JPG)" />
                  {config.bannerUrl && <img src={config.bannerUrl} alt="Banner Preview" className="img-preview banner" />}
                </div>

                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label className="contrast-label">HÌNH NỀN (Background)</label>
                  <input type="text" value={config.backgroundUrl} onChange={e => setConfig({...config, backgroundUrl: e.target.value})} placeholder="Link ảnh nền làm bài thi" />
                  {config.backgroundUrl && <img src={config.backgroundUrl} alt="BG Preview" className="img-preview bg" />}
                </div>

                <div className="config-actions">
                  <button onClick={() => setStep(2)} className="btn-secondary" disabled={isSaving}>QUAY LẠI</button>
                  <button onClick={handleCreateQuiz} className="btn-primary" disabled={isSaving}>
                     {isSaving ? 'ĐANG TẠO ĐƯỜNG DẪN...' : <><Save size={18} /> HOÀN TẤT & TẠO LINK</>}
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* LEADERBOARD MODAL */}
        <AnimatePresence>
          {showLeaderboard && (
            <div className="modal-overlay">
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="leaderboard-modal glass-panel"
              >
                <div className="modal-header">
                  <div className="header-title">
                    <h3><Trophy size={24} className="text-gradient" /> BẢNG XẾP HẠNG: {activeQuizTitle}</h3>
                    <p className="slug-info">Slug: {activeQuizSlug}</p>
                  </div>
                  <div className="header-actions">
                    <button onClick={exportToExcel} className="btn-icon-text excel" disabled={currentLeaderboard.length === 0}>
                      <Download size={18} /> XUẤT EXCEL
                    </button>
                    <button onClick={handleClearResults} className="btn-icon-text delete">
                      <Trash2 size={18} /> XÓA DỮ LIỆU
                    </button>
                    <button onClick={() => setShowLeaderboard(false)} className="close-btn"><X size={24} /></button>
                  </div>
                </div>

                <div className="modal-body">
                  {leaderboardLoading ? (
                    <div className="loading-state">Đang tải dữ liệu...</div>
                  ) : currentLeaderboard.length === 0 ? (
                    <div className="empty-state">Chưa có thí sinh nào làm bài thi này.</div>
                  ) : (
                    <div className="leaderboard-table-wrapper">
                      <table className="leaderboard-table">
                        <thead>
                          <tr>
                            <th>Hạng</th>
                            {(generatedQuiz?.config?.participantFields || [{label: 'Thí sinh'}]).map((f, i) => <th key={i}>{f.label}</th>)}
                            <th>Điểm</th>
                            <th>Ngày nộp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentLeaderboard.map((res, idx) => (
                            <tr key={res.id} className={idx < 3 ? `top-${idx+1}` : ''}>
                              <td>{idx + 1}</td>
                              <td>
                                 <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <strong>{res.userName}</strong>
                                    {res.participantData && (
                                       <small style={{ opacity: 0.6, fontSize: '0.7rem' }}>
                                          {Object.entries(res.participantData)
                                            .filter(([k]) => k !== 'userName')
                                            .map(([k, v]) => `${v}`).join(' | ')}
                                       </small>
                                    )}
                                 </div>
                              </td>
                              <td className="score-cell">{res.score}</td>
                              <td>{res.correctCount} / {res.totalCount}</td>
                              <td>{Math.floor(res.timeSpent / 60)}p {res.timeSpent % 60}s</td>
                              <td>
                                 <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    {res.submittedAt?.toDate().toLocaleString('vi-VN')}
                                    <button 
                                      onClick={() => handleResetAttempt(activeQuizSlug, res.userName, res.participantData)} 
                                      className="btn-icon reset" 
                                      title="Reset lượt thi"
                                      style={{ padding: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}
                                    >
                                       <RotateCcw size={14} />
                                    </button>
                                 </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSuccessModal && generatedQuiz && (
            <div className="quiz-success-modal-overlay" onClick={() => setShowSuccessModal(false)}>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="quiz-success-modal shadow-glow"
                onClick={e => e.stopPropagation()}
              >
                <div className="success-icon-bg">
                  <CheckCircle size={40} color="#10b981" />
                </div>
                <h2>BÀI THI ĐÃ SẴN SÀNG!</h2>
                <p>Mã tham gia: <strong style={{color: 'var(--accent-main)'}}>{generatedQuiz.slug}</strong></p>

                <div className="qr-wrapper">
                  <QRCodeSVG 
                    value={`${window.location.origin}/quiz/${generatedQuiz.slug}`} 
                    size={200}
                    level="H"
                    includeMargin={true}
                    imageSettings={{
                      src: "/logobct.png",
                      x: undefined,
                      y: undefined,
                      height: 40,
                      width: 40,
                      excavate: true,
                    }}
                  />
                </div>

                <button onClick={downloadQRCode} className="qr-download-btn">
                   <Download size={18} /> TẢI MÃ QR VỀ MÁY
                </button>

                <div className="share-link-box">
                  <input readOnly value={`${window.location.origin}/quiz/${generatedQuiz.slug}`} />
                  <button onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/quiz/${generatedQuiz.slug}`);
                    alert("Đã copy link!");
                  }}>
                    <Copy size={16} /> COPY
                  </button>
                </div>

                <div className="modal-footer-actions">
                  <button onClick={() => { setShowSuccessModal(false); setStep(0); }} className="btn-primary">QUẢN LÝ</button>
                  <button onClick={() => window.open(`/quiz/${generatedQuiz.slug}`, '_blank')} className="btn-secondary">XEM BÀI THI</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default QuizMaker;
