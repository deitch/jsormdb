/*global desc task */
/*jslint node:true, nomen:false */
/*
 * build file for jsormdb project
 * Created by Avi Deitcher < avi@jsorm.com >
 */

var src = "./src", lib = "./lib", sample = "./sample", test = "./test", license = "./license.js",
  jsormBase = "../jsormutil/dist/jsorm-1.3-min-nolicense.js", basename = "jsormdb", testHtml = "test/test.html",
  concat, cp, replace, nodify,
  fs = require('fs'), rimraf = require('rimraf'), jsmin = require('jsmin').jsmin, _ = require('underscore'), path = require('path'),
  PRE = '(function(exports){',
  POST = '}(typeof module === "undefined" || typeof module.exports === "undefined" ? (this.@@GLOBAL@@ === undefined ? this.@@GLOBAL@@ = {} : this.@@GLOBAL@@) : module.exports));',
  FILE_ENCODING = 'utf-8',
  VERSION = "1.3b";
  
  /*** SOME DAY NEED TO ADD PROPER DOCS WITH dox docco groc OR SIMILAR ***/

concat = function(fileList, distPath) {
  var out;
  fileList = [].concat(fileList);
  out = fileList.map(function(filePath){
    return fs.readFileSync(filePath, FILE_ENCODING);
  });
  fs.writeFileSync(distPath, out.join('\n'), FILE_ENCODING);
};

cp = function(from,to) {
  fs.writeFileSync(to,fs.readFileSync(from,FILE_ENCODING),FILE_ENCODING);
};

nodify = function(filePath,globalVar) {
  var pre,post,text;
  post = POST.replace(/@@GLOBAL@@/g,globalVar);
  pre = PRE.replace(/@@GLOBAL@@/g,globalVar);
  text = fs.readFileSync(filePath,FILE_ENCODING);
  fs.writeFileSync(filePath,[pre,text,post].join("\n"),FILE_ENCODING);
  
};

replace = function(fileList,pattern,replace) {
  fileList = [].concat(fileList);
  _.each(fileList,function(filePath){
    var text = fs.readFileSync(filePath,FILE_ENCODING).replace(pattern,replace);
    fs.writeFileSync(filePath,text,FILE_ENCODING);
  });
};


desc('Clean everything out and rebuild');
task('cleanbuild',['clean','build']);

desc('Build the concatenated source file, minified source, and node-ready lib');
task('build',['init'],function(){
  var srcCode, licenseCode, srcFiles, baseFile = lib+"/"+basename+"-src.js", minFile = lib+"/"+basename+".js";

  srcFiles = _.without(fs.readdirSync(src),"XmlParser.js").map(function(file){
    return(src+"/"+file);
  });
  
  concat([
      license
    ].concat(srcFiles),baseFile);
  nodify(baseFile,"JSORM");
	
	srcCode = fs.readFileSync(baseFile).toString();
	licenseCode = fs.readFileSync(license).toString();
	fs.writeFileSync(minFile,licenseCode+"\n"+jsmin(srcCode));
	replace([
	  baseFile,
	  minFile
	  ],/@@version@@/g,VERSION);
	
	cp(minFile,sample+"/"+basename+".js");
	cp(baseFile,sample+"/"+basename+"-src.js");
	
});


desc('set things up for the build');
task('init',[],function(){
  if (!fs.existsSync(lib)) {
    fs.mkdirSync(lib);
  }
});
	
desc('clean out old builds');
task('clean',[],function(){
  rimraf.sync(lib);
  rimraf.sync(sample+"/"+basename+".js");
  rimraf.sync(sample+"/"+basename+"-src.js");
});

