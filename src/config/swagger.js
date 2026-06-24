import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Kiosk POS API',
      version: '0.1.0',
      description: 'Token-based counter POS for a self-service cafe/kiosk.',
    },
    servers: [{ url: process.env.SWAGGER_SERVER_URL || 'http://localhost:5000' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

export default swaggerJsdoc(options);
