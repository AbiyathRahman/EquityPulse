import {Request, Response} from "express";
import prisma from "../services/prismaService.js";
import axios from "axios";
import { getPreviousClose } from "../services/polygonService.js";

export const createTransaction = async (req: Request, res:Response) => {
    const {portfolioId, symbol, amount, type} = req.body;
    try{
        const tradeAmount = Number(amount);
        const portfolio = await prisma.portfolio.findFirst({
            where: {
                id: portfolioId,
                userId: (req as any).userId
            }
        });
        if(!portfolio){
            return res.status(404).json({error:"Portfolio not found"});
        }
        if(!Number.isFinite(tradeAmount) || tradeAmount <= 0 || !symbol || !type){
            return res.status(400).json({error:"Invalid transaction details"});
        }
        if(!["buy", "sell"].includes(type)){
            return res.status(400).json({error:"Invalid transaction type"});
        }
        const priceData = await getPreviousClose(symbol).catch(() => null);
        const currentPrice = Number(priceData?.close ?? 0);
        console.log(currentPrice);
        if(!Number.isFinite(currentPrice) || currentPrice <= 0){
            return res.status(502).json({error:"Unable to retrieve a valid market price"});
        }

        const tradeValue = tradeAmount * currentPrice;
        if(portfolio.balance < tradeValue && type === "buy"){
            return res.status(400).json({error:"Insufficient balance"});
        }
        const updatedBalanceValue = type === "buy" ? portfolio.balance - tradeValue : portfolio.balance + tradeValue;
        const roundedBalance = Math.round((updatedBalanceValue + Number.EPSILON) * 100) / 100
        
        const [transaction, updatedBalance] = await prisma.$transaction([
            prisma.transaction.create({
                data: {
                    portfolioId,
                    symbol,
                    amount: tradeAmount,
                    type,
                    priceAtExecution: currentPrice,
                    balance: roundedBalance
                }
            }),
            prisma.portfolio.update({
                where: {
                    id: portfolioId
                },
                data: {
                    balance: roundedBalance
                }
            })
        ]);
        if(type === "buy"){
            const existingHolding = await prisma.holding.findFirst({
                where: {
                    portfolioId,
                    symbol
                }
            });
            if(existingHolding){
                const totalCostBefore = existingHolding.quantity * existingHolding.avgBuyPrice;
                const totalCostAfter = totalCostBefore + tradeAmount * currentPrice;
                const totalQuantityAfter = existingHolding.quantity + tradeAmount;

                await prisma.holding.update({
                    where: {
                        id: existingHolding.id
                    },
                    data: {
                        quantity: totalQuantityAfter,
                        avgBuyPrice: totalCostAfter / totalQuantityAfter
                    }
                })
            }else{
                await prisma.holding.create({
                    data: {
                        portfolioId,
                        symbol,
                        quantity: tradeAmount,
                        avgBuyPrice: currentPrice,
                        createdAt: new Date()
                    }
                })
            }
        };
        if(type === "sell"){
            const existingHolding = await prisma.holding.findFirst({
                where: {
                    portfolioId,
                    symbol
                }
            });
            if(existingHolding){
                const updatedQuantity = existingHolding.quantity - tradeAmount;
                if(updatedQuantity <= 0){
                    await prisma.holding.delete({
                        where: {
                            id: existingHolding.id
                        }
                    })
                }else{
                    await prisma.holding.update({
                        where: {
                            id: existingHolding.id
                        },
                        data: {
                            quantity: updatedQuantity
                        }
                    })
                }
            }
                
        }

      return res.status(201).json({
      message: "Transaction successful",
      transaction,
      newBalance: updatedBalance,
    });
    }catch(error){
        console.error(error);
        return res.status(500).json({error:"Internal server error"});
    }
}

export const getTransactions = async (req: Request, res:Response) => {
    const portfolioId = Number(req.params.id);
    const userId = (req as any).userId;
    try{
        const portfolio = await prisma.portfolio.findFirst({
        where: { id: portfolioId, userId },
    });

    if (!portfolio) {
      return res.status(404).json({
        error: "Portfolio not found or does not belong to this user",
      });
    }
        const transactions = await prisma.transaction.findMany({
            where: {
                portfolioId
            },
            orderBy: {
                createdAt: "desc"
            }
        });
        return res.status(200).json({balance: portfolio.balance, transactions: transactions});
    }catch(error){
        console.error(error);
        return res.status(500).json({error:"Internal server error"});
    }
}
