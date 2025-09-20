import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/da";

const LOCALE = "da";
const TZ = "Europe/Copenhagen";

dayjs.extend(timezone);

dayjs.locale(LOCALE);
dayjs.tz.setDefault(TZ);

export default dayjs;
