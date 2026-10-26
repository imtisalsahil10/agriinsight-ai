import React, { useEffect, useRef, useState } from 'react';
import { t } from '../../lib/i18n';
import type { Language } from '../../types';

interface LeafCaptureProps {
  language: Language;
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

const LeafCapture: React.FC<LeafCaptureProps> = ({ language, onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        if (cancelled) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError(t(language, 'error_not_allowed')));
    return () => {
      cancelled = true;
      for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    };
  }, [language]);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setShot(canvas.toDataURL('image/jpeg', 0.92));
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t(language, 'voice_leaf')}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 w-full max-w-lg space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t(language, 'voice_leaf')}</h2>
          <button type="button" className="min-h-14 min-w-14 font-semibold" onClick={onClose}>{t(language, 'voice_close')}</button>
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {shot ? (
          <img src={shot} alt="" className="w-full rounded-2xl max-h-80 object-contain bg-black" />
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-2xl bg-black max-h-80" />
        )}
        <div className="flex gap-2">
          {shot ? (
            <>
              <button type="button" className="min-h-14 flex-1 rounded-2xl border font-semibold" onClick={() => setShot(null)}>{t(language, 'voice_retake')}</button>
              <button type="button" className="min-h-14 flex-1 rounded-2xl bg-agri-600 text-white font-semibold" onClick={() => onCapture(shot)}>{t(language, 'voice_use_photo')}</button>
            </>
          ) : (
            <button type="button" className="min-h-14 flex-1 rounded-2xl bg-agri-600 text-white font-semibold" onClick={capture}>{t(language, 'voice_capture')}</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeafCapture;
