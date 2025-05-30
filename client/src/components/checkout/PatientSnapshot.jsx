import {
  UserIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  CubeIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

const PatientSnapshot = ({ appointment, checkoutData }) => {
  if (!appointment || !appointment.patient) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-center text-gray-400">
          No patient data available
        </div>
      </div>
    );
  }

  const patient = appointment.patient;

  // Calculate referral status
  const activeReferrals = patient.referrals?.filter(ref => ref.isActive) || [];
  const expiringReferrals = activeReferrals.filter(ref => ref.remainingDays <= 7);

  // Calculate insurance status
  const primaryInsurance = patient.insurances?.find(ins => ins.isPrimary);
  const insuranceDaysUntilExpiry = primaryInsurance?.expirationDate ?
    Math.ceil((new Date(primaryInsurance.expirationDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  const insuranceExpiring = insuranceDaysUntilExpiry !== null && insuranceDaysUntilExpiry <= 30 && insuranceDaysUntilExpiry >= 0;

  // Get active packages and check which ones are being used in current checkout
  const activePackages = patient.packages?.filter(pkg => pkg.isActive && pkg.remainingVisits >= 0) || [];
  const expiringPackages = patient.packages?.filter(pkg => pkg.isActive && pkg.remainingVisits === 0) || [];

  // Check which packages are being used in the current checkout
  const packagesInUse = checkoutData?.serviceCodes?.filter(code => code.isPackage) || [];
  const getPackageUsageStatus = (pkg) => {
    const isBeingUsed = packagesInUse.some(code => code.packageId === pkg._id);
    return isBeingUsed;
  };

  // Get visible alerts
  const visibleAlerts = patient.alerts?.filter(alert => alert.isVisible) || [];

  // Format time
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Get alert priority color
  const getAlertColor = (priority) => {
    switch (priority) {
      case 'Critical': return 'text-red-400 bg-red-900/20 border-red-700';
      case 'High': return 'text-orange-400 bg-orange-900/20 border-orange-700';
      case 'Medium': return 'text-yellow-400 bg-yellow-900/20 border-yellow-700';
      case 'Low': return 'text-blue-400 bg-blue-900/20 border-blue-700';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-700';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
            <UserIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{patient.fullName}</h3>
            <p className="text-sm text-gray-400">Record: {patient.recordNumber}</p>
          </div>
        </div>
      </div>

      {/* Appointment Info */}
      <div className="p-6 border-b border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
          <ClockIcon className="h-4 w-4 mr-2" />
          Today's Appointment
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Time:</span>
            <span className="text-white">{formatTime(appointment.appointmentTime)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Visit Type:</span>
            <span className="text-white">{appointment.visitType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Status:</span>
            <span className="px-2 py-1 rounded text-xs bg-green-900/50 text-green-300 border border-green-700">
              {appointment.status}
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Insurance Status */}
        <div className="p-6 border-b border-gray-700">
          <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
            <ShieldCheckIcon className="h-4 w-4 mr-2" />
            Insurance Status
          </h4>
          {primaryInsurance ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Provider:</span>
                <span className="text-white">{primaryInsurance.insuranceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Member ID:</span>
                <span className="text-white">{primaryInsurance.memberId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Copay:</span>
                <span className="text-white">${primaryInsurance.copay || 0}</span>
              </div>
              {primaryInsurance.expirationDate && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Expires:</span>
                  <span className={
                    insuranceDaysUntilExpiry !== null && insuranceDaysUntilExpiry < 0
                      ? 'text-red-400'
                      : insuranceExpiring
                        ? 'text-orange-400'
                        : 'text-white'
                  }>
                    {new Date(primaryInsurance.expirationDate).toLocaleDateString()}
                    {insuranceDaysUntilExpiry !== null && (
                      <span className="ml-1 text-xs">
                        {insuranceDaysUntilExpiry < 0
                          ? `(Expired ${Math.abs(insuranceDaysUntilExpiry)} days ago)`
                          : insuranceDaysUntilExpiry === 0
                            ? '(Expires today)'
                            : `(${insuranceDaysUntilExpiry} days)`
                        }
                      </span>
                    )}
                  </span>
                </div>
              )}
              {insuranceDaysUntilExpiry !== null && insuranceDaysUntilExpiry < 0 && (
                <div className="mt-2 p-2 bg-red-900/20 border border-red-700 rounded text-red-400 text-xs">
                  ❌ Insurance expired {Math.abs(insuranceDaysUntilExpiry)} days ago
                </div>
              )}
              {insuranceExpiring && insuranceDaysUntilExpiry >= 0 && (
                <div className="mt-2 p-2 bg-orange-900/20 border border-orange-700 rounded text-orange-400 text-xs">
                  ⚠️ Insurance expires in {insuranceDaysUntilExpiry} days
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No insurance on file</p>
          )}
        </div>

        {/* Referral Status */}
        <div className="p-6 border-b border-gray-700">
          <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
            <DocumentTextIcon className="h-4 w-4 mr-2" />
            Referral Status
          </h4>
          {activeReferrals.length > 0 ? (
            <div className="space-y-3">
              {activeReferrals.map((referral, index) => (
                <div key={index} className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Source:</span>
                    <span className="text-white">{referral.source}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Days Left:</span>
                    <span className={referral.remainingDays <= 7 ? 'text-orange-400' : 'text-white'}>
                      {referral.remainingDays}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Expires:</span>
                    <span className="text-white">
                      {new Date(referral.expirationDate).toLocaleDateString()}
                    </span>
                  </div>
                  {referral.remainingDays <= 7 && (
                    <div className="mt-1 p-2 bg-orange-900/20 border border-orange-700 rounded text-orange-400 text-xs">
                      ⚠️ Referral expires soon
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No active referrals</p>
          )}
        </div>

        {/* Active Packages */}
        <div className="p-6 border-b border-gray-700">
          <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
            <CubeIcon className="h-4 w-4 mr-2" />
            Care Packages
          </h4>
          {activePackages.length > 0 ? (
            <div className="space-y-3">
              {activePackages.map((pkg, index) => {
                const isBeingUsed = getPackageUsageStatus(pkg);
                return (
                  <div key={index} className={`rounded p-3 ${isBeingUsed ? 'bg-blue-900/30 border border-blue-600' : 'bg-gray-700'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-white font-medium text-sm">{pkg.packageName}</span>
                      <div className="flex items-center space-x-2">
                        {isBeingUsed && (
                          <span className="text-xs text-blue-400 bg-blue-900/50 px-2 py-1 rounded">
                            Using Now
                          </span>
                        )}
                        <span className="text-xs text-gray-400">Active</span>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Remaining:</span>
                        <span className={isBeingUsed ? 'text-blue-400' : 'text-white'}>
                          {pkg.remainingVisits} visits
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Used:</span>
                        <span className={isBeingUsed ? 'text-blue-400' : 'text-white'}>
                          {pkg.usedVisits}/{pkg.totalVisits}
                        </span>
                      </div>
                      {pkg.expirationDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Expires:</span>
                          <span className="text-white">
                            {new Date(pkg.expirationDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 bg-gray-600 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${isBeingUsed ? 'bg-blue-500' : 'bg-purple-500'}`}
                        style={{ width: `${(pkg.usedVisits / pkg.totalVisits) * 100}%` }}
                      ></div>
                    </div>
                    {isBeingUsed && (
                      <div className="mt-2 text-xs text-blue-400">
                        ⚡ Visit will be deducted after checkout
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No active packages</p>
          )}

          {expiringPackages.length > 0 && (
            <div className="mt-3 p-2 bg-red-900/20 border border-red-700 rounded text-red-400 text-xs">
              ⚠️ {expiringPackages.length} package(s) exhausted
            </div>
          )}
        </div>

        {/* Alerts */}
        {visibleAlerts.length > 0 && (
          <div className="p-6">
            <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
              <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
              Patient Alerts
            </h4>
            <div className="space-y-2">
              {visibleAlerts.map((alert, index) => (
                <div key={index} className={`p-3 rounded border text-sm ${getAlertColor(alert.priority)}`}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium">{alert.type}</span>
                    <span className="text-xs opacity-75">{alert.priority}</span>
                  </div>
                  <p className="text-xs opacity-90">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientSnapshot;
