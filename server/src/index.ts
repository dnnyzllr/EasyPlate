import { createApp } from "./app.js";
import { resolvePort } from "./config.js";

const port = resolvePort(process.env["PORT"]);

createApp().listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
