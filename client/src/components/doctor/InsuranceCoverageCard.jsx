import { useState } from 'react';
import { 
  ShieldCheckIcon, 
  ExclamationTriangleIcon, 
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';

const InsuranceCoverageCard = ({ patient, selectedCodes = [] }) => {
  const [expandedInsurance, setExpandedInsurance] = useState({});

  if (!patient?.insurances || patient.insurances.length === 0) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <h4 className="text-white font-medium mb-3 flex items-center">
          <ShieldCheckIcon className="h-5 w-5 mr-2" />
          Insurance Coverage
        </h4>
        <div className="text-center py-4 text-gray-400">
          <p>No insurance information available</p>
        </div>
      </div>
    );
  }

  const toggleExpanded = (index) => {
    setExpandedInsurance(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const isExpired = (expirationDate) => {
    if (!expirationDate) return false;
    return new Date(expirationDate) < new Date();
  };

  const getExpirationStatus = (expirationDate) => {
    if (!expirationDate) return null;
    
    const expDate = new Date(expirationDate);
    const today = new Date();
    const daysUntilExpiration = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiration < 0) {
      return { type: 'expired', message: 'Expired', color: 'text-red-400' };
    } else if (daysUntilExpiration <= 30) {
      return { type: 'warning', message: `Expires in ${daysUntilExpiration} days`, color: 'text-yellow-400' };
    }
    return { type: 'valid', message: 'Valid', color: 'text-green-400' };
  };

  const getCoverageStatus = (cptCode, insurance) => {
    if (!insurance.coveredCodes || insurance.coveredCodes.length === 0) {
      return { type: 'unknown', message: 'Coverage unknown', icon: ExclamationTriangleIcon, color: 'text-yellow-400' };
    }

    const coverage = insurance.coveredCodes.find(code =>
      code.cptCode.toUpperCase() === cptCode.toUpperCase()
    );

    if (!coverage) {
      return { type: 'not-covered', message: 'Not covered', icon: XCircleIcon, color: 'text-red-400' };
    }

    // Check remaining units
    if (coverage.unitsAllowed === 0) {
      return { type: 'exhausted', message: 'Coverage exhausted', icon: XCircleIcon, color: 'text-red-400' };
    } else if (coverage.unitsAllowed <= 2) {
      return { type: 'low', message: `${coverage.unitsAllowed} units left`, icon: ExclamationTriangleIcon, color: 'text-yellow-400' };
    }

    return { type: 'covered', message: `${coverage.unitsAllowed} units available`, icon: CheckCircleIcon, color: 'text-green-400' };
  };

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <h4 className="text-white font-medium mb-3 flex items-center">
        <ShieldCheckIcon className="h-5 w-5 mr-2" />
        Insurance Coverage Breakdown
      </h4>

      <div className="space-y-3">
        {patient.insurances.map((insurance, index) => {
          const expirationStatus = getExpirationStatus(insurance.expirationDate);
          const isExpanded = expandedInsurance[index];
          const hasCoveredCodes = insurance.coveredCodes && insurance.coveredCodes.length > 0;

          return (
            <div key={index} className="border border-gray-600 rounded-lg">
              {/* Insurance Header */}
              <div 
                className="p-3 cursor-pointer hover:bg-gray-600 transition-colors"
                onClick={() => toggleExpanded(index)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h5 className="text-white font-medium">{insurance.insuranceName}</h5>
                      {insurance.isPrimary && (
                        <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Primary</span>
                      )}
                      {expirationStatus && (
                        <span className={`text-xs ${expirationStatus.color} flex items-center`}>
                          {expirationStatus.type === 'expired' && <XCircleIcon className="h-3 w-3 mr-1" />}
                          {expirationStatus.type === 'warning' && <ClockIcon className="h-3 w-3 mr-1" />}
                          {expirationStatus.type === 'valid' && <CheckCircleIcon className="h-3 w-3 mr-1" />}
                          {expirationStatus.message}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      <span>Policy: {insurance.memberId}</span>
                      {insurance.groupId && <span> • Group: {insurance.groupId}</span>}
                      {insurance.copay > 0 && <span> • Copay: ${insurance.copay}</span>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {hasCoveredCodes && (
                      <span className="text-xs text-gray-400">
                        {insurance.coveredCodes.length} codes
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUpIcon className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Coverage Details */}
              {isExpanded && (
                <div className="border-t border-gray-600 p-3 bg-gray-800">
                  {hasCoveredCodes ? (
                    <div className="space-y-3">
                      {/* Coverage Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-600">
                              <th className="text-left text-gray-300 pb-2">CPT Code</th>
                              <th className="text-left text-gray-300 pb-2">Description</th>
                              <th className="text-right text-gray-300 pb-2">Units</th>
                              <th className="text-right text-gray-300 pb-2">Rate</th>
                              <th className="text-right text-gray-300 pb-2">Total</th>
                              <th className="text-right text-gray-300 pb-2">Copay</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-600">
                            {insurance.coveredCodes.map((code, codeIndex) => {
                              const isExhausted = code.unitsAllowed === 0;
                              const isLow = code.unitsAllowed <= 2 && code.unitsAllowed > 0;

                              return (
                                <tr key={codeIndex} className={`text-gray-300 ${isExhausted ? 'bg-red-900/20' : isLow ? 'bg-yellow-900/20' : ''}`}>
                                  <td className="py-2 font-mono">{code.cptCode}</td>
                                  <td className="py-2 text-sm">{code.description}</td>
                                  <td className={`py-2 text-right ${isExhausted ? 'text-red-400 font-bold' : isLow ? 'text-yellow-400 font-bold' : ''}`}>
                                    {code.unitsAllowed}
                                    {isExhausted && <span className="ml-1 text-xs">(EXHAUSTED)</span>}
                                    {isLow && <span className="ml-1 text-xs">(LOW)</span>}
                                  </td>
                                  <td className="py-2 text-right">${code.unitRate.toFixed(2)}</td>
                                  <td className="py-2 text-right font-medium">${code.totalAllowed.toFixed(2)}</td>
                                  <td className="py-2 text-right">${code.copayPerUnit.toFixed(2)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Selected Codes Coverage Status */}
                      {selectedCodes.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-gray-600">
                          <h6 className="text-sm font-medium text-gray-300 mb-2">Current Visit Coverage</h6>
                          <div className="space-y-1">
                            {selectedCodes.map((code, codeIndex) => {
                              const status = getCoverageStatus(code.code || code.cptCode, insurance);
                              const StatusIcon = status.icon;
                              
                              return (
                                <div key={codeIndex} className="flex items-center justify-between text-sm">
                                  <span className="text-gray-300">{code.code || code.cptCode}</span>
                                  <div className={`flex items-center ${status.color}`}>
                                    <StatusIcon className="h-3 w-3 mr-1" />
                                    <span>{status.message}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-400">
                      <ExclamationTriangleIcon className="h-8 w-8 mx-auto mb-2 text-yellow-400" />
                      <p>No coverage information specified</p>
                      <p className="text-xs mt-1">Contact insurance or update patient record</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Coverage Alerts */}
      {patient.insurances.some(ins => isExpired(ins.expirationDate)) && (
        <div className="mt-3 p-3 bg-red-900/20 border border-red-600 rounded-lg">
          <div className="flex items-center text-red-400">
            <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">Insurance Alert</span>
          </div>
          <p className="text-sm text-red-300 mt-1">
            One or more insurance plans have expired. Verify coverage before treatment.
          </p>
        </div>
      )}

      {/* Coverage Exhaustion Alerts */}
      {patient.insurances.some(ins =>
        ins.coveredCodes && ins.coveredCodes.some(code => code.unitsAllowed === 0)
      ) && (
        <div className="mt-3 p-3 bg-red-900/20 border border-red-600 rounded-lg">
          <div className="flex items-center text-red-400">
            <XCircleIcon className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">Coverage Exhausted</span>
          </div>
          <p className="text-sm text-red-300 mt-1">
            Some procedure codes have exhausted their coverage limits. Review before billing.
          </p>
        </div>
      )}

      {/* Low Coverage Alerts */}
      {patient.insurances.some(ins =>
        ins.coveredCodes && ins.coveredCodes.some(code => code.unitsAllowed <= 2 && code.unitsAllowed > 0)
      ) && (
        <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-600 rounded-lg">
          <div className="flex items-center text-yellow-400">
            <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">Low Coverage Warning</span>
          </div>
          <p className="text-sm text-yellow-300 mt-1">
            Some procedure codes have low remaining coverage units. Plan accordingly.
          </p>
        </div>
      )}
    </div>
  );
};

export default InsuranceCoverageCard;
