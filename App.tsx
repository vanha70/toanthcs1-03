
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateMathQuestions } from './services/geminiService';
import { Difficulty, Grade, Question, QuizConfig, QuizState, QuestionType, UserAnswer } from './types';
import MathRenderer from './components/MathRenderer';
import LoadingScreen from './components/LoadingScreen';
import { 
  BookOpen, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Award,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  AlertOctagon,
  CheckSquare,
  Square
} from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<'setup' | 'loading' | 'quiz' | 'summary'>('setup');
  
  const [config, setConfig] = useState<QuizConfig>({
    grade: Grade.NINE,
    topic: 'Phương trình bậc hai',
    difficulty: Difficulty.MEDIUM,
    questionCount: 5,
    questionType: 'MIXED'
  });

  const [quizState, setQuizState] = useState<QuizState>({
    questions: [],
    userAnswers: [],
    currentQuestionIndex: 0,
    isComplete: false,
    score: 0,
    warnings: 0,
    startTime: 0,
    submissionReason: 'normal'
  });
  
  const timerRef = useRef<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const handleStartQuiz = async () => {
    setView('loading');
    try {
      const questions = await generateMathQuestions(
        config.grade,
        config.topic,
        config.difficulty,
        config.questionCount,
        config.questionType
      );
      
      const initialAnswers = questions.map(q => {
        if (q.type === QuestionType.TRUE_FALSE) {
          return [undefined, undefined, undefined, undefined] as any;
        }
        return -1; 
      });

      setQuizState({
        questions,
        userAnswers: initialAnswers,
        currentQuestionIndex: 0,
        isComplete: false,
        score: 0,
        warnings: 0,
        startTime: Date.now(),
        submissionReason: 'normal'
      });
      setElapsedTime(0);
      setView('quiz');
    } catch (error) {
      alert("Có lỗi xảy ra khi tạo câu hỏi. Vui lòng thử lại.");
      setView('setup');
    }
  };

  const handleMCSelect = (optionIndex: number) => {
    if (quizState.isComplete) return;
    setQuizState(prev => {
      const newAnswers = [...prev.userAnswers];
      newAnswers[prev.currentQuestionIndex] = optionIndex;
      return { ...prev, userAnswers: newAnswers };
    });
  };

  const handleTFSelect = (propIndex: number, value: boolean) => {
    if (quizState.isComplete) return;
    setQuizState(prev => {
      const newAnswers = [...prev.userAnswers];
      const currentAns = newAnswers[prev.currentQuestionIndex] as boolean[] || [undefined, undefined, undefined, undefined];
      const updatedTF = [...currentAns];
      updatedTF[propIndex] = value;
      newAnswers[prev.currentQuestionIndex] = updatedTF;
      return { ...prev, userAnswers: newAnswers };
    });
  };

  const handleNextQuestion = () => {
    if (quizState.currentQuestionIndex < quizState.questions.length - 1) {
      setQuizState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }));
    } else {
      finishQuiz('normal');
    }
  };

  const handlePrevQuestion = () => {
    if (quizState.currentQuestionIndex > 0) {
      setQuizState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex - 1 }));
    }
  };

  const finishQuiz = useCallback((reason: 'normal' | 'cheat' = 'normal') => {
    setQuizState(prev => {
      let totalPoints = 0;
      const maxPossiblePoints = prev.questions.length; 

      prev.questions.forEach((q, idx) => {
        const ans = prev.userAnswers[idx];
        if (q.type === QuestionType.MULTIPLE_CHOICE) {
          if (ans === q.correctAnswerIndex) {
            totalPoints += 1;
          }
        } else if (q.type === QuestionType.TRUE_FALSE) {
          const userTF = ans as boolean[];
          const correctTF = q.correctAnswersTF || [];
          let correctProps = 0;
          if (Array.isArray(userTF)) {
             userTF.forEach((val, i) => {
               if (val === correctTF[i]) correctProps++;
             });
          }
          totalPoints += (correctProps * 0.25);
        }
      });
      
      const finalScore = (totalPoints / maxPossiblePoints) * 10;

      return {
        ...prev,
        isComplete: true,
        score: parseFloat(finalScore.toFixed(2)),
        endTime: Date.now(),
        submissionReason: reason
      };
    });
    setView('summary');
  }, []);

  const resetApp = () => {
    setView('setup');
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && view === 'quiz') {
        finishQuiz('cheat');
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [view, finishQuiz]);

  useEffect(() => {
    if (view === 'quiz' && !quizState.isComplete) {
      timerRef.current = window.setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [view, quizState.isComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const renderSetup = () => (
    <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-xl border-t-8 border-brand-600">
      <div className="text-center mb-10">
        <div className="bg-brand-100 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3 shadow-inner">
          <BookOpen className="text-brand-600 w-10 h-10" />
        </div>
        <h1 className="text-3xl font-black text-brand-900 tracking-tight leading-tight uppercase">
          HỌC TOÁN THCS TRỰC TUYẾN
        </h1>
        <p className="text-slate-500 mt-3 font-medium">Hệ thống ôn luyện Toán thông minh</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Khối Lớp</label>
          <div className="grid grid-cols-4 gap-3">
            {Object.values(Grade).map((g) => (
              <button
                key={g}
                onClick={() => setConfig({ ...config, grade: g })}
                className={`py-3 rounded-xl border-2 font-bold transition-all ${
                  config.grade === g 
                  ? 'bg-brand-600 text-white border-brand-600 shadow-lg scale-105' 
                  : 'bg-white text-slate-500 border-slate-100 hover:border-brand-200 hover:bg-brand-50'
                }`}
              >
                Lớp {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Chủ đề bài học</label>
          <input
            type="text"
            value={config.topic}
            onChange={(e) => setConfig({ ...config, topic: e.target.value })}
            placeholder="Ví dụ: Hình bình hành..."
            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-900 focus:ring-4 focus:ring-brand-100 focus:border-brand-500 outline-none transition-all font-medium"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Độ khó</label>
            <select
              value={config.difficulty}
              onChange={(e) => setConfig({ ...config, difficulty: e.target.value as Difficulty })}
              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-900 focus:ring-4 focus:ring-brand-100 focus:border-brand-500 outline-none font-medium"
            >
              {Object.values(Difficulty).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
             <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Loại câu hỏi</label>
             <select
                value={config.questionType}
                onChange={(e) => setConfig({ ...config, questionType: e.target.value as any })}
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-900 focus:ring-4 focus:ring-brand-100 focus:border-brand-500 outline-none font-medium"
             >
               <option value="MIXED">Kết hợp ngẫu nhiên</option>
               <option value={QuestionType.MULTIPLE_CHOICE}>Trắc nghiệm (4 đáp án)</option>
               <option value={QuestionType.TRUE_FALSE}>Đúng/Sai (4 mệnh đề)</option>
             </select>
          </div>
        </div>

        <button
          onClick={handleStartQuiz}
          disabled={!config.topic.trim()}
          className="w-full bg-brand-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-brand-700 transition-all active:scale-[0.98] shadow-xl shadow-brand-200 mt-4 uppercase tracking-widest"
        >
          Bắt đầu ôn luyện
        </button>
      </div>
    </div>
  );

  const renderMCQuestion = (q: Question) => {
    const selected = quizState.userAnswers[quizState.currentQuestionIndex] as number;
    const labels = ['A', 'B', 'C', 'D'];
    
    return (
      <div className="space-y-4">
        {q.options?.map((option, idx) => {
          const isSelected = selected === idx;
          return (
            <button
              key={idx}
              onClick={() => handleMCSelect(idx)}
              className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-center group
                ${isSelected 
                  ? 'border-brand-500 bg-brand-50 shadow-md ring-4 ring-brand-100' 
                  : 'border-slate-100 bg-slate-50/50 hover:border-brand-300 hover:bg-brand-50/30'
                }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-5 border-2 font-black text-xl transition-all shrink-0
                ${isSelected ? 'bg-brand-600 text-white border-brand-600 shadow-md' : 'bg-white text-slate-400 border-slate-200 group-hover:border-brand-300 group-hover:text-brand-500'}`}>
                {labels[idx]}
              </div>
              <div className="text-slate-800 flex-1 font-medium">
                 <MathRenderer content={option} className="inline text-lg" />
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderTFQuestion = (q: Question) => {
    const currentAns = (quizState.userAnswers[quizState.currentQuestionIndex] as boolean[]) || [undefined, undefined, undefined, undefined];
    const labels = ['a', 'b', 'c', 'd'];

    return (
      <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm">
        <div className="grid grid-cols-12 bg-slate-50 p-4 font-black text-slate-500 border-b uppercase text-xs tracking-widest">
          <div className="col-span-8 pl-4">Các mệnh đề</div>
          <div className="col-span-2 text-center">Đúng</div>
          <div className="col-span-2 text-center">Sai</div>
        </div>
        {q.propositions?.map((prop, idx) => (
           <div key={idx} className={`grid grid-cols-12 p-5 items-center border-b last:border-0 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
             <div className="col-span-8 flex items-start pr-4">
                <span className="font-black mr-3 bg-slate-200 text-slate-600 rounded-lg px-2 text-sm h-7 flex items-center shrink-0 uppercase">{labels[idx]}</span>
                <MathRenderer content={prop} className="text-slate-800 text-lg font-medium" />
             </div>
             
             <div className="col-span-2 flex justify-center">
                <button
                  onClick={() => handleTFSelect(idx, true)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all
                    ${currentAns[idx] === true 
                      ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-100 scale-110' 
                      : 'border-slate-200 bg-white text-slate-300 hover:border-brand-300 hover:text-brand-400'}`}
                >
                  <CheckSquare className="w-6 h-6" />
                </button>
             </div>
             
             <div className="col-span-2 flex justify-center">
               <button
                  onClick={() => handleTFSelect(idx, false)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all
                    ${currentAns[idx] === false 
                      ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-100 scale-110' 
                      : 'border-slate-200 bg-white text-slate-300 hover:border-red-300 hover:text-red-400'}`}
                >
                  <XCircle className="w-6 h-6" />
                </button>
             </div>
           </div>
        ))}
      </div>
    );
  };

  const renderQuiz = () => {
    const currentQ = quizState.questions[quizState.currentQuestionIndex];
    const isLast = quizState.currentQuestionIndex === quizState.questions.length - 1;
    
    const answeredCount = quizState.userAnswers.filter(a => {
        if (Array.isArray(a)) return a.some(v => v !== undefined);
        return a !== -1;
    }).length;
    const progress = (answeredCount / quizState.questions.length) * 100;

    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-5 rounded-2xl shadow-md mb-8 flex justify-between items-center sticky top-6 z-10 border-l-8 border-brand-600">
           <div className="flex items-center gap-6">
             <div className="flex flex-col">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời gian trôi qua</span>
               <span className="text-2xl font-mono text-brand-700 font-black">{formatTime(elapsedTime)}</span>
             </div>
             <div className="h-10 w-px bg-slate-100"></div>
             <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
               {currentQ.type === QuestionType.TRUE_FALSE ? 'Kiểm tra Đúng/Sai' : 'Câu hỏi Trắc nghiệm'}
             </span>
           </div>
           <span className="text-lg font-black text-slate-800 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
             CÂU {quizState.currentQuestionIndex + 1} / {quizState.questions.length}
           </span>
        </div>

        <div className="w-full bg-slate-200 rounded-full h-3 mb-8 overflow-hidden">
          <div className="bg-brand-600 h-full rounded-full transition-all duration-500 ease-out shadow-inner" style={{ width: `${progress}%` }}></div>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl mb-10 border border-slate-50">
           <div className="mb-8">
              <span className="bg-brand-100 text-brand-800 text-xs font-black px-4 py-2 rounded-xl mr-4 align-middle inline-block mb-3 uppercase tracking-wider">
                Đề bài
              </span>
              <MathRenderer content={currentQ.questionText} className="text-2xl font-bold text-slate-900 leading-relaxed block" />
           </div>

           {currentQ.type === QuestionType.MULTIPLE_CHOICE 
             ? renderMCQuestion(currentQ) 
             : renderTFQuestion(currentQ)
           }
        </div>

        <div className="flex justify-between items-center gap-4">
          <button
            onClick={handlePrevQuestion}
            disabled={quizState.currentQuestionIndex === 0}
            className="flex items-center px-8 py-4 rounded-2xl font-bold text-slate-600 bg-white border-2 border-slate-100 shadow-sm hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-6 h-6 mr-2" /> Quay lại
          </button>

          {isLast ? (
            <button
              onClick={() => finishQuiz('normal')}
              className="flex items-center px-12 py-5 rounded-2xl font-black text-xl text-white bg-brand-600 shadow-2xl shadow-brand-200 hover:bg-brand-700 hover:-translate-y-1 transition-all uppercase tracking-widest"
            >
              Nộp bài <CheckCircle className="w-6 h-6 ml-3" />
            </button>
          ) : (
             <button
              onClick={handleNextQuestion}
              className="flex items-center px-10 py-4 rounded-2xl font-bold text-white bg-brand-600 shadow-lg hover:bg-brand-700 hover:shadow-brand-200 transition-all"
            >
              Câu kế tiếp <ChevronRight className="w-6 h-6 ml-2" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderSummary = () => {
    const isPerfect = quizState.score === 10;
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-slideUp">
        {quizState.submissionReason === 'cheat' && (
           <div className="bg-red-600 text-white p-5 flex items-center justify-center gap-4">
             <AlertOctagon className="w-10 h-10 animate-bounce" />
             <div className="text-center">
               <h3 className="font-black text-xl uppercase tracking-widest">PHÁT HIỆN GIAN LẬN!</h3>
               <p className="text-sm font-medium opacity-90">Hệ thống đã tự động kết thúc bài thi của bạn.</p>
             </div>
           </div>
        )}
        <div className="bg-brand-700 p-12 text-center text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-32 h-32 bg-white/20 backdrop-blur-md rounded-full mb-6 border-4 border-white/30">
               <Award className={`w-16 h-16 ${isPerfect ? 'text-yellow-300' : 'text-white'}`} />
            </div>
            <div className="text-8xl font-black mb-4 drop-shadow-lg">{quizState.score}<span className="text-3xl opacity-60">/10</span></div>
            <p className="text-xl font-bold opacity-80 uppercase tracking-[0.3em]">Kết quả ôn luyện</p>
            <p className="mt-2 text-brand-200 font-medium">Chủ đề: {config.topic}</p>
          </div>
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-brand-500 rounded-full blur-3xl opacity-30"></div>
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-brand-900 rounded-full blur-3xl opacity-30"></div>
        </div>

        <div className="p-10 space-y-10">
           <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
             <RefreshCw className="text-brand-600" /> Xem lại bài làm
           </h3>
           
           {quizState.questions.map((q, idx) => {
             const ans = quizState.userAnswers[idx];
             let borderColor = 'border-red-100 bg-red-50/30';
             let labelColor = 'text-red-600';
             let correctCountTF = 0;
             
             if (q.type === QuestionType.MULTIPLE_CHOICE) {
               if (ans === q.correctAnswerIndex) {
                 borderColor = 'border-emerald-100 bg-emerald-50/30';
                 labelColor = 'text-emerald-700';
               }
             } else {
               const userTF = ans as boolean[];
               const keyTF = q.correctAnswersTF || [];
               userTF?.forEach((v, k) => { if (v === keyTF[k]) correctCountTF++; });
               if (correctCountTF === 4) {
                 borderColor = 'border-emerald-100 bg-emerald-50/30';
                 labelColor = 'text-emerald-700';
               } else if (correctCountTF > 0) {
                 borderColor = 'border-amber-100 bg-amber-50/30';
                 labelColor = 'text-amber-700';
               }
             }

             return (
               <div key={idx} className={`p-8 rounded-[2rem] border-2 ${borderColor} transition-all`}>
                 <div className="flex items-start gap-4 mb-6">
                   <div className={`font-black uppercase text-sm h-8 w-16 shrink-0 rounded-lg flex items-center justify-center bg-white border shadow-sm ${labelColor}`}>Câu {idx + 1}</div>
                   <MathRenderer content={q.questionText} className="text-xl font-bold text-slate-800 leading-snug" />
                 </div>
                 
                 {q.type === QuestionType.MULTIPLE_CHOICE ? (
                    <div className="ml-0 md:ml-12 space-y-3">
                      {q.options?.map((opt, oIdx) => {
                        const isSelected = ans === oIdx;
                        const isKey = q.correctAnswerIndex === oIdx;
                        let style = "text-slate-500 font-medium";
                        if (isKey) style = "font-black text-emerald-700 bg-emerald-50 border-2 border-emerald-200 px-4 py-2 rounded-xl flex items-center gap-3";
                        if (isSelected && !isKey) style = "font-bold text-red-600 line-through decoration-red-400 bg-red-50 px-4 py-2 rounded-xl flex items-center gap-3";
                        
                        return (
                          <div key={oIdx} className="flex items-center gap-3">
                            <span className="font-black w-8 text-slate-400">{String.fromCharCode(65+oIdx)}.</span>
                            <div className={style}>
                              <MathRenderer content={opt} className="inline"/>
                              {isKey && <CheckCircle className="w-5 h-5"/>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                 ) : (
                    <div className="ml-0 md:ml-12 bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm">
                      {q.propositions?.map((prop, pIdx) => {
                         const userVal = (ans as boolean[])?.[pIdx];
                         const keyVal = q.correctAnswersTF?.[pIdx];
                         const matched = userVal === keyVal;
                         
                         return (
                           <div key={pIdx} className="grid grid-cols-12 p-4 border-b last:border-0 items-center gap-4 hover:bg-slate-50 transition-colors">
                             <div className="col-span-7 text-sm font-medium"><span className="font-black mr-2 text-slate-400">{String.fromCharCode(97+pIdx)})</span> <MathRenderer content={prop} className="inline"/></div>
                             <div className="col-span-5 flex items-center justify-end gap-4 text-xs">
                               <span className="px-3 py-1 bg-slate-100 rounded-lg text-slate-500 font-bold">Bạn chọn: <b className={userVal ? 'text-blue-600' : 'text-red-600'}>{userVal === true ? 'Đ' : userVal === false ? 'S' : '-'}</b></span>
                               <span className="px-3 py-1 bg-brand-50 rounded-lg text-brand-600 font-bold">Đ.Án: <b>{keyVal ? 'Đ' : 'S'}</b></span>
                               {matched ? <CheckCircle className="w-5 h-5 text-emerald-500"/> : <XCircle className="w-5 h-5 text-red-500"/>}
                             </div>
                           </div>
                         )
                      })}
                    </div>
                 )}
                 
                 <div className="mt-6 p-6 bg-white/70 backdrop-blur rounded-2xl border-2 border-slate-100 text-sm leading-relaxed">
                   <strong className="text-brand-700 font-black uppercase tracking-wider block mb-2">Lời giải chi tiết</strong> 
                   <MathRenderer content={q.explanation} className="text-slate-600 font-medium"/>
                 </div>
               </div>
             )
           })}
           
           <button onClick={resetApp} className="w-full py-6 bg-brand-600 text-white rounded-[2rem] font-black text-xl hover:bg-brand-700 flex items-center justify-center gap-3 shadow-2xl shadow-brand-200 transition-all active:scale-95 uppercase tracking-widest">
             <RefreshCw className="w-6 h-6"/> Ôn luyện chủ đề mới
           </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-8">
      {view === 'setup' && renderSetup()}
      {view === 'loading' && <LoadingScreen />}
      {view === 'quiz' && renderQuiz()}
      {view === 'summary' && renderSummary()}
    </div>
  );
};

export default App;
