import express from "express";
import dotenv from "dotenv";
import router from "./routes/authRoute.js";
import portfolioRoute from "./routes/portfolioRoute.js";
import transactionRoute from "./routes/transactionRoute.js";
import summaryRoute from "./routes/summaryRoute.js";
import analyticsRoute from "./routes/analyticsRoutes.js";
import healthRoute from "./routes/healthRoute.js";
const app = express();
dotenv.config();
app.use(express.json());
app.get('/', (req, res) => {
    return res.json({ message: 'Hello World' });
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
//# sourceMappingURL=server.js.map