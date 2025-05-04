import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/da";

const LOCALE = import.meta.env.VITE_ALGOLIA_APP_ID || "da";
const TZ = import.meta.env.TZ || "Europe/Copenhagen";

dayjs.extend(timezone);

dayjs.locale(LOCALE);
dayjs.tz.setDefault(TZ);

export default dayjs;
