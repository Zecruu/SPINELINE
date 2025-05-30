import { useState, useEffect } from 'react';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

const ClinicScheduleSettings = ({ user }) => {
  const [schedule, setSchedule] = useState({
    monday: { isOpen: true, openTime: '08:00', closeTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
    tuesday: { isOpen: true, openTime: '08:00', closeTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
    wednesday: { isOpen: true, openTime: '08:00', closeTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
    thursday: { isOpen: true, openTime: '08:00', closeTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
    friday: { isOpen: true, openTime: '08:00', closeTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
    saturday: { isOpen: false, openTime: '09:00', closeTime: '14:00', breakStart: '', breakEnd: '' },
    sunday: { isOpen: false, openTime: '09:00', closeTime: '14:00', breakStart: '', breakEnd: '' }
  });
  const [holidays, setHolidays] = useState([]);
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const daysOfWeek = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ];

  // Fetch clinic schedule
  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      
      const response = await fetch('/api/settings/schedule', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.schedule) {
          setSchedule(data.schedule);
        }
        if (data.holidays) {
          setHolidays(data.holidays);
        }
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
      setError('Failed to load clinic schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  // Save schedule
  const handleSaveSchedule = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const token = localStorage.getItem('userToken');
      
      const response = await fetch('/api/settings/schedule', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ schedule, holidays })
      });

      if (!response.ok) {
        throw new Error('Failed to save schedule');
      }

      setSuccess('Clinic schedule saved successfully');
    } catch (error) {
      console.error('Error saving schedule:', error);
      setError('Failed to save clinic schedule');
    } finally {
      setSaving(false);
    }
  };

  // Update day schedule
  const updateDaySchedule = (day, field, value) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  // Add holiday
  const addHoliday = () => {
    if (!newHoliday.date || !newHoliday.name) {
      setError('Please enter both date and holiday name');
      return;
    }

    setHolidays(prev => [...prev, { ...newHoliday, id: Date.now() }]);
    setNewHoliday({ date: '', name: '' });
    setError('');
  };

  // Remove holiday
  const removeHoliday = (index) => {
    setHolidays(prev => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-gray-400 text-center">Loading clinic schedule...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">Clinic Schedule</h2>
          <p className="text-sm text-gray-400 mt-1">
            Configure operating hours and availability for appointments
          </p>
        </div>
        <button
          onClick={handleSaveSchedule}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-4 py-2 rounded-lg transition-colors"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
            <span className="text-green-300">{success}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <div className="flex items-center">
            <XCircleIcon className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-300">{error}</span>
          </div>
        </div>
      )}

      {/* Weekly Schedule */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center">
          <ClockIcon className="h-5 w-5 mr-2" />
          Weekly Operating Hours
        </h3>

        <div className="space-y-4">
          {daysOfWeek.map(({ key, label }) => (
            <div key={key} className="grid grid-cols-6 gap-4 items-center">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={schedule[key].isOpen}
                  onChange={(e) => updateDaySchedule(key, 'isOpen', e.target.checked)}
                  className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500 mr-2"
                />
                <label className="text-sm font-medium text-gray-300 w-20">
                  {label}
                </label>
              </div>

              {schedule[key].isOpen ? (
                <>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Open</label>
                    <input
                      type="time"
                      value={schedule[key].openTime}
                      onChange={(e) => updateDaySchedule(key, 'openTime', e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Close</label>
                    <input
                      type="time"
                      value={schedule[key].closeTime}
                      onChange={(e) => updateDaySchedule(key, 'closeTime', e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Break Start</label>
                    <input
                      type="time"
                      value={schedule[key].breakStart}
                      onChange={(e) => updateDaySchedule(key, 'breakStart', e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Break End</label>
                    <input
                      type="time"
                      value={schedule[key].breakEnd}
                      onChange={(e) => updateDaySchedule(key, 'breakEnd', e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              ) : (
                <div className="col-span-4 text-sm text-gray-500 italic">
                  Closed
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Holidays */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center">
          <CalendarDaysIcon className="h-5 w-5 mr-2" />
          Holidays & Block-out Days
        </h3>

        {/* Add Holiday */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
            <input
              type="date"
              value={newHoliday.date}
              onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Holiday Name</label>
            <input
              type="text"
              value={newHoliday.name}
              onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
              placeholder="e.g., Christmas Day"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={addHoliday}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
            >
              Add Holiday
            </button>
          </div>
        </div>

        {/* Holidays List */}
        {holidays.length > 0 ? (
          <div className="space-y-2">
            {holidays.map((holiday, index) => (
              <div key={index} className="flex justify-between items-center bg-gray-700 rounded p-3">
                <div>
                  <div className="text-white font-medium">{holiday.name}</div>
                  <div className="text-sm text-gray-400">
                    {new Date(holiday.date).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => removeHoliday(index)}
                  className="text-red-400 hover:text-red-300 px-2 py-1 rounded"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No holidays configured</p>
        )}
      </div>
    </div>
  );
};

export default ClinicScheduleSettings;
