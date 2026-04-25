'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadExtension } = require('./vscode-mock');

const { ext } = loadExtension();
const { buildOutput } = ext;

test('buildOutput: header includes the file name', () => {
  const out = buildOutput('a.py', [{ class: null, signature: 'def foo()' }]);
  assert.ok(out.startsWith('# Function signatures from a.py\n'));
});

test('buildOutput: groups methods under their class', () => {
  const out = buildOutput('a.py', [
    { class: 'Dog', signature: 'def bark(self)' },
    { class: 'Dog', signature: 'def fetch(self)' },
  ]);
  assert.equal(
    out,
    '# Function signatures from a.py\n' +
    '\nclass Dog {\n' +
    '  def bark(self)\n' +
    '  def fetch(self)\n' +
    '}\n'
  );
});

test('buildOutput: prints standalone signatures at the end', () => {
  const out = buildOutput('a.py', [
    { class: null, signature: 'def foo(a)' },
    { class: null, signature: 'def bar(b)' },
  ]);
  assert.equal(
    out,
    '# Function signatures from a.py\n' +
    '\ndef foo(a)\n' +
    '\ndef bar(b)\n'
  );
});

test('buildOutput: separates multiple classes', () => {
  const out = buildOutput('a.py', [
    { class: 'Dog', signature: 'def bark(self)' },
    { class: 'Cat', signature: 'def meow(self)' },
  ]);
  assert.equal(
    out,
    '# Function signatures from a.py\n' +
    '\nclass Dog {\n' +
    '  def bark(self)\n' +
    '}\n' +
    '\nclass Cat {\n' +
    '  def meow(self)\n' +
    '}\n'
  );
});

test('buildOutput: deduplicates identical class+signature entries', () => {
  const out = buildOutput('a.py', [
    { class: 'Dog', signature: 'def bark(self)' },
    { class: 'Dog', signature: 'def bark(self)' },
    { class: null, signature: 'def foo(a)' },
    { class: null, signature: 'def foo(a)' },
  ]);
  assert.equal(
    out,
    '# Function signatures from a.py\n' +
    '\nclass Dog {\n' +
    '  def bark(self)\n' +
    '}\n' +
    '\ndef foo(a)\n'
  );
});

test('buildOutput: keeps the same signature in different class contexts separately', () => {
  const out = buildOutput('a.js', [
    { class: 'Foo', signature: 'method(a)' },
    { class: null, signature: 'method(a)' },
  ]);
  assert.equal(
    out,
    '# Function signatures from a.js\n' +
    '\nclass Foo {\n' +
    '  method(a)\n' +
    '}\n' +
    '\nmethod(a)\n'
  );
});

test('buildOutput: empty input produces just the header', () => {
  assert.equal(buildOutput('a.py', []), '# Function signatures from a.py\n');
});
