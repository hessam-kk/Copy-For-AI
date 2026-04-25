'use strict';

const Module = require('module');

const originalLoad = Module._load;

/**
 * Install a fake `vscode` module so extension.js can be required outside
 * the VS Code runtime. Returns a mock object with recording spies.
 */
function createVscodeMock() {
  const mock = {
    reset() {
      mock.commands._handlers = {};
      delete mock.window._errors;
      delete mock.window._warnings;
      delete mock.window._infos;
      mock.env.clipboard._text = null;
    },
    commands: {
      _handlers: {},
      registerCommand(command, handler) {
        mock.commands._handlers[command] = handler;
      },
    },
    window: {
      activeTextEditor: null,
      showErrorMessage: (...args) => {
        mock.window._errors = mock.window._errors || [];
        mock.window._errors.push(args);
      },
      showWarningMessage: (...args) => {
        mock.window._warnings = mock.window._warnings || [];
        mock.window._warnings.push(args);
      },
      showInformationMessage: (...args) => {
        mock.window._infos = mock.window._infos || [];
        mock.window._infos.push(args);
      },
    },
    env: {
      clipboard: {
        _text: null,
        async writeText(text) {
          mock.env.clipboard._text = text;
        },
      },
    },
  };
  return mock;
}

/**
 * Load extension.js with a fresh vscode mock installed.
 * @returns {{ ext: object, vscode: object, context: object }}
 */
function loadExtension() {
  const vscode = createVscodeMock();

  Module._load = function (request, parent, isMain) {
    if (request === 'vscode') return vscode;
    return originalLoad.apply(this, arguments);
  };

  const context = {
    subscriptions: [],
    push(item) {
      context.subscriptions.push(item);
    },
  };

  delete require.cache[require.resolve('../extension.js')];
  const ext = require('../extension.js');

  Module._load = originalLoad;
  return { ext, vscode, context };
}

module.exports = { loadExtension, createVscodeMock };
