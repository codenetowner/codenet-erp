namespace Catalyst.API.Helpers
{
    public static class TimeZoneHelper
    {
        // Lebanon/Beirut timezone
        private static readonly TimeZoneInfo LebanonTimeZone;

        static TimeZoneHelper()
        {
            try
            {
                // Try Windows timezone ID first
                LebanonTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Middle East Standard Time");
            }
            catch
            {
                try
                {
                    // Try IANA timezone ID (Linux/Mac)
                    LebanonTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Beirut");
                }
                catch
                {
                    // Fallback to UTC+2 (without DST handling)
                    LebanonTimeZone = TimeZoneInfo.CreateCustomTimeZone(
                        "Lebanon",
                        TimeSpan.FromHours(2),
                        "Lebanon Standard Time",
                        "Lebanon Standard Time"
                    );
                }
            }
        }

        /// <summary>
        /// Gets the current time in Lebanon/Beirut timezone
        /// </summary>
        public static DateTime Now => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, LebanonTimeZone);

        /// <summary>
        /// Gets today's date in Lebanon/Beirut timezone
        /// </summary>
        public static DateTime Today => Now.Date;

        /// <summary>
        /// Gets today's date as DateOnly in Lebanon/Beirut timezone
        /// </summary>
        public static DateOnly TodayDate => DateOnly.FromDateTime(Today);

        /// <summary>
        /// Converts a UTC DateTime to Lebanon/Beirut timezone
        /// </summary>
        public static DateTime ToLebanonTime(DateTime utcDateTime)
        {
            if (utcDateTime.Kind == DateTimeKind.Local)
                utcDateTime = utcDateTime.ToUniversalTime();
            return TimeZoneInfo.ConvertTimeFromUtc(utcDateTime, LebanonTimeZone);
        }

        /// <summary>
        /// Converts a Lebanon/Beirut DateTime to UTC
        /// </summary>
        public static DateTime ToUtc(DateTime lebanonDateTime)
        {
            return TimeZoneInfo.ConvertTimeToUtc(lebanonDateTime, LebanonTimeZone);
        }
    }
}
