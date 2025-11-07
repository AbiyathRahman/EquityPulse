import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "secret";
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const authorization  = req.headers.authorization;
    if(!authorization){
        return res.status(401).json({error:"Authorization header is missing"});
    }
    const token = authorization.split(" ")[1];
    try{
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        (req as any).userId = decoded.userId;
        next();
    }catch(error){
        return res.status(401).json({error:"Invalid token"});
    }
};

export default requireAuth;
