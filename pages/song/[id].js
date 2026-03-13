import { useRouter } from 'next/router';
import Link from 'next/link';

export default function SongPage({ song, flashcards }) {
  const router = useRouter();
  const songLanguage = song?.language === 'spanish' ? 'spanish' : 'italian';
  const languageLabel = songLanguage === 'spanish' ? 'Spanish' : 'Italian';

  if (router.isFallback) return <div className="p-8 text-center">Loading...</div>;

  if (!song) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Song not found</h1>
        <Link href="/"><button className="bg-indigo-600 text-white px-6 py-3 rounded-lg">Go Home</button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/"><button className="mb-6 text-indigo-600 hover:text-indigo-800 font-semibold">← Back to Home</button></Link>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">{song.title}</h1>
          {song.artist && <p className="text-xl text-gray-600 mb-6">by {song.artist}</p>}
          <span className="inline-block mb-6 text-xs uppercase bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold tracking-wide">
            {languageLabel}
          </span>

          <div className="bg-indigo-50 p-6 rounded-lg mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">📖 Summary:</h2>
            <p className="text-gray-700">{song.summary}</p>
          </div>

          <div className="flex gap-4 mb-6">
            <div className="flex-1 bg-green-50 p-4 rounded-lg text-center">
              <p className="text-3xl font-bold text-green-600">{flashcards?.length || 0}</p>
              <p className="text-sm text-gray-600">{languageLabel} Words</p>
            </div>
            <div className="flex-1 bg-blue-50 p-4 rounded-lg text-center">
              <p className="text-3xl font-bold text-blue-600">
                {(() => {
                  const d = new Date(song.created_at);
                  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
                })()}
              </p>
              <p className="text-sm text-gray-600">Added</p>
            </div>
          </div>

          <Link href="/review"><button className="w-full bg-green-600 text-white font-bold py-3 px-6 rounded-lg">Start Learning</button></Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">🎤 {languageLabel} Lyrics & Translation</h2>
          <div className="space-y-6 font-serif">
            {(() => {
              try {
                const lines = JSON.parse(song.lyrics);
                return lines.map((line, i) => {
                  if (line.it.trim() === '') return <div key={i} className="h-4" />;
                  if (line.it.trim().startsWith('[') && line.it.trim().endsWith(']')) {
                    return <p key={i} className="text-gray-400 font-bold mt-6 mb-2 text-sm uppercase tracking-wider">{line.it}</p>;
                  }
                  return (
                    <div key={i} className="pl-0 py-0.5">
                      <p className="text-xl text-gray-800 font-medium leading-tight">{line.it}</p>
                      {line.en && <p className="text-sm text-gray-400 italic mt-0.5">{line.en}</p>}
                    </div>
                  );
                });
              } catch (e) {
                return <pre className="whitespace-pre-wrap text-gray-700">{song.lyrics}</pre>;
              }
            })()}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">📚 {languageLabel} Vocabulary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {flashcards.map((card, index) => (
              <div key={card.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-xl font-bold text-gray-800">{card.italian}</p>
                <p className="text-gray-600">{card.english}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps({ params }) {
  try {
    const { getSong, getFlashcardsBySong } = require('../../lib/db');
    const song = getSong(params.id);
    const flashcards = song ? getFlashcardsBySong(params.id) : [];
    return { props: { 
      song: JSON.parse(JSON.stringify(song || null)), 
      flashcards: JSON.parse(JSON.stringify(flashcards)) 
    } };
  } catch (error) {
    return { props: { song: null, flashcards: [] } };
  }
}
