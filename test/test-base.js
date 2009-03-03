seta = function() { 
	a = {
		a: {o:{o:1,p:2,q:{a:1,b:2,c:{a:1,b:2,c:3,d:4,e:{a:1,b:2}}}}},
		b: "abcdefg",
		c: [1,2,3,"abc",{o:{o:1,p:2,q:{a:1,b:2,c:{a:1,b:2,c:3,d:4,e:{a:1,b:2}}}}}],
		c: {o:{o:1,p:2,q:{a:1,b:2,c:{a:1,b:2,c:3,d:4,e:{a:1,b:2}}}}},
		d: {o:{o:{o:{o:{o:{o:{o:{o:{o:{o:{o:{o:{o:"one million"}}}}}}}}}}}}},
		e: {o:{o:1,p:2,q:{a:1,b:2,c:{a:1,b:2,c:3,d:4,e:{a:1,b:2}}}}},
		f: {o:{o:1,p:2,q:{a:1,b:2,c:{a:1,b:2,c:3,d:4,e:{a:1,b:2}}}}},
		g: {o:{o:1,p:2,q:{a:1,b:2,c:{a:1,b:2,c:3,d:4,e:{a:1,b:2}}}}},
		h: {o:{o:1,p:2,q:{a:1,b:2,c:{a:1,b:2,c:3,d:4,e:{a:1,b:2}}}}},
		i: {o:{o:1,p:2,q:{a:1,b:2,c:{a:1,b:2,c:3,d:4,e:{a:1,b:2}}}}},
		j: {o:{o:1,p:2,q:{a:1,b:2,c:{a:1,b:2,c:3,d:4,e:{a:1,b:2}}}}},
		k: {o:{o:1,p:2,q:{a:1,b:2,c:{a:1,b:2,c:3,d:4,e:{a:1,b:2}}}}},
		l: {o:{o:1,p:2,q:{a:1,b:2,c:{a:1,b:2,c:3,d:4,e:{a:1,b:2}}}}}
	};
}; 
seta();
//a = 1;
setb = function() {b = null;}
setb();
tests = {recursive: [], iterative: []};

var numtests = 5;

for (i=0;i<numtests;i++) {
	start = new Date().getTime();
	b = JSORM.clone(a,true);
	stop = new Date().getTime();
	
	tests.recursive[i] = {start: start, stop: stop, time: stop - start};

	setb();

	start = new Date().getTime();
	b = JSORM.iclone(a,true);
	stop = new Date().getTime();

	tests.iterative[i] = {start: start, stop: stop, time: stop - start};
}

// show results in table
var showResults = function() {
	var div, tbl, row, cell;
	div = document.getElementById("results");
	tbl = document.createElement("table");
	// header
	row = tbl.insertRow(0);
	cell = row.insertCell(0);
	cell.innerHTML = "Test";
	cell = row.insertCell(1);
	cell.innerHTML = "Recursive";
	cell = row.insertCell(2);
	cell.innerHTML = "Iterative";
	
	// now the tests
	for (i=0; i<numtests; i++) {
		row = tbl.insertRow(i+1);
		cell = row.insertCell(0);
		cell.innerHTML = i+1;
		cell = row.insertCell(1);
		cell.innerHTML = tests.recursive[i].time;
		cell = row.insertCell(2);
		cell.innerHTML = tests.iterative[i].time;
	}
	div.appendChild(tbl);
}


