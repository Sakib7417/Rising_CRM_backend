import swaggerJsdoc from "swagger-jsdoc";
import { env } from "./env";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Sales CRMAPI",
      version: "1.0.0",
      description: "Production-ready Sales CRMBackend API",
    },
    servers: [{ url: `http://localhost:${env.PORT}/api` }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "Auth" },
      { name: "Users" },
      { name: "Leads" },
      { name: "Followups" },
      { name: "Customers" },
      { name: "Deals" },
      { name: "Quotations" },
      { name: "Tasks" },
      { name: "Dashboard" },
      { name: "Reports" },
    ],
  },
  apis: ["./src/modules/**/*.routes.ts", "./src/modules/**/*.controller.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
