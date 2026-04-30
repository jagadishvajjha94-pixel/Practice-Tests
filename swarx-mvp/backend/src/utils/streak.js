const isSameDay = (a, b) =>
  a.getUTCFullYear() === b.getUTCFullYear() &&
  a.getUTCMonth() === b.getUTCMonth() &&
  a.getUTCDate() === b.getUTCDate();

const isYesterday = (lastDate, today) => {
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return isSameDay(lastDate, yesterday);
};

export const calculateNewStreak = (lastSubmissionDate) => {
  const today = new Date();
  if (!lastSubmissionDate) return 1;
  const last = new Date(lastSubmissionDate);
  if (isSameDay(last, today)) return null;
  if (isYesterday(last, today)) return "increment";
  return 1;
};
