'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadExtension } = require('./vscode-mock');

const { ext } = loadExtension();
const { EXTRACTORS } = ext;

test('python: extracts standalone functions', () => {
  const sigs = EXTRACTORS.py(
    'def foo(a, b=1):\n' +
    '    return a\n' +
    '\n' +
    'def bar(*args, **kwargs):\n' +
    '    pass\n'
  );
  assert.deepEqual(sigs, [
    { class: null, signature: 'def foo(a, b=1)' },
    { class: null, signature: 'def bar(*args, **kwargs)' },
  ]);
});

test('python: extracts methods inside a class with class attribution', () => {
  const sigs = EXTRACTORS.py(
    'class Dog:\n' +
    '    def bark(self, loud):\n' +
    '        print(loud)\n' +
    '    async def fetch(self, url):\n' +
    '        pass\n'
  );
  assert.deepEqual(sigs, [
    { class: 'Dog', signature: 'def bark(self, loud)' },
    { class: 'Dog', signature: 'async def fetch(self, url)' },
  ]);
});

test('python: resets class scope for functions after the class', () => {
  const sigs = EXTRACTORS.py(
    'class Dog:\n' +
    '    def bark(self):\n' +
    '        pass\n' +
    'def standalone():\n' +
    '    pass\n'
  );
  assert.deepEqual(sigs, [
    { class: 'Dog', signature: 'def bark(self)' },
    { class: null, signature: 'def standalone()' },
  ]);
});

test('python: keeps type annotations and returns in the signature', () => {
  const sigs = EXTRACTORS.py(
    'def greet(name: str, *, loud: bool = False) -> str:\n' +
    '    return name\n'
  );
  assert.deepEqual(sigs, [
    { class: null, signature: 'def greet(name: str, *, loud: bool = False) -> str' },
  ]);
});

test('python: captures multi-line signatures', () => {
  const sigs = EXTRACTORS.py(
    'def multiline(\n' +
    '    a,\n' +
    '    b=2,\n' +
    '):\n' +
    '    return a\n'
  );
  assert.deepEqual(sigs, [
    { class: null, signature: 'def multiline(\n    a,\n    b=2,\n)' },
  ]);
});

test('javascript: extracts function declarations with modifiers', () => {
  const sigs = EXTRACTORS.js(
    'function top(a, b) {\n' +
    '  return a;\n' +
    '}\n' +
    'export async function asyncFn(x) {}\n'
  );
  assert.deepEqual(sigs, [
    { class: null, signature: 'function top(a, b)' },
    { class: null, signature: 'export async function asyncFn(x)' },
  ]);
});

test('javascript: extracts arrow functions assigned to const', () => {
  const sigs = EXTRACTORS.js(
    'const arrow = (p, q) => p + q;\n'
  );
  assert.deepEqual(sigs, [
    { class: null, signature: 'const arrow = (p, q) =>' },
  ]);
});

test('javascript: extracts class methods and scopes them to the class', () => {
  const sigs = EXTRACTORS.js(
    'class User {\n' +
    '  static create(name) {}\n' +
    '  async load() {}\n' +
    '  get fullName() {}\n' +
    '  set fullName(v) {}\n' +
    '}\n'
  );
  assert.deepEqual(sigs, [
    { class: 'User', signature: 'static create(name)' },
    { class: 'User', signature: 'async load()' },
    { class: 'User', signature: 'get fullName()' },
    { class: 'User', signature: 'set fullName(v)' },
  ]);
});

test('javascript: resets class scope after the class closes', () => {
  const sigs = EXTRACTORS.js(
    'class Foo {\n' +
    '  method(a) { return a; }\n' +
    '}\n' +
    'function after() {}\n'
  );
  assert.deepEqual(sigs, [
    { class: 'Foo', signature: 'method(a)' },
    { class: null, signature: 'function after()' },
  ]);
});

test('javascript: handles empty input', () => {
  assert.deepEqual(EXTRACTORS.js('const x = 5;\n'), []);
});

test('typescript: uses the same extractor as javascript', () => {
  assert.equal(EXTRACTORS.ts, EXTRACTORS.js);
  assert.equal(EXTRACTORS.jsx, EXTRACTORS.js);
  assert.equal(EXTRACTORS.tsx, EXTRACTORS.js);
});

