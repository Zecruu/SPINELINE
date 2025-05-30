import { useState, useEffect } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

const CalendarDatePicker = ({ selectedDates, onDateSelection }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get first day of the month and number of days
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // Get previous month's last days to fill the grid
  const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 0);
  const daysFromPrevMonth = firstDayWeekday;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + direction);
      return newMonth;
    });
  };

  const formatDateKey = (date) => {
    return date.toISOString().split('T')[0];
  };

  const isDateSelected = (date) => {
    const dateKey = formatDateKey(date);
    return selectedDates.some(selectedDate => formatDateKey(selectedDate) === dateKey);
  };

  const isDatePast = (date) => {
    return date < today;
  };

  const handleDateClick = (date) => {
    if (isDatePast(date)) return;

    const dateKey = formatDateKey(date);
    const isSelected = selectedDates.some(selectedDate => formatDateKey(selectedDate) === dateKey);

    let newSelectedDates;
    if (isSelected) {
      // Remove date
      newSelectedDates = selectedDates.filter(selectedDate => formatDateKey(selectedDate) !== dateKey);
    } else {
      // Add date
      newSelectedDates = [...selectedDates, new Date(date)];
    }

    // Sort dates chronologically
    newSelectedDates.sort((a, b) => a - b);
    onDateSelection(newSelectedDates);
  };

  const renderCalendarDays = () => {
    const days = [];

    // Previous month's days
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      const date = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), prevMonth.getDate() - i);
      days.push(
        <button
          key={`prev-${date.getDate()}`}
          className="h-12 w-12 text-gray-500 hover:bg-gray-700 rounded-lg transition-colors"
          disabled
        >
          {date.getDate()}
        </button>
      );
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const isPast = isDatePast(date);
      const isSelected = isDateSelected(date);
      const isToday = formatDateKey(date) === formatDateKey(today);
      const isHovered = hoveredDate && formatDateKey(date) === formatDateKey(hoveredDate);

      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(date)}
          onMouseEnter={() => setHoveredDate(date)}
          onMouseLeave={() => setHoveredDate(null)}
          disabled={isPast}
          className={`h-12 w-12 rounded-lg font-medium transition-all duration-200 ${
            isPast
              ? 'text-gray-600 cursor-not-allowed'
              : isSelected
              ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400'
              : isToday
              ? 'bg-green-600 text-white hover:bg-green-700'
              : isHovered
              ? 'bg-gray-600 text-white'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          {day}
        </button>
      );
    }

    // Next month's days to fill the grid
    const totalCells = Math.ceil((daysFromPrevMonth + daysInMonth) / 7) * 7;
    const remainingCells = totalCells - (daysFromPrevMonth + daysInMonth);
    
    for (let day = 1; day <= remainingCells; day++) {
      days.push(
        <button
          key={`next-${day}`}
          className="h-12 w-12 text-gray-500 hover:bg-gray-700 rounded-lg transition-colors"
          disabled
        >
          {day}
        </button>
      );
    }

    return days;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <CalendarIcon className="h-6 w-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">Select Appointment Dates</h2>
        </div>
        <div className="text-sm text-gray-400">
          {selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''} selected
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
        <p className="text-blue-300 text-sm">
          Click on one or more dates to schedule appointments. You can select multiple dates for batch scheduling.
          Past dates are disabled.
        </p>
      </div>

      {/* Calendar */}
      <div className="bg-gray-700 rounded-lg p-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          
          <h3 className="text-lg font-semibold text-white">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          
          <button
            onClick={() => navigateMonth(1)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {dayNames.map(day => (
            <div key={day} className="h-8 flex items-center justify-center text-sm font-medium text-gray-400">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {renderCalendarDays()}
        </div>
      </div>

      {/* Selected Dates Summary */}
      {selectedDates.length > 0 && (
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-white mb-3">Selected Dates:</h4>
          <div className="flex flex-wrap gap-2">
            {selectedDates.map((date, index) => (
              <div
                key={index}
                className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm"
              >
                <span>{date.toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                })}</span>
                <button
                  onClick={() => handleDateClick(date)}
                  className="text-blue-200 hover:text-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-600 rounded"></div>
          <span className="text-gray-400">Today</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-600 rounded"></div>
          <span className="text-gray-400">Selected</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-600 rounded"></div>
          <span className="text-gray-400">Past Date</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarDatePicker;
