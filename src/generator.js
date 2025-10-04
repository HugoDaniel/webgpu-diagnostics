export function generate(
  n,
  statements,
  expressionDepthPerStatement,
) {
  const accum = ["var accum: f32 = 0.0;"];
  if (n === 0) {
    return ({
      functions: "",
      application: accum[0],
    });
  }

  const functions = [];

  const fStatements = generateStatements(
    statements,
    expressionDepthPerStatement,
  );
  for (let i = 0; i < n; i++) {
    functions.push(`
fn function${i}(a: f32) -> f32 {
  var tmp: f32 = 0.0;
  ${fStatements}
  return a + tmp;
}`);
  }

  for (let i = 0; i < n; i++) {
    accum.push(`accum += function${i}(${n}.0);`);
  }

  return {
    functions: functions.join("\n"),
    application: accum.join("\n"),
  };
}

function generateStatements(n, expressionDepthPerStatement) {
  const statements = [];
  const expression = generateExpression(expressionDepthPerStatement, "+");
  for (let i = 0; i < n; i++) {
    statements.push(
      `tmp += ${expression};`,
    );
  }

  return statements.join("\n");
}

function generateExpression(n, sign) {
  const expression = ["0.0"];
  for (let i = 1; i < n; i++) {
    expression.push(`${i}.0`);
  }

  return expression.join(sign);
}
