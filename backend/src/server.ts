import express, { Request, Response } from "express";
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
const app = express();
dotenv.config();
app.use(express.json());

const server = http.createServer(app);
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

export const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

cron.schedule('5 17 * * 1-5', async () => {
    try{
        await takeDailySnapshot();
    }catch(error){
        console.error("Error taking daily snapshot:", error);
    }
},{timezone: "America/New_York"});

handleSocketEvents();
startPriceFeed();

app.get('/', (req: Request, res: Response) => {
    return res.json({ message: 'Hello World' })
});
app.use('/auth', router);
app.use('/portfolio', portfolioRoute);
app.use('/transaction', transactionRoute);
app.use('/summary', summaryRoute);
app.use('/analytics', analyticsRoute);
app.use('/health', healthRoute);

server.listen(PORT, () => {
    console.log(`Server (HTTP + Socket.IO) running on port ${PORT}`);
})
