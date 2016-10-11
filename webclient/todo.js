
var pins = [];

var pinListItems = [];

var result = [];

var filters = []

var suggestions = [];

var searchObject;

var leftObject;

var rightObject;

var init = true;

var searchTerm = "";

var searchInput = $("#search-input");

var autocompleteList = $('#autocomplete');

setInterval(function() { 
	var input = searchInput.val();
	
	if(searchTerm != input) {
		searchTerm = input;
		
		var w = searchTerm.length * 12 + 30;
		if(w > 200) {
			$("#search-input").animate({ width: w }, 50);
		}
		
		autoComplete(searchTerm, autocompleteList);		
	}
	
}, 50);




function autoComplete(input, list) {
	

	var query = "http://localhost:8984/solr/factor_tool/select?indent=on&wt=json&q=" + encodeURIComponent(input);
	
	$.ajax({
		dataType: 'jsonp',
		jsonp: 'json.wrf',
		url: query,
		success: function(data) {    
		
			list.empty();
			suggestions = [];
			
			for(var i = 0; i < Math.min(10, data.response.docs.length); i++) {
				
				var suggestion = data.response.docs[i];
				suggestions.push(suggestion);				
				
			}
			
			printAutoComplete();
				
				
		},
		error: function(data) {
			
		}		
	});
}

$("#pin-input").keydown(function (e) {

	if (e.which == 9) {
	   e.preventDefault(); 
	   suggestions.shift();
	   printAutoComplete();
	}
});

$("#search-input").keydown(function (e) {

	if (e.which == 9) {
	   e.preventDefault(); 
	   
	   
	   suggestions.shift();
	   printAutoComplete();
	}
});


$("#search-bar").click(function() {
	if($("#search-input").hasClass("hidden")) {
		$("#search-input").toggleClass("hidden");
		$("#search-icon").toggleClass("hidden");
		
		$("#search-form").animate({ width: 100 + '%' }, 300, function() {
			$("#search-input").animate({ width: 200 }, 300, function() {
				$("#search-input").focus();
			});
			
		});
		
		
	}
	
	
});


$("#pin-form").submit(function( event ) {
	
	event.preventDefault();
	
	
	if(suggestions.length > 0) {
		
		$("#pin-form").toggleClass("active");
		$("#search-form").toggleClass("active");
		$("#search-bar").toggleClass("active");
		$("#pin-bar").toggleClass("active");
		$("#pin-title").toggleClass("hide");
		$("#pin-marker").toggleClass("active");
		
	
		$("#pin-title").html(suggestions[0].name);
		var pin = { text: suggestions[0].name, uri: suggestions[0].uri, isClass: true };

		searchObject = pin;	
		pushPin(pin);
		
		
		$("#search-bar").one('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend',   
			function(e) {
			if(init) {
				$("#background").toggleClass("active");
				
				searchInput = $("#search-input");
				autocompleteList = $("#autocomplete");
				
				$("#search-input").focus();
				search();
				init = false;
			}
		
		});  
	}
});

$("#search-form").submit(function( event ) {
	
	event.preventDefault();

	if(suggestions.length > 0) {
		
		if(pins.length == 0) {
			$("#search-bar").animate({ top: 0 }, 300, function() {
				
			});
			
			$("#logo").animate({ height: 50 }, 300, function() {
				
			});
			
			$("#pin-bar").toggleClass("hidden");

		}
		
		var isOntologyClass = suggestions[0].uri[0].includes("http://dbpedia.org/ontology");
	
		$("#search-input").val("");
		var pin = { text: suggestions[0].name[0], uri: suggestions[0].uri[0], isClass: isOntologyClass };

		pushPin(pin);
		findFilters();
	}
});

function search() {
	
	result = [];
	filters = [];
	
	findFilters();
	
	//Build a query from the search object
	var query = "SELECT distinct ?s WHERE { ?s a <" + searchObject.uri + ">. } limit 200";
	
	
	var queryUrl = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query="+ encodeURIComponent(query);
	//Send out the query via ajax
	$.ajax({
		dataType: 'json',
		url: queryUrl,
		success: function(data) {    
		
			
			//Iterate over the results and add them to the result set
			for(i in data.results.bindings) {
				//Retrieve the uri
				var resultUri = data.results.bindings[i]["s"]["value"];
				//Extract the actual name from the uri
				var resultText = resultUri.split('\\').pop().split('/').pop().split('_').join(' ');
				result.push({ text: resultText, uri: resultUri, icon_url: 'img_avatar2.png', isClass: false });
			}
			
			printResults();
		},
		error: function(data) {
			$('#result-list').empty();
		}		
	});
}

function pushPin(pin) {
	pins.push(pin);
	printPins();
}


function printPins() {
	var list = $('#pin-list')
	list.empty();
	
	$.each(pins, function( index, value ) {
		var listItem = $('<li/>')
			.addClass('pin-item')
			.attr('id', 'pin-' + index)
			.appendTo(list);
			
		var table = $('<div/>').addClass('inline-table').appendTo(listItem);
		var row = $('<div/>').addClass('inline-row').appendTo(table);
		
		var markerLeft = $('<div/>').addClass('inline-cell marker-cell left').appendTo(row);
		var arrowCellLeft = $('<div/>').addClass('inline-cell arrow-cell left').appendTo(row);	
		var arrowLeft = $('<div/>').addClass('arrow-right').appendTo(arrowCellLeft);	
		
		var content = $('<div/>').addClass('inline-cell').appendTo(row);
		var text = $('<a/>').text(value.text).appendTo(content);
		
		
		
		listItem.click(function() {
			
			searchObject = pins[index];
			
			togglePin('pin-' + index);
			
			setTimeout(function() {
				search();
			}, 250);			
			
		});
		
	
			
	
	});
}

