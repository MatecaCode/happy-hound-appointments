# Schedule components

Overview

- WeekLoadBar: 7 small day bars summarizing utilization per day. Util% = booked_minutes / staffed_minutes. Colors: ≤50% blue (neutral), 50–80% yellow (warn), >80% red (alert).
- WeekGrid: CSS grid with 8 columns: left hour rail (80px) + 7 day columns. Each day column is a scrollable container with sticky header.
- DayColumn: Wrapper that renders multiple StaffLane tracks for the day (one per staff).
- StaffLane: Absolutely positions appointment items by minute using a constant 2px/min (matches Admin Daily 30min=60px). Items use Chip for UI.
- Chip: Compact or detailed appointment pill.

Layout math

- Pixels per minute: 2. Day window: 09:00–17:00 (8h = 480 minutes → 960px column height). Adjust constants to match future grid.
- Top offset = (startMinutes - 09:00) * 2. Height = (endMinutes - startMinutes) * 2 - 4.

Extension points

- Virtualization: wrap StaffLane positioned list with a windowed subset based on scrollTop to reduce DOM nodes.
- Group by Staff: swap grid organization so columns = staff and days render inside each column using headers; current API supports per-day columns; a staff-first organization can be added with the same pieces.
- Availability overlay: pass availability intervals to StaffLane to paint background bands.

Flags

- WEEK_V2 is implicit and on by default. Toggle compact/grouping is handled in `AdminAgendaHoje`.


