import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import SecretaryLayout from '../components/secretary/SecretaryLayout';
import PatientSnapshot from '../components/checkout/PatientSnapshot';
import CheckoutActions from '../components/checkout/CheckoutActions';
import FinancialSummary from '../components/checkout/FinancialSummary';
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const CheckoutPage = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  useEffect(() => {
    loadAppointment();
  }, [appointmentId]);

  const loadAppointment = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      const response = await axios.get(`/api/appointments/${appointmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const apt = response.data.appointment;
        setAppointment(apt);

        // Auto-populate checkout data from doctor's visit data
        const newCheckoutData = { ...checkoutData };

        // Pre-populate service codes from doctor's procedure codes
        if (apt.visitData?.procedureCodes && apt.visitData.procedureCodes.length > 0) {
          newCheckoutData.serviceCodes = apt.visitData.procedureCodes.map(code => ({
            code: code.code,
            description: code.description,
            units: code.units || 1,
            unitRate: code.rate || 0
          }));
          console.log('✅ Auto-populated service codes from doctor visit data:', newCheckoutData.serviceCodes);
        }

        // Pre-populate diagnostic codes from doctor's diagnostic codes
        if (apt.visitData?.diagnosticCodes && apt.visitData.diagnosticCodes.length > 0) {
          newCheckoutData.diagnosticCodes = apt.visitData.diagnosticCodes.map((code, index) => ({
            code: code.code,
            description: code.description,
            isPrimary: index === 0 // First code is primary
          }));
          console.log('✅ Auto-populated diagnostic codes from doctor visit data:', newCheckoutData.diagnosticCodes);
        }

        // Pre-populate with patient's package if available
        const activePackages = apt.patient?.packages?.filter(pkg =>
          pkg.isActive && pkg.remainingVisits > 0
        ) || [];

        if (activePackages.length > 0) {
          newCheckoutData.packageUsed = {
            packageId: activePackages[0]._id,
            packageName: activePackages[0].packageName,
            visitsUsed: 1
          };
        }

        setCheckoutData(newCheckoutData);
      } else {
        setError('Failed to load appointment details');
      }
    } catch (error) {
      console.error('Load appointment error:', error);
      setError('Failed to load appointment details');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return checkoutData.serviceCodes.reduce((sum, service) =>
      sum + (service.units * service.unitRate), 0
    );
  };

  const calculateChange = () => {
    const total = calculateTotal();
    return Math.max(0, checkoutData.amountPaid - total);
  };

  const validateCheckout = () => {
    const errors = [];

    // Check required fields (including packages)
    const hasValidServices = checkoutData.serviceCodes.some(service =>
      service.code.trim() && service.description.trim() && (service.unitRate > 0 || service.isPackage)
    );

    const hasValidDiagnostics = checkoutData.diagnosticCodes.some(diagnostic =>
      diagnostic.code.trim() && diagnostic.description.trim()
    );

    if (!hasValidServices) {
      errors.push('At least one service code or package is required');
    }

    if (!hasValidDiagnostics) {
      errors.push('At least one diagnostic code is required');
    }

    // Patient signature is no longer required

    const total = calculateTotal();
    if (checkoutData.amountPaid < total) {
      errors.push('Amount paid cannot be less than total amount');
    }

    // Check that only one diagnostic code is marked as primary
    const primaryDiagnostics = checkoutData.diagnosticCodes.filter(d => d.isPrimary);
    if (primaryDiagnostics.length !== 1) {
      errors.push('Exactly one diagnostic code must be marked as primary');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validateCheckout()) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.post(`/api/appointments/${appointmentId}/checkout`, {
        ...checkoutData,
        signature,
        changeGiven: calculateChange()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        // Redirect back to Today's Patients with success message
        navigate('/secretary/todays-patients', {
          state: {
            message: `${appointment.patient.fullName} successfully checked out`,
            type: 'success'
          }
        });
      } else {
        setError(response.data.message || 'Checkout failed');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setError(error.response?.data?.message || 'Failed to process checkout');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/secretary/todays-patients');
  };

  if (loading) {
    return (
      <SecretaryLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </SecretaryLayout>
    );
  }

  if (error && !appointment) {
    return (
      <SecretaryLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Error Loading Appointment</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Return to Today's Patients
            </button>
          </div>
        </div>
      </SecretaryLayout>
    );
  }

  return (
    <SecretaryLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleCancel}
                className="flex items-center text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Today's Patients
              </button>
              <div className="h-6 border-l border-gray-600"></div>
              <h1 className="text-xl font-bold text-white">
                Patient Checkout: {appointment?.patient?.fullName}
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">
                {new Date().toLocaleDateString()} • {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex-shrink-0 bg-red-900 border border-red-700 text-red-100 px-6 py-3">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              {error}
            </div>
          </div>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="flex-shrink-0 bg-yellow-900 border border-yellow-700 text-yellow-100 px-6 py-3">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Please fix the following issues:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex gap-6 p-6 min-h-0 overflow-hidden">
          {/* Left: Patient Snapshot */}
          <div className="w-80 flex-shrink-0">
            <PatientSnapshot appointment={appointment} checkoutData={checkoutData} />
          </div>

          {/* Center: Checkout Actions */}
          <div className="flex-1 min-w-0">
            <CheckoutActions
              checkoutData={checkoutData}
              setCheckoutData={setCheckoutData}
              signature={signature}
              setSignature={setSignature}
              appointment={appointment}
            />
          </div>

          {/* Right: Financial Summary */}
          <div className="w-80 flex-shrink-0">
            <FinancialSummary
              checkoutData={checkoutData}
              setCheckoutData={setCheckoutData}
              calculateTotal={calculateTotal}
              calculateChange={calculateChange}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              submitting={submitting}
              hasSignature={!!signature}
            />
          </div>
        </div>
      </div>
    </SecretaryLayout>
  );
};

export default CheckoutPage;
