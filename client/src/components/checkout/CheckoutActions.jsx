import { useState, useEffect, useRef } from 'react';
import {
  PlusIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  CubeIcon,
  CalendarIcon,
  PencilIcon,
  ComputerDesktopIcon,
  DeviceTabletIcon
} from '@heroicons/react/24/outline';
import SignatureCanvas from 'react-signature-canvas';
// import SignaturePadManager from '../signature/SignaturePadManager.js';
import { HardwarePadDetector } from '../signature/HardwarePadDetector.js';
import EPadBridge from '../signature/EPadBridge.js';

import ServiceCodeSelectionModal from './ServiceCodeSelectionModal.jsx';
import DiagnosticCodeSelectionModal from './DiagnosticCodeSelectionModal.jsx';
import CarePackageAssignmentModal from './CarePackageAssignmentModal.jsx';

const CheckoutActions = ({
  checkoutData,
  setCheckoutData,
  signature,
  setSignature,
  appointment
}) => {
  const signatureRef = useRef(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [showNextAppointment, setShowNextAppointment] = useState(false);
  const [showServiceCodeModal, setShowServiceCodeModal] = useState(false);
  const [showDiagnosticCodeModal, setShowDiagnosticCodeModal] = useState(false);
  const [showPackageAssignmentModal, setShowPackageAssignmentModal] = useState(false);
  // const [signaturePadManager] = useState(() => new SignaturePadManager());
  const [hardwarePads, setHardwarePads] = useState([]);
  const [selectedPadType, setSelectedPadType] = useState('software'); // 'software', 'topaz', 'wacom', etc.
  const [padStatus, setPadStatus] = useState('disconnected'); // 'disconnected', 'connected', 'signing', 'error'

  // Hardware signature pad detection and management
  // useEffect(() => {
  //   const detectHardwarePads = async () => {
  //     try {
  //       // Initialize ePad bridge first
  //       const ePadBridge = new EPadBridge();
  //       if (await ePadBridge.isAvailable()) {
  //         console.log('ePad device detected and available');
  //       }

  //       const detectedPads = await signaturePadManager.detectAvailablePads();
  //       setHardwarePads(detectedPads);

  //       if (detectedPads.length > 0) {
  //         // Auto-select the first available hardware pad
  //         setSelectedPadType(detectedPads[0].type);
  //         setPadStatus('connected');
  //       } else {
  //         // Fallback to software pad
  //         setSelectedPadType('software');
  //         setPadStatus('disconnected');
  //       }
  //     } catch (error) {
  //       console.error('Error detecting signature pads:', error);
  //       setSelectedPadType('software');
  //       setPadStatus('error');
  //     }
  //   };

  //   detectHardwarePads();

  //   // Set up event listeners for pad connection/disconnection
  //   const handlePadConnected = (padInfo) => {
  //     setHardwarePads(prev => [...prev, padInfo]);
  //     if (selectedPadType === 'software') {
  //       setSelectedPadType(padInfo.type);
  //     }
  //     setPadStatus('connected');
  //   };

  //   const handlePadDisconnected = (padInfo) => {
  //     setHardwarePads(prev => prev.filter(pad => pad.id !== padInfo.id));
  //     if (selectedPadType === padInfo.type) {
  //       const remainingPads = hardwarePads.filter(pad => pad.id !== padInfo.id);
  //       if (remainingPads.length > 0) {
  //         setSelectedPadType(remainingPads[0].type);
  //       } else {
  //         setSelectedPadType('software');
  //         setPadStatus('disconnected');
  //       }
  //     }
  //   };

  //   signaturePadManager.on('padConnected', handlePadConnected);
  //   signaturePadManager.on('padDisconnected', handlePadDisconnected);

  //   return () => {
  //     signaturePadManager.off('padConnected', handlePadConnected);
  //     signaturePadManager.off('padDisconnected', handlePadDisconnected);
  //   };
  // }, [signaturePadManager, selectedPadType, hardwarePads]);

  // Service Code Management
  const addServiceCode = () => {
    setShowServiceCodeModal(true);
  };

  const handleServiceCodeSelection = (selectedCodes) => {
    const newServiceCodes = selectedCodes.map(code => ({
      code: code.code,
      description: code.description,
      units: code.units || 1,
      unitRate: code.unitRate,
      isPackage: code.isPackage,
      packageDetails: code.packageDetails,
      serviceCodeId: code._id,
      packageId: code.isPackage ? code._id : null // Store package ID for tracking
    }));

    // Update service codes
    setCheckoutData(prev => ({
      ...prev,
      serviceCodes: [...prev.serviceCodes, ...newServiceCodes]
    }));

    // If any selected codes are packages, update the patient's package usage immediately
    const packageCodes = selectedCodes.filter(code => code.isPackage);
    if (packageCodes.length > 0 && appointment?.patient?.packages) {
      packageCodes.forEach(packageCode => {
        const packageIndex = appointment.patient.packages.findIndex(pkg =>
          pkg._id === packageCode._id && pkg.isActive && pkg.remainingVisits > 0
        );

        if (packageIndex !== -1) {
          // Update the package usage in the appointment data (for UI display)
          appointment.patient.packages[packageIndex].usedVisits += 1;
          appointment.patient.packages[packageIndex].remainingVisits -= 1;

          // Set package as used in checkout data
          setCheckoutData(prev => ({
            ...prev,
            packageUsed: {
              packageId: packageCode._id,
              packageName: packageCode.description,
              visitsUsed: 1
            }
          }));
        }
      });
    }
  };

  const updateServiceCode = (index, field, value) => {
    setCheckoutData(prev => ({
      ...prev,
      serviceCodes: prev.serviceCodes.map((service, i) =>
        i === index ? { ...service, [field]: value } : service
      )
    }));
  };

  const removeServiceCode = (index) => {
    const serviceCodeToRemove = checkoutData.serviceCodes[index];

    // If removing a package service code, restore the package usage
    if (serviceCodeToRemove.isPackage && serviceCodeToRemove.packageId && appointment?.patient?.packages) {
      const packageIndex = appointment.patient.packages.findIndex(pkg =>
        pkg._id === serviceCodeToRemove.packageId
      );

      if (packageIndex !== -1) {
        // Restore the package usage in the appointment data
        appointment.patient.packages[packageIndex].usedVisits -= 1;
        appointment.patient.packages[packageIndex].remainingVisits += 1;

        // Clear package usage from checkout data if this was the only package
        const remainingPackageCodes = checkoutData.serviceCodes.filter((code, i) =>
          i !== index && code.isPackage
        );

        if (remainingPackageCodes.length === 0) {
          setCheckoutData(prev => ({
            ...prev,
            serviceCodes: prev.serviceCodes.filter((_, i) => i !== index),
            packageUsed: null
          }));
          return;
        }
      }
    }

    if (checkoutData.serviceCodes.length > 1) {
      setCheckoutData(prev => ({
        ...prev,
        serviceCodes: prev.serviceCodes.filter((_, i) => i !== index)
      }));
    }
  };

  // Diagnostic Code Management
  const addDiagnosticCode = () => {
    setShowDiagnosticCodeModal(true);
  };

  const handleDiagnosticCodeSelection = (selectedCodes) => {
    const newDiagnosticCodes = selectedCodes.map(code => ({
      code: code.code,
      description: code.description,
      isPrimary: code.isPrimary,
      category: code.category,
      bodySystem: code.bodySystem,
      diagnosticCodeId: code._id
    }));

    setCheckoutData(prev => ({
      ...prev,
      diagnosticCodes: newDiagnosticCodes
    }));
  };

  const removeDiagnosticCode = (index) => {
    setCheckoutData(prev => ({
      ...prev,
      diagnosticCodes: prev.diagnosticCodes.filter((_, i) => i !== index)
    }));
  };

  // Signature Management
  const clearSignature = async () => {
    try {
      if (selectedPadType === 'software') {
        if (signatureRef.current) {
          signatureRef.current.clear();
          setSignature(null);
          console.log('Software signature cleared');
        }
      } else {
        // Clear hardware signature pad
        setSignature(null);
        console.log('Hardware signature cleared');
      }
    } catch (error) {
      console.error('Error clearing signature:', error);
      // Force clear the signature state even if canvas clear fails
      setSignature(null);
    }
  };

  const handleSignatureBegin = () => {
    console.log('Signature started');
  };

  const handleSignatureEnd = () => {
    try {
      if (selectedPadType === 'software' && signatureRef.current) {
        const isEmpty = signatureRef.current.isEmpty();
        if (!isEmpty) {
          const dataURL = signatureRef.current.toDataURL();
          console.log('Signature captured:', dataURL.substring(0, 50) + '...');
          setSignature(dataURL);
        }
      }
    } catch (error) {
      console.error('Error capturing signature:', error);
    }
  };

  const startHardwareSignature = async () => {
    try {
      setPadStatus('signing');

      if (selectedPadType === 'epad') {
        // Use ePad bridge for direct ePad communication
        try {
          alert('ePad hardware signature capture is not yet fully implemented. The ePadLink software integration requires additional setup. Switching to software signature for now.');
          setPadStatus('connected');
          setSelectedPadType('software');
          setShowSignaturePad(true);
        } catch (ePadError) {
          console.warn('ePad connection failed, falling back to software signature:', ePadError);
          alert('ePad device not available. Switching to software signature pad.');
          setPadStatus('connected');
          setSelectedPadType('software');
          setShowSignaturePad(true);
        }
      } else if (selectedPadType === 'software') {
        // Software signature - just show the canvas
        setPadStatus('connected');
        setShowSignaturePad(true);
      } else {
        // For other hardware devices detected via HID
        const selectedPad = hardwarePads.find(pad => pad.type === selectedPadType);
        if (selectedPad && selectedPad.device) {
          // Try to capture signature from the selected HID device
          const testResult = await HardwarePadDetector.testPadConnection(selectedPad);
          if (testResult.success) {
            // For now, show a message that hardware signature is detected but needs implementation
            alert(`${selectedPad.name} is connected and ready. Hardware signature capture implementation is in progress. Switching to software signature for now.`);
            setPadStatus('connected');
            setSelectedPadType('software');
            setShowSignaturePad(true);
          } else {
            throw new Error(testResult.message);
          }
        } else {
          throw new Error('Selected hardware pad not found or not properly connected');
        }
      }
    } catch (error) {
      console.error('Error capturing hardware signature:', error);
      setPadStatus('error');
      alert(`Signature capture failed: ${error.message}. Switching to software signature.`);
      setSelectedPadType('software');
      setShowSignaturePad(true);
    }
  };

  const handlePadTypeChange = (padType) => {
    setSelectedPadType(padType);
    setSignature(null); // Clear any existing signature when switching pad types
  };

  const detectHardwarePads = async () => {
    try {
      setPadStatus('detecting');

      // Show instruction to user
      alert('Please select your ePadLink USB ePad device from the list and click Connect when the browser dialog appears.');

      const detectedPads = await HardwarePadDetector.detectUSBSignaturePads();

      if (detectedPads.length > 0) {
        setHardwarePads(detectedPads);

        // Prioritize ePad devices if found
        const ePadDevice = detectedPads.find(pad =>
          pad.name.toLowerCase().includes('epad') ||
          pad.name.toLowerCase().includes('padlink')
        );

        if (ePadDevice) {
          setSelectedPadType('epad');
          setPadStatus('connected');
          alert(`✅ Successfully connected to ${ePadDevice.name}! You can now use it for signatures.`);
        } else {
          setSelectedPadType(detectedPads[0].type);
          setPadStatus('connected');
          alert(`Found ${detectedPads.length} signature pad(s): ${detectedPads.map(p => p.name).join(', ')}`);
        }
      } else {
        setPadStatus('disconnected');
        alert('❌ No devices were selected. Please try again and make sure to select your ePadLink device and click Connect.');
      }
    } catch (error) {
      setPadStatus('error');
      if (error.message.includes('No device selected')) {
        alert('❌ No device was selected. Please try again and select your ePadLink USB ePad from the list.');
      } else {
        alert(`❌ Hardware detection failed: ${error.message}`);
      }
    }
  };

  const testEPadConnection = async () => {
    try {
      setPadStatus('detecting');

      // For now, simulate ePad detection since the actual ePad utility isn't available
      // In a real implementation, this would check for ePad software/drivers

      // Simulate a brief detection delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // For demonstration, we'll add a mock ePad device
      const ePadInfo = {
        type: 'epad',
        name: 'ePadLink USB ePad (Simulated)',
        model: 'ePad USB Signature Device',
        vendor: 'ePadLink',
        id: 'epad-simulated',
        capabilities: ['pressure', 'timestamp']
      };

      setHardwarePads(prev => {
        const filtered = prev.filter(p => p.type !== 'epad');
        return [...filtered, ePadInfo];
      });
      setSelectedPadType('epad');
      setPadStatus('connected');

      alert('ePad device simulation added! Note: This is a demo mode. For actual ePad functionality, the ePadLink software and drivers must be installed. For now, please use software signature.');

    } catch (error) {
      setPadStatus('error');
      alert(`ePad connection test failed: ${error.message}`);
    }
  };

  // Package Management
  const handlePackageSelection = (packageData) => {
    setCheckoutData(prev => ({
      ...prev,
      packageUsed: packageData
    }));
  };

  const clearPackageUsage = () => {
    setCheckoutData(prev => ({
      ...prev,
      packageUsed: null
    }));
  };

  // Package Assignment Handler
  const handlePackageAssignment = async (packageData) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Add package to patient
      const response = await fetch(`/api/patients/${appointment.patient._id}/packages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(packageData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        // Update the appointment data to reflect the new package
        if (appointment.patient.packages) {
          appointment.patient.packages.push(packageData);
        } else {
          appointment.patient.packages = [packageData];
        }

        alert('Package assigned successfully!');
      } else {
        throw new Error(result.message || 'Failed to assign package');
      }
    } catch (error) {
      console.error('Error assigning package:', error);
      alert(`Failed to assign package: ${error.message}`);
    }
  };

  // Get active packages
  const activePackages = appointment?.patient?.packages?.filter(pkg =>
    pkg.isActive && pkg.remainingVisits > 0
  ) || [];

  return (
    <div className="bg-gray-800 rounded-lg h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Checkout Actions</h3>
        <p className="text-sm text-gray-400">Complete billing codes, diagnostics, and patient signature</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Service Codes Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-medium text-white flex items-center">
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              Service Codes
            </h4>
            <button
              onClick={addServiceCode}
              className="flex items-center text-blue-400 hover:text-blue-300 text-sm"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Browse Service Codes
            </button>
          </div>

          <div className="space-y-3">
            {checkoutData.serviceCodes.length === 0 ? (
              <div className="bg-gray-700 rounded-lg p-6 text-center">
                <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-400 mb-3">No service codes added yet</p>
                <button
                  onClick={addServiceCode}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors flex items-center mx-auto space-x-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>Browse Service Codes</span>
                </button>
              </div>
            ) : (
              checkoutData.serviceCodes.map((service, index) => (
                <div key={index} className="bg-gray-700 rounded-lg p-4">
                <div className="mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Service Code
                    </label>
                    {/* Display selected service code */}
                    <div className="bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-blue-400">{service.code}</span>
                          {service.description && (
                            <span className="text-gray-300 ml-2">- {service.description}</span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-green-400">
                            ${service.unitRate.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                    {service.isPackage && (
                      <div className="mt-1 flex items-center space-x-1">
                        <CubeIcon className="h-4 w-4 text-purple-400" />
                        <span className="text-xs text-purple-400 font-medium">Package Selected</span>
                        {service.packageDetails?.includedCodes && (
                          <span className="text-xs text-gray-400">
                            ({service.packageDetails.includedCodes.length} codes included)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        Units
                      </label>
                      <input
                        type="number"
                        placeholder="1"
                        value={service.units}
                        onChange={(e) => updateServiceCode(index, 'units', parseInt(e.target.value) || 1)}
                        className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        Total Charge
                      </label>
                      <div className="bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm">
                        <span className="font-medium text-green-400">
                          ${(service.units * service.unitRate).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {service.isPackage && service.packageDetails?.includedCodes && (
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Included Services
                    </label>
                    <div className="bg-gray-600 rounded p-2 max-h-20 overflow-y-auto">
                      <div className="text-xs text-gray-300 space-y-1">
                        {service.packageDetails.includedCodes.map((includedCode, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{includedCode.code}</span>
                            <span className="text-gray-400">{includedCode.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {checkoutData.serviceCodes.length > 1 && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => removeServiceCode(index)}
                      className="text-red-400 hover:text-red-300 text-sm flex items-center"
                    >
                      <XMarkIcon className="h-4 w-4 mr-1" />
                      Remove Service Code
                    </button>
                  </div>
                )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Diagnostic Codes Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-medium text-white flex items-center">
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              Diagnostic Codes (ICD-10)
            </h4>
            <button
              onClick={addDiagnosticCode}
              className="flex items-center text-blue-400 hover:text-blue-300 text-sm"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Browse Diagnostic Codes
            </button>
          </div>

          <div className="space-y-3">
            {checkoutData.diagnosticCodes.length === 0 ? (
              <div className="bg-gray-700 rounded-lg p-6 text-center">
                <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-400 mb-3">No diagnostic codes added yet</p>
                <button
                  onClick={addDiagnosticCode}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors flex items-center mx-auto space-x-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>Browse Diagnostic Codes</span>
                </button>
              </div>
            ) : (
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="mb-3">
                  <h5 className="text-sm font-medium text-white mb-2">Diagnoses</h5>
                  <div className="space-y-2">
                    {checkoutData.diagnosticCodes.map((diagnostic, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-600 rounded p-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="font-mono text-blue-400 font-bold">
                              ({diagnostic.code})
                            </div>
                            {diagnostic.isPrimary && (
                              <span className="bg-blue-900/30 text-blue-400 text-xs px-2 py-1 rounded font-medium">
                                Primary Diagnosis
                              </span>
                            )}
                          </div>
                          <div className="text-white text-sm mt-1">
                            {diagnostic.description}
                          </div>
                          {(diagnostic.category || diagnostic.bodySystem) && (
                            <div className="text-xs text-gray-400 mt-1">
                              {diagnostic.category}
                              {diagnostic.category && diagnostic.bodySystem && ' • '}
                              {diagnostic.bodySystem}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => removeDiagnosticCode(index)}
                          className="text-red-400 hover:text-red-300 ml-3"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-600">
                  <span className="text-xs text-gray-400">
                    {checkoutData.diagnosticCodes.length} diagnostic code{checkoutData.diagnosticCodes.length !== 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={addDiagnosticCode}
                    className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add More Codes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Package Usage Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-medium text-white flex items-center">
              <CubeIcon className="h-5 w-5 mr-2" />
              Care Packages
            </h4>
            <button
              onClick={() => setShowPackageAssignmentModal(true)}
              className="flex items-center text-blue-400 hover:text-blue-300 text-sm"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Assign Package
            </button>
          </div>

          {activePackages.length > 0 && (
            <div className="bg-gray-700 rounded-lg p-4">
              {checkoutData.packageUsed ? (
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-white font-medium">{checkoutData.packageUsed.packageName}</p>
                      <p className="text-sm text-gray-400">Using {checkoutData.packageUsed.visitsUsed} visit(s)</p>
                    </div>
                    <button
                      onClick={clearPackageUsage}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="text-xs text-green-400">
                    ✓ Package visit will be automatically deducted
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-400 text-sm mb-3">Select a package to use for this visit:</p>
                  <div className="space-y-2">
                    {activePackages.map((pkg, index) => (
                      <button
                        key={index}
                        onClick={() => handlePackageSelection({
                          packageId: pkg._id,
                          packageName: pkg.packageName,
                          visitsUsed: 1
                        })}
                        className="w-full text-left bg-gray-600 hover:bg-gray-500 rounded p-3 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-white font-medium">{pkg.packageName}</span>
                          <span className="text-sm text-gray-400">{pkg.remainingVisits} left</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activePackages.length === 0 && (
            <div className="bg-gray-700 rounded-lg p-6 text-center">
              <CubeIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-400 mb-3">No active packages for this patient</p>
              <button
                onClick={() => setShowPackageAssignmentModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors flex items-center mx-auto space-x-2"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Assign Package</span>
              </button>
            </div>
          )}
        </div>

        {/* Patient Signature Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-medium text-white flex items-center">
              <PencilIcon className="h-5 w-5 mr-2" />
              Patient Signature *
            </h4>
            {/* Signature Pad Type Selector */}
            <div className="flex items-center space-x-2">
              <select
                value={selectedPadType}
                onChange={(e) => handlePadTypeChange(e.target.value)}
                className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option key="software" value="software">Software Pad</option>
                {hardwarePads.map((pad, index) => (
                  <option key={`${pad.id || pad.type}-${index}`} value={pad.type}>
                    {pad.name} ({pad.model})
                  </option>
                ))}
              </select>
              {/* Hardware Detection Buttons */}
              <div className="flex space-x-1">
                <button
                  onClick={detectHardwarePads}
                  disabled={padStatus === 'detecting' || padStatus === 'signing'}
                  className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded transition-colors disabled:opacity-50"
                  title="Detect hardware signature pads"
                >
                  {padStatus === 'detecting' ? 'Detecting...' : 'Detect Hardware'}
                </button>
                <button
                  onClick={testEPadConnection}
                  disabled={padStatus === 'detecting' || padStatus === 'signing'}
                  className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded transition-colors disabled:opacity-50"
                  title="Test ePad connection specifically"
                >
                  Test ePad
                </button>
              </div>

              {/* Status Indicator */}
              <div className={`w-3 h-3 rounded-full ${
                padStatus === 'connected' ? 'bg-green-500' :
                padStatus === 'signing' ? 'bg-yellow-500' :
                padStatus === 'detecting' ? 'bg-blue-500' :
                padStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
              }`} title={`Status: ${padStatus}`}></div>
            </div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            {!showSignaturePad ? (
              // Signature Button - Initial State
              <div className="text-center">
                <button
                  onClick={() => {
                    if (selectedPadType === 'software') {
                      setShowSignaturePad(true);
                    } else {
                      startHardwareSignature();
                    }
                  }}
                  disabled={padStatus === 'signing'}
                  className={`w-full font-medium py-4 px-6 rounded-lg transition-colors flex items-center justify-center space-x-3 ${
                    padStatus === 'signing'
                      ? 'bg-yellow-600 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white`}
                >
                  {selectedPadType === 'software' ? (
                    <DeviceTabletIcon className="h-6 w-6" />
                  ) : (
                    <ComputerDesktopIcon className="h-6 w-6" />
                  )}
                  <span className="text-lg">
                    {padStatus === 'signing' ? 'Signing in Progress...' : 'Patient Signature'}
                  </span>
                </button>
                <p className="text-xs text-gray-400 mt-3">
                  {selectedPadType === 'software'
                    ? 'Click to activate touch/mouse signature pad'
                    : `Click to activate ${hardwarePads.find(p => p.type === selectedPadType)?.name || 'hardware'} signature pad`
                  }
                </p>
                {signature && (
                  <div className="mt-3 p-3 bg-green-900/20 border border-green-700 rounded">
                    <div className="text-green-400 text-sm font-medium">
                      ✓ Signature Previously Captured
                    </div>
                    <button
                      onClick={() => setShowSignaturePad(true)}
                      className="text-blue-400 hover:text-blue-300 text-sm mt-1"
                    >
                      View/Update Signature
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Signature Pad - Active State
              <div>
                <div className="mb-3 text-center">
                  <p className="text-white font-medium mb-1">Please sign below</p>
                  <p className="text-xs text-gray-400">
                    Patient signature acknowledging services received and billing codes
                  </p>
                </div>
                <div className="bg-white rounded mb-3 border-2 border-blue-500">
                  <SignatureCanvas
                    ref={signatureRef}
                    onBegin={handleSignatureBegin}
                    onEnd={handleSignatureEnd}
                    penColor="black"
                    minWidth={1}
                    maxWidth={3}
                    velocityFilterWeight={0.7}
                    minDistance={3}
                    throttle={16}
                    canvasProps={{
                      width: 400,
                      height: 200,
                      className: 'signature-canvas w-full',
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
                <div className="flex justify-between items-center">
                  <button
                    onClick={clearSignature}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm transition-colors"
                  >
                    Clear Signature
                  </button>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowSignaturePad(false)}
                      className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded text-sm transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (signature) {
                          setShowSignaturePad(false);
                        }
                      }}
                      disabled={!signature}
                      className={`px-4 py-2 rounded text-sm transition-colors ${
                        signature
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      Save Signature
                    </button>
                  </div>
                </div>
                {signature && (
                  <div className="mt-2 text-xs text-green-400 text-center">
                    ✓ Signature captured successfully
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Schedule Next Appointment */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-medium text-white flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2" />
              Schedule Next Appointment
            </h4>
            <button
              onClick={() => setShowNextAppointment(!showNextAppointment)}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              {showNextAppointment ? 'Hide' : 'Add Next Appointment'}
            </button>
          </div>

          {showNextAppointment && (
            <div className="bg-gray-700 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={checkoutData.nextAppointment.date}
                    onChange={(e) => setCheckoutData(prev => ({
                      ...prev,
                      nextAppointment: { ...prev.nextAppointment, date: e.target.value }
                    }))}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Time</label>
                  <input
                    type="time"
                    value={checkoutData.nextAppointment.time}
                    onChange={(e) => setCheckoutData(prev => ({
                      ...prev,
                      nextAppointment: { ...prev.nextAppointment, time: e.target.value }
                    }))}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Visit Type</label>
                <select
                  value={checkoutData.nextAppointment.visitType}
                  onChange={(e) => setCheckoutData(prev => ({
                    ...prev,
                    nextAppointment: { ...prev.nextAppointment, visitType: e.target.value }
                  }))}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Follow-Up">Follow-Up</option>
                  <option value="Regular Visit">Regular Visit</option>
                  <option value="Re-evaluation">Re-evaluation</option>
                  <option value="New Patient">New Patient</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Notes</label>
                <textarea
                  value={checkoutData.nextAppointment.notes}
                  onChange={(e) => setCheckoutData(prev => ({
                    ...prev,
                    nextAppointment: { ...prev.nextAppointment, notes: e.target.value }
                  }))}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  placeholder="Appointment notes..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Checkout Notes */}
        <div>
          <h4 className="text-md font-medium text-white mb-4">Additional Notes</h4>
          <div className="bg-gray-700 rounded-lg p-4">
            <textarea
              value={checkoutData.checkoutNotes}
              onChange={(e) => setCheckoutData(prev => ({ ...prev, checkoutNotes: e.target.value }))}
              className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="Additional checkout notes..."
            />
          </div>
        </div>
      </div>

      {/* Service Code Selection Modal */}
      <ServiceCodeSelectionModal
        isOpen={showServiceCodeModal}
        onClose={() => setShowServiceCodeModal(false)}
        onSelectCodes={handleServiceCodeSelection}
        selectedCodes={checkoutData.serviceCodes}
        patient={appointment?.patient}
      />

      {/* Diagnostic Code Selection Modal */}
      <DiagnosticCodeSelectionModal
        isOpen={showDiagnosticCodeModal}
        onClose={() => setShowDiagnosticCodeModal(false)}
        onSelectCodes={handleDiagnosticCodeSelection}
        selectedCodes={checkoutData.diagnosticCodes}
      />

      {/* Care Package Assignment Modal */}
      <CarePackageAssignmentModal
        isOpen={showPackageAssignmentModal}
        onClose={() => setShowPackageAssignmentModal(false)}
        onAssignPackage={handlePackageAssignment}
        patient={appointment?.patient}
      />
    </div>
  );
};

export default CheckoutActions;