function togglePin(id) {
	var list = $('#pin-list').find('.active');
	list.removeClass('active');
	$('#' + id).addClass('active');	
}




function printAutoComplete() {
	
	autocompleteList.empty();
	
	$.each(suggestions, function( index, value ) {
		var listItem = $('<li/>')
			.appendTo(autocompleteList);
		var text = $('<a/>')
			.text(value.name)
			.appendTo(listItem);
			
	});
	
}

function printResults() {
	var list = $('#result-list');
	list.empty();
	
	if(result.length == 0) {
		$('#results').addClass('hidden');
	} else {
		$('#results').removeClass('hidden');
	}
		
	$.each(result, function( index, value ) {
		var listItem = $('<li/>')
			.addClass('result-item')
			.attr('id', 'pin-' + value.text)
			.appendTo(list);
		var text = $('<a/>')
			.text(value.text)
			.appendTo(listItem);
			
		listItem.click(function() {
			pushPin(value);
			findFilters();
		});
	});
	
}

function printFilters() {
	var list = $('#filter-list');
	list.empty();
	
	if(filters.length == 0) {
		$('#filter-bar').addClass('hidden');
	} else {
		$('#filter-bar').removeClass('hidden');
	}
	
	
	for(var i = 0; i < Math.min(4, filters.length); i++) {
		
		var listItem = $('<li/>')
			.addClass('filter-item')
			.attr('id', 'filter-' + i)
			.appendTo(list);
			
		var table = $('<div/>').addClass('inline-table').appendTo(listItem);
		var row = $('<div/>').addClass('inline-row').appendTo(table);
		
		var markerLeft = $('<div/>').addClass('inline-cell marker-cell left').appendTo(row);
		var arrowCellLeft = $('<div/>').addClass('inline-cell arrow-cell left').appendTo(row);	
		var arrowLeft = $('<div/>').addClass('arrow-right').appendTo(arrowCellLeft);	
		
		var content = $('<div/>').addClass('inline-cell').appendTo(row);
		
		if(filters[i].passive == 'true') {
			var text = $('<a/>').text(searchObject.text + " with " + filters[i].text + " being " + filters[i].target.text).appendTo(content);
		} else {
			var text = $('<a/>').text(searchObject.text + " being " + filters[i].text + " of " + filters[i].target.text).appendTo(content);
		}
		
		
		
		listItem.click(function() {
			
			$(this).toggleClass('active');	

			
			setTimeout(function() {
				// filters[i].active = !filters[i].active;
			}, 250);
			
		});
		
		
		
		
	}
	
	if(filters.length > 4) {
		var listItem = $('<li/>')
				.addClass('filter-item')
				.attr('id', 'pin-more')
				.appendTo(list);
				
		var text = $('<a/>')
			.text("+ More")
			.appendTo(listItem);
	}
}

function findFilters() {
	
	filters = [];
	
	if(searchObject != null && searchObject.isClass) {
		
		$.each(pins, function( index, value ) {
				
			if(value.isClass) {
				findTypeFilters(value, searchObject);
			} else {
				findInstanceFilters(value, searchObject);
			}
			
		});
		
	} else {
		printFilters();
	}
}

function findTypeFilters(targetType, type) {
	var query = "SELECT distinct ?p ?x WHERE { { ?s ?p ?o BIND('true' AS ?x). ?s a <" + type.uri + ">. ?o a <" + targetType.uri + ">. } " + 
		"UNION { ?o ?p ?s BIND('false' AS ?x). ?s a <" + type.uri + ">. ?o a <" + targetType.uri + ">. } FILTER regex(?p, 'dbpedia.org/ontology')  }";
		
		
	var queryUrl = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query="+ encodeURIComponent(query) +"&format=json";

	queryFilters(queryUrl, targetType);
}

function findInstanceFilters(instance, type) {	
	var query = "SELECT distinct ?p ?x WHERE { { ?s ?p <" + instance.uri + "> BIND('true' AS ?x). ?s a <" + type.uri 
		+ ">. } UNION { <" + instance.uri + "> ?p ?s BIND('false' AS ?x). ?s a <" 
		+ type.uri + ">. } FILTER regex(?p, 'dbpedia.org/ontology')  }";
		
		
	var queryUrl = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query="+ encodeURIComponent(query) +"&format=json";

	queryFilters(queryUrl, instance);
}

function queryFilters(queryUrl, targetObject) {
	$.ajax({
		dataType: 'json',
		url: queryUrl,
		success: function(data) {    
			//Iterate over result set
			for(i in data.results.bindings) {
				//Get the result uri
				var resultUri = data.results.bindings[i]["p"]["value"];
				var resultPassive = data.results.bindings[i]["x"]["value"];
				//Get the property name from the uri
				var resultText = resultUri.split('\\').pop().split('/').pop().replace(/([a-z](?=[A-Z]))/g, '$1 ').replace(/([A-Z])/g, function(str){ return str.toLowerCase(); });
				
				filters.push({ text: resultText, uri : resultUri, active: false, passive: resultPassive, target: targetObject});
			}
			
			
			printFilters();
		},
		error: function(data) {
			printFilters();
		}
	});
}

