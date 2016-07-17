#!/usr/bin/env node

/**
 * Module dependencies.
 */
var fs = require('fs');
var request = require('superagent');
var http = require('http');
var exec = require('child_process').exec;
var program = require('commander');
var colors = require('colors');

program
    .version('0.0.1')
    .option('-i, install <module-name>', 'Install the module <module-name>')
    .option('-a, --as <custom-alias-name>', 'Give the a custom alias name <custom-alias-name>')

    .option('-u, uninstall <module-name>', 'Uninstall the module <module-name>')

    .parse(process.argv);

var s = {
    aliasPath: '/home/' + process.env.USER + '/.apm_aliases',
    modulesPath: '/home/' + process.env.USER + '/.apm_modules/',
    user: process.env.USER
};

var utils = {
    getAlias: function(moduleName, as) {
        var aliasName = moduleName;
        if (as) {
            aliasName = as;
        }
        var alias = "\nalias {aliasName}='sh {modulesPath}{moduleName}/main.sh'";
        alias = alias.replace("{aliasName}", aliasName);
        alias = alias.replace("{modulesPath}", s.modulesPath);
        alias = alias.replace("{moduleName}", moduleName);
        return alias;
    }
};

var source = function() {
    exec(". " + s.aliasPath, function (error, stdout, stderr) {

        if (error !== null) {
            return console.log('exec error: ' + error);
        }
    });
};

if (program.install) {
    var moduleName = program.install;
    console.log(colors.green('Installing: %s'), colors.white(moduleName));
    //TODO: replace with dynamic url
    request
        .get("http://localhost:3000/repos/" + moduleName)
        .end(function(error, res){
            if (error) {
                console.log(error);
                return console.log(colors.red("The package doesn't seem to exist."));
            }
            exec("git clone " + res.body.url +" /home/$USER/.apm_modules/" + moduleName, function (error, stdout, stderr) {

                if (error !== null) {
                    if (error.code === 128) {
                        return console.log(colors.red("Module already exists, aborting"));
                    }
                    return console.log('exec error: ' + error);
                }

                fs.appendFile(s.aliasPath, utils.getAlias(moduleName, program.as), function (error) {
                    if (error) {
                        return console.log(colors.red("Couldn't add alias, aborting"));
                    }
                });

                source();

                return console.log(colors.green('Succesfully installed: %s'), colors.white(moduleName));
            });
        });

}

if (program.uninstall) {
    var moduleName = program.uninstall;
    console.log(colors.green('Uninstalling: %s'), colors.white(moduleName));
    var path = s.modulesPath + moduleName;
    console.log(path);
    exec("rm -rf " + path, function (error, stdout, stderr) {
        if (error !== null) {
            return console.log('exec error: ' + error);
        }
    });
    var aliasList = fs.readFileSync('/home/' + process.env.USER + '/.apm_aliases').toString().split("\n");
    var postion;
    for(i in aliasList) {
        if(aliasList[i].includes(moduleName + "/main.sh")){
            postion = i;
            break;
        }
    }
    aliasList.splice(postion, 1);
    var file = fs.createWriteStream(s.aliasPath);
    file.on('error', function(error) {
        return console.log(error);
    });
    aliasList.forEach(function(alias) {
        file.write(alias + '\n');
    });
    file.end();
    source();
}


