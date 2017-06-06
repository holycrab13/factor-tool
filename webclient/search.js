// property index for query generation
var propertyIndex = 0;

var ontologyFilter = "FILTER regex(?p, 'http://dbpedia.org/ontology')";

// Creates a new result set
function createNewResultSet(baseSet)
{
	// resultSet(base, filters, expands, results)
	var resultSet = 
	{ 
		base : baseSet,
		filters : [], 
		expands: [],
		currentExpand : null,
		results : [],
		relatedSets: [],
		classes: [],
		isEmpty : function() {
			return this.filters.length == 0 && this.base == null;
		},
		getRoot : function() {
			return this.base == null ? this : this.base.getRoot();
		}
	}

	return resultSet;
}

function createPropertyExpand(suggestion, direction)
{

	activeResultSet = createNewResultSet(activeResultSet);
	resultSets.push(activeResultSet);

	if(direction == "")
	{
		activeResultSet.classes = suggestion.domains;
	}
	else
	{
		activeResultSet.classes = suggestion.ranges;
	}
	

	$.when(queryExpands(activeResultSet)).done(function() {
		addExpand(activeResultSet, suggestion.uri);
	});
}


function createOpenExpand()
{
	activeResultSet = createNewResultSet(activeResultSet);
	resultSets.push(activeResultSet);	

	$.when(queryExpands(activeResultSet)).done(function() {
		addExpand(activeResultSet, null);
	});
}


function createClassFilter(suggestion)
{
	if(activeResultSet == null)
	{
		activeResultSet = createNewResultSet(null);
		resultSets.push(activeResultSet);
	}

	if(suggestion.classes.length > activeResultSet.classes.length)
	{
		activeResultSet.classes = suggestion.classes;
	}

	var filter =
	{
		name: suggestion.name,
		uri: suggestion.uri,
		type: "class",
		createQuery : function(index)
		{
			return "?s{0} a <{1}>. ".format(index, this.uri);
		}
	}

	addFilter(activeResultSet, filter);
}

function createPropertyFilter(suggestion, direction)
{
	if(activeResultSet == null)
	{
		activeResultSet = createNewResultSet(null);
		resultSets.push(activeResultSet);
	}

	if(direction == "^")
	{
		if(suggestion.ranges.length > activeResultSet.classes.length)
		{
			activeResultSet.classes = suggestion.ranges;
		}
	}
	else
	{
		if(suggestion.domains.length > activeResultSet.classes.length)
		{
			activeResultSet.classes = suggestion.domains;
		}
	}

	var filter =
	{
		name: suggestion.name,
		uri: suggestion.uri,
		dir: direction,
		type: "property",
		createQuery : function(index)
		{
			return "?s{0} {3}<{1}> ?o{2}. ".format(index, this.uri, ++propertyIndex, this.dir);
		}

	}

	addFilter(activeResultSet, filter);
}

function createInstanceFilter(suggestion)
{
	if(activeResultSet == null)
	{
		activeResultSet = createNewResultSet(null);
		resultSets.push(activeResultSet);
	}

	// CREATE FILTER BASED ON AN INSTANCE
	var filter = 
	{
		name: suggestion.name,
		uri: suggestion.uri,
		properties: [],
		type: "instance",
		currentProperty: null,
		createQuery : function(index) {
			if(this.currentProperty.uri != null)
			{
				return "?s{0} {1}<{2}> <{3}>. ".format(index, this.currentProperty.dir, this.currentProperty.uri, this.uri);
			}
			else
			{
				return "{ ?s{0} ?p{1} <{2}>. } UNION { <{2}> ?p{1} ?s{0}. }. ".format(index, ++propertyIndex, this.uri);
			}
		}
	}

	// Wait for the query property result and add the filter
	$.when(queryProperties(filter)).done(function() {
		addFilter(activeResultSet, filter);
	});
}

