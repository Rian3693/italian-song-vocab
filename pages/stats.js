import Link from 'next/link';
import { useState } from 'react';

export default function StatsPage({ stats, initialLimit }) {
  const [limit, setLimit] = useState(initialLimit || 15);
  const [saving, setSaving] = useState(false);

  const handleUpdateLimit = async (newLimit) => {
    const val = parseInt(newLimit);
    if (isNaN(val)) return;
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: val })
      });
      if (response.ok) {
        setLimit(val);
      }
    } catch (error) {
      console.error('Failed to update limit:', error);
    } finally {
      setSaving(false);
    }
  };

  const generateHeatmapData = () => {
    const data = [];
    
    // Start from March 13, 2026 (FIRST SQUARE = 13.03.2026)
    const startDate = new Date('2026-03-13T00:00:00'); 
    
    for (let i = 0; i < 365; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      data.push({
        date: dateStr,
        count: (stats && stats.reviewsByDate && stats.reviewsByDate[dateStr]) || 0,
        isFirstDay: i === 0, // Mark the very first square
      });
    }
    return data;
  };

  const heatmapData = generateHeatmapData();
  
  // Organize data into COLUMNS (vertical flow, then move right)
  const daysPerColumn = 10; // Height of each column
  const displayColumns = [];
  for (let i = 0; i < heatmapData.length; i += daysPerColumn) {
    displayColumns.push(heatmapData.slice(i, i + daysPerColumn));
  }

  // Simple color algorithm based on raw count
  const getColor = (count) => {
    if (!count || count === 0) return 'bg-gray-100';
    if (count < 10) return 'bg-green-200';
    if (count < 30) return 'bg-green-400';
    if (count < 50) return 'bg-green-600';
    if (count < 100) return 'bg-green-700';
    return 'bg-green-900';
  };

  if (!stats) return <div className="p-8 text-center">Loading stats...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/">
          <button className="mb-6 text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">
            ← Back to Home
          </button>
        </Link>

        <h1 className="text-4xl font-bold text-gray-800 mb-8">
          📊 Your Learning Statistics
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <p className="text-4xl font-bold text-indigo-600">{stats?.totalReviews || 0}</p>
            <p className="text-sm text-gray-600 mt-2">Total Reviews</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <p className="text-4xl font-bold text-green-600">{stats?.reviewsToday || 0}</p>
            <p className="text-sm text-gray-600 mt-2">Reviewed Today</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <p className="text-4xl font-bold text-purple-600">{stats?.newWordsToday || 0}</p>
            <div className="mt-2">
              <p className="text-sm text-gray-600">New Words Today</p>
              <div className="mt-3 flex flex-col items-center">
                <label className="text-[10px] text-gray-400 uppercase font-bold mb-1">Daily Limit</label>
                <input
                  type="number"
                  value={limit}
                  onChange={(e) => handleUpdateLimit(e.target.value)}
                  className="w-12 text-center border rounded py-1 text-sm font-bold text-gray-700"
                />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <p className="text-4xl font-bold text-orange-600">{stats?.streak || 0}</p>
            <p className="text-sm text-gray-600 mt-2">Day Streak 🔥</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <p className="text-4xl font-bold text-blue-600">{stats?.totalCards || 0}</p>
            <p className="text-sm text-gray-600 mt-2">Total Cards</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            📅 Review Heatmap
          </h2>

          {/* Vertical flow: each column goes DOWN, then moves RIGHT */}
          <div className="flex gap-1 overflow-x-auto">
            {displayColumns.map((column, colIdx) => (
              <div key={colIdx} className="flex flex-col gap-1">
                {column.map((day, dayIdx) => (
                  <div
                    key={dayIdx}
                    className={`w-3 h-3 rounded-sm ${getColor(day.count)} hover:ring-2 hover:ring-indigo-400 cursor-pointer transition-all relative ${
                      day.isFirstDay ? 'ring-2 ring-blue-500' : ''
                    }`}
                    title={`${day.date}: ${day.count} reviews${day.isFirstDay ? ' (START: 13.03.2026)' : ''}`}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm text-gray-600">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-gray-100 rounded-sm" />
              <div className="w-3 h-3 bg-green-200 rounded-sm" />
              <div className="w-3 h-3 bg-green-400 rounded-sm" />
              <div className="w-3 h-3 bg-green-600 rounded-sm" />
              <div className="w-3 h-3 bg-green-700 rounded-sm" />
              <div className="w-3 h-3 bg-green-900 rounded-sm" />
            </div>
            <span>More</span>
          </div>
          <p className="text-xs text-gray-500 mt-4 font-bold">
            🔵 Top-left square = 13.03.2026 (blue ring). Days flow DOWN ⬇️ then RIGHT ➡️
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            Color Scale: 0 → 1-9 → 10-29 → 30-49 → 50-99 → 100+ reviews
          </p>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  try {
    const { getReviewStats, getDailyNewWordsLimit } = require('../lib/db');
    const stats = getReviewStats();
    const initialLimit = getDailyNewWordsLimit();
    return { 
      props: { 
        stats: JSON.parse(JSON.stringify(stats || {})), 
        initialLimit: initialLimit || 15 
      } 
    };
  } catch (error) {
    return {
      props: {
        stats: { totalReviews: 0, streak: 0, reviewsToday: 0, newWordsToday: 0, totalCards: 0, reviewsByDate: {} },
        initialLimit: 15
      }
    };
  }
}
