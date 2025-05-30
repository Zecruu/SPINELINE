import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    clinicId: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clinicInfo, setClinicInfo] = useState(null);
  const [clinicLoading, setClinicLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  // Validate clinic ID when it changes
  useEffect(() => {
    const validateClinic = async () => {
      if (formData.clinicId && formData.clinicId.length >= 3) {
        setClinicLoading(true);
        try {
          const response = await axios.get(`/api/auth/clinic/${formData.clinicId}`, {
            timeout: 10000,
            validateStatus: (status) => status < 500
          });
          
          if (response.data?.success) {
            setClinicInfo(response.data.clinic);
            setError(''); // Clear any previous errors
          } else {
            setClinicInfo(null);
            setError(response.data?.message || 'Clinic not found. Please check the ID and try again.');
          }
        } catch (error) {
          console.error('Error validating clinic:', error);
          setClinicInfo(null);
          if (error.code === 'ECONNABORTED') {
            setError('Request timed out. Please check your internet connection.');
          } else if (error.response) {
            setError(error.response.data?.message || 'Error validating clinic');
          } else {
            setError('Unable to connect to the server. Please try again later.');
          }
        } finally {
          setClinicLoading(false);
        }
      } else {
        setClinicInfo(null);
        if (formData.clinicId) {
          setError('Clinic ID must be at least 3 characters');
        } else {
          setError('');
        }
      }  
    };

    const timeoutId = setTimeout(validateClinic, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [formData.clinicId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.clinicId || formData.clinicId.length < 3) {
      setError('Please enter a valid clinic ID');
      return;
    }
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/login', formData, {
        timeout: 10000,
        validateStatus: (status) => status < 500
      });
      
      if (response.data?.success) {
        // Store token and user info
        localStorage.setItem('userToken', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Redirect based on role
        const redirectPath = response.data.user.role === 'secretary' ? '/secretary' : '/doctor';
        navigate(redirectPath);
      } else {
        setError(response.data?.message || 'Login failed. Please check your credentials and try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.code === 'ECONNABORTED') {
        setError('Request timed out. Please check your internet connection and try again.');
      } else if (error.response) {
        // Server responded with an error status code
        setError(error.response.data?.message || 'An error occurred during login.');
      } else if (error.request) {
        // No response received
        setError('Unable to connect to the server. Please check your internet connection.');
      } else {
        // Something else went wrong
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-600">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            SpineLine Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Sign in to your clinic account
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded relative">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Clinic ID Field */}
            <div>
              <label htmlFor="clinicId" className="block text-sm font-medium text-gray-300">
                Clinic ID
              </label>
              <div className="mt-1 relative">
                <input
                  id="clinicId"
                  name="clinicId"
                  type="text"
                  required
                  value={formData.clinicId}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white bg-gray-800 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm uppercase"
                  placeholder="Enter clinic ID (e.g., DCC001)"
                  style={{ textTransform: 'uppercase' }}
                />
                {clinicLoading && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  </div>
                )}
              </div>
              {clinicInfo && (
                <p className="mt-1 text-sm text-green-400">
                  ✓ {clinicInfo.clinicName}
                </p>
              )}
              {formData.clinicId && !clinicInfo && !clinicLoading && formData.clinicId.length >= 3 && (
                <p className="mt-1 text-sm text-red-400">
                  ✗ Clinic not found
                </p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white bg-gray-800 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Enter your email"
              />
            </div>
            
            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-600 placeholder-gray-400 text-white bg-gray-800 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !clinicInfo}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-400">
              Need help? Contact your clinic administrator
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
