module.exports = function (grunt) {

    grunt.initConfig({

        properties: grunt.file.readJSON("properties.json"),

        pkg: grunt.file.readJSON("package.json"),

        clean: ["<%= properties.umdBuildDir %>"],

        exec: {
            compile: {
                cmd: "npx tsc",
            },

            lint: {
                cmd: "npx eslint .",
            },

            bundle: {
                cmd: "npx rollup -c rollup.config.js",
            },
        },
    },

    );

    grunt.loadNpmTasks("grunt-contrib-clean");

    grunt.loadNpmTasks("grunt-exec");

    grunt.registerTask("lint", ["exec:lint"]);

    grunt.registerTask("build", ["lint", "exec:compile", "exec:bundle"]);

};
