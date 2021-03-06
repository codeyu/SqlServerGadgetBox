
angular
    .module('waitStatsVisualization', [])
    .directive(
        'sgWaitStatsVisualization',
        [
            '$log',
            function($log) {

                return {
                    restrict: 'E',
                    template: '<svg></svg>',
                    link: function(scope, element, attrs) {

                        var vx = 1000, vy = 700,
                            waitTypes = [],
                            currentData = {},
                            maxCount = 20,
                            colors = d3.scale.category20(),
                            svg, renderFxn;

                        scope.$watch(attrs.visualizationData, function(data) {
                            if(data && data.stats) {
                                //$log.info(JSON.stringify(data, null, '  '));
                                mergeData(data);
                                colors.domain(waitTypes);
                                updateVisualization();
                            }
                        });

                        function mergeData(data) {

                            waitTypes = _.union(currentData.waitTypes, _.pluck(data.stats, "wait_type"));

                            _.each(waitTypes, function(wt){

                                var dataItem = currentData[wt] = currentData[wt] || {
                                        waitType: wt,
                                        values: [],
                                        isSelected: true
                                    },
                                    lst = dataItem.values,
                                    itm = _.find(data.stats, function(s){
                                        return s.wait_type === wt;
                                    });

                                while(lst.length < maxCount) {
                                    lst.push(0);
                                }
                                lst.push(itm ? (Number(itm.wait_time_s) || 0) : 0);
                                if(lst.length > maxCount) {
                                    lst.splice(0, 1);
                                }
                            });
                        }

                        function updateVisualization() {

                            updateLegend();

                            if(!svg) {
                                svg = d3.select(element[0]).selectAll("svg");
                                svg
                                    .attr("viewBox", [0, 0, vx, vy].join(" "))
                                    .attr("preserveAspectRatio", "xMidYMin meet");
                            }

                            if(!renderFxn) {
                                renderFxn = showLineChart();
                            }
                            renderFxn();
                        }

                        function showLineChart() {

                            var margin = { top: 20, bottom: 20, left: 20, right: 50 },
                                width = vx - (margin.left + margin.right),
                                height = vy - (margin.top + margin.bottom);

                            var xScale = d3.scale.linear()
                                .domain([0, maxCount-1])
                                .range([0, width]);

                            var yScale = d3.scale.linear()
                                .range([height, 0]);

                            var yAxis = d3.svg.axis()
                                .scale(yScale)
                                .orient("right");

                            var lineGen = d3.svg.line()
                                .interpolate("basis")
                                .x(function(d, i) { return xScale(i); })
                                .y(function(d, i) { return yScale(d); });

                            svg.append("rect")
                                .attr("x", margin.left)
                                .attr("y", margin.top)
                                .attr("width", width)
                                .attr("height", height)
                                .attr("class", "border-box");

                            var yAxisRoot = svg.append("g")
                                .attr("class", "y axis")
                                .attr("transform", [
                                    "translate(", vx - margin.right, ",", margin.top, ")"
                                ].join(""))
                                .call(yAxis);

                            var root = svg.append("g")
                                .attr("transform", [
                                    "translate(", margin.left, ",", margin.top, ")"
                                ].join(""));

                            return function() {

                                var dataSet = _.filter(_.values(currentData), function(d) { return d.isSelected; });
                                var maxWaitTime = d3.max(dataSet, function(d) { return d3.max(d.values); });

                                yScale.domain([0, maxWaitTime + (maxWaitTime * 0.1)]);

                                yAxisRoot.call(yAxis);

                                var pathGroup = root.selectAll("g.pathGroup")
                                    .data(d3.values(dataSet), function (d){ return d.waitType; });

                                pathGroup.enter()
                                    .append("g")
                                    .attr("class", "pathGroup")
                                    .append("path")
                                    .attr("class", "line")
                                    .style("stroke", function(d) { return colors(d.waitType); });

                                pathGroup.select("path")
                                    .attr("d", function(d) {
                                        return lineGen(d.values);
                                    });

                                pathGroup.exit()
                                    .remove();
                            };
                        }

                        function updateLegend() {

                            var legendItems = d3
                                    .selectAll(attrs.legend)
                                    .selectAll("li")
                                    .data(waitTypes, function(d) { return d; });

                            var item = legendItems
                                .enter()
                                .append("li")
                                .classed("list-group-item", true);
                            item.append("input")
                                .attr("type", "checkbox")
                                .attr("checked", "")
                                .on("change", function(d){
                                    $log.info("Show " + d + ": " + this.checked);
                                    currentData[d].isSelected = this.checked;
                                    updateVisualization();
                                });
                            item.append("span");

                            legendItems
                                .select("span")
                                .attr("title", function(d) { return d; })
                                .text(function(d) { return " " + d; })
                                .style("color", function(d){ return colors(d); });
                        }
                    }
                }
            }
        ]
    );
