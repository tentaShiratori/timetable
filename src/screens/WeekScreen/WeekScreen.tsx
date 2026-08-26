import { useEvents } from "../../components/Event/useEvents";
import { useRouter } from "../../components/Route/useRouter";
import { editEventPath, newEventPath } from "../EventEditScreen/eventRoute";
import { WeekGrid } from "./WeekGrid";

/**
 * @public
 */
export function WeekScreen() {
  const { events } = useEvents();
  const router = useRouter();

  return (
    <section className="week-screen">
      <h1>時間割</h1>
      <WeekGrid
        events={events}
        onSlotClick={(dayOfWeek, startMinutes) => {
          router.push(newEventPath(dayOfWeek, startMinutes));
        }}
        onEventClick={(id) => {
          router.push(editEventPath(id));
        }}
      />
    </section>
  );
}