test('java: extracts methods and scopes them to their class', () => {
  const sigs = EXTRACTORS.java(
    'public class Main {\n' +
    '  public static void main(String[] args) {\n' +
    '    run();\n' +
    '  }\n' +
    '  private int add(int a, int b) {\n' +
    '    return a + b;\n' +
    '  }\n' +
    '}\n'
  );
  assert.deepEqual(sigs, [
    { class: 'Main', signature: 'public static void main(String[] args)' },
    { class: 'Main', signature: 'private int add(int a, int b)' },
  ]);
});

test('c#: extracts from classes, structs and interfaces', () => {
  const sigs = EXTRACTORS.cs(
    'public class Foo {\n' +
    '  public void Do() {}\n' +
    '}\n' +
    'struct Bar {\n' +
    '  internal int Size() { return 1; }\n' +
    '}\n' +
    'interface Baz {\n' +
    '  void Run();\n' +
    '}\n'
  );
  assert.deepEqual(sigs, [
    { class: 'Foo', signature: 'public void Do()' },
    { class: 'Bar', signature: 'internal int Size()' },
    { class: 'Baz', signature: 'void Run()' },
  ]);
});

test('kotlin: extracts functions with return types and classes', () => {
  const sigs = EXTRACTORS.kt(
    'fun main(args: Array<String>): Unit {}\n' +
    'class Greeter {\n' +
    '  fun greet(name: String): String { return name }\n' +
    '}\n'
  );
  assert.deepEqual(sigs, [
    { class: null, signature: 'fun main(args: Array<String>): Unit' },
    { class: 'Greeter', signature: 'fun greet(name: String): String' },
  ]);
});

test('go: extracts plain functions as standalone', () => {
  const sigs = EXTRACTORS.go(
    'func plain(x int) int {\n' +
    '  return x\n' +
    '}\n'
  );
  assert.deepEqual(sigs, [
    { class: null, signature: 'func plain(x int) int' },
  ]);
});

test('go: extracts methods with pointer and value receivers', () => {
  const sigs = EXTRACTORS.go(
    'type Dog struct {\n' +
    '  Name string\n' +
    '}\n' +
    'func (d Dog) Name() string { return d.Name }\n' +
    'func (d *Dog) Rename(n string) {}\n'
  );
  assert.deepEqual(sigs, [
    { class: 'Dog', signature: 'func (d Dog) Name() string' },
    { class: 'Dog', signature: 'func (d *Dog) Rename(n string)' },
  ]);
});

test('go: standalone functions after a struct stay standalone', () => {
  const sigs = EXTRACTORS.go(
    'type Handler struct {\n' +
    '  fn func(string) error\n' +
    '}\n' +
    'func New() *Handler { return &Handler{} }\n'
  );
  assert.deepEqual(sigs, [
    { class: null, signature: 'func New()' },
  ]);
});

test('rust: extracts free functions as standalone', () => {
  const sigs = EXTRACTORS.rs(
    'pub fn free(a: i32) -> i32 {\n' +
    '  a\n' +
    '}\n'
  );
  assert.deepEqual(sigs, [
    { class: null, signature: 'pub fn free(a: i32) -> i32' },
  ]);
});

test('rust: extracts methods inside an impl block with attribution', () => {
  const sigs = EXTRACTORS.rs(
    'impl Dog {\n' +
    '  pub fn bark(&self, loud: bool) {\n' +
    '    println!("{}", loud);\n' +
    '  }\n' +
    '  fn quiet(&self) {}\n' +
    '}\n' +
    'fn after() {}\n'
  );
  assert.deepEqual(sigs, [
    { class: 'Dog', signature: 'pub fn bark(&self, loud: bool)' },
    { class: 'Dog', signature: 'fn quiet(&self)' },
    { class: null, signature: 'fn after()' },
  ]);
});

test('rust: handles impl blocks with trait bound', () => {
  const sigs = EXTRACTORS.rs(
    'impl Display for Dog {\n' +
    '  fn fmt(&self, f: &mut Formatter) -> Result { Ok(()) }\n' +
    '}\n'
  );
  assert.deepEqual(sigs, [
    { class: 'Dog', signature: 'fn fmt(&self, f: &mut Formatter) -> Result' },
  ]);
});

