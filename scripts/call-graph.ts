import { Project, CallExpression, FunctionDeclaration, SyntaxKind, FunctionExpression, ArrowFunction, MethodDeclaration, Node } from "ts-morph";

type Callable =
  | FunctionDeclaration
  | FunctionExpression
  | ArrowFunction
  | MethodDeclaration;

// will also add source files
const project = new Project({
  tsConfigFilePath: "./tsconfig.json",
});

function isUserDefined(call: CallExpression): boolean {
	// get the source file of the definition
	const symbol = call.getExpression().getSymbol();

	if (!symbol) return false;
	const declarations = symbol.getDeclarations();

	for (const decl of declarations) {
		const sourceFile = decl.getSourceFile();
		if (sourceFile.getFilePath().includes("node_modules")) return false;
	}
	return true;
}

export function getCallableId(fn: Callable): string {
  // 1. METHOD: ClassName.methodName
  if (Node.isMethodDeclaration(fn)) {
    const classDecl = fn.getFirstAncestorByKind(
      fn.getKindName() === "MethodDeclaration"
        ? fn.getParent()?.getKind() // just for safety
        : undefined as any
    );

    const className =
      fn.getFirstAncestorByKindOrThrow?.(SyntaxKind.ClassDeclaration)
        ?.getName?.() ?? "<anonymousClass>";

    return `${className}.${fn.getName()}`;
  }

  // 2. FUNCTION DECLARATION: exported or file-scoped
  if (Node.isFunctionDeclaration(fn)) {
    const name = fn.getName() ?? "<anonymous>";
    const sourceFile = fn.getSourceFile().getBaseName();
    return `${sourceFile}:${name}`;
  }

  // 3. FUNCTION EXPRESSION / ARROW FUNCTION
  const parent = fn.getParent();

  // variable: const x = () => {}
  if (Node.isVariableDeclaration(parent)) {
    return parent.getName();
  }

  // property: obj.x = () => {}
  if (Node.isPropertyAssignment(parent)) {
    return parent.getName();
  }

  // fallback
  const sourceFile = fn.getSourceFile().getBaseName();
  return `${sourceFile}:<anonymous>`;
}

function getCalledFunction(
  call: CallExpression
): Callable | undefined {
	const symbol = call.getExpression().getSymbol()

	const realSymbol = symbol?.getAliasedSymbol() ?? symbol;

	if (!realSymbol) return undefined;

	return realSymbol
	.getDeclarations()
	.find(d =>
	  d.getKind() ===
		SyntaxKind.FunctionDeclaration ||
	  d.getKind() ===
		SyntaxKind.ArrowFunction ||
	  d.getKind() ===
		SyntaxKind.FunctionExpression ||
	  d.getKind() ===
		SyntaxKind.MethodDeclaration
	) as Callable | undefined;

		/*
	if (symbol?.getDeclarations().every(node => node.getKind() === SyntaxKind.ImportSpecifier)) {
		symbol = symbol.getAliasedSymbol();
	}
	if (!symbol) {
		return;
	};

	// doesn't work because the symbol is an import 
	const declaration = symbol
		.getDeclarations()
		.find(d => d.getKind() === SyntaxKind.FunctionDeclaration);

	return declaration as FunctionDeclaration | undefined;
		*/
}

function logChildren(
  fn: Callable,
  level: number,
  visited = new Set<string>()
) {
	const name = getCallableId(fn);

	console.log(`${"  ".repeat(level)}|-${getCallableId(fn)}`);

	// prevent circular recursion
	if (visited.has(name)) return;
	visited.add(name);

	const calls = fn.getDescendantsOfKind(SyntaxKind.CallExpression).filter(isUserDefined);

	for (const call of calls) {
		const calledFn = getCalledFunction(call);

		if (calledFn !== undefined)
		logChildren(calledFn, level + 1, visited);
	}
}

// generate the tree (hopefully no circular dependencies)
const entryPointFile = project.getSourceFile("src/worker.ts")
if (entryPointFile !== undefined) 
for (const func of entryPointFile.getFunctions()) {
	logChildren(func, 0)
}

