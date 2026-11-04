import process from "node:process";

process.env.NODE_ENV = "development";
await import("./index.js");
