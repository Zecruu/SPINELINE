import { useState, useEffect } from 'react';
import {
  GlobeAltIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const TimezoneSettings = ({ user }) => {
  const [settings, setSettings] = useState({
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12',
    autoDetectTimezone: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Common timezones
  const timezones = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
    { value: 'America/Puerto_Rico', label: 'Atlantic Time (Puerto Rico)' },
    { value: 'UTC', label: 'Coordinated Universal Time (UTC)' }
  ];

  const dateFormats = [
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/25/2024)' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (25/12/2024)' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-12-25)' },
    { value: 'MMM DD, YYYY', label: 'MMM DD, YYYY (Dec 25, 2024)' }
  ];

  // Fetch timezone settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      
      const response = await fetch('/api/settings/timezone', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (error) {
      console.error('Error fetching timezone settings:', error);
      setError('Failed to load timezone settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Auto-detect timezone
  useEffect(() => {
    if (settings.autoDetectTimezone) {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detectedTimezone !== settings.timezone) {
        setSettings(prev => ({
          ...prev,
          timezone: detectedTimezone
        }));
      }
    }
  }, [settings.autoDetectTimezone]);

  // Save settings
  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const token = localStorage.getItem('userToken');
      
      const response = await fetch('/api/settings/timezone', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error('Failed to save timezone settings');
      }

      setSuccess('Timezone settings saved successfully');
    } catch (error) {
      console.error('Error saving timezone settings:', error);
      setError('Failed to save timezone settings');
    } finally {
      setSaving(false);
    }
  };

  // Update setting
  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Get current time in selected timezone
  const getCurrentTime = () => {
    try {
      const now = new Date();
      const timeString = now.toLocaleString('en-US', {
        timeZone: settings.timezone,
        hour12: settings.timeFormat === '12',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      return timeString;
    } catch (error) {
      return 'Invalid timezone';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-gray-400 text-center">Loading timezone settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">Timezone Settings</h2>
          <p className="text-sm text-gray-400 mt-1">
            Configure timezone and date/time formatting for appointments and reports
          </p>
        </div>
        <button
          onClick={handleSaveSettings}
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

      {/* Current Time Display */}
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ClockIcon className="h-5 w-5 text-blue-400 mr-2" />
            <span className="text-blue-300 font-medium">Current Time:</span>
          </div>
          <div className="text-blue-200 font-mono text-lg">
            {getCurrentTime()}
          </div>
        </div>
      </div>

      {/* Timezone Settings */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center">
          <GlobeAltIcon className="h-5 w-5 mr-2" />
          Timezone Configuration
        </h3>

        <div className="space-y-4">
          <div>
            <label className="flex items-center mb-3">
              <input
                type="checkbox"
                checked={settings.autoDetectTimezone}
                onChange={(e) => updateSetting('autoDetectTimezone', e.target.checked)}
                className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-gray-300">
                Automatically detect timezone from browser
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Timezone
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => updateSetting('timezone', e.target.value)}
              disabled={settings.autoDetectTimezone}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {timezones.map(tz => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            {settings.autoDetectTimezone && (
              <p className="text-xs text-gray-400 mt-1">
                Timezone is automatically detected from your browser
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Date and Time Format */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-medium text-white mb-4">
          Date and Time Format
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Date Format
            </label>
            <select
              value={settings.dateFormat}
              onChange={(e) => updateSetting('dateFormat', e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {dateFormats.map(format => (
                <option key={format.value} value={format.value}>
                  {format.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Time Format
            </label>
            <select
              value={settings.timeFormat}
              onChange={(e) => updateSetting('timeFormat', e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="12">12-hour (2:30 PM)</option>
              <option value="24">24-hour (14:30)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Usage Information */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-medium text-white mb-4">
          Where These Settings Apply
        </h3>
        
        <div className="space-y-2 text-sm text-gray-300">
          <div className="flex items-start">
            <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <span>Appointment scheduling and display times</span>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <span>Audit reports and export timestamps</span>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <span>Patient checkout and billing records</span>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <span>System logs and activity tracking</span>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <span>Email notifications and reminders</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimezoneSettings;
