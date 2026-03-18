import type { Options } from "@wdio/types";

export const config: Options.Testrunner = {
    runner: "local",
    autoCompileOpts: {
        autoCompile: true,
        tsNodeOpts: {
            project: "./tsconfig.wdio.json",
            transpileOnly: true
        }
    },

    specs: ["./src/test/wdio/**/*.e2e.ts"],
    exclude: [],

    maxInstances: 1,

    capabilities: [{
        browserName: "chrome",
        "goog:chromeOptions": {
            args: [
                "--headless",
                "--disable-gpu",
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-web-security",
                "--window-size=1280,900"
            ]
        }
    }],

    logLevel: "warn",
    bail: 0,
    baseUrl: process.env["NUKLIUS_BASE_URL"] ?? "http://localhost:8080",

    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,

    services: ["chromedriver"],

    framework: "mocha",
    reporters: ["spec"],

    mochaOpts: {
        ui: "bdd",
        timeout: 60000,
        retries: process.env["CI"] ? 2 : 0
    }
};
