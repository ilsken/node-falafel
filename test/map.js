var falafel = require('../');
var test = require('tape');

test('source maps', function(t){
    t.plan(1)
    var src = 'foo()';
    var output = falafel(src,{debug: true}, function(node){
        if(node.type == 'CallExpression'){
            node.update('trace(' + node.source() + ')')
        }
    })
    t.notEqual(output.toString().indexOf('//@ sourceURL='), -1)
})
