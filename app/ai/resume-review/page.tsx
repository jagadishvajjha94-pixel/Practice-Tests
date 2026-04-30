'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ReviewResult {
  overallScore: number;
  strengths: string[];
  improvements: string[];
  suggestions: string[];
  recommendations: string[];
}

export default function ResumeReviewPage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setResult(null);
    }
  };

  const handleReview = async () => {
    if (!uploadedFile) {
      alert('Please upload a resume file');
      return;
    }

    setReviewing(true);

    // Simulate AI review (mock response)
    setTimeout(() => {
      const mockResult: ReviewResult = {
        overallScore: 78,
        strengths: [
          'Clear structure with well-organized sections',
          'Relevant work experience and achievements highlighted',
          'Good use of action verbs and quantifiable results',
          'Professional formatting and layout',
        ],
        improvements: [
          'Add more technical skills section',
          'Include certifications and online courses',
          'Expand on quantifiable achievements',
          'Improve keyword optimization for ATS',
        ],
        suggestions: [
          'Add a professional summary at the top',
          'Include links to GitHub/portfolio projects',
          'Use more industry-specific keywords',
          'Add metrics for each accomplishment',
        ],
        recommendations: [
          'Take online courses in emerging technologies',
          'Work on building a strong GitHub profile',
          'Participate in open-source projects',
          'Build a portfolio website showcasing projects',
        ],
      };

      setResult(mockResult);
      setReviewing(false);
    }, 2000);
  };

  const downloadReport = () => {
    if (!result) return;

    const reportText = `
RESUME ANALYSIS REPORT
${new Date().toLocaleDateString()}

OVERALL SCORE: ${result.overallScore}/100

STRENGTHS:
${result.strengths.map(s => `• ${s}`).join('\n')}

AREAS FOR IMPROVEMENT:
${result.improvements.map(i => `• ${i}`).join('\n')}

SUGGESTIONS:
${result.suggestions.map(s => `• ${s}`).join('\n')}

RECOMMENDATIONS:
${result.recommendations.map(r => `• ${r}`).join('\n')}
    `;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(reportText));
    element.setAttribute('download', 'resume-report.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">AI Resume Review</h1>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {!result ? (
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Upload Your Resume</h2>
            <p className="text-gray-600 mb-6">
              Get AI-powered feedback on your resume. Our system analyzes your resume for strengths, improvements, and personalized recommendations.
            </p>

            <div className="mb-6 p-8 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50 text-center">
              <label className="cursor-pointer">
                <div className="text-4xl mb-3">📄</div>
                <p className="text-lg font-semibold text-gray-900 mb-2">
                  {uploadedFile ? uploadedFile.name : 'Click to upload or drag and drop'}
                </p>
                <p className="text-sm text-gray-600 mb-4">PDF, DOC, or DOCX up to 10MB</p>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            <Button
              onClick={handleReview}
              disabled={!uploadedFile || reviewing}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 font-semibold mb-4"
            >
              {reviewing ? 'Analyzing Your Resume...' : 'Get AI Review'}
            </Button>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-900">
                <strong>How it works:</strong> Our AI analyzes your resume for structure, content, keywords, and formatting. You'll get a detailed score and personalized recommendations.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Score Card */}
            <Card className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Review Results</h2>
                <Button
                  onClick={downloadReport}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Download Report
                </Button>
              </div>

              <div className="flex items-center gap-8 mb-8">
                <div className="flex-shrink-0">
                  <div className="text-7xl font-bold text-blue-600">{result.overallScore}</div>
                  <p className="text-gray-600 text-center">out of 100</p>
                </div>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all"
                      style={{ width: `${result.overallScore}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {result.overallScore >= 80
                      ? 'Excellent! Your resume is well-structured.'
                      : result.overallScore >= 60
                      ? 'Good! Your resume has strong foundations.'
                      : 'There are several areas for improvement.'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Strengths */}
            <Card className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">✓</span> Strengths
              </h3>
              <ul className="space-y-2">
                {result.strengths.map((strength, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-700">
                    <span className="text-green-600 font-bold mt-1">✓</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </Card>

            {/* Improvements */}
            <Card className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">⚠</span> Areas for Improvement
              </h3>
              <ul className="space-y-2">
                {result.improvements.map((improvement, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-700">
                    <span className="text-yellow-600 font-bold mt-1">→</span>
                    {improvement}
                  </li>
                ))}
              </ul>
            </Card>

            {/* Suggestions */}
            <Card className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">💡</span> Actionable Suggestions
              </h3>
              <ul className="space-y-2">
                {result.suggestions.map((suggestion, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-700">
                    <span className="text-blue-600 font-bold mt-1">→</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </Card>

            {/* Recommendations */}
            <Card className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">🎯</span> Next Steps
              </h3>
              <ul className="space-y-2">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-700">
                    <span className="text-purple-600 font-bold mt-1">→</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </Card>

            <div className="flex gap-4">
              <Button
                onClick={() => {
                  setResult(null);
                  setUploadedFile(null);
                }}
                variant="outline"
                className="flex-1"
              >
                Review Another Resume
              </Button>
              <Link href="/ai/mock-interview" className="flex-1">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  Try Mock Interview
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
