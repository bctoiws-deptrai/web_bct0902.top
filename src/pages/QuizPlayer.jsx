import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, CheckCircle, ChevronRight, ChevronLeft, Send, AlertCircle, Award, Layout, LogOut } from 'lucide-react';

const QuizPlayer = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    
    // Core Data
    const [quiz, setQuiz] = useState(null);
    const [gameQuestions, setGameQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isExpired, setIsExpired] = useState(false);

    // Play State
    const [gameState, setGameState] = useState('lobby'); // lobby, playing, result
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({}); // { questionId: 'A' }
    const [timeLeft, setTimeLeft] = useState(0);
    const [userName, setUserName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [finalResult, setFinalResult] = useState(null);

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                const q = query(collection(db, 'quizzes'), where('slug', '==', slug));
                const snapshot = await getDocs(q);
                if (snapshot.empty) {
                    setError('Không tìm thấy bài thi hoặc bài thi đã bị xóa!');
                } else {
                    const data = snapshot.docs[0].data();
                    setQuiz(data);
                    
                    // Check Deadline
                    if (data.config.expiryDate) {
                        const now = new Date();
                        const expiry = new Date(data.config.expiryDate);
                        if (now > expiry) {
                            setIsExpired(true);
                        }
                    }
                }
            } catch (err) {
                console.error(err);
                setError('Lỗi kết nối máy chủ!');
            } finally {
                setLoading(false);
            }
        };
        fetchQuiz();
    }, [slug]);

    // Timer Logic
    useEffect(() => {
        let timer;
        if (gameState === 'playing' && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        handleFinish();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [gameState, timeLeft]);

    const handleStart = () => {
        if (quiz.config.hasLeaderboard && !userName.trim()) {
            alert("Vui lòng nhập tên của bạn để bắt đầu!");
            return;
        }

        // Shuffle and limit questions
        const all = [...quiz.questions];
        const shuffled = all.sort(() => 0.5 - Math.random()).slice(0, quiz.config.questionsCount);
        
        setGameQuestions(shuffled);
        setTimeLeft(quiz.config.timeLimit * 60);
        setGameState('playing');
    };

    const handleSelect = (questionId, letter) => {
        setUserAnswers(prev => ({ ...prev, [questionId]: letter }));
    };

    const handleFinish = async () => {
        if (gameState === 'result') return;
        setIsSubmitting(true);

        // Calculate Score
        let correctCount = 0;
        gameQuestions.forEach(q => {
            if (userAnswers[q.id] === q.correctAnswer) {
                correctCount++;
            }
        });

        const score = ((correctCount / gameQuestions.length) * 10).toFixed(2);
        const resultData = {
            quizSlug: slug,
            quizTitle: quiz.config.title,
            userName: userName || 'Ẩn danh',
            score: parseFloat(score),
            correctCount,
            totalCount: gameQuestions.length,
            timeSpent: quiz.config.timeLimit * 60 - timeLeft,
            submittedAt: serverTimestamp()
        };

        try {
            if (quiz.config.hasLeaderboard) {
                await addDoc(collection(db, 'quiz_results'), resultData);
            }
            setFinalResult(resultData);
            setGameState('result');
        } catch (err) {
            console.error("Error saving result:", err);
            setFinalResult(resultData);
            setGameState('result');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (loading) return <div className="quiz-loader">Đang chuẩn bị phòng thi...</div>;
    
    if (error) return (
        <div className="quiz-error-page">
            <AlertCircle size={48} color="#ef4444" />
            <h2>{error}</h2>
            <button onClick={() => navigate('/')} className="btn-secondary">Quay lại trang chủ</button>
        </div>
    );

    return (
        <div className="quiz-player-container" style={{ backgroundImage: quiz.config.backgroundUrl ? `url(${quiz.config.backgroundUrl})` : 'none' }}>
            <div className="quiz-overlay"></div>
            
            <AnimatePresence mode="wait">
                {/* LOBBY */}
                {gameState === 'lobby' && (
                    <motion.div 
                        key="lobby"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        className="quiz-lobby glass-panel"
                    >
                        {quiz.config.bannerUrl && (
                            <img src={quiz.config.bannerUrl} alt="Banner" className="lobby-banner" />
                        )}
                        <h1 className="text-gradient">{quiz.config.title}</h1>
                        <p className="description">{quiz.config.description}</p>
                        
                        <div className="lobby-info-grid">
                            <div className="info-item">
                                <Timer size={20} />
                                <span>{quiz.config.timeLimit} Phút</span>
                            </div>
                            <div className="info-item">
                                <Award size={20} />
                                <span>{quiz.config.questionsCount} Câu hỏi</span>
                            </div>
                            <div className="info-item">
                                <Award size={20} />
                                <span>{quiz.config.isScored ? 'Có tính điểm' : 'Khảo sát'}</span>
                            </div>
                        </div>

                        {quiz.config.hasLeaderboard && (
                            <div className="name-input-group">
                                <label>NHẬP TÊN CỦA BẠN ĐỂ BẮT ĐẦU</label>
                                <input 
                                    type="text" 
                                    placeholder="Họ và tên..." 
                                    value={userName} 
                                    onChange={e => setUserName(e.target.value)}
                                    maxLength={30}
                                />
                            </div>
                        )}

                        <div className="lobby-actions">
                            {isExpired ? (
                                <div className="expiry-notice">
                                    <AlertCircle size={18} /> Bài thi này đã đóng!
                                </div>
                            ) : (
                                <button onClick={handleStart} className="btn-start shadow-glow">
                                    BẮT ĐẦU LÀM BÀI
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* PLAYING */}
                {gameState === 'playing' && (
                    <motion.div 
                        key="playing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="quiz-play-area"
                    >
                        <header className="play-header glass-panel">
                            <div className="header-left">
                                <h3>{quiz.config.title}</h3>
                                <div className="progress-bar">
                                    <div 
                                        className="progress-fill" 
                                        style={{ width: `${((Object.keys(userAnswers).length) / gameQuestions.length) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                            <div className="header-right">
                                <div className={`timer-display ${timeLeft < 60 ? 'warning' : ''}`}>
                                    <Timer size={20} />
                                    <span>{formatTime(timeLeft)}</span>
                                </div>
                                <button onClick={() => {if(window.confirm('Nộp bài ngay?')) handleFinish()}} className="btn-submit-header">NỘP BÀI</button>
                            </div>
                        </header>

                        <div className="play-content">
                            <div className="question-navigation glass-panel">
                                <h4>CÂU HỎI</h4>
                                <div className="nav-grid">
                                    {gameQuestions.map((q, idx) => (
                                        <button 
                                            key={idx}
                                            className={`nav-item ${currentIndex === idx ? 'active' : ''} ${userAnswers[q.id] ? 'answered' : ''}`}
                                            onClick={() => setCurrentIndex(idx)}
                                        >
                                            {idx + 1}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="question-display glass-panel">
                                <motion.div 
                                    key={currentIndex}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="q-container"
                                >
                                    <span className="q-number">Câu {currentIndex + 1} / {gameQuestions.length}</span>
                                    <h2 className="q-text">{gameQuestions[currentIndex].text}</h2>
                                    
                                    <div className="options-list">
                                        {gameQuestions[currentIndex].options.map((opt, idx) => (
                                            <button 
                                                key={idx}
                                                className={`option-btn ${userAnswers[gameQuestions[currentIndex].id] === opt.letter ? 'selected' : ''}`}
                                                onClick={() => handleSelect(gameQuestions[currentIndex].id, opt.letter)}
                                            >
                                                <span className="opt-letter">{opt.letter}</span>
                                                <span className="opt-text">{opt.text}</span>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>

                                <div className="q-actions">
                                    <button 
                                        disabled={currentIndex === 0}
                                        onClick={() => setCurrentIndex(prev => prev - 1)}
                                        className="btn-nav"
                                    >
                                        <ChevronLeft size={20} /> Trước đó
                                    </button>
                                    
                                    {currentIndex === gameQuestions.length - 1 ? (
                                        <button onClick={handleFinish} className="btn-finish" disabled={isSubmitting}>
                                            {isSubmitting ? 'ĐANG NỘP...' : <><Send size={18} /> HOÀN THÀNH</>}
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => setCurrentIndex(prev => prev + 1)}
                                            className="btn-nav"
                                        >
                                            Kế tiếp <ChevronRight size={20} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* RESULT */}
                {gameState === 'result' && (
                    <motion.div 
                        key="result"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="quiz-result-card glass-panel"
                    >
                        <Award size={64} className="award-icon text-gradient" />
                        <h2>KẾT QUẢ CỦA BẠN</h2>
                        <h1 className="score-display">{finalResult.score} / 10</h1>
                        
                        <div className="result-stats">
                            <div className="res-stat">
                                <CheckCircle size={20} color="#10b981" />
                                <span>{finalResult.correctCount} câu đúng</span>
                            </div>
                            <div className="res-stat">
                                <AlertCircle size={20} color="#ef4444" />
                                <span>{finalResult.totalCount - finalResult.correctCount} câu sai</span>
                            </div>
                        </div>

                        <p className="congrats-text">
                            Chúc mừng <strong>{finalResult.userName}</strong> đã hoàn thành bài thi!
                        </p>

                        <div className="result-actions">
                            <button onClick={() => window.location.reload()} className="btn-secondary">Làm lại bài</button>
                            <button onClick={() => navigate('/')} className="btn-primary">Quay lại trang chủ</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .quiz-player-container {
                    min-height: 100vh;
                    background-color: #050505;
                    background-size: cover;
                    background-position: center;
                    display: flex;
                    justify-content: center;
                    align-items: flex-start; /* Change from center to flex-start */
                    padding: 8rem 2rem 4rem; /* Increase top padding to avoid navbar overlap */
                    position: relative;
                    font-family: 'Inter', sans-serif;
                }
                .quiz-overlay {
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(circle at center, rgba(0, 240, 255, 0.05) 0%, rgba(0,0,0,0.9) 100%);
                    z-index: 1;
                }
                .glass-panel {
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 20px;
                    position: relative;
                    z-index: 2;
                }
                .quiz-lobby {
                    max-width: 600px;
                    width: 100%;
                    padding: 3rem;
                    text-align: center;
                }
                .lobby-banner {
                    width: 100%;
                    height: 180px;
                    object-fit: cover;
                    border-radius: 12px;
                    margin-bottom: 2rem;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .text-gradient {
                    background: linear-gradient(45deg, #00f0ff, #7000ff);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    font-size: 2.5rem;
                    font-weight: 800;
                    margin-bottom: 1rem;
                }
                .lobby-info-grid {
                    display: flex;
                    justify-content: center;
                    gap: 1.5rem;
                    margin: 2rem 0;
                }
                .info-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5rem;
                    color: #fff;
                    font-size: 0.9rem;
                }
                .info-item svg { color: var(--accent-main); }
                .name-input-group {
                    text-align: left;
                    margin-bottom: 2rem;
                }
                .name-input-group label {
                    display: block;
                    font-size: 0.75rem;
                    font-weight: bold;
                    color: var(--text-muted);
                    margin-bottom: 0.8rem;
                    letter-spacing: 1px;
                }
                .name-input-group input {
                    width: 100%;
                    background: rgba(0,0,0,0.3);
                    border: 1px solid rgba(255,255,255,0.1);
                    padding: 1rem;
                    border-radius: 8px;
                    color: #fff;
                    font-size: 1.1rem;
                    outline: none;
                }
                .btn-start {
                    width: 100%;
                    background: var(--accent-main);
                    color: #000;
                    padding: 1.2rem;
                    border-radius: 12px;
                    font-weight: bold;
                    font-size: 1.1rem;
                    border: none;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                .btn-start:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0, 240, 255, 0.3); }
                
                .quiz-play-area {
                    width: 100%;
                    max-width: 1200px;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    position: relative;
                    z-index: 2;
                }
                .play-header {
                    padding: 1.5rem 2.5rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                    z-index: 10;
                }
                .progress-bar {
                    width: 250px;
                    height: 6px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 3px;
                    margin-top: 0.5rem;
                    overflow: hidden;
                }
                .progress-fill {
                    height: 100%;
                    background: var(--accent-main);
                    transition: width 0.3s;
                }
                .timer-display {
                    display: flex;
                    align-items: center;
                    gap: 0.8rem;
                    font-size: 1.5rem;
                    font-family: 'Courier New', monospace;
                    font-weight: bold;
                    color: var(--accent-main);
                }
                .timer-display.warning { color: #ef4444; animation: blink 1s infinite; }
                @keyframes blink { 50% { opacity: 0.5; } }
                
                .btn-submit-header {
                    background: #ef4444;
                    color: #fff;
                    border: none;
                    padding: 0.6rem 1.5rem;
                    border-radius: 6px;
                    font-weight: bold;
                    cursor: pointer;
                }

                .play-content {
                    display: grid;
                    grid-template-columns: 300px 1fr;
                    gap: 1.5rem;
                }
                .nav-grid {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 0.5rem;
                    margin-top: 1rem;
                }
                .nav-item {
                    width: 40px;
                    height: 40px;
                    border-radius: 8px;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: #fff;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .nav-item.active { border-color: var(--accent-main); background: rgba(0, 240, 255, 0.1); }
                .nav-item.answered { background: var(--accent-main); color: #000; }
                
                .question-display {
                    padding: 3rem;
                    min-height: 400px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }
                .q-number { color: var(--accent-main); font-weight: bold; font-size: 0.9rem; }
                .q-text { font-size: 1.8rem; margin: 1.5rem 0 2.5rem; line-height: 1.4; }
                .options-list {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.2rem;
                }
                .option-btn {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    padding: 1.2rem;
                    border-radius: 12px;
                    color: #fff;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    cursor: pointer;
                    text-align: left;
                    transition: all 0.2s;
                }
                .option-btn:hover { background: rgba(255,255,255,0.1); }
                .option-btn.selected { background: rgba(0, 240, 255, 0.1); border-color: var(--accent-main); }
                .opt-letter {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                }
                .option-btn.selected .opt-letter { background: var(--accent-main); color: #000; }
                
                .q-actions {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 3rem;
                }
                .btn-nav {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: transparent;
                    border: 1px solid rgba(255,255,255,0.2);
                    color: #fff;
                    padding: 0.8rem 1.5rem;
                    border-radius: 8px;
                    cursor: pointer;
                }
                .btn-finish {
                    background: var(--accent-main);
                    color: #000;
                    padding: 0.8rem 2.5rem;
                    border-radius: 8px;
                    font-weight: bold;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .quiz-result-card {
                    max-width: 500px;
                    width: 100%;
                    padding: 4rem;
                    text-align: center;
                }
                .score-display {
                    font-size: 4rem;
                    margin: 1rem 0;
                    color: var(--accent-main);
                }
                .result-stats {
                    display: flex;
                    justify-content: center;
                    gap: 2rem;
                    margin: 2rem 0;
                }
                .res-stat { display: flex; align-items: center; gap: 0.5rem; }
                .result-actions { display: flex; gap: 1rem; margin-top: 2.5rem; }
            `}</style>
        </div>
    );
};

export default QuizPlayer;
