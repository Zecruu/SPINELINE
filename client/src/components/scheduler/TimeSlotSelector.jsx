import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PlusIcon,
  XMarkIcon,
  CogIcon
} from '@heroicons/react/24/outline';

const TimeSlotSelector = ({ selectedDates, selectedTimeSlots, onTimeSlotSelection, onAppointmentChange }) => {
  const navigate = useNavigate();
  const [existingAppointments, setExistingAppointments] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(15);
  const [currentDateIndex, setCurrentDateIndex] = useState(0);

  // New state for managing multiple appointments per time slot
  const [timeSlotAppointments, setTimeSlotAppointments] = useState({});
  const [showScheduleSettings, setShowScheduleSettings] = useState(false);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [scheduleSettings, setScheduleSettings] = useState({
    breaks: [
      { start: '12:00', end: '13:00', name: 'Lunch Break' }
    ],
    holidays: [],
    operatingHours: { start: '07:00', end: '19:00' }
  });

  // Helper function to convert 24-hour time to 12-hour AM/PM format
  const formatTimeTo12Hour = (time24) => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Helper function to convert 12-hour time back to 24-hour for internal use
  const formatTimeTo24Hour = (time12) => {
    const [time, period] = time12.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let hours24 = hours;

    if (period === 'PM' && hours !== 12) {
      hours24 += 12;
    } else if (period === 'AM' && hours === 12) {
      hours24 = 0;
    }

    return `${hours24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Time slots from 7:00 AM to 7:00 PM (30-minute intervals for cleaner UI)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 7; hour < 19; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const time12 = formatTimeTo12Hour(time24);
        slots.push({
          time24,
          time12,
          display: time12
        });
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  useEffect(() => {
    if (selectedDates.length > 0) {
      loadExistingAppointments();
    }
  }, [selectedDates]);

  // Sync timeSlotAppointments with parent component
  useEffect(() => {
    const allAppointments = [];
    Object.values(timeSlotAppointments).forEach(appointments => {
      allAppointments.push(...appointments);
    });

    // Pass appointments to parent component
    if (onAppointmentChange) {
      onAppointmentChange(allAppointments);
    }
  }, [timeSlotAppointments, onAppointmentChange]);

  const loadExistingAppointments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      const appointments = {};

      for (const date of selectedDates) {
        const dateStr = date.toISOString().split('T')[0];
        const response = await axios.get(`/api/appointments/date/${dateStr}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
          console.log(`📅 Raw appointments for ${dateStr}:`, response.data.appointments.length);
          console.log('📋 Appointment statuses:', response.data.appointments.map(apt => `${apt.patient?.fullName}: ${apt.status}`));

          // Filter out cancelled appointments
          const filteredAppointments = response.data.appointments.filter(apt =>
            apt.status !== 'Cancelled'
          );

          console.log(`✅ Filtered appointments for ${dateStr}:`, filteredAppointments.length);
          appointments[dateStr] = filteredAppointments;
        }
      }

      setExistingAppointments(appointments);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateKey = (date) => {
    return date.toISOString().split('T')[0];
  };

  const getColorForVisitType = (visitType) => {
    switch (visitType) {
      case 'New Patient':
        return 'bg-yellow-500 text-yellow-900'; // Yellow for New Patient
      case 'Re-evaluation':
        return 'bg-blue-500 text-blue-900'; // Blue for Re-evaluation
      case 'Regular Visit':
        return 'bg-green-500 text-green-900'; // Green for Regular Visit
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const isTimeSlotOccupied = (date, time) => {
    const dateKey = formatDateKey(date);
    const appointments = existingAppointments[dateKey] || [];

    return appointments.some(apt => {
      // Skip cancelled appointments
      if (apt.status === 'Cancelled') return false;

      const aptTime = apt.appointmentTime;
      const aptEndTime = addMinutesToTime(aptTime, apt.duration || 30);
      const slotEndTime = addMinutesToTime(time, selectedDuration);

      return (time >= aptTime && time < aptEndTime) ||
             (slotEndTime > aptTime && slotEndTime <= aptEndTime) ||
             (time <= aptTime && slotEndTime >= aptEndTime);
    });
  };

  const isTimeSlotDuringBreak = (time) => {
    return scheduleSettings.breaks.some(breakPeriod => {
      return time >= breakPeriod.start && time < breakPeriod.end;
    });
  };

  const addMinutesToTime = (time, minutes) => {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  };

  // Helper functions for multi-patient time slots
  const getTimeSlotKey = (date, timeSlot) => {
    const dateKey = formatDateKey(date);
    const time24 = typeof timeSlot === 'string' ? timeSlot : timeSlot.time24;
    return `${dateKey}-${time24}`;
  };

  const getAppointmentsForTimeSlot = (date, timeSlot) => {
    const key = getTimeSlotKey(date, timeSlot);
    return timeSlotAppointments[key] || [];
  };

  const addAppointmentToTimeSlot = (date, timeSlot) => {
    const time24 = typeof timeSlot === 'string' ? timeSlot : timeSlot.time24;

    // Check if time slot is during a break
    if (isTimeSlotDuringBreak(time24)) {
      alert('Cannot schedule appointments during break time. Please use the Settings button to modify break periods if needed.');
      return;
    }

    const key = getTimeSlotKey(date, timeSlot);
    const currentAppointments = timeSlotAppointments[key] || [];
    const time12 = typeof timeSlot === 'string' ? formatTimeTo12Hour(timeSlot) : timeSlot.time12;

    const newAppointment = {
      id: `${key}-${Date.now()}`,
      date,
      time: time24,
      time12: time12,
      dateKey: formatDateKey(date),
      patientId: '',
      patientName: '',
      visitType: 'Regular Visit',
      colorTag: 'green',
      duration: selectedDuration || 15,
      notes: ''
    };

    const updatedAppointments = {
      ...timeSlotAppointments,
      [key]: [...currentAppointments, newAppointment]
    };

    setTimeSlotAppointments(updatedAppointments);
    updateSelectedTimeSlots(updatedAppointments);
  };

  const removeAppointmentFromTimeSlot = (date, timeSlot, appointmentId) => {
    const key = getTimeSlotKey(date, timeSlot);
    const currentAppointments = timeSlotAppointments[key] || [];
    const filteredAppointments = currentAppointments.filter(apt => apt.id !== appointmentId);

    const updatedAppointments = {
      ...timeSlotAppointments,
      [key]: filteredAppointments
    };

    // Remove empty time slots
    if (filteredAppointments.length === 0) {
      delete updatedAppointments[key];
    }

    setTimeSlotAppointments(updatedAppointments);
    updateSelectedTimeSlots(updatedAppointments);
  };

  const updateSelectedTimeSlots = (appointments) => {
    // Convert timeSlotAppointments back to the format expected by parent components
    const newSelectedTimeSlots = {};

    Object.entries(appointments).forEach(([key, appointmentList]) => {
      if (appointmentList.length > 0) {
        // Extract date and time from key (format: YYYY-MM-DD-HH:MM)
        const parts = key.split('-');
        const dateKey = `${parts[0]}-${parts[1]}-${parts[2]}`;
        const time24 = `${parts[3]}:${parts[4]}`;

        if (!newSelectedTimeSlots[dateKey]) {
          newSelectedTimeSlots[dateKey] = [];
        }

        if (!newSelectedTimeSlots[dateKey].includes(time24)) {
          newSelectedTimeSlots[dateKey].push(time24);
        }
      }
    });

    // Sort time slots
    Object.keys(newSelectedTimeSlots).forEach(dateKey => {
      newSelectedTimeSlots[dateKey].sort();
    });

    onTimeSlotSelection(newSelectedTimeSlots);
  };

  const isTimeSlotSelected = (date, time) => {
    const dateKey = formatDateKey(date);
    return selectedTimeSlots[dateKey]?.includes(time) || false;
  };

  const renderTimeSlot = (date, timeSlot) => {
    const time24 = timeSlot.time24;
    const time12 = timeSlot.time12;
    const isOccupied = isTimeSlotOccupied(date, time24);
    const isDuringBreak = isTimeSlotDuringBreak(time24);
    const scheduledAppointments = getAppointmentsForTimeSlot(date, timeSlot);
    const hasScheduledAppointments = scheduledAppointments.length > 0;
    const dateKey = formatDateKey(date);
    const existingApts = existingAppointments[dateKey]?.filter(apt =>
      apt.appointmentTime === time24 && apt.status !== 'Cancelled' // Only show non-cancelled appointments that start at this exact time
    ) || [];

    // Show break period
    if (isDuringBreak && !isOccupied && !hasScheduledAppointments) {
      const breakInfo = scheduleSettings.breaks.find(b => time24 >= b.start && time24 < b.end);
      return (
        <div key={time24} className="w-full h-20 rounded-lg bg-red-900/30 border-2 border-red-700 p-4 relative">
          <div className="flex items-center justify-between">
            <div className="text-lg text-red-300 font-semibold">
              {time12}
            </div>
            <div className="text-sm text-red-400">
              🚫 {breakInfo?.name || 'Break Time'}
            </div>
          </div>
          <div className="text-xs text-red-400 mt-2 opacity-75">
            No appointments can be scheduled during break time
          </div>
        </div>
      );
    }

    // Show time slot with existing appointments and/or new scheduled appointments
    if (isOccupied || hasScheduledAppointments) {
      // Combine existing appointments and new scheduled appointments
      const allAppointments = [
        ...existingApts.map(apt => {
          console.log('Existing appointment data:', apt); // Debug log
          return {
            id: `existing-${apt._id}`,
            patientName: apt.patient?.fullName || 'Patient',
            visitType: apt.visitType,
            duration: apt.duration || 30,
            appointmentTime: apt.appointmentTime,
            patient: apt.patient, // Keep original patient data
            isExisting: true,
            originalData: apt // Keep all original data for debugging
          };
        }),
        ...scheduledAppointments.map(apt => ({
          ...apt,
          isExisting: false
        }))
      ];

      const totalAppointments = allAppointments.length;

      return (
        <div key={time24} className="w-full min-h-[100px] rounded-lg bg-gray-700 border border-gray-600 p-4 relative">
          {/* Time label at the top */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg text-gray-300 font-semibold">
              {time12}
            </div>
            <button
              onClick={() => addAppointmentToTimeSlot(date, timeSlot)}
              className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors shadow-lg"
              title="Add patient to this time slot"
            >
              <PlusIcon className="h-4 w-4 text-white" />
            </button>
          </div>

          {/* Appointments container - Grid layout for better use of space */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {allAppointments.map((appointment, index) => (
              <div
                key={appointment.id}
                className="relative group"
              >
                <div className={`p-4 rounded-lg text-sm font-medium relative ${getColorForVisitType(appointment.visitType)} shadow-lg border-l-4 ${getBorderColorForVisitType(appointment.visitType)} hover:shadow-xl transition-shadow`}>
                  {/* Patient info */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white text-base truncate">
                        {appointment.patientName || 'Unassigned Patient'}
                      </div>
                      <div className="text-xs opacity-90 mt-1">
                        {appointment.visitType}
                      </div>
                      <div className="text-xs opacity-75 mt-1">
                        Duration: {appointment.duration || 30} minutes
                      </div>
                      {appointment.isExisting && (
                        <div className="text-xs opacity-75 mt-2 bg-black/20 rounded px-2 py-1 inline-block">
                          📅 Existing Appointment
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col space-y-1 ml-3">
                      {/* Reschedule button - available for all appointments */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRescheduleAppointment(appointment);
                        }}
                        className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600 shadow-md"
                        title="Reschedule appointment"
                      >
                        <ClockIcon className="h-4 w-4 text-white" />
                      </button>

                      {/* Cancel button - available for all appointments */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCancelAppointment(appointment);
                        }}
                        className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md"
                        title="Cancel appointment"
                      >
                        <XMarkIcon className="h-4 w-4 text-white" />
                      </button>

                      {/* View details button - only for existing appointments */}
                      {appointment.isExisting && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Info button clicked for:', appointment);
                            handleViewExistingAppointment(appointment);
                          }}
                          className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-600 shadow-md"
                          title="View appointment details"
                        >
                          <InformationCircleIcon className="h-4 w-4 text-white" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Empty time slot - show add button with 12-hour time
    return (
      <button
        key={time24}
        onClick={() => addAppointmentToTimeSlot(date, timeSlot)}
        className="w-full h-20 rounded-lg text-sm font-medium transition-all duration-200 bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white border-2 border-dashed border-gray-600 hover:border-gray-500 flex items-center justify-between px-6 hover:shadow-lg"
      >
        <span className="text-lg font-semibold">{time12}</span>
        <div className="flex items-center space-x-3">
          <span className="text-sm opacity-75">Click to add patient</span>
          <PlusIcon className="h-5 w-5" />
        </div>
      </button>
    );
  };

  // Helper functions for styling and actions
  const getBorderColorForVisitType = (visitType) => {
    switch (visitType) {
      case 'New Patient':
        return 'border-yellow-400';
      case 'Re-evaluation':
        return 'border-blue-400';
      case 'Regular Visit':
      default:
        return 'border-green-400';
    }
  };

  const handleRescheduleAppointment = (appointment) => {
    const patientName = appointment.patientName || appointment.patient?.fullName || 'Unassigned Patient';

    if (appointment.isExisting) {
      // For existing appointments, use the proper reschedule system
      const rescheduleData = {
        appointmentId: appointment.originalData._id,
        patientId: appointment.originalData.patientId || appointment.originalData.patient?._id,
        patientName: patientName,
        originalDate: new Date(appointment.originalData.appointmentDate).toLocaleDateString(),
        originalTime: appointment.originalData.appointmentTime,
        reason: 'Rescheduled from scheduler'
      };

      // Store reschedule data in sessionStorage for the scheduler
      sessionStorage.setItem('rescheduleData', JSON.stringify(rescheduleData));

      // Navigate to scheduler page to complete reschedule
      const currentPath = window.location.pathname;
      const userData = localStorage.getItem('user');
      let userRole = 'secretary'; // default

      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          userRole = parsedUser.role;
        } catch (e) {
          console.warn('Could not parse user data:', e);
        }
      }

      // Navigate based on user role
      if (userRole === 'doctor' || currentPath.includes('/doctor/')) {
        navigate('/doctor/scheduler');
      } else {
        navigate('/secretary/appointments/scheduler');
      }

    } else {
      // For new appointments, handle locally
      const currentTime = appointment.time12 || appointment.time;
      const newTime = prompt(`Reschedule appointment for ${patientName}\n\nCurrent time: ${currentTime}\nEnter new time (HH:MM format):`, appointment.time);

      if (newTime && newTime !== appointment.time) {
        // Validate time format
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(newTime)) {
          alert('Please enter a valid time in HH:MM format (24-hour)');
          return;
        }

        // Remove from current slot
        removeAppointmentFromTimeSlot(appointment.date, { time24: appointment.time }, appointment.id);

        // Add to new slot
        const newTimeSlot = { time24: newTime, time12: formatTimeTo12Hour(newTime) };
        const key = getTimeSlotKey(appointment.date, newTimeSlot);
        const currentAppointments = timeSlotAppointments[key] || [];

        const updatedAppointment = {
          ...appointment,
          time: newTime,
          time12: formatTimeTo12Hour(newTime)
        };

        const updatedAppointments = {
          ...timeSlotAppointments,
          [key]: [...currentAppointments, updatedAppointment]
        };

        setTimeSlotAppointments(updatedAppointments);
        updateSelectedTimeSlots(updatedAppointments);
      }
    }
  };

  const handleCancelAppointment = async (appointment) => {
    if (appointment.isExisting) {
      // For existing appointments, use the proper cancel API
      const reason = prompt(`Cancel appointment for ${appointment.patientName || appointment.patient?.fullName}?\n\nPlease provide a reason for cancellation:`);

      if (!reason || !reason.trim()) {
        return; // User cancelled or didn't provide reason
      }

      try {
        const token = localStorage.getItem('userToken');

        // Update appointment status to cancelled
        const response = await axios.patch(`/api/appointments/${appointment.originalData._id}/status`,
          {
            status: 'Cancelled',
            cancellationReason: reason.trim(),
            actionTaken: 'Appointment Cancelled from Scheduler'
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.success) {
          // Log to ledger for tracking
          try {
            await axios.post('/api/ledger/appointment-action', {
              appointmentId: appointment.originalData._id,
              action: 'cancelled',
              reason: reason.trim(),
              originalDate: appointment.originalData.appointmentDate,
              originalTime: appointment.originalData.appointmentTime
            }, { headers: { Authorization: `Bearer ${token}` } });
          } catch (ledgerError) {
            console.warn('Failed to log to ledger, but appointment was cancelled:', ledgerError);
            // Don't fail the whole operation if ledger logging fails
          }

          alert(`Appointment cancelled successfully for ${appointment.patientName || appointment.patient?.fullName}`);

          console.log('🔄 Reloading appointments after cancellation...');
          // Reload existing appointments to reflect the change
          await loadExistingAppointments();
          console.log('✅ Appointments reloaded');
        }
      } catch (error) {
        console.error('Error cancelling appointment:', error);
        alert('Failed to cancel appointment. Please try again.');
      }
    } else {
      // For new appointments, just remove from local state
      const confirmed = confirm(`Cancel appointment for ${appointment.patientName || 'Unassigned Patient'}?`);
      if (confirmed) {
        removeAppointmentFromTimeSlot(appointment.date, { time24: appointment.time }, appointment.id);
      }
    }
  };

  const handleViewExistingAppointment = (appointment) => {
    console.log('View appointment clicked:', appointment); // Debug log
    setSelectedAppointment(appointment);
    setShowAppointmentDetails(true);
  };

  const currentDate = selectedDates[currentDateIndex];
  const totalSelectedSlots = Object.values(selectedTimeSlots).reduce((total, slots) => total + slots.length, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-400">Loading existing appointments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ClockIcon className="h-6 w-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">Select Time Slots</h2>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-400">
            {totalSelectedSlots} slot{totalSelectedSlots !== 1 ? 's' : ''} selected
          </div>
          <button
            onClick={() => setShowScheduleSettings(true)}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg transition-colors"
            title="Schedule Settings"
          >
            <CogIcon className="h-4 w-4" />
            <span className="text-sm">Settings</span>
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-blue-300 text-sm">
            <p className="mb-2">Click the + button to add patients to time slots. Each appointment shows the patient name, visit type, and duration. Hover over appointments to see reschedule and cancel options. Use the Settings button to configure breaks and operating hours.</p>
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Regular Visit</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span>New Patient</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Re-evaluation</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>Break Time</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Duration Selector */}
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-300">Appointment Duration:</label>
        <select
          value={selectedDuration}
          onChange={(e) => setSelectedDuration(Number(e.target.value))}
          className="bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={15}>15 minutes</option>
          <option value={20}>20 minutes</option>
          <option value={30}>30 minutes</option>
          <option value={45}>45 minutes</option>
          <option value={60}>60 minutes</option>
        </select>
      </div>

      {/* Date Tabs */}
      {selectedDates.length > 1 && (
        <div className="flex space-x-2 overflow-x-auto">
          {selectedDates.map((date, index) => (
            <button
              key={index}
              onClick={() => setCurrentDateIndex(index)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                currentDateIndex === index
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
              {selectedTimeSlots[formatDateKey(date)]?.length > 0 && (
                <span className="ml-2 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {selectedTimeSlots[formatDateKey(date)].length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Time Grid */}
      <div className="bg-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white mb-6">
          {currentDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </h3>

        <div className="space-y-3">
          {timeSlots.map(timeSlot => (
            <div key={timeSlot.time24} className="w-full">
              {renderTimeSlot(currentDate, timeSlot)}
            </div>
          ))}
        </div>
      </div>

      {/* Scheduled Appointments Summary */}
      {Object.keys(timeSlotAppointments).length > 0 && (
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-white mb-3">Scheduled Appointments:</h4>
          <div className="space-y-3">
            {Object.entries(timeSlotAppointments).map(([key, appointments]) => {
              const parts = key.split('-');
              const dateKey = `${parts[0]}-${parts[1]}-${parts[2]}`;
              const time24 = `${parts[3]}:${parts[4]}`;
              const time12 = formatTimeTo12Hour(time24);
              const date = new Date(dateKey + 'T00:00:00');

              return (
                <div key={key} className="border border-gray-600 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300 text-sm font-medium">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {time12}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {appointments.length} patient{appointments.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {appointments.map((appointment, index) => (
                      <div
                        key={appointment.id}
                        className={`p-2 rounded text-xs ${getColorForVisitType(appointment.visitType)}`}
                      >
                        <div className="font-medium">
                          {appointment.patientName || 'Unassigned'}
                        </div>
                        <div className="opacity-75">
                          {appointment.visitType} ({appointment.duration}min)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Schedule Settings Modal */}
      {showScheduleSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Schedule Settings</h3>
              <button
                onClick={() => setShowScheduleSettings(false)}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Operating Hours */}
            <div className="mb-6">
              <h4 className="text-lg font-medium text-white mb-3">Operating Hours</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Start Time</label>
                  <input
                    type="time"
                    value={scheduleSettings.operatingHours.start}
                    onChange={(e) => setScheduleSettings(prev => ({
                      ...prev,
                      operatingHours: { ...prev.operatingHours, start: e.target.value }
                    }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">End Time</label>
                  <input
                    type="time"
                    value={scheduleSettings.operatingHours.end}
                    onChange={(e) => setScheduleSettings(prev => ({
                      ...prev,
                      operatingHours: { ...prev.operatingHours, end: e.target.value }
                    }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Breaks */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-medium text-white">Break Periods</h4>
                <button
                  onClick={() => setScheduleSettings(prev => ({
                    ...prev,
                    breaks: [...prev.breaks, { start: '12:00', end: '13:00', name: 'New Break' }]
                  }))}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                >
                  Add Break
                </button>
              </div>
              <div className="space-y-3">
                {scheduleSettings.breaks.map((breakPeriod, index) => (
                  <div key={index} className="grid grid-cols-4 gap-3 items-end">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Name</label>
                      <input
                        type="text"
                        value={breakPeriod.name}
                        onChange={(e) => {
                          const newBreaks = [...scheduleSettings.breaks];
                          newBreaks[index].name = e.target.value;
                          setScheduleSettings(prev => ({ ...prev, breaks: newBreaks }));
                        }}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Start</label>
                      <input
                        type="time"
                        value={breakPeriod.start}
                        onChange={(e) => {
                          const newBreaks = [...scheduleSettings.breaks];
                          newBreaks[index].start = e.target.value;
                          setScheduleSettings(prev => ({ ...prev, breaks: newBreaks }));
                        }}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">End</label>
                      <input
                        type="time"
                        value={breakPeriod.end}
                        onChange={(e) => {
                          const newBreaks = [...scheduleSettings.breaks];
                          newBreaks[index].end = e.target.value;
                          setScheduleSettings(prev => ({ ...prev, breaks: newBreaks }));
                        }}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const newBreaks = scheduleSettings.breaks.filter((_, i) => i !== index);
                        setScheduleSettings(prev => ({ ...prev, breaks: newBreaks }));
                      }}
                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowScheduleSettings(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Here you could save to backend if needed
                  setShowScheduleSettings(false);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Details Modal */}
      {showAppointmentDetails && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">📅 Appointment Details</h3>
              <button
                onClick={() => {
                  setShowAppointmentDetails(false);
                  setSelectedAppointment(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Patient Info */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">👤 Patient Information</h4>
                <p className="text-white font-medium">
                  {selectedAppointment.patientName ||
                   selectedAppointment.patient?.fullName ||
                   selectedAppointment.patient?.name ||
                   'Unknown Patient'}
                </p>
              </div>

              {/* Appointment Info */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-3">📋 Appointment Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Visit Type:</span>
                    <span className="text-white">{selectedAppointment.visitType || 'Regular Visit'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Duration:</span>
                    <span className="text-white">{selectedAppointment.duration || 30} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Time:</span>
                    <span className="text-white">
                      {(() => {
                        const time = selectedAppointment.time12 || selectedAppointment.appointmentTime || selectedAppointment.time;
                        if (!time) return 'Unknown Time';
                        return time.includes('AM') || time.includes('PM') ? time : formatTimeTo12Hour(time);
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className="text-green-400 font-medium">
                      {selectedAppointment.isExisting ? 'Existing Appointment' : 'New Appointment'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              {selectedAppointment.isExisting && (
                <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-blue-300 text-sm">
                      <p>This appointment is already in the system. To modify or cancel it, please use the main appointment management system.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between mt-6">
              <div className="flex space-x-3">
                {/* Reschedule Button */}
                <button
                  onClick={() => {
                    const appointmentToReschedule = selectedAppointment;
                    setShowAppointmentDetails(false);
                    setSelectedAppointment(null);
                    handleRescheduleAppointment(appointmentToReschedule);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center space-x-2"
                >
                  <ClockIcon className="h-4 w-4" />
                  <span>Reschedule</span>
                </button>

                {/* Cancel Button - available for all appointments */}
                <button
                  onClick={() => {
                    setShowAppointmentDetails(false);
                    setSelectedAppointment(null);
                    handleCancelAppointment(selectedAppointment);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded flex items-center space-x-2"
                >
                  <XMarkIcon className="h-4 w-4" />
                  <span>Cancel Appointment</span>
                </button>
              </div>

              {/* Close Button */}
              <button
                onClick={() => {
                  setShowAppointmentDetails(false);
                  setSelectedAppointment(null);
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeSlotSelector;
