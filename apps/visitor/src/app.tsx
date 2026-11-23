import { useState } from "react";
import { label } from "@f/domain";
import { Button } from "@f/ui";

/** v0.0 沒有功能，這一頁只用來證明建置、規則與 CSP 走得通。 */
export function App() {
  const [times, setTimes] = useState(0);
  return (
    <main>
      <h1>工廠 v0.0</h1>
      <p>{label("waiting")}</p>
      <p>{times}</p>
      <Button onPress={() => { setTimes((n) => n + 1); }}>按一下</Button>
    </main>
  );
}