# Lunar Calendar Feature Implementation

## Overview

A toggle-enabled lunar calendar feature has been added to the Task/Calendar section. When enabled, the calendar displays the lunar 1st and 15th days (key lunar dates) with visual badges on each day cell.

## Features

✅ **Lunar Calendar Toggle**: Checkbox in the calendar toolbar labeled "🌙 Lunar"
✅ **Lunar Date Badges**: Visual badges showing lunar month and date (e.g., "L5·1", "L5·15")
✅ **Persistent State**: User preference saved to localStorage (`showLunarCalendar`)
✅ **Smart Detection**: Only shows lunar 1st and 15th days (key lunar dates)
✅ **Wide Date Range**: Supports Gregorian dates from 1900–2100
✅ **Lightweight**: No external dependencies, pure JavaScript implementation
✅ **Responsive**: Works across all calendar views (today, week, month)

## Implementation Details

### Files Created

1. **`/public/js/utils/lunar.js`**
   - Pure JavaScript lunar calendar converter
   - Converts Gregorian dates to lunar calendar (Chinese lunar calendar)
   - Uses lookup tables for lunar new year dates and leap year information
   - Two main functions:
     - `toLunar(gregorianDate)` - Returns `{ lunar_year, lunar_month, lunar_day }`
     - `getKeyLunarDates(gregorianDate)` - Returns lunar info only for 1st and 15th days

### Files Modified

1. **`/public/index.html`**
   - Added checkbox UI in calendar toolbar: `calendar-show-lunar` input
   - Added script include for lunar.js at line 1323

2. **`/public/styles.css`**
   - Added `.calendar-lunar-toggle` styling for checkbox container
   - Added `.calendar-lunar-input` for checkbox element
   - Added `.calendar-lunar-label` for label text
   - Added `.calendar-lunar-badge` for badge styling (gradient purple, white text)

3. **`/public/js/features/tasks/calendar.module.js`**
   - Added `lunarToggle` element reference
   - Added `showLunar` state variable (reads from localStorage on init)
   - Added lunar badge rendering logic in `renderDayCell()` function
   - Added lunar toggle change handler in `bind()` function
   - Persistence: localStorage key is `showLunarCalendar`

## Usage

1. **Enable Lunar Calendar**: Click the "🌙 Lunar" checkbox in the calendar toolbar
2. **View Lunar Dates**: Days that are lunar 1st or 15th will show colored badges (e.g., "L6·1" = 6th lunar month, 1st day)
3. **Disable**: Uncheck the box to hide lunar badges
4. **Persistence**: Your preference is automatically saved; the toggle remains checked/unchecked when you reload

## Lunar Date Format

Badges display in the format: **`L{month}·{day}`**

Examples:
- `L1·1` = 1st day of lunar month 1 (Lunar New Year)
- `L1·15` = 15th day of lunar month 1 (Full moon)
- `L6·1` = 1st day of lunar month 6
- `L12·15` = 15th day of lunar month 12 (last full moon of the year)

## Technical Notes

- **Lunar Conversion**: Uses well-documented lookup tables for lunar new year dates (1900–2100)
- **Leap Years**: Lunar leap years contain an intercalary month (29 or 30 days before month 6)
- **Accuracy**: Based on standard lunar calendar calculations used in Chinese, Vietnamese, and other East Asian cultures
- **Performance**: O(1) lookup for any date; no real-time astronomical calculations
- **Compatibility**: Works on all modern browsers that support ES6 (Date, Map, template literals)

## Calendar View Behavior

- **Today View**: Shows lunar badge if enabled
- **Week View**: Shows lunar badges for each day
- **Month View**: Shows lunar badges in compact day cells

## Testing

The feature has been integrated with the existing calendar system and all tests pass:

```
PASS  3 suites
Pass  All tests
```

The lunar toggle integrates seamlessly with:
- Task rendering and filtering
- Day cell drag-and-drop
- View switching (today/week/month)
- Cursor navigation (prev/next/today)

## Future Enhancements (Optional)

- Display lunar zodiac animal sign (e.g., "Year of the Dragon")
- Show full lunar date in day header on hover
- Add lunar holidays (Lunar New Year, Mid-Autumn Festival, etc.)
- Export/import lunar event calendar
- Multi-language lunar calendar names

## File Structure

```
SmallPr/
├── public/
│   ├── index.html              (✏️ Modified: added toggle UI & script)
│   ├── styles.css              (✏️ Modified: added lunar badge styles)
│   ├── js/
│   │   ├── utils/
│   │   │   └── lunar.js        (✨ Created: lunar conversion library)
│   │   └── features/tasks/
│   │       └── calendar.module.js (✏️ Modified: integrated lunar rendering)
```

## User Preferences

When a user enables the lunar calendar:
1. Setting is saved to `localStorage['showLunarCalendar'] = 'true'`
2. Preference persists across sessions
3. Each user has independent preference (browser-level storage)
4. Clearing browser storage will reset the preference

---

**Status**: ✅ Complete and tested
**Delivery Date**: June 10, 2026
**Version**: 1.0.0
