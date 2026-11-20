import {
  DAY_LABEL_ORDER,
  DAY_LABELS,
  EVERY_DAY,
  sortDaysOfWeek,
  WEEKDAY_DAYS,
  WEEKEND_DAYS,
  type DayOfWeek,
} from "../../components/Event/event";

type DayOfWeekPickerProps = {
  value: DayOfWeek[];
  onChange: (days: DayOfWeek[]) => void;
};

export function DayOfWeekPicker({ value, onChange }: DayOfWeekPickerProps) {
  const selected = new Set(value);

  function toggle(day: DayOfWeek) {
    if (selected.has(day)) {
      onChange(sortDaysOfWeek(value.filter((item) => item !== day)));
      return;
    }
    onChange(sortDaysOfWeek([...value, day]));
  }

  function selectPreset(days: DayOfWeek[]) {
    onChange(sortDaysOfWeek(days));
  }

  return (
    <fieldset className="event-edit-days">
      <legend>曜日</legend>
      <div className="event-edit-day-presets">
        <button type="button" onClick={() => selectPreset(WEEKDAY_DAYS)}>
          平日
        </button>
        <button type="button" onClick={() => selectPreset(WEEKEND_DAYS)}>
          土日
        </button>
        <button type="button" onClick={() => selectPreset(EVERY_DAY)}>
          毎日
        </button>
      </div>
      <div className="event-edit-day-toggles" role="group" aria-label="曜日">
        {DAY_LABEL_ORDER.map((day) => {
          const pressed = selected.has(day);
          return (
            <button
              key={day}
              type="button"
              className={pressed ? "event-edit-day-toggle is-selected" : "event-edit-day-toggle"}
              aria-pressed={pressed}
              onClick={() => toggle(day)}
            >
              {DAY_LABELS[day]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
