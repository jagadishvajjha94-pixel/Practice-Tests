// Modular dummy AI evaluator; can be replaced by OpenAI integration later.
export const analyzeSpeakingText = async (text) => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
  const sentenceCount = Math.max(1, text.split(/[.!?]/).filter((s) => s.trim()).length);
  const avgSentenceLength = words.length / sentenceCount;

  const grammarSuggestions = [];
  const vocabularyImprovements = [];
  const confidenceTips = [];

  if (!/[.!?]$/.test(text.trim())) grammarSuggestions.push("Try ending responses with clear punctuation.");
  if (avgSentenceLength > 22) grammarSuggestions.push("Use shorter sentences for clarity.");
  if (uniqueWords.size < words.length * 0.6) vocabularyImprovements.push("Use a wider range of vocabulary.");
  if (words.length < 40) confidenceTips.push("Expand answers with examples to sound more confident.");
  if (!/\b(I|my|me)\b/i.test(text)) confidenceTips.push("Use first-person examples to make your response stronger.");

  const scoreBase = Math.min(10, Math.max(1, Math.round((uniqueWords.size / Math.max(words.length, 1)) * 12)));
  const overallScore = Math.min(
    10,
    Math.max(1, scoreBase + (grammarSuggestions.length === 0 ? 1 : 0) + (words.length > 80 ? 1 : 0))
  );

  return {
    grammarSuggestions: grammarSuggestions.length ? grammarSuggestions : ["Grammar looks good for this response."],
    vocabularyImprovements: vocabularyImprovements.length
      ? vocabularyImprovements
      : ["Vocabulary usage is solid. Add one advanced synonym to improve further."],
    confidenceTips: confidenceTips.length ? confidenceTips : ["Delivery is clear. Keep practicing with timed responses."],
    overallScore,
  };
};
