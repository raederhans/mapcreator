const fs = require("fs");
const path = require("path");

const STATE_ROOT_IDENTIFIERS = Object.freeze(["state", "runtimeState", "appState"]);
const STATE_ROOT_IDENTIFIER_PATTERN = STATE_ROOT_IDENTIFIERS.join("|");
const STATE_MEMBER_ASSIGN_RE = new RegExp(
  `\\b(?<root>${STATE_ROOT_IDENTIFIER_PATTERN})\\.(?<key>[A-Za-z_$][\\w$]*)\\s*=(?!=)`,
  "g",
);
const STATE_MEMBER_COMPOUND_ASSIGN_RE = new RegExp(
  `\\b(?<root>${STATE_ROOT_IDENTIFIER_PATTERN})\\.(?<key>[A-Za-z_$][\\w$]*)\\s*(?:\\|\\|=|&&=|\\?\\?=|>>>=|<<=|>>=|\\+=|-=|\\*=|\\/=|%=|\\|=|&=|\\^=)`,
  "g",
);
const STATE_OBJECT_ASSIGN_RE = new RegExp(
  `\\bObject\\.assign\\s*\\(\\s*(?<root>${STATE_ROOT_IDENTIFIER_PATTERN})\\s*,`,
  "g",
);

function normalizeRelativePath(filePath) {
  return String(filePath || "").replace(/\\/g, "/");
}

function isStateRootIdentifierName(name) {
  return STATE_ROOT_IDENTIFIERS.includes(String(name || ""));
}

function isDirectStateMemberExpression(node) {
  return (
    node?.type === "MemberExpression"
    && node.object?.type === "Identifier"
    && isStateRootIdentifierName(node.object.name)
  );
}

function isDirectStateWriteNode(node) {
  if (node?.type === "AssignmentExpression") {
    return isDirectStateMemberExpression(node.left);
  }
  if (node?.type === "CallExpression") {
    return (
      node.callee?.type === "MemberExpression"
      && node.callee.object?.type === "Identifier"
      && node.callee.object.name === "Object"
      && node.callee.property?.type === "Identifier"
      && node.callee.property.name === "assign"
      && node.arguments?.[0]?.type === "Identifier"
      && isStateRootIdentifierName(node.arguments[0].name)
    );
  }
  return false;
}

function isIdentifierBoundaryCharacter(character) {
  return !character || !/[A-Za-z0-9_$]/.test(character);
}

function readComputedStateAssignment(content = "", startIndex = 0, rootName = "state") {
  const start = Number(startIndex) || 0;
  const normalizedRootName = String(rootName || "");
  if (!isStateRootIdentifierName(normalizedRootName)) {
    return null;
  }
  if (content.slice(start, start + normalizedRootName.length) !== normalizedRootName) {
    return null;
  }
  if (!isIdentifierBoundaryCharacter(content[start - 1])) {
    return null;
  }
  let cursor = start + normalizedRootName.length;
  while (/\s/.test(content[cursor] || "")) {
    cursor += 1;
  }
  if (content[cursor] !== "[") {
    return null;
  }
  let depth = 0;
  while (cursor < content.length) {
    const character = content[cursor];
    if (character === "[") {
      depth += 1;
    } else if (character === "]") {
      depth -= 1;
      if (depth === 0) {
        cursor += 1;
        break;
      }
    }
    cursor += 1;
  }
  if (depth !== 0) {
    return null;
  }
  while (/\s/.test(content[cursor] || "")) {
    cursor += 1;
  }
  const operatorCandidates = [
    "||=",
    "&&=",
    "??=",
    ">>>=",
    "<<=",
    ">>=",
    "+=",
    "-=",
    "*=",
    "/=",
    "%=",
    "|=",
    "&=",
    "^=",
  ];
  const operator = operatorCandidates.find((candidate) => content.startsWith(candidate, cursor));
  if (!operator) {
    if (content[cursor] !== "=") {
      return null;
    }
    const nextCharacter = content[cursor + 1] || "";
    if (nextCharacter === "=") {
      return null;
    }
  }
  return {
    type: "computed-assign",
    key: "",
    index: start,
    text: content.slice(start, cursor + (operator ? operator.length : 1)),
    nextIndex: cursor + (operator ? operator.length : 1),
  };
}

