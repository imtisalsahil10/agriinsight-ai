import React, { useState } from 'react';
import { Sprout, Loader2 } from 'lucide-react';
import DemoBadge from './voice/DemoBadge';
import { analyzeSoil } from '../lib/tools/soil';
import { SoilData } from '../types';

interface SoilAnalysisProps {
  language: 'en-US' | 'hi-IN';
}

const SoilAnalysis: React.FC<SoilAnalysisProps> = ({ language }) => {
  const isHindi = language === 'hi-IN';
  const [soilData, setSoilData] = useState<SoilData | null>(null);
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({ pH: 7, nitrogen: 50, phosphorus: 40, potassium: 300, organicMatter: 2 });

  const handleAnalyze = () => {
    setLoading(true);
    setSoilData(analyzeSoil(inputs).data);
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in">
      <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-3xl p-8 text-white">
        <div className="flex items-center mb-3">
          <Sprout className="w-8 h-8 mr-3" />
          <h1 className="text-3xl font-bold">{isHindi ? "मिट्टी विश्लेषण" : "Soil Analysis"}</h1>
        </div>
        <p className="text-green-100">{isHindi ? "अपनी मिट्टी के डेटा को दर्ज करें और सुधार सुझाव प्राप्त करें" : "Enter your soil data to get analysis and improvement recommendations"}</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 space-y-4 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">{isHindi ? "pH स्तर" : "pH Level"}</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="14"
              value={inputs.pH}
              onChange={(e) => setInputs({ ...inputs, pH: parseFloat(e.target.value) })}
              className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{isHindi ? "नाइट्रोजन (ppm)" : "Nitrogen (ppm)"}</label>
            <input
              type="number"
              value={inputs.nitrogen}
              onChange={(e) => setInputs({ ...inputs, nitrogen: parseFloat(e.target.value) })}
              className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{isHindi ? "फॉस्फोरस (ppm)" : "Phosphorus (ppm)"}</label>
            <input
              type="number"
              value={inputs.phosphorus}
              onChange={(e) => setInputs({ ...inputs, phosphorus: parseFloat(e.target.value) })}
              className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{isHindi ? "पोटेशियम (ppm)" : "Potassium (ppm)"}</label>
            <input
              type="number"
              value={inputs.potassium}
              onChange={(e) => setInputs({ ...inputs, potassium: parseFloat(e.target.value) })}
              className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{isHindi ? "जैविक पदार्थ (%)" : "Organic Matter (%)"}</label>
            <input
              type="number"
              step="0.1"
              value={inputs.organicMatter}
              onChange={(e) => setInputs({ ...inputs, organicMatter: parseFloat(e.target.value) })}
              className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
            />
          </div>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-gray-400 font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              {isHindi ? "विश्लेषण..." : "Analyzing..."}
            </>
          ) : (
            isHindi ? "विश्लेषण करें" : "Analyze"
          )}
        </button>
      </div>

      {soilData && (
        <div className="space-y-4">
          <DemoBadge language={language} />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl">
              <p className="text-xs text-gray-600 dark:text-gray-400">{isHindi ? "pH" : "pH"}</p>
              <p className="text-2xl font-bold text-blue-600">{soilData.pH}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-xl">
              <p className="text-xs text-gray-600 dark:text-gray-400">{isHindi ? "नाइट्रोजन" : "Nitrogen"}</p>
              <p className="text-2xl font-bold text-green-600">{soilData.nitrogen}</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-xl">
              <p className="text-xs text-gray-600 dark:text-gray-400">{isHindi ? "फॉस्फोरस" : "Phosphorus"}</p>
              <p className="text-2xl font-bold text-yellow-600">{soilData.phosphorus}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl space-y-4 transition-colors">
            <div>
              <h3 className="font-bold mb-2">{isHindi ? "अनुशंसित फसलें" : "Suitable Crops"}</h3>
              <div className="flex flex-wrap gap-2">
                {soilData.cropSuitability.map((crop, i) => (
                  <span key={i} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                    {crop}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-2">{isHindi ? "सुधार सिफारिशें" : "Recommendations"}</h3>
              <ul className="space-y-2">
                {soilData.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span className="text-sm">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SoilAnalysis;
