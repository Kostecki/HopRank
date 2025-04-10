// utils/dayjs.js
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import weekOfYear from "dayjs/plugin/weekOfYear";
import weekday from "dayjs/plugin/weekday";
import IsBetween from "dayjs/plugin/isBetween";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "dayjs/locale/da";

// Initialize Day.js and extend with necessary plugins
const dayjsExt = dayjs;

// Extend Day.js with the plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(weekOfYear);
dayjs.extend(weekday);
dayjs.extend(IsBetween);
dayjs.extend(customParseFormat);

// Set the locale globally
dayjs.locale("da");

// Set the default timezone based on environment
// TODO: Make this configurable
let TZ = "Europe/Copenhagen";
dayjs.tz.setDefault(TZ);

export { dayjsExt };
