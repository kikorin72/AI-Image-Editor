import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
// If your Prisma file is located elsewhere, you can change the path: done
import { PrismaClient } from "@prisma/client";
import { Polar } from "@polar-sh/sdk";
import { polar, checkout, portal, usage, webhooks } from "@polar-sh/better-auth";
import { env } from "~/env";
import { db } from "~/server/db";

const polarClient = new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN,
    server: 'production'
});

const prisma = new PrismaClient();
export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql", // or "mysql", "postgresql", ...etc
    }),
    emailAndPassword: { 
    enabled: true, 
  },

plugins: [
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          products: [
            {
              productId: "518dbd99-d9f2-4847-80c5-5465b2b3020e",
              slug: "weekly",
            },
            {
              productId: "e07fac90-c60c-4685-ba73-73d1e747ac6f",
              slug: "monthly",
            },
            {
              productId: "ec9a26da-93d5-4ca2-ab9e-9c0335193ad7",
              slug: "yearly",
            },
          ],
          successUrl: "/dashboard",
          authenticatedUsersOnly: true,
        }),
        portal(),
        webhooks({
          secret: env.POLAR_ACCESS_SECRET,
          onOrderPaid: async (order) => {
            const externalCustomerId = order.data.customer.externalId;

            if (!externalCustomerId) {
              console.error("No external customer ID found.");
              throw new Error("No external customer id found.");
            }

            const productId = order.data.productId;

            let creditsToAdd = 0;

            switch (productId) {
              case "518dbd99-d9f2-4847-80c5-5465b2b3020e":
                creditsToAdd = 25;
                break;
              case "e07fac90-c60c-4685-ba73-73d1e747ac6f":
                creditsToAdd = 108;
                break;
              case "ec9a26da-93d5-4ca2-ab9e-9c0335193ad7":
                creditsToAdd = 1200;
                break;
            }

            await db.user.update({
              where: { id: externalCustomerId },
              data: {
                credits: {
                  increment: creditsToAdd,
                },
              },
            });
          },
        }),
      ],
    }),
  ],
});