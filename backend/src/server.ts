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
const app = express();
dotenv.config();
app.use(express.json());

cron.schedule('5 17 * * 1-5', async () => {
    try{
        await takeDailySnapshot();
    }catch(error){
        console.error("Error taking daily snapshot:", error);
    }
},{timezone: "America/New_York"});

app.get('/', (req: Request, res: Response) => {
    return res.json({ message: 'Hello World' })
});
app.use('/auth', router);
app.use('/portfolio', portfolioRoute);
app.use('/transaction', transactionRoute);
app.use('/summary', summaryRoute);
app.use('/analytics', analyticsRoute);
app.use('/health', healthRoute);

app.listen(4000, () => {
    console.log('Server is running on port 4000');
});
