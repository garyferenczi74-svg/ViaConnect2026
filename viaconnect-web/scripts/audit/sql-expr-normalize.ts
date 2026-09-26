// Normalize redundant parentheses in a SQL expression by parsing it and
// reprinting with parentheses only where the operator precedence needs them.
// Function-call parentheses, subquery parentheses, and parentheses that change
// meaning (`(a + b) * c` versus `a + b * c`) are kept.
//
// A parse failure returns the input unchanged. Callers must not fall back to
// deleting every parenthesis: that makes different expressions compare equal.

interface Tok {
  readonly kind: 'ident' | 'string' | 'number' | 'op' | 'punct';
  readonly text: string;
}

type Assoc = 'left' | 'right';

interface BinOp {
  readonly text: string;
  readonly prec: number;
  readonly assoc: Assoc;
  readonly associative: boolean;
}

type Node =
  | { readonly kind: 'atom'; readonly text: string; readonly prec: number }
  | { readonly kind: 'call'; readonly name: string; readonly args: readonly Node[]; readonly prec: number }
  | { readonly kind: 'prefix'; readonly op: string; readonly expr: Node; readonly prec: number }
  | { readonly kind: 'binary'; readonly op: BinOp; readonly left: Node; readonly right: Node; readonly prec: number }
  | { readonly kind: 'is'; readonly expr: Node; readonly text: string; readonly prec: number }
  | { readonly kind: 'in'; readonly expr: Node; readonly not: boolean; readonly body: string; readonly prec: number }
  | { readonly kind: 'between'; readonly expr: Node; readonly low: Node; readonly high: Node; readonly not: boolean; readonly prec: number }
  | { readonly kind: 'like'; readonly expr: Node; readonly op: string; readonly pattern: Node; readonly prec: number }
  | { readonly kind: 'any'; readonly expr: Node; readonly op: string; readonly kw: string; readonly body: Node; readonly prec: number }
  | { readonly kind: 'exists'; readonly body: string; readonly prec: number }
  | { readonly kind: 'array'; readonly items: readonly Node[]; readonly prec: number }
  | { readonly kind: 'select'; readonly text: string; readonly prec: number };

const PRIMARY = 100;
const CAST = 11;
const UNARY = 10;
const COMPARE = 5;
const IS_PREC = 4;
const NOT_PREC = 3;

const SYNTAX = new Set([
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'ON', 'AND', 'OR', 'NOT', 'IS', 'IN', 'EXISTS',
  'ANY', 'ALL', 'SOME', 'ARRAY', 'AS', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS', 'OUTER',
  'BETWEEN', 'LIKE', 'ILIKE', 'NULL', 'TRUE', 'FALSE', 'DISTINCT', 'UNKNOWN', 'GROUP',
  'ORDER', 'LIMIT', 'HAVING', 'UNION', 'EXCEPT', 'INTERSECT', 'OFFSET', 'USING',
]);

