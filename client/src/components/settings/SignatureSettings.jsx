import { useState, useEffect } from 'react';
import {
  PencilSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  ComputerDesktopIcon,
  DeviceTabletIcon
} from '@heroicons/react/24/outline';

const SignatureSettings = ({ user }) => {
  const [settings, setSettings] = useState({
    signatureRequired: 'required',
    defaultDeviceType: 'software',
    allowDeviceSelection: true,
    autoDetectHardware: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch signature settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      
      const response = await fetch('/api/settings/signature', {
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
      console.error('Error fetching signature settings:', error);
      setError('Failed to load signature settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Save settings
  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const token = localStorage.getItem('userToken');
      
      const response = await fetch('/api/settings/signature', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error('Failed to save signature settings');
      }

      setSuccess('Signature settings saved successfully');
    } catch (error) {
      console.error('Error saving signature settings:', error);
      setError('Failed to save signature settings');
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-gray-400 text-center">Loading signature settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">Signature Settings</h2>
          <p className="text-sm text-gray-400 mt-1">
            Configure signature capture requirements and device preferences
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

      {/* Signature Requirements */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center">
          <PencilSquareIcon className="h-5 w-5 mr-2" />
          Signature Requirements
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Signature Requirement Level
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="signatureRequired"
                  value="required"
                  checked={settings.signatureRequired === 'required'}
                  onChange={(e) => updateSetting('signatureRequired', e.target.value)}
                  className="text-blue-600 focus:ring-blue-500 bg-gray-700 border-gray-600"
                />
                <span className="ml-2 text-gray-300">
                  <span className="font-medium">Required</span> - Signature must be captured before checkout completion
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="signatureRequired"
                  value="optional"
                  checked={settings.signatureRequired === 'optional'}
                  onChange={(e) => updateSetting('signatureRequired', e.target.value)}
                  className="text-blue-600 focus:ring-blue-500 bg-gray-700 border-gray-600"
                />
                <span className="ml-2 text-gray-300">
                  <span className="font-medium">Optional</span> - Signature can be skipped if needed
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="signatureRequired"
                  value="disabled"
                  checked={settings.signatureRequired === 'disabled'}
                  onChange={(e) => updateSetting('signatureRequired', e.target.value)}
                  className="text-blue-600 focus:ring-blue-500 bg-gray-700 border-gray-600"
                />
                <span className="ml-2 text-gray-300">
                  <span className="font-medium">Disabled</span> - Signature capture is not available
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Device Settings */}
      {settings.signatureRequired !== 'disabled' && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center">
            <ComputerDesktopIcon className="h-5 w-5 mr-2" />
            Device Settings
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Default Device Type
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="defaultDeviceType"
                    value="software"
                    checked={settings.defaultDeviceType === 'software'}
                    onChange={(e) => updateSetting('defaultDeviceType', e.target.value)}
                    className="text-blue-600 focus:ring-blue-500 bg-gray-700 border-gray-600"
                  />
                  <DeviceTabletIcon className="h-5 w-5 ml-2 mr-2 text-gray-400" />
                  <span className="text-gray-300">
                    <span className="font-medium">Software Pad</span> - Touch/mouse signature on screen
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="defaultDeviceType"
                    value="hardware"
                    checked={settings.defaultDeviceType === 'hardware'}
                    onChange={(e) => updateSetting('defaultDeviceType', e.target.value)}
                    className="text-blue-600 focus:ring-blue-500 bg-gray-700 border-gray-600"
                  />
                  <ComputerDesktopIcon className="h-5 w-5 ml-2 mr-2 text-gray-400" />
                  <span className="text-gray-300">
                    <span className="font-medium">Hardware Pad</span> - External signature pad device
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.allowDeviceSelection}
                  onChange={(e) => updateSetting('allowDeviceSelection', e.target.checked)}
                  className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-300">
                  Allow users to choose between software and hardware signature pads
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.autoDetectHardware}
                  onChange={(e) => updateSetting('autoDetectHardware', e.target.checked)}
                  className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-300">
                  Automatically detect and connect to hardware signature pads
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Integration Information */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-medium text-white mb-4">
          Hardware Integration Information
        </h3>
        
        <div className="space-y-3 text-sm text-gray-300">
          <div className="bg-blue-900/20 border border-blue-700 rounded p-3">
            <p className="font-medium text-blue-300 mb-1">Supported Hardware:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-200">
              <li>ePadLink USB Signature Pads</li>
              <li>Wacom Signature Tablets</li>
              <li>Topaz Signature Pads</li>
              <li>Generic HID-compatible signature devices</li>
            </ul>
          </div>
          
          <div className="bg-yellow-900/20 border border-yellow-700 rounded p-3">
            <p className="font-medium text-yellow-300 mb-1">Setup Requirements:</p>
            <ul className="list-disc list-inside space-y-1 text-yellow-200">
              <li>Hardware drivers must be installed on the computer</li>
              <li>Browser must support WebHID API (Chrome, Edge)</li>
              <li>User must grant device access permissions</li>
              <li>For ePadLink devices, ePadLink software may be required</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignatureSettings;
