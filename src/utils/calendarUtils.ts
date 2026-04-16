/**
 * Utility to generate Google Calendar TEMPLATE links for wedding events.
 */

interface CalendarEvent {
    title: string;
    description: string;
    location: string;
    startDate: string; // YYYY-MM-DD
    startTime?: string; // HH:mm
    endTime?: string; // HH:mm
}

export function generateGoogleCalendarUrl(event: CalendarEvent): string {
    const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';

    // Format Date: YYYYMMDDTHHMMSS
    const formatDate = (date: string, time: string = '00:00') => {
        const cleanDate = date.replace(/-/g, '');
        const cleanTime = time.replace(/:/g, '') + '00';
        return `${cleanDate}T${cleanTime}`;
    };

    const start = formatDate(event.startDate, event.startTime || '08:00');
    
    // If no end time, default to 3 hours after start
    let end = '';
    if (event.endTime) {
        end = formatDate(event.startDate, event.endTime);
    } else {
        const [h, m] = (event.startTime || '08:00').split(':').map(Number);
        const endH = (h + 3) % 24;
        end = formatDate(event.startDate, `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }

    const params = new URLSearchParams({
        text: event.title,
        dates: `${start}/${end}`,
        details: event.description,
        location: event.location,
    });

    return `${baseUrl}&${params.toString()}`;
}
