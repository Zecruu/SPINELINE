import { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';

const EnhancedInsuranceForm = ({ insuranceData, onInsuranceChange }) => {
  const [billingCodes, setBillingCodes] = useState(insuranceData?.billingCodes || []);
  const [showAddCode, setShowAddCode] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  const [newCode, setNewCode] = useState({
    code: '',
    description: '',
    copayAmount: 0,
    deductibleRemaining: 0
  });

  // Common billing codes for chiropractic practices
  const commonCodes = [
    { code: '98941', description: 'Chiropractic Manipulative Treatment, Spinal, 3-4 Regions' },
    { code: '98942', description: 'Chiropractic Manipulative Treatment, Spinal, 5 Regions' },
    { code: '98940', description: 'Chiropractic Manipulative Treatment, Spinal, 1-2 Regions' },
    { code: '97012', description: 'Mechanical Traction' },
    { code: '97014', description: 'Electrical Stimulation (Unattended)' },
    { code: '97110', description: 'Therapeutic Exercise' },
    { code: '97112', description: 'Neuromuscular Reeducation' },
    { code: '97124', description: 'Massage Therapy' },
    { code: '97140', description: 'Manual Therapy' },
    { code: '99213', description: 'Office Visit, Established Patient, Level 3' },
    { code: '99214', description: 'Office Visit, Established Patient, Level 4' },
    { code: '99203', description: 'Office Visit, New Patient, Level 3' },
    { code: '99204', description: 'Office Visit, New Patient, Level 4' }
  ];

  useEffect(() => {
    // Update parent component when billing codes change
    if (onInsuranceChange) {
      onInsuranceChange({
        ...insuranceData,
        billingCodes: billingCodes
      });
    }
  }, [billingCodes]);

  const handleAddCode = () => {
    if (!newCode.code.trim()) return;

    const codeToAdd = {
      ...newCode,
      code: newCode.code.toUpperCase(),
      isActive: true
    };

    setBillingCodes(prev => [...prev, codeToAdd]);
    setNewCode({
      code: '',
      description: '',
      copayAmount: 0,
      deductibleRemaining: 0
    });
    setShowAddCode(false);
  };

  const handleEditCode = (index) => {
    setEditingCode(index);
    setNewCode({ ...billingCodes[index] });
    setShowAddCode(true);
  };

  const handleUpdateCode = () => {
    if (editingCode !== null) {
      const updatedCodes = [...billingCodes];
      updatedCodes[editingCode] = {
        ...newCode,
        code: newCode.code.toUpperCase(),
        isActive: true
      };
      setBillingCodes(updatedCodes);
      setEditingCode(null);
      setNewCode({
        code: '',
        description: '',
        copayAmount: 0,
        deductibleRemaining: 0
      });
      setShowAddCode(false);
    }
  };

  const handleRemoveCode = (index) => {
    setBillingCodes(prev => prev.filter((_, i) => i !== index));
  };

  const selectCommonCode = (commonCode) => {
    setNewCode({
      ...newCode,
      code: commonCode.code,
      description: commonCode.description
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Basic Insurance Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Insurance Name *
          </label>
          <input
            type="text"
            value={insuranceData?.insuranceName || ''}
            onChange={(e) => onInsuranceChange?.({
              ...insuranceData,
              insuranceName: e.target.value
            })}
            className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Member ID *
          </label>
          <input
            type="text"
            value={insuranceData?.memberId || ''}
            onChange={(e) => onInsuranceChange?.({
              ...insuranceData,
              memberId: e.target.value
            })}
            className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Group ID
          </label>
          <input
            type="text"
            value={insuranceData?.groupId || ''}
            onChange={(e) => onInsuranceChange?.({
              ...insuranceData,
              groupId: e.target.value
            })}
            className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            General Copay
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={insuranceData?.copay || 0}
            onChange={(e) => onInsuranceChange?.({
              ...insuranceData,
              copay: parseFloat(e.target.value) || 0
            })}
            className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Deductible Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            General Deductible
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={insuranceData?.generalDeductible || 0}
            onChange={(e) => onInsuranceChange?.({
              ...insuranceData,
              generalDeductible: parseFloat(e.target.value) || 0
            })}
            className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Deductible Met
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={insuranceData?.deductibleMet || 0}
            onChange={(e) => onInsuranceChange?.({
              ...insuranceData,
              deductibleMet: parseFloat(e.target.value) || 0
            })}
            className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Deductible Remaining
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={insuranceData?.deductibleRemaining || 0}
            onChange={(e) => onInsuranceChange?.({
              ...insuranceData,
              deductibleRemaining: parseFloat(e.target.value) || 0
            })}
            className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Billing Code Specific Information */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white">Billing Code Specific Information</h3>
          <button
            onClick={() => setShowAddCode(true)}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add Code</span>
          </button>
        </div>

        {/* Billing Codes Table */}
        {billingCodes.length > 0 && (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider border-r border-gray-600">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider border-r border-gray-600">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider border-r border-gray-600">
                    Copay
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider border-r border-gray-600">
                    Deductible Remaining
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {billingCodes.map((code, index) => (
                  <tr key={index} className="hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm text-white font-medium border-r border-gray-600">
                      {code.code}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300 border-r border-gray-600">
                      {code.description}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-400 border-r border-gray-600">
                      {formatCurrency(code.copayAmount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-yellow-400 border-r border-gray-600">
                      {formatCurrency(code.deductibleRemaining)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditCode(index)}
                          className="p-1 text-gray-400 hover:text-white hover:bg-gray-600 rounded"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveCode(index)}
                          className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add/Edit Code Modal */}
        {showAddCode && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
              <h3 className="text-lg font-medium text-white mb-4">
                {editingCode !== null ? 'Edit Billing Code' : 'Add Billing Code'}
              </h3>

              {/* Common Codes Quick Select */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Quick Select Common Codes
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {commonCodes.map((commonCode) => (
                    <button
                      key={commonCode.code}
                      onClick={() => selectCommonCode(commonCode)}
                      className="text-left p-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                    >
                      <span className="font-medium text-blue-400">{commonCode.code}</span>
                      <span className="text-gray-300 ml-2">{commonCode.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Billing Code *
                  </label>
                  <input
                    type="text"
                    value={newCode.code}
                    onChange={(e) => setNewCode({ ...newCode, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 98941"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newCode.description}
                    onChange={(e) => setNewCode({ ...newCode, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Service description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Copay Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newCode.copayAmount}
                    onChange={(e) => setNewCode({ ...newCode, copayAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Deductible Remaining
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newCode.deductibleRemaining}
                    onChange={(e) => setNewCode({ ...newCode, deductibleRemaining: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddCode(false);
                    setEditingCode(null);
                    setNewCode({
                      code: '',
                      description: '',
                      copayAmount: 0,
                      deductibleRemaining: 0
                    });
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={editingCode !== null ? handleUpdateCode : handleAddCode}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingCode !== null ? 'Update' : 'Add'} Code
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Insurance Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Insurance Notes
        </label>
        <textarea
          value={insuranceData?.notes || ''}
          onChange={(e) => onInsuranceChange?.({
            ...insuranceData,
            notes: e.target.value
          })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Additional insurance information or notes..."
        />
      </div>
    </div>
  );
};

export default EnhancedInsuranceForm;
