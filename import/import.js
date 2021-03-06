#!/usr/bin/env node

var pg = require( 'pg' ),
    _ = require( 'underscore' ),
    fs = require( 'fs' ),
    async = require( 'async' ),
    db = require( './db' ),
    inquirer = require( 'inquirer' ),
    chalk = require( 'chalk' ),
    uuid = require('uuid'),
    table = require( 'cli-table' ),
    shapefile  = require( 'shapefile' ),
    questions = require( './questions' ),
    push = require( './push' ),
    defaultNull = {
      "Type" : null,
      "Name" : null,
      "NameShort" : null,
      "Notes" : null,
      "Creator" : null,
      "FirstOwner" : null,
      "Owner" : null,
      "Occupant" : null,
      "Address" : null,
      "ScaleRank" : null,
      "StyleName" : null
    },
    defaultVisual = {
      "CreditLine" : null,
      "Creator" : null,
      "SS_Title" : null,
      "SS_Reposit" : null,
      "Lat" : null,
      "Long" : null
    }
    
_.mixin({
  // ### _.objMap
  // _.map for objects, keeps key/value associations
  objMap: function (input, mapper, context) {
    return _.reduce(input, function (obj, v, k) {
             obj[k] = mapper.call(context, v, k, input);
             return obj;
           }, {}, context);
  }
});

var testFile = function( client, ans, callback ) {
  try {
    // Query the entry
    stats = fs.lstatSync( ans.file + ".shp" );
  }
  catch( e ) {
    callback( ans.file + ".shp does not exist", client );
  }
  callback( null, client, ans );
};

var testLayer = function( client, ans, callback ) {
  var count = 0,
      query = client.query( "SELECT COUNT(*) FROM " + ans.geom + " WHERE layer = '" + ans.layer + "'" );
  
  query.on( 'row', function( result ){
		count = result.count;
	});
	
	query.on( 'error', function( error ) {
  	  callback( error, client );
	})
	
	query.on( 'end', function(){
		if( count > 0 || ans.task == 'visual' || ans.task == 'planned' ) {
  		  callback( null, client, ans, count );
		}
		else {
  		  callback( "Layer " + ans.layer + " not found in " + ans.geom, client );
		}
	});
}

var deleteLayer = function( client, ans, count, callback ) {
  var query = client.query( "DELETE FROM " + ans.geom + " WHERE layer = '" + ans.layer + "'" );
  
  query.on( 'error', function( error ) {
    callback( error, client );
  });
  
  query.on( 'end', function() {
    console.log( chalk.green( count ) + " records removed from the database" );
    callback( null, client, ans );
  });
}