function tokenize(input: string): Tok[] {
  const tokens: Tok[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i] ?? '';
    if (ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t') {
      i += 1;
      continue;
    }
    if (ch === "'" || ((ch === 'E' || ch === 'e') && input[i + 1] === "'")) {
      let text = '';
      if (ch === 'E' || ch === 'e') {
        text += ch;
        i += 1;
      }
      text += "'";
      i += 1;
      while (i < input.length) {
        const c = input[i] ?? '';
        text += c;
        i += 1;
        if (c === "'" && input[i] === "'") {
          text += "'";
          i += 1;
          continue;
        }
        if (c === "'") break;
      }
      tokens.push({ kind: 'string', text });
      continue;
    }
    if (ch === '"') {
      let text = '"';
      i += 1;
      while (i < input.length) {
        const c = input[i] ?? '';
        text += c;
        i += 1;
        if (c === '"' && input[i] === '"') {
          text += '"';
          i += 1;
          continue;
        }
        if (c === '"') break;
      }
      tokens.push({ kind: 'ident', text });
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(input[i + 1] ?? ''))) {
      let j = i + 1;
      while (j < input.length && /[0-9]/.test(input[j] ?? '')) j += 1;
      if (input[j] === '.') {
        j += 1;
        while (j < input.length && /[0-9]/.test(input[j] ?? '')) j += 1;
      }
      tokens.push({ kind: 'number', text: input.slice(i, j) });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < input.length && /[A-Za-z0-9_]/.test(input[j] ?? '')) j += 1;
      tokens.push({ kind: 'ident', text: input.slice(i, j) });
      i = j;
      continue;
    }
    const two = input.slice(i, i + 3);
    const ops = ['->>', '->', '::', '<=', '>=', '<>', '!=', '||'];
    const found = ops.find((op) => two.startsWith(op));
    if (found !== undefined) {
      tokens.push({ kind: 'op', text: found });
      i += found.length;
      continue;
    }
    if ('+-*/%^=<>'.includes(ch)) {
      tokens.push({ kind: 'op', text: ch });
      i += 1;
      continue;
    }
    if ('()[],.*'.includes(ch)) {
      tokens.push({ kind: 'punct', text: ch });
      i += 1;
      continue;
    }
    throw new Error(`unexpected character ${ch} at ${i}`);
  }
  return tokens;
}

class Parser {
  private readonly tokens: readonly Tok[];
  private index = 0;

  constructor(tokens: readonly Tok[]) {
    this.tokens = tokens;
  }

  parseTop(): Node {
    const node = this.parseExpr(0);
    if (!this.atEnd()) throw new Error(`leftover ${this.peek()?.text ?? ''}`);
    return node;
  }

  private atEnd(): boolean {
    return this.index >= this.tokens.length;
  }

  private peek(): Tok | undefined {
    return this.tokens[this.index];
  }

  private eat(): Tok {
    const tok = this.peek();
    if (tok === undefined) throw new Error('unexpected end');
    this.index += 1;
    return tok;
  }

  private isPunct(text: string): boolean {
    const tok = this.peek();
    return tok !== undefined && tok.kind === 'punct' && tok.text === text;
  }

  private isOp(text: string): boolean {
    const tok = this.peek();
    return tok !== undefined && tok.kind === 'op' && tok.text === text;
  }

  private keyword(): string | null {
    const tok = this.peek();
    if (tok === undefined || tok.kind !== 'ident') return null;
    if (tok.text.startsWith('"')) return null;
    const upper = tok.text.toUpperCase();
    if (!SYNTAX.has(upper)) return null;
    return upper;
  }

  private isKeyword(word: string): boolean {
    return this.keyword() === word;
  }

  private eatKeyword(word: string): void {
    if (!this.isKeyword(word)) throw new Error(`expected ${word}`);
    this.eat();
  }

  private eatPunct(text: string): void {
    if (!this.isPunct(text)) throw new Error(`expected ${text}`);
    this.eat();
  }

  private parseExpr(minPrec: number): Node {
    let left = this.parseUnary();
    while (true) {
      const kw = this.keyword();
      if (kw === 'IS' && IS_PREC >= minPrec) {
        left = this.parseIs(left);
        continue;
      }
      if ((kw === 'IN' || (kw === 'NOT' && this.lookaheadKeyword(1) === 'IN')) && COMPARE >= minPrec) {
        left = this.parseIn(left);
        continue;
      }
      if ((kw === 'BETWEEN' || (kw === 'NOT' && this.lookaheadKeyword(1) === 'BETWEEN')) && COMPARE >= minPrec) {
        left = this.parseBetween(left);
        continue;
      }
      if ((kw === 'LIKE' || kw === 'ILIKE' || (kw === 'NOT' && (this.lookaheadKeyword(1) === 'LIKE' || this.lookaheadKeyword(1) === 'ILIKE'))) && COMPARE >= minPrec) {
        left = this.parseLike(left);
        continue;
      }
      if (kw === 'AND' && 2 >= minPrec) {
        this.eat();
        const right = this.parseExpr(3);
        left = {
          kind: 'binary',
          op: { text: 'AND', prec: 2, assoc: 'left', associative: true },
          left,
          right,
          prec: 2,
        };
        continue;
      }
      if (kw === 'OR' && 1 >= minPrec) {
        this.eat();
        const right = this.parseExpr(2);
        left = {
          kind: 'binary',
          op: { text: 'OR', prec: 1, assoc: 'left', associative: true },
          left,
          right,
          prec: 1,
        };
        continue;
      }
      const op = this.peekBinary();
      if (op === null || op.prec < minPrec) break;
      this.eat();
      const right = this.parseExpr(op.assoc === 'right' ? op.prec : op.prec + 1);
      left = { kind: 'binary', op, left, right, prec: op.prec };
    }
    return left;
  }

