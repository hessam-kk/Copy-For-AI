const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

/**
 * Extractors per language. Each returns an array of { class, signature } objects.
 */
const EXTRACTORS = {
  // Python: def foo(a, b=1, *args, **kwargs) -> int:
  py: (src) => {
    const results = [];
    const lines = src.split('\n');
    let currentClass = null;
    let classIndent = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect class definition
      const classMatch = line.match(/^(\s*)class\s+(\w+)/);
      if (classMatch) {
        currentClass = classMatch[2];
        classIndent = classMatch[1].length;
        continue;
      }

      // Detect method definition (inside a class if indented more than class)
      if (!/^\s*(async\s+)?def\s+/.test(line)) continue;

      const methodIndent = (line.match(/^(\s*)/)[1] || '').length;

      // If we're back to class level or less, we've left the class
      if (currentClass && methodIndent <= classIndent) {
        currentClass = null;
      }

      // Collect lines until parens are balanced and we hit the closing ':'
      let sigLines = [line];
      let depth = (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
      let j = i + 1;
      while (depth > 0 && j < lines.length) {
        sigLines.push(lines[j]);
        depth += (lines[j].match(/\(/g) || []).length - (lines[j].match(/\)/g) || []).length;
        j++;
      }
      // Strip trailing colon and body
      let sig = sigLines.join('\n').replace(/\s*:\s*$/, '').trim();
      results.push({ class: currentClass, signature: sig });
    }
    return results;
  },

  // JavaScript / TypeScript
  js: extractJsTs,
  ts: extractJsTs,
  jsx: extractJsTs,
  tsx: extractJsTs,

  // Java / C# / Kotlin
  java: (src) => extractCStyleWithClass(src, /class\s+(\w+)/, /(?:public|private|protected|static|final|abstract|synchronized|native|default|\s)*\s+\w[\w<>\[\],\s]*\s+(\w+)\s*\([^)]*\)/gm),
  cs:   (src) => extractCStyleWithClass(src, /(?:class|struct|interface)\s+(\w+)/, /(?:public|private|protected|internal|static|virtual|override|abstract|async|\s)*\s+\w[\w<>\[\],\s]*\s+(\w+)\s*\([^)]*\)/gm),
  kt:   (src) => extractCStyleWithClass(src, /(?:class|interface|object)\s+(\w+)/, /(?:fun|suspend fun)\s+\w+\s*\([^)]*\)(?:\s*:\s*\w+)?/gm),

  // Go
  go: (src) => {
    const results = [];
    const lines = src.split('\n');
    let currentStruct = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect struct definition
      const structMatch = line.match(/^type\s+(\w+)\s+struct/);
      if (structMatch) {
        currentStruct = structMatch[1];
        continue;
      }

      // Detect function (with or without receiver)
      const funcMatch = line.match(/func\s+(?:\((\w+)\s+\*?(\w+)\)\s*)?(\w+)\s*\([^)]*\)(?:\s*(?:\([^)]*\)|\w[\w*\s]*))?/);
      if (!funcMatch) continue;

      const receiver = funcMatch[1];
      const receiverType = funcMatch[2];
      const funcName = funcMatch[3];

      // If it has a receiver, use that as class context
      if (receiverType) {
        results.push({ class: receiverType, signature: funcMatch[0].trim() });
      } else {
        results.push({ class: null, signature: funcMatch[0].trim() });
      }
    }
    return results;
  },

  // Rust
  rs: (src) => {
    const results = [];
    const lines = src.split('\n');
    let currentImpl = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect impl block
      const implMatch = line.match(/impl(?:<[^>]*>)?\s+(?:\w+\s+for\s+)?(\w+)/);
      if (implMatch) {
        currentImpl = implMatch[1];
        continue;
      }

      // Detect closing brace of impl
      if (currentImpl && /^\s*\}\s*$/.test(line)) {
        currentImpl = null;
        continue;
      }

      // Detect function
      if (!/(?:pub\s+)?(?:async\s+)?fn\s+/.test(line)) continue;

      const fnMatch = line.match(/((?:pub\s+)?(?:async\s+)?fn\s+\w+(?:<[^>]*>)?\s*\([^)]*\)(?:\s*->\s*[^{]+)?)/);
      if (fnMatch) {
        results.push({ class: currentImpl, signature: fnMatch[1].trim() });
      }
    }
    return results;
  },

  // C / C++
  c:   (src) => extractCStyleWithClass(src, /(?:class|struct)\s+(\w+)\s*\{/, /(?:[\w*]+\s+)+\*?\s*(\w+)\s*\([^)]*\)\s*(?=\{)/gm),
  cpp: (src) => extractCStyleWithClass(src, /(?:class|struct)\s+(\w+)\s*(?::\s*(?:public|private|protected)\s+\w+)?\s*\{/, /(?:[\w*:~]+\s+)+\*?\s*(\w+)\s*\([^)]*\)(?:\s*const)?(?:\s*(?:override|final))?\s*(?=\{)/gm),

  // Ruby
  rb: (src) => {
    const results = [];
    const lines = src.split('\n');
    let currentClass = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect class/module definition
      const classMatch = line.match(/^\s*(class|module)\s+(\w+)/);
      if (classMatch) {
        currentClass = classMatch[2];
        continue;
      }

      // Detect method
      const methodMatch = line.match(/def\s+(\w+[!?]?)/);
      if (methodMatch) {
        const sig = line.replace(/\s+end\s*$/, '').trim();
        results.push({ class: currentClass, signature: sig });
      }
    }
    return results;
  },

  // PHP
  php: (src) => {
    const results = [];
    const lines = src.split('\n');
    let currentClass = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect class definition
      const classMatch = line.match(/class\s+(\w+)/);
      if (classMatch) {
        currentClass = classMatch[1];
        continue;
      }

      // Detect function
      const funcMatch = line.match(/((?:public|private|protected|static|abstract|final|\s)*\s*function\s+\w+\s*\([^)]*\))/);
      if (funcMatch) {
        results.push({ class: currentClass, signature: funcMatch[1].trim() });
      }
    }
    return results;
  },

  // Swift
  swift: (src) => {
    const results = [];
    const lines = src.split('\n');
    let currentType = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect class/struct/enum definition
      const typeMatch = line.match(/(?:public|private|internal|open|fileprivate|\s)*(?:class|struct|enum|protocol)\s+(\w+)/);
      if (typeMatch) {
        currentType = typeMatch[1];
        continue;
      }

      // Detect function
      const funcMatch = line.match(/((?:public|private|internal|open|fileprivate|\s)*(?:static\s+|class\s+)?func\s+\w+(?:<[^>]*>)?\s*\([^)]*\)(?:\s*->\s*[^\{]+)?)/);
      if (funcMatch) {
        results.push({ class: currentType, signature: funcMatch[1].trim() });
      }
    }
    return results;
  },
};

