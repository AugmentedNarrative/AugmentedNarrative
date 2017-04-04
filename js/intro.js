$(document).ready (function () { 
	var conf = {
		data: {
			world: {
				type: d3.json,
				url: 'data/world.json',
				id: "world",
				key: "countries",
				enumerator: "geometries",
				idProperty: function (a) { return a.id; } 
			},
		},
		prequantifiers: {},
		quantifiers: {
			maps: {
				continent: function (a) { 
					return {"class": a.properties ["CONTINENT"].toLowerCase ().replace (' ', '_') + " country " + a.properties ["ISO3"].toLowerCase ()} 
				}
			}
		}

	}
	var ant = new Ant (conf);
});