  private lookaheadKeyword(ahead: number): string | null {
    const tok = this.tokens[this.index + ahead];
    if (tok === undefined || tok.kind !== 'ident' || tok.text.startsWith('"')) return null;
    const upper = tok.text.toUpperCase();
    return SYNTAX.has(upper) ? upper : null;
  }

  private peekBinary(): BinOp | null {
    const tok = this.peek();
    if (tok === undefined) return null;
    if (tok.kind === 'op') return opInfo(tok.text);
    return null;
  }

  private parseUnary(): Node {
    if (this.isKeyword('NOT') && this.lookaheadKeyword(1) !== 'IN' && this.lookaheadKeyword(1) !== 'LIKE' && this.lookaheadKeyword(1) !== 'ILIKE' && this.lookaheadKeyword(1) !== 'BETWEEN') {
      this.eat();
      const expr = this.parseExpr(NOT_PREC + 1);
      return { kind: 'prefix', op: 'NOT', expr, prec: NOT_PREC };
    }
    if (this.isKeyword('EXISTS')) {
      this.eat();
      this.eatPunct('(');
      const body = this.captureSelect();
      this.eatPunct(')');
      return { kind: 'exists', body, prec: PRIMARY };
    }
    if (this.isOp('+') || this.isOp('-')) {
      const op = this.eat().text;
      const expr = this.parseExpr(UNARY + 1);
      return { kind: 'prefix', op, expr, prec: UNARY };
    }
    if (this.isKeyword('ANY') || this.isKeyword('ALL') || this.isKeyword('SOME')) {
      const kw = this.keyword() ?? '';
      this.eat();
      this.eatPunct('(');
      const body = this.keyword() === 'SELECT' ? this.captureSelectNode() : this.parseExpr(0);
      this.eatPunct(')');
      return { kind: 'any', expr: { kind: 'atom', text: '', prec: PRIMARY }, op: '', kw, body, prec: PRIMARY };
    }
    let node = this.parsePrimary();
    while (this.isOp('::')) {
      this.eat();
      const typeName = this.parseTypeName();
      node = { kind: 'binary', op: { text: '::', prec: CAST, assoc: 'left', associative: false }, left: node, right: { kind: 'atom', text: typeName, prec: PRIMARY }, prec: CAST };
    }
    return node;
  }

