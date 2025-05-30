import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  HomeIcon,
  UsersIcon,
  CalendarIcon,
  DocumentTextIcon,
  CogIcon,
  ArrowRightOnRectangleIcon as LogoutIcon,
  Bars3Icon as MenuIcon,
  XMarkIcon as XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  ArrowsRightLeftIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

const SecretaryLayout = ({ children }) => {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navigation = [
    { name: "Today's Patients", href: '/secretary', icon: HomeIcon },
    { name: 'Patient Management', href: '/secretary/patients', icon: UsersIcon },
    { name: 'Appointments', href: '/secretary/appointments/scheduler', icon: CalendarIcon },
    { name: 'Appointment History', href: '/secretary/appointment-history', icon: CalendarDaysIcon },
    { name: 'Audit Records', href: '/secretary/audit-records', icon: ClipboardDocumentListIcon },
    { name: 'Reports', href: '/secretary/reports', icon: DocumentTextIcon },
    { name: 'Ledger', href: '/secretary/ledger', icon: CurrencyDollarIcon },
    { name: 'Import/Export', href: '/secretary/import-export', icon: ArrowsRightLeftIcon },
    { name: 'Settings', href: '/secretary/settings', icon: CogIcon },
  ];

  const isCurrentPage = (href) => {
    if (href === '/secretary') {
      return location.pathname === '/secretary';
    }
    return location.pathname.startsWith(href);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 bg-gray-800 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'} w-64`}>
        <div className="flex items-center justify-between h-16 px-4 bg-gray-900">
          <div className="flex items-center">
            {!sidebarCollapsed && (
              <h1 className="text-xl font-bold text-blue-400">SpineLine</h1>
            )}
            {sidebarCollapsed && (
              <h1 className="text-lg font-bold text-blue-400">SL</h1>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              className="hidden lg:block text-gray-400 hover:text-white"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? (
                <ChevronRightIcon className="h-5 w-5" />
              ) : (
                <ChevronLeftIcon className="h-5 w-5" />
              )}
            </button>
            <button
              className="lg:hidden text-gray-400 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <XIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-gray-700">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {user.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
            </div>
            {!sidebarCollapsed && (
              <div className="ml-3">
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-gray-400">Secretary • {user.clinicId}</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-4 px-2">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const current = isCurrentPage(item.href);

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    current
                      ? 'bg-blue-600 text-white shadow-lg border-l-4 border-blue-400'
                      : 'text-gray-300 hover:bg-gray-700/50 hover:text-white hover:border-l-4 hover:border-gray-600'
                  } ${sidebarCollapsed ? 'justify-center' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                  title={sidebarCollapsed ? item.name : ''}
                >
                  <Icon className={`${sidebarCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0 transition-colors ${
                    current ? 'text-blue-200' : 'text-gray-400 group-hover:text-gray-300'
                  }`} />
                  {!sidebarCollapsed && (
                    <span className="font-medium">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Logout button */}
        <div className="absolute bottom-0 w-full p-4">
          <button
            onClick={handleLogout}
            className={`group flex items-center w-full px-3 py-3 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}
            title={sidebarCollapsed ? 'Sign out' : ''}
          >
            <LogoutIcon className={`${sidebarCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
            {!sidebarCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="bg-gray-800 border-b border-gray-700 lg:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              className="text-gray-400 hover:text-white"
              onClick={() => setSidebarOpen(true)}
            >
              <MenuIcon className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-medium text-white">SpineLine</h1>
            <div className="w-6" /> {/* Spacer */}
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 overflow-auto">
          <div className="h-full">
            <div className="h-full px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SecretaryLayout;
