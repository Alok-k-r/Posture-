import { Appointment, ConsultationMode } from '../store/store';

export interface VirtualSlot {
  id: string;
  start: string;
  end: string;
  label: string;
  sessionIndex: number;
  durationMinutes: number; // 30 mins
  breakMinutes: number; // 10 mins
  nextSlotStart: string;
  isBooked: boolean;
  isPast: boolean;
}

export interface InClinicSlot {
  id: string;
  time: string;
  label: string;
  durationMinutes: number;
  isBooked: boolean;
  isPast: boolean;
}

// Full sequential schedule for Virtual Consultations (30 min session + 10 min break buffer)
export const VIRTUAL_SCHEDULE_TEMPLATES = [
  { start: '09:00 AM', end: '09:30 AM', nextStart: '09:40 AM', index: 1 },
  { start: '09:40 AM', end: '10:10 AM', nextStart: '10:20 AM', index: 2 },
  { start: '10:20 AM', end: '10:50 AM', nextStart: '11:00 AM', index: 3 },
  { start: '11:00 AM', end: '11:30 AM', nextStart: '11:40 AM', index: 4 },
  { start: '11:40 AM', end: '12:10 PM', nextStart: '12:20 PM', index: 5 },
  { start: '12:20 PM', end: '12:50 PM', nextStart: '01:40 PM', index: 6 }, // 50m lunch transition
  { start: '01:40 PM', end: '02:10 PM', nextStart: '02:20 PM', index: 7 },
  { start: '02:20 PM', end: '02:50 PM', nextStart: '03:00 PM', index: 8 },
  { start: '03:00 PM', end: '03:30 PM', nextStart: '03:40 PM', index: 9 },
  { start: '03:40 PM', end: '04:10 PM', nextStart: '04:20 PM', index: 10 },
  { start: '04:20 PM', end: '04:50 PM', nextStart: '05:00 PM', index: 11 },
  { start: '05:00 PM', end: '05:30 PM', nextStart: '05:40 PM', index: 12 },
  { start: '05:40 PM', end: '06:10 PM', nextStart: '06:20 PM', index: 13 },
];

export const IN_CLINIC_SCHEDULE_TEMPLATES = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '02:30 PM',
  '03:30 PM',
  '04:30 PM',
  '05:30 PM'
];

/**
 * Generate meeting link for Google Meet
 */
export function generateMeetingLink(doctorName: string, date: string, time: string): string {
  // Deterministic and unique meeting slug based on doctor and time
  const cleanName = doctorName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4);
  const cleanDate = date.replace(/-/g, '').slice(4);
  const cleanTime = time.toLowerCase().replace(/[^a-z0-9]/g, '');
  const hash = `${cleanName}-${cleanDate}-${cleanTime}`.slice(0, 12);
  return `https://meet.google.com/ais-${hash}`;
}

/**
 * Check if a time on a given date is in the past
 */
function isTimeInPast(dateStr: string, timeStr: string): boolean {
  try {
    const today = new Date();
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    
    // If date is in the future
    if (dateObj.toDateString() !== today.toDateString()) {
      return dateObj < today;
    }

    // If date is today, check hour and minute
    const [timePart, meridiem] = timeStr.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    const targetTime = new Date(year, month - 1, day, hours, minutes);
    return targetTime < today;
  } catch {
    return false;
  }
}

export const ScheduleService = {
  /**
   * Get dynamic slots for Virtual Consultation (Series: 30 min session + 10 min break)
   */
  getVirtualSlots(
    doctorName: string,
    dateStr: string,
    existingAppointments: Appointment[]
  ): VirtualSlot[] {
    const activeDoctorAppointments = existingAppointments.filter(
      (a) => a.doctorName === doctorName && a.date === dateStr && a.status !== 'cancelled'
    );

    return VIRTUAL_SCHEDULE_TEMPLATES.map((tmpl) => {
      // Check if this time slot is already booked for this doctor
      const isBooked = activeDoctorAppointments.some(
        (a) => a.time === tmpl.start || a.scheduledSlot?.includes(tmpl.start)
      );
      const isPast = isTimeInPast(dateStr, tmpl.start);

      return {
        id: `vslot-${tmpl.start.replace(/[^a-zA-Z0-9]/g, '')}`,
        start: tmpl.start,
        end: tmpl.end,
        label: `${tmpl.start} - ${tmpl.end}`,
        sessionIndex: tmpl.index,
        durationMinutes: 30,
        breakMinutes: 10,
        nextSlotStart: tmpl.nextStart,
        isBooked,
        isPast
      };
    });
  },

  /**
   * Get dynamic slots for In-Clinic Consultation
   */
  getInClinicSlots(
    doctorName: string,
    dateStr: string,
    existingAppointments: Appointment[]
  ): InClinicSlot[] {
    const activeDoctorAppointments = existingAppointments.filter(
      (a) => a.doctorName === doctorName && a.date === dateStr && a.status !== 'cancelled'
    );

    return IN_CLINIC_SCHEDULE_TEMPLATES.map((timeStr) => {
      const isBooked = activeDoctorAppointments.some((a) => a.time === timeStr);
      const isPast = isTimeInPast(dateStr, timeStr);

      return {
        id: `cslot-${timeStr.replace(/[^a-zA-Z0-9]/g, '')}`,
        time: timeStr,
        label: timeStr,
        durationMinutes: 45,
        isBooked,
        isPast
      };
    });
  }
};
