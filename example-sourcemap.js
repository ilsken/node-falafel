var falafel = require('./index')

var src = (function foo(){
	var bar = 'baz';
	return bar;
}).toString()

var output = falafel(src, {
	debug: true,
	sourceName: 'foo.js'
}, function(node){
	if(node.type == 'Identifier' && node.name == 'bar'){
		node.update('bazzle')
	}
})

console.log(output)