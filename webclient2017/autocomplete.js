
var suggestions_all = [];

var suggestions_lookup = [];

var suggestions_solr = [];



// Runs the auto-complete for the text input
function autoComplete(searchTerm) {
	
	// Clear all suggestions
	suggestions_lookup = [];
	suggestions_solr = [];
	suggestions_all = [];
	
	$.when(getSolrSuggestions(), getLookupSuggestions(searchTerm)).done(function(solr, lookup) {
		
		$.each(suggestions_solr, function( index, solr_class ) {
		
			var instUri = null;
			
			$.each(suggestions_lookup, function( index, lookup_instance ) {
				if(solr_class.name == lookup_instance.name) {
					instUri = lookup_instance.uri;
					lookup_instance.add = false;
				}
			});
			
			var suggestion = { name: solr_class.name, uri : solr_class.uri, isClass : true, instanceUri : instUri };
			suggestions_all.push(suggestion);
		});
		
		$.each(suggestions_lookup, function( index, lookup_instance ) {
			if(lookup_instance.add) {
				var suggestion = { name: lookup_instance.name, uri : lookup_instance.uri, isClass : false, instanceUri : null };
				suggestions_all.push(suggestion);
			}
		});	
		
		renderAutoComplete();
	});
}

// Get the auto-complete suggestions from the class solr index
function getSolrSuggestions() {
	// Build the query...
	/*
	var query = "http://139.18.2.136:8984/solr/factor_tool/suggest?wt=json&q=" + encodeURIComponent(searchTerm);
	
	// Send and return the query result
	return $.ajax({
		dataType: 'jsonp',
		jsonp: 'json.wrf',
		url: query,
		success: function(data) {    
			// Read the result and add it to suggestions_solr
			var resultData = data.suggest.mySuggester[searchTerm].suggestions;
			
			for(var i = 0; i < Math.min(5, resultData.length); i++) {
				suggestions_solr.push({ name: formatName(resultData[i].term), uri : resultData[i].payload, add : true });
			}				
		},
		error: function(data) {
			
		}		
	});*/
}

// Get the auto-complete suggestions from dbpedia lookup
function getLookupSuggestions(searchTerm) {
	// Build the query...
	// var query = "SELECT ?x WHERE { FILTER regex(?x, '" + searchTerm + "'')}"

	var query = "http://lookup.dbpedia.org/api/search/PrefixSearch?MaxHits=10&QueryString=" + encodeURIComponent(searchTerm);
	
	// var queryUrl = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query="+ encodeURIComponent(query) +"&format=json";


	return $.ajax({
		dataType: 'json',
		url: query,
		success: function(data) {    
			// Read the result and add it to suggestions_lookup
			for(var i = 0; i < Math.min(10, data.results.length); i++) {
				suggestions_lookup.push({ name: formatName(data.results[i].label), uri : data.results[i].uri, add : true });				
				
			}	
		},
		error: function(data) {
			
		}		
	});
}