function extractJsTs(src) {
  const results = [];
  const lines = src.split('\n');
  let currentClass = null;
  let braceDepth = 0;
  let inClass = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect class definition
    const classMatch = line.match(/class\s+(\w+)/);
    if (classMatch && !line.match(/=/)) {
      currentClass = classMatch[1];
      inClass = true;
      braceDepth = 0;
    }

    // Track brace depth for class scope
    if (inClass) {
      braceDepth += (line.match(/\{/g) || []).length;
      braceDepth -= (line.match(/\}/g) || []).length;
      if (braceDepth <= 0 && currentClass) {
        currentClass = null;
        inClass = false;
      }
    }

    // function declaration: function foo(...)
    const fnDeclMatch = line.match(/((?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*\w*\s*\([^)]*\)(?:\s*:\s*[^{]+)?)/);
    if (fnDeclMatch) {
      results.push({ class: currentClass, signature: fnDeclMatch[1].trim() });
      continue;
    }

    // arrow / const: const foo = (...) =>
    const arrowMatch = line.match(/((?:export\s+)?const\s+\w+\s*=\s*(?:async\s+)?\([^)]*\)\s*(?::\s*[^=>\n]+)?=>)/);
    if (arrowMatch) {
      results.push({ class: null, signature: arrowMatch[1].trim() });
      continue;
    }

    // method shorthand in class/object: foo(...) {
    const methodMatch = line.match(/((?:(?:public|private|protected|static|async|get|set|override)\s+)*\w+\s*\([^)]*\)(?:\s*:\s*[^{]+)?\s*(?=\{))/);
    if (methodMatch && inClass) {
      results.push({ class: currentClass, signature: methodMatch[1].trim() });
    }
  }
  return results;
}

function extractCStyleWithClass(src, classPattern, fnPattern) {
  const results = [];
  const lines = src.split('\n');
  let currentClass = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect class/struct
    const classMatch = line.match(classPattern);
    if (classMatch) {
      currentClass = classMatch[1];
      continue;
    }

    // Detect function
    const fnMatch = line.match(fnPattern);
    if (fnMatch) {
      results.push({ class: currentClass, signature: fnMatch[0].trim() });
    }
  }
  return results;
}

function activate(context) {
  const cmd = vscode.commands.registerCommand('copy-fn-signatures.copy', async (uri) => {
    const fileUri = uri || vscode.window.activeTextEditor?.document.uri;
    if (!fileUri) {
      vscode.window.showErrorMessage('No file selected.');
      return;
    }

    const filePath = fileUri.fsPath;
    const ext = path.extname(filePath).replace('.', '').toLowerCase();
    const extractor = EXTRACTORS[ext];

    if (!extractor) {
      vscode.window.showWarningMessage(`Copy Function Signatures: unsupported file type ".${ext}"`);
      return;
    }

    let src;
    try {
      src = fs.readFileSync(filePath, 'utf8');
    } catch (e) {
      vscode.window.showErrorMessage(`Could not read file: ${e.message}`);
      return;
    }

    const sigs = extractor(src);

    if (sigs.length === 0) {
      vscode.window.showInformationMessage('No function signatures found in this file.');
      return;
    }

    const fileName = path.basename(filePath);

    // Group by class, keeping signature as the identity so an extractor that
    // reports the same function both inside and outside a class emits it once.
    const classMap = new Map();
    const standalone = [];
    const seen = new Set();

    for (const { class: cls, signature } of sigs) {
      const key = cls ? `${cls} ${signature}` : ` ${signature}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (cls) {
        if (!classMap.has(cls)) classMap.set(cls, []);
        classMap.get(cls).push(signature);
      } else {
        standalone.push(signature);
      }
    }

    // Build output
    let output = `# Function signatures from ${fileName}\n`;

    for (const [cls, methods] of classMap) {
      output += `\nclass ${cls} {\n`;
      for (const m of methods) {
        output += `  ${m}\n`;
      }
      output += `}\n`;
    }

    if (standalone.length > 0) {
      output += `\n${standalone.join('\n\n')}\n`;
    }

    await vscode.env.clipboard.writeText(output);
    vscode.window.showInformationMessage(
      `Copied ${sigs.length} signature${sigs.length !== 1 ? 's' : ''} from ${fileName}`
    );
  });

  context.subscriptions.push(cmd);
}

function deactivate() {}

module.exports = { activate, deactivate };
