import { DAY_LABELS, formatMinutes, type DayOfWeek, type Event } from "../../components/Event/event";
import { eventColor } from "./eventColor";
import { SLOT_COUNT, SLOT_HEIGHT_PX, slotStartMinutes } from "./grid";
import { layoutDayEvents } from "./layout";

type WeekGridProps = {
  events: Event[];
  onSlotClick: (dayOfWeek: DayOfWeek, startMinutes: number) => void;
  onEventClick: (id: string) => void;
};

export function WeekGrid({ events, onSlotClick, onEventClick }: WeekGridProps) {
  const bodyHeight = SLOT_COUNT * SLOT_HEIGHT_PX;

  return (
    <div className="week-scroll">
      <div className="week-header">
        <div className="week-header-time" />
        {DAY_LABELS.map((label) => (
          <div key={label} className="week-day-header" role="columnheader">
            {label}
          </div>
        ))}
      </div>
      <div className="week-body">
        <div className="week-times" style={{ height: bodyHeight }} aria-hidden="true">
          {Array.from({ length: SLOT_COUNT }, (_, index) => {
            const minutes = slotStartMinutes(index);
            return (
              <div key={minutes} className="week-time-slot" style={{ height: SLOT_HEIGHT_PX }}>
                {minutes % 60 === 0 ? formatMinutes(minutes) : null}
              </div>
            );
          })}
        </div>
        {DAY_LABELS.map((label, index) => {
          const dayOfWeek = index as DayOfWeek;
          return (
            <DayColumn
              key={label}
              dayLabel={label}
              dayOfWeek={dayOfWeek}
              events={events.filter((event) => event.dayOfWeek === dayOfWeek)}
              bodyHeight={bodyHeight}
              onSlotClick={onSlotClick}
              onEventClick={onEventClick}
            />
          );
        })}
      </div>
    </div>
  );
}

type DayColumnProps = {
  dayLabel: string;
  dayOfWeek: DayOfWeek;
  events: Event[];
  bodyHeight: number;
  onSlotClick: (dayOfWeek: DayOfWeek, startMinutes: number) => void;
  onEventClick: (id: string) => void;
};

function DayColumn({ dayLabel, dayOfWeek, events, bodyHeight, onSlotClick, onEventClick }: DayColumnProps) {
  const blocks = layoutDayEvents(events);

  return (
    <div className="week-day-col" style={{ height: bodyHeight }}>
      {Array.from({ length: SLOT_COUNT }, (_, index) => {
        const startMinutes = slotStartMinutes(index);
        return (
          <button
            key={startMinutes}
            type="button"
            className="week-slot"
            style={{ height: SLOT_HEIGHT_PX }}
            aria-label={`${dayLabel}曜 ${formatMinutes(startMinutes)} に追加`}
            onClick={() => onSlotClick(dayOfWeek, startMinutes)}
          />
        );
      })}
      {blocks.map((block) => (
        <button
          key={block.event.id}
          type="button"
          className="week-event"
          style={{
            top: block.top,
            height: block.height,
            left: `calc(${(block.columnIndex / block.columnCount) * 100}% + 1px)`,
            width: `calc(${(1 / block.columnCount) * 100}% - 2px)`,
            background: eventColor(block.event.id),
          }}
          onClick={() => onEventClick(block.event.id)}
        >
          {block.event.title}
        </button>
      ))}
    </div>
  );
}
