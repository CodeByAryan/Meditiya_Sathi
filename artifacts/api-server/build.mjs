import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm, cp, mkdir, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";

// Plugins (e.g. 'esbuild-plugin-pino') may use `require` to resolve dependencies
globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const isVercel = process.env.VERCEL === "1";
const srcFontsDir = path.resolve(artifactDir, "fonts");
const srcLogo = path.resolve(artifactDir, "../meditiya-sathi/public/logo.png");

async function buildAll() {
  // Shared external list — only native/unbundleable packages
  const nativeExternals = [
    // PDFKit must stay external: its runtime uses the package-internal
    // `#standard-fonts/*` imports, which esbuild cannot safely bundle.
    "pdfkit",
    "*.node",
    "sharp",
    "better-sqlite3",
    "sqlite3",
    "canvas",
    "bcrypt",
    "argon2",
    "fsevents",
    "re2",
    "farmhash",
    "xxhash-addon",
    "bufferutil",
    "utf-8-validate",
    "ssh2",
    "cpu-features",
    "dtrace-provider",
    "isolated-vm",
    "lightningcss",
    "pg-native",
    "oracledb",
    "mongodb-client-encryption",
    "nodemailer",
    "handlebars",
    "knex",
    "typeorm",
    "protobufjs",
    "onnxruntime-node",
    "@tensorflow/*",
    "@prisma/client",
    "@mikro-orm/*",
    "@grpc/*",
    "@aws-sdk/*",
    "@azure/*",
    "@opentelemetry/*",
    "@google-cloud/*",
    "@google/*",
    "googleapis",
    "firebase-admin",
    "@parcel/watcher",
    "@sentry/profiling-node",
    "@tree-sitter/*",
    "aws-sdk",
    "classic-level",
    "dd-trace",
    "ffi-napi",
    "grpc",
    "hiredis",
    "kerberos",
    "leveldown",
    "miniflare",
    "mysql2",
    "newrelic",
    "odbc",
    "piscina",
    "realm",
    "ref-napi",
    "rocksdb",
    "sass-embedded",
    "sequelize",
    "serialport",
    "snappy",
    "tinypool",
    "usb",
    "workerd",
    "wrangler",
    "zeromq",
    "zeromq-prebuilt",
    "playwright",
    "puppeteer",
    "puppeteer-core",
    "electron",
  ];

  if (isVercel) {
    // ── Vercel build: bundle to api/index.mjs at repo root ──
    const vercelOutputDir = path.resolve(artifactDir, "../../api");
    await rm(vercelOutputDir, { recursive: true, force: true });

    await esbuild({
      entryPoints: [path.resolve(artifactDir, "api/index.ts")],
      platform: "node",
      bundle: true,
      format: "esm",
      outdir: vercelOutputDir,
      outExtension: { ".js": ".mjs" },
      logLevel: "info",
      external: nativeExternals,
      sourcemap: "linked",
      plugins: [
        esbuildPluginPino({ transports: ["pino-pretty"] }),
      ],
      banner: {
        js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
      `,
      },
    });

    // Also generate a CJS wrapper so older Node runtimes on Vercel can handle it
    const { writeFile } = await import("node:fs/promises");
    await writeFile(
      path.resolve(vercelOutputDir, "index.cjs"),
      `module.exports = require("./index.mjs").default;\n`,
    );

    // Keep server-side PDF assets beside the bundled function in deployments too.
    const vercelFontsDir = path.resolve(vercelOutputDir, "fonts");
    if (existsSync(srcFontsDir)) {
      await cp(srcFontsDir, vercelFontsDir, { recursive: true });
    }
    if (existsSync(srcLogo)) {
      await copyFile(srcLogo, path.resolve(vercelOutputDir, "logo.png"));
    }
    console.log("✅ Vercel function bundle written to api/index.mjs");
  } else {
    // ── Local dev build: bundle to dist/ ──
    const distDir = path.resolve(artifactDir, "dist");
    await rm(distDir, { recursive: true, force: true });

    await esbuild({
      entryPoints: [path.resolve(artifactDir, "src/index.ts"), path.resolve(artifactDir, "src/app.ts")],
      platform: "node",
      bundle: true,
      format: "esm",
      outdir: distDir,
      outExtension: { ".js": ".mjs" },
      logLevel: "info",
      external: nativeExternals,
      sourcemap: "linked",
      plugins: [
        esbuildPluginPino({ transports: ["pino-pretty"] }),
      ],
      banner: {
        js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
      `,
      },
    });

    console.log("✅ Local build written to dist/");

    // Copy fonts and assets to dist/ for production runtime
    const distFontsDir = path.resolve(distDir, "fonts");
    if (existsSync(srcFontsDir)) {
      await cp(srcFontsDir, distFontsDir, { recursive: true });
      console.log("✅ Copied fonts to dist/fonts/");
    }

    const distLogo = path.resolve(distDir, "logo.png");
    if (existsSync(srcLogo)) {
      await copyFile(srcLogo, distLogo);
      console.log("✅ Copied logo.png to dist/logo.png");
    }
  }
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
