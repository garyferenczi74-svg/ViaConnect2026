'use client';
import { useState, useCallback } from 'react';

interface CompletionResult {
  success: boolean; vitality_score: number; recommendations_count: number;
  recommendations: Array<{ product_name: string; reason: string; confidence_score: number; dosage: string; time_of_day: string; monthly_price: number; priority_rank: number; }>;
}

export function useCAQCompletion() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompletionResult | null>(null);

  const completeAssessment = useCallback(async (assessmentId?: string): Promise<CompletionResult | null> => {
    setIsProcessing(true); setError(null);
    try {
      const res = await fetch('/api/recommendations/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessment_id: assessmentId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      const data: CompletionResult = await res.json();
      setResult(data); return data;
    } catch (err: any) { setError(err.message); return null; }
    finally { setIsProcessing(false); }
  }, []);

  return { completeAssessment, isProcessing, error, result };
}
