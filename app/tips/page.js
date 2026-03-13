import Link from 'next/link';

export default function LearningTips() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            🎯 Effective Language Learning
          </h1>
          <p className="text-gray-600 text-lg">
            Evidence-based strategies for speaking, understanding, and writing
          </p>
        </div>

        {/* Back Button */}
        <div className="mb-6">
          <Link href="/">
            <button className="text-indigo-600 hover:text-indigo-800 font-semibold transition">
              ← Back to Home
            </button>
          </Link>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Method 1 */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-indigo-600 mb-4">
              1. 📖 Comprehensible Input (The Foundation)
            </h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-indigo-500 mr-3 text-xl">•</span>
                <span>Consume content <strong>slightly above your level</strong> (you understand ~70-80%)</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-500 mr-3 text-xl">•</span>
                <span>Massive exposure through reading, listening, watching with subtitles</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-500 mr-3 text-xl">•</span>
                <span>This builds intuition for grammar and vocabulary naturally</span>
              </li>
            </ul>
          </div>

          {/* Method 2 */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-indigo-600 mb-4">
              2. 🗣️ Active Output from Day One
            </h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-indigo-500 mr-3 text-xl">•</span>
                <span>Speak/write even when bad at it — waiting until "ready" delays fluency</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-500 mr-3 text-xl">•</span>
                <span>Language exchange partners, tutors (iTalki), or AI conversation practice</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-500 mr-3 text-xl">•</span>
                <span><strong>Mistakes are data, not failures</strong></span>
              </li>
            </ul>
          </div>

          {/* Method 3 */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-indigo-600 mb-4">
              3. 🧠 Spaced Repetition for Vocabulary
            </h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-indigo-500 mr-3 text-xl">•</span>
                <span>Anki or similar for high-frequency words</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-500 mr-3 text-xl">•</span>
                <span>Focus on top <strong>1,000-3,000 words first</strong> (covers 80%+ of daily use)</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-500 mr-3 text-xl">•</span>
                <span>Learn words <strong>in context</strong> (sentences), not isolation</span>
              </li>
            </ul>
          </div>

          {/* Method 4 */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-indigo-600 mb-4">
              4. 🌍 Immersion (Real or Simulated)
            </h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-indigo-500 mr-3 text-xl">•</span>
                <span>Change phone/computer language settings</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-500 mr-3 text-xl">•</span>
                <span>Monolingual period: force yourself to think in the language</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-500 mr-3 text-xl">•</span>
                <span>If possible, live there or create a "bubble" at home</span>
              </li>
            </ul>
          </div>

          {/* Method 5 */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-indigo-600 mb-4">
              5. 🎯 Deliberate Practice for Weak Points
            </h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-indigo-500 mr-3 text-xl">•</span>
                <span><strong>Shadowing</strong> (repeat after native audio) for pronunciation</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-500 mr-3 text-xl">•</span>
                <span>Writing with corrections from natives (LangCorrect, HelloTalk)</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-500 mr-3 text-xl">•</span>
                <span>Grammar study <em>only when patterns confuse you</em>, not upfront</span>
              </li>
            </ul>
          </div>

          {/* Method 6 */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-indigo-600 mb-4">
              6. ⏰ Consistency &gt; Intensity
            </h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-indigo-500 mr-3 text-xl">•</span>
                <span><strong>30 min daily beats 4 hours on Saturday</strong></span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-500 mr-3 text-xl">•</span>
                <span>Make it a habit, not a project</span>
              </li>
            </ul>
          </div>

          {/* The Brutal Truth */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl shadow-xl p-8 border-2 border-yellow-300">
            <h2 className="text-3xl font-bold text-orange-600 mb-4">
              ⚡ The Brutal Truth
            </h2>
            <p className="text-gray-800 text-lg leading-relaxed mb-4">
              There's no magic method. The "best" learners just <strong>do more</strong> — more hours listening, 
              more awkward conversations, more reading. The method matters less than <strong>volume + consistency</strong>.
            </p>
            <p className="text-gray-700 italic">
              Most people quit because they optimize method instead of just putting in hours. 
              Pick <em>something</em> and stick with it.
            </p>
          </div>

          {/* Fastest Path */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl shadow-xl p-8 border-2 border-green-300">
            <h2 className="text-3xl font-bold text-green-600 mb-4">
              🚀 Fastest Path if Starting Today
            </h2>
            <ol className="space-y-3 text-gray-700 list-decimal list-inside">
              <li className="text-lg"><strong>Anki top 1000 words</strong> (15 min/day)</li>
              <li className="text-lg"><strong>Comprehensible input 1-2 hrs/day</strong> (YouTube, Netflix, podcasts)</li>
              <li className="text-lg"><strong>Speak with a tutor 3x/week</strong> (30 min sessions)</li>
              <li className="text-lg"><strong>Write daily journal entries</strong>, get corrections</li>
            </ol>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="mt-8 flex gap-4 justify-center">
          <Link href="/">
            <button className="bg-indigo-600 text-white font-bold py-4 px-8 rounded-xl hover:bg-indigo-700 shadow-lg transition">
              🎵 Back to Songs
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
