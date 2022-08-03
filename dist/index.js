"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  viteMockServe: () => viteMockServe
});
module.exports = __toCommonJS(src_exports);
var import_path2 = __toESM(require("path"));

// src/utils.ts
var import_fs = __toESM(require("fs"));
var toString = Object.prototype.toString;
function is(val, type) {
  return toString.call(val) === `[object ${type}]`;
}
function isFunction(val) {
  return is(val, "Function") || is(val, "AsyncFunction");
}
function isArray(val) {
  return val && Array.isArray(val);
}
function isRegExp(val) {
  return is(val, "RegExp");
}
function sleep(time) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("");
    }, time);
  });
}
function fileExists(f) {
  try {
    import_fs.default.accessSync(f, import_fs.default.constants.W_OK);
    return true;
  } catch (error) {
    return false;
  }
}

// src/index.ts
var import_vite = require("vite");

// src/createMockServer.ts
var import_path = __toESM(require("path"));
var import_fs2 = __toESM(require("fs"));
var import_chokidar = __toESM(require("chokidar"));
var import_chalk = __toESM(require("chalk"));
var import_url = __toESM(require("url"));
var import_fast_glob = __toESM(require("fast-glob"));
var import_mockjs = __toESM(require("mockjs"));
var import_esbuild = require("esbuild");
var import_path_to_regexp = require("path-to-regexp");
var import_module = __toESM(require("module"));
var mockData = [];
async function createMockServer(opt = { mockPath: "mock", configPath: "vite.mock.config" }) {
  opt = {
    baseApi: "",
    mockPath: "mock",
    watchFiles: true,
    supportTs: true,
    configPath: "vite.mock.config.ts",
    logger: true,
    ...opt
  };
  if (mockData.length > 0)
    return;
  mockData = await getMockConfig(opt);
  await createWatch(opt);
}
async function requestMiddleware(opt) {
  const { logger = true } = opt;
  const middleware = async (req, res, next) => {
    let queryParams = {};
    const baseUrl = (req.url || "").replace(opt.baseApi || "", "");
    if (baseUrl) {
      queryParams = import_url.default.parse(baseUrl, true);
    }
    const reqUrl = queryParams.pathname;
    const matchRequest = mockData.find((item) => {
      if (!reqUrl || !item || !item.url) {
        return false;
      }
      if (item.method && item.method.toUpperCase() !== req.method) {
        return false;
      }
      return (0, import_path_to_regexp.pathToRegexp)(item.url).test(reqUrl);
    });
    if (matchRequest) {
      const isGet = req.method && req.method.toUpperCase() === "GET";
      const { response, rawResponse, timeout, statusCode, url: url2 } = matchRequest;
      if (timeout) {
        await sleep(timeout);
      }
      const urlMatch = (0, import_path_to_regexp.match)(url2, { decode: decodeURIComponent });
      let query = queryParams.query;
      if (reqUrl) {
        if (isGet && JSON.stringify(query) === "{}" || !isGet) {
          const params = urlMatch(reqUrl).params;
          if (JSON.stringify(params) !== "{}") {
            query = urlMatch(reqUrl).params || {};
          } else {
            query = queryParams.query || {};
          }
        }
      }
      const self = { req, res, parseJson: parseJson.bind(null, req) };
      if (isFunction(rawResponse)) {
        await rawResponse.bind(self)(req, res);
      } else {
        const body = await parseJson(req);
        res.setHeader("Content-Type", "application/json");
        res.statusCode = statusCode || 200;
        const mockResponse = isFunction(response) ? response.bind(self)({ url: req.url, body, query, headers: req.headers }) : response;
        res.end(JSON.stringify(import_mockjs.default.mock(mockResponse)));
      }
      logger && loggerOutput("request invoke", req.url);
      return;
    }
    next();
  };
  return middleware;
}
function createWatch(opt) {
  const { configPath, logger, watchFiles } = opt;
  if (!watchFiles) {
    return;
  }
  const { absConfigPath, absMockPath } = getPath(opt);
  if (process.env.VITE_DISABLED_WATCH_MOCK === "true") {
    return;
  }
  const watchDir = [];
  const exitsConfigPath = import_fs2.default.existsSync(absConfigPath);
  exitsConfigPath && configPath ? watchDir.push(absConfigPath) : watchDir.push(absMockPath);
  const watcher = import_chokidar.default.watch(watchDir, {
    ignoreInitial: true
  });
  watcher.on("all", async (event, file) => {
    logger && loggerOutput(`mock file ${event}`, file);
    mockData = await getMockConfig(opt);
  });
}
function cleanRequireCache(opt) {
  if (!require.cache) {
    return;
  }
  const { absConfigPath, absMockPath } = getPath(opt);
  Object.keys(require.cache).forEach((file) => {
    if (file === absConfigPath || file.indexOf(absMockPath) > -1) {
      delete require.cache[file];
    }
  });
}
function parseJson(req) {
  return new Promise((resolve) => {
    let body = "";
    let jsonStr = "";
    req.on("data", function(chunk) {
      body += chunk;
    });
    req.on("end", function() {
      try {
        jsonStr = JSON.parse(body);
      } catch (err) {
        jsonStr = "";
      }
      resolve(jsonStr);
      return;
    });
  });
}
async function getMockConfig(opt) {
  cleanRequireCache(opt);
  const { absConfigPath, absMockPath } = getPath(opt);
  const { ignore, configPath, logger } = opt;
  let ret = [];
  if (configPath && import_fs2.default.existsSync(absConfigPath)) {
    logger && loggerOutput(`load mock data from`, absConfigPath);
    ret = await resolveModule(absConfigPath);
    return ret;
  }
  const mockFiles = import_fast_glob.default.sync(`**/*.{ts,js}`, {
    cwd: absMockPath
  }).filter((item) => {
    if (!ignore) {
      return true;
    }
    if (isFunction(ignore)) {
      return ignore(item);
    }
    if (isRegExp(ignore)) {
      return !ignore.test(import_path.default.basename(item));
    }
    return true;
  });
  try {
    ret = [];
    const resolveModulePromiseList = [];
    for (let index = 0; index < mockFiles.length; index++) {
      const mockFile = mockFiles[index];
      resolveModulePromiseList.push(resolveModule(import_path.default.join(absMockPath, mockFile)));
    }
    const loadAllResult = await Promise.all(resolveModulePromiseList);
    for (const resultModule of loadAllResult) {
      let mod = resultModule;
      if (!isArray(mod)) {
        mod = [mod];
      }
      ret = [...ret, ...mod];
    }
  } catch (error) {
    loggerOutput(`mock reload error`, error);
    ret = [];
  }
  return ret;
}
async function resolveModule(p) {
  const result = await (0, import_esbuild.build)({
    entryPoints: [p],
    outfile: "out.js",
    write: false,
    platform: "node",
    bundle: true,
    format: "cjs",
    metafile: true,
    target: "es2015"
  });
  const { text } = result.outputFiles[0];
  return await loadConfigFromBundledFile(p, text);
}
function getPath(opt) {
  const { mockPath, configPath } = opt;
  const cwd = process.cwd();
  const absMockPath = import_path.default.join(cwd, mockPath || "");
  const absConfigPath = import_path.default.join(cwd, configPath || "");
  return {
    absMockPath,
    absConfigPath
  };
}
function loggerOutput(title, msg, type = "info") {
  const tag = type === "info" ? import_chalk.default.cyan.bold(`[vite:mock]`) : import_chalk.default.red.bold(`[vite:mock-server]`);
  return console.log(
    `${import_chalk.default.dim(new Date().toLocaleTimeString())} ${tag} ${import_chalk.default.green(title)} ${import_chalk.default.dim(msg)}`
  );
}
async function loadConfigFromBundledFile(fileName, bundledCode) {
  const extension = import_path.default.extname(fileName);
  const extensions = import_module.default.Module._extensions;
  let defaultLoader;
  const isJs = extension === ".js";
  if (isJs) {
    defaultLoader = extensions[extension];
  }
  extensions[extension] = (module3, filename) => {
    if (filename === fileName) {
      ;
      module3._compile(bundledCode, filename);
    } else {
      if (!isJs) {
        extensions[extension](module3, filename);
      } else {
        defaultLoader(module3, filename);
      }
    }
  };
  let config;
  try {
    if (isJs && require && require.cache) {
      delete require.cache[fileName];
    }
    const raw = require(fileName);
    config = raw.__esModule ? raw.default : raw;
    if (defaultLoader && isJs) {
      extensions[extension] = defaultLoader;
    }
  } catch (error) {
    console.error(error);
  }
  return config;
}

