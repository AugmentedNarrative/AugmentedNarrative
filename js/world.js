$(document).ready (function () { 
	var conf = {
		data: {
			world: {
				type: d3.json,
				url: '/data/world.json',
				id: "world",
				key: "countries",
				enumerator: "geometries",
				idProperty: function (a) { return a.id; } 
			},
			countries_categories: { 
				type: d3.csv,
				url: '/data/countries_categories.csv',
				id: "countries_categories",
				processor: function (rows) { 
					//var years = [1990,2000,2006,2007,2008,2009,2010,2011,2012,2013,2014]; 	
					this.data.regions = new Nestify (rows, ["region", "code"], ["income_group", "currency"]).data; 
					this.data.incomes = new Nestify (rows, ["income_group", "code"], ["region", "currency"]).data; 
					this.data.currencies = new Nestify (rows, ["currency", "code"], ["region", "income_group"]).data; 
					this.data.by_code = new Nestify (rows, ["code"], ["region", "income_group", "currency"]).data;
				}
			},
			countries_data: { 
				type: d3.csv,
				url: '/data/countries_data.csv',
				id: "countries_data",
				processor: function (rows) { 
					console.log (this.data);
					var years = [1990,2000,2006,2007,2008,2009,2010,2011,2012,2013,2014]; 	
					this.data.population = new Nestify (rows, ["code"], years, d3.sum).data;
					this.data.by_year = {};
					for (var y in years) { 
						//INTERESTING: This commented use case jumps from one nest to an internalKey so you can have:
						// {1990: TOTAL POP IN 1990, 2000: SAME ... }
						//var x = new Nestify (rows, ["code"], [years [y]], d3.max, years [y]).data;
						//
						var x = new Nestify (rows, ["code"], ["code", years [y]], d3.max).data;
						this.data.by_year [years [y]] = 0;
						var countries = x.items ();

						for (var c in countries) {
							var country = countries [c];
							this.data.by_year [years [y]] += country.values [years [y]].value;
							if (!this.data.by_year [country.key]) this.data.by_year [country.key] = {};
							this.data.by_year [country.key] [years [y]] = country.values [years [y]].value;
						}

					}
					for (var x in rows) { 
						var row = rows [x];
						var cats = this.data.by_code [row.code];
						if (cats) { 
							for (var y in years) { 
								var year = years [y];
								if (!this.data.incomes [cats.income_group.value][year]) { 
									this.data.incomes [cats.income_group.value][year] = 0;
								}
								if (!this.data.currencies [cats.currency.value][year]) { 
									this.data.currencies [cats.currency.value][year] = 0;
								}
								if (!this.data.regions [cats.region.value][year]) { 
									this.data.regions [cats.region.value][year] = 0;
								}
								this.data.incomes [cats.income_group.value][year] += parseInt (row [year]);
								this.data.currencies [cats.currency.value][year] += parseInt (row [year]);
								this.data.regions [cats.region.value][year] += parseInt (row [year]);
							}
						}
					}
					var categorized = false;
					var regions = this.data.regions.items ();
					for (var r in regions) {
						var regionName = regions [r].key;
						var regionValues = regions [r].values;
						var c = $("<div>").addClass ("scene").append ($("<h1>").text (regionName)); 
						for (var y in years) { 
							var year = years [y];
							var pop_yr = regionValues [year];
						}
							
						var region = regionName.toLowerCase ().replace (/&/g, "").replace (/\s/g, "_");
						var parse = [{"control_chart": "countries", "highlight": ".region_" + region }];
						var data = {
							"control_chart": "world_map", 
							"highlight": ".region_" + region, 
							"parse" : parse,
							//"zoom_to": ".region_" + region, 
							//"zoom_level": 50 
						}
						if (!categorized) { 
							data.quantify = "world";
							data.quantifier = "categorize";
							categorized = true;
						}
						c.data (data);
						c.attr ('id', "region_" + region);

						var chart = $("<div>")
							.attr ("id", "countries_" + region)
							.addClass("col-md-6")
							.css ({"height": "100px"})
							.data ({
								"chart": "bars", 
								"quantify": "regions", 
								"quantifier": "countries", 
								"quantifier_args": {"region": regionName}
							});

						$("#movie").append (c);
						c.append (chart);
						this.initChart (chart);

						var firstCountry;
						for (var i in regionValues) {
							if (parseInt (i) !== Number (i)) { 
								firstCountry = i; 
								break;
							}
						}
						var years = $("<div>")
							.attr ("id", "years_" + region)
							.addClass ("col-md-6 region_years")
							.css ({"height": "100px"})
							.data ({
								"chart": "bars",
							//	"quantify": "regions",
							//	"quantifier": "years",
							//	"quantifier_args": {"region": regionName}
							});
						c.append (years);
						this.initChart (years);
					}
					this.initScroll ();
				}
			}
		},
		prequantifiers: {
			categorize: function () { 
			},
			// note: we need to define a prequantifier when using a chart other than the map as we need the scales and all that
			population: function () { 
				//TODO make this receive arguments so we can use it for multiple years... 
				var extent = this.data.regions.extent (function (a) { return a.values [1990];  })
				extent = [0, extent [1]];
				return {data: this.data.regions, scale: d3.scale.linear ().domain (extent)};
			},
			countries: function (args) {
				var cdy = this.data.by_year;
				var cdc = this.data.by_code;
				var extent = this.data.regions [args.region]
					.extent (function (a) { 
						if (a.key !== Number (a.key)) { 
							if (cdc [a.key].region.value == args.region && cdy [a.key]) { 
								return cdy [a.key] [1990]; 
							}
						} 
					});
				extent = [0, extent [1]];
				return {data: this.data.regions [args.region], scale: d3.scale.linear ().domain (extent)};
			},
			years: function (args) { 
				
				var min = 0, max = 0, items = [];
				if (args.country) {
					var cdy = this.data.by_year;
					//FIXME: by_year was not created using Nestify so we dont have extent nor min nor max
					for (var y in this.data.by_year [args.country]) {
						var num = this.data.by_year [args.country][y];
						if (!min) min = num; 
						if (num < min) min = num;
						if (num > max) max = num;
						items.push ({key: y, value: num, country: args.country});
					}
				}
				var extent = [min, max];
				return {data: items, scale: d3.scale.linear ().domain (extent)};
			},
			regions: function (args) { 
				var items = [], max = 0, min = 0;
				for (var r in this.data.regions [args.region]) {
					if (parseInt (r) === Number (r)) {
						var num = this.data.regions [args.region][r];
						if (!min) min = num;
						if (num < min) min = num;
						if (num > max) max = num;
						items.push ({year: r, value: num, region: args.region });
					}
				}
				var extent = [min, max];
				return {data: items, scale: d3.scale.linear ().domain (extent)};
			}
		},
		quantifiers: {
			maps: { 
				categorize: function (a) { 
					var cntr = this.data.by_code [a.properties.ISO3];
					if (cntr) {
						var regionName = cntr.region.value;
						var region = regionName.toLowerCase ().replace (/&/g, "").replace (/\s/g, "_");
						var income = cntr.income_group.value.toLowerCase ().replace (/\s/g, "_").replace (/\:/g, "");
						var parse = [
							{"control_scroll": "movie", "scroll_to": "region_" + region },
							{"control_chart": "countries_" + region, "highlight": ".country_" + a.properties.ISO3},
							{"control_chart": "years_" + region, "quantify": "by_year", "quantifier": "years", "quantifier_args": {"region": regionName, "country": a.properties.ISO3 } },
							{"control_chart": "countries_years", "quantify": "regions", "quantifier": "regions", "quantifier_args": {"region": regionName} }
						];
						var data = {"control_chart": "countries", "highlight": ".region_" + region, "parse": parse}
						return {"class": "country region_" + region + " income_" + income + " country_" + a.properties.ISO3, "data": data};
					}
				}
			},
			bars: { 
				population: function (a, x, d) { 
					var height = d.scale (a.values [1990]);
					var region = a.key.toLowerCase ().replace (/&/g, "").replace (/\s/g, "_");
					var cls = "region_" + region + " country_" + a.key;
					var data = {};
					if (region) {
						data = {"control_scroll": "movie", "scroll_to": "region_" + region };
					}
					data.parse = [
						{"control_chart": "countries_years", "quantify": "regions", "quantifier": "regions", "quantifier_args": {"region": a.key} }
					];
					return {"height": parseInt (height), "class": cls, "data": data}; 
				},
				countries: function (a, x, d) { 
					var height = 0;
					if (this.data.by_year [a.key]) {
						height = d.scale (this.data.by_year [a.key][1990]);
					}
					var regionName = this.data.by_code [a.key].region.value
					var region = regionName.toLowerCase ().replace (/&/g, "").replace (/\s/g, "_");
					var parse = [
						{"control_chart": "world_map", "select": ".country", "select_remove_class": "hover"},
						{"control_chart": "world_map", "select": ".country_" + a.key, "select_add_class": "hover"},
						{"control_chart": "years_" + region, "quantify": "by_year", "quantifier": "years", "quantifier_args": {"region": regionName, "country": a.key } }
					];
					var data = {"parse": parse}; 
					return {"height": height, "data": data, "class": "country_" + a.key}
				},
				years: function (a, x, d) { 
					return {"height": d.scale (a.value)}
				},
				regions: function (a, x, d) { 
					console.log (arguments);
					return {"height": d.scale (a.value)};
				}
			}
		}
	};
	var d = new Ant (conf); 
});
