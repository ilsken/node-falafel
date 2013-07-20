var parse = require('esprima').parse;
var CodeGenerator = require('./codegen');

var objectKeys = Object.keys || function (obj) {
    var keys = [];
    for (var key in obj) keys.push(key);
    return keys;
};
var forEach = function (xs, fn) {
    if (xs.forEach) return xs.forEach(fn);
    for (var i = 0; i < xs.length; i++) {
        fn.call(xs, xs[i], i, xs);
    }
};

var isArray = Array.isArray || function (xs) {
    return Object.prototype.toString.call(xs) === '[object Array]';
};


module.exports = function (src, opts, fn) {
    if (typeof opts === 'function') {
        fn = opts;
        opts = {};
    }
    if (typeof src === 'object') {
        opts = src;
        src = opts.source;
        delete opts.source;
    }
    src = src === undefined ? opts.source : src;
    //opts.range = true;
    // required for source maps
    // new code generator uses line/col instead of range
    opts.loc = true;
    if (typeof src !== 'string') src = String(src);
    
    var ast = parse(src, opts);

    
    var code = new CodeGenerator({
        debug: opts.debug,
        source: src,
        sourceName: opts.sourceName,
        generatedName: opts.generatedName,
        sourceRoot: opts.sourceRoot
    });
    
    (function walk (node, parent) {
        insertHelpers(node, parent, code);
        
        forEach(objectKeys(node), function (key) {
            if (key === 'parent') return;
            
            var child = node[key];
            if (isArray(child)) {
                forEach(child, function (c) {
                    if (c && typeof c.type === 'string') {
                        walk(c, node);
                    }
                });
            }
            else if (child && typeof child.type === 'string') {
                insertHelpers(child, node, code);
                walk(child, node);
            }
        });
        fn(node);
    })(ast, undefined);
    
    code.end();
    // code generator is all sync anyway
    return code.read().toString();
};
 
function insertHelpers (node, parent, code) {
    if(!node.loc) return;
    node.parent = parent;
    
    node.source = function () {
        return code.getSourceFor(node);
    };
    
    if (node.update && typeof node.update === 'object') {
        var prev = node.update;
        forEach(objectKeys(prev), function (key) {
            update[key] = prev[key];
        });
        node.update = update;
    }
    else {
        node.update = update;
    }
    
    function update (s) {
       code.write({
            source: s,
            loc: node.loc,
            name: node.name
       });
    };
}
