// Lunar Calendar Converter
// Converts Gregorian dates to lunar calendar dates (Chinese lunar calendar)
// Lightweight implementation using lookup tables for lunar new year dates

(function () {
  'use strict';

  // Lunar New Year dates (first day of lunar year 1900-2100)
  // Format: { year: [month, day] }
  const lunarNewYearDates = {
    1900: [1, 31],  1901: [2, 19],  1902: [2, 8],   1903: [1, 29],  1904: [2, 16],
    1905: [2, 4],   1906: [1, 25],  1907: [2, 13],  1908: [2, 2],   1909: [1, 22],
    1910: [2, 10],  1911: [1, 30],  1912: [2, 18],  1913: [2, 6],   1914: [1, 26],
    1915: [2, 14],  1916: [2, 3],   1917: [1, 23],  1918: [2, 11],  1919: [2, 1],
    1920: [2, 20],  1921: [2, 8],   1922: [1, 28],  1923: [2, 16],  1924: [2, 5],
    1925: [1, 24],  1926: [2, 13],  1927: [2, 2],   1928: [1, 23],  1929: [2, 10],
    1930: [1, 30],  1931: [2, 17],  1932: [2, 6],   1933: [1, 26],  1934: [2, 14],
    1935: [2, 4],   1936: [1, 24],  1937: [2, 11],  1938: [2, 1],   1939: [2, 19],
    1940: [2, 8],   1941: [1, 27],  1942: [2, 15],  1943: [2, 5],   1944: [1, 25],
    1945: [2, 13],  1946: [2, 2],   1947: [1, 22],  1948: [2, 10],  1949: [1, 29],
    1950: [2, 17],  1951: [2, 6],   1952: [1, 27],  1953: [2, 14],  1954: [2, 3],
    1955: [1, 24],  1956: [2, 12],  1957: [2, 1],   1958: [2, 19],  1959: [2, 8],
    1960: [1, 28],  1961: [2, 15],  1962: [2, 5],   1963: [1, 25],  1964: [2, 13],
    1965: [2, 2],   1966: [1, 21],  1967: [2, 9],   1968: [1, 29],  1969: [2, 17],
    1970: [2, 6],   1971: [1, 27],  1972: [2, 15],  1973: [2, 3],   1974: [1, 23],
    1975: [2, 11],  1976: [2, 1],   1977: [2, 18],  1978: [2, 7],   1979: [1, 27],
    1980: [2, 16],  1981: [2, 5],   1982: [1, 25],  1983: [2, 13],  1984: [2, 2],
    1985: [1, 20],  1986: [2, 9],   1987: [1, 29],  1988: [2, 17],  1989: [2, 6],
    1990: [1, 26],  1991: [2, 15],  1992: [2, 4],   1993: [1, 23],  1994: [2, 11],
    1995: [2, 1],   1996: [2, 19],  1997: [2, 7],   1998: [1, 28],  1999: [2, 16],
    2000: [2, 5],   2001: [1, 24],  2002: [2, 12],  2003: [2, 1],   2004: [1, 22],
    2005: [2, 9],   2006: [1, 29],  2007: [2, 18],  2008: [2, 7],   2009: [1, 26],
    2010: [2, 14],  2011: [2, 3],   2012: [1, 23],  2013: [2, 10],  2014: [1, 31],
    2015: [2, 19],  2016: [2, 8],   2017: [1, 28],  2018: [2, 16],  2019: [2, 5],
    2020: [1, 25],  2021: [2, 12],  2022: [2, 1],   2023: [1, 22],  2024: [2, 10],
    2025: [1, 29],  2026: [2, 17],  2027: [2, 6],   2028: [1, 26],  2029: [2, 13],
    2030: [2, 3],   2031: [1, 23],  2032: [2, 11],  2033: [2, 1],   2034: [2, 19],
    2035: [2, 8],   2036: [1, 28],  2037: [2, 15],  2038: [2, 4],   2039: [1, 24],
    2040: [2, 12],  2041: [2, 1],   2042: [1, 22],  2043: [2, 10],  2044: [1, 30],
    2045: [2, 17],  2046: [2, 6],   2047: [1, 26],  2048: [2, 14],  2049: [2, 2],
    2050: [1, 23],  2051: [2, 11],  2052: [2, 1],   2053: [2, 19],  2054: [2, 8],
    2055: [1, 27],  2056: [2, 15],  2057: [2, 5],   2058: [1, 24],  2059: [2, 13],
    2060: [2, 2],   2061: [1, 21],  2062: [2, 9],   2063: [1, 29],  2064: [2, 17],
    2065: [2, 5],   2066: [1, 26],  2067: [2, 14],  2068: [2, 3],   2069: [1, 23],
    2070: [2, 11],  2071: [1, 31],  2072: [2, 19],  2073: [2, 7],   2074: [1, 27],
    2075: [2, 15],  2076: [2, 5],   2077: [1, 24],  2078: [2, 12],  2079: [2, 2],
    2080: [1, 21],  2081: [2, 9],   2082: [1, 29],  2083: [2, 17],  2084: [2, 6],
    2085: [1, 26],  2086: [2, 14],  2087: [2, 3],   2088: [1, 24],  2089: [2, 10],
    2090: [1, 30],  2091: [2, 18],  2092: [2, 7],   2093: [1, 27],  2094: [2, 15],
    2095: [2, 5],   2096: [1, 24],  2097: [2, 12],  2098: [2, 1],   2099: [2, 19],
    2100: [2, 8],
  };

  // Lunar month structure (non-leap years): 29 or 30 days per month
  const daysInLunarMonth = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29];

  // Lunar leap years (contains intercalary month before month 6)
  // 1 = leap, 0 = normal year
  const isLeapYear = {
    1900: 0, 1901: 0, 1902: 0, 1903: 1, 1904: 0, 1905: 1, 1906: 0, 1907: 0, 1908: 1,
    1909: 0, 1910: 0, 1911: 1, 1912: 0, 1913: 0, 1914: 1, 1915: 0, 1916: 1, 1917: 0,
    1918: 0, 1919: 0, 1920: 1, 1921: 0, 1922: 0, 1923: 1, 1924: 0, 1925: 0, 1926: 1,
    1927: 0, 1928: 1, 1929: 0, 1930: 0, 1931: 1, 1932: 0, 1933: 0, 1934: 1, 1935: 0,
    1936: 0, 1937: 1, 1938: 0, 1939: 0, 1940: 1, 1941: 0, 1942: 0, 1943: 1, 1944: 0,
    1945: 1, 1946: 0, 1947: 0, 1948: 1, 1949: 0, 1950: 0, 1951: 1, 1952: 0, 1953: 0,
    1954: 1, 1955: 0, 1956: 0, 1957: 1, 1958: 0, 1959: 0, 1960: 1, 1961: 0, 1962: 0,
    1963: 1, 1964: 0, 1965: 1, 1966: 0, 1967: 0, 1968: 1, 1969: 0, 1970: 0, 1971: 1,
    1972: 0, 1973: 0, 1974: 1, 1975: 0, 1976: 0, 1977: 1, 1978: 0, 1979: 1, 1980: 0,
    1981: 0, 1982: 1, 1983: 0, 1984: 0, 1985: 1, 1986: 0, 1987: 0, 1988: 1, 1989: 0,
    1990: 1, 1991: 0, 1992: 0, 1993: 1, 1994: 0, 1995: 0, 1996: 1, 1997: 0, 1998: 0,
    1999: 1, 2000: 0, 2001: 0, 2002: 1, 2003: 0, 2004: 0, 2005: 1, 2006: 0, 2007: 0,
    2008: 1, 2009: 0, 2010: 0, 2011: 1, 2012: 0, 2013: 0, 2014: 1, 2015: 0, 2016: 0,
    2017: 1, 2018: 0, 2019: 0, 2020: 1, 2021: 0, 2022: 0, 2023: 1, 2024: 0, 2025: 0,
    2026: 1, 2027: 0, 2028: 0, 2029: 1, 2030: 0, 2031: 0, 2032: 1, 2033: 0, 2034: 0,
    2035: 1, 2036: 0, 2037: 0, 2038: 1, 2039: 0, 2040: 0, 2041: 1, 2042: 0, 2043: 0,
    2044: 1, 2045: 0, 2046: 0, 2047: 1, 2048: 0, 2049: 0, 2050: 1, 2051: 0, 2052: 0,
    2053: 1, 2054: 0, 2055: 0, 2056: 1, 2057: 0, 2058: 0, 2059: 1, 2060: 0, 2061: 1,
    2062: 0, 2063: 0, 2064: 1, 2065: 0, 2066: 0, 2067: 1, 2068: 0, 2069: 0, 2070: 1,
    2071: 0, 2072: 0, 2073: 1, 2074: 0, 2075: 0, 2076: 1, 2077: 0, 2078: 0, 2079: 1,
    2080: 0, 2081: 1, 2082: 0, 2083: 0, 2084: 1, 2085: 0, 2086: 0, 2087: 1, 2088: 0,
    2089: 0, 2090: 1, 2091: 0, 2092: 0, 2093: 1, 2094: 0, 2095: 0, 2096: 1, 2097: 0,
    2098: 0, 2099: 1, 2100: 0,
  };

  /**
   * Convert a Gregorian date to lunar calendar
   * @param {Date} gregorianDate - JavaScript Date object
   * @returns {Object|null} { lunar_year, lunar_month, lunar_day } or null if invalid
   */
  const toLunar = (gregorianDate) => {
    if (!(gregorianDate instanceof Date) || isNaN(gregorianDate.getTime())) return null;

    const gy = gregorianDate.getFullYear();
    const gm = gregorianDate.getMonth() + 1;
    const gd = gregorianDate.getDate();

    if (!lunarNewYearDates[gy]) return null; // Year out of range

    // Find the lunar year: check if date is before the lunar new year
    let lunar_year = gy;
    const [ny_month, ny_day] = lunarNewYearDates[lunar_year];
    const isBeforeNY = gm < ny_month || (gm === ny_month && gd < ny_day);
    if (isBeforeNY) lunar_year--;

    if (!lunarNewYearDates[lunar_year]) return null;

    // Calculate days from the start of this lunar year
    const [start_month, start_day] = lunarNewYearDates[lunar_year];
    const nyDate = new Date(lunar_year, start_month - 1, start_day);
    const targetDate = new Date(gy, gm - 1, gd);
    let dayOfYear = Math.floor((targetDate - nyDate) / (1000 * 60 * 60 * 24)) + 1;

    if (dayOfYear < 1) {
      // Before lunar new year; recalculate for previous year
      lunar_year--;
      if (!lunarNewYearDates[lunar_year]) return null;
      const [prev_start_month, prev_start_day] = lunarNewYearDates[lunar_year];
      const prevNyDate = new Date(lunar_year, prev_start_month - 1, prev_start_day);
      dayOfYear = Math.floor((targetDate - prevNyDate) / (1000 * 60 * 60 * 24)) + 1;
    }

    // Find lunar month and day from day of year
    const monthDays = daysInLunarMonth.slice();
    if (isLeapYear[lunar_year]) {
      // Insert intercalary month (30 days) before month 6
      monthDays.splice(5, 0, 30);
    }

    let lunar_month = 1;
    let lunar_day = dayOfYear;
    for (let i = 0; i < monthDays.length; i++) {
      if (lunar_day <= monthDays[i]) {
        lunar_month = i + 1;
        break;
      }
      lunar_day -= monthDays[i];
    }

    return { lunar_year, lunar_month, lunar_day };
  };

  /**
   * Check if Gregorian date is the lunar 1st or 15th (key lunar dates)
   * @param {Date} gregorianDate - JavaScript Date object
   * @returns {Object|null} { lunar_month, type } where type is '1st' or '15th', or null if neither
   */
  const getKeyLunarDates = (gregorianDate) => {
    const lunar = toLunar(gregorianDate);
    if (!lunar) return null;

    if (lunar.lunar_day === 1) {
      return { lunar_month: lunar.lunar_month, type: '1st', label: `L${lunar.lunar_month}·1` };
    }
    if (lunar.lunar_day === 15) {
      return { lunar_month: lunar.lunar_month, type: '15th', label: `L${lunar.lunar_month}·15` };
    }
    return null;
  };

  // Export to global scope
  window.LunarCalendar = {
    toLunar,
    getKeyLunarDates,
  };
})();