test('c: extracts functions, structs do not leak scope', () => {
  const sigs = EXTRACTORS.c(
    'int add(int a, int b) {\n' +
    '  return a + b;\n' +
    '}\n' +
    'struct Point {\n' +
    '  int x;\n' +
    '};\n' +
    'void move(struct Point *p) {}\n'
  );
  assert.deepEqual(sigs, [
    { class: null, signature: 'int add(int a, int b)' },
    { class: null, signature: 'void move(struct Point *p)' },
  ]);
});

test('c++: extracts methods with const/override and scopes them', () => {
  const sigs = EXTRACTORS.cpp(
    'class Foo : public Bar {\n' +
    '  void doIt(int x) const override {\n' +
    '    x++;\n' +
    '  }\n' +
    '};\n' +
    'int helper(int a) {\n' +
    '  return a;\n' +
    '}\n'
  );
  assert.deepEqual(sigs, [
    { class: 'Foo', signature: 'void doIt(int x) const override' },
    { class: null, signature: 'int helper(int a)' },
  ]);
});

test('ruby: extracts class and module methods', () => {
  const sigs = EXTRACTORS.rb(
    'class Dog\n' +
    '  def bark(loud)\n' +
    '    puts loud\n' +
    '  end\n' +
    '  def quiet?\n' +
    '    true\n' +
    '  end\n' +
    'end\n'
  );
  assert.deepEqual(sigs, [
    { class: 'Dog', signature: 'def bark(loud)' },
    { class: 'Dog', signature: 'def quiet?' },
  ]);
});

test('ruby: top-level methods are standalone, not attached to a class', () => {
  const sigs = EXTRACTORS.rb(
    'class Dog\n' +
    '  def bark\n' +
    '    puts "woof"\n' +
    '  end\n' +
    'end\n' +
    'def top()\n' +
    '  nil\n' +
    'end\n'
  );
  assert.deepEqual(sigs, [
    { class: 'Dog', signature: 'def bark' },
    { class: null, signature: 'def top()' },
  ]);
});

test('ruby: module methods are attributed to the module', () => {
  const sigs = EXTRACTORS.rb(
    'module Utils\n' +
    '  def self.help\n' +
    '    nil\n' +
    '  end\n' +
    'end\n'
  );
  assert.deepEqual(sigs, [
    { class: 'Utils', signature: 'def self.help' },
  ]);
});

test('php: extracts class methods and resets scope', () => {
  const sigs = EXTRACTORS.php(
    'class User {\n' +
    '  public function getName() {\n' +
    '    return $this->name;\n' +
    '  }\n' +
    '}\n' +
    'function top($a) {\n' +
    '  return $a;\n' +
    '}\n'
  );
  assert.deepEqual(sigs, [
    { class: 'User', signature: 'public function getName()' },
    { class: null, signature: 'function top($a)' },
  ]);
});

test('swift: extracts methods and resets scope after the type', () => {
  const sigs = EXTRACTORS.swift(
    'class Dog {\n' +
    '  func bark(loud: Bool) {\n' +
    '    print(loud)\n' +
    '  }\n' +
    '}\n' +
    'struct Point {\n' +
    '  func distance() -> Double {\n' +
    '    return 0\n' +
    '  }\n' +
    '}\n' +
    'private func top() {}\n'
  );
  assert.deepEqual(sigs, [
    { class: 'Dog', signature: 'func bark(loud: Bool)' },
    { class: 'Point', signature: 'func distance() -> Double' },
    { class: null, signature: 'private func top()' },
  ]);
});

test('swift: extracts static and class functions', () => {
  const sigs = EXTRACTORS.swift(
    'class Math {\n' +
    '  static func square(_ x: Int) -> Int {\n' +
    '    return x * x\n' +
    '  }\n' +
    '  class func make() -> Math { return Math() }\n' +
    '}\n'
  );
  assert.deepEqual(sigs, [
    { class: 'Math', signature: 'static func square(_ x: Int) -> Int' },
    { class: 'Math', signature: 'class func make() -> Math' },
  ]);
});

test('unknown language has no extractor', () => {
  assert.equal(EXTRACTORS.txt, undefined);
});
