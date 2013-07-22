/* jshint node: true, asi: true, laxcomma: true, strict: false */
var SourceNode = require('source-map').SourceNode;
var TransformStream = require('stream').Transform;
exports = module.exports = CodeGenerator;
var lineBreak = /\r\n|[\n\r\u2028\u2029]/g

function CodeGenerator(options){
	if(typeof options == 'string'){
		options = {source: options};
	}
	if(!options.source) throw new Error('source is required');
	Object.keys(options).forEach(function(key){
		this[key] = options[key]
	}, this)
	this.lines = this.source.split(lineBreak).map(function(line){
		return line.split('')
	})
	this.sourceName = options.sourceName || ('javascript:' + encodeURIComponent(options.source));
	options.decodeStrings = false;
	TransformStream.call(this, options);
	this._readableState.objectMode = false;
  this._writableState.objectMode = true;
}

CodeGenerator.prototype = Object.create(TransformStream.prototype);

CodeGenerator.prototype.getSourceFor = function(node){
	var start  = node.loc.start
	  , end    = node.loc.end
	  , lines  = this.lines.slice(start.line-1, end.line)
	  , chunks = []

	//console.log('getting source at ', start, end)
	//console.log('lines are ', lines)

	eachLine(lines, start, end, appendTo(chunks))
	return chunks.join('')
}

CodeGenerator.prototype._transform = function(chunk, replace, callback){
	var start  = chunk.loc.start
	  , end    = chunk.loc.end
	  , sourceName = this.sourceName
	  , source = chunk.source !== undefined ? chunk.source : this.getSourceFor(chunk);
	
	var lines = this.lines.slice(start.line-1, end.line)
	lines.forEach(function(line, i){
		if(!line) return;
		var firstLine = i === 0;
		var x = firstLine ? start.column : 0
		var y = i == lines.length-1 ? end.column : line.length;

		for(var col = x; col < y; col++){
			if (firstLine && col === x) {
				line[col] = new SourceNode(start.line, start.column, sourceName, source, chunk.name)
			} else{
				delete line[col];
			}
		}
	})

	return callback()
};

CodeGenerator.prototype._flush = function (callback) {
	var debug = this.debug
	  , sourceName = this.sourceName
	  , rootNode =  new SourceNode(1, 0, sourceName, this.lines.map(function(line){
			if(line) {
				return line.concat(['\n'])
			}
			else return '\n';
		}));

	if(debug) {
		rootNode.setSourceContent(sourceName, this.source)
	}
	
	var result = rootNode.toStringWithSourceMap({
		file: this.generatedName || this.sourceName,
		sourceRoot: this.sourceRoot
	});

	this.push(result.code);
	if(debug) {
		this.push(['\n//@ sourceMappingURL=data:application/json;base64,',
		           base64(result.map.toString())
		          ].join(''))
	}

	callback()
}

function eachLine(lines, start, end, callback){
	lines.forEach(function(line, i){
		if(!line) return;
		var x = i === 0 ? start.column : 0
		var y = i === lines.length-1 ? end.column : undefined;
		if(x !== 0 || y !== undefined){
				line = line.slice(x, y)
		}
		callback(line, i)
	})
}

function appendTo(chunks){
	return function(line){
		line.forEach(function(sourceNode){
			if(sourceNode) chunks.push(sourceNode.toString())
		})
		chunks.push('\n')
	}
}
function base64(str){
	return (typeof btoa === 'function') ? btoa(str) : new Buffer(str).toString('base64')
}