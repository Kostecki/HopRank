import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/da";

dayjs.extend(timezone);

dayjs.locale("da");
dayjs.tz.setDefault("Europe/Copenhagen");

export default dayjs;
