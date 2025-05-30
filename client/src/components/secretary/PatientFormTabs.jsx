import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { PlusIcon, TrashIcon, DocumentIcon, EyeIcon, ArrowDownTrayIcon, PencilIcon, XMarkIcon } from '@heroicons/react/24/outline';

// Global modal state to persist across component re-renders
let globalModalState = {
  isOpen: false,
  file: null,
  previewUrl: null,
  onClose: null,
  onDownload: null,
  formatFileSize: null,
  escapeHandler: null
};

// Global modal container
let globalModalContainer = null;

// Global modal manager
const GlobalModalManager = {
  open: (file, previewUrl, onClose, onDownload, formatFileSize) => {
    console.log('🌍 GlobalModalManager: Opening modal for', file.originalName);
    globalModalState = {
      isOpen: true,
      file,
      previewUrl,
      onClose,
      onDownload,
      formatFileSize
    };
    GlobalModalManager.render();
  },

  close: () => {
    console.log('🌍 GlobalModalManager: Closing modal');

    // Clean up event listeners
    if (globalModalState.escapeHandler) {
      document.removeEventListener('keydown', globalModalState.escapeHandler);
    }

    // Clean up blob URL
    if (globalModalState.previewUrl) {
      window.URL.revokeObjectURL(globalModalState.previewUrl);
    }

    // Call the original onClose callback if it exists
    if (globalModalState.onClose) {
      globalModalState.onClose();
    }

    // Reset state
    globalModalState = {
      isOpen: false,
      file: null,
      previewUrl: null,
      onClose: null,
      onDownload: null,
      formatFileSize: null,
      escapeHandler: null
    };

    GlobalModalManager.render();
  },

  render: () => {
    if (!globalModalContainer) {
      globalModalContainer = document.createElement('div');
      globalModalContainer.id = 'global-file-preview-modal';
      document.body.appendChild(globalModalContainer);
    }

    if (globalModalState.isOpen) {
      globalModalContainer.innerHTML = `
        <div class="fixed inset-0 z-[9999] overflow-y-auto">
          <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div id="modal-backdrop" class="fixed inset-0 bg-black bg-opacity-75 transition-opacity"></div>
            <div id="modal-content" class="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
              <div class="bg-gray-900 px-4 py-3 sm:px-6 flex justify-between items-center">
                <h3 class="text-lg leading-6 font-medium text-white">
                  File Preview: ${globalModalState.file.originalName || globalModalState.file.fileName}
                </h3>
                <button id="modal-close-x" class="text-gray-400 hover:text-white">
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div class="bg-gray-800 px-4 py-4 max-h-[70vh] overflow-auto">
                ${globalModalState.file.mimeType?.includes('pdf') ?
                  `<iframe src="${globalModalState.previewUrl}" class="w-full h-[60vh] border border-gray-600 rounded" title="${globalModalState.file.originalName}"></iframe>` :
                  globalModalState.file.mimeType?.startsWith('image/') ?
                  `<img src="${globalModalState.previewUrl}" alt="${globalModalState.file.originalName}" class="max-w-full max-h-[60vh] mx-auto rounded">` :
                  `<div class="text-center py-8 text-gray-400">
                    <p>Preview not available for this file type.</p>
                    <p class="text-sm">You can download the file to view it.</p>
                  </div>`
                }
              </div>
              <div class="bg-gray-700 px-4 py-3 sm:px-6 flex justify-between items-center">
                <div class="text-sm text-gray-400">
                  <span>${globalModalState.formatFileSize(globalModalState.file.fileSize)} • ${globalModalState.file.category}</span>
                </div>
                <div class="flex space-x-2">
                  <button id="modal-download" class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                    Download
                  </button>
                  <button id="modal-close" class="inline-flex items-center px-3 py-2 border border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600">
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      // Add event listeners after rendering
      GlobalModalManager.attachEventListeners();
    } else {
      globalModalContainer.innerHTML = '';
    }
  },

  attachEventListeners: () => {
    // Backdrop click
    const backdrop = document.getElementById('modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🚪 Backdrop clicked - closing modal');
        GlobalModalManager.close();
      });
    }

    // Close X button
    const closeX = document.getElementById('modal-close-x');
    if (closeX) {
      closeX.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🚪 Close X clicked - closing modal');
        GlobalModalManager.close();
      });
    }

    // Close button
    const closeBtn = document.getElementById('modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🚪 Close button clicked - closing modal');
        GlobalModalManager.close();
      });
    }

    // Download button
    const downloadBtn = document.getElementById('modal-download');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('📥 Download button clicked');
        GlobalModalManager.download();
      });
    }

    // Modal content click (prevent closing)
    const modalContent = document.getElementById('modal-content');
    if (modalContent) {
      modalContent.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('📄 Modal content clicked - preventing close');
      });
    }

    // Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape' && globalModalState.isOpen) {
        e.preventDefault();
        e.stopPropagation();
        console.log('⌨️ Escape key pressed - closing modal');
        GlobalModalManager.close();
      }
    };

    document.addEventListener('keydown', handleEscape);

    // Store the escape handler for cleanup
    globalModalState.escapeHandler = handleEscape;
  },

  download: () => {
    if (globalModalState.onDownload && globalModalState.file) {
      globalModalState.onDownload(globalModalState.file._id, globalModalState.file.originalName);
    }
  }
};

// Make it globally available
window.GlobalModalManager = GlobalModalManager;

// Insurance Tab Component
export const InsuranceTab = ({ formData, addInsurance, updateInsurance, removeInsurance }) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <h4 className="text-lg font-medium text-white">Insurance Information</h4>
      <button
        type="button"
        onClick={addInsurance}
        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <PlusIcon className="h-4 w-4 mr-2" />
        Add Insurance
      </button>
    </div>

    {formData.insurances.length === 0 ? (
      <div className="text-center py-8 text-gray-400">
        No insurance information added yet. Click "Add Insurance" to get started.
      </div>
    ) : (
      <div className="space-y-4">
        {formData.insurances.map((insurance, index) => (
          <div key={index} className="border border-gray-600 rounded-lg p-4 bg-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h5 className="text-md font-medium text-white">
                Insurance #{index + 1}
                {insurance.isPrimary && <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded">Primary</span>}
              </h5>
              <button
                type="button"
                onClick={() => removeInsurance(index)}
                className="text-red-400 hover:text-red-300"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Insurance Name *</label>
                <input
                  type="text"
                  value={insurance.insuranceName}
                  onChange={(e) => updateInsurance(index, 'insuranceName', e.target.value)}
                  required
                  className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-800 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Member ID *</label>
                <input
                  type="text"
                  value={insurance.memberId}
                  onChange={(e) => updateInsurance(index, 'memberId', e.target.value)}
                  required
                  className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-800 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Group ID</label>
                <input
                  type="text"
                  value={insurance.groupId}
                  onChange={(e) => updateInsurance(index, 'groupId', e.target.value)}
                  className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-800 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Co-pay ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={insurance.copay}
                  onChange={(e) => updateInsurance(index, 'copay', parseFloat(e.target.value) || 0)}
                  className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-800 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Expiration Date</label>
                <input
                  type="date"
                  value={insurance.expirationDate ? insurance.expirationDate.split('T')[0] : ''}
                  onChange={(e) => updateInsurance(index, 'expirationDate', e.target.value)}
                  className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-800 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={insurance.isPrimary}
                  onChange={(e) => updateInsurance(index, 'isPrimary', e.target.checked)}
                  className="rounded border-gray-600 text-blue-600 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-300">Primary Insurance</span>
              </label>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// Referrals Tab Component
export const ReferralsTab = ({ formData, addReferral, updateReferral, removeReferral }) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <h4 className="text-lg font-medium text-white">Referral Information</h4>
      <button
        type="button"
        onClick={addReferral}
        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <PlusIcon className="h-4 w-4 mr-2" />
        Add Referral
      </button>
    </div>

    {formData.referrals.length === 0 ? (
      <div className="text-center py-8 text-gray-400">
        No referrals added yet. Click "Add Referral" to get started.
      </div>
    ) : (
      <div className="space-y-4">
        {formData.referrals.map((referral, index) => {
          const referralDate = new Date(referral.referralDate);
          const expirationDate = new Date(referralDate);
          expirationDate.setDate(expirationDate.getDate() + (referral.duration || 90));
          const remainingDays = Math.ceil((expirationDate - new Date()) / (1000 * 60 * 60 * 24));

          return (
            <div key={index} className="border border-gray-600 rounded-lg p-4 bg-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h5 className="text-md font-medium text-white">
                  Referral #{index + 1}
                  {remainingDays > 0 ? (
                    <span className={`ml-2 text-xs px-2 py-1 rounded ${
                      remainingDays <= 7 ? 'bg-red-600 text-white' :
                      remainingDays <= 30 ? 'bg-yellow-600 text-white' :
                      'bg-green-600 text-white'
                    }`}>
                      {remainingDays} days left
                    </span>
                  ) : (
                    <span className="ml-2 text-xs bg-red-600 text-white px-2 py-1 rounded">Expired</span>
                  )}
                </h5>
                <button
                  type="button"
                  onClick={() => removeReferral(index)}
                  className="text-red-400 hover:text-red-300"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300">Referral Source *</label>
                  <input
                    type="text"
                    value={referral.source}
                    onChange={(e) => updateReferral(index, 'source', e.target.value)}
                    required
                    placeholder="Dr. Smith, ABC Medical Center"
                    className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-800 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Referral Date *</label>
                  <input
                    type="date"
                    value={referral.referralDate ? referral.referralDate.split('T')[0] : ''}
                    onChange={(e) => updateReferral(index, 'referralDate', e.target.value)}
                    required
                    className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-800 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300">Duration (Days)</label>
                  <select
                    value={referral.duration || 90}
                    onChange={(e) => updateReferral(index, 'duration', parseInt(e.target.value))}
                    className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-800 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={30}>30 Days</option>
                    <option value={60}>60 Days</option>
                    <option value={90}>90 Days</option>
                    <option value={120}>120 Days</option>
                    <option value={180}>180 Days</option>
                    <option value={365}>1 Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Expiration Date</label>
                  <input
                    type="date"
                    value={expirationDate.toISOString().split('T')[0]}
                    readOnly
                    className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-600 text-gray-300 px-3 py-2 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300">Notes</label>
                <textarea
                  value={referral.notes || ''}
                  onChange={(e) => updateReferral(index, 'notes', e.target.value)}
                  rows={2}
                  className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-800 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

// Packages Tab Component
export const PackagesTab = ({ formData, addPackage, updatePackage, removePackage }) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <h4 className="text-lg font-medium text-white">Treatment Packages</h4>
      <button
        type="button"
        onClick={addPackage}
        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <PlusIcon className="h-4 w-4 mr-2" />
        Add Package
      </button>
    </div>

    {formData.packages.length === 0 ? (
      <div className="text-center py-8 text-gray-400">
        No packages added yet. Click "Add Package" to get started.
      </div>
    ) : (
      <div className="space-y-4">
        {formData.packages.map((pkg, index) => (
          <div key={index} className="border border-gray-600 rounded-lg p-4 bg-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h5 className="text-md font-medium text-white">
                Package #{index + 1}
                {pkg.isActive && (
                  <span className="ml-2 text-xs bg-green-600 text-white px-2 py-1 rounded">Active</span>
                )}
              </h5>
              <button
                type="button"
                onClick={() => removePackage(index)}
                className="text-red-400 hover:text-red-300"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Package Name *</label>
                <input
                  type="text"
                  value={pkg.packageName}
                  onChange={(e) => updatePackage(index, 'packageName', e.target.value)}
                  required
                  placeholder="Basic Treatment Package"
                  className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-800 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Total Visits *</label>
                <input
                  type="number"
                  min="1"
                  value={pkg.totalVisits}
                  onChange={(e) => updatePackage(index, 'totalVisits', parseInt(e.target.value) || 1)}
                  required
                  className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-800 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Package Cost ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pkg.packageCost || 0}
                  onChange={(e) => updatePackage(index, 'packageCost', parseFloat(e.target.value) || 0)}
                  className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-800 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Used Visits</label>
                <input
                  type="number"
                  min="0"
                  max={pkg.totalVisits}
                  value={pkg.usedVisits || 0}
                  onChange={(e) => updatePackage(index, 'usedVisits', parseInt(e.target.value) || 0)}
                  className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-800 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Remaining Visits</label>
                <input
                  type="number"
                  value={(pkg.totalVisits || 0) - (pkg.usedVisits || 0)}
                  readOnly
                  className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-600 text-gray-300 px-3 py-2 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={pkg.isActive !== false}
                  onChange={(e) => updatePackage(index, 'isActive', e.target.checked)}
                  className="rounded border-gray-600 text-blue-600 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-300">Active Package</span>
              </label>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// Alerts Tab Component
export const AlertsTab = ({ formData, addAlert, updateAlert, removeAlert }) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <h4 className="text-lg font-medium text-white">Patient Alerts</h4>
      <button
        type="button"
        onClick={addAlert}
        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <PlusIcon className="h-4 w-4 mr-2" />
        Add Alert
      </button>
    </div>

    {formData.alerts.length === 0 ? (
      <div className="text-center py-8 text-gray-400">
        No alerts added yet. Click "Add Alert" to get started.
      </div>
    ) : (
      <div className="space-y-4">
        {formData.alerts.map((alert, index) => (
          <div key={index} className="border border-gray-600 rounded-lg p-4 bg-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h5 className="text-md font-medium text-white">
                Alert #{index + 1}
                <span className={`ml-2 text-xs px-2 py-1 rounded ${
                  alert.priority === 'Critical' ? 'bg-red-600 text-white' :
                  alert.priority === 'High' ? 'bg-orange-600 text-white' :
                  alert.priority === 'Medium' ? 'bg-yellow-600 text-white' :
                  'bg-gray-600 text-white'
                }`}>
                  {alert.priority}
                </span>
              </h5>
              <button
                type="button"
                onClick={() => removeAlert(index)}
                className="text-red-400 hover:text-red-300"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Alert Type *</label>
                <select
                  value={alert.type}
                  onChange={(e) => updateAlert(index, 'type', e.target.value)}
                  required
                  className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-800 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Important Note">Important Note</option>
                  <option value="Referral Expiring">Referral Expiring</option>
                  <option value="Payment Pending">Payment Pending</option>
                  <option value="Package Expiring">Package Expiring</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Priority *</label>
                <select
                  value={alert.priority}
                  onChange={(e) => updateAlert(index, 'priority', e.target.value)}
                  required
                  className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-800 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-300">Alert Message *</label>
              <textarea
                value={alert.message}
                onChange={(e) => updateAlert(index, 'message', e.target.value)}
                required
                rows={3}
                placeholder="Enter alert message..."
                className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-800 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={alert.isVisible !== false}
                  onChange={(e) => updateAlert(index, 'isVisible', e.target.checked)}
                  className="rounded border-gray-600 text-blue-600 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-300">Visible Alert</span>
              </label>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// Files Tab Component - Memoized with custom comparison
export const FilesTab = memo(({ formData, addFile, updateFile, removeFile, patientId }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [editingFile, setEditingFile] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isPreviewOpening, setIsPreviewOpening] = useState(false);
  const modalOpenRef = useRef(false);

  // Track component lifecycle
  useEffect(() => {
    console.log('📁 FilesTab component mounted');
    return () => {
      console.log('📁 FilesTab component unmounting');
      // Cleanup any open preview
      if (modalOpenRef.current && previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
      }
    };
  }, []);

  const fileCategories = [
    'X-Ray',
    'MRI',
    'CT Scan',
    'Lab Report',
    'Insurance Card',
    'Referral',
    'Other'
  ];

  // Debug preview state changes
  useEffect(() => {
    console.log('🔄 Preview state changed:', {
      previewFile: previewFile ? previewFile.originalName : null,
      previewUrl: previewUrl ? 'URL exists' : 'No URL',
      modalOpenRef: modalOpenRef.current,
      isPreviewOpening: isPreviewOpening
    });

    // If preview file exists but modal ref is false, something is wrong
    if (previewFile && !modalOpenRef.current) {
      console.warn('⚠️ Preview file exists but modalOpenRef is false - potential race condition');
    }
  }, [previewFile, previewUrl, isPreviewOpening]);

  // Handle escape key to close preview
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && previewFile) {
        console.log('⌨️ Escape key pressed - closing preview');
        closePreview();
      }
    };

    if (previewFile) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [previewFile]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    try {
      setUploading(true);
      setUploadError('');

      const uploadFormData = new FormData();
      uploadFormData.append('document', file);
      uploadFormData.append('category', 'Other'); // Default category

      const token = localStorage.getItem('userToken');

      // If patient exists, upload to server
      if (patientId) {
        const response = await fetch(`/api/patients/${patientId}/documents`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: uploadFormData
        });

        if (!response.ok) {
          throw new Error('Failed to upload file');
        }

        const result = await response.json();
        if (result.success) {
          // Add the uploaded file to the local state
          addFile(result.document);
        }
      } else {
        // For new patients, store file data temporarily
        const fileData = {
          fileName: file.name,
          originalName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          category: 'Other'
        };
        addFile(fileData);
      }

      // Reset file input
      event.target.value = '';
    } catch (error) {
      console.error('File upload error:', error);
      setUploadError(error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) {
      return '🖼️';
    } else if (mimeType?.includes('pdf')) {
      return '📄';
    } else if (mimeType?.includes('word')) {
      return '📝';
    } else {
      return '📁';
    }
  };

  const downloadFile = async (fileId, fileName) => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await fetch(`/api/patients/${patientId}/files/${fileId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const startEditingFileName = (index, currentName) => {
    setEditingFile(index);
    setEditingName(currentName);
  };

  const saveFileName = async (index) => {
    if (!editingName.trim()) {
      setEditingFile(null);
      return;
    }

    try {
      const file = formData.files[index];

      // If patient exists, update on server
      if (patientId && file._id) {
        const token = localStorage.getItem('userToken');
        const response = await fetch(`/api/patients/${patientId}/files/${file._id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            originalName: editingName
          })
        });

        if (response.ok) {
          updateFile(index, 'originalName', editingName);
        }
      } else {
        // For new patients, just update locally
        updateFile(index, 'originalName', editingName);
      }

      setEditingFile(null);
      setEditingName('');
    } catch (error) {
      console.error('Error updating file name:', error);
    }
  };

  const cancelEditingFileName = () => {
    setEditingFile(null);
    setEditingName('');
  };

  const previewFileContent = async (file, index) => {
    try {
      console.log('🔍 Preview requested for file:', file);

      if (isPreviewOpening) {
        console.log('⏳ Preview already opening, ignoring request');
        return;
      }

      setIsPreviewOpening(true);

      if (patientId && file._id) {
        // For existing files, get from server
        const token = localStorage.getItem('userToken');
        console.log('📡 Fetching preview from:', `/api/patients/${patientId}/files/${file._id}/preview`);

        const response = await fetch(`/api/patients/${patientId}/files/${file._id}/preview`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('📡 Preview response status:', response.status);

        if (response.ok) {
          const blob = await response.blob();
          console.log('📄 Blob created, size:', blob.size, 'type:', blob.type);

          const url = window.URL.createObjectURL(blob);
          console.log('🔗 Preview URL created:', url);

          // Use global modal manager instead of component state
          modalOpenRef.current = true;
          console.log('✅ Opening preview with GlobalModalManager');

          GlobalModalManager.open(
            { ...file, index },
            url,
            () => {
              modalOpenRef.current = false;
              setIsPreviewOpening(false);
            },
            downloadFile,
            formatFileSize
          );

          // Reset flag after a delay
          setTimeout(() => {
            setIsPreviewOpening(false);
          }, 500);
        } else {
          const errorText = await response.text();
          console.error('❌ Preview failed:', response.status, errorText);
          alert(`Failed to load preview: ${response.status} ${response.statusText}`);
        }
      } else {
        // For new files, we can't preview them yet
        console.log('⚠️ Cannot preview unsaved file');
        alert('File preview is only available after the patient is saved.');
      }
    } catch (error) {
      console.error('❌ Preview error:', error);
      alert('Unable to preview this file: ' + error.message);
    }
  };

  const closePreview = () => {
    console.log('🚪 Closing preview modal via GlobalModalManager');
    GlobalModalManager.close();
    modalOpenRef.current = false;
    setPreviewFile(null);
    setPreviewUrl('');
    setIsPreviewOpening(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-medium text-white">Patient Files</h4>
        <div className="flex items-center space-x-2">
          <input
            type="file"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
            id="file-upload"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.bmp,.tiff"
          />
          <label
            htmlFor="file-upload"
            className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer ${
              uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload File'}
          </label>
        </div>
      </div>

      {uploadError && (
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
          {uploadError}
        </div>
      )}

      {formData.files.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <DocumentIcon className="h-12 w-12 mx-auto mb-4 text-gray-500" />
          <p>No files uploaded yet.</p>
          <p className="text-sm">Upload medical records, insurance cards, referrals, and other documents.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {formData.files.map((file, index) => (
            <div key={index} className="border border-gray-600 rounded-lg p-4 bg-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getFileIcon(file.mimeType)}</span>
                  <div className="flex-1">
                    {editingFile === index ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') saveFileName(index);
                            if (e.key === 'Escape') cancelEditingFileName();
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => saveFileName(index)}
                          className="text-green-400 hover:text-green-300 p-1"
                          title="Save"
                        >
                          ✓
                        </button>
                        <button
                          onClick={cancelEditingFileName}
                          className="text-gray-400 hover:text-gray-300 p-1"
                          title="Cancel"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center space-x-2">
                          <h5 className="text-white font-medium">{file.originalName || file.fileName}</h5>
                          <button
                            onClick={() => startEditingFileName(index, file.originalName || file.fileName)}
                            className="text-gray-400 hover:text-gray-300 p-1"
                            title="Edit name"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                          <span>{formatFileSize(file.fileSize)}</span>
                          <span>•</span>
                          <span>{file.category}</span>
                          {file.uploadedAt && (
                            <>
                              <span>•</span>
                              <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {patientId && file._id && (
                    <>
                      <button
                        onClick={() => previewFileContent(file, index)}
                        className="text-purple-400 hover:text-purple-300 p-1"
                        title="Preview"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => downloadFile(file._id, file.originalName)}
                        className="text-blue-400 hover:text-blue-300 p-1"
                        title="Download"
                      >
                        <ArrowDownTrayIcon className="h-5 w-5" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-400 hover:text-red-300 p-1"
                    title="Remove"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-300">Category</label>
                <select
                  value={file.category}
                  onChange={(e) => updateFile(index, 'category', e.target.value)}
                  className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-800 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {fileCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-sm text-gray-400">
        <p><strong>Supported formats:</strong> PDF, DOC, DOCX, JPG, JPEG, PNG, GIF, BMP, TIFF</p>
        <p><strong>Maximum file size:</strong> 10MB</p>
      </div>

      {/* File Preview Modal is now handled by GlobalModalManager */}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function - only re-render if files array or patientId changes
  const filesEqual = JSON.stringify(prevProps.formData.files) === JSON.stringify(nextProps.formData.files);
  const patientIdEqual = prevProps.patientId === nextProps.patientId;

  console.log('🔍 FilesTab memo comparison:', {
    filesEqual,
    patientIdEqual,
    shouldSkipRender: filesEqual && patientIdEqual
  });

  return filesEqual && patientIdEqual;
});

// Add display name for debugging
FilesTab.displayName = 'FilesTab';

// Separate File Preview Modal Component
const FilePreviewModal = ({ file, previewUrl, onClose, onDownload, formatFileSize }) => {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    console.log('🎬 FilePreviewModal mounted for:', file.originalName);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    return () => {
      console.log('🎬 FilePreviewModal unmounting');
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleClose = () => {
    if (isClosing) return;
    console.log('🚪 FilePreviewModal closing');
    setIsClosing(true);
    onClose();
  };

  const handleBackdropClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🚪 Backdrop clicked in FilePreviewModal');
    handleClose();
  };

  const handleContentClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('📄 Modal content clicked - preventing close');
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-black bg-opacity-75 transition-opacity"
          onClick={handleBackdropClick}
        ></div>

        <div
          className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full"
          onClick={handleContentClick}
        >
          {/* Header */}
          <div className="bg-gray-900 px-4 py-3 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-white">
              File Preview: {file.originalName || file.fileName}
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Preview Content */}
          <div className="bg-gray-800 px-4 py-4 max-h-[70vh] overflow-auto">
            {file.mimeType?.startsWith('image/') ? (
              <div className="text-center">
                <img
                  src={previewUrl}
                  alt={file.originalName}
                  className="max-w-full max-h-[60vh] mx-auto rounded"
                />
              </div>
            ) : file.mimeType?.includes('pdf') ? (
              <div className="text-center">
                <iframe
                  src={previewUrl}
                  className="w-full h-[60vh] border border-gray-600 rounded"
                  title={file.originalName}
                />
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <DocumentIcon className="h-16 w-16 mx-auto mb-4" />
                <p>Preview not available for this file type.</p>
                <p className="text-sm">You can download the file to view it.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-700 px-4 py-3 sm:px-6 flex justify-between items-center">
            <div className="text-sm text-gray-400">
              <span>{formatFileSize(file.fileSize)} • {file.category}</span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => onDownload(file._id, file.originalName)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Download
              </button>
              <button
                onClick={handleClose}
                className="inline-flex items-center px-3 py-2 border border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};