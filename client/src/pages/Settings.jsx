import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SecretaryLayout from '../components/secretary/SecretaryLayout';
import {
  CogIcon,
  UsersIcon,
  UserIcon,
  DocumentTextIcon,
  CubeIcon,
  ClockIcon,
  PencilSquareIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

// Import individual settings components
import UsersRolesSettings from '../components/settings/UsersRolesSettings';
import ProvidersSettings from '../components/settings/ProvidersSettings';
import BillingCodesSettings from '../components/settings/BillingCodesSettings';
import CarePackagesSettings from '../components/settings/CarePackagesSettings';
import ClinicScheduleSettings from '../components/settings/ClinicScheduleSettings';
import SignatureSettings from '../components/settings/SignatureSettings';
import TimezoneSettings from '../components/settings/TimezoneSettings';

const Settings = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('userToken');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    
    // Check if user is secretary or doctor
    if (parsedUser.role !== 'secretary' && parsedUser.role !== 'doctor') {
      navigate('/login');
      return;
    }

    setUser(parsedUser);
    setLoading(false);
  }, [navigate]);

  const settingsTabs = [
    {
      id: 'users',
      name: 'Users & Roles',
      icon: UsersIcon,
      description: 'Manage clinic users and their roles'
    },
    {
      id: 'providers',
      name: 'Providers',
      icon: UserIcon,
      description: 'Add and manage healthcare providers'
    },
    {
      id: 'billing',
      name: 'Billing Codes',
      icon: DocumentTextIcon,
      description: 'Manage service codes and rates'
    },
    {
      id: 'packages',
      name: 'Care Packages',
      icon: CubeIcon,
      description: 'Create and manage care packages'
    },
    {
      id: 'schedule',
      name: 'Clinic Schedule',
      icon: ClockIcon,
      description: 'Configure operating hours and availability'
    },
    {
      id: 'signature',
      name: 'Signature',
      icon: PencilSquareIcon,
      description: 'Configure signature capture settings'
    },
    {
      id: 'timezone',
      name: 'Timezone',
      icon: GlobeAltIcon,
      description: 'Set default timezone for appointments'
    }
  ];

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'users':
        return <UsersRolesSettings user={user} />;
      case 'providers':
        return <ProvidersSettings user={user} />;
      case 'billing':
        return <BillingCodesSettings user={user} />;
      case 'packages':
        return <CarePackagesSettings user={user} />;
      case 'schedule':
        return <ClinicScheduleSettings user={user} />;
      case 'signature':
        return <SignatureSettings user={user} />;
      case 'timezone':
        return <TimezoneSettings user={user} />;
      default:
        return <UsersRolesSettings user={user} />;
    }
  };

  if (loading) {
    return (
      <SecretaryLayout>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </SecretaryLayout>
    );
  }

  return (
    <SecretaryLayout>
      <div className="h-full bg-gray-900">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center space-x-3">
            <CogIcon className="h-8 w-8 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Settings</h1>
              <p className="text-sm text-gray-400">
                Manage clinic configuration and preferences for {user?.clinicId}
              </p>
            </div>
          </div>
        </div>

        <div className="flex h-full">
          {/* Settings Navigation Sidebar */}
          <div className="w-80 bg-gray-800 border-r border-gray-700 overflow-y-auto">
            <div className="p-4">
              <nav className="space-y-2">
                {settingsTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full text-left p-4 rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-lg border-l-4 border-blue-400'
                          : 'text-gray-300 hover:bg-gray-700/50 hover:text-white hover:border-l-4 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                          isActive ? 'text-blue-200' : 'text-gray-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium ${
                            isActive ? 'text-white' : 'text-gray-300'
                          }`}>
                            {tab.name}
                          </div>
                          <div className={`text-sm mt-1 ${
                            isActive ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {tab.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Settings Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {renderActiveTabContent()}
            </div>
          </div>
        </div>
      </div>
    </SecretaryLayout>
  );
};

export default Settings;
