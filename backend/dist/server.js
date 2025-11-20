import express from "express";
import dotenv from "dotenv";
import router from "./routes/authRoute.js";
import portfolioRoute from "./routes/portfolioRoute.js";
import transactionRoute from "./routes/transactionRoute.js";
import summaryRoute from "./routes/summaryRoute.js";
import analyticsRoute from "./routes/analyticsRoutes.js";
import healthRoute from "./routes/healthRoute.js";
import cron from "node-cron";
import { takeDailySnapshot } from "./services/snapshotService.js";
import http from "http";
import { Server } from "socket.io";
import { handleSocketEvents, startPriceFeed } from "./services/livePriceService.js";
import orderRoute from "./routes/orderRoute.js";
import holdingsRoute from "./routes/holdingsRoute.js";
import assetRoute from "./routes/assetRoute.js";
import userRoute from "./routes/userRoute.js";
import cors from "cors";
const app = express();
dotenv.config();
const allowedOrigins = (process.env.CLIENT_URL ?? process.env.FRONTEND_URL ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
const corsOptions = allowedOrigins.length
    ? { origin: allowedOrigins, credentials: true }
    : { origin: "*" };
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());
const server = http.createServer(app);
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
export const io = new Server(server, {
    cors: {
        origin: corsOptions.origin,
        credentials: "credentials" in corsOptions ? corsOptions.credentials : false,
    },
});
cron.schedule('5 17 * * 1-5', async () => {
    try {
        await takeDailySnapshot();
    }
    catch (error) {
        console.error("Error taking daily snapshot:", error);
    }
}, { timezone: "America/New_York" });
handleSocketEvents();
startPriceFeed();
app.get('/', (req, res) => {
    return res.json({ message: 'Hello World' });
});
app.use('/auth', router);
app.use('/portfolio', portfolioRoute);
app.use('/transaction', transactionRoute);
app.use('/summary', summaryRoute);
app.use('/analytics', analyticsRoute);
app.use('/health', healthRoute);
app.use('/order', orderRoute);
app.use('/holdings', holdingsRoute);
app.use('/asset', assetRoute);
app.use('/user', userRoute);
server.listen(PORT, () => {
    console.log(`Server (HTTP + Socket.IO) running on port ${PORT}`);
});
//# sourceMappingURL=server.js.map