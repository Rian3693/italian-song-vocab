/**
 * SM-2 Spaced Repetition Algorithm
 * (Same algorithm used by Anki)
 * 
 * @param {number} quality - User's response quality (0-5)
 *   0 - Complete blackout
 *   1 - Incorrect, but familiar
 *   2 - Incorrect, but close
 *   3 - Correct with difficulty
 *   4 - Correct with hesitation
 *   5 - Perfect recall
 * 
 * @param {object} card - Current flashcard state
 * @returns {object} Updated card state
 */
function calculateNextReview(quality, card) {
  let { repetitions = 0, easeFactor = 2.5, interval = 0 } = card;
  
  // Quality must be 0-5
  quality = Math.max(0, Math.min(5, quality));
  
  // If quality < 3, reset the card
  if (quality < 3) {
    repetitions = 0;
    interval = 0;
  } else {
    // Increase repetition count
    repetitions += 1;
    
    // Calculate new interval
    if (repetitions === 1) {
      interval = 1; // 1 day
    } else if (repetitions === 2) {
      interval = 6; // 6 days
    } else {
      interval = Math.round(interval * easeFactor);
    }
  }
  
  // Update ease factor
  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  
  // Calculate next review date
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);
  
  return {
    repetitions,
    easeFactor,
    interval,
    nextReview: nextReview.toISOString()
  };
}

/**
 * Map user input to quality score
 * @param {string} response - "again" | "hard" | "good" | "easy"
 */
function responseToQuality(response) {
  const map = {
    'again': 0,
    'hard': 3,
    'good': 4,
    'easy': 5
  };
  return map[response] || 3;
}

module.exports = {
  calculateNextReview,
  responseToQuality
};
