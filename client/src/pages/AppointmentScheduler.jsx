import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SecretaryLayout from '../components/secretary/SecretaryLayout';
import DoctorLayout from '../components/doctor/DoctorLayout';
import CalendarDatePicker from '../components/scheduler/CalendarDatePicker';
import TimeSlotSelector from '../components/scheduler/TimeSlotSelector';
import AppointmentDetailsForm from '../components/scheduler/AppointmentDetailsForm';
import AppointmentConfirmation from '../components/scheduler/AppointmentConfirmation';
import { useToast, ToastContainer } from '../components/common/Toast';
import {
  CalendarIcon,
  ClockIcon,
  DocumentTextIcon,
  CheckIcon,
  ArrowLeftIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

const AppointmentScheduler = () => {
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo, toasts, removeToast } = useToast();

  // User state
  const [user, setUser] = useState(null);

  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDates, setSelectedDates] = useState([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState({});
  const [appointmentDetails, setAppointmentDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rescheduleData, setRescheduleData] = useState(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Authentication check and reschedule data check
  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'secretary' && parsedUser.role !== 'doctor') {
      navigate('/login');
      return;
    }

    setUser(parsedUser);

    // Check for reschedule data
    const rescheduleDataStr = sessionStorage.getItem('rescheduleData');
    if (rescheduleDataStr) {
      try {
        const rescheduleInfo = JSON.parse(rescheduleDataStr);
        setRescheduleData(rescheduleInfo);
        setIsRescheduling(true);
        console.log(`Rescheduling appointment for ${rescheduleInfo.patientName}`);
      } catch (error) {
        console.error('Error parsing reschedule data:', error);
        sessionStorage.removeItem('rescheduleData');
      }
    }
  }, [navigate]);

  const steps = [
    {
      number: 1,
      title: 'Select Dates',
      description: 'Choose one or more dates for appointments',
      icon: CalendarIcon,
      component: CalendarDatePicker
    },
    {
      number: 2,
      title: 'Select Time Slots',
      description: 'Pick available time slots for each date',
      icon: ClockIcon,
      component: TimeSlotSelector
    },
    {
      number: 3,
      title: 'Appointment Details',
      description: 'Add patient and visit information',
      icon: DocumentTextIcon,
      component: AppointmentDetailsForm
    },
    {
      number: 4,
      title: 'Confirmation',
      description: 'Review and save appointments',
      icon: CheckIcon,
      component: AppointmentConfirmation
    }
  ];

  const handleDateSelection = (dates) => {
    setSelectedDates(dates);
    // Reset subsequent steps when dates change
    setSelectedTimeSlots({});
    setAppointmentDetails([]);
  };

  const handleTimeSlotSelection = (timeSlots) => {
    setSelectedTimeSlots(timeSlots);
    // Reset appointment details when time slots change
    setAppointmentDetails([]);
  };

  const handleAppointmentDetails = (details) => {
    setAppointmentDetails(details);
  };

  const handleAppointmentChange = (appointments) => {
    setAppointmentDetails(appointments);
  };

  const canProceedToStep = (step) => {
    switch (step) {
      case 2:
        return selectedDates.length > 0;
      case 3:
        return Object.keys(selectedTimeSlots).length > 0;
      case 4:
        // Check if all appointments have required fields filled
        return appointmentDetails.length > 0 &&
               appointmentDetails.every(apt => apt.patientId && apt.visitType);
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < 4 && canProceedToStep(currentStep + 1)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepNumber) => {
    if (stepNumber <= currentStep || canProceedToStep(stepNumber)) {
      setCurrentStep(stepNumber);
    }
  };

  const renderCurrentStep = () => {
    const StepComponent = steps[currentStep - 1].component;

    switch (currentStep) {
      case 1:
        return (
          <StepComponent
            selectedDates={selectedDates}
            onDateSelection={handleDateSelection}
          />
        );
      case 2:
        return (
          <StepComponent
            selectedDates={selectedDates}
            selectedTimeSlots={selectedTimeSlots}
            onTimeSlotSelection={handleTimeSlotSelection}
            onAppointmentChange={handleAppointmentChange}
          />
        );
      case 3:
        return (
          <StepComponent
            selectedDates={selectedDates}
            selectedTimeSlots={selectedTimeSlots}
            appointmentDetails={appointmentDetails}
            onDetailsChange={handleAppointmentDetails}
            rescheduleData={rescheduleData}
            isRescheduling={isRescheduling}
          />
        );
      case 4:
        return (
          <StepComponent
            selectedDates={selectedDates}
            selectedTimeSlots={selectedTimeSlots}
            appointmentDetails={appointmentDetails}
            onSave={() => {
              // Clear reschedule data from sessionStorage
              if (isRescheduling) {
                sessionStorage.removeItem('rescheduleData');
              }

              // Navigate based on user role
              const redirectPath = user?.role === 'doctor' ? '/doctor' : '/secretary/todays-patients';
              navigate(redirectPath, {
                state: {
                  message: isRescheduling ? 'Appointment rescheduled successfully!' : 'Appointments created successfully!',
                  type: 'success'
                }
              });
            }}
            loading={loading}
            setLoading={setLoading}
            rescheduleData={rescheduleData}
            isRescheduling={isRescheduling}
          />
        );
      default:
        return null;
    }
  };

  // Choose layout based on user role
  const LayoutComponent = user?.role === 'doctor' ? DoctorLayout : SecretaryLayout;

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <LayoutComponent>
        <div className="w-full -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <button
                onClick={() => navigate(user?.role === 'doctor' ? '/doctor' : '/secretary')}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {isRescheduling ? 'Reschedule Appointment' : 'Appointment Scheduler'}
                </h1>
                <p className="text-gray-400 mt-1">
                  {isRescheduling
                    ? `Rescheduling appointment for ${rescheduleData?.patientName}`
                    : 'Schedule multiple appointments with visual time management'
                  }
                </p>
                {isRescheduling && (
                  <div className="mt-2 bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
                    <p className="text-yellow-300 text-sm">
                      <strong>Original appointment:</strong> {rescheduleData?.originalDate} at {rescheduleData?.originalTime}
                      <br />
                      <strong>Reason:</strong> {rescheduleData?.reason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.number;
                const isCompleted = currentStep > step.number;
                const canAccess = step.number <= currentStep || canProceedToStep(step.number);

                return (
                  <div key={step.number} className="flex items-center">
                    <button
                      onClick={() => handleStepClick(step.number)}
                      disabled={!canAccess}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-lg'
                          : isCompleted
                          ? 'bg-green-600 text-white cursor-pointer hover:bg-green-700'
                          : canAccess
                          ? 'bg-gray-700 text-gray-300 cursor-pointer hover:bg-gray-600'
                          : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <div className={`p-2 rounded-full ${
                        isActive ? 'bg-blue-500' : isCompleted ? 'bg-green-500' : 'bg-gray-600'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">{step.title}</div>
                        <div className="text-xs opacity-75">{step.description}</div>
                      </div>
                    </button>
                    {index < steps.length - 1 && (
                      <div className={`w-8 h-0.5 mx-2 ${
                        currentStep > step.number ? 'bg-green-500' : 'bg-gray-600'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            {renderCurrentStep()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                currentStep === 1
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span>Previous</span>
            </button>

            <button
              onClick={handleNext}
              disabled={currentStep === 4 || !canProceedToStep(currentStep + 1)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                currentStep === 4 || !canProceedToStep(currentStep + 1)
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <span>Next</span>
              <ArrowRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </LayoutComponent>
    </>
  );
};

export default AppointmentScheduler;
