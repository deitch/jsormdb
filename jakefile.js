/*global desc task */
/*jslint node:true, nomen:false */
/*
 * build file for jsormdb project
 * Created by Avi Deitcher < avi@jsorm.com >
 */

var src = "./src", build = "./build", sample = "./sample", license = "./license.js",
  jsormBase = "../jsormutil/dist/jsorm-1.3-min-nolicense.js", basename = "jsormdb", testHtml = "test/test.html",
  concat, cp, replace,
  fs = require('fs'), rimraf = require('rimraf'), jsmin = require('jsmin').jsmin, _ = require('underscore'), path = require('path'),
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

replace = function(fileList,pattern,replace) {
  fileList = [].concat(fileList);
  _.each(fileList,function(filePath){
    var text = fs.readFileSync(filePath,FILE_ENCODING).replace(pattern,replace);
    fs.writeFileSync(filePath,text,FILE_ENCODING);
  });
};


desc('Clean everything out and rebuild');
task('cleanbuild',['clean','build']);

desc('Build the concatenated source file and minified source');
task('build',['init'],function(){
  var srcCode, licenseCode, srcFiles;

  srcFiles = _.without(fs.readdirSync(src),"XmlParser.js").map(function(file){
    return(src+"/"+file);
  });
  
  concat([
      license,
      jsormBase
    ].concat(srcFiles),build+"/"+basename+"-src.js");
	
	srcCode = fs.readFileSync(build+"/"+basename+"-src.js").toString();
	licenseCode = fs.readFileSync(license).toString();
	fs.writeFileSync(build+"/"+basename+".js",licenseCode+"\n"+jsmin(srcCode));
	replace([
	  build+"/"+basename+"-src.js",
	  build+"/"+basename+".js"
	  ],"@@version@@",VERSION);
	
	cp(build+"/"+basename+".js",sample+"/"+basename+".js");
	cp(build+"/"+basename+"-src.js",sample+"/"+basename+"-src.js");
});


desc('set things up for the build');
task('init',[],function(){
  if (!path.existsSync(build)) {
    fs.mkdirSync(build);
  }
});
	
desc('clean out old builds');
task('clean',[],function(){
  rimraf.sync(build);
  rimraf.sync(sample+"/"+basename+".js");
  rimraf.sync(sample+"/"+basename+"-src.js");
});

