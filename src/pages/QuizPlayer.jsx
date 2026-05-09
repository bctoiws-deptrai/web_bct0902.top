import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, CheckCircle, ChevronRight, ChevronLeft, Send, AlertCircle, Award, Layout, LogOut, Trophy } from 'lucide-react';

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
    const [participantData, setParticipantData] = useState({}); // Dynamic fields
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [finalResult, setFinalResult] = useState(null);
    const [attempts, setAttempts] = useState(0);
    const [leaderboard, setLeaderboard] = useState([]);
    const [leaderboardLoading, setLeaderboardLoading] = useState(false);

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                const q = query(collection(db, 'quizzes'), where('slug', '==', slug));
                const snapshot = await getDocs(q);
                if (snapshot.empty) {
                    setError('Không tìm thấy bài thi hoặc bài thi đã bị xóa!');
                } else {
                    const data = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
                    setQuiz(data);
                    
                    if (data.status === 'ended') {
                        fetchPublicLeaderboard(data.slug);
                    }

                    const savedAttempts = parseInt(localStorage.getItem(`quiz_attempts_${slug}`)) || 0;
                    setAttempts(savedAttempts);
                    
                    if (data.config.expiryDate) {
                        const now = new Date();
                        const expiry = new Date(data.config.expiryDate);
                        if (now > expiry) {
                            setIsExpired(true);
                        }
                    }

                    // Initialize participant data based on config
                    if (data.config.participantFields) {
                        const initialData = {};
                        data.config.participantFields.forEach(f => {
                            initialData[f.key] = '';
                        });
                        setParticipantData(initialData);
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

    const fetchPublicLeaderboard = async (quizSlug) => {
        setLeaderboardLoading(true);
        try {
            const resultsRef = collection(db, 'quiz_results');
            const q = query(resultsRef, where('quizSlug', '==', quizSlug));
            const snapshot = await getDocs(q);
            const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            results.sort((a, b) => b.score - a.score || a.timeSpent - b.timeSpent);
            setLeaderboard(results);
        } catch (err) {
            console.error("Error fetching public leaderboard:", err);
        } finally {
            setLeaderboardLoading(false);
        }
    };

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
        if (quiz.config.hasLeaderboard) {
            const missing = quiz.config.participantFields.find(f => f.required && !participantData[f.key]?.trim());
            if (missing) {
                alert(`Vui lòng nhập ${missing.label} để bắt đầu!`);
                return;
            }
        }

        const all = [...quiz.questions];
        const shuffled = all.sort(() => 0.5 - Math.random()).slice(0, quiz.config.questionsCount);
        
        const newAttemptCount = attempts + 1;
        setAttempts(newAttemptCount);
        localStorage.setItem(`quiz_attempts_${slug}`, newAttemptCount.toString());

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
            userName: participantData.userName || 'Thí sinh',
            participantData: participantData,
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

    return (
        <div className="quiz-player-container light-mode" style={{ 
            backgroundImage: (quiz && quiz.config.backgroundUrl) ? `url(${quiz.config.backgroundUrl})` : 'none' 
        }}>
            <div className="quiz-overlay-light"></div>
            
            {loading ? (
                <div className="quiz-loader-visible">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2 }}>
                        <Timer size={48} color="#2563eb" />
                    </motion.div>
                    <p>Đang chuẩn bị phòng thi...</p>
                </div>
            ) : error ? (
                <div className="quiz-error-page">
                    <AlertCircle size={48} color="#dc2626" />
                    <h2 style={{ color: '#1f2937' }}>{error}</h2>
                    <button onClick={() => navigate('/')} className="btn-secondary-light">Quay lại trang chủ</button>
                </div>
            ) : !quiz ? (
                <div className="quiz-error-page">
                    <AlertCircle size={48} color="#dc2626" />
                    <h2 style={{ color: '#1f2937' }}>Không thể tải dữ liệu bài thi.</h2>
                    <button onClick={() => navigate('/')} className="btn-secondary-light">Quay lại trang chủ</button>
                </div>
            ) : (
                <AnimatePresence mode="wait">
                    {quiz.status === 'paused' && (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="quiz-lobby glass-panel-light">
                            <AlertCircle size={64} color="#f59e0b" />
                            <h1>BÀI THI ĐANG TẠM DỪNG</h1>
                            <p className="description-light">Hệ thống đang tạm dừng để chỉnh sửa hoặc cập nhật. Vui lòng quay lại sau.</p>
                            <div className="lobby-actions" style={{ marginTop: '2rem' }}>
                                <button onClick={() => navigate('/')} className="btn-secondary-light">Quay lại trang chủ</button>
                            </div>
                        </motion.div>
                    )}

                    {quiz.status === 'ended' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="public-leaderboard-container">
                            <div className="leaderboard-intro glass-panel-light">
                                <Trophy size={64} color="#f59e0b" />
                                <h1 className="text-highlight">KẾT QUẢ CHUNG CUỘC</h1>
                                <h2 style={{ color: '#1f2937' }}>{quiz.config.title}</h2>
                                <p style={{ color: '#4b5563' }}>Bài thi đã kết thúc. Cảm ơn tất cả các thí sinh đã tham gia!</p>
                            </div>

                            {leaderboardLoading ? (
                                <div className="loading-state">Đang tổng hợp kết quả...</div>
                            ) : (
                                <div className="results-grid">
                                    <div className="top-podium-light">
                                        {leaderboard.slice(0, 3).map((res, idx) => (
                                            <motion.div 
                                                key={res.id}
                                                initial={{ opacity: 0, y: 30 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.2 }}
                                                className={`podium-item-light rank-${idx + 1}`}
                                            >
                                                <div className="rank-badge-light">{idx + 1}</div>
                                                <div className="podium-avatar-light">{res.userName.charAt(0).toUpperCase()}</div>
                                                <div className="podium-name-light">{res.userName}</div>
                                                <div className="podium-score-light">{res.score}</div>
                                            </motion.div>
                                        ))}
                                    </div>

                                    <div className="other-ranks glass-panel-light">
                                        {leaderboard.slice(3).map((res, idx) => (
                                            <div key={res.id} className="rank-row-light">
                                                <span className="row-rank">{idx + 4}</span>
                                                <span className="row-name">{res.userName}</span>
                                                <span className="row-score">{res.score} đ</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                                <button onClick={() => navigate('/')} className="btn-secondary-light">Quay lại trang chủ</button>
                            </div>
                        </motion.div>
                    )}

                    {(!quiz.status || quiz.status === 'open' || quiz.status === 'active') && gameState === 'lobby' && (
                        <motion.div key="lobby" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="quiz-lobby glass-panel-light">
                            {quiz.config.bannerUrl && <img src={quiz.config.bannerUrl} alt="Banner" className="lobby-banner-light" />}
                            <h1 className="title-light">{quiz.config.title}</h1>
                            <p className="description-light">{quiz.config.description}</p>
                            
                            <div className="lobby-info-grid-light">
                                <div className="info-item-light"><Timer size={24} /><strong>{quiz.config.timeLimit} Phút</strong></div>
                                <div className="info-item-light"><Award size={24} /><strong>{quiz.config.questionsCount} Câu hỏi</strong></div>
                            </div>

                            {quiz.config.hasLeaderboard && (
                                <div className="dynamic-form-light">
                                    {(quiz.config.participantFields || []).map((field, idx) => (
                                        <div key={idx} className="name-input-group-light">
                                            <label>{field.label.toUpperCase()} {field.required && <span style={{color: '#dc2626'}}>*</span>}</label>
                                            <input 
                                                type="text" 
                                                placeholder={`Nhập ${field.label.toLowerCase()}`}
                                                value={participantData[field.key] || ''} 
                                                onChange={e => setParticipantData({...participantData, [field.key]: e.target.value})} 
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="lobby-actions">
                                {isExpired ? (
                                    <div className="expiry-notice-light"><AlertCircle size={20} /> Bài thi đã đóng (Hết hạn)!</div>
                                ) : (attempts >= (quiz.config.retryLimit || 1) && quiz.config.allowRetry) ? (
                                    <div className="expiry-notice-light"><AlertCircle size={20} /> Bạn đã hết lượt làm bài!</div>
                                ) : (
                                    <button onClick={handleStart} className="btn-start-light shadow-standard">BẮT ĐẦU LÀM BÀI</button>
                                )}
                                {attempts > 0 && <p className="attempts-hint">Số lần đã làm: {attempts} / {quiz.config.retryLimit || 1}</p>}
                            </div>
                        </motion.div>
                    )}

                    {gameState === 'playing' && (
                        <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="quiz-play-area-light fullscreen-play">
                            <header className="play-header-light glass-panel-light">
                                <div className="header-left">
                                    <h3>{quiz.config.title}</h3>
                                    <div className="progress-bar-light"><div className="progress-fill-light" style={{ width: `${((Object.keys(userAnswers).length) / gameQuestions.length) * 100}%` }}></div></div>
                                </div>
                                <div className="header-right">
                                    <div className={`timer-light ${timeLeft < 60 ? 'urgent' : ''}`}><Timer size={24} /><span>{formatTime(timeLeft)}</span></div>
                                    <button onClick={() => {if(window.confirm('Xác nhận nộp bài?')) handleFinish()}} className="btn-submit-light">NỘP BÀI</button>
                                </div>
                            </header>

                            <div className="play-content-light">
                                <div className="question-navigation-light glass-panel-light">
                                    <h4>DANH SÁCH CÂU HỎI</h4>
                                    <div className="nav-grid-light">
                                        {gameQuestions.map((q, idx) => (
                                            <button key={idx} className={`nav-item-light ${currentIndex === idx ? 'active' : ''} ${userAnswers[q.id] ? 'answered' : ''}`} onClick={() => setCurrentIndex(idx)}>{idx + 1}</button>
                                        ))}
                                    </div>
                                </div>

                                <div className="question-display-light glass-panel-light">
                                    <motion.div key={currentIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="q-container-light">
                                        <span className="q-number-light">Câu {currentIndex + 1} / {gameQuestions.length}</span>
                                        <h2 className="q-text-light">{gameQuestions[currentIndex].text}</h2>
                                        <div className="options-grid-light">
                                            {gameQuestions[currentIndex].options.map((opt, idx) => (
                                                <button key={idx} className={`option-card-light ${userAnswers[gameQuestions[currentIndex].id] === opt.letter ? 'selected' : ''}`} onClick={() => handleSelect(gameQuestions[currentIndex].id, opt.letter)}>
                                                    <span className="opt-letter-light">{opt.letter}</span>
                                                    <span className="opt-text-light">{opt.text}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>

                                    <div className="q-actions-light">
                                        <button disabled={currentIndex === 0} onClick={() => setCurrentIndex(prev => prev - 1)} className="btn-nav-light"><ChevronLeft /> CÂU TRƯỚC</button>
                                        {currentIndex === gameQuestions.length - 1 ? (
                                            <button onClick={handleFinish} className="btn-finish-light" disabled={isSubmitting}>{isSubmitting ? 'ĐANG NỘP...' : 'HOÀN THÀNH'}</button>
                                        ) : (
                                            <button onClick={() => setCurrentIndex(prev => prev + 1)} className="btn-nav-light">CÂU TIẾP <ChevronRight /></button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {gameState === 'result' && (
                        <motion.div key="result" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="quiz-result-light glass-panel-light">
                            <Award size={80} color="#f59e0b" />
                            <h2 style={{ color: '#1f2937', marginTop: '1.5rem' }}>KẾT QUẢ BÀI THI</h2>
                            <h1 className="score-light">{finalResult.score} / 10</h1>
                            <div className="result-stats-light">
                                <div className="stat-box-light success"><strong>{finalResult.correctCount}</strong> <span>CÂU ĐÚNG</span></div>
                                <div className="stat-box-light error"><strong>{finalResult.totalCount - finalResult.correctCount}</strong> <span>CÂU SAI</span></div>
                            </div>
                            <p className="congrats-light">Thí sinh <strong>{finalResult.userName}</strong> đã hoàn thành bài kiểm tra!</p>
                            <div className="result-actions-light">
                                {attempts < (quiz.config.retryLimit || 1) ? (
                                    <button onClick={() => window.location.reload()} className="btn-secondary-light">THI LẠI ({quiz.config.retryLimit - attempts})</button>
                                ) : <span className="no-retry-badge-light">HẾT LƯỢT THI LẠI</span>}
                                <button onClick={() => navigate('/')} className="btn-primary-light">TRANG CHỦ</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}

            <style>{`
                .quiz-player-container.light-mode {
                    min-height: 100vh;
                    background-color: #f3f4f6;
                    color: #1f2937;
                    display: flex;
                    justify-content: center;
                    align-items: flex-start;
                    padding: 6rem 1rem 4rem;
                    position: relative;
                }
                .quiz-overlay-light {
                    position: absolute;
                    inset: 0;
                    background: rgba(255, 255, 255, 0.85);
                    z-index: 1;
                }
                .glass-panel-light {
                    background: #fff;
                    border: 1px solid #e5e7eb;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                    border-radius: 16px;
                    position: relative;
                    z-index: 2;
                }
                .quiz-lobby {
                    max-width: 600px;
                    width: 100%;
                    padding: 2.5rem;
                    text-align: center;
                }
                .title-light { font-size: 2.2rem; font-weight: 800; color: #111827; margin: 1.5rem 0 1rem; }
                .description-light { color: #4b5563; line-height: 1.6; margin-bottom: 2rem; }
                .lobby-info-grid-light { display: flex; justify-content: center; gap: 2rem; margin-bottom: 2.5rem; }
                .info-item-light { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; color: #1f2937; }
                .dynamic-form-light { text-align: left; margin-bottom: 2rem; display: flex; flex-direction: column; gap: 1rem; }
                .name-input-group-light { text-align: left; }
                .name-input-group-light label { font-size: 0.85rem; font-weight: 700; color: #374151; margin-bottom: 0.5rem; display: block; }
                .name-input-group-light input { width: 100%; padding: 1rem; border-radius: 12px; border: 2px solid #e5e7eb; font-size: 1.1rem; outline: none; }
                .name-input-group-light input:focus { border-color: #2563eb; }
                .btn-start-light { width: 100%; background: #2563eb; color: #fff; padding: 1.2rem; border-radius: 12px; font-weight: 800; border: none; font-size: 1.2rem; cursor: pointer; }
                
                .quiz-play-area-light { width: 100%; max-width: 1200px; z-index: 2; display: flex; flex-direction: column; gap: 1.5rem; transition: all 0.3s; }
                .quiz-play-area-light.fullscreen-play { max-width: 98vw; }
                .play-header-light { padding: 1.5rem 2rem; display: flex; justify-content: space-between; align-items: center; }
                .progress-bar-light { width: 300px; height: 10px; background: #e5e7eb; border-radius: 5px; overflow: hidden; margin-top: 0.5rem; }
                .progress-fill-light { height: 100%; background: #2563eb; }
                .timer-light { display: flex; align-items: center; gap: 0.8rem; font-size: 1.8rem; font-weight: 900; color: #2563eb; }
                .timer-light.urgent { color: #dc2626; animation: pulse 1s infinite; }
                @keyframes pulse { 50% { opacity: 0.6; } }
                .btn-submit-light { background: #dc2626; color: #fff; padding: 0.8rem 2rem; border-radius: 8px; font-weight: 800; border: none; cursor: pointer; }

                .play-content-light { display: grid; grid-template-columns: 320px 1fr; gap: 1.5rem; }
                .nav-grid-light { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.6rem; margin-top: 1rem; }
                .nav-item-light { width: 100%; aspect-ratio: 1; border-radius: 8px; border: 2px solid #e5e7eb; background: #fff; font-weight: 700; cursor: pointer; }
                .nav-item-light.active { border-color: #2563eb; color: #2563eb; background: #eff6ff; }
                .nav-item-light.answered { background: #2563eb; color: #fff; border-color: #2563eb; }

                .question-display-light { padding: 3rem; min-height: 500px; display: flex; flex-direction: column; justify-content: space-between; }
                .q-number-light { color: #2563eb; font-weight: 800; letter-spacing: 1px; }
                .q-text-light { font-size: 2rem; color: #111827; margin: 1.5rem 0 3rem; line-height: 1.4; }
                .options-grid-light { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
                .option-card-light { background: #f9fafb; border: 2px solid #e5e7eb; padding: 1.5rem; border-radius: 12px; text-align: left; cursor: pointer; display: flex; gap: 1rem; align-items: center; }
                .option-card-light:hover { background: #f3f4f6; }
                .option-card-light.selected { border-color: #2563eb; background: #eff6ff; }
                .opt-letter-light { width: 40px; height: 40px; background: #e5e7eb; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; }
                .option-card-light.selected .opt-letter-light { background: #2563eb; color: #fff; }
                .opt-text-light { font-size: 1.1rem; font-weight: 500; }

                .q-actions-light { display: flex; justify-content: space-between; margin-top: 4rem; }
                .btn-nav-light { display: flex; align-items: center; gap: 0.5rem; padding: 1rem 2rem; border: 2px solid #e5e7eb; border-radius: 12px; font-weight: 700; cursor: pointer; background: #fff; }
                .btn-finish-light { background: #2563eb; color: #fff; padding: 1rem 3rem; border-radius: 12px; font-weight: 800; border: none; cursor: pointer; }

                .quiz-result-light { max-width: 600px; width: 100%; padding: 4rem; text-align: center; }
                .score-light { font-size: 5rem; font-weight: 900; color: #2563eb; margin: 1.5rem 0; }
                .result-stats-light { display: flex; justify-content: center; gap: 2rem; margin-bottom: 2rem; }
                .stat-box-light { padding: 1rem 2rem; border-radius: 12px; display: flex; flex-direction: column; }
                .stat-box-light.success { background: #dcfce7; color: #166534; }
                .stat-box-light.error { background: #fee2e2; color: #991b1b; }
                .result-actions-light { display: flex; gap: 1rem; justify-content: center; margin-top: 3rem; }
                .btn-primary-light { background: #2563eb; color: #fff; padding: 1rem 2.5rem; border-radius: 12px; border: none; font-weight: 800; cursor: pointer; }
                .btn-secondary-light { background: #fff; color: #374151; padding: 1rem 2.5rem; border-radius: 12px; border: 2px solid #e5e7eb; font-weight: 800; cursor: pointer; }

                .public-leaderboard-container { width: 100%; max-width: 1000px; z-index: 2; display: flex; flex-direction: column; gap: 2rem; }
                .top-podium-light { display: flex; justify-content: center; align-items: flex-end; gap: 2rem; margin-bottom: 2rem; padding: 2rem; }
                .podium-item-light { display: flex; flex-direction: column; align-items: center; position: relative; padding: 2rem; background: #fff; border: 2px solid #e5e7eb; border-radius: 24px; width: 220px; }
                .rank-1 { order: 2; transform: scale(1.15); border-color: #fbbf24; background: #fffbeb; }
                .rank-badge-light { position: absolute; top: -15px; width: 40px; height: 40px; border-radius: 50%; background: #2563eb; color: #fff; font-weight: 900; display: flex; align-items: center; justify-content: center; }
                .rank-1 .rank-badge-light { background: #fbbf24; }
                .podium-avatar-light { width: 70px; height: 70px; background: #f3f4f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 800; margin-bottom: 1rem; }
                .podium-name-light { font-weight: 800; color: #1f2937; margin-bottom: 0.5rem; }
                .podium-score-light { font-size: 2.5rem; font-weight: 900; color: #2563eb; }
                .rank-row-light { display: grid; grid-template-columns: 60px 1fr 100px; padding: 1.2rem 2rem; border-bottom: 1px solid #f3f4f6; align-items: center; }
                .row-rank { color: #6b7280; font-weight: bold; }
                .row-name { font-weight: 500; color: #1f2937; }
                .row-score { text-align: right; color: #2563eb; font-weight: 800; }

                .quiz-loader-visible {
                    position: relative;
                    z-index: 2;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1rem;
                    color: #1f2937;
                    font-weight: 600;
                }
            `}</style>
        </div>
    );
};

export default QuizPlayer;
