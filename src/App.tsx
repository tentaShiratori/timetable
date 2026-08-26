import { Route } from "./components/Route/Route";
import { WeekScreen } from "./screens/WeekScreen/WeekScreen";
import "./App.css";

function App() {
  return (
    <main className="app">
      <Route path="/">
        <WeekScreen />
      </Route>
    </main>
  );
}

export default App;
