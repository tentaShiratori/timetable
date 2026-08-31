import { useEvents } from "./components/Event/useEvents";
import { useReminders } from "./components/Reminder/useReminders";
import { Route } from "./components/Route/Route";
import { EventEditScreen } from "./screens/EventEditScreen/EventEditScreen";
import { WeekScreen } from "./screens/WeekScreen/WeekScreen";
import "./App.css";

function App() {
  const { events, ready } = useEvents();
  useReminders(events, ready);

  if (!ready) {
    return (
      <main className="app">
        <p className="app-loading">読み込み中</p>
      </main>
    );
  }

  return (
    <main
      className="app"
      // style={{
      //   display: "flex",
      //   flexDirection: "column",
      //   alignItems: "center",
      //   justifyContent: "center",
      //   gap: "2rem",
      // }}
    >
      <Route path="/">
        <WeekScreen />
      </Route>
      <EventEditScreen />
      {/* <button
        onClick={() => {
          void createChannel({
            id: "test",
            name: "Test Message",
            description: "this is test message",
          });
        }}
      >
        createChannel
      </button>
      <button
        onClick={async () => {
          if (!(await isPermissionGranted())) {
            await requestAlarmPermission();
          }
          const id = 1;
          await cancel([id]);
          const at = new Date(Date.now() + 70_000);
          sendNotification({
            id: id,
            title: "test",
            body: "test",
            channelId: "test",
            autoCancel: true,
            schedule: Schedule.interval(
              {
                weekday: at.getDay() + 1,
                hour: at.getHours(),
                minute: at.getMinutes(),
              },
              true,
            ),
            // schedule: Schedule.at(at),
          });
          console.log(at, at.getDay() + 1, at.getHours(), at.getMinutes());
        }}
      >
        sendNotification
      </button> */}
    </main>
  );
}

export default App;
