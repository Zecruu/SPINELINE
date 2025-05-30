import { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, CubeIcon } from '@heroicons/react/24/outline';

const ServiceCodeAutocomplete = ({
  value,
  onChange,
  onSelect,
  placeholder = "Search service codes...",
  showPackagesOnly = false,
  disabled = false,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [serviceCodes, setServiceCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  // Sync internal state with prop changes
  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  // Fetch service codes from API
  const fetchServiceCodes = async (search = '') => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');

      let url = '/api/service-codes';
      const params = new URLSearchParams();

      if (search.trim()) {
        url = `/api/service-codes/search/${encodeURIComponent(search.trim())}`;
      }

      if (showPackagesOnly) {
        params.append('isPackage', 'true');
      }

      params.append('limit', '20');

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setServiceCodes(data.serviceCodes || []);
      } else {
        console.error('Failed to fetch service codes');
        setServiceCodes([]);
      }
    } catch (error) {
      console.error('Error fetching service codes:', error);
      setServiceCodes([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (isOpen) {
        fetchServiceCodes(searchTerm);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm, isOpen, showPackagesOnly]);

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setSelectedIndex(-1);

    if (onChange) {
      onChange(newValue);
    }

    if (!isOpen && newValue.trim()) {
      setIsOpen(true);
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    setIsOpen(true);
    if (!searchTerm.trim()) {
      fetchServiceCodes();
    }
  };

  // Handle service code selection
  const handleSelect = (serviceCode) => {
    const displayValue = `${serviceCode.code} - ${serviceCode.description}`;
    setSearchTerm(displayValue);
    setIsOpen(false);
    setSelectedIndex(-1);

    if (onSelect) {
      onSelect(serviceCode);
    }

    if (onChange) {
      onChange(displayValue);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < serviceCodes.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && serviceCodes[selectedIndex]) {
          handleSelect(serviceCodes[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !inputRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = dropdownRef.current.children[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex]);

  return (
    <div className={`relative ${className}`}>
      {/* Input Field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10 ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          ) : (
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {loading ? (
            <div className="px-4 py-3 text-center text-gray-400">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mx-auto mb-2"></div>
              Searching...
            </div>
          ) : serviceCodes.length > 0 ? (
            serviceCodes.map((serviceCode, index) => (
              <div
                key={serviceCode._id}
                onClick={() => handleSelect(serviceCode)}
                className={`px-4 py-3 cursor-pointer border-b border-gray-600 last:border-b-0 hover:bg-gray-600 transition-colors ${
                  index === selectedIndex ? 'bg-gray-600' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-blue-400">
                        {serviceCode.code}
                      </span>
                      {serviceCode.isPackage && (
                        <div className="flex items-center space-x-1">
                          <CubeIcon className="h-4 w-4 text-purple-400" />
                          <span className="text-xs text-purple-400 font-medium">(P)</span>
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-300 mt-1">
                      {serviceCode.description}
                    </div>
                    {serviceCode.isPackage && serviceCode.packageDetails?.includedCodes && (
                      <div className="text-xs text-gray-400 mt-1">
                        Package includes {serviceCode.packageDetails.includedCodes.length} codes
                      </div>
                    )}
                    {serviceCode.insuranceCoverage && serviceCode.insuranceCoverage.length > 0 && (
                      <div className="text-xs text-green-400 mt-1">
                        <span className="font-medium">Coverage:</span> {serviceCode.insuranceCoverage.slice(0, 2).join(', ')}
                        {serviceCode.insuranceCoverage.length > 2 && ` +${serviceCode.insuranceCoverage.length - 2} more`}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-400">
                      ${serviceCode.unitRate.toFixed(2)}
                    </div>
                    {serviceCode.isPackage && serviceCode.packageDetails?.totalSessions && (
                      <div className="text-xs text-gray-400">
                        {serviceCode.packageDetails.totalSessions} sessions
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : searchTerm.trim() ? (
            <div className="px-4 py-3 text-center text-gray-400">
              No service codes found for "{searchTerm}"
            </div>
          ) : (
            <div className="px-4 py-3 text-center text-gray-400">
              Start typing to search service codes
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ServiceCodeAutocomplete;
