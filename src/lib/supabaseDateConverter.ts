export function supabaseTimestampToDate(seconds: number, nanoseconds: number, dateFormat = 'MM/DD/YYYY') {

    // Combine seconds and nanoseconds to get total milliseconds
    const totalMilliseconds = (seconds * 1000) + (nanoseconds / 1_000_000);

    // Create a Date object
    const dateObject = new Date(totalMilliseconds);

    // Format the date object (using a simple approach, for more complex formatting consider libraries like `moment.js` or `date-fns`)
    const year = dateObject.getFullYear();
    const month = String(dateObject.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(dateObject.getDate()).padStart(2, '0');

    if (dateFormat === 'YYYY-MM-DD') {
        return `${year}-${month}-${day}`;
    } else if (dateFormat === 'MM/DD/YYYY') {
        return `${month}/${day}/${year}`;
    } else {
        // Default or custom formatting can be added here
        return dateObject.toLocaleDateString(); // Uses locale-specific format
    }
}

export default supabaseTimestampToDate;