function scanComputedStateAssignments(content = "") {
  const violations = [];
  let cursor = 0;
  while (cursor < content.length) {
    const nextMatch = STATE_ROOT_IDENTIFIERS
      .map((rootName) => ({ rootName, index: content.indexOf(rootName, cursor) }))
      .filter((entry) => entry.index >= 0)
      .sort((left, right) => left.index - right.index || right.rootName.length - left.rootName.length)[0];
    if (!nextMatch) {
      break;
    }
    const violation = readComputedStateAssignment(content, nextMatch.index, nextMatch.rootName);
    if (violation) {
      violations.push({
        type: violation.type,
        key: violation.key,
        index: violation.index,
        text: violation.text,
      });
      cursor = violation.nextIndex;
      continue;
    }
    cursor = nextMatch.index + nextMatch.rootName.length;
  }
  return violations;
}

function scanContentForStateWrites(content = "") {
  const violations = [];
  let match = null;
  STATE_MEMBER_ASSIGN_RE.lastIndex = 0;
  while ((match = STATE_MEMBER_ASSIGN_RE.exec(content)) !== null) {
    violations.push({
      type: "member-assign",
      key: match.groups?.key || "",
      index: match.index,
      root: match.groups?.root || "state",
      text: match[0],
    });
  }

  STATE_MEMBER_COMPOUND_ASSIGN_RE.lastIndex = 0;
  while ((match = STATE_MEMBER_COMPOUND_ASSIGN_RE.exec(content)) !== null) {
    violations.push({
      type: "member-compound-assign",
      key: match.groups?.key || "",
      index: match.index,
      root: match.groups?.root || "state",
      text: match[0],
    });
  }

  violations.push(...scanComputedStateAssignments(content));

  STATE_OBJECT_ASSIGN_RE.lastIndex = 0;
  while ((match = STATE_OBJECT_ASSIGN_RE.exec(content)) !== null) {
    violations.push({
      type: "object-assign",
      key: "",
      index: match.index,
      root: match.groups?.root || "state",
      text: match[0],
    });
  }
  return violations;
}

function loadAllowlist(allowlistPath) {
  const raw = fs.readFileSync(allowlistPath, "utf8");
  const payload = JSON.parse(raw);
  const files = Array.isArray(payload?.files) ? payload.files : [];
  return new Set(files.map(normalizeRelativePath));
}

function createRule({ allowlistPath } = {}) {
  return {
    meta: {
      type: "problem",
      docs: {
        description: "Guard direct root state writes behind the temporary allowlist.",
      },
      schema: [],
    },
    create(context) {
      const filename = normalizeRelativePath(path.relative(process.cwd(), context.getFilename?.() || ""));
      const allowlist = allowlistPath && fs.existsSync(allowlistPath)
        ? loadAllowlist(allowlistPath)
        : new Set();
      if (allowlist.has(filename)) {
        return {};
      }
      return {
        AssignmentExpression(node) {
          if (isDirectStateWriteNode(node)) {
            context.report({
              node,
              message: "Direct root state writes must stay on the temporary allowlist.",
            });
          }
        },
        CallExpression(node) {
          if (isDirectStateWriteNode(node)) {
            context.report({
              node,
              message: "Object.assign(state, ...) must stay on the temporary allowlist.",
            });
          }
        },
      };
    },
  };
}

module.exports = {
  STATE_ROOT_IDENTIFIERS,
  STATE_MEMBER_ASSIGN_RE,
  STATE_MEMBER_COMPOUND_ASSIGN_RE,
  STATE_OBJECT_ASSIGN_RE,
  createRule,
  isDirectStateWriteNode,
  isStateRootIdentifierName,
  loadAllowlist,
  normalizeRelativePath,
  scanContentForStateWrites,
};
