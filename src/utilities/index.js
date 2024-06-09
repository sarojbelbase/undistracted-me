import { MONTH_NAMES, NEPALI_YEARS_AND_DAYS_IN_MONTHS } from "../constants";

function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

function isValidDate(year, month, day) {
    return year >= 1944 && year <= 2033 && month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

function padZero(i) {
    return i < 10 ? `0${i}` : i;
}

function getNepaliMonthName(month) {
    return MONTH_NAMES[month - 1];
}

function convertEnglishToNepali(yy, mm, dd) {
    if (!isValidDate(yy, mm, dd)) {
        return "Invalid date!";
    }

    const daysInMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const leapYearDaysInMonths = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    const baseYear = 1944;
    const baseNepaliYear = 2000;
    const baseNepaliMonth = 9;
    const baseNepaliDay = 17 - 1;
    let totalEnglishDays = 0;

    for (let i = 0; i < (yy - baseYear); i++) {
        const year = baseYear + i;
        const currentYearDays = isLeapYear(year) ? leapYearDaysInMonths : daysInMonths;
        totalEnglishDays += currentYearDays.reduce((sum, days) => sum + days, 0);
    }

    const currentYearDays = isLeapYear(yy) ? leapYearDaysInMonths : daysInMonths;
    totalEnglishDays += currentYearDays.slice(0, mm - 1).reduce((sum, days) => sum + days, 0);
    totalEnglishDays += dd;

    let nepaliYear = baseNepaliYear;
    let nepaliMonth = baseNepaliMonth;
    let nepaliDay = baseNepaliDay;
    let monthIndex = baseNepaliMonth;
    let nepaliDayOfWeek = 7 - 1;

    while (totalEnglishDays > 0) {
        const daysInCurrentNepaliMonth = NEPALI_YEARS_AND_DAYS_IN_MONTHS[nepaliYear - baseNepaliYear][nepaliMonth];
        nepaliDay++;
        nepaliDayOfWeek = (nepaliDayOfWeek + 1) % 7;

        if (nepaliDay > daysInCurrentNepaliMonth) {
            nepaliMonth++;
            nepaliDay = 1;
            monthIndex++;
        }

        if (nepaliMonth > 12) {
            nepaliYear++;
            nepaliMonth = 1;
            monthIndex = 1;
        }

        if (monthIndex > 12) {
            monthIndex = 1;
        }

        totalEnglishDays--;
    }

    return `${getNepaliMonthName(nepaliMonth)} ${padZero(nepaliDay)}`;
}

export default function mitiBar(barsha, mahina, din) {
    const parsedBarsha = parseInt(barsha, 10);
    const parsedMahina = parseInt(mahina, 10);
    const parsedDin = parseInt(din, 10);
    return convertEnglishToNepali(parsedBarsha, parsedMahina, parsedDin);
}
