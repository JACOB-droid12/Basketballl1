import dotenv from "dotenv";
import { createApp } from "./app.js";

dotenv.config();

const port = Number(process.env.APP_PORT || 3000);
const app = createApp();

app.listen(port, () => {
  console.log(`Basketball court scheduler listening at http://localhost:${port}`);
});