  private parsePrimary(): Node {
    if (this.isKeyword('ARRAY')) {
      this.eat();
      this.eatPunct('[');
      const items: Node[] = [];
      if (!this.isPunct(']')) {
        items.push(this.parseExpr(0));
        while (this.isPunct(',')) {
          this.eat();
          items.push(this.parseExpr(0));
        }
      }
      this.eatPunct(']');
      return { kind: 'array', items, prec: PRIMARY };
    }
    if (this.isPunct('(')) {
      this.eat();
      if (this.isKeyword('SELECT')) {
        const body = this.captureSelect();
        this.eatPunct(')');
        return { kind: 'select', text: body, prec: PRIMARY };
      }
      const expr = this.parseExpr(0);
      this.eatPunct(')');
      return expr;
    }
    if (this.isOp('*')) {
      const next = this.tokens[this.index + 1];
      const star = next === undefined || (next.kind === 'punct' && (next.text === ')' || next.text === ','));
      if (star) {
        this.eat();
        return { kind: 'atom', text: '*', prec: PRIMARY };
      }
    }
    if (this.isKeyword('NULL') || this.isKeyword('TRUE') || this.isKeyword('FALSE')) {
      const word = this.keyword() ?? '';
      this.eat();
      return { kind: 'atom', text: word, prec: PRIMARY };
    }
    const tok = this.peek();
    if (tok === undefined) throw new Error('expected primary');
    if (tok.kind === 'string' || tok.kind === 'number') {
      this.eat();
      return { kind: 'atom', text: tok.text, prec: PRIMARY };
    }
    if (tok.kind === 'ident') {
      const name = this.parseName();
      if (this.isPunct('(')) {
        this.eat();
        const args: Node[] = [];
        if (!this.isPunct(')')) {
          args.push(this.parseExpr(0));
          while (this.isPunct(',')) {
            this.eat();
            args.push(this.parseExpr(0));
          }
        }
        this.eatPunct(')');
        return { kind: 'call', name, args, prec: PRIMARY };
      }
      return { kind: 'atom', text: name, prec: PRIMARY };
    }
    throw new Error(`expected primary, got ${tok.text}`);
  }

  private parseName(): string {
    const first = this.eat();
    if (first.kind !== 'ident') throw new Error('expected name');
    let name = first.text;
    while (this.isPunct('.')) {
      this.eat();
      const next = this.eat();
      if (next.kind !== 'ident') throw new Error('expected name');
      name += `.${next.text}`;
    }
    return name;
  }

  private parseTypeName(): string {
    const name = this.parseName();
    if (this.isPunct('[')) {
      this.eat();
      this.eatPunct(']');
      return `${name}[]`;
    }
    return name;
  }

  private parseIs(expr: Node): Node {
    this.eatKeyword('IS');
    const parts: string[] = ['IS'];
    if (this.isKeyword('NOT')) {
      this.eat();
      parts.push('NOT');
    }
    if (this.isKeyword('DISTINCT')) {
      this.eat();
      parts.push('DISTINCT');
      this.eatKeyword('FROM');
      parts.push('FROM');
      const right = this.parseExpr(IS_PREC + 1);
      return {
        kind: 'binary',
        op: { text: parts.join(' '), prec: IS_PREC, assoc: 'left', associative: false },
        left: expr,
        right,
        prec: IS_PREC,
      };
    }
    if (this.isKeyword('NULL') || this.isKeyword('TRUE') || this.isKeyword('FALSE') || this.isKeyword('UNKNOWN')) {
      parts.push(this.keyword() ?? '');
      this.eat();
      return { kind: 'is', expr, text: parts.join(' '), prec: IS_PREC };
    }
    throw new Error('expected IS target');
  }

  private parseIn(expr: Node): Node {
    let not = false;
    if (this.isKeyword('NOT')) {
      this.eat();
      not = true;
    }
    this.eatKeyword('IN');
    this.eatPunct('(');
    let body = '';
    if (this.isKeyword('SELECT')) {
      body = this.captureSelect();
    } else {
      const items = [printNode(this.parseExpr(0), 0, 'left')];
      while (this.isPunct(',')) {
        this.eat();
        items.push(printNode(this.parseExpr(0), 0, 'left'));
      }
      body = items.join(', ');
    }
    this.eatPunct(')');
    return { kind: 'in', expr, not, body, prec: COMPARE };
  }

  private parseBetween(expr: Node): Node {
    let not = false;
    if (this.isKeyword('NOT')) {
      this.eat();
      not = true;
    }
    this.eatKeyword('BETWEEN');
    const low = this.parseExpr(COMPARE + 1);
    this.eatKeyword('AND');
    const high = this.parseExpr(COMPARE + 1);
    return { kind: 'between', expr, low, high, not, prec: COMPARE };
  }

  private parseLike(expr: Node): Node {
    let not = false;
    if (this.isKeyword('NOT')) {
      this.eat();
      not = true;
    }
    const op = this.keyword() ?? '';
    this.eat();
    const pattern = this.parseExpr(COMPARE + 1);
    return { kind: 'like', expr, op: not ? `NOT ${op}` : op, pattern, prec: COMPARE };
  }

