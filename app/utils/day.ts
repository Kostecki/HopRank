// utils/dayjs.js
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import LocalizedFormat from "dayjs/plugin/localizedFormat";
import isYesterday from "dayjs/plugin/isYesterday";
import isToday from "dayjs/plugin/isToday";
import "dayjs/locale/da";

// Extend Day.js with the plugins
dayjs.extend(timezone);
dayjs.extend(LocalizedFormat);
dayjs.extend(isYesterday);
dayjs.extend(isToday);

// Set the locale globally
dayjs.locale("da");

// Set the default timezone based on environment
// TODO: Make this configurable
let TZ = "Europe/Copenhagen";
dayjs.tz.setDefault(TZ);

export default dayjs;
