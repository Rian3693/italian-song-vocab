import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ReviewPage({ initialCards, languageFilter }) {
  const [cards, setCards] = useState(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [addingWord, setAddingWord] = useState(null);
  const [toast, setToast] = useState(null);

  const currentCard = cards[currentIndex];
  const currentLanguage = currentCard?.language === 'spanish' ? 'spanish' : 'italian';
  const speechLocale = currentLanguage === 'spanish' ? 'es-ES' : 'it-IT';
  const languageLabel = currentLanguage === 'spanish' ? 'Spanish' : 'Italian';

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (!currentCard) return;
    const speak = (text) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = speechLocale;
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    };
    speak(currentCard.italian);
  }, [currentCard, speechLocale]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (reviewing || addingWord) return;
      if (!showAnswer) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleReveal(); }
      } else {
        if (e.key === '1') { e.preventDefault(); handleResponse('again'); }
        else if (e.key === '2') { e.preventDefault(); handleResponse('hard'); }
        else if (e.key === '3') { e.preventDefault(); handleResponse('good'); }
        else if (e.key === '4') { e.preventDefault(); handleResponse('easy'); }
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showAnswer, reviewing, currentIndex, addingWord]);

  const handleReveal = () => setShowAnswer(true);

  const handleResponse = async (response) => {
    if (!currentCard) return;
    setReviewing(true);
    try {
      await fetch('/api/review-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: currentCard.id, response, currentCard })
      });

      if (response === 'again' || response === 'hard') {
        const updatedCard = { ...currentCard };
        setCards([...cards, updatedCard]);
      }

      if (currentIndex < cards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
      } else {
        setCards([]);
      }
    } catch (error) {
      setToast({ type: 'error', message: 'Failed to save progress.' });
    } finally {
      setReviewing(false);
    }
  };

  const addFlashcardFromHint = async (word) => {
    const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
    if (!cleanWord || cleanWord.length < 2) return;
    
    setAddingWord(cleanWord);
    try {
      const res = await fetch('/api/quick-flashcard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          word: cleanWord, 
          sentence: currentCard.ai_example,
          songId: currentCard.song_id,
          language: currentLanguage
        })
      });
      if (res.ok) {
        setToast({ type: 'success', message: `Added "${cleanWord}" to your cards!` });
      }
    } catch (e) {
      setToast({ type: 'error', message: 'Failed to add word.' });
    } finally {
      setAddingWord(null);
    }
  };

  const renderClickableSentence = (sentence) => {
    if (!sentence) return null;
    return sentence.split(' ').map((word, i) => (
      <span 
        key={i} 
        onClick={() => addFlashcardFromHint(word)}
        className="hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors rounded px-0.5"
        title="Click to add as new flashcard"
      >
        {word}{' '}
      </span>
    ));
  };

  if (!cards || cards.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">All done for now!</h1>
          <p className="text-gray-600 mb-8">You've mastered all the cards in this session.</p>
          <Link href="/"><button className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg">Add More Songs</button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-8 relative overflow-hidden">
      {/* Custom Toast Notification */}
      {toast && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300 px-6 py-3 rounded-xl shadow-2xl font-bold text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? '✅ ' : '❌ '} {toast.message}
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        <div className="mb-4 flex flex-wrap justify-center gap-2">
          <Link href="/review">
            <button className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${languageFilter === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
              All
            </button>
          </Link>
          <Link href="/review?language=italian">
            <button className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${languageFilter === 'italian' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
              Italian
            </button>
          </Link>
          <Link href="/review?language=spanish">
            <button className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${languageFilter === 'spanish' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
              Spanish
            </button>
          </Link>
        </div>

        <div className="mb-6 text-center">
          <p className="text-gray-600 font-semibold">Card {currentIndex + 1} of {cards.length}</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-12 min-h-[400px] flex flex-col justify-between relative overflow-hidden">
          {addingWord && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="text-center">
                <p className="text-indigo-600 font-bold animate-pulse text-lg">Adding "{addingWord}"...</p>
                <p className="text-xs text-gray-400">Consulting AI teacher...</p>
              </div>
            </div>
          )}

          <div>
            <p className="text-sm text-gray-500 mb-4 uppercase tracking-wider font-bold text-center">From: {currentCard.song_title}</p>
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-4 mb-4">
                <h2 className="text-5xl font-bold text-gray-800">{currentCard.italian}</h2>
                <button
                  onClick={() => {
                    const utterance = new SpeechSynthesisUtterance(currentCard.italian);
                    utterance.lang = speechLocale;
                    utterance.rate = 0.85;
                    utterance.pitch = 1.0;
                    window.speechSynthesis.cancel();
                    window.speechSynthesis.speak(utterance);
                  }}
                  className="text-4xl hover:scale-110 transition-transform"
                >
                  🔊
                </button>
              </div>
              <p className="text-xs uppercase font-bold text-indigo-500 tracking-wide">{languageLabel}</p>
              
              <div className="text-gray-500 italic text-sm mt-4 border-b border-gray-100 pb-4">
                <p className="mb-1">From lyrics: "{currentCard.example_sentence}"</p>
                <p className="text-gray-400 text-xs">({currentCard.example_english})</p>
              </div>

              {currentCard.ai_example && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs text-blue-400 uppercase font-bold mb-2">AI Context Hint (Click any word to add it):</p>
                  <p className="text-xl text-gray-700 italic font-serif leading-relaxed">
                    {renderClickableSentence(currentCard.ai_example)}
                  </p>
                  <p className="text-sm mt-2 text-indigo-600 font-medium border-t border-indigo-50 pt-2">
                    {currentCard.ai_example_english}
                  </p>
                </div>
              )}
            </div>
          </div>

          {showAnswer ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="text-center mb-8 p-6 bg-green-50 rounded-lg border border-green-100">
                <p className="text-3xl text-green-700 font-bold">{currentCard.english}</p>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <button onClick={() => handleResponse('again')} disabled={reviewing} className="bg-red-500 text-white font-semibold py-3 px-2 rounded-lg flex flex-col items-center hover:bg-red-600 shadow-md transition-all">
                  <span>Again</span><span className="text-[10px] opacity-80">{"<1m"}</span>
                </button>
                <button onClick={() => handleResponse('hard')} disabled={reviewing} className="bg-orange-500 text-white font-semibold py-3 px-2 rounded-lg flex flex-col items-center hover:bg-orange-600 shadow-md transition-all">
                  <span>Hard</span><span className="text-[10px] opacity-80">{"<10m"}</span>
                </button>
                <button onClick={() => handleResponse('good')} disabled={reviewing} className="bg-green-500 text-white font-semibold py-3 px-2 rounded-lg flex flex-col items-center hover:bg-green-600 shadow-md transition-all">
                  <span>Good</span><span className="text-[10px] opacity-80">{"1d+"}</span>
                </button>
                <button onClick={() => handleResponse('easy')} disabled={reviewing} className="bg-blue-500 text-white font-semibold py-3 px-2 rounded-lg flex flex-col items-center hover:bg-blue-600 shadow-md transition-all">
                  <span>Easy</span><span className="text-[10px] opacity-80">{"4d+ "}</span>
                </button>
              </div>
            </div>
          ) : (
            <button onClick={handleReveal} className="w-full bg-indigo-600 text-white font-bold py-4 px-6 rounded-xl text-xl hover:bg-indigo-700 shadow-lg transform active:scale-95 transition-all">Show Answer</button>
          )}
        </div>

        <div className="text-center mt-8 flex gap-6 justify-center">
          <Link href="/"><button className="text-gray-400 hover:text-gray-600 font-medium transition-colors">Exit Review</button></Link>
          <Link href="/stats"><button className="text-indigo-400 hover:text-indigo-600 font-medium transition-colors">📊 View Stats</button></Link>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps({ query }) {
  try {
    const { getDueFlashcards } = require('../lib/db');
    const normalizeFilter = (input) => {
      if (input === 'italian' || input === 'spanish') return input;
      return 'all';
    };

    const languageFilter = normalizeFilter(query?.language);
    const cards = getDueFlashcards(20, languageFilter === 'all' ? null : languageFilter);
    return {
      props: {
        initialCards: JSON.parse(JSON.stringify(cards)),
        languageFilter
      }
    };
  } catch (error) {
    return { props: { initialCards: [], languageFilter: 'all' } };
  }
}
