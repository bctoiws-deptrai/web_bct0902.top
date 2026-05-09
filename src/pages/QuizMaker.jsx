import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, CheckCircle, AlertCircle, Settings, Layout, Image as ImageIcon, Check, Save, X } from 'lucide-react';
import mammoth from 'mammoth';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
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
    expiryDate: '' // New: Deadline
  });

  const [isSaving, setIsSaving] = useState(false);

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
      expiryDate: ''
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
        alert(`Cập nhật bài thi thành công!`);
      } else {
        quizData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'quizzes'), quizData);
        alert(`Khởi tạo bài thi thành công! Link tham gia: ${window.location.origin}/quiz/${slug}`);
      }
      
      fetchUserQuizzes();
      setStep(0); // Back to dashboard
      
    } catch (err) {
      console.error(err);
      setError('Đã xảy ra lỗi khi lưu bài thi. Vui lòng thử lại sau.');
    } finally {
      setIsSaving(false);
    }
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
                          <button onClick={() => handleEditQuiz(quiz)} className="btn-icon edit">Sửa</button>
                          <button onClick={() => handleDeleteQuizRecord(quiz.id)} className="btn-icon delete">Xóa</button>
                          <button onClick={() => window.open(`/quiz/${quiz.slug}`, '_blank')} className="btn-icon view">Xem</button>
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
                  
                  <label className="switch-wrapper">
                    <div className="switch-info">
                      <strong className="contrast-label">Bảng xếp hạng (Leaderboard)</strong>
                      <span>Yêu cầu nhập Tên và hiển thị trang xếp hạng chung</span>
                    </div>
                    <input type="checkbox" checked={config.hasLeaderboard} onChange={e => setConfig({...config, hasLeaderboard: e.target.checked})} />
                  </label>
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

      </div>
    </div>
  );
};

export default QuizMaker;
