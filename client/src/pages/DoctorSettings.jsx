import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DoctorLayout from '../components/doctor/DoctorLayout';
import SignatureCanvas from 'react-signature-canvas';
import {
  UserIcon,
  BellIcon,
  PencilIcon,
  CogIcon,
  ClockIcon,
  DocumentTextIcon,
  PhotoIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const DoctorSettings = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    title: '',
    specialty: '',
    phone: '',
    profilePic: null
  });
  const [notificationSettings, setNotificationSettings] = useState({
    emailAlerts: true,
    newPatientAlerts: true,
    flaggedPatientAlerts: true,
    appointmentReminders: true,
    systemUpdates: false
  });
  const [signatureData, setSignatureData] = useState({
    signatureImage: null,
    autoSign: false
  });
  const [defaultPreferences, setDefaultPreferences] = useState({
    defaultDuration: 15,
    defaultVisitType: 'Follow-Up',
    defaultTemplate: '',
    autoSaveNotes: true
  });
  const [credentials, setCredentials] = useState({
    npiNumber: '',
    businessNpiNumber: '',
    taxonomyCode: '',
    licenseState: '',
    isNpiVerified: false
  });

  const signatureRef = useRef(null);
  const navigate = useNavigate();

  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'credentials', label: 'Professional Credentials', icon: DocumentTextIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'signature', label: 'Digital Signature', icon: PencilIcon },
    { id: 'preferences', label: 'Visit Preferences', icon: CogIcon }
  ];

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('userToken');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'doctor') {
      navigate('/login');
      return;
    }

    setUser(parsedUser);
    loadSettings();
  }, [navigate]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');

      const response = await axios.get('/api/doctors/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const settings = response.data.settings;
        setProfileData(settings.profile || profileData);
        setNotificationSettings(settings.notifications || notificationSettings);
        setSignatureData(settings.signature || signatureData);
        setDefaultPreferences(settings.preferences || defaultPreferences);
        setCredentials(settings.credentials || credentials);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Use default values if API fails
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('userToken');

      const settingsData = {
        profile: profileData,
        notifications: notificationSettings,
        signature: signatureData,
        preferences: defaultPreferences,
        credentials: credentials
      };

      const response = await axios.put('/api/doctors/settings', settingsData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        alert('Settings saved successfully!');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleProfilePicUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profilePic', file);

    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.post('/api/doctors/profile-pic', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setProfileData(prev => ({ ...prev, profilePic: response.data.profilePicUrl }));
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Failed to upload profile picture');
    }
  };

  const handleSignatureUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('signature', file);

    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.post('/api/doctors/signature', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setSignatureData(prev => ({ ...prev, signatureImage: response.data.signatureUrl }));
      }
    } catch (error) {
      console.error('Error uploading signature:', error);
      alert('Failed to upload signature');
    }
  };

  // Save signature from canvas
  const saveSignature = async () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      alert('Please provide a signature first');
      return;
    }

    try {
      const signatureData = signatureRef.current.toDataURL();
      const token = localStorage.getItem('userToken');

      const response = await axios.patch(`/api/doctors/${user.userId}/signature`, {
        signature: signatureData
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSignatureData(prev => ({ ...prev, signatureImage: signatureData }));
        alert('Signature saved successfully!');
      }
    } catch (error) {
      console.error('Error saving signature:', error);
      alert('Failed to save signature');
    }
  };

  // Clear signature canvas
  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
  };

  // Load saved signature into canvas
  const loadSavedSignature = () => {
    if (signatureData.signatureImage && signatureRef.current) {
      signatureRef.current.fromDataURL(signatureData.signatureImage);
    }
  };

  // NPI validation function
  const validateNPI = (npi) => {
    // Remove any non-digits
    const cleanNPI = npi.replace(/\D/g, '');

    // Check if it's exactly 10 digits
    if (cleanNPI.length !== 10) {
      return false;
    }

    // Luhn algorithm check for NPI validation
    let sum = 0;
    let alternate = false;

    // Process digits from right to left
    for (let i = cleanNPI.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanNPI.charAt(i));

      if (alternate) {
        digit *= 2;
        if (digit > 9) {
          digit = (digit % 10) + 1;
        }
      }

      sum += digit;
      alternate = !alternate;
    }

    return (sum % 10) === 0;
  };

  const handleNPIChange = (value, field) => {
    // Remove any non-digits and limit to 10 characters
    const cleanValue = value.replace(/\D/g, '').slice(0, 10);

    setCredentials(prev => ({
      ...prev,
      [field]: cleanValue,
      isNpiVerified: field === 'npiNumber' ? validateNPI(cleanValue) : prev.isNpiVerified
    }));
  };

  const usStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'PR', 'RI',
    'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  const taxonomyCodes = [
    { code: '111N00000X', description: 'Chiropractor' },
    { code: '111NI0013X', description: 'Chiropractic Independent Medical Examiner' },
    { code: '111NI0900X', description: 'Chiropractic Internist' },
    { code: '111NN0400X', description: 'Chiropractic Neurology' },
    { code: '111NN1001X', description: 'Chiropractic Nutrition' },
    { code: '111NX0100X', description: 'Chiropractic Orthopedics' },
    { code: '111NX0800X', description: 'Chiropractic Pediatrics' },
    { code: '111NR0200X', description: 'Chiropractic Radiology' },
    { code: '111NS0005X', description: 'Chiropractic Sports Medicine' },
    { code: '225100000X', description: 'Physical Therapist' },
    { code: '2251C2600X', description: 'Physical Therapist - Cardiopulmonary' },
    { code: '2251E1300X', description: 'Physical Therapist - Electrophysiology' },
    { code: '2251G0304X', description: 'Physical Therapist - Geriatrics' },
    { code: '2251N0400X', description: 'Physical Therapist - Neurology' },
    { code: '2251X0800X', description: 'Physical Therapist - Orthopedic' },
    { code: '2251P0200X', description: 'Physical Therapist - Pediatrics' },
    { code: '2251S0007X', description: 'Physical Therapist - Sports' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-white">Profile Management</h3>

            {/* Profile Picture */}
            <div className="flex items-center space-x-6">
              <div className="relative">
                {profileData.profilePic ? (
                  <img
                    src={profileData.profilePic}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover border-4 border-gray-600"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-600 flex items-center justify-center">
                    <UserIcon className="h-10 w-10 text-gray-400" />
                  </div>
                )}
                <label className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-1 cursor-pointer hover:bg-blue-700">
                  <PhotoIcon className="h-4 w-4 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePicUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <div>
                <h4 className="text-white font-medium">Profile Picture</h4>
                <p className="text-gray-400 text-sm">Upload a professional photo</p>
              </div>
            </div>

            {/* Profile Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">First Name</label>
                <input
                  type="text"
                  value={profileData.firstName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Last Name</label>
                <input
                  type="text"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email</label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Phone</label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Title</label>
                <select
                  value={profileData.title}
                  onChange={(e) => setProfileData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Title</option>
                  <option value="Dr.">Dr.</option>
                  <option value="DC">DC</option>
                  <option value="PT">PT</option>
                  <option value="DPT">DPT</option>
                  <option value="MD">MD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Specialty</label>
                <select
                  value={profileData.specialty}
                  onChange={(e) => setProfileData(prev => ({ ...prev, specialty: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Specialty</option>
                  <option value="Chiropractic">Chiropractic</option>
                  <option value="Physical Therapy">Physical Therapy</option>
                  <option value="Sports Medicine">Sports Medicine</option>
                  <option value="Pain Management">Pain Management</option>
                  <option value="Rehabilitation">Rehabilitation</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'credentials':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Professional Credentials</h3>
              {credentials.isNpiVerified && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-green-900/30 text-green-400 rounded-full border border-green-700">
                  <CheckIcon className="h-4 w-4" />
                  <span className="text-sm">NPI Verified</span>
                </div>
              )}
            </div>
            <p className="text-gray-400 text-sm">
              Used for audits, compliance, and billing records. Required for insurance claim integration.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Doctor NPI Number */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Doctor NPI Number *
                  <span className="text-xs text-gray-500 block">10-digit numeric format required</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={credentials.npiNumber}
                    onChange={(e) => handleNPIChange(e.target.value, 'npiNumber')}
                    placeholder="1234567890"
                    maxLength={10}
                    className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white focus:outline-none focus:ring-2 ${
                      credentials.npiNumber && credentials.isNpiVerified
                        ? 'border-green-600 focus:ring-green-500'
                        : credentials.npiNumber && !credentials.isNpiVerified
                        ? 'border-red-600 focus:ring-red-500'
                        : 'border-gray-600 focus:ring-blue-500'
                    }`}
                  />
                  {credentials.npiNumber && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {credentials.isNpiVerified ? (
                        <CheckIcon className="h-5 w-5 text-green-400" />
                      ) : (
                        <XMarkIcon className="h-5 w-5 text-red-400" />
                      )}
                    </div>
                  )}
                </div>
                {credentials.npiNumber && !credentials.isNpiVerified && (
                  <p className="text-red-400 text-xs mt-1">Invalid NPI format</p>
                )}
              </div>

              {/* Business/LLC NPI Number */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Business/LLC NPI Number (Optional)
                  <span className="text-xs text-gray-500 block">If billing under a registered clinic or business</span>
                </label>
                <input
                  type="text"
                  value={credentials.businessNpiNumber}
                  onChange={(e) => handleNPIChange(e.target.value, 'businessNpiNumber')}
                  placeholder="1234567890"
                  maxLength={10}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Taxonomy Code */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Taxonomy Code (Optional)
                  <span className="text-xs text-gray-500 block">Healthcare provider taxonomy classification</span>
                </label>
                <select
                  value={credentials.taxonomyCode}
                  onChange={(e) => setCredentials(prev => ({ ...prev, taxonomyCode: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Taxonomy Code</option>
                  {taxonomyCodes.map((taxonomy) => (
                    <option key={taxonomy.code} value={taxonomy.code}>
                      {taxonomy.code} - {taxonomy.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* License State */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  License State
                  <span className="text-xs text-gray-500 block">State where you are licensed to practice</span>
                </label>
                <select
                  value={credentials.licenseState}
                  onChange={(e) => setCredentials(prev => ({ ...prev, licenseState: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select State</option>
                  {usStates.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Information Box */}
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <DocumentTextIcon className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-blue-300 font-medium text-sm">Important Information</h4>
                  <ul className="text-blue-200 text-sm mt-2 space-y-1">
                    <li>• NPI numbers are automatically linked to audit reports and checkout PDFs</li>
                    <li>• Verified credentials enable insurance claim integration</li>
                    <li>• Business NPI is used when billing under a clinic or group practice</li>
                    <li>• Taxonomy codes help identify your specialty for billing purposes</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-white">Notification Preferences</h3>
            <div className="space-y-4">
              {Object.entries(notificationSettings).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {getNotificationDescription(key)}
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        );

      case 'signature':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-white">Digital Signature Management</h3>
            <p className="text-gray-400 text-sm">
              Create and save your digital signature for use in patient visit documentation and checkout processes.
            </p>

            {/* Current Signature Display */}
            <div className="space-y-4">
              <div>
                <h4 className="text-white font-medium mb-2">Current Saved Signature</h4>
                {signatureData.signatureImage ? (
                  <div className="border border-gray-600 rounded-lg p-4 bg-white">
                    <img
                      src={signatureData.signatureImage}
                      alt="Digital Signature"
                      className="max-h-20 object-contain"
                    />
                  </div>
                ) : (
                  <div className="border border-gray-600 rounded-lg p-8 text-center">
                    <PencilIcon className="h-12 w-12 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400">No signature saved</p>
                  </div>
                )}
              </div>

              {/* Signature Canvas */}
              <div>
                <h4 className="text-white font-medium mb-2">Create New Signature</h4>
                <div className="border border-gray-600 rounded-lg bg-white">
                  <SignatureCanvas
                    ref={signatureRef}
                    penColor="black"
                    minWidth={1}
                    maxWidth={3}
                    velocityFilterWeight={0.7}
                    minDistance={3}
                    throttle={16}
                    canvasProps={{
                      width: 500,
                      height: 150,
                      className: 'signature-canvas',
                      style: {
                        border: 'none',
                        display: 'block',
                        cursor: 'crosshair'
                      }
                    }}
                    backgroundColor="white"
                    clearOnResize={false}
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <div className="flex space-x-2">
                    <button
                      onClick={clearSignature}
                      className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                    >
                      Clear
                    </button>
                    <button
                      onClick={loadSavedSignature}
                      disabled={!signatureData.signatureImage}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Load Saved
                    </button>
                  </div>
                  <button
                    onClick={saveSignature}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Save Signature
                  </button>
                </div>
              </div>

              {/* File Upload Option */}
              <div>
                <h4 className="text-white font-medium mb-2">Or Upload Signature Image</h4>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer">
                    <PhotoIcon className="h-4 w-4 mr-2" />
                    Choose File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSignatureUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-gray-400 text-sm">PNG, JPG up to 2MB</span>
                </div>
              </div>

              {/* Auto-sign Option */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Auto-apply Signature</div>
                  <div className="text-gray-400 text-sm">Automatically use saved signature when completing visits</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={signatureData.autoSign}
                    onChange={(e) => setSignatureData(prev => ({ ...prev, autoSign: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-white">Default Visit Preferences</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Default Visit Duration (minutes)</label>
                <select
                  value={defaultPreferences.defaultDuration}
                  onChange={(e) => setDefaultPreferences(prev => ({ ...prev, defaultDuration: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={15}>15 minutes</option>
                  <option value={20}>20 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Default Visit Type</label>
                <select
                  value={defaultPreferences.defaultVisitType}
                  onChange={(e) => setDefaultPreferences(prev => ({ ...prev, defaultVisitType: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Initial Consultation">Initial Consultation</option>
                  <option value="Follow-Up">Follow-Up</option>
                  <option value="Re-evaluation">Re-evaluation</option>
                  <option value="Treatment">Treatment</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Default SOAP Template</label>
                <select
                  value={defaultPreferences.defaultTemplate}
                  onChange={(e) => setDefaultPreferences(prev => ({ ...prev, defaultTemplate: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No default template</option>
                  <option value="general">General Consultation</option>
                  <option value="followup">Follow-up Visit</option>
                  <option value="initial">Initial Assessment</option>
                  <option value="maintenance">Maintenance Care</option>
                </select>
              </div>

              <div className="flex items-center">
                <div>
                  <div className="text-white font-medium">Auto-save Notes</div>
                  <div className="text-gray-400 text-sm">Automatically save SOAP notes as you type</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-auto">
                  <input
                    type="checkbox"
                    checked={defaultPreferences.autoSaveNotes}
                    onChange={(e) => setDefaultPreferences(prev => ({ ...prev, autoSaveNotes: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        );

      default:
        return <div className="text-white">Content for {activeTab}</div>;
    }
  };

  const getNotificationDescription = (key) => {
    const descriptions = {
      emailAlerts: 'Receive email notifications for important events',
      newPatientAlerts: 'Get notified when new patients are added',
      flaggedPatientAlerts: 'Alerts for patients with special flags or conditions',
      appointmentReminders: 'Reminders for upcoming appointments',
      systemUpdates: 'Notifications about system updates and maintenance'
    };
    return descriptions[key] || '';
  };

  if (loading) {
    return (
      <DoctorLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DoctorLayout>
    );
  }

  return (
    <DoctorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="text-gray-400">Configure your preferences and account settings</p>
          </div>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckIcon className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-gray-800 rounded-lg p-6">
          {renderTabContent()}
        </div>
      </div>
    </DoctorLayout>
  );
};

export default DoctorSettings;