function queryExpands(resultSet)
{
	if(resultSet.base == null)
		return;

	var c1 = "";
	var c2 = "";

	if(resultSet.base.classes.length > 0)
	{
		c1 = "?s a <http://dbpedia.org/ontology/{0}>.".format(resultSet.base.classes[0]);
	}

	if(resultSet.classes.length > 0)
	{
		c2 = "?o a <http://dbpedia.org/ontology/{0}>.".format(resultSet.classes[0]);
	}

	var query = "select distinct ?p ?dir where { { ?s ?p ?o. BIND('^' as ?dir).  } UNION { ?o ?p ?s. BIND('' as ?dir). } {0} {1} ?p rdf:type owl:ObjectProperty. } LIMIT 100".format(c1, c2);
	var queryUrl = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query={0}&format=json".format(encodeURIComponent(query));

	// Send the AJAX request
	return $.ajax({
		dataType: 'json',
		url: queryUrl,
		success: function(data) {    

			resultSet.expands = [];

			resultSet.expands.push({ name: "related to", uri: null });

			// Add the queried properties
			for(i in data.results.bindings) {
				//Get the result uri
				var resultUri = data.results.bindings[i]["p"]["value"];
				var resultDir = data.results.bindings[i]["dir"]["value"];
				var resultName = resultUri.split('\\').pop().split('/').pop().replace(/([a-z](?=[A-Z]))/g, '$1 ').replace(/([A-Z])/g, function(str){ return str.toLowerCase(); });
				var text = "";

				if(resultDir == '^')
				{
					
					text += " being " + resultName + " of ";
				}
				else
				{
					
					text += " with " + resultName + " being ";
				}


				resultSet.expands.push({ name: text, uri: resultUri, dir: resultDir });
			}

		},
		error: function(data) {
		}
	});
}
// Query the properties for a certain filter
function queryProperties(filter)
{
	// Generate the query
	var inner = "{ ?s ?p <{0}> BIND('' as ?dir). ?p rdfs:range ?r. ?p rdfs:domain ?d } UNION { <{0}> ?p ?s BIND('^' as ?dir). ?p rdfs:range ?r. ?p rdfs:domain ?d }".format(filter.uri);

	var query = "SELECT distinct ?p ?dir ?d ?r WHERE { {0}  } ORDER BY DESC(count(?p)) LIMIT 15 ".format(inner);
	var queryUrl = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query={0}&format=json".format(encodeURIComponent(query));

	// Send the AJAX request
	return $.ajax({
		dataType: 'json',
		url: queryUrl,
		success: function(data) {    

			// Create the default property "all"
			filter.properties = [];
			filter.properties.push({ name: "related to", uri: null });
			filter.currentProperty = filter.properties[0];
			
			// Add the queried properties
			for(i in data.results.bindings) {
				//Get the result uri
				var resultUri = data.results.bindings[i]["p"]["value"];
				var resultDir = data.results.bindings[i]["dir"]["value"];
				var domainUri = data.results.bindings[i]["d"]["value"];
				var rangeUri = data.results.bindings[i]["r"]["value"];
				var resultName = resultUri.split('\\').pop().split('/').pop().replace(/([a-z](?=[A-Z]))/g, '$1 ').replace(/([A-Z])/g, function(str){ return str.toLowerCase(); });
				var d = domainUri.split('\\').pop().split('/').pop().replace(/([a-z](?=[A-Z]))/g, '$1 ').replace(/([A-Z])/g, function(str){ return str.toLowerCase(); });
				var r = rangeUri.split('\\').pop().split('/').pop().replace(/([a-z](?=[A-Z]))/g, '$1 ').replace(/([A-Z])/g, function(str){ return str.toLowerCase(); });
				filter.properties.push({ name: resultName, uri: resultUri, dir: resultDir, domain: d, range: r });
			}

		},
		error: function(data) {
		}
	});
}

