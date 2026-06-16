import React, { useState, useEffect } from 'react';
import { supabase } from './utils/supabaseClient';
import './App.css';

const App = () => {
  const [vocabs, setVocabs] = useState([]); // 단어 목록
  const [loading, setLoading] = useState(true); // 로딩 상태
  const [searchQuery, setSearchQuery] = useState(''); // 검색어
  const [expandedVocabId, setExpandedVocabId] = useState(null); // 현재 펼쳐진 단일 카드 ID 저장
  
  // 모달 제어
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVocab, setEditingVocab] = useState(null);

  // 입력 폼 상태
  const [word, setWord] = useState('');
  const [etymology, setEtymology] = useState(''); // 어원 추가
  const [meanings, setMeanings] = useState([{ pos: 'noun', meaning: '' }]);
  const [examples, setExamples] = useState([{ english: '', korean: '' }]);

  // 1. 단어 목록 가져오기
  useEffect(() => {
    fetchVocabs();
  }, []);

  const fetchVocabs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vocabularies')
        .select('*')
        .order('word', { ascending: true });

      if (error) throw error;
      if (data) {
        setVocabs(data);
      }
    } catch (e) {
      console.error("Fetch failed, using local fallback:", e);
      // fallback
      const local = localStorage.getItem('my_vocab_list');
      if (local) setVocabs(JSON.parse(local));
    } finally {
      setLoading(false);
    }
  };

  // 2. 단어 삭제
  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("정말 이 단어를 삭제할까요?")) return;
    
    try {
      const { error } = await supabase
        .from('vocabularies')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setVocabs(vocabs.filter(v => v.id !== id));
      if (expandedVocabId === id) setExpandedVocabId(null); // 삭제 시 펼침 상태 초기화
    } catch (e) {
      console.error("Delete failed:", e);
      alert("삭제 처리에 실패했습니다.");
    }
  };

  // 3. 등록/수정 모달 열기
  const openModal = (vocab = null, e = null) => {
    if (e) e.stopPropagation(); // 카드 탭 이벤트 전파 방지
    if (vocab) {
      setEditingVocab(vocab);
      setWord(vocab.word);
      setEtymology(vocab.etymology || '');
      setMeanings(vocab.meanings.length ? vocab.meanings : [{ pos: 'noun', meaning: '' }]);
      setExamples(vocab.examples && vocab.examples.length ? vocab.examples : [{ english: '', korean: '' }]);
    } else {
      setEditingVocab(null);
      setWord('');
      setEtymology('');
      setMeanings([{ pos: 'noun', meaning: '' }]);
      setExamples([{ english: '', korean: '' }]);
    }
    setIsModalOpen(true);
  };

  // 4. 단어 추가/수정 저장
  const handleSave = async (e) => {
    e.preventDefault();
    if (!word.trim()) {
      alert("단어를 입력해 주세요.");
      return;
    }

    // 빈 값 필터링
    const filteredMeanings = meanings.filter(m => m.meaning.trim() !== '');
    const filteredExamples = examples.filter(ex => ex.english.trim() !== '');

    if (filteredMeanings.length === 0) {
      alert("최소 하나의 뜻을 적어주세요.");
      return;
    }

    const payload = {
      word: word.trim(),
      etymology: etymology.trim(),
      meanings: filteredMeanings,
      examples: filteredExamples
    };

    try {
      if (editingVocab) {
        // 수정 모드
        const { data, error } = await supabase
          .from('vocabularies')
          .update(payload)
          .eq('id', editingVocab.id)
          .select();

        if (error) throw error;
        if (data) {
          setVocabs(vocabs.map(v => v.id === editingVocab.id ? data[0] : v));
        }
      } else {
        // 새 단어 모드
        const { data, error } = await supabase
          .from('vocabularies')
          .insert([payload])
          .select();

        if (error) throw error;
        if (data) {
          setVocabs([...vocabs, data[0]].sort((a, b) => a.word.localeCompare(b.word)));
        }
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Save failed:", err);
      alert("저장 처리에 실패했습니다.");
    }
  };

  // 5. 음성 발음 재생 (TTS)
  const speakText = (text, e) => {
    if (e) e.stopPropagation();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // 이전 재생 취소
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9; // 속도를 살짝 낮춰 또박또박하게 발음
      window.speechSynthesis.speak(utterance);
    } else {
      alert("이 브라우저는 음성 재생을 지원하지 않습니다.");
    }
  };

  // 입력 핸들러 (동적 리스트)
  const handleMeaningChange = (index, field, value) => {
    const updated = meanings.map((m, i) => i === index ? { ...m, [field]: value } : m);
    setMeanings(updated);
  };

  const handleExampleChange = (index, field, value) => {
    const updated = examples.map((ex, i) => i === index ? { ...ex, [field]: value } : ex);
    setExamples(updated);
  };

  // 카드 아코디언 단일 토글
  const toggleExpand = (id) => {
    setExpandedVocabId(prev => prev === id ? null : id);
  };

  // 필터링된 단어 리스트
  const filteredVocabs = vocabs.filter(v => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    const wordMatch = v.word.toLowerCase().includes(query);
    const meaningMatch = v.meanings.some(m => m.meaning.includes(query));
    return wordMatch || meaningMatch;
  });

  return (
    <div className="app-container">
      {/* 상단 바 */}
      <header className="header-bar">
        <div className="logo-container">
          <h1 className="logo-text">
            R.me<span className="logo-accent">_</span>
          </h1>
          <span className="subtitle">nk's dictionary</span>
        </div>
        <button className="add-btn" onClick={() => openModal()}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          단어 추가
        </button>
      </header>

      {/* 검색 필터 */}
      <div className="search-container">
        <input 
          type="text" 
          placeholder="단어 또는 뜻 검색..." 
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* 로딩 표시 */}
      {loading ? (
        <div className="loading-view">
          <p style={{ fontWeight: 600, color: '#888' }}>단어 데이터를 로드하고 있습니다...</p>
        </div>
      ) : filteredVocabs.length === 0 ? (
        <div className="empty-view">
          <span className="empty-icon">📖</span>
          <p>등록된 단어가 없거나<br />검색 결과가 없습니다.</p>
        </div>
      ) : (
        /* 단어 리스트 */
        <main className="vocab-list">
          {filteredVocabs.map(v => {
            const isExpanded = expandedVocabId === v.id;
            return (
              <div key={v.id} className={`vocab-card ${isExpanded ? 'active' : ''}`} onClick={() => toggleExpand(v.id)}>
                <div className="card-top">
                  <div className="word-row">
                    <h3 className="card-word">{v.word}</h3>
                    <button className="tts-btn" onClick={(e) => speakText(v.word, e)} title="발음 듣기">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                      </svg>
                    </button>
                  </div>
                  
                  <div className="card-actions">
                    {/* 삭제 왼쪽 수정버튼 추가 */}
                    <button className="card-action-btn edit" onClick={(e) => openModal(v, e)} title="수정" style={{ marginRight: '6px' }}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                      </svg>
                    </button>
                    <button className="card-action-btn delete" onClick={(e) => handleDelete(v.id, e)} title="삭제">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 어원 노출 */}
                {v.etymology && (
                  <div className="etymology-badge-row" style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-color)', fontWeight: 'bold', background: '#FFF0EC', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(255, 59, 0, 0.1)' }}>
                      🔍 어원: {v.etymology}
                    </span>
                  </div>
                )}

                {/* 품사 및 뜻 */}
                <div className="meanings-container">
                  {v.meanings.map((m, idx) => (
                    <div key={idx} className="meaning-row">
                      <span className={`pos-tag ${m.pos}`}>{m.pos}</span>
                      <span className="meaning-text">{m.meaning}</span>
                    </div>
                  ))}
                </div>

                {/* 아코디언식 예시문 노출 */}
                {isExpanded && v.examples && v.examples.length > 0 && (
                  <div className="examples-container">
                    {v.examples.map((ex, idx) => (
                      <div key={idx} className="example-item" onClick={(e) => e.stopPropagation()}>
                        <span className="ex-english">{ex.english}</span>
                        <span className="ex-korean">{ex.korean}</span>
                        <button className="ex-tts" onClick={() => speakText(ex.english)} title="문장 듣기">
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </main>
      )}

      {/* 등록 및 수정 모달 */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingVocab ? '단어 수정' : '새 단어 추가'}</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>

            <form onSubmit={handleSave}>
              {/* 단어명 */}
              <div className="form-group">
                <label>English Word</label>
                <input 
                  type="text" 
                  placeholder="예: resilient" 
                  className="form-input" 
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  autoFocus
                />
              </div>

              {/* 어원 입력란 */}
              <div className="form-group">
                <label>Etymology (어원)</label>
                <input 
                  type="text" 
                  placeholder="예: Lat. resilientem (돌아오는)" 
                  className="form-input" 
                  value={etymology}
                  onChange={(e) => setEtymology(e.target.value)}
                />
              </div>

              {/* 뜻 품사 그룹 */}
              <div className="form-group">
                <label>Meanings & Parts of Speech</label>
                {meanings.map((m, idx) => (
                  <div key={idx} className="dynamic-row">
                    <select 
                      className="pos-select"
                      value={m.pos}
                      onChange={(e) => handleMeaningChange(idx, 'pos', e.target.value)}
                    >
                      <option value="noun">noun</option>
                      <option value="verb">verb</option>
                      <option value="adj">adj</option>
                      <option value="adv">adv</option>
                      <option value="idiom">idiom</option>
                    </select>
                    <input 
                      type="text" 
                      placeholder="뜻을 입력하세요 (예: 탄력 있는)" 
                      className="form-input"
                      value={m.meaning}
                      onChange={(e) => handleMeaningChange(idx, 'meaning', e.target.value)}
                    />
                    {meanings.length > 1 && (
                      <button 
                        type="button" 
                        className="remove-row-btn"
                        onClick={() => setMeanings(meanings.filter((_, i) => i !== idx))}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  type="button" 
                  className="add-row-btn"
                  onClick={() => setMeanings([...meanings, { pos: 'noun', meaning: '' }])}
                >
                  + 뜻 추가하기
                </button>
              </div>

              {/* 예시문 그룹 */}
              <div className="form-group" style={{ marginTop: '10px' }}>
                <label>Examples</label>
                {examples.map((ex, idx) => (
                  <div key={idx} className="dynamic-row" style={{ flexDirection: 'column', gap: '6px', borderBottom: examples.length > 1 ? '1px dashed #E2DFD8' : 'none', paddingBottom: '10px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                      <input 
                        type="text" 
                        placeholder="영어 예문 입력" 
                        className="form-input"
                        value={ex.english}
                        onChange={(e) => handleExampleChange(idx, 'english', e.target.value)}
                        style={{ flex: 1 }}
                      />
                      {examples.length > 1 && (
                        <button 
                          type="button" 
                          className="remove-row-btn"
                          onClick={() => setExamples(examples.filter((_, i) => i !== idx))}
                        >
                          &times;
                        </button>
                      )}
                    </div>
                    <input 
                      type="text" 
                      placeholder="한글 해석 입력" 
                      className="form-input"
                      value={ex.korean}
                      onChange={(e) => handleExampleChange(idx, 'korean', e.target.value)}
                    />
                  </div>
                ))}
                <button 
                  type="button" 
                  className="add-row-btn"
                  onClick={() => setExamples([...examples, { english: '', korean: '' }])}
                >
                  + 예문 추가하기
                </button>
              </div>

              {/* 하단 버튼 */}
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>취소</button>
                <button type="submit" className="btn-submit">{editingVocab ? '수정 완료' : '추가하기'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