// src/index.ts
(async () => {
  try {
    await import("mockjs");
  } catch (e) {
    throw new Error("vite-plugin-vue-mock requires mockjs to be present in the dependency tree.");
  }
})();
function getDefaultPath(supportTs = true) {
  return import_path2.default.resolve(process.cwd(), `src/main.${supportTs ? "ts" : "js"}`);
}
function viteMockServe(opt = {}) {
  let defaultPath = getDefaultPath();
  if (!fileExists(defaultPath)) {
    defaultPath = getDefaultPath(false);
    if (!fileExists(defaultPath)) {
      defaultPath = "";
    }
  }
  const defaultEnter = (0, import_vite.normalizePath)(defaultPath);
  const { injectFile = defaultEnter } = opt;
  let isDev = false;
  let config;
  let needSourcemap = false;
  return {
    name: "vite:mock",
    enforce: "pre",
    configResolved(resolvedConfig) {
      config = resolvedConfig;
      isDev = config.command === "serve";
      needSourcemap = !!resolvedConfig.build.sourcemap;
      isDev && createMockServer(opt);
    },
    configureServer: async ({ middlewares }) => {
      const { localEnabled = isDev } = opt;
      if (!localEnabled) {
        return;
      }
      const middleware = await requestMiddleware(opt);
      middlewares.use(middleware);
    },
    async transform(code, id) {
      if (isDev || !injectFile || !id.endsWith(injectFile)) {
        return null;
      }
      const { prodEnabled = true, injectCode = "" } = opt;
      if (!prodEnabled) {
        return null;
      }
      return {
        map: needSourcemap ? this.getCombinedSourcemap() : null,
        code: `${code}
${injectCode}`
      };
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  viteMockServe
});
