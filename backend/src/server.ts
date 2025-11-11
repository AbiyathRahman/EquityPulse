import express, { Request, Response } from "express";
import dotenv from "dotenv";
import router from "./routes/authRoute.js";
import portfolioRoute from "./routes/portfolioRoute.js";
import transactionRoute from "./routes/transactionRoute.js";
import summaryRoute from "./routes/summaryRoute.js";
const app = express();
dotenv.config();
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
    return res.json({ message: 'Hello World' })
});
app.use('/auth', router);
app.use('/portfolio', portfolioRoute);
app.use('/transaction', transactionRoute);
app.use('/summary', summaryRoute);

app.listen(4000, () => {
    console.log('Server is running on port 4000');
});
