import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * k6 load test — 500 concurrent students (exam day simulation).
 *
 * Usage:
 *   k6 run load-tests/k6-exam-load.js \
 *     -e BASE_URL=https://exam.yourcollege.edu.in \
 *     -e ATTEMPT_ID=uuid-of-test-attempt
 *
 * Stages ramp to 500 VUs with autosave + health check patterns.
 */
export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '3m', target: 300 },
    { duration: '5m', target: 500 },
    { duration: '5m', target: 500 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<2000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const ATTEMPT_ID = __ENV.ATTEMPT_ID || '00000000-0000-0000-0000-000000000001';
const AUTH_COOKIE = __ENV.AUTH_COOKIE || '';

const sampleAnswers = JSON.stringify({
  answers: { q1: { selected: 'A' }, q2: { selected: 'B' } },
  currentQuestionIndex: 3,
  timeRemaining: 1800,
});

export default function examDayFlow() {
  const headers = {
    'Content-Type': 'application/json',
    Cookie: AUTH_COOKIE,
  };

  const health = http.get(`${BASE_URL}/api/health`);
  check(health, {
    'health ok': (r) => r.status === 200,
    'health body': (r) => r.body.includes('"status"'),
  });

  if (AUTH_COOKIE) {
    const autosave = http.post(
      `${BASE_URL}/api/exam/attempts/${ATTEMPT_ID}/autosave`,
      sampleAnswers,
      { headers, tags: { name: 'autosave' } },
    );
    check(autosave, {
      'autosave not 5xx': (r) => r.status < 500,
    });
  }

  sleep(3);
}
