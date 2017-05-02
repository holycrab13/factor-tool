// Capitalizes the first letter of a string
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Transforms the passed string to title case
function toTitleCase(str) {
    return str.replace(/(?:^|\s)\w/g, function(match) {
        return match.toUpperCase();
    });
}

// Formats the given string to a unified format
function formatName(str) {
    return toTitleCase(str).replace(/(\s)/g, "").replace( /([A-Z])/g, " $1" ).slice(1);
}

// Returns a natrual language string from a URI (NEEDS WORK!)
function getText(uri)
{
	return uri.split('\\').pop().split('/').pop().split('_').join(' ');
}

function getSetDescription(resultSet)
{
	var text = "Things ";
	$.each(resultSet.filters, function( index, value ) {

		if(value.type == "instance")
		{
			if(value.currentProperty.uri == null)
			{
				text += " " + value.currentProperty.name + " " + value.name;
			}
			else if(value.currentProperty.dir == '^')
			{
				text += " being " + value.currentProperty.name + " of " + value.name;
			}
			else
			{
				text += " with " + value.currentProperty.name + " being " + value.name;
			}

			if(index < resultSet.filters.length - 1)
			{
				text += " and ";
			}
		}
	});

	return text;
}

if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

function maxLength(text, length)
{
	if(text.length > length)
	{
		return text.substring(0, length) + "...";
	}
	else
	{
		return text;
	}
}
