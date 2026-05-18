/** Short spoken lines — full feedback stays in the chat UI only. */

export function spokenAck(score: number): string {
  if (score >= 88) return 'Excellent.';
  if (score >= 76) return 'Great answer.';
  if (score >= 64) return 'Good point.';
  if (score >= 52) return 'Thanks.';
  return 'Got it.';
}

export function spokenAfterAnswer(score: number, nextQuestion: string): string {
  return `${spokenAck(score)} ${nextQuestion}`;
}

export function spokenClosing(score: number): string {
  return `${spokenAck(score)} Interview complete. Well done.`;
}

export function spokenIntro(firstQuestion: string): string {
  return `Hi, I am your interviewer. ${firstQuestion}`;
}
