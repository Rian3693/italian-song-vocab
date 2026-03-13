import { useState } from 'react';
import Link from 'next/link';

export default function Home({ songs, selectedLanguage }) {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [manualLyrics, setManualLyrics] = useState('');
  const [language, setLanguage] = useState(selectedLanguage || 'italian');
  const [showManualInput, setShowManualInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const languageMeta = {
    italian: { label: 'Italian', emoji: '🇮🇹', native: 'Italiano' },
    spanish: { label: 'Spanish', emoji: '🇪🇸', native: 'Espanol' }
  };

  const handleExtract = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/extract-song', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          youtubeUrl,
          manualLyrics: manualLyrics.trim() || null,
          language
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`✅ Success! Created ${data.vocabularyCount} ${languageMeta[language].label} flashcards from "${data.title}"`);
        setYoutubeUrl('');
        setManualLyrics('');
        setShowManualInput(false);
        // Redirect to the song page instead of reloading
        setTimeout(() => {
          window.location.href = `/song/${data.songId}`;
        }, 1500);
      } else {
        setError(data.error || 'Failed to extract vocabulary');
      }
    } catch (err) {
      setError('Network error. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-3">
            <span className="text-6xl">🎵</span>
            Song Vocab Builder
          </h1>
          <p className="text-gray-600 text-lg">
            Learn Italian or Spanish through music. Paste a YouTube URL and get instant flashcards.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <label className="block text-gray-700 font-semibold mb-3">
            Study Language:
          </label>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {Object.entries(languageMeta).map(([value, meta]) => (
              <button
                key={value}
                type="button"
                onClick={() => setLanguage(value)}
                className={`border-2 rounded-lg px-4 py-3 text-left transition-all ${
                  language === value
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
              >
                <p className="font-bold">{meta.emoji} {meta.label}</p>
                <p className="text-sm text-gray-500">{meta.native}</p>
              </button>
            ))}
          </div>

          <label className="block text-gray-700 font-semibold mb-3">
            YouTube URL:
          </label>
          <input
            type="text"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none mb-4"
          />

          {/* Manual Lyrics Toggle */}
          <div className="mb-4">
            <button
              onClick={() => setShowManualInput(!showManualInput)}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium underline"
            >
              {showManualInput ? '✖ Hide Manual Input' : '📝 Can\'t find lyrics? Paste them manually'}
            </button>
          </div>

          {/* Manual Lyrics Textarea */}
          {showManualInput && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <label className="block text-gray-700 font-semibold mb-2">
                Paste {languageMeta[language].label} Lyrics Here (Optional):
              </label>
              <textarea
                value={manualLyrics}
                onChange={(e) => setManualLyrics(e.target.value)}
                placeholder="Il tempo se ne va&#10;Non ho più tempo&#10;Per dedicarti amore&#10;..."
                rows="8"
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:border-indigo-500 focus:outline-none font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 Tip: Copy lyrics from Genius, Musixmatch, or any lyrics site. The bot will still get the song info from YouTube!
              </p>
            </div>
          )}

          <button
            onClick={handleExtract}
            disabled={loading || !youtubeUrl}
            className={`w-full py-4 rounded-xl text-white font-bold text-lg transition-all shadow-lg ${
              loading || !youtubeUrl
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
            }`}
          >
            {loading ? 'Processing... ⏳' : 'Extract Vocabulary 🚀'}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700">
              <p className="font-semibold">❌ {error}</p>
            </div>
          )}

          {success && (
            <div className="mt-4 p-4 bg-green-100 border border-green-300 rounded-lg text-green-700">
              <p className="font-semibold">{success}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link href="/review">
            <button className="bg-green-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-green-700 shadow-lg transition-all flex flex-col items-center gap-2">
              <span className="text-3xl">📚</span>
              <span>Review Flashcards</span>
            </button>
          </Link>
          <Link href="/all-cards">
            <button className="bg-orange-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-orange-700 shadow-lg transition-all flex flex-col items-center gap-2">
              <span className="text-3xl">🗂️</span>
              <span>All Flashcards</span>
            </button>
          </Link>
          <Link href="/stats">
            <button className="bg-purple-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-purple-700 shadow-lg transition-all flex flex-col items-center gap-2">
              <span className="text-3xl">📊</span>
              <span>Statistics</span>
            </button>
          </Link>
          <Link href="/learning-tips">
            <button className="bg-pink-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-pink-700 shadow-lg transition-all flex flex-col items-center gap-2">
              <span className="text-3xl">💡</span>
              <span>Learning Tips</span>
            </button>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Recent Songs</h2>
            <Link href="/all-cards">
              <button className="text-indigo-600 hover:text-indigo-800 font-semibold text-sm">
                View List →
              </button>
            </Link>
          </div>

          {songs && songs.length > 0 ? (
            <div className="space-y-3">
              {songs.slice(0, 5).map((song) => (
                <Link key={song.id} href={`/song/${song.id}`}>
                  <div className="p-4 bg-gray-50 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer border border-gray-200 hover:border-indigo-300">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="font-bold text-gray-800">{song.title}</h3>
                        <p className="text-sm text-gray-600">{song.artist}</p>
                      </div>
                      <span className="text-[10px] uppercase bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold">
                        {(song.language || 'italian') === 'spanish' ? 'Spanish' : 'Italian'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No songs yet. Add your first song above! 🎵
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  try {
    const { getAllSongs, getSelectedLanguage } = require('../lib/db');
    const songs = getAllSongs();
    const selectedLanguage = getSelectedLanguage();
    return { props: { songs: JSON.parse(JSON.stringify(songs)), selectedLanguage } };
  } catch (error) {
    return { props: { songs: [], selectedLanguage: 'italian' } };
  }
}
