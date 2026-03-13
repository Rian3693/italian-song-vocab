import Link from 'next/link';

export default function AllFlashcards({ flashcards }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/">
          <button className="mb-6 text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">
            ← Back to Home
          </button>
        </Link>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">
            📚 All Flashcards ({flashcards.length})
          </h1>
          <Link href="/review">
            <button className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition">
              Review Now
            </button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flashcards.map((card) => (
            <div key={card.id} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-indigo-600">{card.italian}</h2>
                  <p className="text-gray-500 font-medium">{card.english}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="bg-indigo-50 text-indigo-400 text-[10px] px-2 py-1 rounded uppercase font-bold">
                    {(card.language || 'italian') === 'spanish' ? 'Spanish' : 'Italian'}
                  </div>
                  <div className="bg-gray-50 text-gray-400 text-[10px] px-2 py-1 rounded uppercase font-bold">
                    Level {card.repetitions}
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 flex-grow">
                <div className="text-sm">
                  <p className="text-gray-400 uppercase text-[10px] font-bold">From Song:</p>
                  <p className="text-gray-700 italic">"{card.example_sentence}"</p>
                </div>
                
                {card.ai_example && (
                  <div className="text-sm bg-blue-50/50 p-3 rounded-lg border border-blue-50">
                    <p className="text-blue-400 uppercase text-[10px] font-bold">AI Context:</p>
                    <p className="text-gray-700 italic">"{card.ai_example}"</p>
                    <p className="text-gray-400 text-xs mt-1">{card.ai_example_english}</p>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-[10px] text-gray-400 uppercase font-bold">
                <span>Next Review: {new Date(card.next_review).toLocaleDateString()}</span>
                <span className={card.interval > 0 ? 'text-green-500' : 'text-gray-300'}>
                  {card.interval} Day Interval
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  try {
    const { getAllFlashcards } = require('../lib/db');
    const flashcards = getAllFlashcards();
    return { 
      props: { 
        flashcards: JSON.parse(JSON.stringify(flashcards)) 
      } 
    };
  } catch (error) {
    return { props: { flashcards: [] } };
  }
}
