import { useState, useRef } from 'react';
import { Mic, Square, Sparkles, Volume2 } from 'lucide-react';

interface VoiceRecorderProps {
  disabled?: boolean;
  startVoiceStream: (mode: 'direct' | 'rant') => void;
  sendVoiceChunk: (base64Data: string) => void;
  stopVoiceStream: () => void;
}

export default function VoiceRecorder({
  disabled,
  startVoiceStream,
  sendVoiceChunk,
  stopVoiceStream
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [voiceMode, setVoiceMode] = useState<'direct' | 'rant'>('direct');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = (reader.result as string).split(',')[1];
            sendVoiceChunk(base64data);
          };
          reader.readAsDataURL(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stopVoiceStream();
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      startVoiceStream(voiceMode);

      mediaRecorder.start(500);
      setIsRecording(true);
    } catch (err) {
      console.error('[VoiceRecorder] Failed to start recording:', err);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleMode = () => {
    setVoiceMode(voiceMode === 'direct' ? 'rant' : 'direct');
  };

  return (
    <div className="voice-recorder-container" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      {isRecording ? (
        <button
          type="button"
          onClick={stopRecording}
          title="Stop Recording"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            border: 'none',
            background: 'var(--rose)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)',
            animation: 'pulse 1.5s infinite',
            marginBottom: '2px'
          }}
        >
          <Square size={10} fill="#ffffff" />
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            title="Record Voice"
            className="icon-btn"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1,
              marginBottom: '2px',
              flexShrink: 0
            }}
          >
            <Mic size={14} />
          </button>
          <button
            type="button"
            onClick={toggleMode}
            disabled={disabled}
            title={voiceMode === 'direct' ? 'As-Is (STT only)' : 'AI Optimize (refines speech)'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              padding: '1px 6px',
              fontSize: '9px',
              fontWeight: 600,
              background: voiceMode === 'rant'
                ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(168, 85, 247, 0.05))'
                : 'rgba(255, 255, 255, 0.04)',
              border: voiceMode === 'rant'
                ? '1px solid rgba(168, 85, 247, 0.3)'
                : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '4px',
              color: voiceMode === 'rant' ? 'rgb(168, 85, 247)' : 'var(--text-muted)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1,
              whiteSpace: 'nowrap',
              marginBottom: '2px',
              transition: 'all 0.15s'
            }}
          >
            {voiceMode === 'rant' ? <Sparkles size={9} /> : <Volume2 size={9} />}
            {voiceMode === 'direct' ? 'As-Is' : 'Optimize'}
          </button>
        </>
      )}
    </div>
  );
}
