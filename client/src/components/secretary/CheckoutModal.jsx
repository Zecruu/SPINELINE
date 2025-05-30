import { useState, useEffect, useRef } from 'react';
import { XMarkIcon, CreditCardIcon, CalculatorIcon } from '@heroicons/react/24/outline';
import SignatureCanvas from 'react-signature-canvas';

const CheckoutModal = ({ appointment, isOpen, onClose, onComplete }) => {
  const [checkoutData, setCheckoutData] = useState({
    serviceCodes: [
      { code: '', description: '', units: 1, unitRate: 0 }
    ],
    diagnosticCodes: [
      { code: '', description: '', isPrimary: true }
    ],
    paymentMethod: 'Cash',
    amountPaid: 0,
    changeGiven: 0,
    packageUsed: null,
    nextAppointment: {
      date: '',
      time: '',
      visitType: 'Follow-Up',
      notes: ''
    },
    checkoutNotes: ''
  });

  const [signature, setSignature] = useState(null);
  const signatureRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showChangeCalculator, setShowChangeCalculator] = useState(false);
  const [calculatorAmount, setCalculatorAmount] = useState('');

  useEffect(() => {
    if (appointment && appointment.patient) {
      // Pre-populate with patient's package if available
      const activePackages = appointment.patient.packages?.filter(pkg =>
        pkg.isActive && pkg.remainingVisits > 0
      ) || [];

      if (activePackages.length > 0) {
        setCheckoutData(prev => ({
          ...prev,
          packageUsed: {
            packageId: activePackages[0]._id,
            packageName: activePackages[0].packageName,
            visitsUsed: 1
          }
        }));
      }
    }
  }, [appointment]);

  const calculateTotal = () => {
    return checkoutData.serviceCodes.reduce((sum, service) =>
      sum + (service.units * service.unitRate), 0
    );
  };

  const calculateChange = () => {
    const total = calculateTotal();
    return Math.max(0, checkoutData.amountPaid - total);
  };

  const addServiceCode = () => {
    setCheckoutData(prev => ({
      ...prev,
      serviceCodes: [...prev.serviceCodes, { code: '', description: '', units: 1, unitRate: 0 }]
    }));
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
    if (checkoutData.serviceCodes.length > 1) {
      setCheckoutData(prev => ({
        ...prev,
        serviceCodes: prev.serviceCodes.filter((_, i) => i !== index)
      }));
    }
  };

  const addDiagnosticCode = () => {
    setCheckoutData(prev => ({
      ...prev,
      diagnosticCodes: [...prev.diagnosticCodes, { code: '', description: '', isPrimary: false }]
    }));
  };

  const updateDiagnosticCode = (index, field, value) => {
    setCheckoutData(prev => ({
      ...prev,
      diagnosticCodes: prev.diagnosticCodes.map((diagnostic, i) =>
        i === index ? { ...diagnostic, [field]: value } : diagnostic
      )
    }));
  };

  const removeDiagnosticCode = (index) => {
    if (checkoutData.diagnosticCodes.length > 1) {
      setCheckoutData(prev => ({
        ...prev,
        diagnosticCodes: prev.diagnosticCodes.filter((_, i) => i !== index)
      }));
    }
  };

  const handleAmountPaidChange = (value) => {
    const numValue = parseFloat(value) || 0;
    setCheckoutData(prev => ({
      ...prev,
      amountPaid: numValue,
      changeGiven: Math.max(0, numValue - calculateTotal())
    }));
  };

  const handleCalculatorAdd = (amount) => {
    const currentAmount = checkoutData.amountPaid;
    const newAmount = currentAmount + parseFloat(amount);
    handleAmountPaidChange(newAmount);
  };

  const clearSignature = () => {
    try {
      if (signatureRef.current) {
        signatureRef.current.clear();
        setSignature(null);
        console.log('Signature cleared');
      }
    } catch (error) {
      console.error('Error clearing signature:', error);
      // Force clear the signature state even if canvas clear fails
      setSignature(null);
    }
  };

  const handleSignatureEnd = () => {
    try {
      if (signatureRef.current) {
        const isEmpty = signatureRef.current.isEmpty();
        if (!isEmpty) {
          const dataURL = signatureRef.current.toDataURL();
          setSignature(dataURL);
          console.log('Signature captured');
        }
      }
    } catch (error) {
      console.error('Error capturing signature:', error);
    }
  };

  const validateCheckout = () => {
    // Check required fields (including packages)
    const hasValidServices = checkoutData.serviceCodes.some(service =>
      service.code.trim() && service.description.trim() && (service.unitRate > 0 || service.isPackage)
    );

    const hasValidDiagnostics = checkoutData.diagnosticCodes.some(diagnostic =>
      diagnostic.code.trim() && diagnostic.description.trim()
    );

    if (!hasValidServices) {
      setError('At least one service code or package is required');
      return false;
    }

    if (!hasValidDiagnostics) {
      setError('At least one diagnostic code is required');
      return false;
    }

    // Patient signature is no longer required

    const total = calculateTotal();
    if (checkoutData.amountPaid < total) {
      setError('Amount paid cannot be less than total amount');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateCheckout()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('userToken');
      const response = await fetch(`/api/appointments/${appointment._id}/checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...checkoutData,
          signature,
          changeGiven: calculateChange()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Checkout failed');
      }

      if (data.success) {
        onComplete();
      } else {
        throw new Error(data.message || 'Checkout failed');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setError(error.message || 'Failed to process checkout');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !appointment) return null;

  const total = calculateTotal();
  const change = calculateChange();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-gray-900 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-white flex items-center">
                <CreditCardIcon className="h-6 w-6 mr-2" />
                Checkout: {appointment.patient.fullName}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="bg-gray-800 px-6 py-4 max-h-96 overflow-y-auto">
            {error && (
              <div className="mb-4 bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Service & Diagnostic Codes */}
              <div className="space-y-6">
                {/* Service Codes */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-medium text-white">Service Codes</h4>
                    <button
                      onClick={addServiceCode}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      + Add Service
                    </button>
                  </div>

                  <div className="space-y-3">
                    {checkoutData.serviceCodes.map((service, index) => (
                      <div key={index} className="border border-gray-600 rounded p-3">
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <input
                            type="text"
                            placeholder="Code"
                            value={service.code}
                            onChange={(e) => updateServiceCode(index, 'code', e.target.value)}
                            className="border border-gray-600 rounded bg-gray-700 text-white px-2 py-1 text-sm"
                          />
                          <div className="flex">
                            <input
                              type="number"
                              placeholder="Units"
                              value={service.units}
                              onChange={(e) => updateServiceCode(index, 'units', parseInt(e.target.value) || 1)}
                              className="border border-gray-600 rounded-l bg-gray-700 text-white px-2 py-1 text-sm w-16"
                              min="1"
                            />
                            <input
                              type="number"
                              placeholder="Rate"
                              value={service.unitRate}
                              onChange={(e) => updateServiceCode(index, 'unitRate', parseFloat(e.target.value) || 0)}
                              className="border border-gray-600 rounded-r bg-gray-700 text-white px-2 py-1 text-sm flex-1"
                              step="0.01"
                              min="0"
                            />
                          </div>
                        </div>
                        <input
                          type="text"
                          placeholder="Description"
                          value={service.description}
                          onChange={(e) => updateServiceCode(index, 'description', e.target.value)}
                          className="w-full border border-gray-600 rounded bg-gray-700 text-white px-2 py-1 text-sm"
                        />
                        {checkoutData.serviceCodes.length > 1 && (
                          <button
                            onClick={() => removeServiceCode(index)}
                            className="text-red-400 hover:text-red-300 text-xs mt-2"
                          >
                            Remove
                          </button>
                        )}
                        <div className="text-right text-sm text-gray-400 mt-1">
                          Total: ${(service.units * service.unitRate).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Diagnostic Codes */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-medium text-white">Diagnostic Codes (ICD-10)</h4>
                    <button
                      onClick={addDiagnosticCode}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      + Add Diagnostic
                    </button>
                  </div>

                  <div className="space-y-3">
                    {checkoutData.diagnosticCodes.map((diagnostic, index) => (
                      <div key={index} className="border border-gray-600 rounded p-3">
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <input
                            type="text"
                            placeholder="ICD-10 Code"
                            value={diagnostic.code}
                            onChange={(e) => updateDiagnosticCode(index, 'code', e.target.value.toUpperCase())}
                            className="border border-gray-600 rounded bg-gray-700 text-white px-2 py-1 text-sm"
                          />
                          <label className="flex items-center text-sm text-gray-300">
                            <input
                              type="checkbox"
                              checked={diagnostic.isPrimary}
                              onChange={(e) => updateDiagnosticCode(index, 'isPrimary', e.target.checked)}
                              className="mr-2"
                            />
                            Primary
                          </label>
                        </div>
                        <input
                          type="text"
                          placeholder="Description"
                          value={diagnostic.description}
                          onChange={(e) => updateDiagnosticCode(index, 'description', e.target.value)}
                          className="w-full border border-gray-600 rounded bg-gray-700 text-white px-2 py-1 text-sm"
                        />
                        {checkoutData.diagnosticCodes.length > 1 && (
                          <button
                            onClick={() => removeDiagnosticCode(index)}
                            className="text-red-400 hover:text-red-300 text-xs mt-2"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Payment & Signature */}
              <div className="space-y-6">
                {/* Payment Information */}
                <div>
                  <h4 className="text-lg font-medium text-white mb-4">Payment Information</h4>

                  <div className="space-y-4">
                    <div className="bg-gray-700 rounded p-4">
                      <div className="text-2xl font-bold text-white">
                        Total: ${total.toFixed(2)}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Payment Method</label>
                      <select
                        value={checkoutData.paymentMethod}
                        onChange={(e) => setCheckoutData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                        className="w-full border border-gray-600 rounded bg-gray-700 text-white px-3 py-2"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Credit Card">Credit Card</option>
                        <option value="Debit Card">Debit Card</option>
                        <option value="Check">Check</option>
                        <option value="Insurance">Insurance</option>
                        <option value="Package">Package</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-300">Amount Paid</label>
                        <button
                          onClick={() => setShowChangeCalculator(!showChangeCalculator)}
                          className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
                        >
                          <CalculatorIcon className="h-4 w-4 mr-1" />
                          Calculator
                        </button>
                      </div>
                      <input
                        type="number"
                        value={checkoutData.amountPaid}
                        onChange={(e) => handleAmountPaidChange(e.target.value)}
                        step="0.01"
                        min="0"
                        className="w-full border border-gray-600 rounded bg-gray-700 text-white px-3 py-2"
                      />
                    </div>

                    {showChangeCalculator && (
                      <div className="bg-gray-700 rounded p-3">
                        <div className="text-sm text-gray-300 mb-2">Quick Add:</div>
                        <div className="grid grid-cols-4 gap-2">
                          {['1', '5', '10', '20', '50', '100'].map(amount => (
                            <button
                              key={amount}
                              onClick={() => handleCalculatorAdd(amount)}
                              className="bg-gray-600 text-white px-2 py-1 rounded text-sm hover:bg-gray-500"
                            >
                              +${amount}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bg-gray-700 rounded p-3">
                      <div className="text-lg font-medium text-white">
                        Change: ${change.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Signature */}
                <div>
                  <h4 className="text-lg font-medium text-white mb-4">Patient Signature (Optional)</h4>
                  <div className="border border-gray-600 rounded bg-white">
                    <SignatureCanvas
                      ref={signatureRef}
                      onEnd={handleSignatureEnd}
                      penColor="black"
                      minWidth={1}
                      maxWidth={3}
                      velocityFilterWeight={0.7}
                      minDistance={3}
                      throttle={16}
                      canvasProps={{
                        width: 350,
                        height: 180,
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
                  <button
                    onClick={clearSignature}
                    className="text-blue-400 hover:text-blue-300 text-sm mt-2"
                  >
                    Clear Signature
                  </button>
                </div>
              </div>
            </div>

            {/* Additional sections will be added in the next part */}
          </div>

          {/* Footer */}
          <div className="bg-gray-700 px-6 py-4 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-600"
            >
              Cancel Checkout
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Save & Complete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
