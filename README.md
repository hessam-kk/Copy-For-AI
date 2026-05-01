<div align="center">

# 📋 Copy Function Signatures

**Right-click any source file → copy every function signature to your clipboard.**

A lightweight VS Code extension that extracts function signatures from your code and groups them by class — perfect for pasting into AI prompts, code reviews, documentation, or sharing snippets.

[![Version](https://img.shields.io/badge/version-1.0.1-blue.svg)](package.json)
[![VS Code](https://img.shields.io/badge/VS%20Code-^1.75.0-007ACC.svg)](package.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

</div>

---

## ✨ Features

- **One-click copy** — right-click any supported file and grab every signature instantly
- **Grouped by class** — methods are organized under their class/struct/interface for clean, readable output
- **15 languages** — Python, JavaScript, TypeScript, Java, C#, Kotlin, Go, Rust, C, C++, Ruby, PHP, Swift, JSX, TSX
- **Zero dependencies** — tiny, fast, no config, no telemetry, no network calls
- **Multiline signatures** — multi-line parameter lists are joined correctly

## 🚀 Installation

### From VSIX (recommended for now)

1. Download `copy-fn-signatures-1.0.1.vsix`
2. In VS Code: `Ctrl+Shift+P` → **"Extensions: Install from VSIX..."**
3. Pick the file, restart VS Code, done

Or from a terminal:

```bash
code --install-extension copy-fn-signatures-1.0.1.vsix --force
```

## 📖 Usage

1. Open any supported source file
2. **Right-click** the file in the **Explorer** (or the editor)
3. Click **"Copy Function Signatures"**
4. Paste anywhere — your clipboard now holds the full signature map

You'll see a confirmation like `Copied 4 signatures from sample.cs`.

### Sample output

For a file like [samples/sample.cs](samples/sample.cs):

```csharp
public struct Point
{
    public int X { get; set; }
    public void Move(int dx, int dy) { ... }
}
```

The clipboard receives:

```markdown
# Function signatures from sample.cs

class Point {
  public void Move(int dx, int dy)
  public override string ToString()
}

class IShape {
  double Area()
}

class Circle {
  public double Area()
}
```

More examples are in the [samples/](samples/) directory.

## 🌐 Supported Languages

| Language | Extensions | Class grouping |
|----------|-----------|----------------|
| Python | `.py` | ✅ `class` |
| JavaScript / TypeScript | `.js` `.ts` `.jsx` `.tsx` | ✅ `class` |
| Java | `.java` | ✅ `class` |
| C# | `.cs` | ✅ `class` / `struct` / `interface` |
| Kotlin | `.kt` | ✅ `class` / `interface` / `object` |
| Go | `.go` | ✅ struct receiver |
| Rust | `.rs` | ✅ `impl` block |
| C / C++ | `.c` `.cpp` | ✅ `class` / `struct` |
| Ruby | `.rb` | ✅ `class` / `module` |
| PHP | `.php` | ✅ `class` |
| Swift | `.swift` | ✅ `class` / `struct` / `enum` / `protocol` |

## 🧑‍💻 Development

```bash
npm install                 # install vsce
npm test                    # run the 45-test suite
npx @vscode/vsce package --no-dependencies   # build the .vsix
```

The test suite uses a lightweight VS Code mock — no test runner UI needed, just `node --test`.

## 📄 License

[MIT](LICENSE) © 2026 Hessam-KK
