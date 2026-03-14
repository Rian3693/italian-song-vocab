# Features to Restore from Original App

## What's Missing:
1. Song detail page with summary
2. Bilingual lyrics (Italian + English translation line-by-line)
3. Flashcard/Review system with spaced repetition
4. "Start Learning" button
5. Better home page UI
6. Language selection (Italian/Spanish)
7. Manual lyrics input option
8. Success messages with word count
9. All vocabulary cards view
10. Review statistics and heatmap

## Priority Order:
1. DONE: Basic auth + rate limiting
2. DONE: Stats page
3. DONE: Learning tips
4. TODO: Song detail page (most important!)
5. TODO: Review/flashcard system
6. TODO: Better UI on home page
7. TODO: All cards view

## Database Schema Additions Needed:
- `summary` TEXT column on songs table
- Maybe a `reviews` table for spaced repetition tracking
