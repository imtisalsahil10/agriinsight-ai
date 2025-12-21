import React, { useState } from 'react';
import { Droplets, Loader2 } from 'lucide-react';
import { IrrigationSchedule } from '../types';

interface IrrigationScheduleComponentProps {
  language: 'en-US' | 'hi-IN';
}

const IrrigationScheduleView: React.FC<IrrigationScheduleComponentProps> = ({ language }) => {
  const isHindi = language === 'hi-IN';
  const [schedule, setSchedule] = useState<IrrigationSchedule | null>(null);
  const [loading, setLoading] = useState(false);
  const [cropType, setCropType] = useState('wheat');

  const resolvePrimaryCrop = (input: string) => {
    const parts = input.split(',').map((item) => item.trim()).filter(Boolean);
    return parts[0] || input || 'custom crop';
  };

  const handleGenerate = async () => {
    setLoading(true);
    const primaryCrop = resolvePrimaryCrop(cropType);
    setTimeout(() => {
      setSchedule({
        cropType: primaryCrop,
        nextIrrigationDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        waterAmount: '5-6 cm',
        frequency: 'Every 7-10 days',
        savingTips: [
          'Use drip irrigation to save 40% water',
          'Water early morning to reduce evaporation',
          'Mulch soil to retain moisture',
          'Monitor soil moisture before each irrigation'
        ]
      });
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-3xl p-8 text-white">
        <div className="flex items-center mb-3">
          <Droplets className="w-8 h-8 mr-3" />
          <h1 className="text-3xl font-bold">{isHindi ? "सिंचाई अनुसूची" : "Irrigation Schedule"}</h1>
        </div>
        <p className="text-blue-100">{isHindi ? "अपनी फसल के लिए बुद्धिमान सिंचाई योजना प्राप्त करें" : "Get an intelligent irrigation plan based on your crop and weather"}</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 space-y-4 transition-colors">
        <div>
          <label className="block text-sm font-medium mb-2">{isHindi ? "फसल का प्रकार (कॉमा से अलग करें)" : "Crop Type (comma-separated for multiple)"}</label>
          <input
            value={cropType}
            onChange={(e) => setCropType(e.target.value)}
            placeholder={isHindi ? "उदाहरण: गेहूँ, चावल" : "e.g., wheat, rice"}
            className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-400 font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              {isHindi ? "योजना बनाई जा रही है..." : "Generating..."}
            </>
          ) : (
            isHindi ? "योजना बनाएं" : "Generate Schedule"
          )}
        </button>
      </div>

      {schedule && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl">
              <p className="text-xs text-gray-600 dark:text-gray-400">{isHindi ? "अगली सिंचाई" : "Next Irrigation"}</p>
              <p className="text-xl font-bold text-blue-600">{schedule.nextIrrigationDate}</p>
            </div>
            <div className="bg-cyan-50 dark:bg-cyan-900/30 p-4 rounded-xl">
              <p className="text-xs text-gray-600 dark:text-gray-400">{isHindi ? "जल की मात्रा" : "Water Amount"}</p>
              <p className="text-xl font-bold text-cyan-600">{schedule.waterAmount}</p>
            </div>
            <div className="bg-teal-50 dark:bg-teal-900/30 p-4 rounded-xl">
              <p className="text-xs text-gray-600 dark:text-gray-400">{isHindi ? "आवृत्ति" : "Frequency"}</p>
              <p className="text-xl font-bold text-teal-600">{schedule.frequency}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl transition-colors">
            <h3 className="font-bold mb-4">{isHindi ? "जल बचत सुझाव" : "Water Saving Tips"}</h3>
            <div className="space-y-3">
              {schedule.savingTips.map((tip, i) => (
                <div key={i} className="flex items-start p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-blue-600 mr-3 font-bold">💧</span>
                  <p className="text-sm">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IrrigationScheduleView;
