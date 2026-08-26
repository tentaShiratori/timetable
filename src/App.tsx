import { useEvents } from "./components/Event/useEvents";
import { Route } from "./components/Route/Route";
import { EventEditScreen } from "./screens/EventEditScreen/EventEditScreen";
import { WeekScreen } from "./screens/WeekScreen/WeekScreen";
import "./App.css";

function App() {
  const { ready } = useEvents();

  if (!ready) {
    return (
      <main className="app">
        <p className="app-loading">読み込み中</p>
      </main>
    );
  }

  return (
    <main className="app">
      <Route path="/">
        <WeekScreen />
      </Route>
      <EventEditScreen />
    </main>
  );
}

export default App;