// Query the properties for a certain filter
function queryDomain(expand)
{
	// Generate the query

	var query = "SELECT distinct ?d ?r WHERE { <{0}> rdfs:domain ?d. <{0}> rdfs:range ?r. }".format(expand.uri);
	var queryUrl = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query={0}&format=json".format(encodeURIComponent(query));

	// Send the AJAX request
	return $.ajax({
		dataType: 'json',
		url: queryUrl,
		success: function(data) {    

			// Add the queried properties
			for(i in data.results.bindings) {
				//Get the result uri
				var domainUri = data.results.bindings[i]["d"]["value"];
				var rangeUri = data.results.bindings[i]["r"]["value"];
				
				var d = domainUri.split('\\').pop().split('/').pop().replace(/([a-z](?=[A-Z]))/g, '$1 ').replace(/([A-Z])/g, function(str){ return str.toLowerCase(); });
				var r = rangeUri.split('\\').pop().split('/').pop().replace(/([a-z](?=[A-Z]))/g, '$1 ').replace(/([A-Z])/g, function(str){ return str.toLowerCase(); });
				
				expand.domain = d;
				expand.range = r;
			}

		},
		error: function(data) {
		}
	});
}

// Adds a filter and updates the current set
function addFilter(resultSet, filter)
{
	resultSet.filters.push(filter);
	update(resultSet);
}

// Adds an expand and updates the current set
function addExpand(resultSet, uri)
{
	$.each(resultSet.expands, function(i, value) {

		if(value.uri == uri)
		{
			resultSet.currentExpand = value;
			update(resultSet);
			return;
		}

	});

}

// Generates the query, sends the query and calls for a GUI update for the given result set
function update(resultSet)
{
	// Clear the current results
	resultSet.results = [];
	resultSet.relatedSets = [];

	// search & render
	$.when(search(resultSet)).done(function() {
		render();
	});
}




// Generates and sends the search query and fills the result list
function search(resultSet)
{
	propertyIndex = 0;

	var query = "select distinct ?s0 where { {0} } LIMIT 100".format(generateQuery(resultSet, 0));

	$("#query_output").val(query);

	var queryUrl = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query="+ encodeURIComponent(query);
	//Send out the query via ajax
	return $.ajax({
		dataType: 'json',
		url: queryUrl,
		success: function(data) {    
		
			//alert("query done");
			var currentResult;
			//Iterate over the results and add them to the result set
			for(i in data.results.bindings) {
				//Retrieve the uri
				var resultUri = data.results.bindings[i]["s0"]["value"];
				var resultName = getText(resultUri);

				resultSet.results.push({ name: resultName, uri: resultUri, relations: [] });
			}
			
		},
		error: function(data) {
		}		
	});
	
}

// Recursively generates the sparql query
function generateQuery(resultSet, index)
{
	if(resultSet.base == null)
	{
	 	return "{0}".format(generateFilterQuery(resultSet, index));
	}
	else
	{
		var result = "";

		result += generateFilterQuery(resultSet, index);
		result += generateExpandQuery(resultSet, index);

		return result + generateQuery(resultSet.base, index + 1);
	}
}

// Generates the subquery for a list of filters
function generateFilterQuery(resultSet, index)
{
	var result = "";

	if(resultSet.isEmpty())
	{
		result += "{ ?s{0} ?p{1} ?o{2} } ".format(index, ++propertyIndex, ++propertyIndex);
	}

	$.each(resultSet.filters, function(i, value) {

		result += value.createQuery(index);

	});

	return result;
}
 
// Generates the subquery for a list of expands
function generateExpandQuery(resultSet, index)
{
	var result = "";

	if(resultSet.currentExpand == null || resultSet.currentExpand.uri == null)
	{
		result += "{ ?s{0} ?p{1} ?s{2} } ".format(index, ++propertyIndex, index + 1);
	}
	else
	{
		result += "{ ?s{0} {3}<{1}> ?s{2} } ".format(index, resultSet.currentExpand.uri, index + 1, resultSet.currentExpand.dir);
	}

	return result;
}


