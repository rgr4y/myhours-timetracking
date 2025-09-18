const path = require('path');
const fs = require('fs');
const Module = require('module');
const { pathToFileURL } = require('url');

async function bootstrap() {
  const isPackaged = process.env.ELECTRON_IS_DEV !== '1' && !process.defaultApp;
  let specifier = './main.js';

  if (isPackaged && process.resourcesPath) {
    const additionalModulePaths = [
      path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules'),
      path.join(process.resourcesPath, 'app.asar', 'node_modules')
    ];

    const existingNodePath = process.env.NODE_PATH
      ? process.env.NODE_PATH.split(path.delimiter)
      : [];

    let nodePathChanged = false;
    for (const candidate of additionalModulePaths) {
      if (!existingNodePath.includes(candidate)) {
        existingNodePath.push(candidate);
        nodePathChanged = true;
      }

      if (!Module.globalPaths.includes(candidate)) {
        Module.globalPaths.push(candidate);
        nodePathChanged = true;
      }
    }

    if (nodePathChanged) {
      process.env.NODE_PATH = existingNodePath.join(path.delimiter);
      Module._initPaths();
    }

    const unpackedEntry = path.join(
      process.resourcesPath,
      'app.asar.unpacked',
      'src',
      'main',
      'main.js'
    );

    if (fs.existsSync(unpackedEntry)) {
      specifier = pathToFileURL(unpackedEntry).href;
    }
  }

  try {
    await import(specifier);
  } catch (error) {
    console.error('[MAIN] Failed to import ESM entry module', error);
    process.exit(1);
  }
}

bootstrap();
