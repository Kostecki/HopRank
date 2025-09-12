import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/da";

const LOCALE = import.meta.env.VITE_LOCALE || "da";
const TZ = import.meta.env.VITE_TZ || "Europe/Copenhagen";

dayjs.extend(timezone);

dayjs.locale(LOCALE);
dayjs.tz.setDefault(TZ);

export default dayjs;
