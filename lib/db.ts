// Database Client - This is how we talk to our PostgreSQL database
// We use Prisma as an ORM (Object-Relational Mapper), which means
// instead of writing raw SQL, we can use JavaScript/TypeScript objects.

import { PrismaClient } from "./generated/prisma";

// This pattern prevents creating multiple database connections in development.
// In dev mode, Next.js hot-reloads your code, which would normally create
// a new PrismaClient each time. This caches it on the global object instead.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
