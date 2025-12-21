import React, { useState } from 'react';
import { Calendar, Loader2, CheckCircle } from 'lucide-react';
import { CropCalendarEntry } from '../types';

interface CropCalendarProps {
  language: 'en-US' | 'hi-IN';
}

const CropCalendar: React.FC<CropCalendarProps> = ({ language }) => {
  const isHindi = language === 'hi-IN';
  const [calendar, setCalendar] = useState<CropCalendarEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [cropType, setCropType] = useState('wheat');

  const resolvePrimaryCrop = (input: string) => {
    const parts = input.split(',').map((item) => item.trim()).filter(Boolean);
    return parts[0] || input || 'custom crop';
  };

  const handleGenerate = async () => {
    setLoading(true);
    setTimeout(() => {
      const primaryCrop = resolvePrimaryCrop(cropType).toLowerCase();
      const calendarData: { [key: string]: CropCalendarEntry } = {
        wheat: {
          cropType: 'Wheat',
          season: 'Rabi (Winter)',
          plantingDate: 'October 15 - November 30',
          harvestDate: 'March 15 - April 30',
          tasks: [
            { date: 'Oct 15', task: 'Field preparation', priority: 'high' },
            { date: 'Nov 1', task: 'Sowing', priority: 'high' },
            { date: 'Nov 15', task: 'First irrigation', priority: 'high' },
            { date: 'Dec 15', task: 'Weeding', priority: 'medium' },
            { date: 'Jan 15', task: 'Second irrigation', priority: 'high' },
            { date: 'Feb 15', task: 'Fertilizer application', priority: 'medium' },
            { date: 'Mar 15', task: 'Final irrigation', priority: 'high' },
            { date: 'Apr 1', task: 'Harvest', priority: 'high' },
          ]
        },
        rice: {
          cropType: 'Rice',
          season: 'Kharif (Monsoon)',
          plantingDate: 'June 1 - July 31',
          harvestDate: 'October 15 - November 30',
          tasks: [
            { date: 'May 1', task: 'Nursery preparation', priority: 'high' },
            { date: 'Jun 1', task: 'Transplanting', priority: 'high' },
            { date: 'Jul 15', task: 'Weeding', priority: 'medium' },
            { date: 'Aug 1', task: 'Drain for weeding', priority: 'medium' },
            { date: 'Sep 15', task: 'Drain for ripening', priority: 'medium' },
            { date: 'Oct 15', task: 'Harvesting starts', priority: 'high' },
          ]
        }
      };
      if (calendarData[primaryCrop]) {
        setCalendar(calendarData[primaryCrop]);
      } else {
        setCalendar({
          cropType: primaryCrop,
          season: 'Custom season',
          plantingDate: 'Based on local conditions',
          harvestDate: 'Based on maturity',
          tasks: [
            { date: 'Week 1', task: 'Field preparation', priority: 'high' },
            { date: 'Week 2', task: 'Sowing/transplanting', priority: 'high' },
            { date: 'Week 4', task: 'First irrigation', priority: 'high' },
            { date: 'Week 6', task: 'Nutrient application', priority: 'medium' },
            { date: 'Week 10', task: 'Pest scouting', priority: 'medium' },
            { date: 'Week 14', task: 'Harvest readiness checks', priority: 'high' }
          ]
        });
      }
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in">
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-8 text-white">
        <div className="flex items-center mb-3">
          <Calendar className="w-8 h-8 mr-3" />
          <h1 className="text-3xl font-bold">{isHindi ? "फसल कैलेंडर" : "Crop Calendar"}</h1>
        </div>
        <p className="text-indigo-100">{isHindi ? "अपनी फसल के लिए मौसमी कार्य योजना बनाएं" : "Plan seasonal activities for optimal crop management"}</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 space-y-4 transition-colors">
        <div>
          <label className="block text-sm font-medium mb-2">{isHindi ? "फसल का प्रकार (कॉमा से अलग करें)" : "Crop Type (comma-separated)"}</label>
          <input
            value={cropType}
            onChange={(e) => setCropType(e.target.value)}
            placeholder={isHindi ? "उदाहरण: गेहूँ, धान" : "e.g., wheat, rice"}
            className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-gray-400 font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              {isHindi ? "बनाई जा रही है..." : "Generating..."}
            </>
          ) : (
            isHindi ? "कैलेंडर बनाएं" : "Generate Calendar"
          )}
        </button>
      </div>

      {calendar && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-xl">
              <p className="text-xs text-gray-600 dark:text-gray-400">{isHindi ? "मौसम" : "Season"}</p>
              <p className="text-lg font-bold text-indigo-600">{calendar.season}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-xl">
              <p className="text-xs text-gray-600 dark:text-gray-400">{isHindi ? "कटाई" : "Harvest"}</p>
              <p className="text-lg font-bold text-purple-600">{calendar.harvestDate}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl transition-colors">
            <h3 className="font-bold mb-4">{isHindi ? "मासिक कार्य" : "Monthly Tasks"}</h3>
            <div className="space-y-3">
              {calendar.tasks.map((task, i) => (
                <div key={i} className="flex items-start p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-indigo-600 mr-3 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{task.task}</p>
                    <p className="text-xs text-gray-500">{task.date}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded whitespace-nowrap ml-2 ${
                    task.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CropCalendar;
