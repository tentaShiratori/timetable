import { useSyncExternalStore } from "react";
import { DAY_LABEL_ORDER, DAY_LABELS, formatMinutes, type DayOfWeek, type Event } from "../../components/Event/event";
import { eventColor, SLOT_COUNT, SLOT_HEIGHT_PX, slotStartMinutes } from "./grid";
import { layoutDayEvents } from "./layout";

type WeekGridProps = {
  events: Event[];
  onSlotClick: (dayOfWeek: DayOfWeek, startMinutes: number) => void;
  onEventClick: (id: string) => void;
};

const dayStore = {
  subscribe: () => {
    const timer = setInterval(() => {}, 30 * 60);
    return () => clearInterval(timer);
  },
  getSnapshot: () => {
    return new Date().getDay();
  },
};
export function WeekGrid({ events, onSlotClick, onEventClick }: WeekGridProps) {
  const bodyHeight = SLOT_COUNT * SLOT_HEIGHT_PX;
  const today = useSyncExternalStore(dayStore.subscribe, dayStore.getSnapshot);

  return (
    <div className="week-scroll">
      <div className="week-header">
        <div className="week-header-time" />
        {DAY_LABEL_ORDER.map((dayOfWeek) => (
          <div key={dayOfWeek} className="week-day-header" role="columnheader">
            <span className={dayOfWeek === today ? "week-day-header-today" : "week-day-header-label"}>
              {DAY_LABELS[dayOfWeek]}
            </span>
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
        {DAY_LABEL_ORDER.map((dayOfWeek) => (
          <DayColumn
            key={dayOfWeek}
            dayLabel={DAY_LABELS[dayOfWeek]}
            dayOfWeek={dayOfWeek}
            events={events.filter((event) => event.dayOfWeek === dayOfWeek)}
            bodyHeight={bodyHeight}
            onSlotClick={onSlotClick}
            onEventClick={onEventClick}
          />
        ))}
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
            background: eventColor(block.event.startMinutes),
          }}
          onClick={() => onEventClick(block.event.id)}
        >
          {block.event.title}
        </button>
      ))}
    </div>
  );
}
