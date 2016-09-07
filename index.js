#!/usr/bin/env node
var chalk = require('chalk');
var program = require('commander');

var merge = require('merge')
var exec = require('child_process').exec;
var jsonfile = require("jsonfile");
var path = require("path");
var tempfile = require('tempfile');

var nodeCLI = require("shelljs-nodecli");

var FirefoxProfile = require("firefox-profile");
var getPrefs = require("jpm/lib/preferences").getPrefs;

var passedOn = [];
function preprocess (args) {
  var dashed = false,
    out = []
  args.forEach(function (a) {
    if (a == "--") {
      dashed = true;
      return;
    }
    if (dashed) passedOn.push(a)
    else out.push(a)
  })
  return out;
}

function makeProfile(dir) {
   var profile = new FirefoxProfile({
      destinationDirectory: dir
    });

    // Set default preferences
    var prefs = getPrefs("firefox");
    Object.keys(prefs).forEach(function(pref) {
      profile.setPreference(pref, prefs[pref]);
    });
    profile.updatePreferences();
    console.log("profile made at:", dir)
}

function initStudy(dir, name) {
  // body...

}

var standardPrefs = {
 "toolkit.telemetry.server": "http://localhost:5000",
 "toolkit.telemetry.cachedClientID": "00000000-0000-0000-0000-aed0866e9fc0",
 //"extensions.sdk.console.logLevel": "debug",
 "browser.selfsuppport.enabled": false,
 "general.warnOnAboutConfig": false
}

var program = require('commander');

program
  .version('0.0.1')

program
  .command('run <addonDir> [variation]')
  .option("--prefs <json>", "additional prefs to set")
  .option("--firstrun <epoch>", "set the firstrun to test expiry")
  .option("--debug", "add the shield.debug pref")

  .action(function (addonDir, variation, options) {
    // if prefs, read it.
    // extend that with whatever
    // write it, then:
    // call jpm run --prefs

    // TODO make this work always for relative and rooted paths
    var addonPkg = process.cwd() + '/' + addonDir + "/package.json";
    var addon = require(addonPkg);
    var id = addon.id || addon.name;
    var prefsBr = "extensions." + id;

    // prefs from the user
    var _userPrefs = {};
    if (options.prefs) {
      _userPrefs = jsonfile.readFileSync(options.prefs);
    }
    // reformat if needful:
    userPrefs = {};
    Object.keys(_userPrefs).forEach(function (k) {
      v = _userPrefs[k];
      var prefix = "+";
      var n = prefix.length;
      if (k.indexOf(prefix) == 0) { //
        k = "extensions." + id + "." + k.slice(n)
      }
      userPrefs[k] = v;
    })

    console.log("user prefs %j", userPrefs);
    // set special addon prefs
    ourPrefs = {};
    if (variation) {
      ourPrefs[prefsBr + ".shield.variation"] = variation;
      console.log("setting variation to: %s", variation);
    } else {
      console.log("choosing variation at random");
    }

    if (options.firstrun) {
      ourPrefs[prefsBr + ".shield.firstrun"] = options.firstrun;
      console.log("mimic previous run: %s", options.firstrun)
    } else {
      console.log("running with firstrun as: NOW")
    }

    if (options.debug) {
      ourPrefs['shield.debug'] = true;
      console.log("setting `shield.debug`");
    }

    var newPrefs = merge(standardPrefs, ourPrefs, userPrefs);
    console.log(JSON.stringify(newPrefs, null, 2));

    var file = tempfile(".json")
    console.log("combined prefs at:", file);
    jsonfile.writeFileSync(file, newPrefs, {spaces: 2})

    //console.log("jpm", "run", "code:", addonDir, "variation:", variation, "--prefs", options.prefs, passedOn);
    var callArgs = ["jpm", "run", '--addon-dir', addonDir, "--prefs", file].concat(passedOn);
    console.log(callArgs);
    nodeCLI.exec.apply(nodeCLI, callArgs);
  })

program
  .command('profile <dir>')
  .option("-f --force", "remove dir if exists")
  .action(function (dir, options) {
    // yes, this is not as robust as shell!  Sorry!
    if (options.force) {
      nodeCLI.exec('rm', '-rf', dir);
    }
    if (nodeCLI.exec('mkdir', '-p', dir + '/extensions').code !== 0) {
      echo('Error: %s already exists or cant be written. "profile" action fail.  try --force', dir);
      exit(1);
    }
    makeProfile(dir);
  })

program
  .command('init <name>')
  .option("-f --force", "remove dir if exists")
  .action(function (name, options) {
    // yes, this is not as robust as shell!  Sorry!
    if (options.force) {
      nodeCLI.exec('rm', '-rf', name);
    }
    if (nodeCLI.exec(__dirname + '/scripts/initStudy.bash', name).code !== 0) {
      exit(1);
    }
    initStudy(name);
  })

program
  .command('lint <dir>')
  .action(function (dir) {
    console.log('NOT YET IMPLEMENTED: lint %s', dir);
  });
;


program.parse(preprocess(process.argv));
