import regenerator from "regenerator";
import * as t from "../../../types";

// It's important to use the exact same NodePath constructor that
// Regenerator uses, rather than require("ast-types").NodePath, because
// the version of ast-types that Babel knows about might be different from
// the version that Regenerator depends on. See for example #1958.
const NodePath = regenerator.types.NodePath;

export var metadata = {
  group: "builtin-advanced"
};

export var visitor = {
  Function: {
    exit(node) {
      if (node.async || node.generator) {
        // Although this code transforms only the subtree rooted at the given
        // Function node, that node might contain other generator functions
        // that will also be transformed. It might help performance to ignore
        // nested functions, and rely on the traversal to visit them later,
        // but that's a small optimization. Starting here instead of at the
        // root of the AST is the key optimization, since huge async/generator
        // functions are relatively rare.
        regenerator.transform(convertNodePath(this));
      }
    }
  }
};

// Given a Babel NodePath, return an ast-types NodePath that includes full
// ancestry information (up to and including the Program node). This is
// complicated by having to include intermediate objects like blockStatement.body
// arrays, in addition to Node objects.
function convertNodePath(path) {
  var programNode;
  var keysAlongPath = [];

  while (path) {
    var pp = path.parentPath;
    var parentNode = pp && pp.node;
    if (parentNode) {
      keysAlongPath.push(path.key);

      if (parentNode !== path.container) {
        var found = Object.keys(parentNode).some(listKey => {
          if (parentNode[listKey] === path.container) {
            keysAlongPath.push(listKey);
            return true;
          }
        });

        if (!found) {
          throw new Error("Failed to find container object in parent node");
        }
      }

      if (t.isProgram(parentNode)) {
        programNode = parentNode;
        break;
      }
    }

    path = pp;
  }

  if (!programNode) {
    throw new Error("Failed to find root Program node");
  }

  var nodePath = new NodePath(programNode);

  while (keysAlongPath.length > 0) {
    nodePath = nodePath.get(keysAlongPath.pop());
  }

  return nodePath;
}
