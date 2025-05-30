import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  HomeIcon,
  UsersIcon,
  DocumentTextIcon,
  CogIcon,
  ArrowRightOnRectangleIcon as LogoutIcon,
  Bars3Icon as MenuIcon,
  XMarkIcon as XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  ArrowLeftIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

const DoctorLayout = ({ children, flowMode = false, onBackToPatients }) => {
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

  // Regular navigation for doctor portal
  const regularNavigation = [
    { name: "Today's Patients", href: '/doctor', icon: HomeIcon },
    { name: 'Scheduler', href: '/doctor/scheduler', icon: CalendarIcon },
    { name: 'Patient Visits', href: '/doctor/visits', icon: UsersIcon },
    { name: 'Templates', href: '/doctor/templates', icon: DocumentTextIcon },
    { name: 'Reports', href: '/doctor/reports', icon: ClipboardDocumentListIcon },
    { name: 'Settings', href: '/doctor/settings', icon: CogIcon },
  ];

  // Flow mode navigation for patient flow
  const flowNavigation = [
    { name: 'Overview', href: '#overview', icon: HomeIcon },
    { name: 'Diagnoses (ICD-10)', href: '#diagnoses', icon: ClipboardDocumentListIcon },
    { name: 'Procedure Codes', href: '#procedures', icon: DocumentTextIcon },
    { name: 'Notes', href: '#notes', icon: DocumentTextIcon },
    { name: 'Physical Exam', href: '#exam', icon: UsersIcon },
    { name: 'Templates', href: '#templates', icon: DocumentTextIcon, comingSoon: true },
    { name: 'Review & Signature', href: '#signature', icon: DocumentTextIcon },
  ];

  const navigation = flowMode ? flowNavigation : regularNavigation;

  const isCurrentPage = (href) => {
    if (flowMode) {
      // For flow mode, we'll handle active states differently
      return false;
    }
    if (href === '/doctor') {
      return location.pathname === '/doctor';
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
            {flowMode && !sidebarCollapsed && (
              <button
                onClick={onBackToPatients}
                className="mr-3 p-1 text-gray-400 hover:text-white rounded-md"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
            )}
            {!sidebarCollapsed && (
              <h1 className="text-xl font-bold text-blue-400">
                {flowMode ? 'Patient Flow' : 'SpineLine'}
              </h1>
            )}
            {sidebarCollapsed && (
              <h1 className="text-lg font-bold text-blue-400">
                {flowMode ? 'PF' : 'SL'}
              </h1>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:block p-1 text-gray-400 hover:text-white rounded-md"
          >
            {sidebarCollapsed ? (
              <ChevronRightIcon className="h-5 w-5" />
            ) : (
              <ChevronLeftIcon className="h-5 w-5" />
            )}
          </button>
          <button
            className="lg:hidden p-1 text-gray-400 hover:text-white rounded-md"
            onClick={() => setSidebarOpen(false)}
          >
            <XIcon className="h-5 w-5" />
          </button>
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
                <p className="text-xs text-gray-400">Doctor • {user.clinicId}</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-4 px-2 flex-1">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const current = isCurrentPage(item.href);

              if (flowMode) {
                // Flow mode navigation items
                return (
                  <button
                    key={item.name}
                    className={`group flex items-center w-full px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 text-gray-300 hover:bg-gray-700/50 hover:text-white hover:border-l-4 hover:border-gray-600 ${sidebarCollapsed ? 'justify-center' : ''}`}
                    title={sidebarCollapsed ? item.name : ''}
                  >
                    <Icon className={`${sidebarCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0 transition-colors text-gray-400 group-hover:text-gray-300`} />
                    {!sidebarCollapsed && (
                      <span className="font-medium flex items-center">
                        {item.name}
                        {item.comingSoon && (
                          <span className="ml-2 px-2 py-1 text-xs bg-yellow-600 text-yellow-100 rounded-full">
                            Soon
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                );
              } else {
                // Regular navigation items
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      current
                        ? 'bg-blue-600 text-white shadow-lg border-l-4 border-blue-400'
                        : 'text-gray-300 hover:bg-gray-700/50 hover:text-white hover:border-l-4 hover:border-gray-600'
                    } ${sidebarCollapsed ? 'justify-center' : ''} ${item.comingSoon ? 'cursor-not-allowed opacity-60' : ''}`}
                    onClick={(e) => {
                      if (item.comingSoon) {
                        e.preventDefault();
                        return;
                      }
                      setSidebarOpen(false);
                    }}
                    title={sidebarCollapsed ? item.name : ''}
                  >
                    <Icon className={`${sidebarCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0 transition-colors ${
                      current ? 'text-blue-200' : 'text-gray-400 group-hover:text-gray-300'
                    }`} />
                    {!sidebarCollapsed && (
                      <span className="font-medium flex items-center">
                        {item.name}
                        {item.comingSoon && (
                          <span className="ml-2 px-2 py-1 text-xs bg-yellow-600 text-yellow-100 rounded-full">
                            Soon
                          </span>
                        )}
                      </span>
                    )}
                  </Link>
                );
              }
            })}
          </div>
        </nav>

        {/* Logout button - fixed to bottom */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className={`group flex items-center w-full px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 text-gray-300 hover:bg-red-600 hover:text-white ${sidebarCollapsed ? 'justify-center' : ''}`}
            title={sidebarCollapsed ? 'Sign Out' : ''}
          >
            <LogoutIcon className={`${sidebarCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0 transition-colors text-gray-400 group-hover:text-white`} />
            {!sidebarCollapsed && (
              <span className="font-medium">Sign Out</span>
            )}
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
            <h1 className="text-lg font-medium text-white">
              {flowMode ? 'Patient Flow' : 'SpineLine Doctor'}
            </h1>
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

export default DoctorLayout;