  /** SELECT already consumed by the caller when used from parsePrimary. Here SELECT is still pending. */
  private captureSelectNode(): Node {
    return { kind: 'select', text: this.captureSelect(), prec: PRIMARY };
  }

  private captureSelect(): string {
    this.eatKeyword('SELECT');
    const items = [printNode(this.parseExpr(0), 0, 'left')];
    while (this.isPunct(',')) {
      this.eat();
      items.push(printNode(this.parseExpr(0), 0, 'left'));
    }
    let from = '';
    if (this.isKeyword('FROM')) {
      this.eat();
      from = ` FROM ${this.parseFrom()}`;
    }
    let where = '';
    if (this.isKeyword('WHERE')) {
      this.eat();
      where = ` WHERE ${printNode(this.parseExpr(0), 0, 'left')}`;
    }
    return `SELECT ${items.join(', ')}${from}${where}`;
  }

  private parseFrom(): string {
    return this.parseJoin();
  }

  private atFromStop(): boolean {
    return this.atEnd() || this.isPunct(')') || this.isKeyword('WHERE') || this.isKeyword('GROUP') || this.isKeyword('ORDER') || this.isKeyword('LIMIT') || this.isKeyword('UNION') || this.isKeyword('HAVING') || this.isKeyword('OFFSET') || this.isKeyword('EXCEPT') || this.isKeyword('INTERSECT');
  }

  private parseJoin(): string {
    let left = this.parseFromItem();
    while (!this.atFromStop() && this.isJoinStart()) {
      const kind = this.consumeJoin();
      const right = this.parseFromItem();
      let on = '';
      if (this.isKeyword('ON')) {
        this.eat();
        on = ` ON ${printNode(this.parseExpr(0), 0, 'left')}`;
      }
      left = `${left} ${kind} ${right}${on}`;
    }
    return left;
  }

  private isJoinStart(): boolean {
    const kw = this.keyword();
    return kw === 'JOIN' || kw === 'INNER' || kw === 'LEFT' || kw === 'RIGHT' || kw === 'FULL' || kw === 'CROSS';
  }

  private consumeJoin(): string {
    const parts: string[] = [];
    while (this.isJoinStart() || this.isKeyword('OUTER')) {
      parts.push(this.keyword() ?? '');
      this.eat();
      if (parts[parts.length - 1] === 'JOIN') break;
    }
    if (parts[parts.length - 1] !== 'JOIN') throw new Error('expected JOIN');
    return parts.join(' ');
  }

  private parseFromItem(): string {
    if (this.isPunct('(')) {
      this.eat();
      if (this.isKeyword('SELECT')) {
        const body = this.captureSelect();
        this.eatPunct(')');
        const alias = this.optionalAlias();
        return alias === '' ? `(${body})` : `(${body}) ${alias}`;
      }
      const inner = this.parseJoin();
      this.eatPunct(')');
      return inner;
    }
    const name = this.parseName();
    const alias = this.optionalAlias();
    return alias === '' ? name : `${name} ${alias}`;
  }

  private optionalAlias(): string {
    if (this.isKeyword('AS')) {
      this.eat();
      const tok = this.eat();
      if (tok.kind !== 'ident') throw new Error('expected alias');
      return tok.text;
    }
    const tok = this.peek();
    if (tok === undefined || tok.kind !== 'ident' || tok.text.startsWith('"')) return '';
    if (SYNTAX.has(tok.text.toUpperCase())) return '';
    this.eat();
    return tok.text;
  }
}

