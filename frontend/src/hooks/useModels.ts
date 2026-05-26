import { useState, useEffect, useRef } from 'react';
import type { Model } from '../types/messages';

const ROUTER_MODELS: Model[] = [
  { name: 'backboard-router', provider: 'backboard', modelType: 'router', inputCostPer1mTokens: 0 },
  { name: 'backboard-router:fastest', provider: 'backboard', modelType: 'router', inputCostPer1mTokens: 0 },
  { name: 'backboard-router:cheapest', provider: 'backboard', modelType: 'router', inputCostPer1mTokens: 0 },
  { name: 'backboard-router:failover', provider: 'backboard', modelType: 'router', inputCostPer1mTokens: 0 },
];

const OFFLINE_FALLBACK_MODELS: Model[] = [
  ...ROUTER_MODELS,
  { name: 'claude-3-5-sonnet-20241022', provider: 'anthropic', modelType: 'chat' },
  { name: 'claude-3-7-sonnet-20250219', provider: 'anthropic', modelType: 'chat' },
  { name: 'gpt-4o', provider: 'openai', modelType: 'chat' },
  { name: 'gpt-4o-mini', provider: 'openai', modelType: 'chat' },
  { name: 'gemini-1.5-pro', provider: 'google', modelType: 'chat' },
  { name: 'gemini-1.5-flash', provider: 'google', modelType: 'chat' },
  { name: 'gemini-2.0-flash', provider: 'google', modelType: 'chat' },
  { name: 'gemini-2.0-flash-thinking', provider: 'google', modelType: 'chat' },
  { name: 'gemini-2.5-pro', provider: 'google', modelType: 'chat' },
  { name: 'google/gemma-2-9b-it:free', provider: 'openrouter', modelType: 'chat' },
  { name: 'meta/llama-3-8b-instruct:free', provider: 'openrouter', modelType: 'chat' },
  { name: 'mistralai/mistral-7b-instruct:free', provider: 'openrouter', modelType: 'chat' }
];

export function useModels(apiKey: string, onModelAutoSelect: (loadedModels: Model[]) => void) {
  const [models, setModels] = useState<Model[]>(OFFLINE_FALLBACK_MODELS);
  const [isUsingFallbackModels, setIsUsingFallbackModels] = useState(true);
  const [modelsFetchError, setModelsFetchError] = useState<string | null>(null);
  
  const onModelAutoSelectRef = useRef(onModelAutoSelect);
  useEffect(() => {
    onModelAutoSelectRef.current = onModelAutoSelect;
  }, [onModelAutoSelect]);

  useEffect(() => {
    if (!apiKey) {
      setModels(OFFLINE_FALLBACK_MODELS);
      setIsUsingFallbackModels(true);
      setModelsFetchError(null);
      return;
    }

    const host = window.location.hostname || 'localhost';
    const modelsUrl = `http://${host}:3001/api/models`;

    fetch(modelsUrl, {
      headers: { 'X-API-Key': apiKey }
    })
      .then(async (res) => {
        if (!res.ok) {
          try {
            const errData = await res.json();
            if (errData && errData.error) {
              throw new Error(errData.error);
            }
          } catch {
            // Ignored, throw generic error instead
          }
          throw new Error('API Key might be invalid or server returned an error');
        }
        return res.json();
      })
      .then((data) => {
        if (data.models && Array.isArray(data.models)) {
          setModels([...ROUTER_MODELS, ...data.models]);
          setIsUsingFallbackModels(false);
          setModelsFetchError(null);

          onModelAutoSelectRef.current(data.models);
        }
      })
      .catch((err) => {
        console.error('Failed to load models:', err);
        setModelsFetchError(err.message || String(err));
        setModels(OFFLINE_FALLBACK_MODELS);
        setIsUsingFallbackModels(true);
      });
  }, [apiKey]);

  return {
    models,
    isUsingFallbackModels,
    modelsFetchError
  };
}
