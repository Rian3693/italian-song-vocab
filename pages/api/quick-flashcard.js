import { saveFlashcards } from '../../lib/db';
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { word, sentence, songTitle, songId, language } = req.body;
  const selectedLanguage = language === 'spanish' ? 'spanish' : 'italian';
  const languageName = selectedLanguage === 'spanish' ? 'Spanish' : 'Italian';
  
  if (!word) return res.status(400).json({ error: 'Word is required' });
  
  try {
    console.log(`Creating quick flashcard for: ${word}`);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "system",
        content: `You are a ${languageName} teacher. Create a flashcard for the specific ${languageName} word provided. 
        Return ONLY a JSON object: 
        {"italian": "word in ${languageName}", "english": "translation", "example": "sentence in ${languageName}", "example_english": "translation", "ai_example": "new sentence in ${languageName}", "ai_example_english": "new translation"}`
      }, {
        role: "user",
        content: `Word: ${word}. Context where found: ${sentence}`
      }],
      temperature: 0.3
    });
    
    let cardData = JSON.parse(completion.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim());
    cardData.language = selectedLanguage;
    
    // Save to DB (associated with the same song for organization)
    saveFlashcards(songId || 0, [cardData], selectedLanguage);
    
    res.status(200).json({ success: true, card: cardData });
  } catch (error) {
    console.error('Quick Flashcard Error:', error);
    res.status(500).json({ error: 'Failed to create flashcard' });
  }
}