function opInfo(text: string): BinOp | null {
  const table: Record<string, BinOp> = {
    '^': { text: '^', prec: 9, assoc: 'right', associative: false },
    '*': { text: '*', prec: 8, assoc: 'left', associative: true },
    '/': { text: '/', prec: 8, assoc: 'left', associative: false },
    '%': { text: '%', prec: 8, assoc: 'left', associative: false },
    '+': { text: '+', prec: 7, assoc: 'left', associative: true },
    '-': { text: '-', prec: 7, assoc: 'left', associative: false },
    '||': { text: '||', prec: 6, assoc: 'left', associative: true },
    '->': { text: '->', prec: 6, assoc: 'left', associative: false },
    '->>': { text: '->>', prec: 6, assoc: 'left', associative: false },
    '=': { text: '=', prec: COMPARE, assoc: 'left', associative: false },
    '<>': { text: '<>', prec: COMPARE, assoc: 'left', associative: false },
    '!=': { text: '!=', prec: COMPARE, assoc: 'left', associative: false },
    '<': { text: '<', prec: COMPARE, assoc: 'left', associative: false },
    '>': { text: '>', prec: COMPARE, assoc: 'left', associative: false },
    '<=': { text: '<=', prec: COMPARE, assoc: 'left', associative: false },
    '>=': { text: '>=', prec: COMPARE, assoc: 'left', associative: false },
  };
  return table[text] ?? null;
}

function precOf(node: Node): number {
  return node.prec;
}

function needsParen(child: Node, parentPrec: number, side: 'left' | 'right', parent: BinOp | null): boolean {
  const childPrec = precOf(child);
  if (childPrec > parentPrec) return false;
  if (childPrec < parentPrec) return true;
  if (parent !== null && parent.associative) return false;
  if (parent !== null && parent.assoc === 'left' && side === 'right') return true;
  if (parent !== null && parent.assoc === 'right' && side === 'left') return true;
  return false;
}

function wrap(text: string, child: Node, parentPrec: number, side: 'left' | 'right', parent: BinOp | null): string {
  if (!needsParen(child, parentPrec, side, parent)) return text;
  return `(${text})`;
}

function printNode(node: Node, parentPrec: number, side: 'left' | 'right', parent: BinOp | null = null): string {
  const text = printBare(node);
  return wrap(text, node, parentPrec, side, parent);
}

function printBare(node: Node): string {
  switch (node.kind) {
    case 'atom':
      return node.text;
    case 'call':
      return `${node.name}(${node.args.map((arg) => printNode(arg, 0, 'left')).join(', ')})`;
    case 'prefix': {
      const inner = printNode(node.expr, node.prec, 'right');
      return `${node.op} ${inner}`;
    }
    case 'binary': {
      const left = printNode(node.left, node.prec, 'left', node.op);
      const right = printNode(node.right, node.prec, 'right', node.op);
      if (node.op.text === '::') return `${left}::${right}`;
      return `${left} ${node.op.text} ${right}`;
    }
    case 'is':
      return `${printNode(node.expr, node.prec, 'left')} ${node.text}`;
    case 'in':
      return `${printNode(node.expr, node.prec, 'left')} ${node.not ? 'NOT ' : ''}IN (${node.body})`;
    case 'between':
      return `${printNode(node.expr, node.prec, 'left')} ${node.not ? 'NOT ' : ''}BETWEEN ${printNode(node.low, COMPARE + 1, 'left')} AND ${printNode(node.high, COMPARE + 1, 'left')}`;
    case 'like':
      return `${printNode(node.expr, node.prec, 'left')} ${node.op} ${printNode(node.pattern, COMPARE + 1, 'right')}`;
    case 'any':
      if (node.op === '' && node.expr.kind === 'atom' && node.expr.text === '') {
        return `${node.kw} (${printNode(node.body, 0, 'left')})`;
      }
      return `${node.kw} (${printNode(node.body, 0, 'left')})`;
    case 'exists':
      return `EXISTS (${node.body})`;
    case 'array':
      return `ARRAY[${node.items.map((item) => printNode(item, 0, 'left')).join(', ')}]`;
    case 'select':
      return `(${node.text})`;
    default: {
      const unreachable: never = node;
      return unreachable;
    }
  }
}

export function normalizeSqlParens(input: string): string {
  const parser = new Parser(tokenize(input));
  return printNode(parser.parseTop(), 0, 'left');
}
