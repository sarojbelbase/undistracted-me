import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import {
    MONTH_NAMES,
    MONTH_NAMES_IN_NEPALI,
    NEPALI_YEARS_AND_DAYS_IN_MONTHS,
    NUMBER_MAPPING,
    DATE_TODAY_FORMATS,
    LANGUAGES,
    ENGLISH_MONTH_NAMES,
    DAY_NAMES,
    LIVE_CLOCK_FORMATS
} from "../constants";

dayjs.extend(utc);
dayjs.extend(timezone);

const BASE_YEAR = 1944;
const BASE_NEPALI_DAY = 16;
const BASE_NEPALI_MONTH = 9;
const BASE_NEPALI_YEAR = 2000;
const DAYS_IN_MONTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const LEAP_YEAR_DAYS_IN_MONTHS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);

const isValidDate = (year, month, day) => year >= 1944 && year <= 2033 && month >= 1 && month <= 12 && day >= 1 && day <= 31;

const padZero = (i) => i < 10 ? `0${i}` : i;

const convertEnglishToNepali = (yy, mm, dd) => {
    if (!isValidDate(yy, mm, dd)) return "Invalid date!";

    let totalEnglishDays = 0;
    for (let year = BASE_YEAR; year < yy; year++) {
        totalEnglishDays += (isLeapYear(year) ? LEAP_YEAR_DAYS_IN_MONTHS : DAYS_IN_MONTHS).reduce((sum, days) => sum + days, 0);
    }
    totalEnglishDays += (isLeapYear(yy) ? LEAP_YEAR_DAYS_IN_MONTHS : DAYS_IN_MONTHS).slice(0, mm - 1).reduce((sum, days) => sum + days, 0);
    totalEnglishDays += dd;

    let nepaliYear = BASE_NEPALI_YEAR;
    let nepaliMonth = BASE_NEPALI_MONTH;
    let nepaliDay = BASE_NEPALI_DAY;
    let nepaliDayOfWeek = 6;  // Sunday

    while (totalEnglishDays > 0) {
        const daysInCurrentNepaliMonth = NEPALI_YEARS_AND_DAYS_IN_MONTHS[nepaliYear - BASE_NEPALI_YEAR][nepaliMonth];
        nepaliDay++;
        nepaliDayOfWeek = (nepaliDayOfWeek + 1) % 7;

        if (nepaliDay > daysInCurrentNepaliMonth) {
            nepaliMonth++;
            nepaliDay = 1;
        }

        if (nepaliMonth > 12) {
            nepaliYear++;
            nepaliMonth = 1;
        }

        totalEnglishDays--;
    }

    return `${nepaliYear} ${nepaliMonth} ${nepaliDay}`;
}

const convertThisNumberToNepali = (theNumber) => theNumber.toString().split('').map(digit => NUMBER_MAPPING[digit]).join('');

const getTimeZoneAwareDayJsInstance = () => dayjs().tz('Asia/Kathmandu');

const getNepaliMitiInSelectedLanguage = (language) => {
    const dayJsInstance = getTimeZoneAwareDayJsInstance();
    const [year, month, day] = dayJsInstance.format('YYYY M D').split(' ').map(Number);
    const [_nepaliYear, nepaliMonth, nepaliDay] = convertEnglishToNepali(year, month, day).split(' ');

    const formattedMonth = language === LANGUAGES.ne ? MONTH_NAMES_IN_NEPALI[nepaliMonth - 1] : MONTH_NAMES[nepaliMonth - 1];
    const formattedDay = language === LANGUAGES.ne ? convertThisNumberToNepali(padZero(nepaliDay)) : padZero(nepaliDay);

    return `${formattedMonth} ${formattedDay}`;
}

const getLiveClockInSelectedLanguage = (language) => {
    const [hours, minutes, seconds] = getTimeZoneAwareDayJsInstance().format(LIVE_CLOCK_FORMATS[language]).split(' ');

    const formatTime = (time) => language === LANGUAGES.ne ? convertThisNumberToNepali(time) : time;

    return `${formatTime(hours)}.${formatTime(minutes)}.${formatTime(seconds)}`;
}

const getDateTodayInSelectedLanguage = (language) => {
    const dayJsInstance = getTimeZoneAwareDayJsInstance();
    const [month, day, weekDay] = dayJsInstance.format(DATE_TODAY_FORMATS[language]).split(' ');

    const formattedMonth = language === LANGUAGES.ne ? ENGLISH_MONTH_NAMES[month - 1] : month;
    const formattedDay = language === LANGUAGES.ne ? convertThisNumberToNepali(day) : day;
    const formattedWeekDay = language === LANGUAGES.ne ? DAY_NAMES[weekDay] : weekDay;

    return `${formattedMonth} ${formattedDay}, ${formattedWeekDay}`;
}

export {
    convertThisNumberToNepali,
    getTimeZoneAwareDayJsInstance,
    getNepaliMitiInSelectedLanguage,
    getLiveClockInSelectedLanguage,
    getDateTodayInSelectedLanguage
};
