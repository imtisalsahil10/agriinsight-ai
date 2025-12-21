import React, { useState } from 'react';
import { Leaf, Upload, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { DiseaseAnalysis } from '../types';

interface DiseaseDetectionProps {
  language: 'en-US' | 'hi-IN';
  onAnalyze?: (image: string) => Promise<DiseaseAnalysis | null>;
}

const DiseaseDetection: React.FC<DiseaseDetectionProps> = ({ language, onAnalyze }) => {
  const isHindi = language === 'hi-IN';
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<DiseaseAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setAnalysis(null);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage || !onAnalyze) return;
    setLoading(true);
    try {
      const result = await onAnalyze(selectedImage);
      if (result) setAnalysis(result);
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in">
      <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-3xl p-8 text-white">
        <div className="flex items-center mb-3">
          <Leaf className="w-8 h-8 mr-3" />
          <h1 className="text-3xl font-bold">{isHindi ? "रोग पहचान" : "Disease Detection"}</h1>
        </div>
        <p className="text-red-100">{isHindi ? "अपनी फसल की तस्वीर अपलोड करें और रोग विश्लेषण प्राप्त करें" : "Upload a crop image to analyze for diseases and get treatment recommendations"}</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border-2 border-dashed border-gray-300 dark:border-slate-600 text-center transition-colors">
        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="disease-img" />
        <label htmlFor="disease-img" className="cursor-pointer">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="font-medium">{isHindi ? "तस्वीर अपलोड करें" : "Click to upload image"}</p>
        </label>
      </div>

      {selectedImage && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 md:col-span-1">
            <img src={selectedImage} alt="Preview" className="h-64 w-full object-cover rounded-xl" />
          </div>
          <div className="col-span-1 md:col-span-2 flex flex-col">
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:bg-gray-400 font-medium mb-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  {isHindi ? "विश्लेषण..." : "Analyzing..."}
                </>
              ) : (
                isHindi ? "विश्लेषण करें" : "Analyze Image"
              )}
            </button>
            {analysis && (
              <div className={`p-4 rounded-xl ${
                analysis.severity === 'high' ? 'bg-red-50 border-2 border-red-300' :
                analysis.severity === 'medium' ? 'bg-yellow-50 border-2 border-yellow-300' :
                'bg-green-50 border-2 border-green-300'
              }`}>
                <div className="flex items-center mb-2">
                  {analysis.severity === 'high' ? (
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  )}
                  <span className="font-bold">{analysis.disease}</span>
                </div>
                <p className="text-sm text-gray-700">{isHindi ? "गंभीरता:" : "Severity:"} {analysis.severity}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl">
            <h3 className="font-bold mb-2">{isHindi ? "लक्षण" : "Symptoms"}</h3>
            <ul className="space-y-1 text-sm">
              {analysis.symptoms.map((s, i) => <li key={i}>• {s}</li>)}
            </ul>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl">
            <h3 className="font-bold mb-2">{isHindi ? "जैविक उपचार" : "Organic Remedies"}</h3>
            <ul className="space-y-1 text-sm">
              {analysis.organicRemedies.map((r, i) => <li key={i}>• {r}</li>)}
            </ul>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl">
            <h3 className="font-bold mb-2">{isHindi ? "रासायनिक उपचार" : "Chemical Remedies"}</h3>
            <ul className="space-y-1 text-sm">
              {analysis.chemicalRemedies.map((r, i) => <li key={i}>• {r}</li>)}
            </ul>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl">
            <h3 className="font-bold mb-2">{isHindi ? "रोकथाम" : "Prevention Tips"}</h3>
            <ul className="space-y-1 text-sm">
              {analysis.preventionTips.map((p, i) => <li key={i}>• {p}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiseaseDetection;
