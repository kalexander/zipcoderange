var parse     = require('csv-parse');
var fs        = require('fs');
var transform = require('stream-transform');
var async     = require('async');
var _         = require('lodash');

var argv      = require('minimist')(process.argv.slice(2));

var GLOBAL_DISTANCE = argv.distance ? argv.distance : void(0);
var GLOBAL_ZIPCODE = argv.zip ? argv.zip : void(0);

if(argv.help){
  console.log('node this --distance=4 --zip=22023');
  return;
}

var output = [];

var haversineDistance = function(coords1, coords2) {
  function toRad(x) {
    return x * Math.PI / 180;
  }

  var lon1 = coords1[1];
  var lat1 = coords1[0];

  var lon2 = coords2[1];
  var lat2 = coords2[0];

  var R = 6371; // km

  var x1 = lat2 - lat1;
  var dLat = toRad(x1);
  var x2 = lon2 - lon1;
  var dLon = toRad(x2)
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;

  d = d / 1.60934;

  return d;
}

var parseTheFile = function(cb){
  var parser = parse({delimiter: "\t", trim: true, auto_parse: true});
  var input  = fs.createReadStream('2016_Gaz_zcta_national.txt');
  parser.on('readable', function(){
    while(record = parser.read()){
      output.push(record);
    }
  });

  input.on('data', function(data){
    parser.write(data);
  });

  input.on('end', function(){
    parser.end();
  });
  parser.on('finish',function(){
   cb();
 });
};

var getWithinRange = function(cb){
  var startLatLong = _.find(output,function(o){
    return o[0] === GLOBAL_ZIPCODE;
  });

  var goodies = _.filter(output,function(o){
    var distance = haversineDistance([startLatLong[5],startLatLong[6]],[o[5],o[6]]);
    return distance < GLOBAL_DISTANCE;
  });

  cb(null,goodies);
};

async.series({
  a: parseTheFile,
  b: getWithinRange,
}, function(err, results){
  console.log(results.b)
  var zipz = _.map(results.b, function(o){ return o[0]; })
  console.log(_.join(zipz));
})
