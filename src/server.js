import dotenv from "dotenv";
import { createApp } from "./app.js";
import { startServer } from "./serverStartup.js";

dotenv.config();

const port = Number(process.env.APP_PORT || 3000);
const app = createApp();

startServer({ app, port });
