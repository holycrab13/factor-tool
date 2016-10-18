
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


$("#content").click(function() {
	if($("#search-input").hasClass("hidden")) {
		$("#search-input").toggleClass("hidden");
		$("#search-icon").toggleClass("hidden");
		
		$("#search-bar").animate({ width: 100 + '%' }, 300, function() {
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
		$("#search-bar").toggleClass("active");
		$("#content").toggleClass("active");
		$("#pin-section").toggleClass("active");
		$("#pin-title").toggleClass("hide");
		$("#pin-marker").toggleClass("active");
		
	
		$("#pin-title").html(suggestions[0].name);
		var pin = { text: suggestions[0].name, uri: suggestions[0].uri, isClass: true };

		searchObject = pin;	
		pushPin(pin);
		
		
		$("#content").one('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend',   
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

$("#search-bar").submit(function( event ) {
	
	event.preventDefault();

	if(suggestions.length > 0) {
		
		if(pins.length == 0) {
			$("#content").animate({ marginTop: 0 }, 300, function() {
				
			});
			
			$("#logo").animate({ height: 50 }, 300, function() {
				
			});
			
			$("#pin-section").toggleClass("hidden");

		}
		
		var isOntologyClass = suggestions[0].uri[0].includes("http://dbpedia.org/ontology");
	
		$("#search-input").val("");
		
		
		
		var pin = { text: suggestions[0].name[0], uri: suggestions[0].uri[0], isClass: isOntologyClass };

		pushPin(pin);
		findFilters ();
	}
});

function search() {
	
	result = [];
	
	if(searchObject == null || !searchObject.isClass) {
		$('#result-list').empty();
		return;
	}
	
	//Build a query from the search object
	var query = "SELECT distinct ?s WHERE { ?s a <" + searchObject.uri + ">.";
	
	var i = 0;
	
	$.each(filters, function( index, value ) {
		
		if(value.active) {
			if(!value.target.isClass) {
				if(value.passive == 'false') { 
					query += " <" + value.target.uri + "> <" + value.uri + "> ?s.";
				} else {
					query += " ?s <" + value.uri + "> <" + value.target.uri + ">.";
				}
			} else {
				var o = " ?o" + i;
				
				if(value.passive == 'false') {
					query += o + " <" + value.uri + "> ?s." + o + " a <" + value.target.uri + ">."
				} else {
					query += " ?s <" + value.uri + "> " + o + " ." + o + " a <" + value.target.uri + ">."
				}
				
				i++;
			}
		}
	
	});
	
	query += "} limit 200"
	
		
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
			.addClass('list-item')
			.attr('id', 'pin-' + index)
			.appendTo(list);
		var text = $('<a/>')
			.text(value.text)
			.appendTo(listItem)
			.addClass('list-item-text');
		var remove = $('<i/>')
			.text('clear')
			.appendTo(listItem)
			.addClass('remove-button material-icons');
			
			
		remove.click(function() {
			
			 pins.splice(index, 1);
			 printPins();
		});
	
		listItem.click(function() {
			
			searchObject = pins[index];
			
			togglePin('pin-' + index);
	
			findFilters();
			search();						
			
		});
		
		if(searchObject != null && searchObject.uri == pins[index].uri) {
			togglePin('pin-' + index);
		}
	
			
	
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
		$('#result-section').addClass('hidden');
	} else {
		$('#result-section').removeClass('hidden');
	}
		
	$.each(result, function( index, value ) {
		var listItem = $('<li/>')
			.addClass('list-item')
			.attr('id', 'result-' + value.text)
			.appendTo(list);
		var text = $('<a/>')
			.text(value.text)
			.appendTo(listItem)
			.addClass('list-item-text');
			
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
		$('#filter-section').addClass('hidden');
	} else {
		$('#filter-section').removeClass('hidden');
	}
	
	$.each(filters, function( index, value ) {
	
		var listItem = $('<li/>')
			.addClass('list-item')
			.attr('id', 'filter-' + index)
			.appendTo(list);
		
		
		if(filters[index].passive == 'true') {
			var text = $('<a/>').text(searchObject.text + " with " + filters[index].text + " being " + filters[index].target.text)
			.addClass('list-item-text').appendTo(listItem);
		} else {
			var text = $('<a/>').text(searchObject.text + " being " + filters[index].text + " of " + filters[index].target.text)
			.addClass('list-item-text').appendTo(listItem);
		}
		
		
		
		listItem.click(function() {
			
			$(this).toggleClass('active');	
			filters[index].active = !filters[index].active;
			
			search();	
		});
		
		
		
		
	});
	
	
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

