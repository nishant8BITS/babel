import * as t from "../../../types";

export var metadata = {
  group: "builtin-trailing"
};

function remap(path, key, create) {
  // ensure that we're shadowed
  var shadowPath = path.inShadow();
  if (!shadowPath || shadowPath.isArrowFunctionExpression()) return;

  var shadowFunction = path.node._shadowedFunctionLiteral;
  var currentFunction;

  var fnPath = path.findParent(function (path) {
    if (path.isProgram() || path.isFunction()) {
      // catch current function in case this is the shadowed one and we can ignore it
      currentFunction = currentFunction || path;
    }

    if (path.isProgram()) {
      return true;
    } else if (path.isFunction()) {
      if (shadowFunction) {
        return path === shadowFunction || path.node === shadowFunction.node;
      } else {
        return !path.is("shadow");
      }
    }

    return false;
  });

  // no point in realiasing if we're in this function
  if (fnPath === currentFunction) return;

  var cached = fnPath.getData(key);
  if (cached) return cached;

  var init = create();
  var id   = path.scope.generateUidIdentifier(key);

  fnPath.setData(key, id);
  fnPath.scope.push({ id, init });

  return id;
}

export var visitor = {
  ThisExpression() {
    return remap(this, "this", () => t.thisExpression());
  },

  ReferencedIdentifier(node) {
    if (node.name === "arguments") {
      return remap(this, "arguments", () => t.identifier("arguments"));
    }
  }
};
