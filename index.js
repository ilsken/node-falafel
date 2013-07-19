var parse = require('esprima').parse;
var SourceNode = require('source-map').SourceNode;

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

var base64 = (typeof btoa === 'function') ? btoa : function(str){
    return new Buffer(str).toString('base64')
}
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
    opts.range = true;
    // required for source maps
    if(opts.debug)
        opts.loc = true;
    if (typeof src !== 'string') src = String(src);
    
    var ast = parse(src, opts);
    
    var result = {
        chunks : src.split(''),
        toString : function () { return result.chunks.join('') },
        inspect : function () { return result.toString() }
    };
    var index = 0;
    var sourceMap = opts.debug ? new SourceNode() : undefined;
    var name = opts.sourceName || 'source.js';
    if(opts.debug)
        sourceMap.setSourceContent('source.js', src);
    
    (function walk (node, parent) {
        insertHelpers(node, parent, result.chunks, sourceMap);
        
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
                insertHelpers(child, node, result.chunks, sourceMap);
                walk(child, node);
            }
        });
        fn(node);
    })(ast, undefined);
    if(opts.debug){
        sourceMap = sourceMap.toStringWithSourceMap({
            file: opts.fileName || 'generated.js'
        })
        result.map = sourceMap.map;
        result.chunks.push('\n//@ sourceURL=data:application/json;base64,' + base64(sourceMap.toString()));
    }
    
    
    return result;
};
 
function insertHelpers (node, parent, chunks, sourceMap) {
    if (!node.range) return;
    
    node.parent = parent;
    
    node.source = function () {
        return chunks.slice(
            node.range[0], node.range[1]
        ).join('');
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
        chunks[node.range[0]] = s;
        if(sourceMap) {
            var location = node.loc.start;
            sourceMap.add(new SourceNode(location.line, location.column, 'source.js', s));
        }
        for (var i = node.range[0] + 1; i < node.range[1]; i++) {
            chunks[i] = '';
        }
    };
}
