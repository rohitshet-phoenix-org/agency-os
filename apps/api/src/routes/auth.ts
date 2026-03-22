import type { FastifyInstance } from "fastify";
import { prisma } from "@agency-os/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  orgName: z.string().min(2),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function authRoutes(app: FastifyInstance) {
  // POST /api/v1/auth/register
  app.post("/register", async (req, reply) => {
    const body = RegisterSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) return reply.code(409).send({ error: "Email already in use" });

    const passwordHash = await bcrypt.hash(body.password, 12);
    const slug = body.orgName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash,
        organizations: {
          create: {
            role: "ADMIN",
            organization: {
              create: { name: body.orgName, slug: `${slug}-${Date.now()}` },
            },
          },
        },
      },
      include: { organizations: { include: { organization: true } } },
    });

    const token = app.jwt.sign({ sub: user.id, email: user.email });
    return { token, user: { id: user.id, name: user.name, email: user.email } };
  });

  // POST /api/v1/auth/login
  app.post("/login", async (req, reply) => {
    const body = LoginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !user.passwordHash) return reply.code(401).send({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) return reply.code(401).send({ error: "Invalid credentials" });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const orgs = await prisma.organizationUser.findMany({
      where: { userId: user.id },
      include: { organization: true },
    });

    const token = app.jwt.sign({ sub: user.id, email: user.email });
    return { token, user: { id: user.id, name: user.name, email: user.email, orgs } };
  });

  // POST /api/v1/auth/client-login (client portal)
  app.post("/client-login", async (req, reply) => {
    const { email, password } = req.body as { email: string; password: string };
    const client = await prisma.client.findFirst({ where: { email } });
    if (!client || !client.portalPassword) return reply.code(401).send({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, client.portalPassword);
    if (!valid) return reply.code(401).send({ error: "Invalid credentials" });

    const token = app.jwt.sign({ sub: client.id, type: "client" }, { expiresIn: "1d" });
    return { token, client: { id: client.id, name: client.name, company: client.company } };
  });

  // GET /api/v1/auth/me
  app.get("/me", { preHandler: [app.authenticate] }, async (req) => {
    const payload = req.user as { sub: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        organizations: { include: { organization: true } },
      },
    });
    return user;
  });
}
