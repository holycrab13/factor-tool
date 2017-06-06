
var resultSets = [];

var activeResultSet;

var init = true;

var searchTerm = "";

var searchInput = $("#search-input");

var autocompleteList = $('#autocomplete');

var filterSuggestionList = $('#filtersuggestions')

var expandSuggestionList = $('#expandsuggestions')

var searchReflexive = false;

var relatedSets = [];

var activeTab;

var currentSuggestion;


// Looks for changes in the search term
setInterval(function() { 
	var input = searchInput.val();
	
	if(searchTerm != input) {
		searchTerm = input;
		
		// adjust the width of the input field
		var w = searchTerm.length * 12 + 30;
		if(w > 200) {
			$("#search-input").animate({ width: w }, 50);
		}
		
		autoComplete(searchTerm);		
	}
	
}, 50);


function createEmptySet()
{
	$("#search-input").focus();
	
	activeResultSet = createNewResultSet(null);
	resultSets.push(activeResultSet);

	update(activeResultSet);
}


// Handles tab press to shift through autocompleteSuggestions
$("#search-input").keydown(function (e) {

	if (e.which == 9) {
	   e.preventDefault(); 
	   
	   if(autocompleteSuggestions.length > 0) {
			autocompleteSuggestions.shift();
	   }
	   
	   renderAutoComplete();
	}
});

// Handles the click of the "+" button to add a new tab
$("#add-button").click(function()
{
	activeResultSet = createNewResultSet();
	resultSets.push(activeResultSet);

	render();
});

/*
// Handles the initial animation of the search bar
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
});*/

$('#filter-button').click(function()
{	
	if(autocompleteSuggestions.length > 0) 
	{
		var suggestion = autocompleteSuggestions[0];

		if(activeResultSet == null)
		{
			activeResultSet = createNewResultSet(null);
			resultSets.push(activeResultSet);
		}

		createFilter(activeResultSet, suggestion);
	}
});

$('#expand-button').click(function()
{
	if(autocompleteSuggestions.length > 0) 
	{
		var suggestion = autocompleteSuggestions[0];

		if(activeResultSet == null)
		{
			activeResultSet = createNewResultSet(null);
			resultSets.push(activeResultSet);
		}

		createExpand(activeResultSet, suggestion);
	}
});


/*
// Handles submits on the search bar to add filters
$("#search-bar").submit(function( event ) {
	
	event.preventDefault();

	
	if(autocompleteSuggestions_all.length > 0) 
	{
			
		
		var suggestion = autocompleteSuggestions_all[0];

		if(activeResultSet == null)
		{
			activeResultSet = createNewResultSet(null);
			resultSets.push(activeResultSet);
		}


	createFilter(activeResultSet, suggestion);
	}
});
*/ 

// Animates the screen to the search setting
function animateToSearchScreen()
{
	$("#content").animate({ marginTop: 0 }, 300, function() {});
	$("#logo").animate({ height: 50 }, 300, function() {});
	$("#pin-section").toggleClass("hidden");
}

// Renders the auto complete
function renderAutoComplete() {
	
	autocompleteList.empty();
	
	$.each(autocompleteSuggestions, function( index, value ) {
		
		if(value.isClass) {
			var listItem = $('<li/>')
			.appendTo(autocompleteList);
			var text = $('<a/>')
			.text(value.name)
			.addClass("font-bold")
			.appendTo(listItem);
		} else {
			var listItem = $('<li/>')
			.appendTo(autocompleteList);
			var text = $('<a/>')
			.text(value.name)
			.appendTo(listItem);
		}
	});

	
}

function renderSuggestions()
{
	filterSuggestionList.empty();
	expandSuggestionList.empty();

	$.each(filterSuggestions, function( index, value ) {
		var listItem = $('<li/>')
		.addClass('filter-suggestion')
		.text(value.text)
		.appendTo(filterSuggestionList);

		listItem.click(function() {
			value.execute();
		});
	});


	$.each(expandSuggestions, function( index, value ) {
		var listItem = $('<li/>')
		.addClass('filter-suggestion')
		.text(value.text)
		.appendTo(expandSuggestionList);

		listItem.click(function() {
			value.execute();
		});
	});
}

// renders the main screen (result sets)
function render()
{
	var sets = $('#result-sets');
	var tabs = $('#result-tabs');

	sets.empty();
	tabs.empty();

	$.each(resultSets, function(index, value) {

		var tab = renderTab(value, index, tabs);

		if(value == activeResultSet)
		{
			tab.addClass("active");
			renderResultSet(activeResultSet, index, sets);
		}
	});
}

