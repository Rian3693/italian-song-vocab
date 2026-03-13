const { updateFlashcard } = require('../../lib/db');
const { calculateNextReview, responseToQuality } = require('../../lib/sm2');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { cardId, response, currentCard } = req.body;
  
  if (!cardId || !response || !currentCard) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    // Convert user response to quality score
    const quality = responseToQuality(response);
    
    // Calculate next review using SM-2 algorithm
    const updated = calculateNextReview(quality, {
      repetitions: currentCard.repetitions,
      easeFactor: currentCard.ease_factor,
      interval: currentCard.interval
    });
    
    // Update database
    updateFlashcard(
      cardId,
      updated.repetitions,
      updated.easeFactor,
      updated.interval,
      updated.nextReview
    );
    
    res.status(200).json({
      success: true,
      nextReview: updated.nextReview,
      interval: updated.interval
    });
    
  } catch (error) {
    console.error('Error updating flashcard:', error);
    res.status(500).json({ error: 'Failed to update flashcard' });
  }
}
