// Lunar Calendar Converter
// Uses actual new moon dates (UTC+7 Vietnam / UTC+8 China) as month boundaries.
// This is far more accurate than lookup tables with fixed month lengths.

(function () {
  'use strict';

  // Each entry is [year, month (0-based), day] of the Lunar New Year (L1/1).
  // Followed by subsequent new moon dates within that lunar year.
  // Source: astronomical new moon data for UTC+8.
  // Format: [gregorian_year, gregorian_month_0based, gregorian_day]
  const LUNAR_YEARS = {
    2020: {
      newYear: [2020, 0, 25],
      newMoons: [
        [2020, 0, 25],
        [2020, 1, 23],
        [2020, 2, 24],
        [2020, 3, 23],
        [2020, 4, 23],
        [2020, 5, 21],
        [2020, 6, 21],
        [2020, 7, 19],
        [2020, 8, 17],
        [2020, 9, 17],
        [2020, 10, 15],
        [2020, 11, 15],
        [2021, 0, 13],
      ],
    },
    2021: {
      newYear: [2021, 1, 12],
      newMoons: [
        [2021, 1, 12],
        [2021, 2, 13],
        [2021, 3, 12],
        [2021, 4, 11],
        [2021, 5, 10],
        [2021, 6, 10],
        [2021, 7, 8],
        [2021, 8, 7],
        [2021, 9, 6],
        [2021, 10, 5],
        [2021, 11, 4],
        [2022, 0, 3],
      ],
    },
    2022: {
      newYear: [2022, 1, 1],
      newMoons: [
        [2022, 1, 1],
        [2022, 2, 3],
        [2022, 3, 1],
        [2022, 3, 30],
        [2022, 4, 30],
        [2022, 5, 29],
        [2022, 6, 29],
        [2022, 7, 27],
        [2022, 8, 26],
        [2022, 9, 25],
        [2022, 10, 24],
        [2022, 11, 23],
        [2023, 0, 22],
      ],
    },
    2023: {
      newYear: [2023, 0, 22],
      newMoons: [
        [2023, 0, 22],
        [2023, 1, 20],
        [2023, 2, 22],
        [2023, 3, 20],
        [2023, 4, 19],
        [2023, 5, 18],
        [2023, 6, 17],
        [2023, 7, 16],
        [2023, 8, 15],
        [2023, 9, 14],
        [2023, 10, 13],
        [2023, 11, 13],
        [2024, 0, 11],
      ],
    },
    2024: {
      newYear: [2024, 1, 10],
      newMoons: [
        [2024, 1, 10],
        [2024, 2, 10],
        [2024, 3, 9],
        [2024, 4, 8],
        [2024, 5, 6],
        [2024, 6, 6],
        [2024, 7, 4],
        [2024, 8, 3],
        [2024, 9, 3],
        [2024, 10, 1],
        [2024, 10, 30],
        [2024, 11, 30],
        [2025, 0, 29],
      ],
    },
    2025: {
      newYear: [2025, 0, 29],
      newMoons: [
        [2025, 0, 29],
        [2025, 1, 28],
        [2025, 2, 29],
        [2025, 3, 27],
        [2025, 4, 27],
        [2025, 5, 25],
        [2025, 6, 25],
        [2025, 7, 23],
        [2025, 8, 22],
        [2025, 9, 21],
        [2025, 10, 20],
        [2025, 11, 20],
        [2026, 0, 19],
      ],
    },
    2026: {
      newYear: [2026, 1, 17],
      newMoons: [
        [2026, 1, 17],
        [2026, 2, 19],
        [2026, 3, 17],
        [2026, 4, 16],
        [2026, 5, 15],
        [2026, 6, 14],
        [2026, 7, 12],
        [2026, 8, 11],
        [2026, 9, 10],
        [2026, 10, 9],
        [2026, 11, 8],
        [2027, 0, 7],
        [2027, 1, 6],
      ],
    },
    2027: {
      newYear: [2027, 1, 6],
      newMoons: [
        [2027, 1, 6],
        [2027, 2, 8],
        [2027, 3, 6],
        [2027, 4, 6],
        [2027, 5, 5],
        [2027, 6, 4],
        [2027, 7, 3],
        [2027, 8, 1],
        [2027, 8, 30],
        [2027, 9, 30],
        [2027, 10, 29],
        [2027, 11, 28],
        [2028, 0, 27],
      ],
    },
    2028: {
      newYear: [2028, 0, 26],
      newMoons: [
        [2028, 0, 26],
        [2028, 1, 25],
        [2028, 2, 26],
        [2028, 3, 24],
        [2028, 4, 24],
        [2028, 5, 22],
        [2028, 6, 22],
        [2028, 7, 21],
        [2028, 8, 19],
        [2028, 9, 18],
        [2028, 10, 17],
        [2028, 11, 17],
        [2029, 0, 15],
      ],
    },
    2029: {
      newYear: [2029, 0, 13],
      newMoons: [
        [2029, 0, 13],
        [2029, 1, 11],
        [2029, 2, 13],
        [2029, 3, 11],
        [2029, 4, 11],
        [2029, 5, 9],
        [2029, 6, 9],
        [2029, 7, 8],
        [2029, 8, 6],
        [2029, 9, 6],
        [2029, 10, 4],
        [2029, 11, 4],
        [2030, 0, 3],
      ],
    },
    2030: {
      newYear: [2030, 1, 3],
      newMoons: [
        [2030, 1, 3],
        [2030, 2, 4],
        [2030, 3, 3],
        [2030, 4, 2],
        [2030, 5, 1],
        [2030, 5, 30],
        [2030, 6, 30],
        [2030, 7, 28],
        [2030, 8, 27],
        [2030, 9, 26],
        [2030, 10, 25],
        [2030, 11, 24],
        [2031, 0, 23],
      ],
    },
  };

  const toDate = ([y, m, d]) => new Date(y, m, d);

  /**
   * Convert a Gregorian date to lunar calendar
   * @param {Date} date
   * @returns {{ lunar_year, lunar_month, lunar_day } | null}
   */
  const toLunar = (date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) return null;

    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    // Find the lunar year whose new moons bracket this date
    const years = Object.keys(LUNAR_YEARS)
      .map(Number)
      .sort((a, b) => a - b);

    for (let yi = years.length - 1; yi >= 0; yi--) {
      const lunar_year = years[yi];
      const { newYear, newMoons } = LUNAR_YEARS[lunar_year];
      const nyDate = toDate(newYear);

      if (target < nyDate) continue;

      // Find which lunar month
      for (let mi = newMoons.length - 1; mi >= 0; mi--) {
        const monthStart = toDate(newMoons[mi]);
        if (target >= monthStart) {
          const lunar_month = mi + 1;
          const lunar_day = Math.floor((target - monthStart) / 86400000) + 1;
          return { lunar_year, lunar_month, lunar_day };
        }
      }
    }

    return null;
  };

  /**
   * Returns lunar info only if the date is the 1st or 15th of a lunar month.
   * @param {Date} date
   * @returns {{ lunar_month, type, label } | null}
   */
  const getKeyLunarDates = (date) => {
    const lunar = toLunar(date);
    if (!lunar) return null;

    if (lunar.lunar_day === 1) {
      return { lunar_month: lunar.lunar_month, type: '1st', label: `L${lunar.lunar_month}·1` };
    }
    if (lunar.lunar_day === 15) {
      return { lunar_month: lunar.lunar_month, type: '15th', label: `L${lunar.lunar_month}·15` };
    }
    return null;
  };

  window.LunarCalendar = { toLunar, getKeyLunarDates };
})();