// Renders a tab for a given result set
function renderTab(resultSet, index, node)
{
	var tab = $('<li/>')
		.attr('id', 'tab-' + index)
		.text('Search ' + index)
		.appendTo(node);

	var remove = $('<i/>')
		.text('clear')
		.appendTo(tab)
		.addClass('remove-button material-icons');

	remove.click(function() {
		if(resultSets.length > 1)
		{
			resultSets.splice(index, 1);
			activeResultSet = resultSets.length > index ? resultSets[index] : resultSets[index - 1];
			render();
		}
	});

	tab.click(function() {
		activeResultSet = resultSet;
		update(activeResultSet);
	});

	return tab;
}

// Renders the given result set
function renderResultSet(resultSet, index, node)
{
	var set = $('<div/>')
		.attr('id', 'set-' + index)
		.addClass("section")
		.appendTo(node);

	renderHeader(resultSet, set);
	renderFilters(resultSet, set);
	renderResults(resultSet, set);
}

// Renders the header of the given result set
function renderHeader(resultSet, node)
{
	var header = $('<div/>')
		.addClass('result-header')
		.appendTo(node);

	var desc = $('<ul/>')
		.addClass('result-description')
		.appendTo(header);

	

	renderTitle(resultSet, desc);


	var expandRight = $('<li/>')
		.addClass('expand-button')
		.text('>')
		.appendTo(desc);

	var desc2 = $('<div/>')
		.text(resultSet.results.length + ' Results')
		.addClass('result-amount')
		.appendTo(header);


	expandRight.click(function() {
		createOpenExpand();
		update(activeResultSet);
	});

	/*
	var related = $('<select/>')
		.addClass('result-related')
		.appendTo(header);
	*/
	
}

function renderTitle(resultSet, node)
{
	var title = $('<li/>')
	.addClass('set-title')
	.text(getSetDescription(resultSet))
	.appendTo(node);

	title.click(function() {
		activeResultSet = resultSet;
		update(activeResultSet);
	});

	if(resultSet.base != null)
	{
		renderExpand(resultSet, node);
		renderTitle(resultSet.base, node);
	}
}

function renderExpand(resultSet, node)
{
	var title = $('<select/>')
		.addClass('expand-title')
		.text('kek')
		.appendTo(node);

	var listItem = $('<option/>')
		.text(getExpandDescription(resultSet))
		.appendTo(title);

	$.each(resultSet.expands, function( index, value ) {
		var listItem = $('<option/>')
			.text(value.name)
			.appendTo(title);

		title.change(function() {
			resultSet.currentExpand = resultSet.expands[this.selectedIndex];
			update(resultSet);				
		});
	});
	
}

// Renders the filters of the given result set
function renderFilters(resultSet, node)
{
	var filterSection = $('<div/>')
		.addClass('filter-section')
		.appendTo(node);

	var filterList = $('<ul/>')
		.addClass('filter-list')
		.appendTo(filterSection);

	filterList.empty();

	$.each(resultSet.filters, function( index, value ) {
		
		var listItem = $('<li/>')
			.addClass('pin-item')
			.attr('id', 'pin-' + index)
			.appendTo(filterList);
		var selectBox = $('<select/>')
			.addClass("pin-selector")
			.appendTo(listItem);

		if(value.type == "instance")
		{
			selectBox.change(function() {
				value.currentProperty = value.properties[this.selectedIndex];
				update(activeResultSet);				
			});

			$.each(value.properties, function(index, valueRel) {
				var option = $('<option/>')
				.text(valueRel.name)
				.appendTo(selectBox);
			});

			selectBox.val(value.currentProperty.name);
		}

		var name = $('<a/>')
			.text(value.name)
			.appendTo(listItem);
		
		var remove = $('<i/>')
			.text('clear')
			.appendTo(listItem)
			.addClass('remove-button material-icons');
			
			
		remove.click(function() {
			resultSet.filters.splice(index, 1);
			update(activeResultSet);	
		});
	});
}

// Renders the list of results
function renderResults(resultSet, node) {

	var resultList = $('<ul/>')
		.addClass('result-list')
		.appendTo(node);
	
	resultList.empty();

	$.each(resultSet.results, function(index, value) {
		var listItem = $('<li/>')
			.addClass('list-item')
			.attr('id', 'result-' + value.name)
			.appendTo(resultList);

		var text = $('<a/>')
			.text(maxLength(value.name, 60) + " (" + value.uri + ")")
			.appendTo(listItem)
			.addClass('list-item-text');




		trace(resultSet, value, listItem);

		var search = $('<i/>')
			.text('search')
			.appendTo(listItem)
			.addClass('result-button material-icons');

		var add = $('<i/>')
			.text('add')
			.appendTo(listItem)
			.addClass('result-button material-icons');

		add.click(function() {
			addFilter(value);
		});

		search.click(function() {
			newSet();
			addFilter(value);
		});
	});
}



function printRelatedSets() {
	var list = $('#related-select')
	list.empty();
	
	
	$.each(relatedSets, function( index, value ) {
		
		var listItem = $('<option/>')
			.text(value.dir + " " + value.name + " (" + value.uri + ")")
			.appendTo(list);
	
	});
}

