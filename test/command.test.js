'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadExtension } = require('./vscode-mock');

const { ext, vscode, context } = loadExtension();

ext.activate(context);
const handler = vscode.commands._handlers['copy-fn-signatures.copy'];
assert.ok(handler, 'command was registered');

function uri(fsPath) {
  return { fsPath };
}

function tmpFile(name, contents) {
  const p = path.join(os.tmpdir(), name);
  fs.writeFileSync(p, contents, 'utf8');
  return p;
}

test('command: registers itself with the context subscriptions', () => {
  assert.equal(context.subscriptions.length, 1);
});

test('command: copies formatted signatures for a supported file', async () => {
  vscode.reset();
  const p = tmpFile('cmd-test-file.py', 'class Dog:\n    def bark(self):\n        pass\n');
  await handler(uri(p));

  assert.equal(vscode.env.clipboard._text, buildExpected('cmd-test-file.py'));
  assert.equal(vscode.window._infos[0][0], 'Copied 1 signature from cmd-test-file.py');
});

function buildExpected(fileName) {
  return (
    `# Function signatures from ${fileName}\n` +
    '\nclass Dog {\n' +
    '  def bark(self)\n' +
    '}\n'
  );
}

test('command: pluralizes the info message', async () => {
  vscode.reset();
  const p = tmpFile('cmd-test-plural.py', 'def a():\n    pass\ndef b():\n    pass\n');
  await handler(uri(p));
  assert.equal(vscode.window._infos[0][0], 'Copied 2 signatures from cmd-test-plural.py');
});

test('command: shows error when no file is provided', async () => {
  vscode.reset();
  vscode.window.activeTextEditor = null;
  await handler(undefined);
  assert.equal(vscode.window._errors[0][0], 'No file selected.');
});

test('command: warns for unsupported file types', async () => {
  vscode.reset();
  const p = tmpFile('cmd-test-file.xyz', 'anything');
  await handler(uri(p));
  assert.equal(
    vscode.window._warnings[0][0],
    'Copy Function Signatures: unsupported file type ".xyz"'
  );
});

test('command: warns when the file cannot be read', async () => {
  vscode.reset();
  await handler({ fsPath: path.join(os.tmpdir(), 'does-not-exist-123.py') });
  assert.ok(vscode.window._errors[0][0].startsWith('Could not read file:'));
});

test('command: informs when no signatures are found', async () => {
  vscode.reset();
  const p = tmpFile('cmd-test-empty.py', 'x = 1\n');
  await handler(uri(p));
  assert.equal(vscode.window._infos[0][0], 'No function signatures found in this file.');
  assert.equal(vscode.env.clipboard._text, null);
});

test('command: falls back to the active editor when no uri is passed', async () => {
  vscode.reset();
  const p = tmpFile('cmd-test-active.py', 'def run():\n    pass\n');
  vscode.window.activeTextEditor = { document: { uri: uri(p) } };
  await handler(undefined);

  assert.ok(
    vscode.env.clipboard._text.startsWith('# Function signatures from cmd-test-active.py\n')
  );
});
