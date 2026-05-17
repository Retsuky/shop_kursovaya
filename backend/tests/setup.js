process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-unit-tests";
process.env.PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "http://localhost:3020";
