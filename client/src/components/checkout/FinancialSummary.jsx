import { useState } from 'react';
import {
  CreditCardIcon,
  CalculatorIcon,
  CheckCircleIcon,
  XMarkIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

const FinancialSummary = ({
  checkoutData,
  setCheckoutData,
  calculateTotal,
  calculateChange,
  onSubmit,
  onCancel,
  submitting,
  hasSignature
}) => {
  const [showCalculator, setShowCalculator] = useState(false);

  const total = calculateTotal();
  const change = calculateChange();

  const handleAmountPaidChange = (value) => {
    const numValue = parseFloat(value) || 0;
    setCheckoutData(prev => ({
      ...prev,
      amountPaid: numValue
    }));
  };

  const handleCalculatorAdd = (amount) => {
    const currentAmount = checkoutData.amountPaid;
    const newAmount = currentAmount + parseFloat(amount);
    handleAmountPaidChange(newAmount);
  };

  const setExactAmount = () => {
    handleAmountPaidChange(total);
  };

  const isReadyToSubmit = () => {
    // Check for valid service codes (including packages)
    const hasValidServices = checkoutData.serviceCodes.some(service =>
      service.code.trim() && service.description.trim() && (service.unitRate > 0 || service.isPackage)
    );
    const hasValidDiagnostics = checkoutData.diagnosticCodes.some(diagnostic =>
      diagnostic.code.trim() && diagnostic.description.trim()
    );
    const hasPrimaryDiagnostic = checkoutData.diagnosticCodes.filter(d => d.isPrimary).length === 1;
    const hasValidPayment = checkoutData.amountPaid >= total;

    // Patient signature is no longer required
    return hasValidServices && hasValidDiagnostics && hasPrimaryDiagnostic && hasValidPayment;
  };

  return (
    <div className="bg-gray-800 rounded-lg h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <CurrencyDollarIcon className="h-5 w-5 mr-2" />
          Financial Summary
        </h3>
        <p className="text-sm text-gray-400">Payment processing and checkout completion</p>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">

        {/* Service Breakdown */}
        <div>
          <h4 className="text-md font-medium text-white mb-3">Service Breakdown</h4>
          <div className="bg-gray-700 rounded-lg p-4">
            {checkoutData.serviceCodes.map((service, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-600 last:border-b-0">
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">
                    {service.code || 'Service Code'} {service.units > 1 && `(${service.units}x)`}
                  </p>
                  <p className="text-gray-400 text-xs truncate">
                    {service.description || 'Service description'}
                  </p>
                </div>
                <div className="text-white font-medium">
                  ${(service.units * service.unitRate).toFixed(2)}
                </div>
              </div>
            ))}

            <div className="mt-4 pt-4 border-t border-gray-600">
              <div className="flex justify-between items-center min-w-0">
                <span className="text-lg font-semibold text-white flex-shrink-0">Total Amount:</span>
                <span className="text-xl font-bold text-green-400 ml-2 break-all">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>



        {/* Payment Section */}
        <div>
          <h4 className="text-md font-medium text-white mb-3">Payment Information</h4>
          <div className="space-y-4">

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Payment Method</label>
              <select
                value={checkoutData.paymentMethod}
                onChange={(e) => setCheckoutData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            {/* Amount Paid */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-300">Amount Paid</label>
                <div className="flex space-x-2">
                  <button
                    onClick={setExactAmount}
                    className="text-blue-400 hover:text-blue-300 text-xs"
                  >
                    Exact Amount
                  </button>
                  <button
                    onClick={() => setShowCalculator(!showCalculator)}
                    className="text-blue-400 hover:text-blue-300 text-xs flex items-center"
                  >
                    <CalculatorIcon className="h-3 w-3 mr-1" />
                    Calculator
                  </button>
                </div>
              </div>
              <input
                type="number"
                value={checkoutData.amountPaid}
                onChange={(e) => handleAmountPaidChange(e.target.value)}
                step="0.01"
                min="0"
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            {/* Calculator */}
            {showCalculator && (
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-300 mb-3">Quick Add:</div>
                <div className="grid grid-cols-3 gap-2">
                  {['1', '5', '10', '20', '50', '100'].map(amount => (
                    <button
                      key={amount}
                      onClick={() => handleCalculatorAdd(amount)}
                      className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded text-sm transition-colors"
                    >
                      +${amount}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCheckoutData(prev => ({ ...prev, amountPaid: 0 }))}
                  className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm transition-colors"
                >
                  Clear Amount
                </button>
              </div>
            )}

            {/* Change Due */}
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-center min-w-0">
                <span className="text-gray-300 font-medium flex-shrink-0">Change Due:</span>
                <span className={`text-lg font-bold ml-2 break-all ${change > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                  ${change.toFixed(2)}
                </span>
              </div>
              {change > 0 && (
                <div className="mt-2 text-xs text-yellow-400">
                  💰 Remember to give change to patient
                </div>
              )}
            </div>

            {/* Payment Validation */}
            {checkoutData.amountPaid < total && checkoutData.amountPaid > 0 && (
              <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
                <div className="text-red-400 text-sm">
                  ⚠️ Amount paid (${checkoutData.amountPaid.toFixed(2)}) is less than total (${total.toFixed(2)})
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Checkout Status */}
        <div>
          <h4 className="text-md font-medium text-white mb-3">Checkout Status</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Service Codes</span>
              <span className={`text-sm ${checkoutData.serviceCodes.some(s => s.code && s.description && (s.unitRate > 0 || s.isPackage)) ? 'text-green-400' : 'text-red-400'}`}>
                {checkoutData.serviceCodes.some(s => s.code && s.description && (s.unitRate > 0 || s.isPackage)) ? '✓ Complete' : '✗ Required'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Diagnostic Codes</span>
              <span className={`text-sm ${checkoutData.diagnosticCodes.some(d => d.code && d.description) ? 'text-green-400' : 'text-red-400'}`}>
                {checkoutData.diagnosticCodes.some(d => d.code && d.description) ? '✓ Complete' : '✗ Required'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Primary Diagnosis</span>
              <span className={`text-sm ${checkoutData.diagnosticCodes.filter(d => d.isPrimary).length === 1 ? 'text-green-400' : 'text-red-400'}`}>
                {checkoutData.diagnosticCodes.filter(d => d.isPrimary).length === 1 ? '✓ Selected' : '✗ Required'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Patient Signature</span>
              <span className={`text-sm ${hasSignature ? 'text-green-400' : 'text-gray-400'}`}>
                {hasSignature ? '✓ Captured' : '○ Optional'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Payment Amount</span>
              <span className={`text-sm ${checkoutData.amountPaid >= total ? 'text-green-400' : 'text-red-400'}`}>
                {checkoutData.amountPaid >= total ? '✓ Sufficient' : '✗ Insufficient'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex-shrink-0 p-6 border-t border-gray-700">
        <div className="space-y-3">
          <button
            onClick={onSubmit}
            disabled={!isReadyToSubmit() || submitting}
            className={`w-full flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-colors ${
              isReadyToSubmit() && !submitting
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing Checkout...
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                Save & Complete Checkout
              </>
            )}
          </button>

          <button
            onClick={onCancel}
            disabled={submitting}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="h-4 w-4 mr-2" />
            Cancel Checkout
          </button>
        </div>

        {!isReadyToSubmit() && (
          <div className="mt-3 text-xs text-gray-400 text-center">
            Complete all required fields to enable checkout
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialSummary;