var newLayer = function( client, ans, callback ) {
  var reader = shapefile.reader( ans.file, { encoding : "UTF-8" } ),
      count = { success : 0, error : 0 };
      
  reader.readHeader( function( error, header ) {
    if( error ) {
      callback( error, client );
    }
    else {
      reader.readRecord( recordReader )
    }
  })
  
  var recordReader = function( error, record ) {
    if( record == shapefile.end ) {
      console.log( chalk.green( count.success ) + " records were imported into the database" );
      if( count.error > 0 ) {
        console.log( chalk.red( count.error ) + " records were not imported due to errors" );
      }
      callback( null, client, ans );
    }
    else if( recordTest( record.properties ) ) {
      addRecord( record, reader, ans, client, callback );
    }
    else{
      console.log( record.properties );
      count.error++;
      reader.readRecord( recordReader );
    }
  }
  
  var recordTest = function( props ) {
    if( ( props.FirstYear > new Date().getFullYear() && props.FirstYear != 8888 ) || ( props.LastYear > new Date().getFullYear() && props.LastYear != 8888 ) ) return false;
    if( props.FirstYear > props.LastYear ) return false;
    return true;
  }
  
  var processRecord = function( value ) {
    if( typeof value == "string" ) {
      return "'" + value.replace( /'/g, "''" ) + "'";
    }
    return value;
  }
  
  var addRecord = function( record, reader, ans, client, callback ){
    if (record.geometry) {
      var date = new Date(),
            num = parseInt( date.getFullYear().toString() + ( "0" + ( date.getMonth() + 1 ) ).slice( -2 )  + ( "0" + date.getDate() ).slice( -2 ) );
      
      record.geometry.crs = {
        "type" : "name",
        "properties" : {
          "name" : "EPSG:4326"
        }
      }
      
      if( ans.task == 'visual' ){
        var props = props = _.defaults( _.objMap( record.properties, processRecord ), defaultVisual ),
            q = "INSERT INTO " + ans.geom + " (firstdispl, lastdispla, notes, creator, title, imageid, latitude, longitude, geom, uploaddate, globalid, layer) VALUES ( " + props.FirstYear + ", " + props.LastYear + ", " + props.CreditLine + ", " + props.Creator + ", " + props.Title + ", " + props.SSC_ID + ", " + props.Lat + ", " + props.Long + ", ST_GeomFromGeoJSON('" + JSON.stringify( record.geometry ) + "'), " + num + ", " + ( props.SS_ID || props.SSID ) + ", '" + ans.layer + "')";
      }
      else if( ans.task == 'planned' ){
        var props = props = _.objMap( record.properties, processRecord ),
            q = "INSERT INTO " + ans.geom + " (firstdispl, lastdispla, planyear, planname, featuretyp, geom, uploaddate, globalid, layer) VALUES ( " + props.FirstYear + ", " + props.LastYear + ", " + props.UrbanProje + ", " + props.UrbanPro_1 + ", " + props.Type + ", ST_GeomFromGeoJSON('" + JSON.stringify( record.geometry ) + "'), " + num + ", '" + uuid.v1() + "', '" + ans.layer + "')";
      }
      else{
        var props = _.defaults( _.objMap( record.properties, processRecord ), defaultNull ),
            q = "INSERT INTO " + ans.geom + " (featuretyp, namecomple, nameshort, firstdispl, lastdispla, notes, creator, firstowner, owner, occupant, address, scalerank, stylename, geom, uploaddate, globalid, layer) VALUES ( " + props.Type + ", " + props.Name + ", " + props.NameShort + ", " + props.FirstYear + ", " + props.LastYear + ", " + props.Notes + ", " + props.Creator + ", " + props.FirstOwner + ", " + props.Owner + ", " + props.Occupant + ", " + props.Address + ", " + props.ScaleRank + ", " + props.StyleName + ", ST_GeomFromGeoJSON('" + JSON.stringify( record.geometry ) + "'), " + num + ", '" + uuid.v1() + "', '" + ans.layer + "')";
      }

      var query = client.query( q );
      
      query.on( 'error', function( error ) {
        console.log( q );
        count.error++;
        reader.readRecord( recordReader );
      });
      
      query.on( 'end', function() {
        count.success++;
        reader.readRecord( recordReader );
      });
    } else {
      console.log('NULL GEOMETRY: ');
      console.log(record);
      reader.readRecord( recordReader );
    }
  }
}

var getNames = function( client, ans, replace, callback ){
  if( replace == null ){
    callback( null, client, ans, null );
  } else {
    var features = [ ans.layer ],
        langs = { 'en' : 'English', 'pr' : 'Portuguese' },
        q = [],
        query = client.query( "SELECT featuretyp FROM " + ans.geom + " WHERE layer = '" + ans.layer + "' AND featuretyp IS NOT NULL GROUP BY featuretyp ORDER BY featuretyp" );
    
    query.on( 'row', function( result ){
      features.push( result.featuretyp );
    });
    
    query.on( 'error', function( error ) {
      callback( error, client );
    });
      
    query.on( 'end', function() {
      _.each( features, function( value ){
        _.each( langs, function( name, code ){
          q.push({
            type : 'input',
            name : value + "-" + code,
            message : 'Enter the ' + chalk.yellow( name ) + ' translation for: ' + chalk.blue( value ),
            default : value
          });
        });
      });
      
      inquirer.prompt( q, function( names ) {
        callback( null, client, ans, names );
      });
    });
  }
}

var updateNames = function( client, ans, names, callback ){
  if( names == null ){
    callback( null, client );
  } else {
    var translate = {},
        i = 0;
    _.each( names, function( value, key ){
      var layer = key.replace( /-(en|pr)$/g, "" ),
          code = key.replace( /.*?(en|pr)$/g, "$1" );
      if( !translate[ layer ] ) translate[ layer ] = {};
      translate[ layer ][ code ] = value;
      i++;
    });
    
    var q = _.reduce( translate, function( memo, trans, text ){
      return memo + " INSERT INTO names_dev ( text, name_en, name_pr, layer ) SELECT '" + text + "', '" + trans.en + "', '" + trans.pr + "', '" + ans.layer + "' WHERE NOT EXISTS ( SELECT text FROM names_dev WHERE text = '" + text + "' );";
    }, '' );
    
    var query = client.query( q );
    
    query.on( 'error', function( error ) {
      console.log( q );
      callback( error, client );
    });
    
    query.on( 'end', function() {
      console.log( chalk.green( i ) + " translations successfully added" );
      callback( null, client );
    });
  }
}

var deleteNames = function( client, ans, callback ){
  inquirer.prompt( [ { type : 'confirm', name : 'confirm', message : 'Update English / Portuguese names for ' + ans.layer } ], function( nameConfirm ){
    if( nameConfirm.confirm == false || ans.geom == 'viewsheds' || ans.geom == 'mapsplans' ){
      callback( null, client, ans, null );
    } else {
      var query = client.query( "DELETE FROM names_dev WHERE layer = '" + ans.layer + "'" );
    
      query.on( 'error', function( error ) {
        callback( error, client );
      });
      
      query.on( 'end', function() {
        callback( null, client, ans, true );
      });
    }
  });
}

var listLayers = function( client ) {
  var layers = new table(),
      query = client.query( "SELECT * FROM ( SELECT layer, 'point' AS geometry FROM basepoint_dev GROUP BY layer UNION SELECT layer, 'line' AS geometry FROM baseline_dev GROUP BY layer UNION SELECT layer, 'poly' AS geometry FROM basepoly_dev GROUP BY layer ) AS q WHERE layer IS NOT NULL ORDER BY layer" );
  
  query.on( 'row', function( result ){
    layers.push( _.values( result ) );
  });
  
  query.on( 'end', function(){
    console.log( layers.toString() );
    client.end();
  })
}

var waterfallExit = function( err, client ) {
  if( err ) console.log( chalk.red( "ERROR: " ) + err );
  client.end();
}

//result function sequences
var replaceSeq = function( ans, client ) {
      async.waterfall([
          function( callback ) {
            callback( null, client, ans );
          },
          testFile,
          testLayer,
          deleteLayer,
          newLayer,
          deleteNames,
          getNames,
          updateNames
        ],
        waterfallExit
      );
    },
    newSeq = function( ans, client ) {
      async.waterfall([
          function( callback ) {
            callback( null, client, ans );
          },
          testFile,
          newLayer,
          deleteNames,
          getNames,
          updateNames
        ],
        waterfallExit
      );
    },
    deleteSeq = function( ans, client ) {
      async.waterfall([
          function( callback ) {
            callback( null, client, ans );
          },
          testLayer,
          deleteLayer,
          deleteNames
        ],
        waterfallExit
      );
    },
    visualSeq = function( ans, client ) {
      ans.layer = ans.geom;
      ans.geom = ans.layer == 'viewsheds' ? ans.geom + "_dev" : 'mapsplans_dev';
      async.waterfall([
          function( callback ) {
            callback( null, client, ans );
          },
          testFile,
          testLayer,
          deleteLayer,
          newLayer,
        ],
        waterfallExit
      );
    },
    plannedSeq = function( ans, client ) {
      async.waterfall([
          function( callback ) {
            callback( null, client, ans );
          },
          testFile,
          testLayer,
          deleteLayer,
          newLayer,
        ],
        waterfallExit
      );
    },
    pushDB = function( ans, client ) {
      push.pushDB( client );
    },
    pullDB = function( ans, client ) {
      push.pullDB( client );
    },
    list = function( ans, client ) {
      listLayers( client );
    },
    tasks = {
      'replace' : replaceSeq,
      'new' : newSeq,
      'delete' : deleteSeq,
      'visual' : visualSeq,
      'planned' : plannedSeq,
      'push' : pushDB,
      'pull' : pullDB,
      'list' : list
    };

inquirer.prompt( questions.q, function( ans ) {
  if( ans.confirm || ans.task == 'list' ){
    var client = new pg.Client( db.conn );
    client.connect();
    tasks[ ans.task ]( ans, client );
  }
});
