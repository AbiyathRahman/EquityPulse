import prisma from "../services/prismaService.js";
export const updateUser = async (req, res) => {
    const userId = req.userId;
    const { name, email } = req.body;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    if (!name && !email) {
        return res.status(400).json({ error: "Nothing to update" });
    }
    try {
        if (email) {
            const existing = await prisma.user.findUnique({
                where: { email },
            });
            if (existing && existing.id !== userId) {
                return res.status(400).json({ error: "Email already in use" });
            }
        }
        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                name: name?.trim() || undefined,
                email: email?.trim() || undefined,
            },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
            },
        });
        return res.status(200).json({ message: "Profile updated", user: updated });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
//# sourceMappingURL=userController.js.map