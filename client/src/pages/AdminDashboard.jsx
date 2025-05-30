import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CreateClinicForm from '../components/admin/CreateClinicForm';
import CreateUserForm from '../components/admin/CreateUserForm';
import ClinicsTable from '../components/admin/ClinicsTable';
import UsersTable from '../components/admin/UsersTable';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [adminUser, setAdminUser] = useState(null);
  const [stats, setStats] = useState({
    totalClinics: 0,
    totalUsers: 0,
    activeClinics: 0,
    activeUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('adminToken');
    const user = localStorage.getItem('adminUser');
    
    if (!token || !user) {
      navigate('/secret-admin');
      return;
    }

    setAdminUser(JSON.parse(user));
    loadDashboardData();
  }, [navigate]);

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const [clinicsResponse, usersResponse] = await Promise.all([
        axios.get('/api/secret-admin/clinics', config),
        axios.get('/api/secret-admin/users', config)
      ]);

      const clinics = clinicsResponse.data.clinics || [];
      const users = usersResponse.data.users || [];

      setStats({
        totalClinics: clinics.length,
        totalUsers: users.length,
        activeClinics: clinics.filter(c => c.isActive).length,
        activeUsers: users.filter(u => u.isActive).length
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/secret-admin');
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'create-clinic', name: 'Create Clinic', icon: '🏥' },
    { id: 'create-user', name: 'Create User', icon: '👤' },
    { id: 'manage-clinics', name: 'Manage Clinics', icon: '🏢' },
    { id: 'manage-users', name: 'Manage Users', icon: '👥' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-400">SpineLine Admin</h1>
              <span className="ml-2 text-sm text-gray-400">Management Portal</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">Welcome, {adminUser?.name}</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-700 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-gray-800 rounded-lg p-6">
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">System Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gray-700 p-6 rounded-lg">
                  <div className="flex items-center">
                    <div className="text-3xl">🏥</div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-400">Total Clinics</p>
                      <p className="text-2xl font-bold text-white">{stats.totalClinics}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-700 p-6 rounded-lg">
                  <div className="flex items-center">
                    <div className="text-3xl">✅</div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-400">Active Clinics</p>
                      <p className="text-2xl font-bold text-green-400">{stats.activeClinics}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-700 p-6 rounded-lg">
                  <div className="flex items-center">
                    <div className="text-3xl">👥</div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-400">Total Users</p>
                      <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-700 p-6 rounded-lg">
                  <div className="flex items-center">
                    <div className="text-3xl">👤</div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-400">Active Users</p>
                      <p className="text-2xl font-bold text-green-400">{stats.activeUsers}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'create-clinic' && (
            <CreateClinicForm onSuccess={loadDashboardData} />
          )}

          {activeTab === 'create-user' && (
            <CreateUserForm onSuccess={loadDashboardData} />
          )}

          {activeTab === 'manage-clinics' && (
            <ClinicsTable onUpdate={loadDashboardData} />
          )}

          {activeTab === 'manage-users' && (
            <UsersTable onUpdate={loadDashboardData} />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
