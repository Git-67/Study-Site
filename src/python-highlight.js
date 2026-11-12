// Lightweight lexical highlighting; the real textarea remains the editable control.
window.highlightPython = function (source) {
  const escape = text => text.replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
  const keywords = new Set("False None True and as assert async await break case class continue def del elif else except finally for from global if import in is lambda match nonlocal not or pass raise return try while with yield".split(" "));
  const builtins = new Set("abs all any bool bytes callable chr dict dir divmod enumerate eval filter float format frozenset getattr hasattr hash help hex input int isinstance issubclass iter len list map max min next object oct open ord pow print range repr reversed round set setattr slice sorted str sum super tuple type vars zip __name__ self".split(" "));
  const tokens = /#[^\r\n]*|(?:[rRuUbBfF]{0,2})(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\[^\r\n]|[^"\\\r\n])*(?:"|(?=\r?\n)|$)|'(?:\\[^\r\n]|[^'\\\r\n])*(?:'|(?=\r?\n)|$))|\b(?:0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|\d[\d_]*(?:\.[\d_]*)?(?:[eE][+-]?[\d_]+)?[jJ]?)\b|[\p{ID_Start}_][\p{ID_Continue}]*|(?:\*\*|\/\/|:=|==|!=|<=|>=|->|[+\-*\/%=<>!&|^~:@])/gu;
  let html = "", previous = 0, definition = false;
  for (const match of source.matchAll(tokens)) {
    const token = match[0];
    html += escape(source.slice(previous, match.index));
    let kind = "";
    if (token.startsWith("#")) kind = "comment";
    else if (/^[rRuUbBfF]{0,2}['"]/.test(token)) kind = "string";
    else if (/^\d/.test(token)) kind = "number";
    else if (keywords.has(token)) kind = "keyword";
    else if (definition) kind = "function";
    else if (builtins.has(token)) kind = "builtin";
    else if (/^[+\-*\/%=<>!&|^~:@]/.test(token)) kind = "operator";
    html += kind ? `<span class="py-${kind}">${escape(token)}</span>` : escape(token);
    definition = token === "def" || token === "class";
    previous = match.index + token.length;
  }
  return html + escape(source.slice(previous)) + "\n";
};
