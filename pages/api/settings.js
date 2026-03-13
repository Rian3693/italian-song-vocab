import {
  getDailyNewWordsLimit,
  setDailyNewWordsLimit,
  getSelectedLanguage,
  setSelectedLanguage
} from '../../lib/db';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const limit = getDailyNewWordsLimit();
    const language = getSelectedLanguage();
    return res.status(200).json({ limit, language });
  }
  
  if (req.method === 'POST') {
    const { limit, language } = req.body;
    const hasLimit = limit !== undefined;
    const hasLanguage = language !== undefined;

    if (!hasLimit && !hasLanguage) {
      return res.status(400).json({ error: 'No setting provided' });
    }
    
    if (hasLimit && isNaN(parseInt(limit))) {
      return res.status(400).json({ error: 'Invalid limit' });
    }

    if (hasLanguage && !['italian', 'spanish'].includes(language)) {
      return res.status(400).json({ error: 'Invalid language' });
    }
    
    if (hasLimit) {
      setDailyNewWordsLimit(limit);
    }
    if (hasLanguage) {
      setSelectedLanguage(language);
    }

    return res.status(200).json({
      success: true,
      limit: hasLimit ? parseInt(limit) : getDailyNewWordsLimit(),
      language: hasLanguage ? language : getSelectedLanguage()
    });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
