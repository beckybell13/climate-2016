var generateWord2vecCloud = function(options, wordList) {
  const COS_SIM_THRESHOLD = 0.95;
  const MOUSEOVER_TRANSITION_TIME = 400;

  const svgContainerHeight = options.height;

  // add in tf normalization
  const allSum = d3.sum(wordList, function(d) { return parseInt(d.count, 10); });
  wordList.forEach(function(d, idx) { wordList[idx].tfnorm = d.count / allSum; });

  // scales
  var fullExtent = d3.extent(wordList, function(d) { return d.tfnorm; })
  var colorScale = d3.scaleLinear()
                     .domain(fullExtent)
                     .range(['#bdbdbd', '#000000']);
  var blueColorScale = d3.scaleLinear()
                        .domain(fullExtent)
                        .range(['#9ecae1', '#08306b'])
                        //.range(['#b4b4ff', '#0000ff']);
  var orangeColorScale = d3.scaleLinear()
                           .domain(fullExtent)
                           .range(['#fdae6b', '#7f2704'])
  var fontScale = d3.scaleLinear()
                    .domain(fullExtent)
                    .range([options.minFontSize, options.maxFontSize]);

  const margin = 80;
  const RADIUS_MARGIN = 0;
  const NUM_CONCENTRIC_CIRCLES = 4;

  const radii = wordList.map(function(d) { return Math.pow(Math.pow(d[options.xProperty], 2) + Math.pow(d[options.yProperty], 2), 0.5); });
  const maxRadius = d3.max(radii);
  const maxDataPoint = wordList[radii.indexOf(maxRadius)];

  // make scales completely symmetric and centered around 0
  var xScale = d3.scaleLinear()
    .domain([-maxRadius, maxRadius])
    .range([margin, options.width - margin]);
  var yScale = d3.scaleLinear()
    .domain([-maxRadius, maxRadius])
    .range([options.height - margin, margin]);

  const radiusRatios = [1, .75, .5, .25];
  const backgroundColors = ['#fafafa', '#f5f5f5', '#f0f0f0', '#ebebeb'];
  var zoomedIn = false;
  var zoom = d3.zoom()
          .scaleExtent([1, 3.5])
          .translateExtent([[margin, margin], [options.width - margin, options.height - margin]])
          .extent([[margin, margin], [options.width - margin, options.height - margin]])
          .on("zoom", function() {
              var transform = d3.event.transform;

              // update circles and arc tool-tip
              d3.select('#concentric-circles').attr("transform", transform);
              d3.select('#arc-tip').attr("transform", transform);

              // update origin point
              d3.select('#origin')
                .attr('cx', function(d) { return transform.applyX(xScale(0)); })
                .attr('cy', function(d) { return transform.applyY(yScale(0)); });

              // re-draw text with new scale
              svg.selectAll('text')
                 .attr('x', function(d) { return transform.applyX(xScale(d[options.xProperty])); })
                 .attr('y', function(d) { return transform.applyY(yScale(d[options.yProperty])); });

              tempXScale = transform.applyX(xScale(0));
              tempYScale = transform.applyY(yScale(0));

              // update axes
              d3.select('#pos-y-axis')
                .attr('x1', transform.applyX(xScale(0)))
                .attr('y1', transform.applyY(yScale(0)))
                .attr('x2', transform.applyX(xScale(0)))
                .attr('y2', transform.applyY(yScale(maxRadius)));
              d3.select('#pos-x-axis')
                .attr('x1', transform.applyX(xScale(0)))
                .attr('y1', transform.applyY(yScale(0)))
                .attr('x2', transform.applyX(xScale(maxRadius)))
                .attr('y2', transform.applyY(yScale(0)));
              d3.select('#neg-y-axis')
                .attr('x1', transform.applyX(xScale(0)))
                .attr('y1', transform.applyY(yScale(0)))
                .attr('x2', transform.applyX(xScale(0)))
                .attr('y2', transform.applyY(yScale(-maxRadius)));
              d3.select('#neg-x-axis')
                .attr('x1', transform.applyX(xScale(0)))
                .attr('y1', transform.applyY(yScale(0)))
                .attr('x2', transform.applyX(xScale(-maxRadius)))
                .attr('y2', transform.applyY(yScale(0)));

              // 45-degree lines
              d3.select('#quad-3-axis')
                .attr('x1', transform.applyX(xScale(0)))
                .attr('y1', transform.applyY(yScale(0)))
                .attr('x2', transform.applyX(xScale(-maxRadius * Math.cos(Math.PI / 4))))
                .attr('y2', transform.applyY(yScale(-maxRadius * Math.sin(Math.PI / 4))));
              d3.select('#quad-1-axis')
                .attr('x1', transform.applyX(xScale(0)))
                .attr('y1', transform.applyY(yScale(0)))
                .attr('x2', transform.applyX(xScale(maxRadius * Math.cos(Math.PI / 4))))
                .attr('y2', transform.applyY(yScale(maxRadius * Math.sin(Math.PI / 4))));
              d3.select('#quad-2-axis')
                .attr('x1', transform.applyX(xScale(0)))
                .attr('y1', transform.applyY(yScale(0)))
                .attr('x2', transform.applyX(xScale(maxRadius * Math.cos(Math.PI / 4))))
                .attr('y2', transform.applyY(yScale(-maxRadius * Math.sin(Math.PI / 4))));
              d3.select('#quad-4-axis')
                .attr('x1', transform.applyX(xScale(0)))
                .attr('y1', transform.applyY(yScale(0)))
                .attr('x2', transform.applyX(xScale(-maxRadius * Math.cos(Math.PI / 4))))
                .attr('y2', transform.applyY(yScale(maxRadius * Math.sin(Math.PI / 4))));
          });
  // create cloud
  var svg = d3.select(options.cloudDomId)
    .attr('width', options.width)
    .attr('height', options.height);

  svg.call(zoom)
   .on("dblclick.zoom", function() {
     if (zoomedIn) {
      svg.style('cursor', 'default'); // for IE since zoom-in isn't supported
      svg.style('cursor', 'zoom-in');
      svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
      zoomedIn = false;
    } else {
      svg.style('cursor', 'move');
      svg.transition().duration(750).call(zoom.scaleBy, 2);
      zoomedIn = true;
    }
   })
   .append('g');


  var scaledRadius = xScale(0) - yScale(maxRadius) + RADIUS_MARGIN;

  // draw arc 'tooltip'
  var arcContainer = svg.append('g').attr('id', 'arc-tip');
  var arc = d3.arc()
    .innerRadius(0)
    .outerRadius(scaledRadius)
    .startAngle(0)
    .endAngle(Math.acos(COS_SIM_THRESHOLD) * 2);
  arcContainer.append("path")
    .attr('d', arc)
    .attr('id', 'arc')
    .attr('fill', '#f2f2ff')
    .attr('transform', 'translate(' + xScale(0) + ', ' + yScale(0) + ')')
    .style('opacity', 0);

  // draw concentric circles
  var circleContainer = svg.append('g').attr('id', 'concentric-circles');
  for (var i = 0; i < NUM_CONCENTRIC_CIRCLES; i++) {
    circleContainer.append("circle")
      .attr('id', 'circle-' + i)
      .attr("cx", xScale(0))
      .attr("cy", yScale(0))
      .attr("r", scaledRadius * radiusRatios[i])
      .attr('stroke', '#efefef')
      .style('fill', 'none');
      //.style("fill", backgroundColors[i]);
  }

  // remove default zoom scroll behavior
  svg.on("wheel.zoom", null);
  svg.on("mousewheel.zoom", null);
  svg.on("MozMousePixelScroll.zoom", null);


  // axis polar coord lines
  const lineColor = '#efefef';
  svg.append('svg:line')
    .attr('id', 'pos-y-axis')
    .attr('x1', xScale(0))
    .attr('y1', yScale(0))
    .attr('x2', xScale(0))
    .attr('y2', yScale(maxRadius))
    .style('stroke', lineColor);
  svg.append('svg:line')
    .attr('id', 'pos-x-axis')
    .attr('x1', xScale(0))
    .attr('y1', yScale(0))
    .attr('x2', xScale(maxRadius))
    .attr('y2', yScale(0))
    .style('stroke', lineColor);
  svg.append('svg:line')
    .attr('id', 'neg-y-axis')
    .attr('x1', xScale(0))
    .attr('y1', yScale(0))
    .attr('x2', xScale(0))
    .attr('y2', yScale(-maxRadius))
    .style('stroke', lineColor);
  svg.append('svg:line')
    .attr('id', 'neg-x-axis')
    .attr('x1', xScale(0))
    .attr('y1', yScale(0))
    .attr('x2', xScale(-maxRadius))
    .attr('y2', yScale(0))
    .style('stroke', lineColor);

    // 45-degree lines
    svg.append('svg:line')
      .attr('id', 'quad-3-axis')
      .attr('x1', xScale(0))
      .attr('y1', yScale(0))
      .attr('x2', xScale(-maxRadius * Math.cos(Math.PI / 4)))
      .attr('y2', yScale(-maxRadius * Math.sin(Math.PI / 4)))
      .style('stroke', lineColor);
    svg.append('svg:line')
      .attr('id', 'quad-1-axis')
      .attr('x1', xScale(0))
      .attr('y1', yScale(0))
      .attr('x2', xScale(maxRadius * Math.cos(Math.PI / 4)))
      .attr('y2', yScale(maxRadius * Math.sin(Math.PI / 4)))
      .style('stroke', lineColor);
    svg.append('svg:line')
      .attr('id', 'quad-2-axis')
      .attr('x1', xScale(0))
      .attr('y1', yScale(0))
      .attr('x2', xScale(maxRadius * Math.cos(Math.PI / 4)))
      .attr('y2', yScale(-maxRadius * Math.sin(Math.PI / 4)))
      .style('stroke', lineColor);
    svg.append('svg:line')
      .attr('id', 'quad-4-axis')
      .attr('x1', xScale(0))
      .attr('y1', yScale(0))
      .attr('x2', xScale(-maxRadius * Math.cos(Math.PI / 4)))
      .attr('y2', yScale(maxRadius * Math.sin(Math.PI / 4)))
      .style('stroke', lineColor);

  // Add circle at origin
  svg.append('circle')
    .attr('id', 'origin')
    .attr("cx", xScale(0))
    .attr("cy", yScale(0))
    .attr("r", 5)
    .style("fill", 'black');

  // Add Text Labels
  const sizeRange = { min: options.minFontSize, max: options.maxFontSize };

  const sortedWords = wordList.sort(function(a, b) { return a.count - b.count; }); // important to sort so z order is right
  const text = svg.selectAll('text')
    .data(sortedWords)
    .enter()
      .append('text')
        .attr('text-anchor', 'middle')
        .text(function(d) { return d.text; })
        .attr('font-family', 'Lato')
        .attr('id', function(d) { return d.text; })
        .attr('x', function(d) { return xScale(d[options.xProperty]); })
        .attr('y', function(d) { return yScale(d[options.yProperty]); })
        .attr('fill', function(d) { return blueColorScale(d.tfnorm); })
        .attr('font-size', function(d) {
          return fontScale(d.tfnorm) + 'px';
        })
        .on('mouseover', function(d) {
          /* rotate and show arc tooltip */
          // calculate angle from (x, y) coordinates
          var offset = Math.acos(COS_SIM_THRESHOLD) * (180 / Math.PI);
          var currentAngle = Math.atan(Math.abs(d[options.yProperty] / d[options.xProperty])) * (180 / Math.PI);
          // 1st quadrant
          if (d[options.xProperty] > 0 && d[options.yProperty] > 0) {
            currentAngle = 90. - currentAngle - offset;
          }
          // second quadrant
          else if (d[options.xProperty] > 0 && d[options.yProperty] < 0) {
            currentAngle = 90. + currentAngle - offset;
          }
          // third quadrant
          else if (d[options.xProperty] < 0 && d[options.yProperty] < 0) {
            currentAngle = -90. - currentAngle - offset;
          }
          // fourth quadrant
          else if (d[options.xProperty] < 0 && d[options.yProperty] > 0) {
            currentAngle = -90. + currentAngle - offset;
          }

          d3.select('#arc')
            .attr('transform', 'translate(' + xScale(0) + ', ' + yScale(0) + ') rotate(' + currentAngle + ')');
          d3.select('#arc')
            .style('opacity', 1);

          // check for re-render (IE)
          if (!d3.select(this).classed('raised')) {
            // move element to front
            d3.select(this).raise();
            d3.select(this).classed('raised', true);
          }

          d3.select(this).transition().duration(MOUSEOVER_TRANSITION_TIME)
                         .attr('fill', orangeColorScale(d.tfnorm))
                         .attr('font-size', fontScale(d.tfnorm))
                         .attr('font-weight', 'bold');

          wordList.forEach(function(word) {
            var sim = d.similar.filter(function(x) { return x.text === word.text; });
            if (sim.length > 0 && sim[0].text !== d.text) {
              // check for re-render (IE)
              if (!d3.select('#' + word.text).classed('raised')) {
                // move element to front
                d3.select('#' + word.text).raise();
                d3.select('#' + word.text).classed('raised', true);
              }
              // highlight similar words
              d3.select('#' + word.text)
                .transition()
                .duration(MOUSEOVER_TRANSITION_TIME)
                .attr('fill', orangeColorScale(word.tfnorm))
                .attr('font-size', fontScale(word.tfnorm))
                .attr('font-weight', 'bold')
                .attr('pointer-events', 'none');
            } else {
              if (word.text !== d.text) {
                // check for re-render (IE)
                d3.select('#' + word.text).classed('raised', false);
                // fade out all other words
                d3.select('#' + word.text)
                  .transition()
                  .duration(MOUSEOVER_TRANSITION_TIME)
                  .attr('fill', '#e2e2e2')
                  .attr('pointer-events', 'none');
              }
            }
          });
        })
        .on('mouseout', function(d) {
          //reset and hide arc tooltip
          d3.select('#arc')
            .style('opacity', 0)
            .attr('transform', 'translate(' + xScale(0) + ', ' + yScale(0) + ') rotate(0)');

          // return everything back to normal
          wordList.forEach(function(word) {
            d3.select('#' + word.text).classed('raised', false);
            d3.select('#' + word.text).transition().duration(100)
              .attr('fill', blueColorScale(word.tfnorm))
              .attr('font-size', fontScale(word.tfnorm))
              .attr('font-weight', 'normal')
              .attr('pointer-events', 'auto');
          });
        });
};
