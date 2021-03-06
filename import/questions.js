var inquirer = require( 'inquirer' ),
    chalk = require( 'chalk' );

exports.q = [
  {
    type : "list",
    name : "task",
    message : "What task would you like to perform?",
    choices : [
      { name : "Import a replacement layer", value : 'replace' },
      { name : "Import a new layer", value : 'new' },
      { name : "Delete a layer", value : 'delete' },
      new inquirer.Separator(),
      { name : "Import a visual layer", value : 'visual' },
      { name : "Import an urban project", value : 'planned' },
      new inquirer.Separator(),
      { name : "Push development database to live", value : 'push' },
      { name : "Reset development database from live", value : 'pull' },
      new inquirer.Separator(),
      { name : "List layers in development database", value : 'list' }
    ]
  },
  {
    type : 'list',
    name : 'geom',
    message : 'Select feature type:',
    choices : function( ans ){
      if( ans.task == 'visual' ) {
        return [
          { name : 'viewsheds', value : 'viewsheds' },
          { name : 'maps', value : 'maps' },
          { name : 'plans', value : 'plans' },
          { name : 'surveys', value : 'surveys' }
        ]
      }
      else if( ans.task == 'planned' ){
        return [
          { name : 'line', value : 'plannedline_dev' },
          { name : 'polygon', value : 'plannedpoly_dev' }
        ]
      }
      else{
        return [
          { name : 'point', value : 'basepoint_dev' },
          { name : 'line', value : 'baseline_dev' },
          { name : 'polygon', value : 'basepoly_dev' }
        ]
      }
    },
    when : function( ans ){ 
      return ans.task != 'push' && ans.task != 'pull' && ans.task != 'list';
    }
  },
  {
    type : 'input',
    name : 'layer',
    message : 'Enter layer name:',
    when : function( ans ){ 
      return ans.task != 'push' && ans.task != 'pull' && ans.task != 'visual' && ans.task != 'list';
    }
  },
  {
    type : 'input',
    name : 'file',
    message : 'Enter shapefile name (without extension):',
    default : function( ans ){
      return ans.layer;
    },
    when : function( ans ){
      return ans.task == 'replace' || ans.task == 'new' || ans.task == 'visual' || ans.task == 'planned';
    }
  },
  {
    type : 'confirm',
    name : 'confirm',
    message : function( ans ) {
      switch( ans.task ) {
        case 'replace':
          var str = 'Replace the layer ' + chalk.red.underline( ans.layer ) + ' in ' + chalk.underline.red( ans.geom ) + ' with the file ' + chalk.red.underline( ans.file ) + '?';
          break;
        case 'new':
          var str = 'Create a new layer called ' + chalk.red.underline( ans.layer ) + ' in ' + chalk.underline.red( ans.geom ) + ' from the file ' + chalk.red.underline( ans.file ) + '?';
          break;
        case 'delete':
          var str = 'Delete the layer ' + chalk.red.underline( ans.layer ) + ' from ' + chalk.underline.red( ans.geom ) + '?';
          break;
        case 'visual':
          var str = 'Replace the visual layer ' + chalk.red.underline( ans.geom ) + ' from the file ' + chalk.red.underline( ans.file ) + '?'
          break;
        case 'planned':
          var str = 'Replace the planned layer ' + chalk.red.underline( ans.layer ) + ' in ' + chalk.underline.red( ans.geom ) + ' from the file ' + chalk.red.underline( ans.file ) + '?'
          break;
        case 'push':
          var str = chalk.red.underline( 'Overwrite the live database' ) + ' with data from the development database?';
          break;
        case 'pull':
          var str = chalk.red.underline( 'Reset the development database' ) + ' with data from the live database?';
        default:
          break;
      }
      return str;
    },
    when : function( ans ){ 
      return ans.task != 'list';
    }
  }
];
