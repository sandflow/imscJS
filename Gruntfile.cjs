module.exports = function (grunt) {

    grunt.initConfig({

        properties: grunt.file.readJSON("properties.json"),

        pkg: grunt.file.readJSON("package.json"),

        clean: ["<%= properties.webappBuildDir %>", "<%= properties.umdBuildDir %>"],

        sync: {
            all: {
                files:
                    [
                        // copy tests
                        { expand: true, cwd: "<%= properties.webappTestDir %>", src: "**", dest: "<%= properties.webappBuildDir %>" },

                        // copy tests resources
                        { expand: true, cwd: "<%= properties.unitTestsResourcesDir %>", src: "imsc-tests/imsc1/ttml/**", dest: "<%= properties.webappBuildDir %>" },
                        { expand: true, cwd: "<%= properties.unitTestsResourcesDir %>", src: "imsc-tests/imsc1/tests.json", dest: "<%= properties.webappBuildDir %>" },
                        { expand: true, cwd: "<%= properties.unitTestsResourcesDir %>", src: "imsc-tests/imsc1_1/ttml/**", dest: "<%= properties.webappBuildDir %>" },
                        { expand: true, cwd: "<%= properties.unitTestsResourcesDir %>", src: "imsc-tests/imsc1_1/tests.json", dest: "<%= properties.webappBuildDir %>" },
                        { expand: true, cwd: "<%= properties.unitTestsResourcesDir %>", src: "unit-tests/**", dest: "<%= properties.webappBuildDir %>" },
                    ],
            },

            release: {
                src: "<%= properties.umdBuildDir %>/<%= properties.umdMinName %>",
                dest: "<%= properties.webappBuildDir %>/libs/imsc.js",
            },

            debug: {
                src: "<%= properties.umdBuildDir %>/<%= properties.umdDebugName %>",
                dest: "<%= properties.webappBuildDir %>/libs/imsc.js",
            },
        },

        npmcopy: {
            default: {
                files: {
                    "<%= properties.webappBuildDir %>/libs/": [
                        "sax:main",
                        "filesaver.js-npm:main",
                        "jszip/dist/jszip.js",
                    ],
                },
            },
        },

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

    grunt.loadNpmTasks("grunt-npmcopy");

    grunt.loadNpmTasks("grunt-sync");

    grunt.loadNpmTasks("grunt-exec");

    grunt.registerTask("lint", ["exec:lint"]);

    grunt.registerTask("build:release", ["lint", "exec:compile", "exec:bundle", "sync:all", "sync:release", "npmcopy"]);

    grunt.registerTask("build:debug", ["lint", "exec:compile", "exec:bundle", "sync:all", "sync:debug", "npmcopy"]);

    grunt.registerTask("build", ["build:debug"]);

};
