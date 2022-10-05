import { PrismaClient } from '@prisma/client';

const dataPool = new PrismaClient();    //database pool

export default dataPool;